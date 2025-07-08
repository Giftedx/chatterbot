/**
 * Audio Classification Service
 * Handles audio content classification and categorization
 */

import type { MediaFile, AudioClassification } from './types.js';
import { logger } from '../../utils/logger.js';

/**
 * Service for classifying audio content
 */
export class AudioClassificationService {
  private readonly categories: Record<string, string[]>;
  private readonly confidenceThreshold = 0.6;

  constructor() {
    this.categories = {
      'speech': ['presentation', 'lecture', 'interview', 'conversation', 'meeting'],
      'music': ['song', 'instrumental', 'classical', 'jazz', 'rock', 'pop'],
      'podcast': ['talk_show', 'news', 'educational', 'entertainment', 'interview'],
      'call': ['phone_call', 'conference_call', 'voicemail'],
      'ambient': ['nature_sounds', 'city_noise', 'background_music', 'white_noise'],
      'announcement': ['public_announcement', 'advertisement', 'notification']
    };
  }

  /**
   * Classify audio content type and category
   */
  public async classifyAudioContent(mediaFile: MediaFile): Promise<AudioClassification> {
    try {
      logger.info('Starting audio classification', {
        operation: 'audio-classification',
        metadata: {
          fileId: mediaFile.id,
          fileName: mediaFile.originalName
        }
      });

      // Mock classification - in real implementation would use services like:
      // - Google Cloud Audio Intelligence
      // - Azure Audio Content Classification
      // - Amazon Comprehend Audio
      // - Custom ML models (TensorFlow, PyTorch)
      // - Audio fingerprinting services

      const classification = await this.mockClassification(mediaFile);

      logger.info('Audio classification completed', {
        operation: 'audio-classification',
        metadata: {
          fileId: mediaFile.id,
          type: classification.type,
          confidence: classification.confidence
        }
      });

      return classification;

    } catch (error) {
      logger.error('Audio classification failed', {
        operation: 'audio-classification',
        metadata: {
          fileId: mediaFile.id,
          error: String(error)
        }
      });

      // Return default classification on error
      return {
        type: 'unknown',
        confidence: 0.0,
        subCategories: []
      };
    }
  }

  /**
   * Mock classification for development/testing
   */
  private async mockClassification(mediaFile: MediaFile): Promise<AudioClassification> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Use file characteristics to determine classification
    const type = this.determineCategoryFromFile(mediaFile);
    const subCategories = this.categories[type] || [];
    const selectedSubcategory = subCategories[Math.floor(Math.random() * subCategories.length)];

    const confidence = 0.70 + Math.random() * 0.25; // 70-95% confidence

    return {
      type,
      confidence,
      subCategories: selectedSubcategory ? [selectedSubcategory] : []
    };
  }

  /**
   * Determine category based on file characteristics
   */
  private determineCategoryFromFile(mediaFile: MediaFile): string {
    const fileName = mediaFile.originalName.toLowerCase();
    const fileSize = mediaFile.fileSize;

    // Heuristic classification based on filename patterns
    if (fileName.includes('music') || fileName.includes('song') || fileName.includes('track')) {
      return 'music';
    }
    
    if (fileName.includes('podcast') || fileName.includes('episode')) {
      return 'podcast';
    }
    
    if (fileName.includes('call') || fileName.includes('phone')) {
      return 'call';
    }
    
    if (fileName.includes('meeting') || fileName.includes('conference')) {
      return 'speech';
    }
    
    if (fileName.includes('announcement') || fileName.includes('ad')) {
      return 'announcement';
    }

    // Size-based heuristics
    if (fileSize < 1024 * 1024) { // < 1MB
      return 'announcement';
    } else if (fileSize > 50 * 1024 * 1024) { // > 50MB
      return 'music';
    }

    // Default to speech for medium-sized files
    return 'speech';
  }

  /**
   * Generate description for classification
   */
  private generateCategoryDescription(category: string, subcategory?: string): string {
    const descriptions: Record<string, string> = {
      'speech': 'Human speech content including conversations, presentations, and talks',
      'music': 'Musical content including songs, instrumental pieces, and compositions',
      'podcast': 'Podcast or talk show content with structured discussion format',
      'call': 'Phone or conference call recording with conversational content',
      'ambient': 'Background or environmental audio without primary speech content',
      'announcement': 'Public announcements, advertisements, or notification audio'
    };

    let description = descriptions[category] || 'Audio content classification';
    
    if (subcategory) {
      description += ` (${subcategory.replace('_', ' ')})`;
    }

    return description;
  }

  /**
   * Determine content appropriateness
   */
  public assessContentAppropriateness(classification: AudioClassification): {
    isAppropriate: boolean;
    concerns: string[];
    recommendations: string[];
  } {
    const concerns: string[] = [];
    const recommendations: string[] = [];

    // Check confidence level
    if (classification.confidence < this.confidenceThreshold) {
      concerns.push('Low classification confidence');
      recommendations.push('Manual review recommended');
    }

    // Category-specific checks
    switch (classification.type) {
      case 'call':
        concerns.push('May contain private conversations');
        recommendations.push('Verify consent for call recording');
        break;
      
      case 'announcement':
        if (classification.subCategories.includes('advertisement')) {
          recommendations.push('Consider advertising compliance guidelines');
        }
        break;
      
      case 'unknown':
        concerns.push('Unable to classify content');
        recommendations.push('Manual content review required');
        break;
    }

    return {
      isAppropriate: concerns.length === 0,
      concerns,
      recommendations
    };
  }

  /**
   * Generate classification tags
   */
  public generateClassificationTags(classification: AudioClassification): string[] {
    const tags: string[] = [];

    // Add primary category
    tags.push(classification.type);

    // Add subcategories
    tags.push(...classification.subCategories);

    // Add confidence-based tags
    if (classification.confidence > 0.9) {
      tags.push('high_confidence');
    } else if (classification.confidence < 0.7) {
      tags.push('low_confidence');
    }

    // Add quality indicators
    if (classification.type !== 'unknown') {
      tags.push('classified');
    }

    return tags.filter((tag, index, array) => array.indexOf(tag) === index); // Remove duplicates
  }

  /**
   * Get similar content categories
   */
  public getSimilarCategories(category: string): string[] {
    const similarities: Record<string, string[]> = {
      'speech': ['podcast', 'call'],
      'podcast': ['speech', 'announcement'],
      'call': ['speech', 'podcast'],
      'music': ['ambient'],
      'ambient': ['music'],
      'announcement': ['podcast', 'speech']
    };

    return similarities[category] || [];
  }

  /**
   * Calculate category confidence adjustment
   */
  public adjustConfidenceBasedOnContext(
    classification: AudioClassification,
    metadata?: { duration?: number; fileSize?: number }
  ): AudioClassification {
    let adjustedConfidence = classification.confidence;

    if (metadata) {
      // Duration-based adjustments
      if (metadata.duration) {
        if (classification.type === 'announcement' && metadata.duration > 300) { // 5 minutes
          adjustedConfidence *= 0.8; // Announcements are usually shorter
        }
        
        if (classification.type === 'music' && metadata.duration < 30) { // 30 seconds
          adjustedConfidence *= 0.7; // Music is usually longer
        }
      }

      // File size adjustments
      if (metadata.fileSize) {
        const sizeMB = metadata.fileSize / (1024 * 1024);
        
        if (classification.type === 'call' && sizeMB > 100) {
          adjustedConfidence *= 0.8; // Calls are usually smaller files
        }
      }
    }

    return {
      ...classification,
      confidence: Math.max(0, Math.min(1, adjustedConfidence))
    };
  }
}
