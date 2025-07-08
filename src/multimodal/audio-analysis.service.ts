/**
 * Audio Analysis Service Export Facade
 * Maintains backward compatibility with the original AudioAnalysisService interface
 */

// Export the modular implementation as the main service
export { AudioAnalysisService } from './audio-analysis/index.js';

// Export types for external use
export type {
  AudioAnalysisResult,
  AudioMetadata,
  TranscriptionSegment,
  SentimentScore,
  DetectedSpeaker,
  AudioSearchOptions,
  AudioSearchResult
} from './audio-analysis/types.js';
