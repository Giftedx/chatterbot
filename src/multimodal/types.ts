/**
 * Multimodal AI Integration Types
 * Type definitions for image, audio, document, and file processing
 */

/**
 * Supported file types for multimodal processing
 */
export type FileType = 'image' | 'audio' | 'video' | 'document' | 'code' | 'other';

/**
 * Processing status for media files
 */
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Content moderation status
 */
export type ModerationStatus = 'approved' | 'flagged' | 'rejected' | 'pending_review';

/**
 * Media file metadata and processing information
 */
export interface MediaFile {
  id: number;
  userId: string;
  guildId?: string;
  channelId: string;
  messageId?: string;
  
  // File metadata
  filename: string;
  originalName: string;
  fileType: FileType;
  mimeType: string;
  fileSize: number;
  filePath: string;
  
  // Processing status
  processingStatus: ProcessingStatus;
  processedAt?: Date;
  processingError?: string;
  
  // Content analysis results
  extractedText?: string;
  description?: string;
  tags?: string[];
  categories?: string[];
  
  // Metadata by type
  imageMetadata?: ImageMetadata;
  audioMetadata?: AudioMetadata;
  documentMetadata?: DocumentMetadata;
  
  // AI analysis results
  visionAnalysis?: VisionAnalysisResult;
  audioAnalysis?: AudioAnalysisResult;
  contentSafety?: ContentSafetyResult;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Image-specific metadata
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  colorSpace?: string;
  hasAlpha?: boolean;
  exifData?: Record<string, string | number>;
  dominantColors?: string[];
}

/**
 * Audio-specific metadata
 */
export interface AudioMetadata {
  duration: number; // seconds
  sampleRate?: number;
  channels?: number;
  bitrate?: number;
  format: string;
  codec?: string;
}

/**
 * Document-specific metadata
 */
export interface DocumentMetadata {
  pageCount?: number;
  wordCount?: number;
  language?: string;
  author?: string;
  title?: string;
  creationDate?: string;
  modificationDate?: string;
  format: string;
}

/**
 * Vision analysis result from AI services
 */
export interface VisionAnalysisResult {
  // Text detection (OCR)
  textDetection?: {
    fullText: string;
    textBlocks: TextBlock[];
    confidence: number;
  };
  
  // Object detection
  objectDetection?: {
    objects: DetectedObject[];
    scene: SceneDescription;
  };
  
  // Face detection
  faceDetection?: {
    faces: DetectedFace[];
    faceCount: number;
  };
  
  // Image properties
  imageProperties?: {
    dominantColors: ColorInfo[];
    safeSearch: SafeSearchResult;
  };
  
  // Label detection
  labelDetection?: {
    labels: DetectedLabel[];
  };
  
  // Landmark detection
  landmarkDetection?: {
    landmarks: DetectedLandmark[];
  };
}

/**
 * Text block from OCR
 */
export interface TextBlock {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
  language?: string;
}

/**
 * Detected object in image
 */
export interface DetectedObject {
  name: string;
  confidence: number;
  boundingBox: BoundingBox;
  category?: string;
}

/**
 * Scene description
 */
export interface SceneDescription {
  description: string;
  confidence: number;
  tags: string[];
  adult: boolean;
  racy: boolean;
  violence: boolean;
}

/**
 * Detected face information
 */
export interface DetectedFace {
  boundingBox: BoundingBox;
  confidence: number;
  emotions?: EmotionDetection[];
  ageRange?: { min: number; max: number };
  gender?: string;
  landmarks?: FaceLandmark[];
}

/**
 * Emotion detection result
 */
export interface EmotionDetection {
  emotion: string;
  confidence: number;
}

/**
 * Face landmark point
 */
export interface FaceLandmark {
  type: string;
  x: number;
  y: number;
}

/**
 * Color information
 */
export interface ColorInfo {
  color: {
    red: number;
    green: number;
    blue: number;
  };
  score: number;
  pixelFraction: number;
}

/**
 * Safe search result
 */
export interface SafeSearchResult {
  adult: string;
  spoof: string;
  medical: string;
  violence: string;
  racy: string;
}

/**
 * Detected label
 */
export interface DetectedLabel {
  description: string;
  score: number;
  topicality: number;
}

/**
 * Detected landmark
 */
export interface DetectedLandmark {
  description: string;
  score: number;
  boundingPoly: BoundingBox;
  locations: GeoLocation[];
}

/**
 * Geographic location
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
}

/**
 * Bounding box for detected elements
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Audio analysis result
 */
export interface AudioAnalysisResult {
  // Speech-to-text
  transcription?: {
    text: string;
    confidence: number;
    segments: TranscriptionSegment[];
    language: string;
  };
  
  // Speaker detection
  speakerDetection?: {
    speakers: DetectedSpeaker[];
    speakerCount: number;
  };
  
