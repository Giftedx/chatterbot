/**
 * Audio Database Service
 * Handles all database operations for audio analysis
 */

import type { 
  MediaFile, 
  AudioAnalysisUpdatePayload, 
  AudioSearchOptions,
  AudioSearchResult,
  ProcessingStatus
} from './types.js';
import { prisma } from '../../db/prisma.js';
import { logger } from '../../utils/logger.js';

/**
 * Service for audio analysis database operations
 */
export class AudioDatabaseService {
  /**
   * Update processing status for a media file
   */
  public async updateProcessingStatus(
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

      logger.debug('Processing status updated', {
        operation: 'audio-db-status-update',
        metadata: {
          fileId,
          status,
          hasError: !!error
        }
      });

    } catch (error) {
      logger.error('Failed to update processing status', {
        operation: 'audio-db-status-update',
        metadata: {
          fileId,
          status,
          error: String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Update media file with analysis results
   */
  public async updateMediaFileWithAnalysis(
    fileId: number,
    updates: AudioAnalysisUpdatePayload
  ): Promise<void> {
    try {
      const updateData: any = {};

      // Convert analysis results to JSON-compatible format
      if (updates.audioAnalysis) {
        updateData.audioAnalysis = JSON.parse(JSON.stringify(updates.audioAnalysis));
      }

      if (updates.audioMetadata) {
        updateData.audioMetadata = JSON.parse(JSON.stringify(updates.audioMetadata));
      }

      if (updates.extractedText) {
        updateData.extractedText = updates.extractedText;
      }

      if (updates.description) {
        updateData.description = updates.description;
      }

      if (updates.tags) {
        updateData.tags = JSON.stringify(updates.tags);
      }

      await prisma.mediaFile.update({
        where: { id: fileId },
        data: updateData
      });

      logger.debug('Media file updated with analysis', {
        operation: 'audio-db-update',
        metadata: {
          fileId,
          hasAudioAnalysis: !!updates.audioAnalysis,
          hasMetadata: !!updates.audioMetadata,
          hasText: !!updates.extractedText
        }
      });

    } catch (error) {
      logger.error('Failed to update media file with analysis', {
        operation: 'audio-db-update',
        metadata: {
          fileId,
          error: String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Search audio files by content
   */
  public async searchAudioByContent(options: AudioSearchOptions): Promise<AudioSearchResult[]> {
    try {
      const {
        query,
        userId,
        includeTranscription = true,
        limit = 20,
        offset = 0
      } = options;

      logger.info('Starting audio content search', {
        operation: 'audio-search',
        metadata: {
          userId,
          query: query.substring(0, 50),
          limit,
          offset
        }
      });

      // Build search query
      const whereClause: any = {
        userId,
        fileType: 'audio',
        processingStatus: 'completed',
        OR: [
          { description: { contains: query, mode: 'insensitive' } },
          { extractedText: { contains: query, mode: 'insensitive' } },
          { originalName: { contains: query, mode: 'insensitive' } }
        ]
      };

      // Execute search
      const files = await prisma.mediaFile.findMany({
        where: whereClause,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' }
      });

      // Convert to search results with relevance scoring
      const searchResults: AudioSearchResult[] = files.map(file => {
        const relevanceScore = this.calculateRelevanceScore(file, query);
        
        return {
          file: file as unknown as MediaFile, // Type conversion for compatibility
          relevanceScore,
          matchedSegments: includeTranscription ? this.extractMatchedSegments(file, query) : undefined,
          highlightedText: this.generateHighlightedText(file, query)
        };
      });

      // Sort by relevance score
      searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

      logger.info('Audio content search completed', {
        operation: 'audio-search',
        metadata: {
          userId,
          resultCount: searchResults.length,
          avgRelevance: searchResults.length > 0 
            ? searchResults.reduce((sum, r) => sum + r.relevanceScore, 0) / searchResults.length 
            : 0
        }
      });

      return searchResults;

    } catch (error) {
      logger.error('Audio content search failed', {
        operation: 'audio-search',
        metadata: {
          userId: options.userId,
          error: String(error)
        }
      });
      return [];
    }
  }

  /**
   * Get audio transcription by file ID
   */
  public async getAudioTranscription(fileId: number): Promise<string | null> {
    try {
      const file = await prisma.mediaFile.findUnique({
        where: { id: fileId },
        select: { extractedText: true, audioAnalysis: true }
      });

      if (!file) {
        return null;
      }

      // Try extractedText first, then audioAnalysis transcription
      if (file.extractedText) {
        return file.extractedText;
      }

      if (file.audioAnalysis && typeof file.audioAnalysis === 'object') {
        const audioAnalysis = file.audioAnalysis as any;
        if (audioAnalysis.transcription?.text) {
          return audioAnalysis.transcription.text;
        }
      }

      return null;

    } catch (error) {
      logger.error('Failed to get audio transcription', {
        operation: 'audio-transcription-get',
        metadata: {
          fileId,
          error: String(error)
        }
      });
      return null;
    }
  }

  /**
   * Get audio files by user with analysis data
   */
  public async getAudioFilesByUser(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<MediaFile[]> {
    try {
      const files = await prisma.mediaFile.findMany({
        where: {
          userId,
          fileType: 'audio'
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' }
      });

      return files as unknown as MediaFile[];

    } catch (error) {
      logger.error('Failed to get audio files by user', {
        operation: 'audio-files-get',
        metadata: {
          userId,
          error: String(error)
        }
      });
      return [];
    }
  }

  /**
   * Get audio analysis statistics for user
   */
  public async getAudioAnalysisStats(userId: string): Promise<{
    totalFiles: number;
    processedFiles: number;
    totalDuration: number;
    averageQuality: number;
    sentimentDistribution: Record<string, number>;
  }> {
    try {
      const files = await prisma.mediaFile.findMany({
        where: {
          userId,
          fileType: 'audio'
        },
        select: {
          processingStatus: true,
          audioAnalysis: true,
          audioMetadata: true
        }
      });

      const totalFiles = files.length;
      const processedFiles = files.filter(f => f.processingStatus === 'completed').length;

      let totalDuration = 0;
      let qualitySum = 0;
      let qualityCount = 0;
      const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };

      for (const file of files) {
        // Extract duration from metadata
        if (file.audioMetadata && typeof file.audioMetadata === 'object') {
          const metadata = file.audioMetadata as any;
          if (metadata.duration) {
            totalDuration += metadata.duration;
          }
        }

        // Extract quality and sentiment from analysis
        if (file.audioAnalysis && typeof file.audioAnalysis === 'object') {
          const analysis = file.audioAnalysis as any;
          
          if (analysis.quality?.overallScore) {
            qualitySum += analysis.quality.overallScore;
            qualityCount++;
          }

          if (analysis.sentiment?.overall !== undefined) {
            const sentiment = analysis.sentiment.overall;
            if (sentiment > 0.1) sentimentCounts.positive++;
            else if (sentiment < -0.1) sentimentCounts.negative++;
            else sentimentCounts.neutral++;
          }
        }
      }

      return {
        totalFiles,
        processedFiles,
        totalDuration: Math.round(totalDuration),
        averageQuality: qualityCount > 0 ? Math.round((qualitySum / qualityCount) * 100) / 100 : 0,
        sentimentDistribution: sentimentCounts
      };

    } catch (error) {
      logger.error('Failed to get audio analysis stats', {
        operation: 'audio-stats',
        metadata: {
          userId,
          error: String(error)
        }
      });
      
      return {
        totalFiles: 0,
        processedFiles: 0,
        totalDuration: 0,
        averageQuality: 0,
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0 }
      };
    }
  }

  // Private helper methods

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevanceScore(file: any, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();

    // Filename match (highest weight)
    if (file.originalName?.toLowerCase().includes(queryLower)) {
      score += 10;
    }

    // Description match
    if (file.description?.toLowerCase().includes(queryLower)) {
      score += 8;
    }

    // Extracted text match
    if (file.extractedText?.toLowerCase().includes(queryLower)) {
      score += 6;
    }

    // Tags match
    if (file.tags) {
      try {
        const tags = typeof file.tags === 'string' ? JSON.parse(file.tags) : file.tags;
        if (Array.isArray(tags) && tags.some(tag => 
          tag.toLowerCase().includes(queryLower)
        )) {
          score += 4;
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    // Recency bonus
    const daysSinceCreation = (Date.now() - new Date(file.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 2 - (daysSinceCreation / 30)); // 2 points max, declining over month

    return Math.round(score * 100) / 100;
  }

  /**
   * Extract matched segments from transcription
   */
  private extractMatchedSegments(file: any, query: string): any[] {
    try {
      if (!file.audioAnalysis || typeof file.audioAnalysis !== 'object') {
        return [];
      }

      const analysis = file.audioAnalysis as any;
      if (!analysis.transcription?.segments) {
        return [];
      }

      const queryLower = query.toLowerCase();
      return analysis.transcription.segments.filter((segment: any) =>
        segment.text?.toLowerCase().includes(queryLower)
      );

    } catch (error) {
      return [];
    }
  }

  /**
   * Generate highlighted text for search results
   */
  private generateHighlightedText(file: any, query: string): string | undefined {
    const text = file.extractedText || file.description || '';
    if (!text || !query) return undefined;

    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    const index = textLower.indexOf(queryLower);

    if (index === -1) return undefined;

    // Extract context around the match
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + query.length + 50);
    const context = text.substring(start, end);

    // Add ellipsis if truncated
    return `${start > 0 ? '...' : ''}${context}${end < text.length ? '...' : ''}`;
  }
}
