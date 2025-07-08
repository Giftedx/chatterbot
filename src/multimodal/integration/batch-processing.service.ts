/**
 * Multimodal Batch Processing Service
 * Handles batch processing of multiple multimodal files
 */

import {
  MediaFile,
  FileProcessingOptions,
  BatchProcessingResult
} from '../types.js';
import { FileIntelligenceService } from '../file-intelligence.service.js';
import { logger } from '../../utils/logger.js';

export class MultimodalBatchProcessingService {
  private readonly fileIntelligenceService: FileIntelligenceService;
  
  constructor() {
    this.fileIntelligenceService = new FileIntelligenceService();
  }

  /**
   * Process multiple files in batch with intelligent relationship detection
   */
  async processBatch(
    mediaFiles: MediaFile[],
    options: FileProcessingOptions = {}
  ): Promise<BatchProcessingResult> {
    try {
      const startTime = Date.now();

      logger.info('Starting batch multimodal processing', {
        operation: 'batch-processing',
        metadata: {
          fileCount: mediaFiles.length,
          fileTypes: [...new Set(mediaFiles.map(f => f.fileType))],
          userId: mediaFiles[0]?.userId
        }
      });

      const batchResult: BatchProcessingResult = {
        batchId: `batch_${Date.now()}`,
        totalFiles: mediaFiles.length,
        processedFiles: 0,
        failedFiles: 0,
        startedAt: new Date(startTime),
        fileResults: [],
        crossModalInsights: [],
        unifiedAnalysis: {},
        batchMetadata: {},
        totalInsights: 0
      };

      // Process files in parallel with concurrency limit
      const concurrencyLimit = 3;
      const chunks = this.chunkArray(mediaFiles, concurrencyLimit);
      
      for (const chunk of chunks) {
        const chunkPromises = chunk.map(async (file) => {
          try {
            const result = await this.fileIntelligenceService.processFile(file, options);
            if (result) {
              batchResult.fileResults.push(result);
              batchResult.processedFiles++;
            } else {
              batchResult.failedFiles++;
            }
            return result;
          } catch (error) {
            logger.error('File processing failed in batch', {
              operation: 'batch-file-processing',
              metadata: {
                fileId: file.id,
                fileName: file.originalName,
                error: String(error)
              }
            });
            batchResult.failedFiles++;
            return null;
          }
        });

        await Promise.all(chunkPromises);
      }

      // Finalize batch processing
      const processingTime = Date.now() - startTime;
      batchResult.completedAt = new Date();
      batchResult.processingTimeMs = processingTime;
      batchResult.status = batchResult.processedFiles > 0 ? 'completed' : 'failed';

      logger.info('Batch multimodal processing completed', {
        operation: 'batch-processing',
        metadata: {
          batchId: batchResult.batchId,
          processedFiles: batchResult.processedFiles,
          failedFiles: batchResult.failedFiles,
          processingTime,
          crossModalInsightCount: batchResult.crossModalInsights.length
        }
      });

      return batchResult;

    } catch (error) {
      logger.error('Batch processing failed', {
        operation: 'batch-processing',
        metadata: {
          fileCount: mediaFiles.length,
          error: String(error)
        }
      });

      return {
        batchId: `batch_error_${Date.now()}`,
        totalFiles: mediaFiles.length,
        processedFiles: 0,
        failedFiles: mediaFiles.length,
        startedAt: new Date(),
        status: 'failed',
        error: String(error),
        fileResults: [],
        crossModalInsights: [],
        unifiedAnalysis: {},
        batchMetadata: {},
        totalInsights: 0
      };
    }
  }

  /**
   * Split array into chunks for concurrent processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Calculate processing confidence based on batch results
   */
  calculateBatchConfidence(batchResult: BatchProcessingResult): Record<string, number> {
    const successRate = batchResult.processedFiles / batchResult.totalFiles;
    const hasInsights = batchResult.crossModalInsights.length > 0;
    
    return {
      overall: successRate * (hasInsights ? 1.0 : 0.8),
      successRate,
      hasInsights: hasInsights ? 1.0 : 0.0
    };
  }
}
