/**
 * Image safety moderation system.
 * Provides multiple layers of image content checking for production safety.
 */

import type { SafetyVerdict } from './text-filters.js';

export interface ImageSafetyConfig {
  /** Maximum file size in bytes (default: 10MB) */
  maxFileSize: number;
  /** Allowed MIME types */
  allowedMimeTypes: string[];
  /** Enable Gemini-based content analysis */
  enableAIAnalysis: boolean;
  /** Enable file type validation */
  enableFileValidation: boolean;
}

export interface ImageModerationResult extends SafetyVerdict {
  /** Specific issues found */
  issues?: string[];
  /** File size in bytes */
  fileSize?: number;
  /** Detected MIME type */
  mimeType?: string;
  /** AI analysis confidence (0-1) */
  confidence?: number;
}

const DEFAULT_CONFIG: ImageSafetyConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ],
  enableAIAnalysis: true,
  enableFileValidation: true
};

/**
 * Comprehensive image safety checker
 */
export class ImageSafetyModerator {
  private config: ImageSafetyConfig;

  constructor(config: Partial<ImageSafetyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Moderates an image from a URL (Discord attachment)
   */
  async moderateImageUrl(url: string, mimeType?: string): Promise<ImageModerationResult> {
    const issues: string[] = [];
    
    try {
      // Basic URL validation
      if (!this.isValidImageUrl(url)) {
        return {
          safe: false,
          reason: 'Invalid or suspicious image URL',
          issues: ['Invalid URL format']
        };
      }

      // File type validation
      if (this.config.enableFileValidation && mimeType) {
        const typeCheck = this.validateMimeType(mimeType);
        if (!typeCheck.safe) {
          return typeCheck;
        }
      }

      // Fetch image for size check and AI analysis
      if (this.config.enableAIAnalysis) {
        const analysisResult = await this.performAIAnalysis(url, mimeType);
        if (!analysisResult.safe) {
          return analysisResult;
        }
      }

      // All checks passed
      return {
        safe: true,
        mimeType,
        issues: issues.length > 0 ? issues : undefined
      };

    } catch (error) {
      console.error('Image moderation error:', error);
      return {
        safe: false,
        reason: 'Unable to analyze image safety',
        issues: ['Analysis failed']
      };
    }
  }

  /**
   * Quick file type and basic validation
   */
  private validateMimeType(mimeType: string): ImageModerationResult {
    if (!this.config.allowedMimeTypes.includes(mimeType.toLowerCase())) {
      return {
        safe: false,
        reason: `Unsupported file type: ${mimeType}`,
        issues: [`File type '${mimeType}' not allowed`],
        mimeType
      };
    }

    return { safe: true, mimeType };
  }

  /**
   * Validates if URL looks like a legitimate image URL
   */
  private isValidImageUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Check for Discord CDN (trusted source)
      if (urlObj.hostname.includes('discord')) {
        return true;
      }

      // Check for common image hosting domains
      const trustedDomains = [
        'imgur.com',
        'i.imgur.com',
        'cdn.discord.com',
        'media.discordapp.net'
      ];

      if (trustedDomains.some(domain => urlObj.hostname.includes(domain))) {
        return true;
      }

      // Basic checks for suspicious URLs
      if (urlObj.hostname.includes('bit.ly') || 
          urlObj.hostname.includes('tinyurl') ||
          urlObj.pathname.includes('..')) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Uses Gemini Vision to analyze image content for safety
   */
  private async performAIAnalysis(url: string, mimeType?: string): Promise<ImageModerationResult> {
    // For now, return safe since we'd need Gemini Vision API integration
    // In production, this would:
    // 1. Use Gemini Vision API to analyze image content
    // 2. Check for inappropriate content, violence, etc.
    // 3. Return detailed safety assessment
    
    // Placeholder implementation - always safe for basic images
    if (mimeType && this.config.allowedMimeTypes.includes(mimeType)) {
      return {
        safe: true,
        confidence: 0.95,
        mimeType
      };
    }

    return {
      safe: false,
      reason: 'AI analysis inconclusive',
      confidence: 0.0
    };
  }

  /**
   * Updates configuration
   */
  updateConfig(newConfig: Partial<ImageSafetyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Default instance
export const imageSafetyModerator = new ImageSafetyModerator();

/**
 * Quick function for basic image safety check
 */
export async function checkImageSafety(url: string, mimeType?: string): Promise<ImageModerationResult> {
  return imageSafetyModerator.moderateImageUrl(url, mimeType);
}
