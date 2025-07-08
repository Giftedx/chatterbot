/**
 * Audio Metadata Service
 * Handles extraction and processing of audio file metadata
 */

import type { MediaFile, AudioMetadata } from './types.js';
import { logger } from '../../utils/logger.js';

/**
 * Service for extracting audio metadata
 */
export class AudioMetadataService {
  /**
   * Extract comprehensive metadata from audio file
   */
  public async extractAudioMetadata(mediaFile: MediaFile): Promise<AudioMetadata | null> {
    try {
      logger.info('Extracting audio metadata', {
        operation: 'audio-metadata',
        metadata: {
          fileId: mediaFile.id,
          fileName: mediaFile.originalName,
          mimeType: mediaFile.mimeType
        }
      });

      // Mock metadata extraction - in real implementation would use ffprobe or similar
      const metadata: AudioMetadata = {
        duration: this.estimateDurationFromFile(mediaFile),
        sampleRate: 44100,
        bitrate: 128000,
        channels: 2,
        format: this.extractFormatFromMimeType(mediaFile.mimeType),
        codec: this.extractCodecFromMimeType(mediaFile.mimeType)
      };

      logger.debug('Audio metadata extracted successfully', {
        operation: 'audio-metadata',
        metadata: {
          fileId: mediaFile.id,
          duration: metadata.duration,
          sampleRate: metadata.sampleRate,
          channels: metadata.channels
        }
      });

      return metadata;

    } catch (error) {
      logger.error('Failed to extract audio metadata', {
        operation: 'audio-metadata',
        metadata: {
          fileId: mediaFile.id,
          error: String(error)
        }
      });
      return null;
    }
  }

  /**
   * Estimate duration from file size (rough approximation)
   */
  private estimateDurationFromFile(mediaFile: MediaFile): number {
    // Very rough estimation based on file size and typical bitrates
    // In real implementation, would use actual audio analysis libraries
    const averageBitrate = 128000; // 128 kbps
    const bytesPerSecond = averageBitrate / 8;
    return Math.round(mediaFile.fileSize / bytesPerSecond);
  }

  /**
   * Extract format from MIME type
   */
  private extractFormatFromMimeType(mimeType: string): string {
    const formatMap: Record<string, string> = {
      'audio/mpeg': 'MP3',
      'audio/mp3': 'MP3',
      'audio/wav': 'WAV',
      'audio/wave': 'WAV',
      'audio/ogg': 'OGG',
      'audio/webm': 'WEBM',
      'audio/m4a': 'M4A',
      'audio/aac': 'AAC',
      'audio/flac': 'FLAC'
    };

    return formatMap[mimeType.toLowerCase()] || 'UNKNOWN';
  }

  /**
   * Extract codec from MIME type
   */
  private extractCodecFromMimeType(mimeType: string): string {
    const codecMap: Record<string, string> = {
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/wav': 'pcm',
      'audio/wave': 'pcm',
      'audio/ogg': 'vorbis',
      'audio/webm': 'opus',
      'audio/m4a': 'aac',
      'audio/aac': 'aac',
      'audio/flac': 'flac'
    };

    return codecMap[mimeType.toLowerCase()] || 'unknown';
  }

  /**
   * Validate audio metadata
   */
  public validateMetadata(metadata: AudioMetadata): boolean {
    if (!metadata.duration || metadata.duration <= 0) {
      return false;
    }

    if (!metadata.sampleRate || metadata.sampleRate < 8000) {
      return false;
    }

    if (!metadata.channels || metadata.channels < 1) {
      return false;
    }

    return true;
  }

  /**
   * Calculate quality score from metadata
   */
  public calculateQualityFromMetadata(metadata: AudioMetadata): number {
    let score = 0.5; // Base score

    // Sample rate scoring
    if (metadata.sampleRate && metadata.sampleRate >= 44100) score += 0.2;
    else if (metadata.sampleRate && metadata.sampleRate >= 22050) score += 0.1;

    // Bitrate scoring (if available)
    if (metadata.bitrate) {
      if (metadata.bitrate >= 320000) score += 0.2;
      else if (metadata.bitrate >= 256000) score += 0.15;
      else if (metadata.bitrate >= 192000) score += 0.1;
      else if (metadata.bitrate >= 128000) score += 0.05;
    }

    // Channel scoring
    if (metadata.channels && metadata.channels >= 2) score += 0.1;

    return Math.min(1.0, Math.max(0.0, score));
  }
}
