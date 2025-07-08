/**
 * Context Window Service
 * Intelligent context selection and management for AI conversations
 */

import {
  ContextWindow,
  ConversationMessage,
  SmartContextOptions,
  ContextSelectionStrategy
} from './types.js';
import { ConversationThreadService } from './conversation-thread.service.js';
import { UserMemoryService } from '../memory/user-memory.service.js';
import { logger } from '../utils/logger.js';

/**
 * Service for managing intelligent context windows in conversations
 */
export class ContextWindowService {
  private readonly threadService: ConversationThreadService;
  private readonly memoryService: UserMemoryService;
  private readonly strategies: Map<string, ContextSelectionStrategy>;
  
  constructor() {
    this.threadService = new ConversationThreadService();
    this.memoryService = new UserMemoryService();
    this.strategies = new Map();
    this.initializeStrategies();
  }

  /**
   * Create an intelligent context window for a conversation
   */
  public async createContextWindow(
    channelId: string,
    userId: string,
    currentMessage: string,
    options: SmartContextOptions
  ): Promise<ContextWindow | null> {
    try {
      const startTime = Date.now();

      // Get active thread for this user/channel
      const activeThread = await this.threadService.getActiveThread(channelId, userId);
      
      if (!activeThread || !activeThread.messages) {
        logger.debug('No active thread found for context window', {
          operation: 'context-window',
          channelId,
          userId
        });
        return null;
      }

      // Select the best strategy based on options
      const strategy = this.selectStrategy(options);
      
      // Apply strategy to select relevant messages
      const selectedMessages = strategy.selectMessages(
        activeThread.messages,
        currentMessage,
        options
      );

      // Calculate total tokens
      const totalTokens = selectedMessages.reduce((sum, msg) => sum + msg.tokens, 0);

      // Determine time span
      const timeSpan = selectedMessages.length > 0 ? {
        start: selectedMessages[0].createdAt,
        end: selectedMessages[selectedMessages.length - 1].createdAt
      } : {
        start: new Date(),
        end: new Date()
      };

      // Extract topics from selected messages
      const topics = this.extractTopicsFromMessages(selectedMessages);

      // Calculate relevance score
      const relevanceScore = this.calculateRelevanceScore(selectedMessages, currentMessage);

      // Generate summary if needed
      const summary = options.maxMessages && selectedMessages.length > options.maxMessages
        ? await this.generateContextSummary(selectedMessages)
        : undefined;

      const contextWindow: ContextWindow = {
        messages: selectedMessages,
        totalTokens,
        relevanceScore,
        timeSpan,
        topics,
        summary
      };

      const processingTime = Date.now() - startTime;

      logger.debug('Context window created', {
        operation: 'context-window',
        userId,
        channelId,
        metadata: {
          strategy: strategy.name,
          messagesSelected: selectedMessages.length,
          totalMessages: activeThread.messages.length,
          totalTokens,
          relevanceScore,
          processingTime
        }
      });

      return contextWindow;

    } catch (error) {
      logger.error('Failed to create context window', {
        operation: 'context-window',
        userId,
        channelId,
        error: String(error)
      });
      return null;
    }
  }

  /**
   * Optimize context window by removing less relevant messages
   */
  public optimizeContextWindow(
    contextWindow: ContextWindow,
    targetTokens: number
  ): ContextWindow {
    if (contextWindow.totalTokens <= targetTokens) {
      return contextWindow;
    }

    // Sort messages by importance and recency
    const sortedMessages = [...contextWindow.messages].sort((a, b) => {
      const aScore = a.importance + (a.contextRelevant ? 0.2 : 0);
      const bScore = b.importance + (b.contextRelevant ? 0.2 : 0);
      return bScore - aScore;
    });

    // Select messages that fit within token limit
    const optimizedMessages: ConversationMessage[] = [];
    let totalTokens = 0;

    for (const message of sortedMessages) {
      if (totalTokens + message.tokens <= targetTokens) {
        optimizedMessages.push(message);
        totalTokens += message.tokens;
      } else {
        break;
      }
    }

    // Re-sort by chronological order
    optimizedMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return {
      ...contextWindow,
      messages: optimizedMessages,
      totalTokens,
      relevanceScore: this.calculateRelevanceScore(optimizedMessages, '')
    };
  }

