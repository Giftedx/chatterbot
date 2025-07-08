/**
 * Audio Analysis Service - Main Orchestrator
 * Coordinates all audio analysis modules and provides unified interface
 */

import type { 
  MediaFile, 
  FileProcessingOptions, 
  AudioAnalysisResult,
  AudioValidationConfig,
  AudioSearchOptions,
  AudioSearchResult
} from './types.js';
import { AudioMetadataService } from './metadata.service.js';
import { TranscriptionService } from './transcription.service.js';
import { SpeakerDetectionService } from './speaker-detection.service.js';
import { AudioClassificationService } from './classification.service.js';
import { QualityAssessmentService } from './quality-assessment.service.js';
import { SentimentAnalysisService } from './sentiment-analysis.service.js';
import { AudioDatabaseService } from './database.service.js';
import { logger } from '../../utils/logger.js';

/**
 * Main audio analysis service that coordinates all processing modules
 */
export class AudioAnalysisService {
  private readonly metadataService: AudioMetadataService;
  private readonly transcriptionService: TranscriptionService;
  private readonly speakerDetectionService: SpeakerDetectionService;
  private readonly classificationService: AudioClassificationService;
  private readonly qualityAssessmentService: QualityAssessmentService;
  private readonly sentimentAnalysisService: SentimentAnalysisService;
  private readonly databaseService: AudioDatabaseService;
  
  private readonly validationConfig: AudioValidationConfig;

  constructor() {
    // Initialize all services
    this.metadataService = new AudioMetadataService();
    this.transcriptionService = new TranscriptionService();
    this.speakerDetectionService = new SpeakerDetectionService();
    this.classificationService = new AudioClassificationService();
    this.qualityAssessmentService = new QualityAssessmentService();
    this.sentimentAnalysisService = new SentimentAnalysisService();
    this.databaseService = new AudioDatabaseService();

    // Initialize validation configuration
    this.validationConfig = {
      supportedFormats: new Set([
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/wave',
        'audio/ogg',
        'audio/webm',
        'audio/m4a',
        'audio/aac',
        'audio/flac'
      ]),
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxDuration: 30 * 60 // 30 minutes in seconds
    };
  }

