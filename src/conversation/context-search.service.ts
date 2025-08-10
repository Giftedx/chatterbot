/**
 * Context Search Service
 * Semantic search and retrieval across conversation history
 */

import {
  ContextSearchQuery,
  ThreadSearchResult
} from './types.js';
import { ConversationThreadService } from './conversation-thread.service.js';
import { TopicDetectionService } from './topic-detection.service.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

// Define the missing interface
interface ContextSearchOptions {
  searchContent?: boolean;
  searchTopics?: boolean;
  searchTitles?: boolean;
  maxResults?: number;
  similarityThreshold?: number;
  timeRange?: {
    start: Date;
    end: Date;
  };
  threadStatus?: string;
}

/**
 * Service for searching and retrieving conversation context
 */
export class ContextSearchService {
  private readonly threadService: ConversationThreadService;
  private readonly topicService: TopicDetectionService;
  
  constructor() {
    this.threadService = new ConversationThreadService();
    this.topicService = new TopicDetectionService();
  }

  /**
   * Search for relevant conversations across threads
   */
  public async searchConversations(
    query: ContextSearchQuery,
    options: ContextSearchOptions = {}
  ): Promise<ThreadSearchResult[]> {
    try {
      const startTime = Date.now();

      // Parse search query
      const searchTerms = this.parseSearchQuery(query.query);
      
      // Build search filters
      const filters = this.buildSearchFilters(query, options);

      // Search across different content types
      const results: ThreadSearchResult[] = [];

      // 1. Content-based search
      if (options.searchContent !== false) {
        const contentResults = await this.searchByContent(searchTerms, filters);
        results.push(...contentResults);
      }

      // 2. Topic-based search
      if (options.searchTopics !== false) {
        const topicResults = await this.searchByTopics(searchTerms, filters);
        results.push(...topicResults);
      }

      // 3. Title-based search
      if (options.searchTitles !== false) {
        const titleResults = await this.searchByTitles(searchTerms, filters);
        results.push(...titleResults);
      }

      // Deduplicate and rank results
      const deduplicatedResults = this.deduplicateResults(results);
      const rankedResults = this.rankSearchResults(deduplicatedResults, query.query);

      // Apply result limits
      const limitedResults = rankedResults.slice(0, options.maxResults || 20);

      const processingTime = Date.now() - startTime;

      logger.debug('Context search completed', {
        operation: 'context-search',
        userId: query.userId,
        channelId: query.channelId,
        metadata: {
          searchTerms: searchTerms.length,
          totalResults: results.length,
          deduplicatedResults: deduplicatedResults.length,
          finalResults: limitedResults.length,
          processingTime
        }
      });

      return limitedResults;

    } catch (error) {
      logger.error('Failed to search conversations', {
        operation: 'context-search',
        userId: query.userId,
        query: query.query,
        error: String(error)
      });
      return [];
    }
  }

  /**
   * Find similar conversations based on content
   */
  public async findSimilarConversations(
    referenceContent: string,
    userId: string,
    options: ContextSearchOptions = {}
  ): Promise<ThreadSearchResult[]> {
    try {
      // Extract key terms from reference content
      const keyTerms = this.extractKeyTerms(referenceContent);
      
      // Create search query
      const searchQuery: ContextSearchQuery = {
        query: keyTerms.join(' '),
        userId,
        minImportance: options.similarityThreshold || 0.3
      };

      // Perform search
      const results = await this.searchConversations(searchQuery, {
        ...options,
        maxResults: options.maxResults || 10
      });

      return results.filter(result => result.relevanceScore > (options.similarityThreshold || 0.3));

    } catch (error) {
      logger.error('Failed to find similar conversations', {
        operation: 'similar-conversations',
        userId,
        error: String(error)
      });
      return [];
    }
  }

