/**
 * Document Processing Service Export Facade
 * Maintains backwards compatibility with the modular document processing service
 */

export { DocumentProcessingService } from './document-processing/index.js';
export type {
  MediaFile,
  DocumentAnalysisResult,
  FileProcessingOptions,
  DocumentMetadata,
  ProcessingStatus,
  DocumentSection,
  ContentType,
  TextExtractionResult,
  DocumentStructure,
  DocumentClassification,
  KeyInformation,
  QualityMetrics,
  DocumentProcessingUpdate,
  DocumentSearchOptions,
  DocumentValidationResult
} from './document-processing/types.js';
