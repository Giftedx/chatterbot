/**
 * File Intelligence Service Export Facade
 * Maintains backwards compatibility with the modular file intelligence service
 */

export { FileIntelligenceService } from './file-intelligence/index.js';
export type {
  MediaFile,
  FileType,
  ProcessingStatus,
  FileProcessingOptions,
  FileIntelligenceResult,
  MultimodalAnalysisResult,
  CrossModalInsight,
  IntelligentSearchOptions,
  IntelligentSearchResult,
  Recommendation,
  IntelligenceMetadata,
  DocumentAnalysisResult,
  DocumentTextContent,
  DocumentStructure,
  DocumentKeyInformation,
  DocumentClassification,
  ComplexityLevel,
  RecommendationType,
  RecommendationCategory,
  SearchMatchType,
  ProcessingComplexity,
  AnalysisCapabilities
} from './file-intelligence/types.js';
