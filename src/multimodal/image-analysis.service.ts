/**
 * Image Analysis Service
 * Comprehensive image processing and computer vision capabilities
 */

import {
  MediaFile,
  VisionAnalysisResult,
  FileProcessingOptions,
  ImageMetadata,
  ContentSafetyResult,
  SafetyCategory,
  ProcessingStatus
} from './types.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

/**
 * Service for analyzing images using computer vision APIs
 */
export class ImageAnalysisService {
  private readonly supportedFormats: Set<string>;
  private readonly maxFileSize: number; // 10MB
  
  constructor() {
    this.supportedFormats = new Set([
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff'
    ]);
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
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
          fileId: mediaFile.id,
          mimeType: mediaFile.mimeType,
          fileSize: mediaFile.fileSize
        });
        return null;
      }

      // Update processing status
      await this.updateProcessingStatus(mediaFile.id, 'processing');

      const analysisResult: VisionAnalysisResult = {};

      // Perform different types of analysis based on options
      if (options.enableOCR !== false) {
        analysisResult.textDetection = await this.performTextDetection(mediaFile);
      }

      if (options.enableObjectDetection !== false) {
        analysisResult.objectDetection = await this.performObjectDetection(mediaFile);
      }

      if (options.enableFaceDetection !== false) {
        analysisResult.faceDetection = await this.performFaceDetection(mediaFile);
      }

      // Always perform basic image properties analysis
      analysisResult.imageProperties = await this.analyzeImageProperties(mediaFile);
      analysisResult.labelDetection = await this.performLabelDetection(mediaFile);

      // Generate AI description if requested
      let description = '';
      if (options.generateDescription !== false) {
        description = await this.generateImageDescription(analysisResult);
      }

      // Extract tags and categories
      const tags = this.extractTagsFromAnalysis(analysisResult);
      const categories = this.categorizeImage(analysisResult);

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
        fileId: mediaFile.id,
        userId: mediaFile.userId,
        metadata: {
          hasText: !!analysisResult.textDetection?.fullText,
          objectCount: analysisResult.objectDetection?.objects.length || 0,
          faceCount: analysisResult.faceDetection?.faceCount || 0,
          labelCount: analysisResult.labelDetection?.labels.length || 0,
          processingTime
        }
      });

      return analysisResult;

    } catch (error) {
      logger.error('Failed to analyze image', {
        operation: 'image-analysis',
        fileId: mediaFile.id,
        error: String(error)
      });

      await this.updateProcessingStatus(mediaFile.id, 'failed', String(error));
      return null;
    }
  }

  /**
   * Perform OCR text detection on image
   */
  private async performTextDetection(mediaFile: MediaFile) {
    try {
      // In a real implementation, this would call Google Vision API or similar
      // For now, we'll simulate the response structure
      
      const mockTextBlocks = [
        {
          text: 'Sample detected text',
          confidence: 0.95,
          boundingBox: { x: 100, y: 50, width: 200, height: 30 },
          language: 'en'
        }
      ];

      const fullText = mockTextBlocks.map(block => block.text).join(' ');

      logger.debug('Text detection completed', {
        operation: 'text-detection',
        fileId: mediaFile.id,
        textLength: fullText.length,
        blockCount: mockTextBlocks.length
      });

      return {
        fullText,
        textBlocks: mockTextBlocks,
        confidence: 0.95
      };

    } catch (error) {
      logger.error('Text detection failed', {
        operation: 'text-detection',
        fileId: mediaFile.id,
        error: String(error)
      });
      return undefined;
    }
  }

  /**
   * Perform object detection
   */
  private async performObjectDetection(mediaFile: MediaFile) {
    try {
      // Mock object detection results
      const objects = [
        {
          name: 'person',
          confidence: 0.92,
          boundingBox: { x: 150, y: 100, width: 80, height: 200 },
          category: 'people'
        },
        {
          name: 'laptop',
          confidence: 0.88,
          boundingBox: { x: 300, y: 180, width: 120, height: 80 },
          category: 'electronics'
        }
      ];

      const scene = {
        description: 'A person working on a laptop in an office environment',
        confidence: 0.85,
        tags: ['office', 'work', 'technology'],
        adult: false,
        racy: false,
        violence: false
      };

      logger.debug('Object detection completed', {
        operation: 'object-detection',
        fileId: mediaFile.id,
        objectCount: objects.length
      });

      return {
        objects,
        scene
      };

    } catch (error) {
      logger.error('Object detection failed', {
        operation: 'object-detection',
        fileId: mediaFile.id,
        error: String(error)
      });
      return undefined;
    }
  }

  /**
   * Perform face detection
   */
  private async performFaceDetection(mediaFile: MediaFile) {
    try {
      // Mock face detection results
      const faces = [
        {
          boundingBox: { x: 150, y: 100, width: 60, height: 80 },
          confidence: 0.94,
          emotions: [
            { emotion: 'happy', confidence: 0.8 },
            { emotion: 'neutral', confidence: 0.2 }
          ],
          ageRange: { min: 25, max: 35 },
          gender: 'male'
        }
      ];

      logger.debug('Face detection completed', {
        operation: 'face-detection',
        fileId: mediaFile.id,
        faceCount: faces.length
      });

      return {
        faces,
        faceCount: faces.length
      };

    } catch (error) {
      logger.error('Face detection failed', {
        operation: 'face-detection',
        fileId: mediaFile.id,
        error: String(error)
      });
      return undefined;
    }
  }

  /**
   * Analyze image properties
   */
  private async analyzeImageProperties(mediaFile: MediaFile) {
    try {
      // Mock image properties analysis
      const dominantColors = [
        {
          color: { red: 72, green: 142, blue: 205 },
          score: 0.4,
          pixelFraction: 0.35
        },
        {
          color: { red: 245, green: 245, blue: 245 },
          score: 0.3,
          pixelFraction: 0.25
        }
      ];

      const safeSearch = {
        adult: 'very_unlikely',
        spoof: 'unlikely', 
        medical: 'very_unlikely',
        violence: 'very_unlikely',
        racy: 'very_unlikely'
      };

      return {
        dominantColors,
        safeSearch
      };

    } catch (error) {
      logger.error('Image properties analysis failed', {
        operation: 'image-properties',
        fileId: mediaFile.id,
        error: String(error)
      });
      return undefined;
    }
  }

  /**
   * Perform label detection
   */
  private async performLabelDetection(mediaFile: MediaFile) {
    try {
      // Mock label detection results
      const labels = [
        { description: 'Technology', score: 0.9, topicality: 0.85 },
        { description: 'Computer', score: 0.88, topicality: 0.82 },
        { description: 'Person', score: 0.85, topicality: 0.8 },
        { description: 'Office', score: 0.78, topicality: 0.75 },
        { description: 'Work', score: 0.72, topicality: 0.7 }
      ];

      logger.debug('Label detection completed', {
        operation: 'label-detection',
        fileId: mediaFile.id,
        labelCount: labels.length
      });

      return { labels };

    } catch (error) {
      logger.error('Label detection failed', {
        operation: 'label-detection',
        fileId: mediaFile.id,
        error: String(error)
      });
      return undefined;
    }
  }

  /**
   * Generate natural language description of image
   */
  private async generateImageDescription(analysis: VisionAnalysisResult): Promise<string> {
    try {
      const parts: string[] = [];

      // Use scene description if available
      if (analysis.objectDetection?.scene) {
        parts.push(analysis.objectDetection.scene.description);
      }

      // Add object information
      if (analysis.objectDetection?.objects && analysis.objectDetection.objects.length > 0) {
        const objectNames = analysis.objectDetection.objects
          .filter(obj => obj.confidence > 0.7)
          .map(obj => obj.name);
        
        if (objectNames.length > 0) {
          parts.push(`The image contains: ${objectNames.join(', ')}`);
        }
      }

      // Add text information
      if (analysis.textDetection?.fullText) {
        parts.push(`Text detected: "${analysis.textDetection.fullText}"`);
      }

      // Add face information
      if (analysis.faceDetection && analysis.faceDetection.faceCount > 0) {
        parts.push(`${analysis.faceDetection.faceCount} face(s) detected`);
      }

      // Add label information
      if (analysis.labelDetection?.labels && analysis.labelDetection.labels.length > 0) {
        const topLabels = analysis.labelDetection.labels
          .filter(label => label.score > 0.8)
          .slice(0, 3)
          .map(label => label.description.toLowerCase());
        
        if (topLabels.length > 0) {
          parts.push(`Categories: ${topLabels.join(', ')}`);
        }
      }

      return parts.join('. ') || 'Image analysis completed';

    } catch (error) {
      logger.error('Failed to generate image description', {
        operation: 'image-description',
        error: String(error)
      });
      return 'Image processed successfully';
    }
  }

  /**
   * Extract tags from analysis results
   */
  private extractTagsFromAnalysis(analysis: VisionAnalysisResult): string[] {
    const tags = new Set<string>();

    // Add object tags
    if (analysis.objectDetection?.objects) {
      for (const obj of analysis.objectDetection.objects) {
        if (obj.confidence > 0.7) {
          tags.add(obj.name);
          if (obj.category) {
            tags.add(obj.category);
          }
        }
      }
    }

    // Add scene tags
    if (analysis.objectDetection?.scene?.tags) {
      for (const tag of analysis.objectDetection.scene.tags) {
        tags.add(tag);
      }
    }

    // Add label tags
    if (analysis.labelDetection?.labels) {
      for (const label of analysis.labelDetection.labels) {
        if (label.score > 0.7) {
          tags.add(label.description.toLowerCase());
        }
      }
    }

    // Add text-based tags if significant text is detected
    if (analysis.textDetection?.fullText && analysis.textDetection.fullText.length > 10) {
      tags.add('text');
      tags.add('document');
    }

    // Add face-based tags
    if (analysis.faceDetection && analysis.faceDetection.faceCount > 0) {
      tags.add('people');
      tags.add('faces');
    }

    return Array.from(tags).slice(0, 20); // Limit to 20 tags
  }

  /**
   * Categorize image based on analysis
   */
  private categorizeImage(analysis: VisionAnalysisResult): string[] {
    const categories = new Set<string>();

    // Primary categorization based on detected objects
    if (analysis.objectDetection?.objects) {
      for (const obj of analysis.objectDetection.objects) {
        if (obj.confidence > 0.8) {
          switch (obj.category) {
            case 'people':
              categories.add('social');
              break;
            case 'electronics':
              categories.add('technology');
              break;
            case 'vehicle':
              categories.add('transportation');
              break;
            case 'food':
              categories.add('food_drink');
              break;
            case 'animal':
              categories.add('nature');
              break;
            case 'building':
              categories.add('architecture');
              break;
          }
        }
      }
    }

    // Text-based categorization
    if (analysis.textDetection?.fullText && analysis.textDetection.fullText.length > 50) {
      categories.add('document');
      categories.add('informational');
    }

    // Scene-based categorization
    if (analysis.objectDetection?.scene?.tags) {
      for (const tag of analysis.objectDetection.scene.tags) {
        if (tag.includes('office') || tag.includes('work')) {
          categories.add('business');
        } else if (tag.includes('outdoor') || tag.includes('nature')) {
          categories.add('nature');
        } else if (tag.includes('indoor') || tag.includes('home')) {
          categories.add('lifestyle');
        }
      }
    }

    // Default category if none detected
    if (categories.size === 0) {
      categories.add('general');
    }

    return Array.from(categories);
  }

  /**
   * Validate if file is a supported image format
   */
  private isValidImageFile(mediaFile: MediaFile): boolean {
    return (
      mediaFile.fileType === 'image' &&
      this.supportedFormats.has(mediaFile.mimeType) &&
      mediaFile.fileSize <= this.maxFileSize
    );
  }

  /**
   * Update media file processing status
   */
  private async updateProcessingStatus(
    fileId: number,
    status: ProcessingStatus,
    error?: string
  ): Promise<void> {
    try {
      await prisma.mediaFile.update({
        where: { id: fileId },
        data: {
          processingStatus: status,
          processingError: error,
          processedAt: status === 'completed' || status === 'failed' ? new Date() : undefined
        }
      });
    } catch (updateError) {
      logger.error('Failed to update processing status', {
        operation: 'status-update',
        fileId,
        status,
        error: String(updateError)
      });
    }
  }

  /**
   * Update media file with analysis results
   */
  private async updateMediaFileWithAnalysis(
    fileId: number,
    updates: {
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
          visionAnalysis: updates.visionAnalysis as any,
          description: updates.description,
          tags: JSON.stringify(updates.tags),
          categories: JSON.stringify(updates.categories),
          processingStatus: updates.processingStatus,
          processedAt: updates.processedAt
        }
      });
    } catch (updateError) {
      logger.error('Failed to update media file with analysis', {
        operation: 'analysis-update',
        fileId,
        error: String(updateError)
      });
    }
  }

  /**
   * Get image analysis results
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
      logger.error('Failed to get image analysis', {
        operation: 'get-analysis',
        fileId,
        error: String(error)
      });
      return null;
    }
  }

  /**
   * Search images by visual content
   */
  public async searchImagesByContent(
    query: string,
    userId: string,
    options: { limit?: number; minConfidence?: number } = {}
  ): Promise<MediaFile[]> {
    try {
      const limit = options.limit || 10;
      const minConfidence = options.minConfidence || 0.7;

      // Search in vision analysis results
      const files = await prisma.mediaFile.findMany({
        where: {
          userId,
          fileType: 'image',
          processingStatus: 'completed',
          OR: [
            { description: { contains: query } },
            { tags: { contains: query } },
            { categories: { contains: query } }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return files as unknown as MediaFile[];

    } catch (error) {
      logger.error('Failed to search images by content', {
        operation: 'image-search',
        userId,
        query,
        error: String(error)
      });
      return [];
    }
  }
}
