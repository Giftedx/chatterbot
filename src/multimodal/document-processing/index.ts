/**
 * Document Processing Service - Main Orchestrator
 * Modularized version that coordinates all document processing capabilities
 */

import {
  MediaFile,
  DocumentAnalysisResult,
  DocumentProcessingOptions,
  DocumentMetadata,
  ProcessingStatus,
  DocumentSearchOptions,
  DocumentValidationResult,
  FileProcessingOptions,
  AdvancedAnalyticsResult,
  DOCUMENT_PROCESSING_CONFIG
} from './types.js';

// Import modular services
import { DocumentTextExtractionService } from './text-extraction.service.js';
import { DocumentStructureAnalysisService } from './structure-analysis.service.js';
import { DocumentClassificationService } from './classification.service.js';
import { DocumentContentAnalysisService } from './content-analysis.service.js';
import { DocumentDatabaseService } from './database.service.js';

import { logger } from '../../utils/logger.js';

/**
 * Comprehensive Document Processing Service
 * Handles text extraction, structure analysis, classification, and content intelligence
 */
export class DocumentProcessingService {
  
  // Modular services
  private textExtractionService: DocumentTextExtractionService;
  private structureAnalysisService: DocumentStructureAnalysisService;
  private classificationService: DocumentClassificationService;
  private contentAnalysisService: DocumentContentAnalysisService;
  private databaseService: DocumentDatabaseService;
  
  // Configuration
  private readonly supportedFormats = DOCUMENT_PROCESSING_CONFIG.SUPPORTED_FORMATS;
  private readonly maxFileSize = DOCUMENT_PROCESSING_CONFIG.MAX_FILE_SIZE;

  constructor() {
    this.textExtractionService = new DocumentTextExtractionService();
    this.structureAnalysisService = new DocumentStructureAnalysisService();
    this.classificationService = new DocumentClassificationService();
    this.contentAnalysisService = new DocumentContentAnalysisService();
    this.databaseService = new DocumentDatabaseService();
  }

