/**
 * File Analysis Service
 * Core file analysis coordination and processing
 */

// import { MediaFile } from '@prisma/client';
// TODO: Re-enable after Prisma client generation
type MediaFile = any;
import {
  FileProcessingOptions,
  MultimodalAnalysisResult,
  ProcessingComplexity,
  AnalysisCapabilities
} from './types.js';
import { ImageAnalysisService } from '../image-analysis.service.js';
import { AudioAnalysisService } from '../audio-analysis.service.js';
import { DocumentProcessingService } from '../document-processing.service.js';
import { logger } from '../../utils/logger.js';

/**
 * Core file analysis service that routes files to appropriate processors
 */
export class FileAnalysisService {
  private readonly imageService: ImageAnalysisService;
  private readonly audioService: AudioAnalysisService;
  private readonly documentService: DocumentProcessingService;
  
  constructor() {
    this.imageService = new ImageAnalysisService();
    this.audioService = new AudioAnalysisService();
    this.documentService = new DocumentProcessingService();
  }

  /**
   * Convert Prisma MediaFile to service-compatible format
   */
  private convertMediaFile(prismaFile: MediaFile): import('../types.js').MediaFile {
    return {
      ...prismaFile,
      guildId: prismaFile.guildId ?? undefined,
      messageId: prismaFile.messageId ?? undefined,
      processedAt: prismaFile.processedAt ?? undefined,
      processingError: prismaFile.processingError ?? undefined,
      extractedText: prismaFile.extractedText ?? undefined,
      description: prismaFile.description ?? undefined,
      tags: prismaFile.tags ? JSON.parse(prismaFile.tags) : undefined,
      categories: prismaFile.categories ? JSON.parse(prismaFile.categories) : undefined,
      fileType: prismaFile.fileType as import('../types.js').FileType,
      processingStatus: prismaFile.processingStatus as import('../types.js').ProcessingStatus,
      // Convert JSON metadata fields safely
      imageMetadata: prismaFile.imageMetadata as unknown as import('../types.js').ImageMetadata | undefined,
      audioMetadata: prismaFile.audioMetadata as unknown as import('../types.js').AudioMetadata | undefined,
      documentMetadata: prismaFile.documentMetadata as unknown as import('../types.js').DocumentMetadata | undefined,
      visionAnalysis: prismaFile.visionAnalysis as unknown as import('../types.js').VisionAnalysisResult | undefined,
      audioAnalysis: prismaFile.audioAnalysis as unknown as import('../types.js').AudioAnalysisResult | undefined,
      contentSafety: prismaFile.contentSafety as unknown as import('../types.js').ContentSafetyResult | undefined
    };
  }

