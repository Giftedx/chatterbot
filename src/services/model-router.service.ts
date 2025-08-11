import { ChatMessage } from './context-manager.js';
import { GeminiService } from './gemini.service.js';
import { OpenAIProvider } from '../providers/openai.provider.js';
import { AnthropicProvider } from '../providers/anthropic.provider.js';

export type ProviderName = 'gemini' | 'openai' | 'anthropic';

export interface RouterOptions {
  defaultProvider?: ProviderName;
}

export class ModelRouterService {
  private gemini: GeminiService;
  private openai?: OpenAIProvider;
  private anthropic?: AnthropicProvider;
  private defaultProvider: ProviderName;

  constructor(options: RouterOptions = {}) {
    this.gemini = new GeminiService();
    this.defaultProvider = (options.defaultProvider || (process.env.DEFAULT_PROVIDER as ProviderName)) || 'gemini';

    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAIProvider();
    }
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new AnthropicProvider();
    }
  }

  private pickProvider(prompt: string, history: ChatMessage[]): ProviderName {
    // Simple heuristic: code/structured tasks -> OpenAI, safety-sensitive / long context -> Anthropic, otherwise Gemini
    const text = [
      ...history.map(h => h.parts.map(p => p.text).join(' ')),
      prompt
    ].join(' ').toLowerCase();

    const mentionsCode = /```|\basync\b|\bclass\b|\bfunction\b|\berror\b|\btraceback\b/.test(text);
    const longContext = history.length > 12;
    if (mentionsCode && this.openai) return 'openai';
    if (longContext && this.anthropic) return 'anthropic';
    return this.defaultProvider;
  }

  public async generate(
    prompt: string,
    history: ChatMessage[],
    userId: string,
    guildId: string,
    systemPrompt?: string
  ): Promise<string> {
    const provider = this.pickProvider(prompt, history);

    if (provider === 'openai' && this.openai) {
      const mapped = history.map(m => ({ role: (m.role === 'model' ? 'assistant' : (m.role as 'user' | 'assistant' | 'system')), content: m.parts.map(p => (p as any).text || '').join(' ') }));
      return this.openai.generate(prompt, mapped, systemPrompt);
    }

    if (provider === 'anthropic' && this.anthropic) {
      const mapped = history.map(m => ({ role: m.role as any, content: m.parts.map(p => p.text).join(' ') }));
      return this.anthropic.generate(prompt, mapped, systemPrompt);
    }

    // Fallback to Gemini
    return this.gemini.generateResponse(prompt, history, userId, guildId);
  }
}

export const modelRouterService = new ModelRouterService();