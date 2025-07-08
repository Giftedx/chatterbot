/**
 * Multimodal Integration Service
 * Unified service for processing mixed content and providing holistic analysis
 * 
 * Now modularized for better maintainability and following SOLID principles.
 */

export { MultimodalIntegrationService } from './integration/index.js';

// Re-export modular services for direct access if needed
export { MultimodalBatchProcessingService } from './integration/batch-processing.service.js';
export { MultimodalAnalysisService } from './integration/analysis-simplified.service.js';
export { MultimodalConversationService } from './integration/conversation.service.js';
export { MultimodalStorageService } from './integration/storage.service.js';
