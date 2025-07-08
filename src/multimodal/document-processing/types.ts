/**
 * Document Processing Types
 * Shared interfaces and types for document processing modules
 */

import type { MediaFile, DocumentMetadata, ProcessingStatus, FileProcessingOptions } from '../types.js';

// Re-export main types for convenience
export type {
  MediaFile,
  DocumentMetadata,
  ProcessingStatus,
  FileProcessingOptions
};

// Document-specific content types
export type ContentType = 
  | 'text'
  | 'technical'
  | 'legal'
  | 'academic'
  | 'financial'
  | 'creative'
  | 'code'
  | 'data'
  | 'presentation'
  | 'manual'
  | 'report'
  | 'other';

// Document processing options extending base FileProcessingOptions
export interface DocumentProcessingOptions extends FileProcessingOptions {
  enableTextExtraction?: boolean;
  enableStructureAnalysis?: boolean;
  enableKeywordExtraction?: boolean;
  enableSummarization?: boolean;
  enableClassification?: boolean;
  enableQualityAssessment?: boolean;
}

// Document section definition
export interface DocumentSection {
  title: string;
  content: string;
  level: number;
  wordCount: number;
}

// Text extraction result
export interface TextExtractionResult {
  fullText: string;
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  pageCount?: number;
}

// Document structure analysis
export interface DocumentStructure {
  sections: DocumentSection[];
  headingLevels: number[];
  tableOfContents?: Array<{ title: string; level: number; page?: number }>;
  documentFlow: 'simple' | 'basic' | 'structured' | 'complex';
}

// Document classification result
export interface DocumentClassification {
  documentType: string;
  contentType: ContentType;
  categories: string[];
  confidence: number;
  format: string;
}

// Key information extraction
export interface KeyInformation {
  keywords: Array<{ term: string; frequency: number; relevance: number }>;
  entities: Array<{ text: string; type: string; confidence: number }>;
  topics: Array<{ topic: string; weight: number }>;
  summary?: string;
}

// Quality assessment metrics
export interface QualityMetrics {
  readabilityScore: number;
  sentimentScore: number;
  grammarScore: number;
  coherenceScore: number;
  completenessScore: number;
  overallQuality: 'poor' | 'fair' | 'good' | 'excellent';
}

// Document analysis result containing all processing outputs
export interface DocumentAnalysisResult {
  textContent?: TextExtractionResult;
  structure?: DocumentStructure;
  classification?: DocumentClassification;
  keyInformation?: KeyInformation;
  qualityMetrics?: QualityMetrics;
  summary?: string;
}

// Database update payload for document analysis
export interface DocumentProcessingUpdate {
  documentAnalysis: DocumentAnalysisResult;
  documentMetadata: DocumentMetadata | null;
  extractedText?: string;
  description: string;
  tags: string[];
  categories: string[];
  processingStatus: ProcessingStatus;
  processedAt: Date;
}

// Search options for documents
export interface DocumentSearchOptions {
  limit?: number;
  documentType?: string;
  contentType?: ContentType;
  categories?: string[];
  sortBy?: 'relevance' | 'date' | 'size';
  sortOrder?: 'asc' | 'desc';
}

// Validation result for document files
export interface DocumentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  supportedFormat: boolean;
  sizeWithinLimit: boolean;
}

// Advanced analytics result
export interface AdvancedAnalyticsResult {
  advancedAnalytics: {
    complexity: number;
    formality: number;
    density: number;
    uniqueness: number;
    structure: 'poor' | 'basic' | 'good' | 'excellent';
  };
  semanticConcepts: {
    concepts: Array<{ concept: string; relevance: number; context: string[] }>;
    relationships: Array<{ from: string; to: string; type: string; strength: number }>;
    themes: Array<{ theme: string; weight: number; examples: string[] }>;
  };
  structureAnalysis: {
    maxDepth: number;
    hierarchyMap: Record<number, number[]>;
    parentChildRelations: Array<{ parent: number; children: number[] }>;
  };
  textMetrics: {
    wordCount: number;
    characterCount: number;
    paragraphCount: number;
    pageCount?: number;
  };
}

// Processing configuration constants
export const DOCUMENT_PROCESSING_CONFIG = {
  MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB
  SUPPORTED_FORMATS: new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'application/rtf'
  ]),
  DEFAULT_OPTIONS: {
    enableTextExtraction: true,
    enableStructureAnalysis: true,
    enableKeywordExtraction: true,
    enableSummarization: true,
    enableClassification: true,
    enableQualityAssessment: true
  } as DocumentProcessingOptions
};
