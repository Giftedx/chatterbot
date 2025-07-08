/**
 * Cycle 13: Personal User Memory System Tests
 * Comprehensive test suite for user memory functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UserMemoryService } from '../user-memory.service.js';
import { MemoryExtractionService } from '../extraction.service.js';
import { prisma } from '../../db/prisma.js';

describe('Cycle 13: Personal User Memory System', () => {
  let userMemoryService: UserMemoryService;
  let extractionService: MemoryExtractionService;

  beforeEach(async () => {
    userMemoryService = new UserMemoryService();
    extractionService = new MemoryExtractionService();
    
    // Clean up any existing test data
    await prisma.userMemory.deleteMany({
      where: {
        userId: { startsWith: 'test-' }
      }
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.userMemory.deleteMany({
      where: {
        userId: { startsWith: 'test-' }
      }
    });
  });

  describe('Memory Extraction Service', () => {
    it('should extract user name from conversation', () => {
      const context = {
        userId: 'test-user-1',
        channelId: 'test-channel',
        messageContent: 'Hi, my name is John and I\'m a developer.',
        responseContent: 'Nice to meet you John!'
      };

      const result = extractionService.extractFromConversation(context);
      
      expect(result.memories.name).toBe('John');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should extract programming languages', () => {
      const context = {
        userId: 'test-user-2',
        channelId: 'test-channel',
        messageContent: 'I use Python and JavaScript for development.',
        responseContent: 'Great languages to work with!'
      };

      const result = extractionService.extractFromConversation(context);
      
      expect(result.memories.programmingLanguages).toContain('Python and JavaScript');
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('should extract communication style preferences', () => {
      const context = {
        userId: 'test-user-3',
        channelId: 'test-channel',
        messageContent: 'Please be more technical in your explanations.',
        responseContent: 'I\'ll provide more technical details.'
      };

      const result = extractionService.extractFromConversation(context);
      
      expect(result.preferences.communicationStyle).toBe('technical');
    });

    it('should extract experience level', () => {
      const context = {
        userId: 'test-user-4',
        channelId: 'test-channel',
        messageContent: 'I\'m a beginner at programming.',
        responseContent: 'I\'ll help you learn step by step.'
      };

      const result = extractionService.extractFromConversation(context);
      
      expect(result.preferences.helpLevel).toBe('beginner');
    });

    it('should handle low confidence extractions', () => {
      const context = {
        userId: 'test-user-5',
        channelId: 'test-channel',
        messageContent: 'What\'s the weather like?',
        responseContent: 'I don\'t have weather information.'
      };

      const result = extractionService.extractFromConversation(context);
      
      expect(result.confidence).toBeLessThan(0.3);
      expect(Object.keys(result.memories)).toHaveLength(0);
    });
  });

  describe('User Memory Service', () => {
    it('should create and retrieve user memory', async () => {
      const userId = 'test-user-6';
      const memories = { name: 'Alice', role: 'engineer' };
      const preferences = { communicationStyle: 'formal' as const };

      const success = await userMemoryService.updateUserMemory(userId, memories, preferences);
      expect(success).toBe(true);

      // Add small delay to ensure database write completes
      await new Promise(resolve => setTimeout(resolve, 100));

      const retrieved = await userMemoryService.getUserMemory(userId);
      
      // Debug logging
      console.log('Retrieved memory:', JSON.stringify(retrieved, null, 2));
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.memories.name).toBe('Alice');
      expect(retrieved?.preferences?.communicationStyle).toBe('formal');
    });

    it('should update existing memory', async () => {
      const userId = 'test-user-7';
      
      // Initial memory
      await userMemoryService.updateUserMemory(userId, { name: 'Bob' }, {});
      
      // Update with new information
      await userMemoryService.updateUserMemory(userId, { role: 'developer' }, { helpLevel: 'expert' as const });

      const memory = await userMemoryService.getUserMemory(userId);
      expect(memory?.memories.name).toBe('Bob');
      expect(memory?.memories.role).toBe('developer');
      expect(memory?.preferences?.helpLevel).toBe('expert');
    });

    it('should process conversation and extract memories', async () => {
      const context = {
        userId: 'test-user-8',
        channelId: 'test-channel',
        messageContent: 'My name is Charlie and I work with TypeScript.',
        responseContent: 'TypeScript is excellent for type safety!'
      };

      const success = await userMemoryService.processConversation(context);
      expect(success).toBe(true);

      const memory = await userMemoryService.getUserMemory(context.userId);
      expect(memory?.memories.name).toBe('Charlie');
      expect(memory?.memories.programmingLanguages).toContain('TypeScript');
    });

    it('should generate memory context for prompts', async () => {
      const userId = 'test-user-9';
      const memories = { 
        name: 'Diana',
        role: 'data scientist',
        programmingLanguages: 'Python, R'
      };
      const preferences = { 
        communicationStyle: 'technical' as const,
        helpLevel: 'expert' as const
      };

      await userMemoryService.updateUserMemory(userId, memories, preferences);
      
      const context = await userMemoryService.getMemoryContext(userId);
      expect(context).toBeDefined();
      expect(context?.userProfile).toContain('Diana');
      expect(context?.userProfile).toContain('data scientist');
      expect(context?.contextPrompt).toContain('technical');
      expect(context?.preferences.helpLevel).toBe('expert');
    });

    it('should delete specific memory types', async () => {
      const userId = 'test-user-10';
      const memories = { 
        name: 'Eve',
        role: 'designer',
        location: 'San Francisco'
      };

      await userMemoryService.updateUserMemory(userId, memories, {});
      
      const success = await userMemoryService.deleteUserMemories(userId, ['role', 'location']);
      expect(success).toBe(true);

      const memory = await userMemoryService.getUserMemory(userId);
      expect(memory?.memories.name).toBe('Eve');
      expect(memory?.memories.role).toBeUndefined();
      expect(memory?.memories.location).toBeUndefined();
    });

    it('should delete all user memories', async () => {
      const userId = 'test-user-11';
      await userMemoryService.updateUserMemory(userId, { name: 'Frank' }, {});

      const success = await userMemoryService.deleteAllUserMemories(userId);
      expect(success).toBe(true);

      const memory = await userMemoryService.getUserMemory(userId);
      expect(memory).toBeNull();
    });

    it('should get memory statistics', async () => {
      const userId = 'test-user-12';
      const memories = { 
        name: 'Grace',
        role: 'manager',
        programmingLanguages: 'JavaScript'
      };
      const preferences = { communicationStyle: 'casual' as const };

      await userMemoryService.updateUserMemory(userId, memories, preferences);
      
      const stats = await userMemoryService.getUserMemoryStats(userId);
      expect(stats).toBeDefined();
      expect(stats?.memoryCount).toBe(3);
      expect(stats?.hasPreferences).toBe(true);
      expect(stats?.memoryTypes).toEqual(['name', 'role', 'programmingLanguages']);
    });

    it('should handle guild-specific memories', async () => {
      const userId = 'test-user-13';
      const guildId1 = 'guild-1';
      const guildId2 = 'guild-2';

      // Different memories for different guilds
      await userMemoryService.updateUserMemory(userId, { role: 'admin' }, {}, guildId1);
      await userMemoryService.updateUserMemory(userId, { role: 'member' }, {}, guildId2);

      const memory1 = await userMemoryService.getUserMemory(userId, guildId1);
      const memory2 = await userMemoryService.getUserMemory(userId, guildId2);

      expect(memory1?.memories.role).toBe('admin');
      expect(memory2?.memories.role).toBe('member');
    });

    it('should estimate token counts correctly', async () => {
      const userId = 'test-user-14';
      const longMemories = {
        name: 'Henry',
        role: 'senior software engineer',
        programmingLanguages: 'Python, TypeScript, Go, Rust, C++',
        currentProject: 'Building a distributed microservices architecture',
        learningGoals: 'Advanced machine learning and cloud architecture patterns'
      };

      await userMemoryService.updateUserMemory(userId, longMemories, {});
      
      const memory = await userMemoryService.getUserMemory(userId);
      expect(memory?.tokenCount).toBeGreaterThan(20);
      expect(memory?.memoryCount).toBe(5);
    });

    it('should not process low-confidence conversations', async () => {
      const context = {
        userId: 'test-user-15',
        channelId: 'test-channel',
        messageContent: 'Hello',
        responseContent: 'Hi there!'
      };

      const success = await userMemoryService.processConversation(context);
      expect(success).toBe(false);

      const memory = await userMemoryService.getUserMemory(context.userId);
      expect(memory).toBeNull();
    });
  });

  describe('Memory Integration', () => {
    it('should provide consistent memory context across interactions', async () => {
      const userId = 'test-user-16';
      
      // First conversation - establish baseline
      const context1 = {
        userId,
        channelId: 'test-channel',
        messageContent: 'Hi, I\'m working on a React project and prefer detailed explanations.',
        responseContent: 'I\'ll provide comprehensive guidance for your React development.'
      };

      await userMemoryService.processConversation(context1);
      
      // Second conversation - should build on previous knowledge
      const context2 = {
        userId,
        channelId: 'test-channel', 
        messageContent: 'How do I optimize performance?',
        responseContent: 'For React optimization, consider memoization and code splitting.'
      };

      await userMemoryService.processConversation(context2);

      const memory = await userMemoryService.getUserMemory(userId);
      expect(memory?.memories.programmingLanguages).toContain('React');
      expect(memory?.preferences?.responseLength).toBe('detailed');
    });

    it('should maintain memory consistency over time', async () => {
      const userId = 'test-user-17';
      
      // Initial memory setup
      await userMemoryService.updateUserMemory(
        userId,
        { name: 'Isabella', role: 'full-stack developer' },
        { communicationStyle: 'technical' as const }
      );

      // Get initial context
      const context1 = await userMemoryService.getMemoryContext(userId);
      expect(context1?.userProfile).toContain('Isabella');
      
      // Add more information
      await userMemoryService.updateUserMemory(
        userId,
        { programmingLanguages: 'Node.js, Vue.js' },
        { helpLevel: 'intermediate' as const }
      );

      // Get updated context
      const context2 = await userMemoryService.getMemoryContext(userId);
      
      // Should maintain previous information while adding new
      expect(context2?.userProfile).toContain('Isabella');
      expect(context2?.userProfile).toContain('full-stack developer');
      expect(context2?.userProfile).toContain('Node.js, Vue.js');
      expect(context2?.preferences.communicationStyle).toBe('technical');
      expect(context2?.preferences.helpLevel).toBe('intermediate');
    });
  });
});
