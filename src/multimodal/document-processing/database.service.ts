/**
 * Database Service
 * Handles all database operations for document processing
 */

import { MediaFile, ProcessingStatus, DocumentProcessingUpdate, DocumentSearchOptions } from './types.js';
import { prisma } from '../../db/prisma.js';
import { logger } from '../../utils/logger.js';

export class DocumentDatabaseService {

  /**
   * Update media file processing status
   */
  async updateProcessingStatus(
    fileId: number,
    status: ProcessingStatus,
    error?: string
  ): Promise<void> {
    try {
      await prisma.mediaFile.update({
        where: { id: fileId },
        data: {
          processingStatus: status,
          processingError: error,
          processedAt: status === 'completed' || status === 'failed' ? new Date() : undefined
        }
      });

      logger.info('Processing status updated', {
        operation: 'status-update',
        metadata: { fileId, status, hasError: !!error }
      });

    } catch (updateError) {
      logger.error('Failed to update processing status', {
        operation: 'status-update',
        metadata: {
          fileId,
          status,
          error: String(updateError)
        }
      });
      throw updateError;
    }
  }

  /**
   * Update media file with comprehensive analysis results
   */
  async updateMediaFileWithAnalysis(
    fileId: number,
    updates: DocumentProcessingUpdate
  ): Promise<void> {
    try {
      await prisma.mediaFile.update({
        where: { id: fileId },
        data: {
          documentMetadata: updates.documentMetadata as any,
          extractedText: updates.extractedText,
          description: updates.description,
          tags: JSON.stringify(updates.tags),
          categories: JSON.stringify(updates.categories),
          processingStatus: updates.processingStatus,
          processedAt: updates.processedAt
        }
      });

      logger.info('Media file updated with analysis results', {
        operation: 'analysis-update',
        metadata: {
          fileId,
          hasMetadata: !!updates.documentMetadata,
          hasExtractedText: !!updates.extractedText,
          tagCount: updates.tags.length,
          categoryCount: updates.categories.length
        }
      });

    } catch (updateError) {
      logger.error('Failed to update media file with analysis', {
        operation: 'analysis-update',
        metadata: {
          fileId,
          error: String(updateError)
        }
      });
      throw updateError;
    }
  }

  /**
   * Search documents by content with advanced options
   */
  async searchDocumentsByContent(
    query: string,
    userId: string,
    options: DocumentSearchOptions = {}
  ): Promise<MediaFile[]> {
    try {
      const {
        limit = 10,
        documentType,
        contentType,
        categories = [],
        sortBy = 'date',
        sortOrder = 'desc'
      } = options;

      // Build where conditions
      const whereConditions: any = {
        userId,
        fileType: 'document',
        processingStatus: 'completed',
        OR: [
          { description: { contains: query } },
          { extractedText: { contains: query } },
          { tags: { contains: query } }
        ]
      };

      // Add document type filter
      if (documentType) {
        whereConditions.documentMetadata = {
          path: ['documentType'],
          equals: documentType
        };
      }

      // Add content type filter
      if (contentType) {
        whereConditions.documentMetadata = {
          ...whereConditions.documentMetadata,
          path: ['contentType'],
          equals: contentType
        };
      }

      // Add category filters
      if (categories.length > 0) {
        whereConditions.AND = categories.map(category => ({
          categories: { contains: category }
        }));
      }

      // Build order by
      let orderBy: any;
      switch (sortBy) {
        case 'relevance':
          // For relevance, we'll sort by creation date for now
          // In a real implementation, this would use full-text search scoring
          orderBy = { createdAt: sortOrder };
          break;
        case 'size':
          orderBy = { fileSize: sortOrder };
          break;
        case 'date':
        default:
          orderBy = { createdAt: sortOrder };
          break;
      }

      const files = await prisma.mediaFile.findMany({
        where: whereConditions,
        orderBy,
        take: limit
      });

      logger.info('Document search completed', {
        operation: 'document-search',
        metadata: {
          userId,
          query,
          resultCount: files.length,
          documentType,
          contentType,
          categoryCount: categories.length
        }
      });

      return files as unknown as MediaFile[];

    } catch (error) {
      logger.error('Failed to search documents by content', {
        operation: 'document-search',
        metadata: {
          userId,
          query,
          error: String(error)
        }
      });
      return [];
    }
  }