  /**
   * Merge context from multiple sources (thread + memory + topics)
   */
  public async createEnhancedContext(
    channelId: string,
    userId: string,
    guildId: string | undefined,
    currentMessage: string,
    options: SmartContextOptions
  ): Promise<string> {
    try {
      const contextParts: string[] = [];

      // 1. Get conversation context
      const contextWindow = await this.createContextWindow(
        channelId,
        userId,
        currentMessage,
        options
      );

      if (contextWindow && contextWindow.messages.length > 0) {
        const conversationContext = this.formatConversationContext(contextWindow);
        contextParts.push(`Recent conversation:\n${conversationContext}`);
      }

      // 2. Get user memory context
      if (options.includeUserMemory) {
        const memoryContext = await this.memoryService.getMemoryContext(userId, guildId);
        if (memoryContext && memoryContext.contextPrompt) {
          contextParts.push(`User context: ${memoryContext.contextPrompt}`);
        }
      }

      // 3. Add topic context if available
      if (options.includeTopics && contextWindow && contextWindow.topics.length > 0) {
        const topicContext = `Current topics: ${contextWindow.topics.join(', ')}`;
        contextParts.push(topicContext);
      }

      // 4. Add conversation summary if available
      if (contextWindow?.summary) {
        contextParts.push(`Conversation summary: ${contextWindow.summary}`);
      }

      const enhancedContext = contextParts.join('\n\n');

      logger.debug('Enhanced context created', {
        operation: 'enhanced-context',
        userId,
        channelId,
        metadata: {
          contextParts: contextParts.length,
          totalLength: enhancedContext.length,
          includesMemory: options.includeUserMemory,
          includesTopics: options.includeTopics
        }
      });

      return enhancedContext;

    } catch (error) {
      logger.error('Failed to create enhanced context', {
        operation: 'enhanced-context',
        userId,
        channelId,
        error: String(error)
      });
      return '';
    }
  }

  /**
   * Calculate context relevance score
   */
  private calculateRelevanceScore(
    messages: ConversationMessage[],
    currentMessage: string
  ): number {
    if (messages.length === 0) return 0;

    const currentWords = new Set(
      currentMessage.toLowerCase().split(/\s+/).filter(w => w.length > 2)
    );

    let totalRelevance = 0;
    let weightSum = 0;

    for (const message of messages) {
      const messageWords = new Set(
        message.content.toLowerCase().split(/\s+/).filter(w => w.length > 2)
      );

      // Calculate word overlap
      const intersection = new Set([...currentWords].filter(w => messageWords.has(w)));
      const wordRelevance = intersection.size / Math.max(currentWords.size, messageWords.size);

      // Weight by message importance and recency
      const recencyWeight = this.calculateRecencyWeight(message.createdAt);
      const weight = message.importance * recencyWeight;

      totalRelevance += wordRelevance * weight;
      weightSum += weight;
    }

    return weightSum > 0 ? totalRelevance / weightSum : 0;
  }

  /**
   * Calculate recency weight for a message
   */
  private calculateRecencyWeight(messageTime: Date): number {
    const hoursAgo = (Date.now() - messageTime.getTime()) / (1000 * 60 * 60);
    return Math.exp(-hoursAgo / 24); // Exponential decay over 24 hours
  }

  /**
   * Extract unique topics from messages
   */
  private extractTopicsFromMessages(messages: ConversationMessage[]): string[] {
    const topicSet = new Set<string>();

    for (const message of messages) {
      if (message.topicTags) {
        for (const topic of message.topicTags) {
          topicSet.add(topic);
        }
      }
    }

    return Array.from(topicSet);
  }

  /**
   * Format conversation context for AI consumption
   */
  private formatConversationContext(contextWindow: ContextWindow): string {
    return contextWindow.messages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
  }

  /**
   * Generate summary of context messages
   */
  private async generateContextSummary(messages: ConversationMessage[]): Promise<string> {
    // Simple extractive summary - in production, use AI service
    const importantMessages = messages
      .filter(msg => msg.importance > 0.7)
      .slice(0, 3);

    if (importantMessages.length === 0) return '';

    return `Key points: ${importantMessages
      .map(msg => msg.content.substring(0, 100))
      .join('; ')
    }...`;
  }

  /**
   * Select best strategy based on options
   */
  private selectStrategy(options: SmartContextOptions): ContextSelectionStrategy {
    if (options.prioritizeRecent) {
      return this.strategies.get('recent')!;
    } else if (options.importanceThreshold && options.importanceThreshold > 0.5) {
      return this.strategies.get('importance')!;
    } else if (options.topicRelevanceThreshold && options.topicRelevanceThreshold > 0) {
      return this.strategies.get('topic-relevance')!;
    } else {
      return this.strategies.get('balanced')!;
    }
  }

