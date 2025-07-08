/**
 * Conversation Thread Service
 * Management of conversation threads, organization, and lifecycle
 */

import {
  ConversationThread,
  ConversationMessage,
  ThreadStatus,
  ThreadCreationOptions,
  ThreadUpdateOptions,
  ThreadArchiveOptions,
  ConversationInsights,
  AttachmentMetadata
} from './types.js';
import { TopicDetectionService } from './topic-detection.service.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

/**
 * Service for managing conversation threads and their lifecycle
 */
export class ConversationThreadService {
  private readonly topicDetectionService: TopicDetectionService;
  private readonly defaultThreadOptions: ThreadCreationOptions;

  constructor() {
    this.topicDetectionService = new TopicDetectionService();
    this.defaultThreadOptions = {
      importance: 0.5,
      autoDetectTopics: true
    };
  }

  /**
   * Create a new conversation thread
   */
  public async createThread(
    channelId: string,
    userId: string,
    guildId?: string,
    options: ThreadCreationOptions = {}
  ): Promise<ConversationThread | null> {
    try {
      const opts = { ...this.defaultThreadOptions, ...options };
      
      const thread = await prisma.conversationThread.create({
        data: {
          channelId,
          userId,
          guildId: guildId || null,
          threadTitle: opts.title,
          currentTopic: opts.initialTopic,
          status: 'active',
          importance: opts.importance!,
          messageCount: 0,
          tokenCount: 0
        }
      });

      logger.info('Conversation thread created', {
        operation: 'thread-creation',
        threadId: thread.id,
        userId,
        channelId,
        guildId
      });

      return {
        id: thread.id,
        channelId: thread.channelId,
        userId: thread.userId,
        guildId: thread.guildId || undefined,
        threadTitle: thread.threadTitle || undefined,
        currentTopic: thread.currentTopic || undefined,
        status: thread.status as ThreadStatus,
        summary: thread.summary || undefined,
        importance: thread.importance,
        messageCount: thread.messageCount,
        tokenCount: thread.tokenCount,
        createdAt: thread.createdAt,
        lastActivity: thread.lastActivity
      };

    } catch (error) {
      logger.error('Failed to create conversation thread', {
        operation: 'thread-creation',
        userId,
        channelId,
        guildId,
        error: String(error)
      });
      return null;
    }
  }

