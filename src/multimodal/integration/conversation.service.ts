/**
 * Multimodal Conversation Context Service
 * Handles conversation-level multimodal processing and context generation
 */

import {
  MediaFile,
  FileProcessingOptions,
  ConversationContext,
  BatchProcessingResult
} from '../types.js';
import { MultimodalBatchProcessingService } from './batch-processing.service.js';
import { MultimodalAnalysisService } from './analysis-simplified.service.js';
import { logger } from '../../utils/logger.js';

export class MultimodalConversationService {
  private batchProcessingService: MultimodalBatchProcessingService;
  private analysisService: MultimodalAnalysisService;
  
  constructor() {
    this.batchProcessingService = new MultimodalBatchProcessingService();
    this.analysisService = new MultimodalAnalysisService();
  }

  /**
   * Process conversation with multimodal context awareness
   */
  async processConversationContext(
    conversationId: string,
    mediaFiles: MediaFile[],
    conversationText?: string,
    options: FileProcessingOptions = {}
  ): Promise<ConversationContext> {
    try {
      logger.info('Processing conversation context', {
        operation: 'conversation-context',
        metadata: {
          conversationId,
          fileCount: mediaFiles.length,
          hasText: !!conversationText
        }
      });

      // Process all media files
      const batchResult = await this.batchProcessingService.processBatch(mediaFiles, options);

      // Create conversation context
      const context: ConversationContext = {
        conversationId,
        processedAt: new Date(),
        mediaFiles: mediaFiles.map(file => ({
          id: file.id,
          type: file.fileType,
          name: file.originalName,
          mimeType: file.mimeType
        })),
        textContent: conversationText,
        multimodalAnalysis: await this.analysisService.generateUnifiedAnalysis(batchResult.fileResults),
        crossModalInsights: batchResult.crossModalInsights,
        conversationSummary: await this.analysisService.generateConversationSummary(batchResult, conversationText),
        topicDetection: await this.detectConversationTopics(batchResult, conversationText),
        entityMentions: await this.extractConversationEntities(batchResult, conversationText),
        sentimentAnalysis: await this.analyzeConversationSentiment(batchResult, conversationText),
        actionableItems: await this.extractActionableItems(batchResult, conversationText),
        confidenceScores: this.analysisService.calculateContextConfidence(batchResult)
      };

      return context;

    } catch (error) {
      logger.error('Conversation context processing failed', {
        operation: 'conversation-context',
        metadata: {
          conversationId,
          error: String(error)
        }
      });

      return {
        conversationId,
        processedAt: new Date(),
        mediaFiles: [],
        multimodalAnalysis: {},
        crossModalInsights: [],
        error: String(error),
        confidenceScores: { overall: 0 }
      };
    }
  }

  private async detectConversationTopics(batchResult: BatchProcessingResult, conversationText?: string): Promise<string[]> {
    const topics = new Set<string>();
    
    // Add basic topics based on file types
    const fileTypes = [...new Set(batchResult.fileResults.map(r => r.fileType))];
    fileTypes.forEach(type => topics.add(`${type}_content`));
    
    // Extract simple topics from text if available
    if (conversationText) {
      const words = conversationText.toLowerCase().split(/\W+/);
      const significantWords = words.filter(w => w.length > 4);
      significantWords.slice(0, 3).forEach(word => topics.add(word));
    }
    
    return Array.from(topics).slice(0, 10);
  }

  private async extractConversationEntities(batchResult: BatchProcessingResult, conversationText?: string): Promise<Array<{ entity: string; type: string; confidence: number }>> {
    const entities: Array<{ entity: string; type: string; confidence: number }> = [];
    
    // Add file-based entities
    batchResult.fileResults.forEach(result => {
      entities.push({
        entity: `file_${result.fileId}`,
        type: result.fileType,
        confidence: 0.8
      });
    });
    
    return entities.slice(0, 20);
  }

  private async analyzeConversationSentiment(batchResult: BatchProcessingResult, conversationText?: string): Promise<{ overall: string; confidence: number; details?: Record<string, unknown> }> {
    // Simplified sentiment analysis
    let sentiment = 'neutral';
    let confidence = 0.6;
    
    if (conversationText) {
      const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful'];
      const negativeWords = ['bad', 'terrible', 'awful', 'horrible'];
      
      const words = conversationText.toLowerCase().split(/\W+/);
      const positiveCount = words.filter(w => positiveWords.includes(w)).length;
      const negativeCount = words.filter(w => negativeWords.includes(w)).length;
      
      if (positiveCount > negativeCount) {
        sentiment = 'positive';
        confidence = 0.7;
      } else if (negativeCount > positiveCount) {
        sentiment = 'negative';
        confidence = 0.7;
      }
    }
    
    return {
      overall: sentiment,
      confidence,
      details: {
        fileCount: batchResult.fileResults.length,
        hasText: !!conversationText
      }
    };
  }

  private async extractActionableItems(batchResult: BatchProcessingResult, conversationText?: string): Promise<string[]> {
    const actions: string[] = [];
    
    if (batchResult.failedFiles > 0) {
      actions.push(`Review ${batchResult.failedFiles} failed file(s)`);
    }
    
    if (conversationText && conversationText.toLowerCase().includes('todo')) {
      actions.push('Follow up on mentioned tasks');
    }
    
    return actions;
  }
}