  // Audio classification
  classification?: {
    type: string; // speech, music, noise, silence
    confidence: number;
    subCategories: string[];
  };
  
  // Sentiment analysis
  sentiment?: {
    overall: SentimentScore;
    segments: SentimentSegment[];
  };
  
  // Audio quality metrics
  quality?: {
    clarity: number;
    noiseLevel: number;
    volumeLevel: number;
  };
}

/**
 * Transcription segment
 */
export interface TranscriptionSegment {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  speaker?: string;
}

/**
 * Detected speaker
 */
export interface DetectedSpeaker {
  id: string;
  confidence: number;
  segments: SpeakerSegment[];
}

/**
 * Speaker segment
 */
export interface SpeakerSegment {
  startTime: number;
  endTime: number;
  confidence: number;
}

/**
 * Sentiment score
 */
export interface SentimentScore {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number; // -1 to 1
  magnitude: number; // 0 to infinity
}

/**
 * Sentiment segment
 */
export interface SentimentSegment {
  text: string;
  sentiment: SentimentScore;
  startTime?: number;
  endTime?: number;
}

/**
 * Content safety analysis result
 */
export interface ContentSafetyResult {
  overallScore: number; // 0-1 safety score
  categories: SafetyCategory[];
  recommendations: string[];
  requiresReview: boolean;
  autoActionTaken?: string;
}

/**
 * Safety category assessment
 */
export interface SafetyCategory {
  category: string;
  score: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

/**
 * Media insight from AI analysis
 */
export interface MediaInsight {
  id: number;
  mediaFileId: number;
  insightType: InsightType;
  confidence: number;
  content: Record<string, string | number | boolean>;
  generatedBy: string;
  processingTime?: number;
  createdAt: Date;
}

/**
 * Types of insights that can be generated
 */
export type InsightType = 
  | 'object_detection'
  | 'text_recognition'
  | 'scene_analysis'
  | 'face_detection'
  | 'audio_transcription'
  | 'speaker_detection'
  | 'sentiment_analysis'
  | 'content_classification'
  | 'safety_analysis'
  | 'quality_assessment';

/**
 * Multimodal conversation context
 */
export interface MultimodalConversation {
  id: number;
  conversationThreadId: number;
  
  // Context summaries
  mediaReferences: string[];
  visualContext?: VisionAnalysisResult;
  audioContext?: AudioAnalysisResult;
  documentContext?: DocumentMetadata;
  
  // AI processing results
  multimodalSummary?: string;
  keyVisualElements: string[];
  extractedEntities: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Content moderation result
 */
export interface ContentModerationResult {
  id: number;
  mediaFileId?: number;
  messageId?: string;
  
  // Moderation results
  moderationStatus: ModerationStatus;
  safetyScore?: number;
  flaggedCategories: string[];
  
  // Detailed scores
  adultContent?: number;
  violenceContent?: number;
  hateSpeech?: number;
  spamContent?: number;
  
  // Actions and review
  actionTaken?: string;
  reviewRequired: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  
  createdAt: Date;
}

/**
 * File processing options
 */
export interface FileProcessingOptions {
  enableOCR?: boolean;
  enableObjectDetection?: boolean;
  enableFaceDetection?: boolean;
  enableTranscription?: boolean;
  enableSentimentAnalysis?: boolean;
  enableContentModeration?: boolean;
  generateDescription?: boolean;
  extractTags?: boolean;
  thumbnailSize?: number;
  maxProcessingTime?: number;
  qualityThreshold?: number;
}

/**
 * Multimodal response generation options
 */
export interface MultimodalResponseOptions {
  includeVisualDescription?: boolean;
  includeAudioTranscription?: boolean;
  includeDocumentSummary?: boolean;
  referenceSpecificElements?: boolean;
  generateQuestions?: boolean;
  suggestActions?: boolean;
  contextualAnalysis?: boolean;
}

/**
 * File upload and processing result
 */
export interface FileProcessingResult {
  mediaFile: MediaFile;
  insights: MediaInsight[];
  moderationResult?: ContentModerationResult;
  processingTime: number;
  errors?: string[];
  warnings?: string[];
}

/**
 * Batch processing job
 */
export interface BatchProcessingJob {
  id: string;
  files: string[]; // File paths or IDs
  options: FileProcessingOptions;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  results: FileProcessingResult[];
  errors: string[];
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Multimodal search query
 */
export interface MultimodalSearchQuery {
  textQuery?: string;
  imageQuery?: string; // Base64 encoded image or URL
  audioQuery?: string; // Audio file path or URL
  fileTypes?: FileType[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  userId?: string;
  channelId?: string;
  guildId?: string;
  minConfidence?: number;
  maxResults?: number;
}

/**
 * Multimodal search result
 */
export interface MultimodalSearchResult {
  mediaFile: MediaFile;
  relevanceScore: number;
  matchType: 'text' | 'visual' | 'audio' | 'semantic';
  highlightedContent: string[];
  relatedFiles: MediaFile[];
  conversationContext?: {
    threadId: number;
    messageId: string;
    timestamp: Date;
  };
}

/**
 * AI service configuration
 */
export interface AIServiceConfig {
  // Vision services
  googleVision?: {
    enabled: boolean;
    apiKey?: string;
    features: string[];
  };
  