  /**
   * Get active thread for a channel and user
   */
  public async getActiveThread(
    channelId: string,
    userId: string
  ): Promise<ConversationThread | null> {
    try {
      const thread = await prisma.conversationThread.findFirst({
        where: {
          channelId,
          userId,
          status: 'active'
        },
        orderBy: {
          lastActivity: 'desc'
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 50 // Limit messages for performance
          }
        }
      });

      if (!thread) return null;

      return {
        id: thread.id,
        channelId: thread.channelId,
        userId: thread.userId,
        guildId: thread.guildId || undefined,
        threadTitle: thread.threadTitle || undefined,
        currentTopic: thread.currentTopic || undefined,
        status: thread.status as ThreadStatus,
        summary: thread.summary || undefined,
        importance: thread.importance,
        messageCount: thread.messageCount,
        tokenCount: thread.tokenCount,
        createdAt: thread.createdAt,
        lastActivity: thread.lastActivity,
        messages: thread.messages.map(msg => ({
          id: msg.id,
          threadId: msg.threadId || undefined,
          channelId: msg.channelId,
          userId: msg.userId,
          content: msg.content,
          role: msg.role as 'user' | 'assistant',
          tokens: msg.tokens,
          topicTags: msg.topicTags ? JSON.parse(msg.topicTags) : undefined,
          importance: msg.importance,
          contextRelevant: msg.contextRelevant,
          hasAttachments: msg.hasAttachments,
          attachmentData: msg.attachmentData ? JSON.parse(msg.attachmentData) : undefined,
          createdAt: msg.createdAt
        }))
      };

    } catch (error) {
      logger.error('Failed to get active thread', {
        operation: 'thread-retrieval',
        channelId,
        userId,
        error: String(error)
      });
      return null;
    }
  }

  /**
   * Update thread properties
   */
  public async updateThread(
    threadId: number,
    updates: ThreadUpdateOptions
  ): Promise<boolean> {
    try {
      await prisma.conversationThread.update({
        where: { id: threadId },
        data: {
          threadTitle: updates.title,
          status: updates.status,
          importance: updates.importance,
          summary: updates.summary,
          currentTopic: updates.currentTopic,
          lastActivity: new Date()
        }
      });

      logger.info('Thread updated', {
        operation: 'thread-update',
        threadId,
        updates: Object.keys(updates)
      });

      return true;

    } catch (error) {
      logger.error('Failed to update thread', {
        operation: 'thread-update',
        threadId,
        error: String(error)
      });
      return false;
    }
  }

  /**
   * Add message to thread
   */
  public async addMessageToThread(
    threadId: number,
    content: string,
    role: 'user' | 'assistant',
    userId: string,
    channelId: string,
    options: {
      tokens?: number;
      attachmentData?: unknown;
      autoDetectTopics?: boolean;
    } = {}
  ): Promise<ConversationMessage | null> {
    try {
      const tokens = options.tokens || Math.ceil(content.length / 4);
      
      // Detect topics if enabled
      let topicTags: string[] = [];
      if (options.autoDetectTopics !== false) {
        const topicResult = await this.topicDetectionService.detectTopics(content);
        topicTags = topicResult.topics.map(t => t.name);
        
        // Update thread's current topic if we detected a primary topic
        if (topicResult.primaryTopic) {
          await this.updateThread(threadId, { currentTopic: topicResult.primaryTopic });
        }
      }

      // Create the message
      const message = await prisma.conversationMessage.create({
        data: {
          threadId,
          channelId,
          userId,
          content,
          role,
          tokens,
          topicTags: topicTags.length > 0 ? JSON.stringify(topicTags) : null,
          importance: 0.5, // Default importance
          contextRelevant: true,
          hasAttachments: !!options.attachmentData,
          attachmentData: options.attachmentData ? JSON.stringify(options.attachmentData) : null
        }
      });

      // Update thread statistics
      await prisma.conversationThread.update({
        where: { id: threadId },
        data: {
          messageCount: { increment: 1 },
          tokenCount: { increment: tokens },
          lastActivity: new Date()
        }
      });

      logger.debug('Message added to thread', {
        operation: 'message-add',
        threadId,
        messageId: message.id,
        role,
        tokens,
        topicsDetected: topicTags.length
      });

      return {
        id: message.id,
        threadId: message.threadId || undefined,
        channelId: message.channelId,
        userId: message.userId,
        content: message.content,
        role: message.role as 'user' | 'assistant',
        tokens: message.tokens,
        topicTags: topicTags.length > 0 ? topicTags : undefined,
        importance: message.importance,
        contextRelevant: message.contextRelevant,
        hasAttachments: message.hasAttachments,
        attachmentData: options.attachmentData as AttachmentMetadata | undefined,
        createdAt: message.createdAt
      };

    } catch (error) {
      logger.error('Failed to add message to thread', {
        operation: 'message-add',
        threadId,
        userId,
        channelId,
        error: String(error)
      });
      return null;
    }
  }

  /**
   * Archive a thread
   */
  public async archiveThread(
    threadId: number,
    options: ThreadArchiveOptions = {}
  ): Promise<{
    success: boolean;
    messagesPreserved: number;
    summaryGenerated: boolean;
  }> {
    try {
      const updates: ThreadUpdateOptions = {
        status: 'archived'
      };

      let summaryGenerated = false;
      let messagesPreserved = 0;

      // Generate summary if requested
      if (options.generateSummary) {
        const summary = await this.generateThreadSummary(threadId);
        if (summary) {
          updates.summary = summary;
          summaryGenerated = true;
        }
      }

      // Archive low-importance messages if requested
      if (options.preserveImportantMessages) {
        const threshold = options.minImportanceThreshold || 0.7;
        
        // Count messages that will be preserved
        const preservedCount = await prisma.conversationMessage.count({
          where: {
            threadId,
            importance: { gte: threshold }
          }
        });
        messagesPreserved = preservedCount;

        await prisma.conversationMessage.updateMany({
          where: {
            threadId,
            importance: { lt: threshold }
          },
          data: {
            contextRelevant: false
          }
        });
      } else {
        // Count all messages if not filtering
        const totalCount = await prisma.conversationMessage.count({
          where: { threadId }
        });
        messagesPreserved = totalCount;
      }

      const success = await this.updateThread(threadId, updates);

      if (success) {
        logger.info('Thread archived', {
          operation: 'thread-archive',
          threadId,
          options,
          messagesPreserved,
          summaryGenerated
        });
      }

      return {
        success,
        messagesPreserved,
        summaryGenerated
      };

    } catch (error) {
      logger.error('Failed to archive thread', {
        operation: 'thread-archive',
        threadId,
        error: String(error)
      });
      return {
        success: false,
        messagesPreserved: 0,
        summaryGenerated: false
      };
    }
  }

  /**
   * Get thread history for a channel/user
   */
  public async getThreadHistory(
    channelId: string,
    userId: string,
    limit: number = 10
  ): Promise<ConversationThread[]> {
    try {
      const threads = await prisma.conversationThread.findMany({
        where: {
          channelId,
          userId
        },
        orderBy: {
          lastActivity: 'desc'
        },
        take: limit,
        include: {
          _count: {
            select: { messages: true }
          }
        }
      });

      return threads.map(thread => ({
        id: thread.id,
        channelId: thread.channelId,
        userId: thread.userId,
        guildId: thread.guildId || undefined,
        threadTitle: thread.threadTitle || undefined,
        currentTopic: thread.currentTopic || undefined,
        status: thread.status as ThreadStatus,
        summary: thread.summary || undefined,
        importance: thread.importance,
        messageCount: thread.messageCount,
        tokenCount: thread.tokenCount,
        createdAt: thread.createdAt,
        lastActivity: thread.lastActivity
      }));

    } catch (error) {
      logger.error('Failed to get thread history', {
        operation: 'thread-history',
        channelId,
        userId,
        error: String(error)
      });
      return [];
    }
  }

  /**
   * Get conversation insights for a thread
   */
  public async getThreadInsights(threadId: number): Promise<ConversationInsights | null> {
    try {
      const thread = await prisma.conversationThread.findUnique({
        where: { id: threadId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          },
          topics: {
            include: {
              topic: true
            }
          }
        }
      });

      if (!thread) return null;

      const messages = thread.messages;
      const userMessages = messages.filter(m => m.role === 'user');
      const assistantMessages = messages.filter(m => m.role === 'assistant');

      // Calculate participation patterns
      const participationPattern = {
        userMessageCount: userMessages.length,
        assistantMessageCount: assistantMessages.length,
        averageUserMessageLength: userMessages.length > 0 
          ? userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length
          : 0,
        averageResponseTime: this.calculateAverageResponseTime(messages)
      };

      // Analyze topic evolution
      const topicEvolution = thread.topics.map(tt => ({
        topic: tt.topic.displayName,
        timeFirst: tt.firstSeen,
        timeLast: tt.lastSeen,
        frequency: Math.round(tt.relevance * 100)
      }));

      // Calculate engagement metrics
      const sessionDuration = thread.lastActivity.getTime() - thread.createdAt.getTime();
      const messageFrequency = messages.length > 0 ? sessionDuration / messages.length : 0;
      const topicSwitches = this.countTopicSwitches(messages);

      const engagementMetrics = {
        sessionDuration: Math.round(sessionDuration / 1000 / 60), // minutes
        messageFrequency: Math.round(messageFrequency / 1000 / 60), // minutes between messages
        topicSwitches,
        complexityScore: this.calculateComplexityScore(messages)
      };

      // Quality metrics
      const qualityMetrics = {
        coherenceScore: this.calculateCoherenceScore(messages),
        relevanceScore: this.calculateRelevanceScore(messages),
        satisfactionIndicators: this.extractSatisfactionIndicators(messages)
      };

      return {
        threadId,
        totalMessages: messages.length,
        userMessages: userMessages.length,
        assistantMessages: assistantMessages.length,
        averageImportance: messages.length > 0 ? messages.reduce((sum, m) => sum + m.importance, 0) / messages.length : 0,
        durationHours: sessionDuration / (1000 * 60 * 60),
        topicCount: thread.topics.length,
        keyPointCount: 0,
        actionItemCount: 0,
        decisionCount: 0,
        questionCount: 0,
        messagesPerHour: sessionDuration > 0 ? (messages.length * 3600000) / sessionDuration : 0,
        qualityScore: qualityMetrics.coherenceScore,
        generatedAt: new Date(),
        engagementPattern: sessionDuration > 0 ? 'active' : 'inactive',
        participationPattern,
        topicEvolution,
        engagementMetrics,
        qualityMetrics
      };

    } catch (error) {
      logger.error('Failed to get thread insights', {
        operation: 'thread-insights',
        threadId,
        error: String(error)
      });
      return null;
    }
  }

  /**
   * Get user threads with optional filtering
   */
  public async getUserThreads(
    userId: string,
    channelId?: string,
    options: {
      status?: string;
      limit?: number;
      includeArchived?: boolean;
    } = {}
  ): Promise<ConversationThread[]> {
    try {
      const { status, limit = 10, includeArchived = false } = options;

      const whereClause: {
        userId: string;
        channelId?: string;
        status?: string | { not: string };
      } = {
        userId,
        ...(channelId && { channelId }),
        ...(status && { status }),
        ...(!includeArchived && { status: { not: 'archived' } })
      };

      const threads = await prisma.conversationThread.findMany({
        where: whereClause,
        orderBy: { lastActivity: 'desc' },
        take: limit,
        include: {
          messages: {
            select: { id: true, createdAt: true, role: true },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      return threads.map(thread => ({
        id: thread.id,
        channelId: thread.channelId,
        userId: thread.userId,
        guildId: thread.guildId || undefined,
        threadTitle: thread.threadTitle || undefined,
        currentTopic: thread.currentTopic || undefined,
        status: thread.status as ThreadStatus,
        summary: thread.summary || undefined,
        importance: thread.importance,
        messageCount: thread.messageCount,
        tokenCount: thread.tokenCount,
        createdAt: thread.createdAt,
        lastActivity: thread.lastActivity
      }));

    } catch (error) {
      logger.error('Failed to get user threads', {
        operation: 'get-user-threads',
        userId,
        channelId,
        error: String(error)
      });
      return [];
    }
  }

  /**
   * Get conversation insights for a thread (alias for getThreadInsights)
   */
  public async getConversationInsights(threadId: number): Promise<ConversationInsights | null> {
    return this.getThreadInsights(threadId);
  }

  /**
   * Clean up old threads based on retention policy
   */
  public async cleanupOldThreads(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await prisma.conversationThread.deleteMany({
        where: {
          lastActivity: { lt: cutoffDate },
          status: { in: ['completed', 'archived'] }
        }
      });

      logger.info('Old threads cleaned up', {
        operation: 'thread-cleanup',
        deletedCount: result.count,
        cutoffDate: cutoffDate.toISOString()
      });

      return result.count;

    } catch (error) {
      logger.error('Failed to cleanup old threads', {
        operation: 'thread-cleanup',
        error: String(error)
      });
      return 0;
    }
  }

  /**
   * Generate AI summary for a thread
   */
  private async generateThreadSummary(threadId: number): Promise<string | null> {
    try {
      const thread = await prisma.conversationThread.findUnique({
        where: { id: threadId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20 // Limit for summary generation
          }
        }
      });

      if (!thread || thread.messages.length === 0) return null;

      // Simple extractive summary - in production, use AI service
      const keyMessages = thread.messages
        .filter(m => m.importance > 0.6)
        .slice(0, 5);

      const summary = keyMessages.length > 0
        ? `Summary of ${thread.messages.length} messages discussing ${thread.currentTopic || 'various topics'}.`
        : `Brief conversation with ${thread.messages.length} exchanges.`;

      return summary;

    } catch (error) {
      logger.warn('Failed to generate thread summary', {
        operation: 'thread-summary',
        threadId,
        error: String(error)
      });
      return null;
    }
  }

  /**
   * Calculate average response time between user and assistant messages
   */
  private calculateAverageResponseTime(messages: Array<{ createdAt: Date; role: string }>): number {
    if (messages.length < 2) return 0;

    const responseTimes: number[] = [];
    for (let i = 1; i < messages.length; i++) {
      if (messages[i-1].role === 'user' && messages[i].role === 'assistant') {
        const responseTime = messages[i].createdAt.getTime() - messages[i-1].createdAt.getTime();
        responseTimes.push(responseTime);
      }
    }

    return responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / 1000 // seconds
      : 0;
  }

  /**
   * Count topic switches in conversation
   */
  private countTopicSwitches(messages: Array<{ topicTags: string | null }>): number {
    let switches = 0;
    let currentTopic: string | null = null;

    for (const message of messages) {
      if (message.topicTags) {
        const topics = JSON.parse(message.topicTags) as string[];
        const primaryTopic = topics[0] || null;
        
        if (currentTopic && primaryTopic && currentTopic !== primaryTopic) {
          switches++;
        }
        currentTopic = primaryTopic;
      }
    }

    return switches;
  }

  /**
   * Calculate conversation complexity score
   */
  private calculateComplexityScore(messages: Array<{ content: string; tokens: number }>): number {
    if (messages.length === 0) return 0;

    const avgTokens = messages.reduce((sum, m) => sum + m.tokens, 0) / messages.length;
    const vocabularyDiversity = this.calculateVocabularyDiversity(messages);
    
    // Normalize to 0-1 scale
    return Math.min((avgTokens / 100 + vocabularyDiversity) / 2, 1);
  }

  /**
   * Calculate vocabulary diversity in messages
   */
  private calculateVocabularyDiversity(messages: Array<{ content: string }>): number {
    const allWords = messages
      .flatMap(m => m.content.toLowerCase().split(/\s+/))
      .filter(word => word.length > 3);
    
    const uniqueWords = new Set(allWords);
    return allWords.length > 0 ? uniqueWords.size / allWords.length : 0;
  }

  /**
   * Calculate coherence score based on message flow
   */
  private calculateCoherenceScore(messages: Array<{ content: string }>): number {
    // Simplified coherence calculation - could analyze semantic similarity between consecutive messages
    return messages.length > 0 ? Math.random() * 0.3 + 0.7 : 0; // Mock implementation
  }

  /**
   * Calculate relevance score of messages
   */
  private calculateRelevanceScore(messages: Array<{ importance: number }>): number {
    if (messages.length === 0) return 0;
    return messages.reduce((sum, m) => sum + m.importance, 0) / messages.length;
  }

  /**
   * Extract satisfaction indicators from messages
   */
  private extractSatisfactionIndicators(messages: Array<{ content: string; role: string }>): string[] {
    const indicators: string[] = [];
    const positivePatterns = [
      /\b(thank you|thanks|helpful|great|perfect|exactly)\b/i,
      /\b(solved|fixed|working|success)\b/i
    ];

    for (const message of messages) {
      if (message.role === 'user') {
        for (const pattern of positivePatterns) {
          if (pattern.test(message.content)) {
            indicators.push('positive_feedback');
            break;
          }
        }
      }
    }

    return [...new Set(indicators)]; // Remove duplicates
  }
}
