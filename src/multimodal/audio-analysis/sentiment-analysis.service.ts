/**
 * Audio Sentiment Analysis Service
 * Handles sentiment analysis of transcribed audio content
 */

import type { TranscriptionSegment, SentimentScore } from './types.js';
import { logger } from '../../utils/logger.js';

/**
 * Service for analyzing sentiment in audio transcriptions
 */
export class SentimentAnalysisService {
  private readonly sentimentWords: Record<string, number>;
  private readonly emotionalMarkers: Record<string, string[]>;

  constructor() {
    // Initialize sentiment lexicon (simplified version)
    this.sentimentWords = {
      // Positive words
      'excellent': 0.8, 'amazing': 0.9, 'wonderful': 0.8, 'great': 0.7, 'good': 0.6,
      'fantastic': 0.9, 'awesome': 0.8, 'brilliant': 0.8, 'perfect': 0.9, 'outstanding': 0.9,
      'happy': 0.7, 'pleased': 0.6, 'satisfied': 0.6, 'delighted': 0.8, 'thrilled': 0.9,
      'love': 0.8, 'like': 0.5, 'enjoy': 0.7, 'appreciate': 0.6, 'recommend': 0.6,
      
      // Negative words  
      'terrible': -0.8, 'awful': -0.8, 'horrible': -0.9, 'bad': -0.6, 'poor': -0.5,
      'disappointing': -0.7, 'frustrating': -0.7, 'annoying': -0.6, 'useless': -0.8,
      'hate': -0.9, 'dislike': -0.6, 'angry': -0.7, 'upset': -0.6, 'concerned': -0.4,
      'worried': -0.5, 'problem': -0.4, 'issue': -0.3, 'difficult': -0.4, 'hard': -0.3,
      
      // Neutral but contextual
      'okay': 0.1, 'fine': 0.2, 'alright': 0.2, 'maybe': 0.0, 'perhaps': 0.0
    };

    this.emotionalMarkers = {
      'excitement': ['excited', 'thrilled', 'amazing', 'incredible', 'fantastic'],
      'satisfaction': ['satisfied', 'pleased', 'content', 'happy', 'good'],
      'concern': ['concerned', 'worried', 'anxious', 'unsure', 'uncertain'],
      'frustration': ['frustrated', 'annoyed', 'difficult', 'problem', 'issue'],
      'disappointment': ['disappointed', 'let down', 'expected', 'hoped', 'unfortunately'],
      'confidence': ['confident', 'sure', 'certain', 'definitely', 'absolutely']
    };
  }

  /**
   * Perform sentiment analysis on transcription
   */
  public async performSentimentAnalysis(transcription: { 
    text: string; 
    segments: TranscriptionSegment[] 
  }): Promise<{
    overall: SentimentScore;
    segments: Array<{
      text: string;
      startTime: number;
      endTime: number;
      sentiment: SentimentScore;
    }>;
  }> {
    try {
      logger.info('Starting sentiment analysis', {
        operation: 'sentiment-analysis',
        metadata: {
          segmentCount: transcription.segments.length,
          textLength: transcription.text.length
        }
      });

      // Mock sentiment analysis - in real implementation would use:
      // - Google Cloud Natural Language API
      // - Azure Text Analytics
      // - AWS Comprehend
      // - Hugging Face Transformers
      // - Custom sentiment models

      const sentimentResult = await this.mockSentimentAnalysis(transcription);

      logger.info('Sentiment analysis completed', {
        operation: 'sentiment-analysis',
        metadata: {
          overallSentiment: sentimentResult.overall.sentiment,
          positiveSegments: sentimentResult.segments.filter(s => s.sentiment.score > 0.1).length,
          negativeSegments: sentimentResult.segments.filter(s => s.sentiment.score < -0.1).length
        }
      });

      return sentimentResult;

    } catch (error) {
      logger.error('Sentiment analysis failed', {
        operation: 'sentiment-analysis',
        metadata: {
          error: String(error)
        }
      });

      // Return neutral sentiment on error
      return {
        overall: {
          sentiment: 'neutral',
          score: 0.0,
          magnitude: 0.0
        },
        segments: []
      };
    }
  }

