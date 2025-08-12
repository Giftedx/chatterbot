export interface GenerateTextArgs {
  prompt: string;
}

export interface GenerateTextResult {
  output: string;
}

export class VercelAIClient {
  private readonly enabled: boolean;
  private readonly apiKey?: string;

  constructor() {
    this.enabled = process.env.FEATURE_VERCEL_AI === 'true';
    this.apiKey = process.env.AI_API_KEY;
  }

  private ensureEnabled(): void {
    if (!this.enabled) {
      throw new Error('Vercel AI provider is disabled. Enable by setting FEATURE_VERCEL_AI=true.');
    }
    if (!this.apiKey) {
      throw new Error('AI_API_KEY is required when FEATURE_VERCEL_AI is enabled.');
    }
  }

  private deterministicHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }

  async generateText(args: GenerateTextArgs): Promise<GenerateTextResult> {
    this.ensureEnabled();
    const signature = this.deterministicHash(args.prompt || '');
    return { output: `[AI-STUB:${signature}] ${args.prompt}` };
  }
}