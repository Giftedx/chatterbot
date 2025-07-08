/**
 * Unified exports for the multimodal AI system
 */

// Core services
export { ImageAnalysisService } from './image-analysis/index.js';
export { AudioAnalysisService } from './audio-analysis/index.js';
export { DocumentProcessingService } from './document-processing.service.js';
export { FileIntelligenceService } from './file-intelligence.service.js';
export { MultimodalIntegrationService } from './integration.service.js';

// Types
export * from './types.js';

// Re-export commonly used interfaces
export type {
  MediaFile,
  FileProcessingOptions,
  VisionAnalysisResult,
  AudioAnalysisResult,
  FileIntelligenceResult,
  BatchProcessingResult,
  ConversationContext,
  CrossModalInsight,
  MediaSearchQuery,
  ContentRecommendation,
  ProcessingStatus,
  FileType
} from './types.js';
