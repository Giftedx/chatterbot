/**
 * Property Analysis Service
 * Handles image properties and metadata analysis
 */

import type { MediaFile, PropertyAnalysisResult, ImageMetadata, ColorInfo, SafeSearchResult } from './types.js';
import { logger } from '../../utils/logger.js';

/**
 * Service for analyzing image properties and extracting metadata
 */
export class PropertyAnalysisService {
  /**
   * Analyze image properties including colors and safety
   */
  public async analyzeImageProperties(mediaFile: MediaFile): Promise<PropertyAnalysisResult | undefined> {
    try {
      // Mock image properties analysis
      const dominantColors: ColorInfo[] = [
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

      const safeSearch: SafeSearchResult = {
        adult: 'very_unlikely',
        spoof: 'unlikely', 
        medical: 'very_unlikely',
        violence: 'very_unlikely',
        racy: 'very_unlikely'
      };

      // Generate metadata from file properties
      const metadata: ImageMetadata = {
        width: 1920,
        height: 1080,
        format: mediaFile.mimeType.split('/')[1] || 'unknown',
        colorSpace: 'sRGB',
        hasAlpha: false
      };

      logger.debug('Image properties analysis completed', {
        operation: 'image-properties',
        metadata: {
          fileId: mediaFile.id,
          colorCount: dominantColors.length
        }
      });

      return {
        dominantColors,
        safeSearch,
        metadata
      };

    } catch (error) {
      logger.error('Image properties analysis failed', {
        operation: 'image-properties',
        metadata: {
          fileId: mediaFile.id
        },
        error: String(error)
      });
      return undefined;
    }
  }

  /**
   * Check if image passes safety filters
   */
  public isImageSafe(safeSearch: SafeSearchResult): boolean {
    const unsafeCategories = ['likely', 'very_likely'];
    
    return !unsafeCategories.includes(safeSearch.adult) &&
           !unsafeCategories.includes(safeSearch.violence) &&
           !unsafeCategories.includes(safeSearch.racy);
  }

  /**
   * Get dominant color as hex string
   */
  public getDominantColorHex(dominantColors: ColorInfo[]): string | undefined {
    if (!dominantColors || dominantColors.length === 0) {
      return undefined;
    }

    const dominant = dominantColors[0];
    const { red, green, blue } = dominant.color;
    
    return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
  }

  /**
   * Get image aspect ratio
   */
  public getAspectRatio(metadata: ImageMetadata): number {
    return metadata.width / metadata.height;
  }

  /**
   * Determine image orientation category
   */
  public getOrientationCategory(metadata: ImageMetadata): 'landscape' | 'portrait' | 'square' {
    const aspectRatio = this.getAspectRatio(metadata);
    
    if (aspectRatio > 1.1) return 'landscape';
    if (aspectRatio < 0.9) return 'portrait';
    return 'square';
  }

  /**
   * Get image quality assessment based on dimensions
   */
  public getQualityAssessment(metadata: ImageMetadata): 'low' | 'medium' | 'high' | 'ultra' {
    const totalPixels = metadata.width * metadata.height;
    
    if (totalPixels >= 8000000) return 'ultra'; // 8MP+
    if (totalPixels >= 2000000) return 'high';  // 2MP+
    if (totalPixels >= 500000) return 'medium'; // 0.5MP+
    return 'low';
  }
}
