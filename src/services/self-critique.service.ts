import { ChatMessage } from './context-manager.js';
import { logger } from '../utils/logger.js';

export interface SelfCritiqueOptions {
  enabled?: boolean;
  maxTokens?: number; // placeholder for providers that support it
  critiqueStyle?: 'socratic' | 'rubric' | 'safety' | 'factuality';
  timeoutMs?: number;
}

export class SelfCritiqueService {
  private readonly options: Required<SelfCritiqueOptions>;

  constructor(options: SelfCritiqueOptions = {}) {
    this.options = {
      enabled: options.enabled ?? (process.env.ENABLE_SELF_CRITIQUE === 'true'),
      maxTokens: options.maxTokens ?? 800,
      critiqueStyle: options.critiqueStyle ?? 'rubric',
      timeoutMs: options.timeoutMs ?? 6000
    };
  }

  public async critiqueAndRefine(
    userPrompt: string,
    draftResponse: string,
    history: ChatMessage[]
  ): Promise<string> {
    if (!this.options.enabled) return draftResponse;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

      // This is a placeholder for a real LLM call.
      // In a real application, this would call an LLM service.
      const critique = "This is a placeholder critique.";
      
      // 2) Revision phase
      const revisionPrompt = this.buildRevisionPrompt(userPrompt, draftResponse, critique);
      let refined = draftResponse;
      try {
        // This is a placeholder for a real LLM call.
        refined = "This is a placeholder refined response.";
      } catch (err) {
        logger.warn('[SelfCritique] Revision generation failed, falling back to original response', { error: String(err) });
      } finally {
        clearTimeout(timeout);
      }

      // Prefer refined if meaningfully different and longer than minimal threshold
      if (refined && refined.trim().length > Math.max(64, Math.floor(draftResponse.length * 0.5))) {
        return refined.trim();
      }
      return draftResponse;
    } catch (error) {
      logger.warn('[SelfCritique] Unexpected error; returning original response', { error: String(error) });
      return draftResponse;
    }
  }

  private buildCritiquePrompt(userPrompt: string, draft: string): string {
    const rubric = this.options.critiqueStyle === 'safety'
      ? 'Assess for safety risks, policy violations, sensitive content. Identify risky parts and suggest safer alternatives.'
      : this.options.critiqueStyle === 'factuality'
      ? 'Check for factual accuracy. Flag possible hallucinations. Suggest citations or caveats.'
      : this.options.critiqueStyle === 'socratic'
      ? 'Probe the reasoning with questions. Identify gaps and leaps. Suggest clarifications.'
      : 'Evaluate clarity, helpfulness, factuality, reasoning quality, and tone. List concrete improvements.';

    return `You are a meticulous reviewer. Given the user prompt and a draft answer, provide a concise critique according to this rubric:
${rubric}
Return:
- Strengths
- Weaknesses
- High-priority fixes (bullet list)

User Prompt:
"""
${userPrompt}
"""

Draft Answer:
"""
${draft}
"""`;
  }

  private buildRevisionPrompt(userPrompt: string, draft: string, critique: string): string {
    return `Revise the draft answer using the critique. Preserve truthfulness and avoid fabrications. If information is uncertain, state limitations.
Return only the improved final answer, without preamble.

User Prompt:
"""
${userPrompt}
"""

Critique:
"""
${critique}
"""

Draft Answer:
"""
${draft}
"""`;
  }
}