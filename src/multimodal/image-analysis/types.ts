/**
 * Image Analysis Types
 * Re-exports from base multimodal types with local extensions
 */

import type {
  MediaFile,
  VisionAnalysisResult,
  FileProcessingOptions,
  ImageMetadata,
  ContentSafetyResult,
  SafetyCategory,
  ProcessingStatus,
  TextBlock,
  DetectedObject,
  DetectedFace,
  DetectedLabel,
  ColorInfo,
  SafeSearchResult,
  BoundingBox
} from '../types.js';

// Re-export types for use in modules
export type {
  MediaFile,
  VisionAnalysisResult,
  FileProcessingOptions,
  ImageMetadata,
  ContentSafetyResult,
  SafetyCategory,
  ProcessingStatus,
  TextBlock,
  DetectedObject,
  DetectedFace,
  DetectedLabel,
  ColorInfo,
  SafeSearchResult,
  BoundingBox
};

// Local type extensions specific to image analysis modules
export interface TextDetectionResult {
  fullText: string;
  textBlocks: TextBlock[];
  confidence: number;
}

export interface ObjectDetectionResult {
  objects: DetectedObject[];
  confidence: number;
}

export interface FaceDetectionResult {
  faces: DetectedFace[];
  faceCount: number;
}

export interface PropertyAnalysisResult {
  dominantColors: ColorInfo[];
  safeSearch: SafeSearchResult;
  metadata: ImageMetadata;
}

export interface ContentClassificationResult {
  labels: DetectedLabel[];
  categories: string[];
  description: string;
  tags: string[];
}

export interface ImageAnalysisConfig {
  supportedFormats: Set<string>;
  maxFileSize: number;
}
