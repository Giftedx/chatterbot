// @ts-nocheck
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
import { OpenAIResponsesProvider } from '../providers/openai-responses.provider.js';

export interface RouterOptions {
  defaultProvider?: ProviderName;
}

export interface GenerationMeta {
  text: string;
  provider: ProviderName;
  model: string;
}

interface RouterPreferences {
  latencyPreference?: RoutingSignal['latencyPreference'];
}

export class ModelRouterService {
  private gemini: GeminiService;
  private openai?: OpenAIProvider;
  private openaiResponses?: OpenAIResponsesProvider;
  private openaiResponsesTools?: any;
  private anthropic?: AnthropicProvider;
  private groq?: GroqProvider;
  private mistral?: MistralProvider;
  private openaiCompat?: OpenAICompatProvider;
  private defaultProvider: ProviderName;

  constructor(options: RouterOptions = {}) {
    this.gemini = new GeminiService();
    this.defaultProvider = (options.defaultProvider || (process.env.DEFAULT_PROVIDER as ProviderName)) || 'gemini';

    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAIProvider();
      if (getEnvAsBoolean('FEATURE_OPENAI_RESPONSES', false)) {
        this.openaiResponses = new OpenAIResponsesProvider();
      }
    }
    if (process.env.ANTHROPIC_API_KEY) this.anthropic = new AnthropicProvider();
    if (process.env.GROQ_API_KEY) this.groq = new GroqProvider();
    if (process.env.MISTRAL_API_KEY) this.mistral = new MistralProvider();
    if (process.env.OPENAI_COMPAT_API_KEY && process.env.OPENAI_COMPAT_BASE_URL) this.openaiCompat = new OpenAICompatProvider();
  }

  private buildRoutingSignal(prompt: string, history: ChatMessage[], overrideLatency?: RoutingSignal['latencyPreference']): RoutingSignal {
    const text = [
      ...history.map(h => h.parts.map(p => (p as any).text || '').join(' ')),
      prompt
    ].join(' ').toLowerCase();
    const mentionsCode = /```|\basync\b|\bclass\b|\bfunction\b|\berror\b|\btraceback\b|\bts\b|\bjs\b/.test(text);
    const requiresLongContext = history.length > 12 || text.length > 4000;
    const needsMultimodal = /http(s)?:\/\/.+\.(png|jpg|jpeg|gif)/.test(text);
    const needsHighSafety = /suicide|self-harm|hate|nsfw|explicit|medical|legal/.test(text);
    const domain: RoutingSignal['domain'] = /leetcode|stack overflow|docker|k8s|node|python|typescript|react|error|exception/.test(text) ? 'technical' : 'general';
    const latencyPreference: RoutingSignal['latencyPreference'] = overrideLatency || (/urgent|quick|fast|now/.test(text) ? 'low' : 'normal');
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
          if (getEnvAsBoolean('FEATURE_OPENAI_RESPONSES', false)) {
            if (!this.openaiResponsesTools && getEnvAsBoolean('FEATURE_OPENAI_RESPONSES_TOOLS', false)) {
              try {
                const { OpenAIResponsesToolsProvider } = await import('../providers/openai-responses-tools.provider.js');
                this.openaiResponsesTools = new OpenAIResponsesToolsProvider();
              } catch {}
            }
            if (this.openaiResponsesTools) {
              out = await this.openaiResponsesTools.generate(prompt, mapped, systemPrompt, card.model);
            } else if (this.openaiResponses) {
              out = await this.openaiResponses.generate(prompt, mapped, systemPrompt, card.model);
            } else {
              out = await this.openai.generate(prompt, mapped, systemPrompt, card.model);
            }
          } else {
            out = await this.openai.generate(prompt, mapped, systemPrompt, card.model);
          }
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
      const latencyMs = Date.now() - start;
      modelTelemetryStore.record({ provider: card.provider, model: card.model, latencyMs, success: true });
      try {
        const { prisma } = await import('../db/prisma.js');
        if (getEnvAsBoolean('FEATURE_PERSIST_TELEMETRY', false)) {
          await prisma.modelSelection.create({ data: { provider: card.provider, model: card.model, latencyMs, success: true } });
        }
      } catch {}
      return out;
    } catch (e) {
      const latencyMs = Date.now() - start;
      modelTelemetryStore.record({ provider: card.provider, model: card.model, latencyMs, success: false });
      try {
        const { prisma } = await import('../db/prisma.js');
        if (getEnvAsBoolean('FEATURE_PERSIST_TELEMETRY', false)) {
          await prisma.modelSelection.create({ data: { provider: card.provider, model: card.model, latencyMs, success: false } });
        }
      } catch {}
      throw e;
    }
  }

  async generateWithMeta(prompt: string, history: ChatMessage[], systemPrompt?: string): Promise<GenerationMeta> {
    const preferred = modelRegistry.selectModel(prompt, history);
    const text = await this.callProvider(preferred, prompt, history, systemPrompt);
    return { text, provider: preferred.provider, model: preferred.model };
  }

  async generate(prompt: string, history: ChatMessage[], _userId?: string, _guildId?: string, systemPrompt?: string): Promise<string> {
    const meta = await this.generateWithMeta(prompt, history, systemPrompt);
    return meta.text;
  }

  async stream(prompt: string, history: ChatMessage[], systemPrompt?: string): Promise<AsyncGenerator<string>> {
    // For simplicity, fallback to non-streaming in tests
    const meta = await this.generateWithMeta(prompt, history, systemPrompt);
    async function* generator() {
      yield meta.text;
    }
    return generator();
  }
}

export const modelRouterService = new ModelRouterService();