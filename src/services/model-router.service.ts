import { ChatMessage } from './context-manager.js';
import { GeminiService } from './gemini.service.js';
import { OpenAIProvider } from '../providers/openai.provider.js';
import { AnthropicProvider } from '../providers/anthropic.provider.js';
import { GroqProvider } from '../providers/groq.provider.js';
import { MistralProvider } from '../providers/mistral.provider.js';
import { OpenAICompatProvider } from '../providers/openai-compatible.provider.js';
import { modelRegistry } from './model-registry.service.js';
import type { ModelCard, ProviderName, RoutingSignal } from '../config/models.js';
import { modelTelemetryStore } from './advanced-capabilities/index.js';
import { getEnvAsBoolean } from '../utils/env.js';

export interface RouterOptions {
  defaultProvider?: ProviderName;
}

export interface GenerationMeta {
  text: string;
  provider: ProviderName;
  model: string;
}

export class ModelRouterService {
  private gemini: GeminiService;
  private openai?: OpenAIProvider;
  private anthropic?: AnthropicProvider;
  private groq?: GroqProvider;
  private mistral?: MistralProvider;
  private openaiCompat?: OpenAICompatProvider;
  private defaultProvider: ProviderName;

  constructor(options: RouterOptions = {}) {
    this.gemini = new GeminiService();
    this.defaultProvider = (options.defaultProvider || (process.env.DEFAULT_PROVIDER as ProviderName)) || 'gemini';

    if (process.env.OPENAI_API_KEY) this.openai = new OpenAIProvider();
    if (process.env.ANTHROPIC_API_KEY) this.anthropic = new AnthropicProvider();
    if (process.env.GROQ_API_KEY) this.groq = new GroqProvider();
    if (process.env.MISTRAL_API_KEY) this.mistral = new MistralProvider();
    if (process.env.OPENAI_COMPAT_API_KEY && process.env.OPENAI_COMPAT_BASE_URL) this.openaiCompat = new OpenAICompatProvider();
  }

  private buildRoutingSignal(prompt: string, history: ChatMessage[]): RoutingSignal {
    const text = [
      ...history.map(h => h.parts.map(p => (p as any).text || '').join(' ')),
      prompt
    ].join(' ').toLowerCase();
    const mentionsCode = /```|\basync\b|\bclass\b|\bfunction\b|\berror\b|\btraceback\b|\bts\b|\bjs\b/.test(text);
    const requiresLongContext = history.length > 12 || text.length > 4000;
    const needsMultimodal = /http(s)?:\/\/.+\.(png|jpg|jpeg|gif)/.test(text);
    const needsHighSafety = /suicide|self-harm|hate|nsfw|explicit|medical|legal/.test(text);
    const domain: RoutingSignal['domain'] = /leetcode|stack overflow|docker|k8s|node|python|typescript|react|error|exception/.test(text) ? 'technical' : 'general';
    const latencyPreference: RoutingSignal['latencyPreference'] = /urgent|quick|fast|now/.test(text) ? 'low' : 'normal';
    return { mentionsCode, requiresLongContext, needsMultimodal, needsHighSafety, domain, latencyPreference };
  }

  private async callProvider(card: ModelCard, prompt: string, history: ChatMessage[], systemPrompt?: string): Promise<string> {
    const mapped = history.map(m => ({ role: (m.role === 'model' ? 'assistant' : (m.role as 'user' | 'assistant' | 'system')), content: m.parts.map(p => (p as any).text || '').join(' ') }));
    const start = Date.now();
    try {
      let out = '';
      switch (card.provider) {
        case 'openai':
          if (!this.openai) throw new Error('OpenAI provider not available');
          out = await this.openai.generate(prompt, mapped, systemPrompt, card.model);
          break;
        case 'anthropic':
          if (!this.anthropic) throw new Error('Anthropic provider not available');
          out = await this.anthropic.generate(prompt, mapped as any, systemPrompt, card.model);
          break;
        case 'groq':
          if (!this.groq) throw new Error('Groq provider not available');
          out = await this.groq.generate(prompt, mapped, systemPrompt, card.model);
          break;
        case 'mistral':
          if (!this.mistral) throw new Error('Mistral provider not available');
          out = await this.mistral.generate(prompt, mapped, systemPrompt, card.model);
          break;
        case 'openai_compat':
          if (!this.openaiCompat) throw new Error('OpenAI-compatible provider not available');
          out = await this.openaiCompat.generate(prompt, mapped, systemPrompt, card.model);
          break;
        case 'gemini':
          out = await this.gemini.generateResponse(prompt, history, 'user', 'global');
          break;
        default: {
          // Optional Vercel AI provider path if enabled
          if (getEnvAsBoolean('FEATURE_VERCEL_AI', false)) {
            const { vercelAIProvider } = await import('../providers/vercel-ai.provider.js');
            out = await vercelAIProvider.generate(prompt, mapped, systemPrompt, card.model);
            break;
          }
          out = await this.gemini.generateResponse(prompt, history, 'user', 'global');
        }
      }
      modelTelemetryStore.record({ provider: card.provider, model: card.model, latencyMs: Date.now() - start, success: true });
      return out;
    } catch (e) {
      modelTelemetryStore.record({ provider: card.provider, model: card.model, latencyMs: Date.now() - start, success: false });
      throw e;
    }
  }

  public async generateWithMeta(
    prompt: string,
    history: ChatMessage[],
    systemPrompt?: string,
    constraints: { disallowProviders?: ProviderName[]; preferProvider?: ProviderName } = {}
  ): Promise<GenerationMeta> {
    const signal = this.buildRoutingSignal(prompt, history);
    const selected = modelRegistry.selectBestModel(signal, constraints) || { provider: this.defaultProvider, model: '', displayName: '', contextWindowK: 0, costTier: 'low', speedTier: 'fast', strengths: [], modalities: ['text'], bestFor: [], safetyLevel: 'standard' };
    const text = await this.callProvider(selected as ModelCard, prompt, history, systemPrompt);
    return { text, provider: selected.provider as ProviderName, model: selected.model };
  }

  public async generate(
    prompt: string,
    history: ChatMessage[],
    userId: string,
    guildId: string,
    systemPrompt?: string
  ): Promise<string> {
    const meta = await this.generateWithMeta(prompt, history, systemPrompt);
    return meta.text;
  }
}

export const modelRouterService = new ModelRouterService();