  /**
   * Initialize context selection strategies
   */
  private initializeStrategies(): void {
    // Recent messages strategy
    this.strategies.set('recent', {
      name: 'Recent Messages',
      description: 'Prioritize most recent messages',
      selectMessages: (messages, _currentMessage, options) => {
        const sorted = [...messages].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        if (options.maxMessages) {
          return sorted.slice(0, options.maxMessages);
        }
        
        // Select by token limit
        const selected: ConversationMessage[] = [];
        let tokenCount = 0;
        
        for (const message of sorted) {
          if (tokenCount + message.tokens <= options.maxTokens) {
            selected.push(message);
            tokenCount += message.tokens;
          } else {
            break;
          }
        }
        
        return selected.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
    });

    // Importance-based strategy
    this.strategies.set('importance', {
      name: 'Importance Based',
      description: 'Select most important messages',
      selectMessages: (messages, _currentMessage, options) => {
        const threshold = options.importanceThreshold || 0.5;
        const filtered = messages.filter(msg => 
          msg.importance >= threshold && msg.contextRelevant
        );
        
        const sorted = filtered.sort((a, b) => b.importance - a.importance);
        
        if (options.maxMessages) {
          return sorted.slice(0, options.maxMessages);
        }
        
        // Select by token limit
        const selected: ConversationMessage[] = [];
        let tokenCount = 0;
        
        for (const message of sorted) {
          if (tokenCount + message.tokens <= options.maxTokens) {
            selected.push(message);
            tokenCount += message.tokens;
          } else {
            break;
          }
        }
        
        return selected.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
    });

    // Topic relevance strategy
    this.strategies.set('topic-relevance', {
      name: 'Topic Relevance',
      description: 'Select messages relevant to current topics',
      selectMessages: (messages, currentMessage, options) => {
        // Extract keywords from current message
        const currentWords = new Set(
          currentMessage.toLowerCase().split(/\s+/).filter(w => w.length > 2)
        );
        
        // Score messages by topic relevance
        const scored = messages.map(msg => {
          let relevanceScore = 0;
          
          // Topic tag relevance
          if (msg.topicTags) {
            relevanceScore += 0.3;
          }
          
          // Content relevance
          const messageWords = new Set(
            msg.content.toLowerCase().split(/\s+/).filter(w => w.length > 2)
          );
          const intersection = new Set([...currentWords].filter(w => messageWords.has(w)));
          const wordRelevance = intersection.size / Math.max(currentWords.size, messageWords.size);
          relevanceScore += wordRelevance * 0.7;
          
          return { message: msg, score: relevanceScore };
        });
        
        const threshold = options.topicRelevanceThreshold || 0.1;
        const filtered = scored
          .filter(item => item.score >= threshold)
          .sort((a, b) => b.score - a.score);
        
        if (options.maxMessages) {
          return filtered.slice(0, options.maxMessages).map(item => item.message);
        }
        
        // Select by token limit
        const selected: ConversationMessage[] = [];
        let tokenCount = 0;
        
        for (const item of filtered) {
          if (tokenCount + item.message.tokens <= options.maxTokens) {
            selected.push(item.message);
            tokenCount += item.message.tokens;
          } else {
            break;
          }
        }
        
        return selected.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
    });

    // Balanced strategy
    this.strategies.set('balanced', {
      name: 'Balanced Selection',
      description: 'Balance recency, importance, and relevance',
      selectMessages: (messages, currentMessage, options) => {
        const currentWords = new Set(
          currentMessage.toLowerCase().split(/\s+/).filter(w => w.length > 2)
        );
        
        // Calculate composite score for each message
        const scored = messages.map(msg => {
          let score = 0;
          
          // Importance component (40%)
          score += msg.importance * 0.4;
          
          // Recency component (30%)
          const recencyWeight = this.calculateRecencyWeight(msg.createdAt);
          score += recencyWeight * 0.3;
          
          // Relevance component (30%)
          const messageWords = new Set(
            msg.content.toLowerCase().split(/\s+/).filter(w => w.length > 2)
          );
          const intersection = new Set([...currentWords].filter(w => messageWords.has(w)));
          const wordRelevance = intersection.size / Math.max(currentWords.size, messageWords.size);
          score += wordRelevance * 0.3;
          
          return { message: msg, score };
        });
        
        const sorted = scored
          .filter(item => item.message.contextRelevant)
          .sort((a, b) => b.score - a.score);
        
        if (options.maxMessages) {
          return sorted.slice(0, options.maxMessages).map(item => item.message);
        }
        
        // Select by token limit
        const selected: ConversationMessage[] = [];
        let tokenCount = 0;
        
        for (const item of sorted) {
          if (tokenCount + item.message.tokens <= options.maxTokens) {
            selected.push(item.message);
            tokenCount += item.message.tokens;
          } else {
            break;
          }
        }
        
        return selected.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
    });
  }
}