  /**
   * Get processing statistics for a user
   */
  async getProcessingStatistics(userId: string): Promise<{
    totalDocuments: number;
    processingStatus: Record<ProcessingStatus, number>;
    documentTypes: Record<string, number>;
    contentTypes: Record<string, number>;
    averageProcessingTime: number;
    totalSizeProcessed: number;
  }> {
    try {
      // Get total count
      const totalDocuments = await prisma.mediaFile.count({
        where: { userId, fileType: 'document' }
      });

      // Get status breakdown
      const statusCounts = await prisma.mediaFile.groupBy({
        by: ['processingStatus'],
        where: { userId, fileType: 'document' },
        _count: true
      });

      const processingStatus: Record<ProcessingStatus, number> = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0
      };

      statusCounts.forEach(({ processingStatus: status, _count }: any) => {
        if (status) {
          processingStatus[status as ProcessingStatus] = _count;
        }
      });

      // Get documents with metadata for type analysis
      const documentsWithMetadata = await prisma.mediaFile.findMany({
        where: {
          userId,
          fileType: 'document',
          processingStatus: 'completed',
          documentMetadata: { not: {} as any }
        },
        select: {
          documentMetadata: true,
          fileSize: true,
          processedAt: true,
          createdAt: true
        }
      });

      // Analyze document types and content types
      const documentTypes: Record<string, number> = {};
      const contentTypes: Record<string, number> = {};
      let totalSize = 0;
      let totalProcessingTime = 0;
      let processedCount = 0;

      documentsWithMetadata.forEach((doc: any) => {
        if (doc.documentMetadata) {
          const metadata = doc.documentMetadata as any;
          
          // Count document types
          if (metadata.documentType) {
            documentTypes[metadata.documentType] = (documentTypes[metadata.documentType] || 0) + 1;
          }
          
          // Count content types
          if (metadata.contentType) {
            contentTypes[metadata.contentType] = (contentTypes[metadata.contentType] || 0) + 1;
          }
        }

        // Calculate processing time and size
        totalSize += doc.fileSize;
        if (doc.processedAt && doc.createdAt) {
          totalProcessingTime += doc.processedAt.getTime() - doc.createdAt.getTime();
          processedCount++;
        }
      });

      const averageProcessingTime = processedCount > 0 ? totalProcessingTime / processedCount : 0;

      const statistics = {
        totalDocuments,
        processingStatus,
        documentTypes,
        contentTypes,
        averageProcessingTime,
        totalSizeProcessed: totalSize
      };

      logger.info('Processing statistics retrieved', {
        operation: 'statistics-retrieval',
        metadata: {
          userId,
          totalDocuments,
          processedCount,
          averageProcessingTime
        }
      });

      return statistics;

    } catch (error) {
      logger.error('Failed to get processing statistics', {
        operation: 'statistics-retrieval',
        metadata: { userId, error: String(error) }
      });

      // Return empty statistics on error
      return {
        totalDocuments: 0,
        processingStatus: { pending: 0, processing: 0, completed: 0, failed: 0 },
        documentTypes: {},
        contentTypes: {},
        averageProcessingTime: 0,
        totalSizeProcessed: 0
      };
    }
  }

  /**
   * Get similar documents based on content
   */
  async findSimilarDocuments(
    fileId: number,
    userId: string,
    limit: number = 5
  ): Promise<Array<MediaFile & { similarity: number }>> {
    try {
      // Get the reference document
      const referenceDoc = await prisma.mediaFile.findFirst({
        where: { id: fileId, userId, fileType: 'document', processingStatus: 'completed' }
      });

      if (!referenceDoc) {
        logger.warn('Reference document not found for similarity search', {
          operation: 'similarity-search',
          metadata: { fileId, userId }
        });
        return [];
      }

      // Get all other documents for the user
      const otherDocs = await prisma.mediaFile.findMany({
        where: {
          userId,
          fileType: 'document',
          processingStatus: 'completed',
          id: { not: fileId }
        }
      });

      // Calculate similarity scores (simplified implementation)
      const similarDocs = otherDocs
        .map((doc: any) => ({
          ...doc,
          similarity: this.calculateDocumentSimilarity(referenceDoc, doc)
        }))
        .filter((doc: any) => doc.similarity > 0.1)
        .sort((a: any, b: any) => b.similarity - a.similarity)
        .slice(0, limit);

      logger.info('Similar documents found', {
        operation: 'similarity-search',
        metadata: {
          fileId,
          userId,
          similarDocCount: similarDocs.length,
          avgSimilarity: similarDocs.reduce((sum: any, doc: any) => sum + doc.similarity, 0) / similarDocs.length
        }
      });

      return similarDocs as unknown as Array<MediaFile & { similarity: number }>;

    } catch (error) {
      logger.error('Failed to find similar documents', {
        operation: 'similarity-search',
        metadata: { fileId, userId, error: String(error) }
      });
      return [];
    }
  }

  /**
   * Bulk update processing status for multiple files
   */
  async bulkUpdateProcessingStatus(
    fileIds: number[],
    status: ProcessingStatus,
    error?: string
  ): Promise<{ updated: number; failed: number[] }> {
    try {
      const result = await prisma.mediaFile.updateMany({
        where: { id: { in: fileIds } },
        data: {
          processingStatus: status,
          processingError: error,
          processedAt: status === 'completed' || status === 'failed' ? new Date() : undefined
        }
      });

      logger.info('Bulk processing status update completed', {
        operation: 'bulk-status-update',
        metadata: {
          fileIds: fileIds.length,
          status,
          updated: result.count,
          hasError: !!error
        }
      });

      return { updated: result.count, failed: [] };

    } catch (updateError) {
      logger.error('Failed to bulk update processing status', {
        operation: 'bulk-status-update',
        metadata: {
          fileIds: fileIds.length,
          status,
          error: String(updateError)
        }
      });

      return { updated: 0, failed: fileIds };
    }
  }

  /**
   * Get document processing history
   */
  async getProcessingHistory(
    userId: string,
    options: { limit?: number; status?: ProcessingStatus; dateFrom?: Date; dateTo?: Date } = {}
  ): Promise<Array<{
    id: number;
    originalName: string;
    fileSize: number;
    processingStatus: ProcessingStatus;
    createdAt: Date;
    processedAt: Date | null;
    processingError: string | null;
    processingTime?: number;
  }>> {
    try {
      const { limit = 50, status, dateFrom, dateTo } = options;

      const whereConditions: any = {
        userId,
        fileType: 'document'
      };

      if (status) {
        whereConditions.processingStatus = status;
      }

      if (dateFrom || dateTo) {
        whereConditions.createdAt = {};
        if (dateFrom) whereConditions.createdAt.gte = dateFrom;
        if (dateTo) whereConditions.createdAt.lte = dateTo;
      }

      const history = await prisma.mediaFile.findMany({
        where: whereConditions,
        select: {
          id: true,
          originalName: true,
          fileSize: true,
          processingStatus: true,
          createdAt: true,
          processedAt: true,
          processingError: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      const historyWithProcessingTime = history.map(item => ({
        ...item,
        processingTime: item.processedAt && item.createdAt 
          ? item.processedAt.getTime() - item.createdAt.getTime()
          : undefined
      }));

      logger.info('Processing history retrieved', {
        operation: 'history-retrieval',
        metadata: {
          userId,
          itemCount: history.length,
          status,
          dateRange: { dateFrom, dateTo }
        }
      });

      return historyWithProcessingTime as any;

    } catch (error) {
      logger.error('Failed to get processing history', {
        operation: 'history-retrieval',
        metadata: { userId, error: String(error) }
      });
      return [];
    }
  }

  // Private helper methods

  private calculateDocumentSimilarity(doc1: any, doc2: any): number {
    try {
      let similarity = 0;

      // Compare file sizes (normalized)
      const sizeDiff = Math.abs(doc1.fileSize - doc2.fileSize);
      const maxSize = Math.max(doc1.fileSize, doc2.fileSize);
      const sizeScore = maxSize > 0 ? 1 - (sizeDiff / maxSize) : 1;
      similarity += sizeScore * 0.1;

      // Compare tags
      if (doc1.tags && doc2.tags) {
        const tags1 = new Set(JSON.parse(doc1.tags || '[]'));
        const tags2 = new Set(JSON.parse(doc2.tags || '[]'));
        const intersection = new Set([...tags1].filter(x => tags2.has(x)));
        const union = new Set([...tags1, ...tags2]);
        const tagSimilarity = union.size > 0 ? intersection.size / union.size : 0;
        similarity += tagSimilarity * 0.3;
      }

      // Compare categories
      if (doc1.categories && doc2.categories) {
        const categories1 = new Set(JSON.parse(doc1.categories || '[]'));
        const categories2 = new Set(JSON.parse(doc2.categories || '[]'));
        const intersection = new Set([...categories1].filter(x => categories2.has(x)));
        const union = new Set([...categories1, ...categories2]);
        const categorySimilarity = union.size > 0 ? intersection.size / union.size : 0;
        similarity += categorySimilarity * 0.3;
      }

      // Compare extracted text (simplified - would use more sophisticated NLP in practice)
      if (doc1.extractedText && doc2.extractedText) {
        const words1 = new Set(doc1.extractedText.toLowerCase().split(/\s+/));
        const words2 = new Set(doc2.extractedText.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        const textSimilarity = union.size > 0 ? intersection.size / union.size : 0;
        similarity += textSimilarity * 0.3;
      }

      return Math.min(1, similarity);

    } catch (error) {
      logger.error('Failed to calculate document similarity', {
        operation: 'similarity-calculation',
        error: String(error)
      });
      return 0;
    }
  }
}
