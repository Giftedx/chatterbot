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