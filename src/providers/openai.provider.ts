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
  // Optional: route via Helicone proxy for observability/caching/rate limits
  const heliBase = process.env.HELICONE_BASE_URL;
  const heliKey = process.env.HELICONE_API_KEY;
  const headers: Record<string, string> = {};
  if (heliKey) headers['Helicone-Auth'] = `Bearer ${heliKey}`;
  if (process.env.HELICONE_CACHE_ENABLED === 'true') headers['Helicone-Cache-Enabled'] = 'true';
  if (process.env.HELICONE_CACHE_MAX_AGE) headers['Cache-Control'] = `max-age=${process.env.HELICONE_CACHE_MAX_AGE}`;
  this.client = new OpenAI({ apiKey, baseURL: heliBase || undefined, defaultHeaders: Object.keys(headers).length ? headers : undefined });
    this.model = options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
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

    const completion = await this.client.chat.completions.create({
             model: overrideModel || this.model,
      messages,
      temperature: 0.7
    });
    return completion.choices[0]?.message?.content ?? '';
  }
}