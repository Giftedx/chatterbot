import { Part } from '@google/generative-ai';
import { logger } from '../utils/logger.js';
import { ValidationError, SystemError } from '../utils/errors.js';
import { CacheService } from './cache.service.js';
import { CacheKeyGenerator, CacheableContent } from '../utils/cache-key-generator.js';
import { CachePolicyManager } from '../config/cache-policies.js';
import { CacheMetrics } from '../utils/cache-metrics.js';

// Gemini chat message structure
export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  parts: Part[];
}

// Enhanced conversation metadata for intelligent caching
export interface ConversationMetadata {
  channelId: string;
  lastActivity: number;
  messageCount: number;
  multimodalCount: number;
  totalSize: number;
  priority: 'high' | 'medium' | 'low';
  guildId?: string;
  userId?: string;
  conversationType: 'direct' | 'channel' | 'thread';
}

/**
 * Enhanced ContextManager with intelligent conversation caching.
 * Integrates with cache infrastructure for persistent conversation storage
 * and provides advanced conversation management capabilities.
 */
export class ContextManager {
  private readonly MAX_HISTORY_LENGTH = 20;
  private readonly MAX_IMAGE_HISTORY_SIZE = 10;
  private readonly CONVERSATION_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly HIGH_PRIORITY_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days for high priority

  // Enhanced cache infrastructure
  private readonly cacheService: CacheService;
  private readonly cacheKeyGenerator: CacheKeyGenerator;
  private readonly cachePolicyManager: CachePolicyManager;
  private readonly cacheMetrics: CacheMetrics;

  // In-memory cache for frequently accessed conversations
  public cache: Map<string, ChatMessage[]> = new Map();
  private metadata: Map<string, ConversationMetadata> = new Map();

  constructor() {
    // Initialize cache infrastructure
    this.cacheService = new CacheService({
      maxSize: 1000,
      maxMemory: 50 * 1024 * 1024, // 50MB
      defaultTtl: this.CONVERSATION_TTL,
      enableMetrics: true
    });
    this.cacheKeyGenerator = new CacheKeyGenerator();
    this.cacheMetrics = new CacheMetrics();
    this.cachePolicyManager = new CachePolicyManager();

    // Add conversation-specific cache policies after initialization
    try {
      this.cachePolicyManager.addPolicy({
        name: 'conversation-high-priority',
        description: 'High priority conversations with extended TTL',
        ttl: this.HIGH_PRIORITY_TTL,
        priority: 1,
        adaptive: true,
        conditions: [{
          type: 'user-context',
          operator: 'equals',
          value: 'high',
          weight: 1.0
        }]
      });

      this.cachePolicyManager.addPolicy({
        name: 'conversation-active',
        description: 'Recently active conversations',
        ttl: this.CONVERSATION_TTL,
        priority: 2,
        adaptive: true,
        conditions: [{
          type: 'time-of-day',
          operator: 'less-than',
          value: 60 * 60 * 1000, // Active within last hour
          weight: 0.8
        }]
      });

      this.cachePolicyManager.addPolicy({
        name: 'conversation-multimodal',
        description: 'Conversations with multimodal content',
        ttl: this.CONVERSATION_TTL * 2,
        priority: 3,
        adaptive: false,
        conditions: [{
          type: 'content-type',
          operator: 'equals',
          value: 'multimodal',
          weight: 0.9
        }]
      });

      this.cachePolicyManager.addPolicy({
        name: 'conversation-default',
        description: 'Default conversation caching policy',
        ttl: this.CONVERSATION_TTL,
        priority: 10,
        adaptive: true,
        conditions: []
      });
    } catch (error) {
      logger.warn('Failed to add custom cache policies, using defaults', {
        operation: 'context-manager-init',
        metadata: { error: String(error) }
      });
    }

    logger.info('ContextManager initialized with cache infrastructure', {
      operation: 'context-manager-init',
      metadata: {
        maxHistoryLength: this.MAX_HISTORY_LENGTH,
        maxImageHistorySize: this.MAX_IMAGE_HISTORY_SIZE,
        defaultTTL: `${this.CONVERSATION_TTL / 1000}s`
      }
    });
  }

