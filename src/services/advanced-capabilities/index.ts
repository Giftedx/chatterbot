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