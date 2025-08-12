// Feature-flagged AI provider wrapper that can be expanded later.
// Does not import external SDK unless FEATURE_VERCEL_AI=true.
import { features } from '../../config/feature-flags.js';
import { getOptionalEnv } from '../../utils/env.js';
import { logger } from '../../utils/logger.js';

const DEFAULT_MODEL = 'gpt-4o-mini';

export class VercelAIClient {
  private enabled: boolean;
  private model: string;
  private apiKey: string | undefined;

  constructor(config: { model?: string } = {}) {
    this.enabled = features.vercelAI;
    this.model = config.model ?? getOptionalEnv('AI_MODEL', DEFAULT_MODEL);
    this.apiKey = getOptionalEnv('AI_API_KEY'); // Optional until enabled; enforced when enabled
  }

  ensureEnabled(): void {
    if (!this.enabled) {
      throw new Error('Vercel AI provider is disabled. Set FEATURE_VERCEL_AI=true to enable.');
    }
    if (!this.apiKey) {
      throw new Error('AI_API_KEY is required when FEATURE_VERCEL_AI=true.');
    }
  }

  // Minimal text generation API to be wired to an SDK later.
  async generateText({ prompt, temperature = 0.7, maxTokens = 512 }: {
    prompt?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{
    model: string;
    output: string;
    usage: { promptTokens: number; completionTokens: number };
    temperature: number;
    maxTokens: number;
  }> {
    this.ensureEnabled();
    logger.debug('generateText called', { model: this.model, maxTokens });
    // Deterministic stub to ensure safe behavior without external dependencies.
    return {
      model: this.model,
      output: `[AI-STUB:${this.model}] ${String(prompt ?? '').slice(0, 200)}`,
      usage: { promptTokens: 0, completionTokens: 0 },
      temperature,
      maxTokens,
    };
  }
}