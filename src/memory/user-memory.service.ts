/**
 * User Memory Service
 * Core service for managing user memories, preferences, and context
 */

import { prisma } from '../db/prisma.js';
import { 
  UserMemory, 
  UserMemoryData, 
  UserPreferences, 
  MemoryContext, 
  MemorySummary,
  MemoryPromptContext 
} from './types.js';
import { MemoryExtractionService } from './extraction.service.js';
import { logger } from '../utils/logger.js';

/**
 * Service for managing user memories and preferences
 */
export class UserMemoryService {
  private readonly extractionService: MemoryExtractionService;
  private readonly maxMemoriesPerUser = 100;
  private readonly memoryExpirationDays = 90;

  constructor() {
    this.extractionService = new MemoryExtractionService();
  }

  /**
   * Get user memory for a specific user and guild
   */
  public async getUserMemory(userId: string, guildId?: string): Promise<UserMemory | null> {
    try {
      // Use a more flexible query pattern to handle null vs empty string issues
      const memory = await prisma.userMemory.findFirst({
        where: {
          userId,
          guildId: guildId || ''
        }
      });

      if (!memory) return null;

      return {
        userId: memory.userId,
        guildId: memory.guildId || undefined,
        memories: JSON.parse(memory.memories) as UserMemoryData,
        preferences: memory.preferences ? JSON.parse(memory.preferences) as UserPreferences : {},
        summary: memory.summary || undefined,
        lastUpdated: memory.lastUpdated,
        memoryCount: memory.memoryCount,
        tokenCount: memory.tokenCount
      };
    } catch (error) {
      logger.error('Failed to retrieve user memory', {
        operation: 'memory-retrieval',
        userId,
        guildId,
        error: String(error)
      });
      return null;
    }
  }

  /**
   * Get or create user memory for a specific user and guild
   */
  public async getOrCreateUserMemory(userId: string, guildId?: string): Promise<UserMemory> {
    try {
      const existing = await this.getUserMemory(userId, guildId);
      if (existing) {
        return existing;
      }

      // Create new user memory with default values
      const defaultUserMemory: UserMemory = {
        userId,
        guildId,
        memories: {},
        preferences: {},
        summary: 'New user - no conversation history yet',
        lastUpdated: new Date(),
        memoryCount: 0,
        tokenCount: 0
      };

      // Save to database
      await prisma.userMemory.create({
        data: {
          userId,
          guildId: guildId ?? null,
          memories: JSON.stringify({}),
          preferences: JSON.stringify({}),
          summary: defaultUserMemory.summary,
          lastUpdated: new Date(),
          memoryCount: 0,
          tokenCount: 0
        }
      });

      logger.info('Created new user memory', {
        operation: 'memory-create',
        userId,
        guildId
      });

      return defaultUserMemory;
    } catch (error) {
      logger.error('Failed to get or create user memory', {
        operation: 'memory-get-or-create',
        userId,
        guildId,
        error: String(error)
      });
      throw error;
    }
  }

  /**
   * Update user memory with new information
   */
  public async updateUserMemory(
    userId: string, 
    memories: Partial<UserMemoryData>, 
    preferences: Partial<UserPreferences>,
    guildId?: string
  ): Promise<boolean> {
    try {
      const existing = await this.getUserMemory(userId, guildId);
      
      // Filter out undefined values to match UserMemoryData type
      const filteredMemories = Object.fromEntries(
        Object.entries(memories).filter(([, value]) => value !== undefined)
      ) as UserMemoryData;
      
      const filteredPreferences = Object.fromEntries(
        Object.entries(preferences).filter(([, value]) => value !== undefined)
      ) as Partial<UserPreferences>;

      const updatedMemories: UserMemoryData = { ...existing?.memories || {}, ...filteredMemories };
      const updatedPreferences: UserPreferences = { ...existing?.preferences || {}, ...filteredPreferences };
      
      // Generate summary
      const summary = this.generateMemorySummary(updatedMemories, updatedPreferences);
      const memoryCount = Object.keys(updatedMemories).length;
      const tokenCount = this.estimateTokenCount(updatedMemories, updatedPreferences);

      await prisma.userMemory.upsert({
        where: {
          userId_guildId: {
            userId,
            guildId: guildId || ''
          }
        },
        update: {
          memories: JSON.stringify(updatedMemories),
          preferences: JSON.stringify(updatedPreferences),
          summary,
          lastUpdated: new Date(),
          memoryCount,
          tokenCount
        },
        create: {
          userId,
          guildId: guildId || '',
          memories: JSON.stringify(updatedMemories),
          preferences: JSON.stringify(updatedPreferences),
          summary,
          lastUpdated: new Date(),
          memoryCount,
          tokenCount
        }
      });

      logger.info('User memory updated', {
        operation: 'memory-update',
        userId,
        guildId,
        metadata: {
          memoriesAdded: Object.keys(memories).length,
          preferencesAdded: Object.keys(preferences).length,
          totalMemories: memoryCount,
          tokenCount
        }
      });

      return true;
    } catch (error) {
      logger.error('Failed to update user memory', {
        operation: 'memory-update',
        userId,
        guildId,
        error: String(error)
      });
      return false;
    }
  }

