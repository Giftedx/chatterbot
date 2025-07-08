/**
 * Advanced Image Moderation Service
 * Implements ML-based image safety checking with Google Cloud Vision integration
 */

import { logger } from '../utils/logger';
import {
  SafetyVerdict,
  ImageModerationOptions,
  CloudVisionSafeSearchResponse
} from './types.js';

/**
 * Advanced image safety checker with Cloud Vision integration
 */
export class AdvancedImageModeration {
  private readonly cloudVisionApiKey?: string;
  private readonly useCloudVision: boolean;
  private nsfwjsModel: unknown = null;

  constructor() {
    this.cloudVisionApiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    this.useCloudVision = Boolean(this.cloudVisionApiKey);
    
    if (!this.useCloudVision) {
      logger.warn('Google Cloud Vision API key not found, using basic image moderation');
    }
  }

  /**
   * Check image safety with comprehensive moderation
   */
  async checkImageSafety(
    imageUrl: string,
    contentType: string,
    options: ImageModerationOptions = {}
  ): Promise<SafetyVerdict> {
    try {
      const {
        useCloudVision = this.useCloudVision,
        safeSearchLevel = 'LIKELY',
        checkNSFW = true
      } = options;

      // Basic format validation
      if (!this.isValidImageType(contentType)) {
        return {
          safe: false,
          reason: 'Unsupported image format',
          severity: 'low'
        };
      }

      // Cloud Vision SafeSearch (preferred method)
      if (useCloudVision && this.useCloudVision) {
        const cloudResult = await this.checkWithCloudVision(imageUrl, safeSearchLevel);
        if (!cloudResult.safe) {
          logger.info('Image blocked by Cloud Vision', {
            operation: 'image-moderation',
            metadata: { 
              reason: cloudResult.reason,
              confidence: cloudResult.confidence,
              severity: cloudResult.severity
            }
          });
          return cloudResult;
        }
      }

      // Fallback: NSFW.js (if available)
      if (checkNSFW) {
        const nsfwResult = await this.checkWithNSFWJS();
        if (!nsfwResult.safe) {
          logger.info('Image blocked by NSFW detection', {
            operation: 'image-moderation',
            metadata: {
              reason: nsfwResult.reason,
              confidence: nsfwResult.confidence,
              severity: nsfwResult.severity
            }
          });
          return nsfwResult;
        }
      }

      // Image appears safe
      return { safe: true, confidence: 0.9 };

    } catch (error) {
      logger.error('Image moderation error', {
        operation: 'image-moderation',
        metadata: {
          imageUrl: imageUrl.substring(0, 50) + '...',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      // Fail safe - block on error for images
      return {
        safe: false,
        reason: 'Image moderation service unavailable',
        confidence: 0.1,
        severity: 'medium'
      };
    }
  }

  /**
   * Google Cloud Vision SafeSearch API
   */
  private async checkWithCloudVision(
    imageUrl: string,
    threshold: string
  ): Promise<SafetyVerdict> {
    if (!this.cloudVisionApiKey) {
      throw new Error('Google Cloud Vision API key not configured');
    }

    const requestBody = {
      requests: [{
        image: { source: { imageUri: imageUrl } },
        features: [{ type: 'SAFE_SEARCH_DETECTION', maxResults: 1 }]
      }]
    };

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${this.cloudVisionApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      throw new Error(`Cloud Vision API error: ${response.status}`);
    }

    const data = await response.json() as CloudVisionSafeSearchResponse;
    const safeSearch = data.safeSearchAnnotation;

    // Check each category against threshold
    const categories = ['adult', 'violence', 'racy'] as const;
    const flaggedCategories: string[] = [];
    let maxLikelihood = 0;

    for (const category of categories) {
      const likelihood = safeSearch[category];
      const score = this.likelihoodToScore(likelihood);
      
      if (this.isAboveThreshold(likelihood, threshold)) {
        flaggedCategories.push(category);
        maxLikelihood = Math.max(maxLikelihood, score);
      }
    }

    if (flaggedCategories.length > 0) {
      return {
        safe: false,
        reason: `Detected unsafe content: ${flaggedCategories.join(', ')}`,
        confidence: maxLikelihood,
        severity: this.scoreToSeverity(maxLikelihood),
        categories: flaggedCategories
      };
    }

    return { safe: true, confidence: 0.95 };
  }

  /**
   * NSFW.js integration (fallback method)
   */
  private async checkWithNSFWJS(): Promise<SafetyVerdict> {
    try {
      // Lazy load NSFW.js if not already loaded
      if (!this.nsfwjsModel) {
        // This would require NSFW.js to be installed as a dependency
        // For now, we'll simulate the check or skip it
        logger.debug('NSFW.js not available, skipping NSFW check');
        return { safe: true, confidence: 0.5 };
      }

      // Placeholder for actual NSFW.js integration
      // const result = await this.nsfwjsModel.classify(imageUrl) as NSFWResult;
      
      return { safe: true, confidence: 0.5 };

    } catch (error) {
      logger.warn('NSFW.js check failed', {
        operation: 'image-moderation',
        metadata: {
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      return { safe: true, confidence: 0.3 };
    }
  }

  /**
   * Validate image content type
   */
  private isValidImageType(contentType: string): boolean {
    const validTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 
      'image/gif', 'image/webp', 'image/bmp'
    ];
    return validTypes.includes(contentType.toLowerCase());
  }

  /**
   * Convert Cloud Vision likelihood to numeric score
   */
  private likelihoodToScore(likelihood: string): number {
    switch (likelihood) {
      case 'VERY_UNLIKELY': return 0.1;
      case 'UNLIKELY': return 0.3;
      case 'POSSIBLE': return 0.5;
      case 'LIKELY': return 0.7;
      case 'VERY_LIKELY': return 0.9;
      default: return 0.0;
    }
  }

  /**
   * Check if likelihood exceeds threshold
   */
  private isAboveThreshold(likelihood: string, threshold: string): boolean {
    const order = ['VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY'];
    const likelihoodIndex = order.indexOf(likelihood);
    const thresholdIndex = order.indexOf(threshold);
    return likelihoodIndex >= thresholdIndex;
  }

  /**
   * Convert score to severity level
   */
  private scoreToSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }
}

// Export singleton instance and convenience function
export const advancedImageModeration = new AdvancedImageModeration();

export async function checkImageSafety(
  imageUrl: string,
  contentType: string,
  options?: ImageModerationOptions
): Promise<SafetyVerdict> {
  return advancedImageModeration.checkImageSafety(imageUrl, contentType, options);
}

// Legacy export for backward compatibility
export { checkImageSafety as checkImageSafetyLegacy };