  /**
   * Analyze audio file and extract comprehensive information
   */
  public async analyzeAudio(
    mediaFile: MediaFile,
    options: FileProcessingOptions = {}
  ): Promise<AudioAnalysisResult | null> {
    try {
      const startTime = Date.now();

      logger.info('Starting comprehensive audio analysis', {
        operation: 'audio-analysis',
        metadata: {
          fileId: mediaFile.id,
          fileName: mediaFile.originalName,
          fileSize: mediaFile.fileSize,
          mimeType: mediaFile.mimeType
        }
      });

      // Validate audio file
      if (!this.isValidAudioFile(mediaFile)) {
        logger.warn('Invalid audio file for analysis', {
          operation: 'audio-analysis',
          metadata: {
            fileId: mediaFile.id,
            mimeType: mediaFile.mimeType,
            fileSize: mediaFile.fileSize
          }
        });
        return null;
      }

      // Update processing status
      await this.databaseService.updateProcessingStatus(mediaFile.id, 'processing');

      const analysisResult: AudioAnalysisResult = {};

      // Step 1: Extract audio metadata
      const audioMetadata = await this.metadataService.extractAudioMetadata(mediaFile);
      
      if (audioMetadata && audioMetadata.duration > this.validationConfig.maxDuration) {
        logger.warn('Audio file too long for processing', {
          operation: 'audio-analysis',
          metadata: {
            fileId: mediaFile.id,
            duration: audioMetadata.duration
          }
        });
        
        await this.databaseService.updateProcessingStatus(mediaFile.id, 'failed', 'Audio file too long');
        return null;
      }

      // Step 2: Perform speech-to-text if enabled
      if (options.enableTranscription !== false) {
        try {
          analysisResult.transcription = await this.transcriptionService.performSpeechToText(mediaFile);
        } catch (error) {
          logger.warn('Transcription failed, continuing without it', {
            operation: 'audio-analysis',
            metadata: { fileId: mediaFile.id, error: String(error) }
          });
        }
      }

      // Step 3: Perform speaker detection if transcription is available
      if (options.enableTranscription !== false && analysisResult.transcription) {
        try {
          analysisResult.speakerDetection = await this.speakerDetectionService.performSpeakerDetection(
            mediaFile, 
            analysisResult.transcription
          );
        } catch (error) {
          logger.warn('Speaker detection failed, continuing without it', {
            operation: 'audio-analysis',
            metadata: { fileId: mediaFile.id, error: String(error) }
          });
        }
      }

      // Step 4: Classify audio content
      try {
        analysisResult.classification = await this.classificationService.classifyAudioContent(mediaFile);
      } catch (error) {
        logger.warn('Classification failed, continuing without it', {
          operation: 'audio-analysis',
          metadata: { fileId: mediaFile.id, error: String(error) }
        });
      }

      // Step 5: Perform sentiment analysis if transcription is available
      if (analysisResult.transcription) {
        try {
          const sentimentResult = await this.sentimentAnalysisService.performSentimentAnalysis(
            analysisResult.transcription
          );
          
          // Convert to base type format with SentimentSegment structure
          analysisResult.sentiment = {
            overall: sentimentResult.overall,
            segments: sentimentResult.segments.map(seg => ({
              text: seg.text,
              sentiment: seg.sentiment,
              startTime: seg.startTime,
              endTime: seg.endTime
            }))
          };
        } catch (error) {
          logger.warn('Sentiment analysis failed, continuing without it', {
            operation: 'audio-analysis',
            metadata: { fileId: mediaFile.id, error: String(error) }
          });
        }
      }

      // Step 6: Assess audio quality
      try {
        analysisResult.quality = await this.qualityAssessmentService.assessAudioQuality(
          mediaFile, 
          audioMetadata || null
        );
      } catch (error) {
        logger.warn('Quality assessment failed, continuing without it', {
          operation: 'audio-analysis',
          metadata: { fileId: mediaFile.id, error: String(error) }
        });
      }

      // Step 7: Generate derived content
      const extractedText = analysisResult.transcription?.text || '';
      const description = this.generateAudioDescription(analysisResult);
      const tags = this.extractTagsFromAnalysis(analysisResult);

      // Step 8: Update database with results
      try {
        await this.databaseService.updateMediaFileWithAnalysis(mediaFile.id, {
          audioAnalysis: analysisResult,
          audioMetadata: audioMetadata || undefined,
          extractedText,
          description,
          tags
        });

        await this.databaseService.updateProcessingStatus(mediaFile.id, 'completed');
      } catch (error) {
        logger.error('Failed to update database with analysis results', {
          operation: 'audio-analysis',
          metadata: { fileId: mediaFile.id, error: String(error) }
        });
      }

      const processingTime = Date.now() - startTime;

      logger.info('Audio analysis completed successfully', {
        operation: 'audio-analysis',
        metadata: {
          fileId: mediaFile.id,
          processingTime,
          hasTranscription: !!analysisResult.transcription,
          hasSpeakerDetection: !!analysisResult.speakerDetection,
          hasClassification: !!analysisResult.classification,
          hasSentiment: !!analysisResult.sentiment,
          hasQuality: !!analysisResult.quality,
          extractedTextLength: extractedText.length,
          tagCount: tags.length
        }
      });

      return analysisResult;

    } catch (error) {
      logger.error('Audio analysis failed', {
        operation: 'audio-analysis',
        metadata: {
          fileId: mediaFile.id,
          error: String(error)
        }
      });

      await this.databaseService.updateProcessingStatus(
        mediaFile.id, 
        'failed', 
        String(error)
      );

      throw error;
    }
  }

  /**
   * Search audio files by content
   */
  public async searchAudioByContent(options: AudioSearchOptions): Promise<AudioSearchResult[]> {
    return this.databaseService.searchAudioByContent(options);
  }

  /**
   * Get audio transcription by file ID
   */
  public async getAudioTranscription(fileId: number): Promise<string | null> {
    return this.databaseService.getAudioTranscription(fileId);
  }

  /**
   * Check if audio file is valid for processing
   */
  public isValidAudioFile(mediaFile: MediaFile): boolean {
    // Check file type
    if (!this.validationConfig.supportedFormats.has(mediaFile.mimeType)) {
      return false;
    }

    // Check file size
    if (mediaFile.fileSize > this.validationConfig.maxFileSize) {
      return false;
    }

    // Check if file size is reasonable (not empty)
    if (mediaFile.fileSize < 1024) { // Less than 1KB
      return false;
    }

    return true;
  }

