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
import { modelTelemetryStore, providerHealthStore } from './advanced-capabilities/index.js';
import { getEnvAsBoolean } from '../utils/env.js';
import { OpenAIResponsesProvider } from '../providers/openai-responses.provider.js';
import { retry } from '../utils/retry.js';
import { getTraceId } from '../utils/async-context.js';
import { logger } from '../utils/logger.js';
import { withSpan } from '../utils/tracing.js';

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

  private getSelectionConstraints(): import('./model-registry.service.js').SelectionConstraints {
    const disallow: import('../config/models.js').ProviderName[] = [];
    // If Gemini key is missing, avoid selecting Gemini to reduce failed attempts
    if (!process.env.GEMINI_API_KEY) disallow.push('gemini');
    // Allow user override via CSV list: DISALLOW_PROVIDERS=anthropic,openai
    const csv = (process.env.DISALLOW_PROVIDERS || '').trim();
    if (csv) {
      for (const raw of csv.split(',')) {
        const p = raw.trim() as import('../config/models.js').ProviderName;
        if (p && ['gemini','openai','anthropic','groq','mistral','openai_compat'].includes(p) && !disallow.includes(p)) {
          disallow.push(p);
        }
      }
    }
    return {
      preferProvider: this.defaultProvider,
      disallowProviders: disallow.length ? disallow : undefined,
    };
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
    // short-circuit unhealthy provider if error rate is high
    const health = providerHealthStore.get(card.provider);
    if (health && health.errorCount >= 5 && health.errorCount > health.successCount * 2 && Date.now() - health.lastUpdated < 60_000) {
      throw new Error(`Provider ${card.provider} temporarily unhealthy`);
    }
    const mapped = history.map(m => ({ role: (m.role === 'model' ? 'assistant' : (m.role as 'user' | 'assistant' | 'system')), content: m.parts.map(p => (p as any).text || '').join(' ') }));
    const start = Date.now();
    const traceId = getTraceId();
    try {
      let out = '';
      const exec = async () => {
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
                return await this.openaiResponsesTools.generate(prompt, mapped, systemPrompt, card.model);
              } else if (this.openaiResponses) {
                return await this.openaiResponses.generate(prompt, mapped, systemPrompt, card.model);
              } else {
                return await this.openai.generate(prompt, mapped, systemPrompt, card.model);
              }
            } else {
              return await this.openai.generate(prompt, mapped, systemPrompt, card.model);
            }
          case 'anthropic':
            if (!this.anthropic) throw new Error('Anthropic provider not available');
            return await this.anthropic.generate(prompt, mapped as any, systemPrompt, card.model);
          case 'groq':
            if (!this.groq) throw new Error('Groq provider not available');
            return await this.groq.generate(prompt, mapped, systemPrompt, card.model);
          case 'mistral':
            if (!this.mistral) throw new Error('Mistral provider not available');
            return await this.mistral.generate(prompt, mapped, systemPrompt, card.model);
          case 'openai_compat':
            if (!this.openaiCompat) throw new Error('OpenAI-compatible provider not available');
            return await this.openaiCompat.generate(prompt, mapped, systemPrompt, card.model);
          case 'gemini':
            return await this.gemini.generateResponse(prompt, history, 'user', 'global');
          default: {
            if (getEnvAsBoolean('FEATURE_VERCEL_AI', false)) {
              const { vercelAIProvider } = await import('../providers/vercel-ai.provider.js');
              return await vercelAIProvider.generate(prompt, mapped, systemPrompt, card.model);
            }
            return await this.gemini.generateResponse(prompt, history, 'user', 'global');
          }
        }
      };

      out = await retry(exec, {
        retries: 2,
        minDelayMs: 300,
        maxDelayMs: 3000,
        onRetry: (error, attempt, delay) =>
          logger.warn('Model call retry', { metadata: { provider: card.provider, model: card.model, attempt, delay, error: String(error), traceId } })
      });

      const latencyMs = Date.now() - start;
      modelTelemetryStore.record({ provider: card.provider, model: card.model, latencyMs, success: true });
      providerHealthStore.update({ provider: card.provider, model: card.model, latencyMs, success: true });
      try {
        const { prisma } = await import('../db/prisma.js');
        if (getEnvAsBoolean('FEATURE_PERSIST_TELEMETRY', false)) {
          await prisma.modelSelection.create({ data: { provider: card.provider, model: card.model, latencyMs, success: true, traceId } });
        }
      } catch {}
      return out;
    } catch (e) {
      const latencyMs = Date.now() - start;
      modelTelemetryStore.record({ provider: card.provider, model: card.model, latencyMs, success: false });
      providerHealthStore.update({ provider: card.provider, model: card.model, latencyMs, success: false });
      logger.error('Model call failed', e as Error, { metadata: { provider: card.provider, model: card.model, traceId } });
      try {
        const { prisma } = await import('../db/prisma.js');
        if (getEnvAsBoolean('FEATURE_PERSIST_TELEMETRY', false)) {
          await prisma.modelSelection.create({ data: { provider: card.provider, model: card.model, latencyMs, success: false, traceId } });
        }
      } catch {}
      throw e;
    }
  }

  async generateWithMeta(prompt: string, history: ChatMessage[], systemPrompt?: string): Promise<GenerationMeta> {
    return await withSpan('router.generateWithMeta', async () => {
      // Prefer env/default provider and avoid disallowed providers (missing API keys, user overrides)
      const constraints = this.getSelectionConstraints();
      const preferred = modelRegistry.selectBestModel(this.buildRoutingSignal(prompt, history), constraints as any) ||
        modelRegistry.listAvailableModels().find(m => !constraints.disallowProviders?.includes(m.provider)) ||
        modelRegistry.listAvailableModels()[0];
      let text: string;
      try {
        text = await withSpan('router.callProvider', async () => this.callProvider(preferred, prompt, history, systemPrompt), {
          provider: preferred.provider,
          model: preferred.model
        });
      } catch (err) {
        // Fallback to next available model with explicit preference order and health-aware penalty
        const preferredOrder: ProviderName[] = ['gemini', 'openai', 'groq', 'mistral', 'openai_compat', 'anthropic'];
        const constraints = this.getSelectionConstraints();
        const available = modelRegistry
          .listAvailableModels()
          .filter(m => m.provider !== preferred.provider)
          .filter(m => !constraints.disallowProviders?.includes(m.provider));

        const healthPenalty = (provider: ProviderName) => {
          try {
            const h = providerHealthStore.get(provider);
            if (!h) return 0;
            const recent = Date.now() - h.lastUpdated < 60_000;
            const ratio = (h.errorCount + 1) / (h.successCount + 1);
            return recent && ratio > 1.5 ? 10 : 0; // push unhealthy providers (e.g., Anthropic credit errors) to the end
          } catch {
            return 0;
          }
        };

        const score = (card: import('../config/models.js').ModelCard) => {
          const orderIdx = preferredOrder.indexOf(card.provider);
          return (orderIdx === -1 ? 999 : orderIdx) + healthPenalty(card.provider);
        };

        const sorted = available.sort((a, b) => score(a) - score(b));
        const fallback = sorted[0] || preferred;
        text = await withSpan('router.callProvider', async () => this.callProvider(fallback, prompt, history, systemPrompt), {
          provider: fallback.provider,
          model: fallback.model,
          fallback: true
        });
        return { text, provider: fallback.provider, model: fallback.model };
      }
      return { text, provider: preferred.provider, model: preferred.model };
    }, { route: 'auto' });
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