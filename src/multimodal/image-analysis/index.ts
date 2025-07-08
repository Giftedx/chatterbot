/**
 * Image Analysis Service - Main Orchestrator
 * Coordinates all image analysis modules and provides the public API
 */

import type {
  MediaFile,
  VisionAnalysisResult,
  FileProcessingOptions,
  ProcessingStatus,
  ImageAnalysisConfig
} from './types.js';

import { TextDetectionService } from './text-detection.service.js';
import { ObjectDetectionService } from './object-detection.service.js';
import { PropertyAnalysisService } from './property-analysis.service.js';
import { ContentClassificationService } from './content-classification.service.js';

import { prisma } from '../../db/prisma.js';
import { logger } from '../../utils/logger.js';

/**
 * Main Image Analysis Service coordinating all analysis modules
 */
export class ImageAnalysisService {
  private readonly textDetectionService: TextDetectionService;
  private readonly objectDetectionService: ObjectDetectionService;
  private readonly propertyAnalysisService: PropertyAnalysisService;
  private readonly contentClassificationService: ContentClassificationService;
  
  private readonly config: ImageAnalysisConfig;

  constructor() {
    // Initialize all sub-services
    this.textDetectionService = new TextDetectionService();
    this.objectDetectionService = new ObjectDetectionService();
    this.propertyAnalysisService = new PropertyAnalysisService();
    this.contentClassificationService = new ContentClassificationService();

    // Configure supported formats and limits
    this.config = {
      supportedFormats: new Set([
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/tiff'
      ]),
      maxFileSize: 10 * 1024 * 1024 // 10MB
    };
  }

  /**
   * Analyze image file and extract comprehensive information
   */
  public async analyzeImage(
    mediaFile: MediaFile,
    options: FileProcessingOptions = {}
  ): Promise<VisionAnalysisResult | null> {
    try {
      const startTime = Date.now();

      // Validate image file
      if (!this.isValidImageFile(mediaFile)) {
        logger.warn('Invalid image file for analysis', {
          operation: 'image-analysis',
          metadata: {
            mimeType: mediaFile.mimeType,
            fileSize: mediaFile.fileSize
          }
        });
        return null;
      }

      // Update processing status
      await this.updateProcessingStatus(mediaFile.id, 'processing');

      const analysisResult: VisionAnalysisResult = {};

      // Perform different types of analysis based on options
      if (options.enableOCR !== false) {
        analysisResult.textDetection = await this.textDetectionService.performTextDetection(mediaFile);
      }

      if (options.enableObjectDetection !== false) {
        const objectDetection = await this.objectDetectionService.performObjectDetection(mediaFile);
        if (objectDetection) {
          analysisResult.objectDetection = {
            objects: objectDetection.objects,
            scene: {
              description: 'A scene detected in the image',
              confidence: objectDetection.confidence,
              tags: this.objectDetectionService.extractObjectNames(objectDetection),
              adult: false,
              racy: false,
              violence: false
            }
          };
        }
      }

      if (options.enableFaceDetection !== false) {
        analysisResult.faceDetection = await this.objectDetectionService.performFaceDetection(mediaFile);
      }

      // Always perform basic image properties analysis
      const propertyAnalysis = await this.propertyAnalysisService.analyzeImageProperties(mediaFile);
      if (propertyAnalysis) {
        analysisResult.imageProperties = {
          dominantColors: propertyAnalysis.dominantColors,
          safeSearch: propertyAnalysis.safeSearch
        };
      }

      // Perform label detection
      const labelDetection = await this.contentClassificationService.performLabelDetection(mediaFile);
      if (labelDetection) {
        analysisResult.labelDetection = labelDetection;
      }

      // Generate AI description if requested
      let description = '';
      if (options.generateDescription !== false) {
        description = await this.contentClassificationService.generateImageDescription(analysisResult);
      }

      // Extract tags and categories
      const tags = this.contentClassificationService.extractTagsFromAnalysis(analysisResult);
      const categories = this.contentClassificationService.categorizeImage(analysisResult);

      // Update media file with analysis results
      await this.updateMediaFileWithAnalysis(mediaFile.id, {
        visionAnalysis: analysisResult,
        description,
        tags,
        categories,
        processingStatus: 'completed',
        processedAt: new Date()
      });

      const processingTime = Date.now() - startTime;

      logger.info('Image analysis completed', {
        operation: 'image-analysis',
        userId: mediaFile.userId,
        metadata: {
          hasText: !!analysisResult.textDetection?.fullText,
          objectCount: analysisResult.objectDetection?.objects?.length || 0,
          faceCount: analysisResult.faceDetection?.faceCount || 0,
          labelCount: analysisResult.labelDetection?.labels?.length || 0,
          processingTime
        }
      });

      return analysisResult;

    } catch (error) {
      logger.error('Failed to analyze image', {
        operation: 'image-analysis',
        error: String(error)
      });

      // Update status to failed
      await this.updateProcessingStatus(mediaFile.id, 'failed').catch(() => {
        // Ignore database errors during error handling
      });

      return null;
    }
  }

