import { modelRouterService } from '../model-router.service.js';
import type { ChatMessage } from '../context-manager.js';
import { logger } from '../../utils/logger.js';

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
          // Generate comparison answer from a different provider
          const alt = await modelRouterService.generateWithMeta(
            userPrompt,
            history,
            undefined,
            { disallowProviders: [], /* prefer different provider than initial is handled below */ }
          );

          // If provider appears same as previous inference path, request different one
          const alt2 = await modelRouterService.generateWithMeta(
            userPrompt,
            history,
            undefined,
            { disallowProviders: [alt.provider] }
          );

          const comparisonPrompt = `You are a verifier. Compare Answer A and Answer B to the same user question. Identify disagreements and rate overall agreement 0-1.
Return JSON with { agreement: number, critical_differences: string[], better_answer: 'A'|'B'|'tie' }.

User Question:\n${userPrompt}

Answer A:\n${current}

Answer B:\n${alt2.text}`;

          const verification = await modelRouterService.generate(comparisonPrompt, history, 'system', 'global');

          // Parse agreement score if possible
          let agreement = 0.0;
          try {
            const match = verification.match(/\{[\s\S]*\}/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              agreement = typeof parsed.agreement === 'number' ? parsed.agreement : 0;
              if (parsed.better_answer === 'B' && this.options.maxReruns > 0) {
                current = alt2.text;
              }
            }
          } catch {}

          // 3) If low agreement, attempt one rerun with instruction to reconcile
          if (agreement < 0.6 && this.options.maxReruns > 0) {
            const reconcilePrompt = `Re-answer the user clearly and accurately. Consider both alternatives above. Avoid hallucinations and cite uncertainties.`;
            const rerun = await modelRouterService.generateWithMeta(
              `${reconcilePrompt}\n\nUser: ${userPrompt}`,
              history,
              undefined,
              { disallowProviders: [] }
            );
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