  /**
   * Get conversation history for a specific topic
   */
  public async getTopicHistory(
    topicName: string,
    userId: string,
    options: ContextSearchOptions = {}
  ): Promise<ThreadSearchResult[]> {
    try {
      // Find topic in database
      const topic = await prisma.conversationTopic.findFirst({
        where: {
          OR: [
            { name: { equals: topicName } },
            { displayName: { contains: topicName } }
          ]
        }
      });

      if (!topic) {
        return [];
      }

      // Find threads associated with this topic
      const threadTopics = await prisma.conversationThreadTopic.findMany({
        where: {
          topicId: topic.id,
          thread: {
            userId,
            ...(options.timeRange && {
              createdAt: {
                gte: options.timeRange.start,
                lte: options.timeRange.end
              }
            })
          }
        },
        include: {
          thread: true
        },
        orderBy: {
          thread: { lastActivity: 'desc' }
        }
      });

      // Convert to search results
      const results: ThreadSearchResult[] = threadTopics.map((tt: { thread: { guildId?: string; summary?: string } }) => ({
        thread: {
          ...tt.thread,
          guildId: tt.thread.guildId || undefined
        } as { guildId?: string; summary?: string },
        relevanceScore: 0.9, // High relevance for direct topic match
        matchingMessages: [], // Would need to fetch actual messages
        highlightedContent: [tt.thread.summary || `Topic: ${topicName}`],
        topicMatches: [topicName]
      }));

      logger.debug('Topic history retrieved', {
        operation: 'topic-history',
        topicName,
        userId,
        metadata: {
          threadCount: results.length
        }
      });

      return results.slice(0, options.maxResults || 20);

    } catch (error) {
      logger.error('Failed to get topic history', {
        operation: 'topic-history',
        topicName,
        userId,
        error: String(error)
      });
      return [];
    }
  }

