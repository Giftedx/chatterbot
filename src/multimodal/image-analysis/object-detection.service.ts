/**
 * Object Detection Service
 * Handles object and face detection in images
 */

import type { MediaFile, ObjectDetectionResult, FaceDetectionResult, DetectedObject, DetectedFace } from './types.js';
import { logger } from '../../utils/logger.js';

/**
 * Service for performing object and face detection on images
 */
export class ObjectDetectionService {
  /**
   * Perform object detection
   */
  public async performObjectDetection(mediaFile: MediaFile): Promise<ObjectDetectionResult | undefined> {
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

      logger.debug('Object detection completed', {
        operation: 'object-detection',
        metadata: {
          fileId: mediaFile.id,
          objectCount: objects.length
        }
      });

      return {
        objects,
        confidence: 0.90
      };

    } catch (error) {
      logger.error('Object detection failed', {
        operation: 'object-detection',
        metadata: {
          fileId: mediaFile.id
        },
        error: String(error)
      });
      return undefined;
    }
  }

  /**
   * Perform face detection
   */
  public async performFaceDetection(mediaFile: MediaFile): Promise<FaceDetectionResult | undefined> {
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
        metadata: {
          fileId: mediaFile.id,
          faceCount: faces.length
        }
      });

      return {
        faces,
        faceCount: faces.length
      };

    } catch (error) {
      logger.error('Face detection failed', {
        operation: 'face-detection',
        metadata: {
          fileId: mediaFile.id
        },
        error: String(error)
      });
      return undefined;
    }
  }

  /**
   * Extract object names for categorization
   */
  public extractObjectNames(objectDetection?: ObjectDetectionResult): string[] {
    if (!objectDetection || !objectDetection.objects) {
      return [];
    }

    return objectDetection.objects
      .filter(obj => obj.confidence > 0.7)
      .map(obj => obj.name);
  }

  /**
   * Get high-confidence objects only
   */
  public getHighConfidenceObjects(objectDetection?: ObjectDetectionResult, threshold: number = 0.8): DetectedObject[] {
    if (!objectDetection || !objectDetection.objects) {
      return [];
    }

    return objectDetection.objects.filter(obj => obj.confidence >= threshold);
  }

  /**
   * Check if faces are detected
   */
  public hasFaces(faceDetection?: FaceDetectionResult): boolean {
    return Boolean(faceDetection && faceDetection.faceCount > 0);
  }

  /**
   * Get dominant emotion from face detection
   */
  public getDominantEmotion(face: DetectedFace): string | undefined {
    if (!face.emotions || face.emotions.length === 0) {
      return undefined;
    }

    return face.emotions.reduce((prev, current) => 
      current.confidence > prev.confidence ? current : prev
    ).emotion;
  }
}
