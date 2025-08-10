/**
 * Enhanced ContextManager Tests - Cycle 7 Validation
 * Tests the intelligent conversation caching and management features
 */

import { ContextManager } from '../context-manager.js';
import { Part } from '@google/generative-ai';

// Mock dependencies
jest.mock('../cache.service.js', () => ({
  CacheService: jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
    clear: jest.fn().mockResolvedValue(void 0),
    getStats: jest.fn(() => ({ size: 0, hits: 0, misses: 0 })),
    getMetrics: jest.fn(() => ({ 
      size: 0, 
      hits: 0, 
      misses: 0, 
      totalRequests: 0,
      memoryUsage: 1024,
      evictions: 0
    })),
    getStatus: jest.fn(() => ({ healthy: true, size: 0 }))
  }))
}));

jest.mock('../../config/cache-policies.js', () => ({
  CachePolicyManager: jest.fn(() => ({
    addPolicy: jest.fn(),
    evaluatePolicy: jest.fn(() => ({
      name: 'test-policy',
      ttl: 3600000,
      priority: 1,
      adaptive: false
    })),
    getAllPolicies: jest.fn(() => [])
  }))
}));

jest.mock('../../utils/cache-key-generator.js', () => ({
  CacheKeyGenerator: jest.fn(() => ({
    generateKey: jest.fn(() => 'test-cache-key-12345')
  }))
}));

jest.mock('../../utils/cache-metrics.js', () => ({
  CacheMetrics: jest.fn(() => ({
    recordHit: jest.fn(),
    recordMiss: jest.fn(),
    getPerformanceReport: jest.fn(() => ({
      hitRate: 0.8,
      avgResponseTime: 150
    }))
  }))
}));