  // Helper methods for generating derived content

  /**
   * Generate human-readable description of audio content
   */
  private generateAudioDescription(analysis: AudioAnalysisResult): string {
    const parts: string[] = [];

    // Add classification info
    if (analysis.classification) {
      parts.push(`${analysis.classification.type} content`);
      if (analysis.classification.subCategories.length > 0) {
        parts.push(`(${analysis.classification.subCategories.join(', ')})`);
      }
    }

    // Add transcription info
    if (analysis.transcription) {
      const wordCount = analysis.transcription.text.split(' ').length;
      parts.push(`with ${wordCount} words transcribed`);
    }

    // Add speaker info
    if (analysis.speakerDetection) {
      parts.push(`featuring ${analysis.speakerDetection.speakerCount} speaker(s)`);
    }

    // Add sentiment info
    if (analysis.sentiment) {
      const sentimentInterpretation = this.sentimentAnalysisService.interpretSentiment(analysis.sentiment.overall.score);
      parts.push(`with ${sentimentInterpretation.label.toLowerCase()} sentiment`);
    }

    // Add quality info
    if (analysis.quality) {
      const qualityLevel = this.qualityAssessmentService.getQualityLevel(analysis.quality);
      parts.push(`in ${qualityLevel} quality`);
    }

    return parts.length > 0 
      ? parts.join(' ').replace(/\s+/g, ' ').trim()
      : 'Audio content processed';
  }

  /**
   * Extract tags from analysis results
   */
  private extractTagsFromAnalysis(analysis: AudioAnalysisResult): string[] {
    const tags = new Set<string>();

    // Add classification tags
    if (analysis.classification) {
      tags.add(analysis.classification.type);
      analysis.classification.subCategories.forEach((sub: string) => tags.add(sub));
      
      // Add classification quality tags
      const classificationTags = this.classificationService.generateClassificationTags(analysis.classification);
      classificationTags.forEach(tag => tags.add(tag));
    }

    // Add transcription tags
    if (analysis.transcription) {
      tags.add('transcribed');
      
      // Add keyword tags
      const keywords = this.transcriptionService.extractKeywords(analysis.transcription);
      keywords.slice(0, 10).forEach(keyword => tags.add(keyword)); // Top 10 keywords
    }

    // Add speaker tags
    if (analysis.speakerDetection) {
      tags.add(`${analysis.speakerDetection.speakerCount}_speakers`);
      
      if (analysis.speakerDetection.speakerCount === 1) {
        tags.add('monologue');
      } else if (analysis.speakerDetection.speakerCount === 2) {
        tags.add('dialogue');
      } else {
        tags.add('group_discussion');
      }
    }

    // Add sentiment tags
    if (analysis.sentiment) {
      const sentimentInterpretation = this.sentimentAnalysisService.interpretSentiment(analysis.sentiment.overall.score);
      tags.add(sentimentInterpretation.label.toLowerCase().replace(/\s+/g, '_'));
      tags.add(`sentiment:${analysis.sentiment.overall.sentiment}`);
    }

    // Add quality tags
    if (analysis.quality) {
      const qualityLevel = this.qualityAssessmentService.getQualityLevel(analysis.quality);
      tags.add(`quality_${qualityLevel}`);
    }

    return Array.from(tags);
  }

  /**
   * Categorize audio for organization
   */
  private categorizeAudio(analysis: AudioAnalysisResult): string[] {
    const categories: string[] = [];

    if (analysis.classification) {
      categories.push(analysis.classification.type);
      
      // Add contextual categories
      const similarCategories = this.classificationService.getSimilarCategories(analysis.classification.type);
      categories.push(...similarCategories);
    }

    if (analysis.speakerDetection) {
      if (analysis.speakerDetection.speakerCount === 1) {
        categories.push('presentation', 'monologue');
      } else {
        categories.push('conversation', 'discussion');
      }
    }

    if (analysis.transcription) {
      categories.push('speech_content');
    }

    return Array.from(new Set(categories)); // Remove duplicates
  }
}
