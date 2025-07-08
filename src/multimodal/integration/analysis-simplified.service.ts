/**
 * Simplified Multimodal Analysis Service
 * Generates cross-modal insights and unified analysis from processed files
 */

import {
  BatchProcessingResult,
  CrossModalInsight,
  FileIntelligenceResult
} from '../types.js';
import { logger } from '../../utils/logger.js';

export class MultimodalAnalysisService {

  /**
   * Generate batch-level insights from file processing results
   */
  async generateBatchInsights(fileResults: FileIntelligenceResult[]): Promise<CrossModalInsight[]> {
    try {
      const insights: CrossModalInsight[] = [];
      
      // Generate basic insights
      if (fileResults.length > 1) {
        insights.push({
          type: 'batch_processing',
          confidence: 0.8,
          description: `Successfully processed ${fileResults.length} files`,
          sources: fileResults.map((_, i) => `file_${i + 1}`).slice(0, 3),
          metadata: {
            fileCount: fileResults.length,
            types: [...new Set(fileResults.map(r => r.fileType))]
          }
        });
      }
      
      return insights;
    } catch (error) {
      logger.error('Failed to generate batch insights', { error: String(error) });
      return [];
    }
  }

  /**
   * Generate unified analysis from processed files
   */
  async generateUnifiedAnalysis(fileResults: FileIntelligenceResult[]): Promise<Record<string, unknown>> {
    try {
      return {
        totalFiles: fileResults.length,
        fileTypes: [...new Set(fileResults.map(r => r.fileType))],
        successfulProcessing: fileResults.filter(r => r.processingStatus === 'completed').length,
        averageProcessingTime: this.calculateAverageProcessingTime(fileResults),
        summary: `Processed ${fileResults.length} files successfully`
      };
    } catch (error) {
      logger.error('Failed to generate unified analysis', { error: String(error) });
      return {
        error: 'Analysis generation failed',
        totalFiles: fileResults.length
      };
    }
  }

  /**
   * Generate metadata for batch processing results
   */
  async generateBatchMetadata(batchResult: BatchProcessingResult): Promise<Record<string, unknown>> {
    try {
      return {
        processingMethod: 'parallel_batch',
        batchId: batchResult.batchId,
        performance: {
          totalFiles: batchResult.totalFiles,
          processedFiles: batchResult.processedFiles,
          failedFiles: batchResult.failedFiles,
          successRate: batchResult.processedFiles / batchResult.totalFiles,
          processingTime: batchResult.processingTimeMs
        },
        insights: {
          crossModalInsightCount: batchResult.crossModalInsights.length
        }
      };
    } catch (error) {
      logger.error('Failed to generate batch metadata', { error: String(error) });
      return {
        error: 'Metadata generation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate conversation summary from batch results and text
   */
  async generateConversationSummary(batchResult: BatchProcessingResult, conversationText?: string): Promise<string> {
    try {
      const fileCount = batchResult.totalFiles;
      const types = [...new Set(batchResult.fileResults.map(r => r.fileType))];
      
      let summary = `Conversation contains ${fileCount} media files of types: ${types.join(', ')}`;
      
      if (conversationText) {
        summary += `. Additional text context provided.`;
      }
      
      return summary;
    } catch (error) {
      logger.error('Failed to generate conversation summary', { error: String(error) });
      return 'Summary generation failed';
    }
  }

  /**
   * Calculate confidence scores for context
   */
  calculateContextConfidence(batchResult: BatchProcessingResult): Record<string, number> {
    const successRate = batchResult.processedFiles / batchResult.totalFiles;
    return {
      overall: successRate * 0.9,
      processing: successRate,
      insights: batchResult.crossModalInsights.length > 0 ? 0.8 : 0.5
    };
  }

  private calculateAverageProcessingTime(fileResults: FileIntelligenceResult[]): number {
    const times = fileResults
      .map(r => r.processingTimeMs)
      .filter((time): time is number => time !== undefined);
    
    if (times.length === 0) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }
}