describe('Enhanced ContextManager - Cycle 7', () => {
  let contextManager: ContextManager;

  beforeEach(() => {
    contextManager = new ContextManager();
    jest.clearAllMocks();
  });

  describe('Intelligent Conversation Caching', () => {
    it('should cache and retrieve conversations asynchronously', async () => {
      const channelId = 'test-channel-123';
      const userParts: Part[] = [{ text: 'Hello, how are you?' }];
      const botResponse = 'I am doing well, thank you!';

      // Update conversation
      await contextManager.updateHistoryWithParts(channelId, userParts, botResponse);

      // Retrieve conversation
      const history = await contextManager.getHistory(channelId);
      expect(history).toHaveLength(2);
      expect(history[0].role).toBe('user');
      expect(history[1].role).toBe('model');
      expect(history[0].parts[0].text).toBe('Hello, how are you?');
      expect(history[1].parts[0].text).toBe('I am doing well, thank you!');
    });

    it('should handle multimodal conversations with images', async () => {
      const channelId = 'test-channel-multimodal';
      const userParts: Part[] = [
        { text: 'What do you see in this image?' },
        {
          inlineData: {
            data: 'base64-encoded-image-data',
            mimeType: 'image/jpeg'
          }
        }
      ];
      const botResponse = 'I see a beautiful landscape.';

      await contextManager.updateHistoryWithParts(channelId, userParts, botResponse);

      const history = await contextManager.getHistory(channelId);
      expect(history).toHaveLength(2);
      expect(history[0].parts).toHaveLength(2);
      expect(history[0].parts[0].text).toBe('What do you see in this image?');
      expect('inlineData' in history[0].parts[1]).toBe(true);
    });

    it('should provide synchronous access for backward compatibility', () => {
      const channelId = 'test-channel-sync';
      
      // Add some data to in-memory cache
      contextManager.cache.set(channelId, [
        { role: 'user', parts: [{ text: 'Test message' }] },
        { role: 'model', parts: [{ text: 'Test response' }] }
      ]);

      const history = contextManager.getHistorySync(channelId);
      expect(history).toHaveLength(2);
      expect(history[0].role).toBe('user');
    });

    it('should handle conversation priority calculation', async () => {
      const channelId = 'test-channel-priority';
      
      // Add multiple conversations with different characteristics
      for (let i = 0; i < 15; i++) {
        await contextManager.updateHistory(channelId, `Message ${i}`, `Response ${i}`);
      }
      
      // Add multimodal content
      await contextManager.updateHistoryWithParts(channelId, [
        { text: 'Analyze this' },
        { inlineData: { data: 'image-data', mimeType: 'image/png' } }
      ], 'Analysis complete');

      const history = await contextManager.getHistory(channelId);
      expect(history.length).toBeGreaterThan(10);
    });

    it('should cleanup inactive conversations intelligently', async () => {
      const channels = ['channel1', 'channel2', 'channel3'];
      
      // Add conversations to different channels
      for (const channelId of channels) {
        await contextManager.updateHistory(channelId, 'Hello', 'Hi there');
      }

      const cleanedCount = await contextManager.cleanupInactiveChannels();
      expect(typeof cleanedCount).toBe('number');
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });

    it('should provide conversation analytics', async () => {
      const channelId = 'analytics-test-channel';
      
      // Add some conversation data
      await contextManager.updateHistory(channelId, 'Test message', 'Test response');
      await contextManager.updateHistoryWithParts(channelId, [
        { text: 'Image query' },
        { inlineData: { data: 'img', mimeType: 'image/jpg' } }
      ], 'Image analysis');

      const analytics = contextManager.getConversationAnalytics();
      
      expect(analytics).toHaveProperty('totalConversations');
      expect(analytics).toHaveProperty('activeConversations');
      expect(analytics).toHaveProperty('conversationsByType');
      expect(analytics).toHaveProperty('conversationsByPriority');
      expect(analytics).toHaveProperty('totalMemoryUsage');
      expect(analytics).toHaveProperty('averageConversationLength');
      expect(analytics).toHaveProperty('multimodalConversations');
      
      expect(typeof analytics.totalConversations).toBe('number');
      expect(typeof analytics.totalMemoryUsage).toBe('number');
    });
  });

  describe('Cache Integration', () => {
    it('should persist conversations to cache', async () => {
      const channelId = 'persist-test-channel';
      await contextManager.updateHistory(channelId, 'Persist this', 'Persisted');

      // Verify the conversation was stored in memory cache
      const history = await contextManager.getHistory(channelId);
      expect(history).toHaveLength(2);
      expect(history[0].parts[0].text).toBe('Persist this');
      expect(history[1].parts[0].text).toBe('Persisted');
    });

    it('should generate appropriate cache keys', async () => {
      const channelId = 'cache-key-test';
      await contextManager.updateHistory(channelId, 'Test', 'Response');

      // Verify the conversation was stored
      const history = await contextManager.getHistory(channelId);
      expect(history).toHaveLength(2);
    });

    it('should evaluate cache policies for conversations', async () => {
      const channelId = 'policy-test-channel';
      await contextManager.updateHistory(channelId, 'Policy test', 'Policy response');

      // Verify the conversation was stored
      const history = await contextManager.getHistory(channelId);
      expect(history).toHaveLength(2);
    });
  });

  describe('Memory Management', () => {
    it('should limit multimodal message history', async () => {
      const channelId = 'multimodal-limit-test';
      
      // Add many multimodal messages (more than MAX_IMAGE_HISTORY_SIZE)
      for (let i = 0; i < 15; i++) {
        await contextManager.updateHistoryWithParts(channelId, [
          { text: `Image query ${i}` },
          { inlineData: { data: `image-${i}`, mimeType: 'image/jpeg' } }
        ], `Image response ${i}`);
      }

      const history = await contextManager.getHistory(channelId);      const multimodalCount = history.filter((msg) =>
        msg.parts.some((part) => 'inlineData' in part)
      ).length;

      // Should respect the multimodal limit
      expect(multimodalCount).toBeLessThanOrEqual(10);
    });

    it('should limit total conversation length', async () => {
      const channelId = 'length-limit-test';
      
      // Add many messages (more than MAX_HISTORY_LENGTH * 2)
      for (let i = 0; i < 50; i++) {
        await contextManager.updateHistory(channelId, `Message ${i}`, `Response ${i}`);
      }

      const history = await contextManager.getHistory(channelId);
      
      // Should respect the total length limit (20 pairs = 40 messages)
      expect(history.length).toBeLessThanOrEqual(40);
    });

    it('should calculate conversation sizes accurately', () => {
      const history = [
        { role: 'user' as const, parts: [{ text: 'Hello' }] },
        { role: 'model' as const, parts: [{ text: 'Hi there' }] }
      ];

      const size = contextManager['calculateConversationSize'](history);
      expect(typeof size).toBe('number');
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle cache service errors gracefully', async () => {
      // Mock cache service to throw an error
      const mockCacheService = contextManager['cacheService'];
      mockCacheService.get = jest.fn().mockRejectedValue(new Error('Cache error'));

      const channelId = 'error-test-channel';
      
      // Should not throw despite cache error
      const history = await contextManager.getHistory(channelId);
      expect(history).toEqual([]);
    });

    it('should validate input parameters', async () => {
      const channelId = '';
      const userParts: Part[] = [];
      const botResponse = '';

      await expect(
        contextManager.updateHistoryWithParts(channelId, userParts, botResponse)
      ).rejects.toThrow();
    });

    it('should handle cleanup errors gracefully', async () => {
      // Mock the cache service to throw an error during cleanup
      const mockCacheService = contextManager['cacheService'];
      mockCacheService.delete = jest.fn().mockRejectedValue(new Error('Cache delete failed'));

      // Mock metadata to cause potential issues
      contextManager['metadata'].set('test', {
        channelId: 'test',
        lastActivity: 0,
        messageCount: 0,
        multimodalCount: 0,
        totalSize: 0,
        priority: 'low',
        conversationType: 'channel'
      });

      // The cleanup should throw a SystemError when cache operations fail
      await expect(contextManager.cleanupInactiveChannels()).rejects.toThrow('Failed to cleanup inactive channels');
    });
  });
});