  /**
   * Parse search query into terms and modifiers
   */
  private parseSearchQuery(query: string): string[] {
    // Simple tokenization - can be enhanced with NLP
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2)
      .filter(term => !this.isStopWord(term));
  }

  /**
   * Build database search filters
   */
  private buildSearchFilters(query: ContextSearchQuery, options: ContextSearchOptions) {
    const filters: { userId: string; channelId?: string; guildId?: string; createdAt?: { gte: Date; lte: Date }; status?: string } = {
      userId: query.userId
    };

    if (query.channelId) {
      filters.channelId = query.channelId;
    }

    if (query.guildId) {
      filters.guildId = query.guildId;
    }

    if (query.timeRange) {
      filters.createdAt = {
        gte: query.timeRange.start,
        lte: query.timeRange.end
      };
    }

    if (options.threadStatus) {
      filters.status = options.threadStatus;
    }

    return filters;
  }

  /**
   * Search by message content
   */
  private async searchByContent(
    searchTerms: string[],
    filters: { userId: string; channelId?: string; guildId?: string; createdAt?: { gte: Date; lte: Date }; status?: string }
  ): Promise<ThreadSearchResult[]> {
    const results: ThreadSearchResult[] = [];

    // For now, do a simple text search
    // In production, this would use full-text search or vector embeddings
    for (const term of searchTerms.slice(0, 5)) { // Limit to prevent too many queries
      try {
        const threads = await prisma.conversationThread.findMany({
          where: {
            ...filters,
            OR: [
              { threadTitle: { contains: term } },
              { summary: { contains: term } },
              { currentTopic: { contains: term } }
            ]
          },
          take: 10,
          orderBy: { lastActivity: 'desc' }
        });

        for (const thread of threads) {
          results.push({
            thread: {
              ...thread,
              guildId: thread.guildId || undefined
            } as { guildId?: string; summary?: string },
            relevanceScore: this.calculateContentRelevance(thread.summary || '', searchTerms),
            matchingMessages: [], // Would need to fetch actual messages
            highlightedContent: [this.extractSnippet(thread.summary || '', term)],
            topicMatches: []
          });
        }
      } catch (error) {
        logger.warn('Content search failed for term', {
          term,
          error: String(error)
        });
      }
    }

    return results;
  }

  /**
   * Search by topics
   */
  private async searchByTopics(
    searchTerms: string[],
    filters: { userId: string; channelId?: string; guildId?: string; createdAt?: { gte: Date; lte: Date }; status?: string }
  ): Promise<ThreadSearchResult[]> {
    const results: ThreadSearchResult[] = [];

    try {
      // Find matching topics
      const topics = await prisma.conversationTopic.findMany({
        where: {
          OR: searchTerms.map(term => ({
            OR: [
              { name: { contains: term } },
              { displayName: { contains: term } }
            ]
          }))
        }
      });

      // Find threads with these topics
      for (const topic of topics) {
        const threadTopics = await prisma.conversationThreadTopic.findMany({
          where: {
            topicId: topic.id,
            thread: filters
          },
          include: {
            thread: true
          },
          take: 5
        });

        for (const tt of threadTopics) {
          results.push({
            thread: {
              ...tt.thread,
              guildId: tt.thread.guildId || undefined
            } as { guildId?: string; summary?: string },
            relevanceScore: 0.8, // High relevance for topic matches
            matchingMessages: [], // Would need to fetch actual messages
            highlightedContent: [`Topic: ${topic.displayName || topic.name}`],
            topicMatches: [topic.name]
          });
        }
      }
    } catch (error) {
      logger.warn('Topic search failed', {
        error: String(error)
      });
    }

    return results;
  }

  /**
   * Search by thread titles
   */
  private async searchByTitles(
    searchTerms: string[],
    filters: { userId: string; channelId?: string; guildId?: string; createdAt?: { gte: Date; lte: Date }; status?: string }
  ): Promise<ThreadSearchResult[]> {
    const results: ThreadSearchResult[] = [];

    try {
      for (const term of searchTerms.slice(0, 3)) {
        const threads = await prisma.conversationThread.findMany({
          where: {
            ...filters,
            threadTitle: { contains: term }
          },
          take: 10,
          orderBy: { lastActivity: 'desc' }
        });

        for (const thread of threads) {
          results.push({
            thread: {
              ...thread,
              guildId: thread.guildId || undefined
            } as { guildId?: string; threadTitle?: string },
            relevanceScore: this.calculateTitleRelevance(thread.threadTitle || '', searchTerms),
            matchingMessages: [], // Would need to fetch actual messages
            highlightedContent: [thread.threadTitle || ''],
            topicMatches: []
          });
        }
      }
    } catch (error) {
      logger.warn('Title search failed', {
        error: String(error)
      });
    }

    return results;
  }

  /**
   * Deduplicate search results
   */
  private deduplicateResults(results: ThreadSearchResult[]): ThreadSearchResult[] {
    const seen = new Set<string>();
    const deduplicated: ThreadSearchResult[] = [];

    for (const result of results) {
      const threadId = result.thread.id?.toString() || '';
      if (!seen.has(threadId)) {
        seen.add(threadId);
        deduplicated.push(result);
      }
    }

    return deduplicated;
  }

  /**
   * Rank search results by relevance
   */
  private rankSearchResults(results: ThreadSearchResult[], query: string): ThreadSearchResult[] {
    const searchTerms = this.parseSearchQuery(query);
    
    return results.sort((a, b) => {
      // Primary sort: relevance score
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }

      // Secondary sort: match type priority (based on which fields had matches)
      const getMatchType = (result: ThreadSearchResult): string => {
        if (result.thread.threadTitle && searchTerms.some((term: string) => 
          result.thread.threadTitle?.toLowerCase().includes(term.toLowerCase()))) {
          return 'title';
        }
        if (result.thread.currentTopic && searchTerms.some((term: string) => 
          result.thread.currentTopic?.toLowerCase().includes(term.toLowerCase()))) {
          return 'topic';
        }
        return 'content';
      };
      
      const matchTypePriority: Record<string, number> = { 'title': 3, 'topic': 2, 'content': 1 };
      const aPriority = matchTypePriority[getMatchType(a)] || 0;
      const bPriority = matchTypePriority[getMatchType(b)] || 0;
      
      if (bPriority !== aPriority) {
        return bPriority - aPriority;
      }

      // Tertiary sort: recency
      return b.thread.createdAt.getTime() - a.thread.createdAt.getTime();
    });
  }

  /**
   * Calculate content relevance score
   */
  private calculateContentRelevance(content: string, searchTerms: string[]): number {
    if (!content) return 0;

    const contentLower = content.toLowerCase();
    let matches = 0;

    for (const term of searchTerms) {
      if (contentLower.includes(term.toLowerCase())) {
        matches++;
      }
    }

    return matches / searchTerms.length;
  }

  /**
   * Calculate title relevance score
   */
  private calculateTitleRelevance(title: string, searchTerms: string[]): number {
    if (!title) return 0;

    const titleLower = title.toLowerCase();
    let exactMatches = 0;
    let partialMatches = 0;

    for (const term of searchTerms) {
      const termLower = term.toLowerCase();
      if (titleLower === termLower) {
        exactMatches++;
      } else if (titleLower.includes(termLower)) {
        partialMatches++;
      }
    }

    return (exactMatches * 1.0 + partialMatches * 0.5) / searchTerms.length;
  }

  /**
   * Extract snippet around search term
   */
  private extractSnippet(content: string, searchTerm: string, maxLength: number = 150): string {
    if (!content) return '';

    const lowerContent = content.toLowerCase();
    const lowerTerm = searchTerm.toLowerCase();
    const index = lowerContent.indexOf(lowerTerm);

    if (index === -1) {
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }

    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + searchTerm.length + 50);
    
    let snippet = content.substring(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
  }

  /**
   * Extract key terms from content for similarity search
   */
  private extractKeyTerms(content: string): string[] {
    const terms = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 3)
      .filter(term => !this.isStopWord(term));

    // Get most frequent terms
    const frequency: { [key: string]: number } = {};
    for (const term of terms) {
      frequency[term] = (frequency[term] || 0) + 1;
    }

    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([term]) => term);
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
      'can', 'shall', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
      'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its',
      'our', 'their'
    ]);

    return stopWords.has(word.toLowerCase());
  }
}
