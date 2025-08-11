/**
 * Knowledge Base Service
 * Manages trusted information for zero-hallucination responses
 */

import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

export interface KnowledgeEntry {
  id: string;
  content: string;
  source: string; // Accept any string from Prisma
  sourceId: string;
  sourceUrl: string | null;
  channelId: string | null;
  authorId: string | null;
  tags: string | null; // JSON string of tags
  confidence: number; // 0-1, how confident we are in this knowledge
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeQuery {
  query: string;
  channelId?: string;
  tags?: string[];
  minConfidence?: number;
  limit?: number;
}

export class KnowledgeBaseService {
  private static instance: KnowledgeBaseService;

  private constructor() {}

  static getInstance(): KnowledgeBaseService {
    if (!KnowledgeBaseService.instance) {
      KnowledgeBaseService.instance = new KnowledgeBaseService();
    }
    return KnowledgeBaseService.instance;
  }

  /**
   * Add knowledge from Discord message
   */
  async addFromDiscordMessage(
    messageId: string,
    content: string,
    channelId: string,
    authorId: string,
    tags: string[] = [],
    confidence: number = 0.8
  ): Promise<KnowledgeEntry> {
    try {
      const entry = await prisma.knowledgeEntry.create({
        data: {
          content: this.cleanContent(content),
          source: 'discord_message',
          sourceId: messageId,
          channelId,
          authorId,
          tags: tags ? JSON.stringify(tags) : null,
          confidence,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      logger.info('Added knowledge from Discord message', {
        messageId,
        channelId,
        authorId,
        confidence
      });

      return entry;
    } catch (error) {
      logger.error('Failed to add knowledge from Discord message', error);
      throw error;
    }
  }

  /**
   * Add FAQ entry
   */
  async addFAQ(
    question: string,
    answer: string,
    tags: string[] = [],
    confidence: number = 0.9
  ): Promise<KnowledgeEntry> {
    try {
      const content = `Q: ${question}\nA: ${answer}`;
      
      const entry = await prisma.knowledgeEntry.create({
        data: {
          content: this.cleanContent(content),
          source: 'faq',
          sourceId: `faq_${Date.now()}`,
          tags: tags ? JSON.stringify(tags) : null,
          confidence,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      logger.info('Added FAQ to knowledge base', { question, confidence });
      return entry;
    } catch (error) {
      logger.error('Failed to add FAQ', error);
      throw error;
    }
  }

  /**
   * Search knowledge base for relevant information
   */
  async search(query: KnowledgeQuery): Promise<KnowledgeEntry[]> {
    try {
      const { query: searchQuery, channelId, tags, minConfidence = 0.5, limit = 5 } = query;

      // If we have embeddings stored, prefer semantic retrieval by cosine similarity approximation
      // Note: Prisma doesn't support vector ops natively on sqlite; this is a placeholder for future pgvector/milvus.
      // For now, we fallback to keyword search and confidence ordering.
      // Simple keyword-based search (can be enhanced with vector embeddings)
      const whereClause: Record<string, unknown> = {
        confidence: { gte: minConfidence }
      };

      if (channelId) {
        whereClause.channelId = channelId;
      }

      if (tags && tags.length > 0) {
        // For JSON string tags, we'll filter after query
        // This is a simplified approach - in production, consider using a proper search engine
      }

      const entries = await prisma.knowledgeEntry.findMany({
        where: whereClause,
        orderBy: [
          { confidence: 'desc' },
          { updatedAt: 'desc' }
        ],
        take: limit * 3
      });

      // Filter by relevance (simple keyword matching for now)
      const relevantEntries = (entries as KnowledgeEntry[])
        .map((entry) => ({ entry, score: this.calculateRelevance(searchQuery, entry.content) }))
        .filter((e) => e.score > 0.2)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((e) => e.entry);

      logger.info('Knowledge base search completed', {
        query: searchQuery,
        results: relevantEntries.length,
        totalSearched: entries.length
      });

      return relevantEntries as any;
    } catch (error) {
      logger.error('Failed to search knowledge base', error);
      return [];
    }
  }

  /**
   * Check if we have grounded knowledge for a query
   */
  async hasGroundedKnowledge(query: string, minConfidence: number = 0.6): Promise<boolean> {
    const results = await this.search({
      query,
      minConfidence,
      limit: 1
    });
    return results.length > 0;
  }

  /**
   * Get best matching knowledge for a query
   */
  async getBestMatch(query: string, channelId?: string): Promise<KnowledgeEntry | null> {
    const results = await this.search({
      query,
      channelId,
      minConfidence: 0.6,
      limit: 1
    });
    return results[0] || null;
  }

  /**
   * Update confidence score for an entry
   */
  async updateConfidence(entryId: string, newConfidence: number): Promise<void> {
    try {
      await prisma.knowledgeEntry.update({
        where: { id: entryId },
        data: {
          confidence: Math.max(0, Math.min(1, newConfidence)),
          updatedAt: new Date()
        }
      });

      logger.info('Updated knowledge entry confidence', { entryId, newConfidence });
    } catch (error) {
      logger.error('Failed to update confidence', error);
    }
  }

  /**
   * Delete knowledge entry
   */
  async deleteEntry(entryId: string): Promise<void> {
    try {
      await prisma.knowledgeEntry.delete({
        where: { id: entryId }
      });

      logger.info('Deleted knowledge entry', { entryId });
    } catch (error) {
      logger.error('Failed to delete knowledge entry', error);
    }
  }

  /**
   * Get statistics about knowledge base
   */
  async getStats(): Promise<{
    totalEntries: number;
    bySource: Record<string, number>;
    averageConfidence: number;
    recentAdditions: number;
  }> {
    try {
      const totalEntries = await prisma.knowledgeEntry.count();
      const avgConfidence = await prisma.knowledgeEntry.aggregate({
        _avg: { confidence: true }
      });

      const bySource = await prisma.knowledgeEntry.groupBy({
        by: ['source'],
        _count: { source: true }
      });

      const recentAdditions = await prisma.knowledgeEntry.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      });

      return {
        totalEntries,
        bySource: bySource.reduce((acc: Record<string, number>, item: { source: string; _count: { source: number } }) => {
          acc[item.source] = item._count.source;
          return acc;
        }, {}),
        averageConfidence: avgConfidence._avg.confidence || 0,
        recentAdditions
      };
    } catch (error) {
      logger.error('Failed to get knowledge base stats', error);
      return {
        totalEntries: 0,
        bySource: {},
        averageConfidence: 0,
        recentAdditions: 0
      };
    }
  }

  /**
   * Clean content for storage
   */
  private cleanContent(content: string): string {
    return content
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 2000); // Limit length
  }

  /**
   * Calculate relevance between query and content (simple implementation)
   */
  private calculateRelevance(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    const matches = queryWords.filter(word => 
      contentWords.some(contentWord => contentWord.includes(word))
    );
    
    return matches.length / queryWords.length;
  }
}

// Export singleton instance
export const knowledgeBaseService = KnowledgeBaseService.getInstance(); 