  /**
   * Extract and store memory from content
   * Implements the interface required by CrossSessionLearningEngine
   */
  public async extractAndStoreMemory(userId: string, content: string, guildId?: string): Promise<void> {
    try {
      // Special handling for session insights
      if (content.startsWith('Session insights:')) {
        const insights = content.replace('Session insights: ', '');
        if (!insights) return;

        // Retrieve existing memory to append insights
        const existing = await this.getUserMemory(userId, guildId);
        let currentInsights = (existing?.memories['session_insights'] as string) || '';

        // Append new insights with a delimiter if there are existing ones
        if (currentInsights) {
          currentInsights += ' | ';
        }
        currentInsights += insights;

        // Store updated insights
        await this.updateUserMemory(
          userId,
          { session_insights: currentInsights },
          {},
          guildId
        );

        logger.info('Session insights stored', {
          userId,
          guildId,
          insightsLength: insights.length
        });
        return;
      }

      // Default behavior: Process as conversation
      const context: MemoryContext = {
        userId,
        guildId,
        messageContent: content,
        responseContent: ''
      };

      await this.processConversation(context);
    } catch (error) {
      logger.error('Failed to extract and store memory', {
        operation: 'extract-and-store',
        userId,
        guildId,
        error: String(error)
      });
    }
  }

  /**
   * Process conversation for memory extraction
   */
  public async processConversation(context: MemoryContext): Promise<boolean> {
    try {
      const extractionResult = this.extractionService.extractFromConversation(context);
      
      // Only proceed if we extracted meaningful information
      if (extractionResult.confidence < 0.3 || 
          (Object.keys(extractionResult.memories).length === 0 && 
           Object.keys(extractionResult.preferences).length === 0)) {
        return false;
      }

      const success = await this.updateUserMemory(
        context.userId,
        extractionResult.memories,
        extractionResult.preferences,
        context.guildId
      );

      if (success) {
        logger.debug('Conversation processed for memory extraction', {
          operation: 'memory-extraction',
          userId: context.userId,
          guildId: context.guildId,
          metadata: {
            confidence: extractionResult.confidence,
            memoriesExtracted: Object.keys(extractionResult.memories).length,
            preferencesExtracted: Object.keys(extractionResult.preferences).length
          }
        });
      }

      return success;
    } catch (error) {
      logger.error('Failed to process conversation for memory', {
        operation: 'memory-extraction',
        userId: context.userId,
        guildId: context.guildId,
        error: String(error)
      });
      return false;
    }
  }

  /**
   * Get memory context for prompt enhancement
   */
  public async getMemoryContext(userId: string, guildId?: string): Promise<MemoryPromptContext | null> {
    try {
      const memory = await this.getUserMemory(userId, guildId);
      if (!memory || memory.memoryCount === 0) return null;

      return {
        userProfile: this.buildUserProfile(memory.memories),
        preferences: memory.preferences || {},
        contextPrompt: this.buildContextPrompt(memory.memories, memory.preferences || {}),
        lastUpdated: memory.lastUpdated
      };
    } catch (error) {
      logger.error('Failed to get memory context', {
        operation: 'memory-context',
        userId,
        guildId,
        error: String(error)
      });
      return null;
    }
  }