  /**
   * Get existing image analysis from database
   */
  public async getImageAnalysis(fileId: number): Promise<VisionAnalysisResult | null> {
    try {
      const mediaFile = await prisma.mediaFile.findUnique({
        where: { id: fileId }
      });

      if (!mediaFile || !mediaFile.visionAnalysis) {
        return null;
      }

      return mediaFile.visionAnalysis as VisionAnalysisResult;

    } catch (error) {
      logger.error('Failed to retrieve image analysis', {
        operation: 'get-image-analysis',
        error: String(error)
      });
      return null;
    }
  }

  /**
   * Search images by content
   */
  public async searchImagesByContent(
    query: string,
    userId?: string,
    limit: number = 10
  ): Promise<MediaFile[]> {
    try {
      // Create search mock data
      const searchResults = Array.from({ length: Math.min(limit, 3) }, (_, i) => ({
        id: i + 1,
        userId: userId || 'mock-user',
        guildId: undefined,
        channelId: 'mock-channel',
        originalName: `image_${i + 1}.jpg`,
        filename: `processed_${i + 1}.jpg`,
        mimeType: 'image/jpeg',
        fileSize: 1024 * 1024,
        fileType: 'image' as const,
        url: `https://example.com/image_${i + 1}.jpg`,
        filePath: `/uploads/image_${i + 1}.jpg`,
        processingStatus: 'completed' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      logger.info('Image content search completed', {
        operation: 'search-images',
        metadata: {
          query,
          resultCount: searchResults.length
        }
      });

      return searchResults;

    } catch (error) {
      logger.error('Failed to search images by content', {
        operation: 'search-images',
        error: String(error)
      });
      return [];
    }
  }

  /**
   * Validate if file is a supported image format
   */
  private isValidImageFile(mediaFile: MediaFile): boolean {
    return (
      mediaFile.fileType === 'image' &&
      this.config.supportedFormats.has(mediaFile.mimeType) &&
      mediaFile.fileSize <= this.config.maxFileSize
    );
  }

  /**
   * Update processing status in database
   */
  private async updateProcessingStatus(
    fileId: number,
    status: ProcessingStatus
  ): Promise<void> {
    try {
      await prisma.mediaFile.update({
        where: { id: fileId },
        data: { 
          processingStatus: status,
          updatedAt: new Date()
        }
      });

      logger.debug('Processing status updated', {
        operation: 'update-status',
        metadata: {
          status
        }
      });

    } catch (error) {
      logger.error('Failed to update processing status', {
        operation: 'update-status',
        error: String(error)
      });
    }
  }

  /**
   * Update media file with comprehensive analysis results
   */
  private async updateMediaFileWithAnalysis(
    fileId: number,
    analysisData: {
      visionAnalysis: VisionAnalysisResult;
      description: string;
      tags: string[];
      categories: string[];
      processingStatus: ProcessingStatus;
      processedAt: Date;
    }
  ): Promise<void> {
    try {
      await prisma.mediaFile.update({
        where: { id: fileId },
        data: {
          visionAnalysis: JSON.parse(JSON.stringify(analysisData.visionAnalysis)),
          description: analysisData.description,
          tags: JSON.stringify(analysisData.tags),
          categories: JSON.stringify(analysisData.categories),
          processingStatus: analysisData.processingStatus,
          processedAt: analysisData.processedAt,
          updatedAt: new Date()
        }
      });

      logger.debug('Media file updated with analysis results', {
        operation: 'update-analysis',
        metadata: {
          tagCount: analysisData.tags.length,
          categoryCount: analysisData.categories.length
        }
      });

    } catch (error) {
      logger.error('Failed to update media file with analysis', {
        operation: 'update-analysis',
        error: String(error)
      });
      throw error;
    }
  }
}

// Export the service and all types
export * from './types.js';
export { TextDetectionService } from './text-detection.service.js';
export { ObjectDetectionService } from './object-detection.service.js';
export { PropertyAnalysisService } from './property-analysis.service.js';
export { ContentClassificationService } from './content-classification.service.js';