  /**
   * Process document and extract comprehensive analysis
   */
  public async processDocument(
    mediaFile: MediaFile,
    options: DocumentProcessingOptions = {}
  ): Promise<DocumentAnalysisResult | null> {
    try {
      const startTime = Date.now();

      // Validate document file
      const validation = this.validateDocumentFile(mediaFile);
      if (!validation.isValid) {
        logger.warn('Document validation failed', {
          operation: 'document-processing',
          metadata: {
            fileId: mediaFile.id,
            errors: validation.errors,
            warnings: validation.warnings
          }
        });
        return null;
      }

      // Update processing status
      await this.databaseService.updateProcessingStatus(mediaFile.id, 'processing');

      const analysisResult: DocumentAnalysisResult = {};

      // Extract document metadata
      const documentMetadata = await this.extractDocumentMetadata(mediaFile);
      
      // Extract text content
      if (options.enableTextExtraction !== false) {
        const textResult = await this.textExtractionService.extractTextContent(mediaFile);
        if (textResult) {
          analysisResult.textContent = textResult;
        }
      }

      // Analyze document structure
      if (options.enableStructureAnalysis !== false && analysisResult.textContent) {
        const structureResult = await this.structureAnalysisService.analyzeDocumentStructure(
          mediaFile, 
          analysisResult.textContent
        );
        if (structureResult) {
          analysisResult.structure = structureResult;
        }
      }

      // Classify document type and content
      analysisResult.classification = await this.classificationService.classifyDocument(
        mediaFile, 
        analysisResult.textContent
      );

      // Extract key information
      if (options.enableKeywordExtraction !== false && analysisResult.textContent) {
        const keyInfoResult = await this.contentAnalysisService.extractKeyInformation(
          analysisResult.textContent
        );
        if (keyInfoResult) {
          analysisResult.keyInformation = keyInfoResult;
        }
      }

      // Assess content quality and readability
      if (analysisResult.textContent) {
        analysisResult.qualityMetrics = await this.contentAnalysisService.assessContentQuality(
          analysisResult.textContent
        );
      }

      // Generate summary if content exists
      if (options.enableSummarization !== false && analysisResult.textContent) {
        const summaryResult = await this.contentAnalysisService.generateDocumentSummary(
          analysisResult.textContent
        );
        if (summaryResult) {
          analysisResult.summary = summaryResult;
        }
      }

      // Generate description and extract tags
      const description = this.generateDocumentDescription(analysisResult, documentMetadata);
      const categoryData = this.classificationService.detectCategories(
        mediaFile, 
        analysisResult.textContent, 
        analysisResult.classification
      );

      // Update media file with analysis results
      await this.databaseService.updateMediaFileWithAnalysis(mediaFile.id, {
        documentAnalysis: analysisResult,
        documentMetadata,
        extractedText: analysisResult.textContent?.fullText,
        description,
        tags: categoryData.tags,
        categories: categoryData.categories,
        processingStatus: 'completed',
        processedAt: new Date()
      });

      const processingTime = Date.now() - startTime;

      logger.info('Document processing completed', {
        operation: 'document-processing',
        userId: mediaFile.userId,
        metadata: {
          fileId: mediaFile.id,
          documentType: analysisResult.classification?.documentType,
          textLength: analysisResult.textContent?.fullText?.length || 0,
          pageCount: documentMetadata?.pageCount || 0,
          wordCount: analysisResult.textContent?.wordCount || 0,
          processingTime
        }
      });

      return analysisResult;

    } catch (error) {
      logger.error('Failed to process document', {
        operation: 'document-processing',
        metadata: {
          fileId: mediaFile.id,
          error: String(error)
        }
      });

      await this.databaseService.updateProcessingStatus(mediaFile.id, 'failed', String(error));
      return null;
    }
  }

  /**
   * Validate document file before processing
   */
  public validateDocumentFile(mediaFile: MediaFile): DocumentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file type
    if (mediaFile.fileType !== 'document') {
      errors.push('File type must be document');
    }

    // Check supported format
    const supportedFormat = this.supportedFormats.has(mediaFile.mimeType);
    if (!supportedFormat) {
      errors.push(`Unsupported format: ${mediaFile.mimeType}`);
    }

    // Check file size
    const sizeWithinLimit = mediaFile.fileSize <= this.maxFileSize;
    if (!sizeWithinLimit) {
      errors.push(`File size exceeds limit: ${mediaFile.fileSize} > ${this.maxFileSize}`);
    }

    // Warnings for edge cases
    if (mediaFile.fileSize < 1024) { // Less than 1KB
      warnings.push('File is very small and may not contain substantial content');
    }

