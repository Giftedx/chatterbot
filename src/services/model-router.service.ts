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
import { getEnvAsBoolean, getEnvAsNumber } from '../utils/env.js';
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

// Removed unused RouterPreferences interface to satisfy lint rules

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
  // Optional semantic cache
  private redisClient?: any;
  private enableSemanticCache: boolean = process.env.FEATURE_SEMANTIC_CACHE === 'true';
  private semanticCacheDistance: number = Number(process.env.SEMANTIC_CACHE_DISTANCE || 0.9);
  private semanticCacheTTL: number = Number(process.env.SEMANTIC_CACHE_TTL_MS || 300000);
  private semanticCacheMaxEntries: number = Number(process.env.SEMANTIC_CACHE_MAX_ENTRIES || 200);
  private embeddingModel: string = process.env.SEMANTIC_CACHE_EMBEDDING_MODEL || 'text-embedding-3-small';
  private semanticPersist: boolean = getEnvAsBoolean('FEATURE_SEMANTIC_CACHE_PERSIST', false);
  private openaiEmbClient?: any;
  private semanticEntries: Array<{ key: string; provider: ProviderName; model: string; embedding: Float32Array; output: string; createdAt: number }>; 
  // Token guardrails (feature-flagged)
  private enableTokenGuardrails: boolean = getEnvAsBoolean('FEATURE_TOKEN_GUARDRAILS', false);
  private tokenGuardInputFraction: number = Number(process.env.TOKEN_GUARD_INPUT_BUDGET_FRACTION || 0.7);
  private tokenGuardOutputReserve: number = getEnvAsNumber('TOKEN_GUARD_OUTPUT_RESERVE', 512);

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

    this.semanticEntries = [];

    // Lazy init Redis for semantic cache if enabled (used for exact-hash fallback)
    if (this.enableSemanticCache && process.env.REDIS_URL) {
      (async () => {
        try {
          const { createClient } = await import('redis');
          this.redisClient = createClient({ url: process.env.REDIS_URL });
          this.redisClient.on('error', () => {});
          await this.redisClient.connect();
        } catch {}
      })();
    }

    // Lazy init OpenAI embeddings client if key is present
    if (this.enableSemanticCache && process.env.OPENAI_API_KEY) {
      (async () => {
        try {
          const mod = await import('openai');
          const OpenAI = (mod as any).default || mod;
          this.openaiEmbClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        } catch {}
      })();
    }
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
    // Optional token-budget guardrails: trim input to fit model context while reserving output tokens
    if (this.enableTokenGuardrails) {
      try {
        const maxContext = (card.contextWindowK || 128) * 1000; // K -> tokens approximation
        const reserve = this.tokenGuardOutputReserve;
        const inputBudget = Math.max(512, Math.floor(maxContext * this.tokenGuardInputFraction) - reserve);
        const tokens = safeCountTokensForMessages(
          [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            ...history.map(h => ({ role: h.role, content: h.parts.map(p => (p as any).text || '').join(' ') })),
            { role: 'user', content: prompt }
          ]
        );
        if (tokens > inputBudget) {
          // Truncate history from the oldest, and shrink prompt if still too large
          let keptHistory: ChatMessage[] = [...history];
          let curTokens = tokens;
          // Drop oldest turns until under budget or only keep last 2
          while (keptHistory.length > 2 && curTokens > inputBudget) {
            keptHistory.shift();
            curTokens = safeCountTokensForMessages([
              ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
              ...keptHistory.map(h => ({ role: h.role, content: h.parts.map(p => (p as any).text || '').join(' ') })),
              { role: 'user', content: prompt }
            ]);
          }
          // If still over, truncate user prompt tail
          if (curTokens > inputBudget) {
            let p = prompt;
            // binary shrink by characters as a fallback when tokenizer not exact
            let low = 0, high = p.length;
            for (let i = 0; i < 10 && curTokens > inputBudget && high > 0; i++) {
              const mid = Math.max(32, Math.floor((low + high) / 2));
              p = prompt.slice(0, mid);
              curTokens = safeCountTokensForMessages([
                ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                ...keptHistory.map(h => ({ role: h.role, content: h.parts.map(p2 => (p2 as any).text || '').join(' ') })),
                { role: 'user', content: p }
              ]);
              if (curTokens > inputBudget) high = mid - 1; else low = mid + 1;
            }
            prompt = p + '\n\n[truncated for length]';
          }
          history = keptHistory;
        }
      } catch {}
    }
    const cacheKey = (() => {
      if (!this.enableSemanticCache || !this.redisClient) return null;
      try {
        const base = JSON.stringify({ p: prompt, h: history.map(h => ({ r: h.role, t: h.parts.map(p => (p as any).text || '').join(' ') })), sp: systemPrompt || '', m: card.model, pr: card.provider });
        // Simple hash
        let hash = 0;
        for (let i = 0; i < base.length; i++) hash = ((hash << 5) - hash) + base.charCodeAt(i) | 0;
        return `semcache:${card.provider}:${card.model}:${Math.abs(hash).toString(36)}`;
      } catch {
        return null;
      }
    })();

    // Exact-hash cache lookup via Redis (fast path)
    if (cacheKey && this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) return cached as string;
      } catch {}
    }

  // In-memory semantic cache (cosine similarity) using embeddings
    if (this.enableSemanticCache && this.openaiEmbClient) {
      try {
        const normalized = (() => {
          try {
            const hist = history.map(h => `[${h.role}] ${h.parts.map(p => (p as any).text || '').join(' ')}`).join('\n');
            return `${systemPrompt ? `[system] ${systemPrompt}\n` : ''}${hist}\n[user] ${prompt}`.slice(0, 12000);
          } catch {
            return (prompt || '').slice(0, 12000);
          }
        })();

        const embRes = await this.openaiEmbClient.embeddings.create({ model: this.embeddingModel, input: normalized });
        const vec: number[] = embRes?.data?.[0]?.embedding;
        if (Array.isArray(vec) && vec.length) {
          const q = new Float32Array(vec);
          const now = Date.now();
          // prune expired
          this.semanticEntries = this.semanticEntries.filter(e => now - e.createdAt < this.semanticCacheTTL);
          // find best match for same provider/model
          let best: { entry: typeof this.semanticEntries[number]; score: number } | null = null;
          for (const e of this.semanticEntries) {
            if (e.provider !== card.provider || e.model !== card.model) continue;
            const score = cosineSim(q, e.embedding);
            if (!isFinite(score)) continue;
            if (!best || score > best.score) best = { entry: e, score };
          }
          if (best && best.score >= this.semanticCacheDistance) {
            return best.entry.output;
          }
          // Optional: Redis-persisted semantic cache lookup (scan recent entries)
          if (this.semanticPersist && this.redisClient) {
            try {
              const listKey = `semcache:list:${card.provider}:${card.model}`;
              const ids: string[] = await this.redisClient.lRange(listKey, 0, this.semanticCacheMaxEntries - 1);
              let bestPersist: { output: string; score: number } | null = null;
              const now2 = Date.now();
              for (const id of ids) {
                const hkey = `semcache:entry:${id}`;
                const obj = await this.redisClient.hGetAll(hkey);
                if (!obj || !obj.embedding || !obj.output || !obj.createdAt) continue;
                const created = Number(obj.createdAt);
                if (!created || now2 - created > this.semanticCacheTTL) continue;
                const vec2 = base64ToFloat32(obj.embedding);
                if (!vec2 || !vec2.length || vec2.length !== q.length) continue;
                const score = cosineSim(q, vec2);
                if (!isFinite(score)) continue;
                if (!bestPersist || score > bestPersist.score) bestPersist = { output: obj.output, score };
              }
              if (bestPersist && bestPersist.score >= this.semanticCacheDistance) {
                return bestPersist.output;
              }
            } catch {}
          }
        }
      } catch {}
    }
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
      // Optional: Langfuse event
      try {
        const { trackModelCall } = await import('../telemetry/langfuse.js');
        await trackModelCall({ provider: card.provider, model: card.model, latencyMs, success: true, traceId });
      } catch {}
      // Cache on success (exact-hash via Redis)
      if (cacheKey && this.redisClient) {
        try { await this.redisClient.set(cacheKey, out, { PX: this.semanticCacheTTL }); } catch {}
      }
      // Cache on success (in-memory semantic cache)
      if (this.enableSemanticCache && this.openaiEmbClient) {
        try {
          const normalized = (() => {
            try {
              const hist = history.map(h => `[${h.role}] ${h.parts.map(p => (p as any).text || '').join(' ')}`).join('\n');
              return `${systemPrompt ? `[system] ${systemPrompt}\n` : ''}${hist}\n[user] ${prompt}`.slice(0, 12000);
            } catch {
              return (prompt || '').slice(0, 12000);
            }
          })();
          const embRes = await this.openaiEmbClient.embeddings.create({ model: this.embeddingModel, input: normalized });
          const vec: number[] = embRes?.data?.[0]?.embedding;
          if (Array.isArray(vec) && vec.length) {
            const entry = { key: cacheKey || 'mem', provider: card.provider, model: card.model, embedding: new Float32Array(vec), output: out, createdAt: Date.now() };
            this.semanticEntries.push(entry);
            if (this.semanticEntries.length > this.semanticCacheMaxEntries) {
              // drop oldest
              this.semanticEntries.sort((a, b) => a.createdAt - b.createdAt);
              this.semanticEntries.splice(0, this.semanticEntries.length - this.semanticCacheMaxEntries);
            }
            // Optional: persist semantic entry in Redis (capped list + hash)
            if (this.semanticPersist && this.redisClient) {
              try {
                const id = `${Math.abs(Math.floor(Math.random() * 1e9)).toString(36)}:${Date.now().toString(36)}`;
                const listKey = `semcache:list:${card.provider}:${card.model}`;
                const hkey = `semcache:entry:${id}`;
                await this.redisClient.lPush(listKey, id);
                await this.redisClient.lTrim(listKey, 0, this.semanticCacheMaxEntries - 1);
                await this.redisClient.hSet(hkey, {
                  embedding: float32ToBase64(entry.embedding),
                  output: out,
                  createdAt: String(entry.createdAt)
                });
                await this.redisClient.expire(hkey, Math.ceil(this.semanticCacheTTL / 1000));
              } catch {}
            }
          }
        } catch {}
      }
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
      // Optional: Langfuse event on failure
      try {
        const { trackModelCall } = await import('../telemetry/langfuse.js');
        await trackModelCall({ provider: card.provider, model: card.model, latencyMs, success: false, traceId, error: String(e) });
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

// Local helper: cosine similarity between two Float32Array vectors
function cosineSim(a: Float32Array, b: Float32Array): number {
  try {
    if (a.length !== b.length) return -1;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      const x = a[i];
      const y = b[i];
      dot += x * y;
      na += x * x;
      nb += y * y;
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    if (!denom || !isFinite(denom)) return -1;
    return dot / denom;
  } catch {
    return -1;
  }
}

// Local helpers: token counting with optional precise tokenizer
function safeCountTokensForMessages(messages: Array<{ role: string; content: string }>): number {
  try {
    if (process.env.FEATURE_PRECISE_TOKENIZER === 'true') {
      try {
        const { countTokensForMessages } = require('../utils/tokenizer.js');
        if (typeof countTokensForMessages === 'function') {
          return countTokensForMessages(messages as any);
        }
      } catch {}
    }
    // Fallback heuristic
    const text = messages.map(m => `[${m.role}] ${m.content}`).join('\n');
    return Math.ceil(text.length / 4);
  } catch {
    return Math.ceil(messages.map(m => m.content || '').join(' ').length / 4);
  }
}

// Local helpers: serialize/deserialize Float32Array to base64 for Redis storage
function float32ToBase64(arr: Float32Array): string {
  try {
    const buf = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
    return buf.toString('base64');
  } catch {
    return '';
  }
}

function base64ToFloat32(b64: string): Float32Array {
  try {
    const buf = Buffer.from(b64, 'base64');
    return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
  } catch {
    return new Float32Array();
  }
}