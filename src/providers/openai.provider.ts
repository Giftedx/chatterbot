import OpenAI from 'openai';

export interface OpenAIProviderOptions {
  apiKey?: string;
  model?: string;
}

export class OpenAIProvider {
  private client: OpenAI;
  private model: string;

  constructor(options: OpenAIProviderOptions = {}) {
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    this.client = new OpenAI({ apiKey });
    this.model = options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  public async generate(
    prompt: string,
    history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [],
    systemPrompt?: string
  ): Promise<string> {
    const messages = [] as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    for (const m of history) messages.push(m);
    messages.push({ role: 'user', content: prompt });

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.7
    });
    return completion.choices[0]?.message?.content ?? '';
  }
}