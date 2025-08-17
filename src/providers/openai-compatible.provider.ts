import OpenAI from 'openai';

export interface OpenAICompatOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

export class OpenAICompatProvider {
  private client: OpenAI;
  private model: string;

  constructor(options: OpenAICompatOptions = {}) {
    const apiKey = options.apiKey || process.env.OPENAI_COMPAT_API_KEY;
    const baseURL = options.baseURL || process.env.OPENAI_COMPAT_BASE_URL;
    if (!apiKey || !baseURL) throw new Error('OPENAI_COMPAT_API_KEY or OPENAI_COMPAT_BASE_URL not configured');
  const headers: Record<string, string> = {};
  if (process.env.HELICONE_API_KEY) headers['Helicone-Auth'] = `Bearer ${process.env.HELICONE_API_KEY}`;
  if (process.env.HELICONE_CACHE_ENABLED === 'true') headers['Helicone-Cache-Enabled'] = 'true';
  if (process.env.HELICONE_CACHE_MAX_AGE) headers['Cache-Control'] = `max-age=${process.env.HELICONE_CACHE_MAX_AGE}`;
  this.client = new OpenAI({ apiKey, baseURL, defaultHeaders: Object.keys(headers).length ? headers : undefined });
    this.model = options.model || process.env.OPENAI_COMPAT_MODEL || 'qwen2.5-32b-instruct';
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
    return completion.choices[0]?.message?.content ?? '';
  }
}