/**
 * Audio Quality Assessment Service
 * Handles audio quality analysis and scoring
 */

import type { MediaFile, AudioMetadata, QualityMetrics } from './types.js';
import { logger } from '../../utils/logger.js';

/**
 * Service for assessing audio quality
 */
export class QualityAssessmentService {
  private readonly qualityThresholds = {
    excellent: 0.9,
    good: 0.75,
    acceptable: 0.6,
    poor: 0.4
  };

  /**
   * Assess overall audio quality
   */
  public async assessAudioQuality(
    mediaFile: MediaFile, 
    metadata: AudioMetadata | null
  ): Promise<QualityMetrics> {
    try {
      logger.info('Starting audio quality assessment', {
        operation: 'audio-quality',
        metadata: {
          fileId: mediaFile.id,
          fileName: mediaFile.originalName
        }
      });

      // Mock quality assessment - in real implementation would use:
      // - Audio analysis libraries (librosa, ffmpeg)
      // - Machine learning models for quality scoring
      // - Spectral analysis tools
      // - Noise detection algorithms

      const qualityMetrics = await this.mockQualityAssessment(mediaFile, metadata);

      logger.info('Audio quality assessment completed', {
        operation: 'audio-quality',
        metadata: {
          fileId: mediaFile.id,
          clarity: qualityMetrics.clarity,
          noiseLevel: qualityMetrics.noiseLevel,
          volumeLevel: qualityMetrics.volumeLevel
        }
      });

      return qualityMetrics;

    } catch (error) {
      logger.error('Audio quality assessment failed', {
        operation: 'audio-quality',
        metadata: {
          fileId: mediaFile.id,
          error: String(error)
        }
      });

      // Return default low quality on error
      return {
        clarity: 0.3,
        noiseLevel: 0.7,
        volumeLevel: 0.5
      };
    }
  }

  /**
   * Mock quality assessment for development/testing
   */
  private async mockQualityAssessment(
    mediaFile: MediaFile, 
    metadata: AudioMetadata | null
  ): Promise<QualityMetrics> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Calculate individual quality components
    const clarity = this.assessClarity(mediaFile, metadata);
    const background = this.assessBackground(mediaFile, metadata);
    // const consistency = this.assessConsistency(mediaFile, metadata); // Unused for now
    const technical = this.assessTechnicalQuality(mediaFile, metadata);

    // Calculate weighted overall score (commented out as not used in return)
    // const overallScore = (
    //   clarity * 0.3 +        // 30% weight on clarity
    //   background * 0.25 +    // 25% weight on background noise
    //   consistency * 0.25 +   // 25% weight on consistency
    //   technical * 0.2        // 20% weight on technical quality
    // );

    // const factors = this.identifyQualityFactors(clarity, background, consistency, technical);

