import Anthropic from '@anthropic-ai/sdk';

export interface AnthropicProviderOptions {
  apiKey?: string;
  model?: string;
}

export class AnthropicProvider {
  private client: Anthropic;
  private model: string;

  constructor(options: AnthropicProviderOptions = {}) {
    const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    this.client = new Anthropic({ apiKey });
    this.model = options.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
  }

  public async generate(
    prompt: string,
    history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [],
    systemPrompt?: string
  ): Promise<string> {
    const messages = [] as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    for (const m of history) messages.push(m);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        { role: 'user', content: prompt }
      ] as any
    });
    const text = response.content?.[0] && 'text' in response.content[0] ? (response.content[0] as any).text : '';
    return text || '';
  }
}