  /** 
   * Get history array for channel with intelligent caching.
   * First checks in-memory cache, then persistent cache, returns empty array if none.
   */
  public async getHistory(channelId: string): Promise<ChatMessage[]> {
    try {
      // First check in-memory cache
      const memoryHistory = this.cache.get(channelId);
      if (memoryHistory) {
        this.updateMetadata(channelId, memoryHistory);
        return memoryHistory;
      }

      // Check persistent cache
      const cacheKey = this.generateConversationCacheKey(channelId);
      const persistentHistory = await this.cacheService.get<ChatMessage[]>(cacheKey);
      
      if (persistentHistory) {
        // Load into memory for faster access
        this.cache.set(channelId, persistentHistory);
        this.updateMetadata(channelId, persistentHistory);
        
        logger.debug('Conversation loaded from persistent cache', {
          channelId,
          operation: 'conversation-load',
          metadata: {
            cacheKey: cacheKey.substring(0, 16) + '...',
            messageCount: persistentHistory.length
          }
        });
        
        return persistentHistory;
      }

      // No history found
      return [];
    } catch (error) {
      logger.error('Failed to retrieve conversation history', {
        channelId,
        operation: 'conversation-load',
        metadata: { error: String(error) }
      });
      
      // Fallback to memory cache only
      return this.cache.get(channelId) || [];
    }
  }

  /**
   * Synchronous version for backward compatibility
   */
  public getHistorySync(channelId: string): ChatMessage[] {
    return this.cache.get(channelId) || [];
  }

  /**
   * Generate cache key for conversation persistence
   */
  private generateConversationCacheKey(channelId: string): string {
    const content: CacheableContent = {
      type: 'text',
      text: `conversation:${channelId}`,
      metadata: {
        channelId,
        operation: 'conversation-storage',
        contentType: 'conversation'
      }
    };
    
    return this.cacheKeyGenerator.generateKey(content, { includeMetadata: true });
  }

  /**
   * Update conversation metadata for analytics and caching decisions
   */
  private updateMetadata(channelId: string, history: ChatMessage[]): void {
    const now = Date.now();
    const multimodalCount = history.filter(msg => 
      msg.parts.some(part => 'inlineData' in part || 'fileData' in part)
    ).length;

    const totalSize = this.calculateConversationSize(history);
    
    this.metadata.set(channelId, {
      channelId,
      lastActivity: now,
      messageCount: history.length,
      multimodalCount,
      totalSize,
      priority: this.calculatePriority(history, multimodalCount),
      conversationType: this.detectConversationType(channelId)
    });
  }

  /**
   * Calculate conversation priority based on content and activity
   */
  private calculatePriority(history: ChatMessage[], multimodalCount: number): 'high' | 'medium' | 'low' {
    const messageCount = history.length;
    
    // High priority: Long conversations with multimodal content
    if (messageCount > 15 && multimodalCount > 3) return 'high';
    
    // Medium priority: Either long conversations OR multimodal content
    if (messageCount > 10 || multimodalCount > 1) return 'medium';
    
    // Low priority: Short, text-only conversations
    return 'low';
  }

  /**
   * Detect conversation type based on channel ID patterns
   */
  private detectConversationType(channelId: string): 'direct' | 'channel' | 'thread' {
    // This is a simplified detection - could be enhanced with actual Discord API data
    if (channelId.includes('dm-') || channelId.length < 10) return 'direct';
    if (channelId.includes('thread-')) return 'thread';
    return 'channel';
  }

  /**
   * Calculate conversation size in bytes for memory management
   */
  private calculateConversationSize(history: ChatMessage[]): number {
    return history.reduce((size, message) => {
      return size + message.parts.reduce((partSize, part) => {
        if ('text' in part) {
          return partSize + (part.text?.length || 0) * 2; // 2 bytes per character
        } else if ('inlineData' in part) {
          return partSize + (part.inlineData?.data?.length || 0); // Base64 size
        }
        return partSize;
      }, 0);
    }, 0);
  }