  openAIVision?: {
    enabled: boolean;
    apiKey?: string;
    model: string;
  };
  
  // Audio services
  speechToText?: {
    provider: 'google' | 'azure' | 'aws' | 'openai';
    apiKey?: string;
    language?: string;
  };
  
  // Document processing
  documentAI?: {
    enabled: boolean;
    ocrProvider: string;
    pdfParser: string;
  };
  
  // Content moderation
  contentModeration?: {
    provider: 'openai' | 'google' | 'azure';
    apiKey?: string;
    strictness: 'low' | 'medium' | 'high';
  };
}

/**
 * File storage configuration
 */
export interface FileStorageConfig {
  provider: 'local' | 's3' | 'gcp' | 'azure';
  basePath?: string;
  bucketName?: string;
  region?: string;
  accessKey?: string;
  secretKey?: string;
  maxFileSize: number; // bytes
  allowedMimeTypes: string[];
  thumbnailSizes: number[];
}

/**
 * Performance metrics for multimodal processing
 */
export interface ProcessingMetrics {
  totalFilesProcessed: number;
  averageProcessingTime: number;
  successRate: number;
  errorRate: number;
  processingTimeByType: Record<FileType, number>;
  apiCallCounts: Record<string, number>;
  costEstimates: Record<string, number>;
}

/**
 * Content analysis summary
 */
export interface ContentAnalysisSummary {
  totalFiles: number;
  fileTypeDistribution: Record<FileType, number>;
  topCategories: string[];
  topObjects: string[];
  averageConfidence: number;
  languageDistribution: Record<string, number>;
  moderationFlags: Record<string, number>;
  insights: {
    mostCommonObjects: string[];
    dominantColors: string[];
    frequentTopics: string[];
    sentimentTrends: SentimentScore[];
  };
}

/**
 * File Intelligence Result
 */
export interface FileIntelligenceResult {
  fileId: number;
  fileType: FileType;
  processingStatus: ProcessingStatus;
  startedAt: Date;
  completedAt?: Date;
  processingTimeMs?: number;
  error?: string;
  analysis: Record<string, unknown>;
  crossModalInsights?: CrossModalInsight[];
  intelligenceMetadata?: Record<string, unknown>;
  recommendations?: Array<{
    type: string;
    category: string;
    priority: string;
    description: string;
    action: string;
  }>;
}

/**
 * Batch Processing Result
 */
export interface BatchProcessingResult {
  batchId: string;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  totalInsights: number;
  startedAt: Date;
  completedAt?: Date;
  processingTimeMs?: number;
  status?: ProcessingStatus;
  error?: string;
  fileResults: FileIntelligenceResult[];
  crossModalInsights: CrossModalInsight[];
  unifiedAnalysis: Record<string, unknown>;
  batchMetadata: Record<string, unknown>;
}

/**
 * Conversation Context
 */
export interface ConversationContext {
  conversationId: string;
  processedAt: Date;
  mediaFiles: Array<{
    id: number;
    type: FileType;
    name: string;
    mimeType: string;
  }>;
  textContent?: string;
  multimodalAnalysis: Record<string, unknown>;
  crossModalInsights: CrossModalInsight[];
  conversationSummary?: string;
  topicDetection?: string[];
  entityMentions?: Array<{
    entity: string;
    type: string;
    confidence: number;
  }>;
  sentimentAnalysis?: {
    overall: string;
    confidence: number;
    details?: Record<string, unknown>;
  };
  actionableItems?: string[];
  confidenceScores: Record<string, number>;
  error?: string;
}

/**
 * Cross Modal Insight
 */
export interface CrossModalInsight {
  type: string;
  confidence: number;
  description: string;
  sources: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Media Search Query
 */
export interface MediaSearchQuery {
  text: string;
  type?: 'general' | 'content' | 'metadata' | 'semantic';
  includeModalities?: FileType[];
  timeRange?: {
    start?: Date;
    end?: Date;
  };
  limit?: number;
  filters?: {
    userId?: string;
    fileTypes?: FileType[];
    tags?: string[];
    hasText?: boolean;
    hasAudio?: boolean;
    hasImages?: boolean;
  };
}

/**
 * Content Recommendation
 */
export interface ContentRecommendation {
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestedFiles?: MediaFile[];
  actionableSteps?: string[];
  confidenceScore: number;
}