  /**
   * Mock sentiment analysis for development/testing
   */
  private async mockSentimentAnalysis(transcription: { 
    text: string; 
    segments: TranscriptionSegment[] 
  }): Promise<{
    overall: SentimentScore;
    segments: Array<{
      text: string;
      startTime: number;
      endTime: number;
      sentiment: SentimentScore;
    }>;
  }> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 400));

    // Analyze overall sentiment
    const overallSentimentScore = this.analyzeSentimentFromText(transcription.text);
    const overallSentiment = this.convertToSentimentScore(overallSentimentScore);
    
    // Analyze segment-level sentiment
    const segmentSentiments = transcription.segments.map(segment => ({
      text: segment.text,
      startTime: segment.startTime,
      endTime: segment.endTime,
      sentiment: this.convertToSentimentScore(this.analyzeSentimentFromText(segment.text))
    }));

    return {
      overall: overallSentiment,
      segments: segmentSentiments
    };
  }

  /**
   * Convert numeric sentiment score to SentimentScore format
   */
  private convertToSentimentScore(score: number): SentimentScore {
    let sentiment: 'positive' | 'neutral' | 'negative';
    if (score > 0.1) sentiment = 'positive';
    else if (score < -0.1) sentiment = 'negative';
    else sentiment = 'neutral';

    return {
      sentiment,
      score: Math.max(-1, Math.min(1, score)), // Clamp to -1 to 1
      magnitude: Math.abs(score)
    };
  }

  /**
   * Analyze sentiment from text using lexicon approach
   */
  private analyzeSentimentFromText(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let totalScore = 0;
    let scoreCount = 0;

    for (const word of words) {
      const cleanWord = word.replace(/[^\w]/g, ''); // Remove punctuation
      if (this.sentimentWords[cleanWord] !== undefined) {
        totalScore += this.sentimentWords[cleanWord];
        scoreCount++;
      }
    }

    // Return average sentiment or neutral if no sentiment words found
    return scoreCount > 0 ? totalScore / scoreCount : 0;
  }

  /**
   * Extract emotional markers from text
   */
  private extractEmotions(text: string): string[] {
    const lowerText = text.toLowerCase();
    const detectedEmotions: string[] = [];

    for (const [emotion, markers] of Object.entries(this.emotionalMarkers)) {
      for (const marker of markers) {
        if (lowerText.includes(marker)) {
          if (!detectedEmotions.includes(emotion)) {
            detectedEmotions.push(emotion);
          }
          break;
        }
      }
    }

    return detectedEmotions;
  }

  /**
   * Calculate confidence in sentiment analysis
   */
  private calculateSentimentConfidence(
    text: string, 
    segmentSentiments: Array<{ sentiment: SentimentScore }>
  ): number {
    let confidence = 0.5; // Base confidence

    // Text length factor (more text = higher confidence)
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 100) confidence += 0.2;
    else if (wordCount > 50) confidence += 0.1;
    else if (wordCount < 10) confidence -= 0.2;

    // Sentiment word coverage
    const words = text.toLowerCase().split(/\s+/);
    const sentimentWordCount = words.filter(word => 
      this.sentimentWords[word.replace(/[^\w]/g, '')] !== undefined
    ).length;
    const coverage = sentimentWordCount / words.length;
    confidence += coverage * 0.3;

    // Consistency across segments
    if (segmentSentiments.length > 1) {
      const sentimentValues = segmentSentiments.map(s => s.sentiment.score);
      const variance = this.calculateVariance(sentimentValues);
      confidence += (1 - Math.min(1, variance)) * 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculate variance for sentiment consistency
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    
    return variance;
  }

  /**
   * Interpret sentiment score
   */
  public interpretSentiment(score: number): {
    label: string;
    description: string;
    intensity: 'low' | 'medium' | 'high';
  } {
    const absScore = Math.abs(score);
    const intensity: 'low' | 'medium' | 'high' = 
      absScore < 0.3 ? 'low' : 
      absScore < 0.7 ? 'medium' : 'high';

    if (score > 0.7) {
      return { label: 'Very Positive', description: 'Highly positive sentiment expressed', intensity };
    } else if (score > 0.3) {
      return { label: 'Positive', description: 'Generally positive sentiment', intensity };
    } else if (score > 0.1) {
      return { label: 'Slightly Positive', description: 'Mildly positive sentiment', intensity };
    } else if (score > -0.1) {
      return { label: 'Neutral', description: 'Neutral or balanced sentiment', intensity };
    } else if (score > -0.3) {
      return { label: 'Slightly Negative', description: 'Mildly negative sentiment', intensity };
    } else if (score > -0.7) {
      return { label: 'Negative', description: 'Generally negative sentiment', intensity };
    } else {
      return { label: 'Very Negative', description: 'Highly negative sentiment expressed', intensity };
    }
  }

  /**
   * Generate sentiment summary
   */
  public generateSentimentSummary(sentiment: SentimentScore, confidence?: number, emotions?: string[]): string {
    const interpretation = this.interpretSentiment(sentiment.score);
    const emotionText = emotions && emotions.length > 0 
      ? ` with ${emotions.join(', ')} emotions detected` 
      : '';

    return `${interpretation.label} sentiment (${Math.round((confidence || sentiment.magnitude) * 100)}% confidence)${emotionText}.`;
  }

  /**
   * Analyze sentiment trends over time
   */
  public analyzeSentimentTrends(segments: Array<{ start: number; sentiment: number }>): {
    trend: 'improving' | 'declining' | 'stable' | 'volatile';
    changeRate: number;
    trendConfidence: number;
  } {
    if (segments.length < 3) {
      return { trend: 'stable', changeRate: 0, trendConfidence: 0 };
    }

    // Calculate linear trend
    const n = segments.length;
    const sumX = segments.reduce((sum, _, i) => sum + i, 0);
    const sumY = segments.reduce((sum, seg) => sum + seg.sentiment, 0);
    const sumXY = segments.reduce((sum, seg, i) => sum + i * seg.sentiment, 0);
    const sumXX = segments.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const changeRate = slope;

    // Determine trend
    let trend: 'improving' | 'declining' | 'stable' | 'volatile';
    if (Math.abs(slope) < 0.01) {
      trend = 'stable';
    } else if (slope > 0.05) {
      trend = 'improving';
    } else if (slope < -0.05) {
      trend = 'declining';
    } else {
      // Check for volatility
      const variance = this.calculateVariance(segments.map(s => s.sentiment));
      trend = variance > 0.5 ? 'volatile' : 'stable';
    }

    // Calculate trend confidence based on R-squared
    const meanY = sumY / n;
    const ssRes = segments.reduce((sum, seg, i) => {
      const predicted = meanY + slope * (i - (n - 1) / 2);
      return sum + Math.pow(seg.sentiment - predicted, 2);
    }, 0);
    const ssTot = segments.reduce((sum, seg) => sum + Math.pow(seg.sentiment - meanY, 2), 0);
    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
    const trendConfidence = Math.max(0, Math.min(1, rSquared));

    return { trend, changeRate, trendConfidence };
  }
}