  /**
   * Append a user/bot exchange to history with multimodal support and intelligent caching.
   * Supports both text-only and mixed content (text + images).
   */
  public async updateHistoryWithParts(channelId: string, userParts: Part[], botResponse: string): Promise<void> {
    try {
      if (!channelId) {
        throw new ValidationError('Channel ID is required for context updates', 'channelId');
      }

      if (!Array.isArray(userParts) || userParts.length === 0) {
        throw new ValidationError('User parts must be a non-empty array', 'userParts');
      }

      if (!botResponse || typeof botResponse !== 'string') {
        throw new ValidationError('Bot response must be a non-empty string', 'botResponse');
      }

      const history = this.getHistorySync(channelId); // Use sync version for modification

      // Add user message with parts (can include images)
      history.push({ role: 'user', parts: userParts } as ChatMessage);
      
      // Add bot response (currently text-only)
      history.push({ role: 'model', parts: [{ text: botResponse }] } as ChatMessage);

      // Memory management: limit multimodal messages to prevent excessive memory usage
      const multimodalCount = history.filter((msg: ChatMessage) => 
        msg.parts.some((part: Part) => 'inlineData' in part || 'fileData' in part)
      ).length;
      
      if (multimodalCount > this.MAX_IMAGE_HISTORY_SIZE) {
        // Remove oldest multimodal messages first, keeping text-only history longer
        for (let i = 0; i < history.length && multimodalCount > this.MAX_IMAGE_HISTORY_SIZE; i++) {
          if (history[i].parts.some((part: Part) => 'inlineData' in part || 'fileData' in part)) {
            history.splice(i, 1);
            i--; // Adjust index after removal
          }
        }
      }

      // Standard pruning: limit total message pairs
      const maxParts = this.MAX_HISTORY_LENGTH * 2;
      if (history.length > maxParts) {
        history.splice(0, history.length - maxParts);
      }

      // Update in-memory cache
      this.cache.set(channelId, history);

      // Persist to cache with intelligent policy evaluation
      await this.persistConversation(channelId, history);

      // Update metadata for analytics
      this.updateMetadata(channelId, history);

      logger.debug('Context updated successfully', { 
        channelId, 
        operation: 'context-update',
        metadata: { 
          historyLength: history.length,
          multimodalCount,
          hasImages: userParts.some((part: Part) => 'inlineData' in part || 'fileData' in part)
        }
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        logger.warn('Context update validation failed', { 
          channelId, 
          operation: 'context-update',
          metadata: { error: error.message }
        });
        throw error;
      }

      const systemError = new SystemError(
        `Failed to update context for channel ${channelId}`,
        'high'
      );
      
      logger.error('Context update system error', { 
        channelId, 
        operation: 'context-update',
        metadata: { originalError: String(error) }
      });
      
      throw systemError;
    }
  }

  /**
   * Persist conversation to cache with intelligent policy evaluation
   */
  private async persistConversation(channelId: string, history: ChatMessage[]): Promise<void> {
    try {
      const content: CacheableContent = {
        type: 'text',
        text: `conversation:${channelId}`,
        metadata: {
          channelId,
          messageCount: history.length,
          multimodalCount: history.filter((msg: ChatMessage) => 
            msg.parts.some((part: Part) => 'inlineData' in part || 'fileData' in part)
          ).length,
          lastActivity: Date.now(),
          totalSize: this.calculateConversationSize(history)
        }
      };

      // Evaluate cache policy for this conversation
      const policy = this.cachePolicyManager.evaluatePolicy(content, { channelId });
      const shouldCache = policy.ttl > 0;

      if (shouldCache) {
        const cacheKey = this.generateConversationCacheKey(channelId);
        await this.cacheService.set(cacheKey, history, policy.ttl);

        logger.debug('Conversation persisted to cache', {
          channelId,
          operation: 'conversation-persist',
          metadata: {
            cacheKey: cacheKey.substring(0, 16) + '...',
            messageCount: history.length,
            ttl: `${policy.ttl / 1000}s`,
            policy: policy.name
          }
        });
      }
    } catch (error) {
      logger.error('Failed to persist conversation', {
        channelId,
        operation: 'conversation-persist',
        metadata: { error: String(error) }
      });
      // Don't throw - persistence failure shouldn't break conversation flow
    }
  }

  /**
   * Append a user/bot exchange to history (text-only, backward compatible).
   */
  public async updateHistory(channelId: string, userPrompt: string, botResponse: string): Promise<void> {
    return this.updateHistoryWithParts(channelId, [{ text: userPrompt }], botResponse);
  }

  /**
   * Clean up inactive channels with intelligent cache policy evaluation.
   */
  public async cleanupInactiveChannels(): Promise<number> {
    try {
      const channelsToClean: string[] = [];
      const now = Date.now();
      
      // Enhanced cleanup based on metadata and cache policies
      for (const [channelId, metadata] of Array.from(this.metadata.entries())) {
        const timeSinceLastActivity = now - metadata.lastActivity;
        
        // Clean based on priority and activity
        const shouldClean = (
          (metadata.priority === 'low' && timeSinceLastActivity > this.CONVERSATION_TTL) ||
          (metadata.priority === 'medium' && timeSinceLastActivity > this.CONVERSATION_TTL * 2) ||
          (metadata.priority === 'high' && timeSinceLastActivity > this.HIGH_PRIORITY_TTL)
        );
        
        if (shouldClean) {
          channelsToClean.push(channelId);
        }
      }

      // Additional size-based cleanup for memory management
      if (this.cache.size > 1000) {
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].length - b[1].length);
        
        const additionalToRemove = Math.floor(this.cache.size * 0.1);
        for (let i = 0; i < additionalToRemove; i++) {
          const channelId = entries[i][0];
          if (!channelsToClean.includes(channelId)) {
            channelsToClean.push(channelId);
          }
        }
      }

      // Perform cleanup
      for (const channelId of channelsToClean) {
        this.cache.delete(channelId);
        this.metadata.delete(channelId);
        
        // Also remove from persistent cache
        const cacheKey = this.generateConversationCacheKey(channelId);
        await this.cacheService.delete(cacheKey);
      }
      
      if (channelsToClean.length > 0) {
        logger.info('Context cleanup completed', { 
          operation: 'context-cleanup',
          metadata: { 
            channelsRemoved: channelsToClean.length,
            totalChannels: this.cache.size,
            cleanupThreshold: 1000
          }
        });
      }
      
      return channelsToClean.length;
    } catch (error) {
      const systemError = new SystemError(
        'Failed to cleanup inactive channels',
        'medium'
      );
      
      logger.error('Context cleanup failed', { 
        operation: 'context-cleanup',
        metadata: { 
          originalError: String(error),
          cacheSize: this.cache.size
        }
      });
      
      throw systemError;
    }
  }

  /**
   * Get conversation analytics and metrics
   */
  public getConversationAnalytics(): {
    totalConversations: number;
    activeConversations: number;
    conversationsByType: Record<string, number>;
    conversationsByPriority: Record<string, number>;
    totalMemoryUsage: number;
    averageConversationLength: number;
    multimodalConversations: number;
  } {
    const now = Date.now();
    const activeThreshold = 60 * 60 * 1000; // 1 hour
    
    let totalMemoryUsage = 0;
    let totalMessages = 0;
    let multimodalCount = 0;
    
    const conversationsByType: Record<string, number> = {};
    const conversationsByPriority: Record<string, number> = {};
    
    for (const metadata of this.metadata.values()) {
      totalMemoryUsage += metadata.totalSize;
      totalMessages += metadata.messageCount;
      
      if (metadata.multimodalCount > 0) {
        multimodalCount++;
      }
      
      conversationsByType[metadata.conversationType] = 
        (conversationsByType[metadata.conversationType] || 0) + 1;
      
      conversationsByPriority[metadata.priority] = 
        (conversationsByPriority[metadata.priority] || 0) + 1;
    }
    
    const activeConversations = Array.from(this.metadata.values()).filter(
      metadata => now - metadata.lastActivity < activeThreshold
    ).length;
    
    return {
      totalConversations: this.cache.size,
      activeConversations,
      conversationsByType,
      conversationsByPriority,
      totalMemoryUsage,
      averageConversationLength: totalMessages / Math.max(this.cache.size, 1),
      multimodalConversations: multimodalCount
    };
  }
}

// ----------------- Singleton & helper exports -----------------
export const contextManager = new ContextManager();

// Async exports for enhanced functionality
export const getHistory = (channelId: string) => contextManager.getHistory(channelId);
export const updateHistory = (channelId: string, prompt: string, response: string) =>
  contextManager.updateHistory(channelId, prompt, response);
export const updateHistoryWithParts = (channelId: string, userParts: Part[], botResponse: string) =>
  contextManager.updateHistoryWithParts(channelId, userParts, botResponse);
export const cleanupInactiveChannels = () => contextManager.cleanupInactiveChannels();

// Sync exports for backward compatibility
export const getHistorySync = (channelId: string) => contextManager.getHistorySync(channelId);
export const getConversationAnalytics = () => contextManager.getConversationAnalytics();

export default contextManager;
