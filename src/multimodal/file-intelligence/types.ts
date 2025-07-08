/**
 * File Intelligence Types
 * Shared interfaces and types for the file intelligence service
 * Uses base types from multimodal/types.ts
 */

// Re-export commonly used types from multimodal types
export type {
  MediaFile,
  FileType,
  ProcessingStatus,
  FileProcessingOptions,
  VisionAnalysisResult,
  AudioAnalysisResult,
  BoundingBox,
  DetectedObject,
  DetectedFace,
  TranscriptionSegment,
  SentimentScore,
  CrossModalInsight,
  FileIntelligenceResult
} from '../types.js';

/**
 * Extended multimodal analysis result for file intelligence
 */
export interface MultimodalAnalysisResult {
  vision?: import('../types.js').VisionAnalysisResult;
  audio?: import('../types.js').AudioAnalysisResult;
  document?: import('../document-processing/types.js').DocumentAnalysisResult;
  [key: string]: unknown; // Index signature for compatibility
}

/**
 * Document analysis result structure - extending base types
 */
export interface DocumentAnalysisResult {
  textContent?: DocumentTextContent;
  structure?: DocumentStructure;
  keyInformation?: DocumentKeyInformation;
  classification?: DocumentClassification;
}

/**
 * Intelligence metadata containing processing information
 */
export interface IntelligenceMetadata {
  processingVersion: string;
  modelVersions: Record<string, string | undefined>;
  confidenceScores: Record<string, number>;
  contentComplexity: ComplexityLevel;
  informationDensity: number;
  accessibilityFeatures: string[];
  contentRichness: Record<string, number>;
}

/**
 * Actionable recommendation based on analysis
 */
export interface Recommendation {
  type: RecommendationType;
  category: RecommendationCategory;
  priority: 'low' | 'medium' | 'high';
  description: string;
  action: string;
  metadata?: Record<string, unknown>;
}

/**
 * Document text content
 */
export interface DocumentTextContent {
  fullText: string;
  wordCount: number;
  characterCount: number;
  language?: string;
}

/**
 * Document structure information
 */
export interface DocumentStructure {
  hasHeadings: boolean;
  hasTables: boolean;
  hasLists: boolean;
  sectionCount: number;
  tableCount: number;
  listCount: number;
}

/**
 * Key information extracted from document
 */
export interface DocumentKeyInformation {
  topics: string[];
  entities: string[];
  actionItems: string[];
  dates: string[];
  numbers: string[];
  urls: string[];
}

/**
 * Document classification result
 */
export interface DocumentClassification {
  type: string;
  confidence: number;
  categories: string[];
}

/**
 * Search result with relevance scoring
 */
export interface IntelligentSearchResult {
  file: MediaFileWithInsights;
  relevanceScore: number;
  matchType: SearchMatchType;
}

/**
 * Media file with optional insights
 */
export interface MediaFileWithInsights {
  id: number;
  userId: string;
  fileType: string;
  originalName: string;
  description?: string;
  extractedText?: string;
  tags?: string;
  createdAt: Date;
  mediaInsights?: MediaInsight[];
}

/**
 * Media insight record
 */
export interface MediaInsight {
  id: number;
  mediaFileId: number;
  insightType: string;
  confidence: number;
  content: Record<string, unknown>;
  generatedBy: string;
  createdAt: Date;
}

/**
 * Search options for intelligent search
 */
export interface IntelligentSearchOptions {
  fileTypes?: string[];
  limit?: number;
  includeInsights?: boolean;
}

/**
 * Complexity assessment levels
 */
export type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'very_complex';

/**
 * Recommendation types
 */
export type RecommendationType = 
  | 'quality_improvement'
  | 'organization'
  | 'accessibility'
  | 'workflow'
  | 'security'
  | 'optimization';

/**
 * Recommendation categories
 */
export type RecommendationCategory = 
  | 'visual'
  | 'audio'
  | 'document'
  | 'multimodal'
  | 'productivity'
  | 'performance'
  | 'accessibility';

/**
 * Match types for search results
 */
export type SearchMatchType = 
  | 'filename'
  | 'content'
  | 'description'
  | 'tags'
  | 'metadata'
  | 'insight';

/**
 * Processing complexity assessment
 */
export interface ProcessingComplexity {
  complexity: 'low' | 'medium' | 'high' | 'very_high';
  estimatedTimeMs: number;
  factors: string[];
}

/**
 * Analysis capabilities for file types
 */
export interface AnalysisCapabilities {
  vision: boolean;
  audio: boolean;
  document: boolean;
  crossModal: boolean;
}
