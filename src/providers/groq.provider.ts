import Groq from 'groq-sdk';

export interface GroqProviderOptions {
  apiKey?: string;
  model?: string;
}

export class GroqProvider {
  private client: Groq;
  private model: string;

  constructor(options: GroqProviderOptions = {}) {
    const apiKey = options.apiKey || process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY not configured');
    this.client = new Groq({ apiKey });
    this.model = options.model || process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
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

    const completion = await this.client.chat.completions.create({
      model: overrideModel || this.model,
      messages,
      temperature: 0.7
    });
    return completion.choices?.[0]?.message?.content || '';
  }
}