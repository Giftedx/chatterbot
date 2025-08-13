import { modelRouterService } from '../model-router.service.js';
import type { ChatMessage } from '../context-manager.js';
import { logger } from '../../utils/logger.js';

const verifyMetrics = {
  comparisons: 0,
  lowAgreements: 0,
  reruns: 0
};

export interface AnswerVerificationOptions {
  enabled?: boolean;
  crossModel?: boolean;
  maxReruns?: number;
  timeoutMs?: number;
}

export class AnswerVerificationService {
  private readonly options: Required<AnswerVerificationOptions>;
  constructor(options: AnswerVerificationOptions = {}) {
    this.options = {
      enabled: options.enabled ?? (process.env.ENABLE_ANSWER_VERIFICATION === 'true'),
      crossModel: options.crossModel ?? (process.env.CROSS_MODEL_VERIFICATION === 'true'),
      maxReruns: options.maxReruns ?? Number(process.env.MAX_RERUNS || 1),
      timeoutMs: options.timeoutMs ?? 8000
    };
  }

  public async verifyAndImprove(userPrompt: string, draft: string, history: ChatMessage[]): Promise<string> {
    if (!this.options.enabled) return draft;

    try {
      let current = draft;

      // 1) Self-critique and revision
      try {
        const { SelfCritiqueService } = await import('../self-critique.service.js');
        const sc = new SelfCritiqueService({ enabled: true, critiqueStyle: 'factuality' });
        current = await sc.critiqueAndRefine(userPrompt, current, history);
      } catch (err) {
        logger.warn('[Verify] Self-critique failed', { error: String(err) });
      }

      // 2) Cross-model verification (optional)
      if (this.options.crossModel) {
        try {
          const alt = await modelRouterService.generateWithMeta(userPrompt, history);
          const alt2 = await modelRouterService.generateWithMeta(userPrompt, history);

          const comparisonPrompt = `You are a verifier. Compare Answer A and Answer B to the same user question. Identify disagreements and rate overall agreement 0-1.\nReturn JSON with { agreement: number, critical_differences: string[], better_answer: 'A'|'B'|'tie' }.\n\nUser Question:\n${userPrompt}\n\nAnswer A:\n${current}\n\nAnswer B:\n${alt2.text}`;

          const verification = await modelRouterService.generate(comparisonPrompt, history, 'system', 'global');
          verifyMetrics.comparisons++;

          let agreement = 0.0;
          try {
            const match = verification.match(/\{[\s\S]*\}/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              agreement = typeof parsed.agreement === 'number' ? parsed.agreement : 0;
              if (agreement < 0.6) verifyMetrics.lowAgreements++;
              if (parsed.better_answer === 'B' && this.options.maxReruns > 0) {
                current = alt2.text;
              }
            }
          } catch (error) {
            console.warn('Failed to parse verification response:', error);
          }

          if (agreement < 0.6 && this.options.maxReruns > 0) {
            const rerun = await modelRouterService.generateWithMeta(`Re-answer clearly and accurately. Consider both alternatives above. Avoid hallucinations and cite uncertainties.\n\nUser: ${userPrompt}`, history);
            verifyMetrics.reruns++;
            current = rerun.text || current;
          }
        } catch (err) {
          logger.warn('[Verify] Cross-model verification failed', { error: String(err) });
        }
      }

      return current;
    } catch (error) {
      logger.warn('[Verify] Unexpected error; returning draft', { error: String(error) });
      return draft;
    }
  }
}

export const answerVerificationService = new AnswerVerificationService();
export const getVerificationMetrics = () => ({ ...verifyMetrics });