    if (mediaFile.fileSize > this.maxFileSize * 0.8) { // 80% of max size
      warnings.push('File is large and may take longer to process');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      supportedFormat,
      sizeWithinLimit
    };
  }

  /**
   * Search documents by content
   */
  public async searchDocumentsByContent(
    query: string,
    userId: string,
    options: DocumentSearchOptions = {}
  ): Promise<MediaFile[]> {
    try {
      return await this.databaseService.searchDocumentsByContent(query, userId, options);
    } catch (error) {
      logger.error('Failed to search documents', {
        operation: 'document-search',
        metadata: { userId, query, error: String(error) }
      });
      return [];
    }
  }

  /**
   * Get processing statistics for a user
   */
  public async getProcessingStatistics(userId: string) {
    try {
      return await this.databaseService.getProcessingStatistics(userId);
    } catch (error) {
      logger.error('Failed to get processing statistics', {
        operation: 'statistics',
        metadata: { userId, error: String(error) }
      });
      return null;
    }
  }

  /**
   * Find similar documents
   */
  public async findSimilarDocuments(
    fileId: number,
    userId: string,
    limit: number = 5
  ): Promise<Array<MediaFile & { similarity: number }>> {
    try {
      return await this.databaseService.findSimilarDocuments(fileId, userId, limit);
    } catch (error) {
      logger.error('Failed to find similar documents', {
        operation: 'similarity-search',
        metadata: { fileId, userId, error: String(error) }
      });
      return [];
    }
  }

  /**
   * Get processing history
   */
  public async getProcessingHistory(
    userId: string,
    options: { limit?: number; status?: ProcessingStatus; dateFrom?: Date; dateTo?: Date } = {}
  ) {
    try {
      return await this.databaseService.getProcessingHistory(userId, options);
    } catch (error) {
      logger.error('Failed to get processing history', {
        operation: 'history',
        metadata: { userId, error: String(error) }
      });
      return [];
    }
  }

  /**
   * Batch process multiple documents
   */
  public async batchProcessDocuments(
    mediaFiles: MediaFile[],
    options: FileProcessingOptions = {}
  ): Promise<{ 
    processed: DocumentAnalysisResult[]; 
    failed: Array<{ fileId: number; error: string }> 
  }> {
    try {
      const processed: DocumentAnalysisResult[] = [];
      const failed: Array<{ fileId: number; error: string }> = [];

      // Process in parallel with concurrency limit
      const CONCURRENT_LIMIT = 3;
      const chunks: MediaFile[][] = [];
      
      for (let i = 0; i < mediaFiles.length; i += CONCURRENT_LIMIT) {
        chunks.push(mediaFiles.slice(i, i + CONCURRENT_LIMIT));
      }

      for (const chunk of chunks) {
        const promises = chunk.map(async (mediaFile) => {
          try {
            const result = await this.processDocument(mediaFile, options);
            if (result) {
              processed.push(result);
            } else {
              failed.push({ fileId: mediaFile.id, error: 'Processing returned null' });
            }
          } catch (error) {
            failed.push({ fileId: mediaFile.id, error: String(error) });
          }
        });

        await Promise.all(promises);
      }

      logger.info('Batch processing completed', {
        operation: 'batch-processing',
        metadata: {
          totalFiles: mediaFiles.length,
          processed: processed.length,
          failed: failed.length
        }
      });

      return { processed, failed };

    } catch (error) {
      logger.error('Batch processing failed', {
        operation: 'batch-processing',
        metadata: { 
          fileCount: mediaFiles.length, 
          error: String(error) 
        }
      });

      return { 
        processed: [], 
        failed: mediaFiles.map(f => ({ fileId: f.id, error: String(error) }))
      };
    }
  }

  /**
   * Extract advanced analytics from document
   */
  public async extractAdvancedAnalytics(mediaFile: MediaFile): Promise<AdvancedAnalyticsResult | null> {
    try {
      const textContent = await this.textExtractionService.extractTextContent(mediaFile);
      if (!textContent) return null;

      const [
        advancedAnalytics,
        semanticConcepts,
        structureAnalysis
      ] = await Promise.all([
        this.contentAnalysisService.performAdvancedAnalytics(textContent.fullText),
        this.contentAnalysisService.extractSemanticConcepts(textContent.fullText),
        this.structureAnalysisService.analyzeHierarchy(
          this.structureAnalysisService.extractSections(textContent.fullText)
        )
      ]);

      return {
        advancedAnalytics,
        semanticConcepts,
        structureAnalysis,
        textMetrics: {
          wordCount: textContent.wordCount,
          characterCount: textContent.characterCount,
          paragraphCount: textContent.paragraphCount,
          pageCount: textContent.pageCount
        }
      };

    } catch (error) {
      logger.error('Failed to extract advanced analytics', {
        operation: 'advanced-analytics',
        metadata: { fileId: mediaFile.id, error: String(error) }
      });
      return null;
    }
  }

  /**
   * Re-process document with new options
   */
  public async reprocessDocument(
    fileId: number
  ): Promise<DocumentAnalysisResult | null> {
    try {
      // Retrieve existing media file
      const existing = await this.databaseService.getMediaFileById(fileId);
      if (!existing) {
        await this.databaseService.updateProcessingStatus(fileId, 'failed', 'Media file not found');
        return null;
      }

      // Only documents are supported here
      if (existing.fileType !== 'document') {
        await this.databaseService.updateProcessingStatus(fileId, 'failed', 'Reprocessing supported only for document files');
        return null;
      }

      // Reset status before processing
      await this.databaseService.updateProcessingStatus(fileId, 'processing');

      // Re-run full document processing with defaults
      const result = await this.processDocument(existing, { ...DOCUMENT_PROCESSING_CONFIG.DEFAULT_OPTIONS });
      return result;

    } catch (error) {
      logger.error('Failed to reprocess document', {
        operation: 'reprocessing',
        metadata: { fileId, error: String(error) }
      });
      await this.databaseService.updateProcessingStatus(fileId, 'failed', String(error));
      return null;
    }
  }

  /**
   * Get supported formats
   */
  public getSupportedFormats(): string[] {
    return Array.from(this.supportedFormats);
  }

  /**
   * Get processing configuration
   */
  public getProcessingConfig() {
    return {
      maxFileSize: this.maxFileSize,
      supportedFormats: this.getSupportedFormats(),
      defaultOptions: DOCUMENT_PROCESSING_CONFIG.DEFAULT_OPTIONS
    };
  }

  // Private helper methods

  private async extractDocumentMetadata(mediaFile: MediaFile): Promise<DocumentMetadata | null> {
    try {
      // Extract basic metadata from file
      const metadata: DocumentMetadata = {
        format: this.textExtractionService.getDocumentFormat(mediaFile.mimeType)
      };

      // Add estimated page count based on file size and type
      if (mediaFile.mimeType === 'application/pdf') {
        // Rough estimation: 50KB per page for PDF
        metadata.pageCount = Math.max(1, Math.ceil(mediaFile.fileSize / 51200));
      } else {
        // For other formats, estimate based on content length after extraction
        metadata.pageCount = 1;
      }

      return metadata;

    } catch (error) {
      logger.error('Failed to extract document metadata', {
        operation: 'metadata-extraction',
        metadata: { fileId: mediaFile.id, error: String(error) }
      });
      return null;
    }
  }

  private generateDocumentDescription(
    analysisResult: DocumentAnalysisResult,
    documentMetadata: DocumentMetadata | null
  ): string {
    try {
      const parts: string[] = [];

      // Add format and basic info
      if (documentMetadata) {
        parts.push(`${documentMetadata.format} document`);
        if (documentMetadata.pageCount && documentMetadata.pageCount > 1) {
          parts.push(`with ${documentMetadata.pageCount} pages`);
        }
      }

      // Add document type from classification
      if (analysisResult.classification?.documentType) {
        parts.push(`classified as ${analysisResult.classification.documentType}`);
      }

      // Add content summary
      if (analysisResult.summary) {
        parts.push(`Summary: ${analysisResult.summary}`);
      } else if (analysisResult.textContent) {
        // Generate brief summary from first sentence
        const firstSentence = analysisResult.textContent.fullText
          .split(/[.!?]/)
          .filter(s => s.trim().length > 0)[0];
        if (firstSentence && firstSentence.length > 10) {
          parts.push(`Content: ${firstSentence.trim()}...`);
        }
      }

      // Add quality indicator
      if (analysisResult.qualityMetrics?.overallQuality) {
        parts.push(`Quality: ${analysisResult.qualityMetrics.overallQuality}`);
      }

      return parts.join('. ');

    } catch (error) {
      logger.error('Failed to generate document description', {
        operation: 'description-generation',
        error: String(error)
      });
      return 'Processed document';
    }
  }
}
