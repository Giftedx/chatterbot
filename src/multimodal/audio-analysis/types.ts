/**
 * Audio Analysis Types
 * Shared interfaces and types for the audio analysis service
 * Uses base types from multimodal/types.ts
 */

// Import and re-export commonly used types from multimodal types
import type {
  MediaFile,
  AudioAnalysisResult,
  FileProcessingOptions,
  AudioMetadata,
  ProcessingStatus,
  TranscriptionSegment,
  SentimentScore,
  DetectedSpeaker,
  SpeakerSegment
} from '../types.js';

export type {
  MediaFile,
  AudioAnalysisResult,
  FileProcessingOptions,
  AudioMetadata,
  ProcessingStatus,
  TranscriptionSegment,
  SentimentScore,
  DetectedSpeaker,
  SpeakerSegment
};

/**
 * Audio validation configuration
 */
export interface AudioValidationConfig {
  supportedFormats: Set<string>;
  maxFileSize: number;
  maxDuration: number;
}

/**
 * Audio processing options specific to audio analysis
 */
export interface AudioProcessingOptions {
  enableTranscription?: boolean;
  enableSpeakerDetection?: boolean;
  enableSentimentAnalysis?: boolean;
  enableQualityAssessment?: boolean;
  enableClassification?: boolean;
}

/**
 * Audio search options
 */
export interface AudioSearchOptions {
  query: string;
  userId: string;
  includeTranscription?: boolean;
  includeSentiment?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Audio search result with relevance scoring
 */
export interface AudioSearchResult {
  file: MediaFile;
  relevanceScore: number;
  matchedSegments?: TranscriptionSegment[];
  highlightedText?: string;
}

/**
 * Quality assessment metrics (aligned with base types)
 * Note: Base types use { clarity, noiseLevel, volumeLevel } structure
 */
export interface QualityMetrics {
  clarity: number;
  noiseLevel: number;
  volumeLevel: number;
}

/**
 * Audio classification result (aligned with base types)
 * Note: Base types use { type, confidence, subCategories } structure
 */
export interface AudioClassification {
  type: string;
  confidence: number;
  subCategories: string[];
}

/**
 * Database update payload for audio analysis
 */
export interface AudioAnalysisUpdatePayload {
  audioAnalysis?: import('../types.js').AudioAnalysisResult;
  audioMetadata?: import('../types.js').AudioMetadata;
  extractedText?: string;
  description?: string;
  tags?: string[];
}
