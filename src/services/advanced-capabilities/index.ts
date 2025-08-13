/**
 * Advanced Capabilities Module
 * 
 * Exports all advanced AI capabilities for seamless integration into the chatbot.
 */

// Main manager
export { 
  AdvancedCapabilitiesManager,
  type AdvancedCapabilitiesConfig,
  type CapabilityExecutionResult,
  type EnhancedResponse
} from './advanced-capabilities-manager.service.js';

// Orchestration
export {
  IntelligentCapabilityOrchestrator,
  type CapabilityRequest,
  type ConversationContext,
  type CapabilityResult
} from './intelligent-orchestrator.service.js';

// Individual capability services
export {
  ImageGenerationService,
  type ImageGenerationRequest,
  type ImageGenerationResult,
  type ImageProvider
} from './image-generation.service.js';

export {
  GifGenerationService,
  type GifGenerationRequest,
  type GifGenerationResult,
  type GifProvider
} from './gif-generation.service.js';

export {
  SpeechGenerationService,
  type SpeechGenerationRequest,
  type SpeechGenerationResult,
  type SpeechProvider
} from './speech-generation.service.js';

export {
  EnhancedReasoningService,
  type ReasoningRequest,
  type ReasoningResult,
  type ReasoningStep
} from './enhanced-reasoning.service.js';

export interface ModelTelemetry {
  provider: string;
  model: string;
  latencyMs: number;
  success: boolean;
}

class ModelTelemetryStore {
  private recent: ModelTelemetry[] = [];
  record(entry: ModelTelemetry) {
    this.recent.push(entry);
    if (this.recent.length > 200) this.recent.shift();
  }
  snapshot(limit = 20): ModelTelemetry[] {
    return this.recent.slice(-limit);
  }
}

export const modelTelemetryStore = new ModelTelemetryStore();

export interface ProviderStatus {
  name: string;
  available: boolean;
  details?: string;
}

export function getProviderStatuses(): ProviderStatus[] {
  return [
    { name: 'gemini', available: !!process.env.GEMINI_API_KEY },
    { name: 'openai', available: !!process.env.OPENAI_API_KEY },
    { name: 'anthropic', available: !!process.env.ANTHROPIC_API_KEY },
    { name: 'groq', available: !!process.env.GROQ_API_KEY },
    { name: 'mistral', available: !!process.env.MISTRAL_API_KEY },
    { name: 'openai_compat', available: !!process.env.OPENAI_COMPAT_API_KEY && !!process.env.OPENAI_COMPAT_BASE_URL }
  ];
}

export interface ProviderHealth {
  provider: string;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
  lastUpdated: number;
}

class ProviderHealthStore {
  private health: Map<string, ProviderHealth> = new Map();

  update(entry: ModelTelemetry) {
    const key = `${entry.provider}`;
    const current = this.health.get(key) || { provider: entry.provider, successCount: 0, errorCount: 0, avgLatencyMs: entry.latencyMs, lastUpdated: Date.now() };
    const total = current.successCount + current.errorCount + 1;
    const newAvg = (current.avgLatencyMs * (total - 1) + entry.latencyMs) / total;
    this.health.set(key, {
      provider: entry.provider,
      successCount: current.successCount + (entry.success ? 1 : 0),
      errorCount: current.errorCount + (entry.success ? 0 : 1),
      avgLatencyMs: Math.floor(newAvg),
      lastUpdated: Date.now()
    });
  }

  get(provider: string): ProviderHealth | undefined {
    return this.health.get(provider);
  }

  snapshot(): ProviderHealth[] {
    return Array.from(this.health.values());
  }
}

export const providerHealthStore = new ProviderHealthStore();