import OpenAI from 'openai';

export interface OpenAIResponsesProviderOptions {
  apiKey?: string;
  model?: string;
}

export class OpenAIResponsesProvider {
  private client: OpenAI;
  private model: string;

  constructor(options: OpenAIResponsesProviderOptions = {}) {
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
    this.client = new OpenAI({ apiKey });
    this.model = options.model || process.env.OPENAI_RESPONSES_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  public async generate(
    prompt: string,
    history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [],
    systemPrompt?: string,
    overrideModel?: string
  ): Promise<string> {
    const messages = [] as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    for (const m of history) messages.push(m);
    messages.push({ role: 'user', content: prompt });

    const response = await this.client.responses.create({
      model: overrideModel || this.model,
      input: messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')
    });

    const output = response.output?.[0];
    if (!output) return '';
    if ('content' in output && Array.isArray((output as any).content)) {
      const textPart = (output as any).content.find((c: any) => c.type === 'output_text');
      return textPart?.text || '';
    }
    return String((output as any)?.text || '') || '';
  }
}