  /**
   * Delete specific memory types for a user
   */
  public async deleteUserMemories(
    userId: string, 
    memoryTypes: string[], 
    guildId?: string
  ): Promise<boolean> {
    try {
      const existing = await this.getUserMemory(userId, guildId);
      if (!existing) return false;

      const updatedMemories = { ...existing.memories };
      for (const type of memoryTypes) {
        delete updatedMemories[type];
      }

      const summary = this.generateMemorySummary(updatedMemories, existing.preferences || {});
      const memoryCount = Object.keys(updatedMemories).length;
      const tokenCount = this.estimateTokenCount(updatedMemories, existing.preferences || {});

      await prisma.userMemory.update({
        where: {
          userId_guildId: {
            userId,
            guildId: guildId || ''
          }
        },
        data: {
          memories: JSON.stringify(updatedMemories),
          summary,
          lastUpdated: new Date(),
          memoryCount,
          tokenCount
        }
      });

      logger.info('User memories deleted', {
        operation: 'memory-deletion',
        userId,
        guildId,
        metadata: {
          deletedTypes: memoryTypes,
          remainingMemories: memoryCount
        }
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete user memories', {
        operation: 'memory-deletion',
        userId,
        guildId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * Delete all memories for a user
   */
  public async deleteAllUserMemories(userId: string, guildId?: string): Promise<boolean> {
    try {
      await prisma.userMemory.delete({
        where: {
          userId_guildId: {
            userId,
            guildId: guildId || ''
          }
        }
      });

      logger.info('All user memories deleted', {
        operation: 'memory-deletion-all',
        userId,
        guildId
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete all user memories', {
        operation: 'memory-deletion-all',
        userId,
        guildId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * Get memory statistics for a user
   */
  public async getUserMemoryStats(userId: string, guildId?: string): Promise<MemorySummary | null> {
    try {
      const memory = await this.getUserMemory(userId, guildId);
      if (!memory) return null;

      return {
        memoryCount: memory.memoryCount,
        tokenCount: memory.tokenCount,
        lastUpdated: memory.lastUpdated,
        memoryTypes: Object.keys(memory.memories),
        hasPreferences: Object.keys(memory.preferences || {}).length > 0,
        summary: memory.summary || 'No summary available'
      };
    } catch (error) {
      logger.error('Failed to get user memory stats', {
        operation: 'memory-stats',
        userId,
        guildId,
        error: String(error)
      });
      return null;
    }
  }

  /**
   * Clean up expired memories
   */
  public async cleanupExpiredMemories(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.memoryExpirationDays);

      const result = await prisma.userMemory.deleteMany({
        where: {
          lastUpdated: {
            lt: cutoffDate
          }
        }
      });

      logger.info('Expired memories cleaned up', {
        operation: 'memory-cleanup',
        metadata: {
          deletedCount: result.count,
          cutoffDate: cutoffDate.toISOString()
        }
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup expired memories', {
        operation: 'memory-cleanup',
        error: String(error)
      });
      return 0;
    }
  }

  /**
   * Generate memory summary from user data
   */
  private generateMemorySummary(memories: UserMemoryData, preferences: UserPreferences): string {
    const parts: string[] = [];

    if (memories.name) parts.push(`Name: ${memories.name}`);
    if (memories.role) parts.push(`Role: ${memories.role}`);
    if (memories.location) parts.push(`Location: ${memories.location}`);
    if (memories.programmingLanguages) parts.push(`Languages: ${memories.programmingLanguages}`);
    if (preferences.communicationStyle) parts.push(`Style: ${preferences.communicationStyle}`);
    if (preferences.helpLevel) parts.push(`Level: ${preferences.helpLevel}`);

    return parts.join(' | ') || 'No specific information stored';
  }

  /**
   * Estimate token count for memory data
   */
  private estimateTokenCount(memories: UserMemoryData, preferences: UserPreferences): number {
    const memoryText = Object.values(memories).join(' ');
    const preferenceText = Object.values(preferences).join(' ');
    const fullText = memoryText + ' ' + preferenceText;
    
    // Rough estimate: ~4 characters per token
    return Math.ceil(fullText.length / 4);
  }

  /**
   * Build user profile string from memories
   */
  private buildUserProfile(memories: UserMemoryData): string {
    const profile: string[] = [];

    if (memories.name) profile.push(`User's name is ${memories.name}`);
    if (memories.role) profile.push(`Works as a ${memories.role}`);
    if (memories.location) profile.push(`Located in ${memories.location}`);
    if (memories.programmingLanguages) profile.push(`Uses ${memories.programmingLanguages}`);
    if (memories.currentProject) profile.push(`Currently working on: ${memories.currentProject}`);
    if (memories.learningGoals) profile.push(`Learning: ${memories.learningGoals}`);

    return profile.length > 0 ? profile.join('. ') + '.' : '';
  }

  /**
   * Build context prompt for Gemini integration
   */
  private buildContextPrompt(memories: UserMemoryData, preferences: UserPreferences): string {
    const context: string[] = [];

    // Add user profile
    const profile = this.buildUserProfile(memories);
    if (profile) context.push(`User context: ${profile}`);

    // Add preferences
    if (preferences.communicationStyle) {
      context.push(`Communication style: ${preferences.communicationStyle}`);
    }
    if (preferences.helpLevel) {
      context.push(`Experience level: ${preferences.helpLevel}`);
    }
    if (preferences.responseLength) {
      context.push(`Prefers ${preferences.responseLength} responses`);
    }
    if (preferences.includeExamples) {
      context.push('Include code examples when relevant');
    }

    return context.length > 0 ? context.join('. ') + '.' : '';
  }
}