  /**
   * Process any file type and provide multimodal analysis
   */
  public async analyzeFile(
    mediaFile: MediaFile,
    options: FileProcessingOptions = {}
  ): Promise<MultimodalAnalysisResult> {
    try {
      logger.debug('Starting file analysis', {
        operation: 'file-analysis',
        metadata: {
          fileId: mediaFile.id,
          fileType: mediaFile.fileType,
          fileName: mediaFile.originalName
        }
      });

      // Convert Prisma MediaFile to service-compatible format
      const serviceFile = this.convertMediaFile(mediaFile);
      const analysis: MultimodalAnalysisResult = {};

      // Route to appropriate service based on file type
      switch (serviceFile.fileType) {
        case 'image': {
          const visionResult = await this.imageService.analyzeImage(serviceFile, options);
          if (visionResult) analysis.vision = visionResult;
          break;
        }
          
        case 'audio': {
          const audioResult = await this.audioService.analyzeAudio(serviceFile, options);
          if (audioResult) analysis.audio = audioResult;
          break;
        }
          
        case 'document': {
          const documentResult = await this.documentService.processDocument(serviceFile, options);
          if (documentResult) analysis.document = documentResult;
          break;
        }
          
        case 'video': {
          const videoAnalysis = await this.processVideoFile(mediaFile, options);
          return videoAnalysis;
        }
          
        default:
          logger.warn('Unsupported file type for analysis', {
            operation: 'file-analysis',
            metadata: {
              fileId: mediaFile.id,
              fileType: mediaFile.fileType
            }
          });
          throw new Error(`Unsupported file type: ${mediaFile.fileType}`);
      }

      logger.debug('File analysis completed', {
        operation: 'file-analysis',
        metadata: {
          fileId: mediaFile.id,
          hasVision: !!analysis.vision,
          hasAudio: !!analysis.audio,
          hasDocument: !!analysis.document
        }
      });

      return analysis;

    } catch (error) {
      logger.error('File analysis failed', {
        operation: 'file-analysis',
        metadata: {
          fileId: mediaFile.id,
          error: String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Process video files (combines image and audio analysis)
   */
  public async processVideoFile(
    mediaFile: MediaFile,
    options: FileProcessingOptions
  ): Promise<MultimodalAnalysisResult> {
    const analysis: MultimodalAnalysisResult = {};

    try {
      logger.info('Processing video file', {
        operation: 'video-processing',
        metadata: {
          fileId: mediaFile.id,
          fileName: mediaFile.originalName
        }
      });

      // In a real implementation, this would:
      // 1. Extract keyframes from video for image analysis
      // 2. Extract audio track for audio analysis
      // 3. Analyze video metadata (duration, resolution, etc.)
      
      // Simulate keyframe extraction and analysis
      if (options.enableObjectDetection !== false || options.enableFaceDetection !== false) {
        analysis.vision = await this.processVideoKeyframes(mediaFile);
      }

      // Simulate audio track analysis
      if (options.enableTranscription !== false) {
        analysis.audio = await this.processVideoAudio(mediaFile);
      }

      logger.debug('Video processing completed', {
        operation: 'video-processing',
        metadata: {
          fileId: mediaFile.id,
          hasVision: !!analysis.vision,
          hasAudio: !!analysis.audio
        }
      });

      return analysis;

    } catch (error) {
      logger.error('Video processing failed', {
        operation: 'video-processing',
        metadata: {
          fileId: mediaFile.id,
          error: String(error)
        }
      });
      
      return analysis;
    }
  }

  /**
   * Process video keyframes for visual analysis
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async processVideoKeyframes(_mediaFile: MediaFile): Promise<import('../types.js').VisionAnalysisResult> {
    // Mock video keyframe processing - would need actual video processing libraries
    // like ffmpeg, opencv, etc.
    
    return {
      textDetection: {
        fullText: '',
        textBlocks: [],
        confidence: 0.9
      },
      objectDetection: {
        objects: [
          { name: 'person', confidence: 0.92, boundingBox: { x: 100, y: 50, width: 200, height: 300 } },
          { name: 'background', confidence: 0.85, boundingBox: { x: 0, y: 0, width: 1920, height: 1080 } }
        ],
        scene: {
          description: 'Video containing people in an indoor meeting environment',
          confidence: 0.88,
          tags: ['indoor', 'meeting'],
          adult: false,
          racy: false,
          violence: false
        }
      },
      faceDetection: {
        faces: [],
        faceCount: 0
      }
    };
  }

  /**
   * Process video audio track
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async processVideoAudio(_mediaFile: MediaFile): Promise<import('../types.js').AudioAnalysisResult> {
    // Mock video audio processing
    
    return {
      transcription: {
        text: 'Welcome to our meeting. Today we will discuss the quarterly results and future planning.',
        confidence: 0.89,
        segments: [
          { text: 'Welcome to our meeting.', startTime: 0, endTime: 2.5, confidence: 0.92, speaker: 'Speaker_1' },
          { text: 'Today we will discuss the quarterly results and future planning.', startTime: 2.5, endTime: 8.0, confidence: 0.86, speaker: 'Speaker_1' }
        ],
        language: 'en'
      },
      speakerDetection: {
        speakers: [
          { id: 'Speaker_1', confidence: 0.94, segments: [{ startTime: 0, endTime: 8.0, confidence: 0.94 }] }
        ],
        speakerCount: 1
      },
      classification: {
        type: 'speech',
        confidence: 0.91,
        subCategories: ['meeting', 'business', 'presentation']
      }
    };
  }

  /**
   * Validate file type support
   */
  public isFileTypeSupported(fileType: string): boolean {
    return ['image', 'audio', 'document', 'video'].includes(fileType);
  }

  /**
   * Get supported file extensions for each type
   */
  public getSupportedExtensions(): Record<string, string[]> {
    return {
      image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'],
      audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'],
      document: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
      video: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm']
    };
  }

  /**
   * Estimate processing complexity for a file
   */
  public estimateProcessingComplexity(mediaFile: MediaFile): ProcessingComplexity {
    const factors: string[] = [];
    let complexity: 'low' | 'medium' | 'high' | 'very_high' = 'low';
    let estimatedTimeMs = 1000; // Base 1 second

    // File size considerations
    const fileSizeMB = mediaFile.fileSize / (1024 * 1024);
    if (fileSizeMB > 100) {
      factors.push('large_file_size');
      estimatedTimeMs += fileSizeMB * 50; // 50ms per MB
    }

    // File type complexity
    switch (mediaFile.fileType) {
      case 'image':
        estimatedTimeMs += 2000; // 2 seconds for image processing
        if (fileSizeMB > 10) {
          complexity = 'medium';
          factors.push('high_resolution_image');
        }
        break;
        
      case 'audio':
        estimatedTimeMs += 5000; // 5 seconds base for transcription
        if (fileSizeMB > 50) {
          complexity = 'high';
          factors.push('long_audio_duration');
        }
        break;
        
      case 'document':
        estimatedTimeMs += 3000; // 3 seconds for document processing
        if (fileSizeMB > 5) {
          complexity = 'medium';
          factors.push('large_document');
        }
        break;
        
      case 'video':
        estimatedTimeMs += 15000; // 15 seconds base for video
        complexity = 'high';
        factors.push('multimodal_processing');
        if (fileSizeMB > 200) {
          complexity = 'very_high';
          factors.push('large_video_file');
          estimatedTimeMs += fileSizeMB * 100; // 100ms per MB for video
        }
        break;
    }

    // Adjust complexity based on estimated time
    if (estimatedTimeMs > 60000) { // > 1 minute
      complexity = 'very_high';
    } else if (estimatedTimeMs > 30000) { // > 30 seconds
      complexity = 'high';
    } else if (estimatedTimeMs > 10000) { // > 10 seconds
      complexity = 'medium';
    }

    return {
      complexity,
      estimatedTimeMs: Math.min(estimatedTimeMs, 300000), // Cap at 5 minutes
      factors
    };
  }

  /**
   * Get analysis capabilities for a file type
   */
  public getAnalysisCapabilities(fileType: string): AnalysisCapabilities {
    const capabilities = {
      vision: false,
      audio: false,
      document: false,
      crossModal: false
    };

    switch (fileType) {
      case 'image':
        capabilities.vision = true;
        break;
      case 'audio':
        capabilities.audio = true;
        break;
      case 'document':
        capabilities.document = true;
        capabilities.vision = true; // OCR capability
        break;
      case 'video':
        capabilities.vision = true;
        capabilities.audio = true;
        capabilities.crossModal = true;
        break;
    }

    return capabilities;
  }
}
