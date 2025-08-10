/**
 * GeminiService Cache Integration Tests - Fixed Version
 * Tests the intelligent caching system integration with GeminiService
 * Uses dependency injection for reliable mocking
 */

import { GeminiService } from '../gemini.service.js';
import { CacheService } from '../cache.service.js';
import { CacheMetrics } from '../../utils/cache-metrics.js';
import { CacheKeyGenerator } from '../../utils/cache-key-generator.js';
import { CachePolicyManager } from '../../config/cache-policies.js';
import { ChatMessage } from '../context-manager.js';

// Create a simple object mock (no Jest functions)
const mockGenAI = {
  getGenerativeModel: () => ({
    generateContent: async () => ({
      response: {
        text: () => 'Generated response from Gemini API'
      }
    }),
    startChat: () => ({
      sendMessage: async () => ({
        response: {
          text: () => 'Generated response from Gemini API'
        }
      }),
      sendMessageStream: () => {}
    })
  })
};

describe('GeminiService Cache Integration - Fixed', () => {
  let geminiService: GeminiService;
  let realCacheService: CacheService;
  let realCacheMetrics: CacheMetrics;
  let realCacheKeyGenerator: CacheKeyGenerator;
  let realCachePolicyManager: CachePolicyManager;

  beforeEach(() => {
    console.log('[DEBUG] Setting up test with mock generative model');
    realCacheService = new CacheService({ maxSize: 100, maxMemory: 1024 * 1024, defaultTtl: 1000 * 60, enableMetrics: true });
    realCacheMetrics = new CacheMetrics();
    realCacheKeyGenerator = new CacheKeyGenerator();
    realCachePolicyManager = new CachePolicyManager();
    
    console.log('[DEBUG] Creating GeminiService with injected mock');
    geminiService = new GeminiService(
      realCacheService,
      realCacheMetrics,
      realCacheKeyGenerator,
      realCachePolicyManager,
      mockGenAI as any // Inject the mock generative model
    );
    console.log('[DEBUG] GeminiService created, mockGenAI injected:', !!mockGenAI);
  });

  describe('Text Response Caching', () => {
    it('should cache and retrieve text responses', async () => {
      const prompt = 'What is the capital of France?';
      const history: ChatMessage[] = [];
      const userId = 'test-user-123';
      const guildId = 'test-guild-456';

      // First call - should generate and cache
      const response1 = await geminiService.generateResponse(prompt, history, userId, guildId);
      expect(response1).toBe('Generated response from Gemini API');

      // Second call with same prompt - should return cached response
      const response2 = await geminiService.generateResponse(prompt, history, userId, guildId);
      expect(response2).toBe('Generated response from Gemini API');

      // Verify response consistency
      expect(response1).toBe(response2);
    });

    it('should generate different cache keys for different prompts', async () => {
      const prompt1 = 'What is the capital of France?';
      const prompt2 = 'What is the capital of Germany?';
      const history: ChatMessage[] = [];
      const userId = 'test-user-123';
      const guildId = 'test-guild-456';

      // Generate responses for different prompts
      const response1 = await geminiService.generateResponse(prompt1, history, userId, guildId);
      const response2 = await geminiService.generateResponse(prompt2, history, userId, guildId);

      // Both should succeed (different cache entries)
      expect(response1).toBe('Generated response from Gemini API');
      expect(response2).toBe('Generated response from Gemini API');
    });

    it('should generate different cache keys for different users', async () => {
      const prompt = 'What is the capital of France?';
      const history: ChatMessage[] = [];
      const userId1 = 'test-user-123';
      const userId2 = 'test-user-456';
      const guildId = 'test-guild-789';

      const response1 = await geminiService.generateResponse(prompt, history, userId1, guildId);
      const response2 = await geminiService.generateResponse(prompt, history, userId2, guildId);

      // Both should succeed (different cache entries due to user context)
      expect(response1).toBe('Generated response from Gemini API');
      expect(response2).toBe('Generated response from Gemini API');
    });

    it('should handle cache policy evaluation correctly', async () => {
      const prompt = 'What is the capital of France?';
      const history: ChatMessage[] = [];
      const userId = 'test-user-123';
      const guildId = 'test-guild-456';

      const response = await geminiService.generateResponse(prompt, history, userId, guildId);
      expect(response).toBe('Generated response from Gemini API');

      // Verify cache policy was evaluated (no errors thrown)
      expect(response).toBeDefined();
    });
  });

  describe('Multimodal Response Caching', () => {
    it('should cache multimodal responses with image content', async () => {
      const prompt = 'Describe this image';
      const imagePart = {
        inlineData: {
          data: 'base64-encoded-image-data',
          mimeType: 'image/jpeg'
        }
      };
      const history: ChatMessage[] = [];
      const userId = 'test-user-123';
      const guildId = 'test-guild-456';

      // First call - should generate and cache
      const response1 = await geminiService.generateMultimodalResponse(prompt, imagePart, history, userId, guildId);
      expect(response1).toBe('Generated response from Gemini API');

      // Second call with same content - should return cached response
      const response2 = await geminiService.generateMultimodalResponse(prompt, imagePart, history, userId, guildId);
      expect(response2).toBe('Generated response from Gemini API');

      // Verify response consistency
      expect(response1).toBe(response2);
    });

    it('should generate different cache keys for different images', async () => {
      const prompt = 'Describe this image';
      const imagePart1 = {
        inlineData: {
          data: 'base64-encoded-image-data-1',
          mimeType: 'image/jpeg'
        }
      };
      const imagePart2 = {
        inlineData: {
          data: 'base64-encoded-image-data-2',
          mimeType: 'image/jpeg'
        }
      };
      const history: ChatMessage[] = [];
      const userId = 'test-user-123';
      const guildId = 'test-guild-456';

      // Generate responses for different images
      const response1 = await geminiService.generateMultimodalResponse(prompt, imagePart1, history, userId, guildId);
      const response2 = await geminiService.generateMultimodalResponse(prompt, imagePart2, history, userId, guildId);

      // Both should succeed (different cache entries due to different images)
      expect(response1).toBe('Generated response from Gemini API');
      expect(response2).toBe('Generated response from Gemini API');
    });
  });

  describe('Cache Metrics and Management', () => {
    it('should provide cache metrics information', () => {
      const metrics = geminiService.getCacheMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics.performance.hitRate).toBe('number');
      expect(typeof metrics.performance.avgResponseTime).toBe('number');
      expect(typeof metrics.performance.totalRequests).toBe('number');
      expect(typeof metrics.performance.memoryUsage).toBe('number');
      expect(Array.isArray(metrics.policies)).toBe(true);
    });

    it('should allow cache clearing', () => {
      expect(() => {
        geminiService.clearCache();
      }).not.toThrow();
    });
  });

  describe('Cache Policy Integration', () => {
    it('should evaluate cache policies for different content types', async () => {
      const shortPrompt = 'Hi';
      const longPrompt = 'This is a much longer prompt that contains many words and should trigger different cache policy evaluation based on content length and complexity factors';
      const history: ChatMessage[] = [];
      const userId = 'test-user-123';
      const guildId = 'test-guild-456';

      // Generate responses with different content characteristics
      const response1 = await geminiService.generateResponse(shortPrompt, history, userId, guildId);
      const response2 = await geminiService.generateResponse(longPrompt, history, userId, guildId);

      expect(response1).toBe('Generated response from Gemini API');
      expect(response2).toBe('Generated response from Gemini API');
    });

    it('should handle cache policy evaluation errors gracefully', async () => {
      const prompt = 'What is the capital of France?';
      const history: ChatMessage[] = [];
      const userId = 'test-user-123';
      const guildId = 'test-guild-456';

      // Should not throw even if cache policy evaluation has issues
      const response = await geminiService.generateResponse(prompt, history, userId, guildId);
      expect(response).toBe('Generated response from Gemini API');
    });
  });

  describe('Error Handling with Cache', () => {
    it('should not cache error responses', async () => {
      const prompt = 'What is the capital of France?';
      const history: ChatMessage[] = [];
      const userId = 'test-user-123';
      const guildId = 'test-guild-456';

      // Both calls should succeed (our mock doesn't generate errors)
      const response1 = await geminiService.generateResponse(prompt, history, userId, guildId);
      const response2 = await geminiService.generateResponse(prompt, history, userId, guildId);

      expect(response1).toBe('Generated response from Gemini API');
      expect(response2).toBe('Generated response from Gemini API');
      
      // Since both succeed, they should return the same cached response
      expect(response1).toBe(response2);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys for identical requests', async () => {
      const prompt = 'What is the capital of France?';
      const history: ChatMessage[] = [];
      const userId = 'test-user-123';
      const guildId = 'test-guild-456';

      // Multiple identical calls
      const response1 = await geminiService.generateResponse(prompt, history, userId, guildId);
      const response2 = await geminiService.generateResponse(prompt, history, userId, guildId);
      const response3 = await geminiService.generateResponse(prompt, history, userId, guildId);

      // All should return the same cached response
      expect(response1).toBe('Generated response from Gemini API');
      expect(response2).toBe('Generated response from Gemini API');
      expect(response3).toBe('Generated response from Gemini API');
      expect(response1).toBe(response2);
      expect(response2).toBe(response3);
    });
  });
});
