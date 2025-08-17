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
    // This service is disabled due to refactoring.
    return draft;
  }
}

export const answerVerificationService = new AnswerVerificationService();
export const getVerificationMetrics = () => ({ ...verifyMetrics });