    return {
      clarity: Math.round(clarity * 100) / 100,
      noiseLevel: Math.round((1 - background) * 100) / 100, // Convert background to noise level (inverted)
      volumeLevel: Math.round(technical * 100) / 100
    };
  }

  /**
   * Assess audio clarity (speech intelligibility)
   */
  private assessClarity(mediaFile: MediaFile, metadata: AudioMetadata | null): number {
    let score = 0.7; // Base score

    // File size impact (larger files often have better quality)
    const sizeMB = mediaFile.fileSize / (1024 * 1024);
    if (sizeMB > 10) score += 0.1;
    else if (sizeMB < 1) score -= 0.2;

    // Sample rate impact (if available)
    if (metadata?.sampleRate) {
      if (metadata.sampleRate >= 44100) score += 0.15;
      else if (metadata.sampleRate >= 22050) score += 0.05;
      else if (metadata.sampleRate < 16000) score -= 0.15;
    }

    // Format impact
    if (mediaFile.mimeType.includes('flac') || mediaFile.mimeType.includes('wav')) {
      score += 0.1; // Lossless formats
    } else if (mediaFile.mimeType.includes('mp3') && sizeMB > 5) {
      score += 0.05; // High-quality MP3
    }

    return Math.max(0, Math.min(1, score + (Math.random() - 0.5) * 0.2));
  }

  /**
   * Assess background noise levels
   */
  private assessBackground(mediaFile: MediaFile, metadata: AudioMetadata | null): number {
    let score = 0.8; // Base score (assume good background)

    // Smaller files might have more compression artifacts
    const sizeMB = mediaFile.fileSize / (1024 * 1024);
    if (sizeMB < 2) score -= 0.2;

    // Bitrate impact (if available)
    if (metadata?.bitrate) {
      if (metadata.bitrate >= 256000) score += 0.1;
      else if (metadata.bitrate < 128000) score -= 0.15;
    }

    // Duration impact (longer recordings might have more noise issues)
    if (metadata?.duration) {
      if (metadata.duration > 3600) score -= 0.1; // 1 hour+
    }

    return Math.max(0, Math.min(1, score + (Math.random() - 0.5) * 0.3));
  }

  /**
   * Assess audio consistency (volume, quality throughout)
   */
  private assessConsistency(mediaFile: MediaFile, metadata: AudioMetadata | null): number {
    let score = 0.75; // Base score

    // Channel configuration impact
    if (metadata?.channels) {
      if (metadata.channels === 2) score += 0.05; // Stereo usually more consistent
      else if (metadata.channels > 2) score -= 0.1; // Multi-channel can be inconsistent
    }

    // File format impact
    if (mediaFile.mimeType.includes('wav') || mediaFile.mimeType.includes('flac')) {
      score += 0.1; // Uncompressed formats are more consistent
    }

    // Duration impact (very short or very long files might have consistency issues)
    if (metadata?.duration) {
      if (metadata.duration < 10 || metadata.duration > 7200) { // < 10s or > 2 hours
        score -= 0.1;
      }
    }

    return Math.max(0, Math.min(1, score + (Math.random() - 0.5) * 0.25));
  }

  /**
   * Assess technical audio quality
   */
  private assessTechnicalQuality(mediaFile: MediaFile, metadata: AudioMetadata | null): number {
    let score = 0.6; // Base score

    // Format scoring
    const formatScores: Record<string, number> = {
      'audio/flac': 0.95,
      'audio/wav': 0.9,
      'audio/wave': 0.9,
      'audio/m4a': 0.8,
      'audio/aac': 0.75,
      'audio/mpeg': 0.7,
      'audio/mp3': 0.7,
      'audio/ogg': 0.75,
      'audio/webm': 0.65
    };

    const formatScore = formatScores[mediaFile.mimeType.toLowerCase()];
    if (formatScore) {
      score = formatScore;
    }

    // Metadata completeness bonus
    if (metadata) {
      if (metadata.sampleRate && metadata.bitrate && metadata.channels) {
        score += 0.05; // Bonus for complete metadata
      }
    }

    return Math.max(0, Math.min(1, score + (Math.random() - 0.5) * 0.1));
  }

  /**
   * Identify specific quality factors
   */
  private identifyQualityFactors(
    clarity: number, 
    background: number, 
    consistency: number, 
    technical: number
  ): string[] {
    const factors: string[] = [];

    // Positive factors
    if (clarity > 0.8) factors.push('High clarity');
    if (background > 0.8) factors.push('Clean background');
    if (consistency > 0.8) factors.push('Consistent quality');
    if (technical > 0.8) factors.push('Good technical quality');

    // Negative factors
    if (clarity < 0.5) factors.push('Poor clarity');
    if (background < 0.5) factors.push('Noisy background');
    if (consistency < 0.5) factors.push('Inconsistent quality');
    if (technical < 0.5) factors.push('Technical quality issues');

    // Default if no specific factors
    if (factors.length === 0) {
      factors.push('Average audio quality');
    }

    return factors;
  }

  /**
   * Calculate overall quality score from base metrics
   */
  private calculateOverallScore(metrics: QualityMetrics): number {
    // Convert metrics to overall score (0-1 scale)
    return (metrics.clarity * 0.4) + ((1 - metrics.noiseLevel) * 0.4) + (metrics.volumeLevel * 0.2);
  }

  /**
   * Get quality level description from metrics
   */
  public getQualityLevel(metrics: QualityMetrics): string {
    const score = this.calculateOverallScore(metrics);
    if (score >= this.qualityThresholds.excellent) return 'excellent';
    if (score >= this.qualityThresholds.good) return 'good';
    if (score >= this.qualityThresholds.acceptable) return 'acceptable';
    if (score >= this.qualityThresholds.poor) return 'poor';
    return 'very_poor';
  }

  /**
   * Generate quality improvement recommendations
   */
  public generateQualityRecommendations(metrics: QualityMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.clarity < 0.6) {
      recommendations.push('Consider re-recording with better microphone positioning');
      recommendations.push('Reduce ambient noise during recording');
    }

    if (metrics.noiseLevel > 0.4) { // High noise level
      recommendations.push('Use noise reduction software');
      recommendations.push('Record in a quieter environment');
    }

    if (metrics.clarity < 0.6) {
      recommendations.push('Maintain consistent distance from microphone');
      recommendations.push('Use audio compression to level volume');
    }

    if (metrics.volumeLevel < 0.6) {
      recommendations.push('Use higher bitrate or lossless format');
      recommendations.push('Check recording equipment settings');
    }

    const overallScore = this.calculateOverallScore(metrics);
    if (overallScore > 0.8) {
      recommendations.push('Audio quality is good - no immediate improvements needed');
    }

    return recommendations;
  }

  /**
   * Compare quality with similar files
   */
  public compareQuality(currentMetrics: QualityMetrics, referenceMetrics: QualityMetrics[]): {
    percentileRank: number;
    comparisonSummary: string;
  } {
    if (referenceMetrics.length === 0) {
      return {
        percentileRank: 50,
        comparisonSummary: 'No reference files for comparison'
      };
    }

    const scores = referenceMetrics.map(m => this.calculateOverallScore(m)).sort((a, b) => a - b);
    const currentScore = this.calculateOverallScore(currentMetrics);
    const rank = scores.filter(score => score <= currentScore).length;
    const percentileRank = Math.round((rank / scores.length) * 100);

    let comparisonSummary: string;
    if (percentileRank >= 90) {
      comparisonSummary = 'Excellent quality compared to similar files';
    } else if (percentileRank >= 75) {
      comparisonSummary = 'Above average quality';
    } else if (percentileRank >= 50) {
      comparisonSummary = 'Average quality';
    } else if (percentileRank >= 25) {
      comparisonSummary = 'Below average quality';
    } else {
      comparisonSummary = 'Poor quality compared to similar files';
    }

    return { percentileRank, comparisonSummary };
  }
}
