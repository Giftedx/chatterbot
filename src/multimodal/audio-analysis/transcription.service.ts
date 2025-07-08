/**
 * Audio Transcription Service
 * Handles speech-to-text conversion and transcription processing
 */

import type { MediaFile, TranscriptionSegment } from './types.js';
import { logger } from '../../utils/logger.js';

/**
 * Service for audio transcription and speech-to-text processing
 */
export class TranscriptionService {
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  /**
   * Perform speech-to-text transcription
   */
  public async performSpeechToText(mediaFile: MediaFile) {
    try {
      logger.info('Starting speech-to-text transcription', {
        operation: 'transcription',
        metadata: {
          fileId: mediaFile.id,
          fileName: mediaFile.originalName
        }
      });

      // Mock transcription - in real implementation would use services like:
      // - Google Cloud Speech-to-Text
      // - Azure Speech Services  
      // - AWS Transcribe
      // - OpenAI Whisper
      // - AssemblyAI
      
      const transcriptionResult = await this.mockTranscription(mediaFile);

      logger.info('Speech-to-text transcription completed', {
        operation: 'transcription',
        metadata: {
          fileId: mediaFile.id,
          segmentCount: transcriptionResult.segments.length,
          confidence: transcriptionResult.confidence,
          wordCount: transcriptionResult.text.split(' ').length
        }
      });

      return transcriptionResult;

    } catch (error) {
      logger.error('Speech-to-text transcription failed', {
        operation: 'transcription',
        metadata: {
          fileId: mediaFile.id,
          error: String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Mock transcription for development/testing
   */
  private async mockTranscription(mediaFile: MediaFile) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate mock transcription based on file type
    const mockText = this.generateMockText(mediaFile);
    const segments = this.generateMockSegments(mockText);

    return {
      text: mockText,
      confidence: 0.85 + Math.random() * 0.10, // 85-95% confidence
      language: 'en',
      segments,
      duration: segments.length > 0 ? segments[segments.length - 1].endTime : 0
    };
  }

  /**
   * Generate mock transcription text
   */
  private generateMockText(mediaFile: MediaFile): string {
    const mockTexts = [
      "Welcome to our presentation. Today we'll be discussing the latest developments in artificial intelligence and machine learning.",
      "This is a recording of our team meeting. We covered project updates, timeline adjustments, and resource allocation.",
      "In this audio segment, we explore the fundamentals of data science and its applications in modern business.",
      "Thank you for joining our webinar. We're excited to share insights about digital transformation strategies.",
      "This podcast episode covers emerging trends in technology and their impact on various industries."
    ];

    // Select based on file characteristics
    const index = Math.abs(mediaFile.id) % mockTexts.length;
    return mockTexts[index];
  }

  /**
   * Generate mock transcription segments
   */
  private generateMockSegments(text: string): TranscriptionSegment[] {
    const words = text.split(' ');
    const segments: TranscriptionSegment[] = [];
    
    let currentTime = 0;
    let currentSegment = '';
    
    for (let i = 0; i < words.length; i++) {
      currentSegment += (currentSegment ? ' ' : '') + words[i];
      
      // Create segment every 8-12 words or at sentence boundaries
      if ((i + 1) % 10 === 0 || words[i].endsWith('.') || words[i].endsWith('!') || words[i].endsWith('?')) {
        const startTime = currentTime;
        const duration = 2 + Math.random() * 3; // 2-5 seconds per segment
        const endTime = currentTime + duration;
        
        segments.push({
          text: currentSegment.trim(),
          startTime: Math.round(startTime * 100) / 100,
          endTime: Math.round(endTime * 100) / 100,
          confidence: 0.80 + Math.random() * 0.15 // 80-95% confidence
        });
        
        currentTime = endTime;
        currentSegment = '';
      }
    }
    
    // Add final segment if there's remaining text
    if (currentSegment.trim()) {
      const startTime = currentTime;
      const endTime = currentTime + 2;
      
      segments.push({
        text: currentSegment.trim(),
        startTime: Math.round(startTime * 100) / 100,
        endTime: Math.round(endTime * 100) / 100,
        confidence: 0.80 + Math.random() * 0.15
      });
    }
    
    return segments;
  }

  /**
   * Process and clean transcription text
   */
  public processTranscriptionText(rawText: string): string {
    return rawText
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s.,!?;:()\-'"]/g, '') // Remove special characters
      .replace(/\b(um|uh|er|ah)\b/gi, '') // Remove filler words
      .replace(/\s+/g, ' ') // Normalize whitespace again
      .trim();
  }

  /**
   * Extract keywords from transcription
   */
  public extractKeywords(transcription: { text: string; segments: TranscriptionSegment[] }): string[] {
    const text = transcription.text.toLowerCase();
    const words = text.split(/\s+/);
    
    // Filter out common words and keep meaningful terms
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);
    
    const keywords = words
      .filter(word => 
        word.length > 3 && 
        !stopWords.has(word) && 
        /^[a-zA-Z]+$/.test(word)
      )
      .reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    // Return top keywords by frequency
    return Object.entries(keywords)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * Calculate transcription quality score
   */
  public calculateTranscriptionQuality(transcription: { confidence: number; segments: TranscriptionSegment[] }): number {
    if (!transcription.segments.length) return 0;

    // Base score from overall confidence
    let score = transcription.confidence;

    // Adjust based on segment consistency
    const segmentConfidences = transcription.segments.map(s => s.confidence);
    const avgSegmentConfidence = segmentConfidences.reduce((a, b) => a + b, 0) / segmentConfidences.length;
    const confidenceVariance = segmentConfidences.reduce((acc, conf) => acc + Math.pow(conf - avgSegmentConfidence, 2), 0) / segmentConfidences.length;

    // Lower variance = higher quality
    score += (1 - Math.min(1, confidenceVariance * 10)) * 0.1;

    // Adjust based on segment count (more segments usually means better timing)
    const segmentBonus = Math.min(0.1, transcription.segments.length * 0.005);
    score += segmentBonus;

    return Math.min(1.0, Math.max(0.0, score));
  }
}
