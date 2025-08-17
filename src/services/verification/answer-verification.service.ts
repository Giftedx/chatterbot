import type { ChatMessage } from '../context-manager.js';
import { logger } from '../../utils/logger.js';
import { SelfCritiqueService } from '../self-critique.service.js';
// modelRouterService is optionally mocked in tests; dynamically import for flexibility
let modelRouterService: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  modelRouterService = require('../model-router.service.js').modelRouterService;
} catch {
  modelRouterService = null;
}

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
    try {
      if (!this.options.enabled) return draft;

      // Phase 1: lightweight self-critique refinement
      let current = draft;
      try {
        const critic = new SelfCritiqueService({ enabled: true });
        current = await critic.critiqueAndRefine(userPrompt, draft, history);
      } catch (e) {
        logger.warn('[AnswerVerification] Self-critique failed; keeping draft', { error: String(e) });
      }

      if (!this.options.crossModel) return current;

      // Phase 2: cross-model quick comparison (A/B) using model router
      if (!modelRouterService) return current;

      try {
        // Generate two alternates from potentially different providers
        const altA = await modelRouterService.generateWithMeta(userPrompt, []);
        const altB = await modelRouterService.generateWithMeta(userPrompt, []);

        // Ask router to evaluate agreement and pick better answer
        const evalJson = await modelRouterService.generate(
          JSON.stringify({
            user_prompt: userPrompt,
            candidate_a: altA?.text ?? '',
            candidate_b: altB?.text ?? '',
            draft: current ?? draft,
          }),
          [],
          'evaluate candidates for agreement and pick better_answer in {agreement:number, better_answer:"A"|"B"|"tie"}'
        );

        let parsed: any = null;
        try { parsed = JSON.parse(evalJson); } catch {}
        const agreement = typeof parsed?.agreement === 'number' ? parsed.agreement : 1.0;
        const better = typeof parsed?.better_answer === 'string' ? parsed.better_answer : 'tie';

        // If agreement is low, swap to the better candidate
        if (agreement < 0.6 && this.options.maxReruns > 0) {
          const choice = better?.toUpperCase() === 'B' ? altB?.text : altA?.text;
          if (choice && choice.trim().length > 0) {
            current = choice;
          }
        }
      } catch (e) {
        logger.warn('[AnswerVerification] Cross-model evaluation failed; using current', { error: String(e) });
      }

      return current;
    } catch (err) {
      logger.warn('[AnswerVerification] Unexpected error; returning draft', { error: String(err) });
      return draft;
    }
  }
}

export const answerVerificationService = new AnswerVerificationService();
export const getVerificationMetrics = () => ({ ...verifyMetrics });