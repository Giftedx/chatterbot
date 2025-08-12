import { Mistral } from '@mistralai/mistralai';

export interface MistralProviderOptions {
  apiKey?: string;
  model?: string;
}

export class MistralProvider {
  private client: Mistral;
  private model: string;

  constructor(options: MistralProviderOptions = {}) {
    const apiKey = options.apiKey || process.env.MISTRAL_API_KEY;
    if (!apiKey) throw new Error('MISTRAL_API_KEY not configured');
    this.client = new Mistral({ apiKey });
    this.model = options.model || process.env.MISTRAL_MODEL || 'mistral-large-latest';
  }

  public async generate(
    prompt: string,
    history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [],
    systemPrompt?: string,
    overrideModel?: string
  ): Promise<string> {
    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push(...history);
    messages.push({ role: 'user', content: prompt });

    const completion = await this.client.chat.complete({
      model: overrideModel || this.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })) as any,
      temperature: 0.7
    });

    const content = completion.choices?.[0]?.message?.content as unknown;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      // Mistral SDK may return ContentChunk[]; join text chunks
      return content.map((chunk: any) => (typeof chunk === 'string' ? chunk : (chunk?.text ?? ''))).join('').trim();
    }
    return '';
  }
}