/**
 * Content Classification Service
 * Handles labels, categories, descriptions, and tags for images
 */

import type { 
  MediaFile, 
  VisionAnalysisResult, 
  ContentClassificationResult,
  DetectedLabel
} from './types.js';
import { logger } from '../../utils/logger.js';

/**
 * Service for classifying and categorizing image content
 */
export class ContentClassificationService {
  /**
   * Perform label detection
   */
  public async performLabelDetection(mediaFile: MediaFile): Promise<{ labels: DetectedLabel[] } | undefined> {
    try {
      // Mock label detection results
      const labels: DetectedLabel[] = [
        { description: 'Technology', score: 0.9, topicality: 0.85 },
        { description: 'Computer', score: 0.88, topicality: 0.82 },
        { description: 'Person', score: 0.85, topicality: 0.8 },
        { description: 'Office', score: 0.78, topicality: 0.75 },
        { description: 'Work', score: 0.72, topicality: 0.7 }
      ];

      logger.debug('Label detection completed', {
        operation: 'label-detection',
        metadata: {
          fileId: mediaFile.id,
          labelCount: labels.length
        }
      });

      return { labels };

    } catch (error) {
      logger.error('Label detection failed', {
        operation: 'label-detection',
        metadata: {
          fileId: mediaFile.id
        },
        error: String(error)
      });
      return undefined;
    }
  }

  /**
   * Generate natural language description of image
   */
  public async generateImageDescription(analysis: VisionAnalysisResult): Promise<string> {
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
  public extractTagsFromAnalysis(analysis: VisionAnalysisResult): string[] {
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
  public categorizeImage(analysis: VisionAnalysisResult): string[] {
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
            default:
              categories.add('general');
          }
        }
      }
    }

    // Secondary categorization based on labels
    if (analysis.labelDetection?.labels) {
      for (const label of analysis.labelDetection.labels) {
        if (label.score > 0.8) {
          const desc = label.description.toLowerCase();
          
          if (['person', 'people', 'human', 'face'].some(term => desc.includes(term))) {
            categories.add('social');
          } else if (['computer', 'technology', 'device', 'electronic'].some(term => desc.includes(term))) {
            categories.add('technology');
          } else if (['nature', 'outdoor', 'landscape', 'tree', 'flower'].some(term => desc.includes(term))) {
            categories.add('nature');
          } else if (['food', 'meal', 'drink', 'restaurant'].some(term => desc.includes(term))) {
            categories.add('food_drink');
          } else if (['car', 'vehicle', 'transport'].some(term => desc.includes(term))) {
            categories.add('transportation');
          } else if (['building', 'architecture', 'indoor', 'room'].some(term => desc.includes(term))) {
            categories.add('architecture');
          }
        }
      }
    }

    // Text-based categorization
    if (analysis.textDetection?.fullText && analysis.textDetection.fullText.length > 20) {
      categories.add('document');
    }

    return Array.from(categories);
  }

  /**
   * Get high-confidence labels only
   */
  public getHighConfidenceLabels(labels: DetectedLabel[], threshold: number = 0.8): DetectedLabel[] {
    return labels.filter(label => label.score >= threshold);
  }

  /**
   * Combine all classification results
   */
  public combineClassificationResults(
    labelDetection?: { labels: DetectedLabel[] },
    analysis?: VisionAnalysisResult
  ): ContentClassificationResult {
    const labels = labelDetection?.labels || [];
    const categories = analysis ? this.categorizeImage(analysis) : [];
    const description = analysis ? 'Image analysis completed' : 'No analysis available';
    const tags = analysis ? this.extractTagsFromAnalysis(analysis) : [];

    return {
      labels,
      categories,
      description,
      tags
    };
  }
}
