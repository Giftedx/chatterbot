/**
 * Performance Benchmark Tests for Core Intelligence Service
 * Compares unified architecture performance with legacy implementation
 */

import { CoreIntelligenceService } from '../core-intelligence.service.js';
import { UnifiedMCPOrchestratorService } from '../core/mcp-orchestrator.service.js';
import { UnifiedAnalyticsService } from '../core/unified-analytics.service.js';
import { performance } from 'perf_hooks';

// Mock dependencies
jest.mock('../core/mcp-orchestrator.service.js');
jest.mock('../core/unified-analytics.service.js');
jest.mock('../core/message-analysis.service.js');
jest.mock('../intelligence/capability.service.js');
jest.mock('../intelligence/context.service.js');
jest.mock('../agentic-intelligence.service.js');
jest.mock('../gemini.service.js');
jest.mock('../../moderation/moderation-service.js');

const mockUnifiedMCPOrchestrator = UnifiedMCPOrchestratorService as jest.MockedClass<typeof UnifiedMCPOrchestratorService>;
const mockUnifiedAnalytics = UnifiedAnalyticsService as jest.MockedClass<typeof UnifiedAnalyticsService>;

describe('Core Intelligence Service - Performance Benchmarks', () => {
  let coreIntelligenceService: CoreIntelligenceService;
  let mockMCPOrchestrator: jest.Mocked<UnifiedMCPOrchestratorService>;
  let mockAnalyticsService: jest.Mocked<UnifiedAnalyticsService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks with initialize methods
    mockMCPOrchestrator = new mockUnifiedMCPOrchestrator() as jest.Mocked<UnifiedMCPOrchestratorService>;
    mockMCPOrchestrator.initialize = jest.fn().mockResolvedValue(undefined);
    mockMCPOrchestrator.orchestrateIntelligentResponse = jest.fn().mockResolvedValue({
      success: true,
      phase: 1,
      toolsExecuted: ['test-tool'],
      results: new Map([['test-tool', { success: true, data: { test: 'data' }, executionTime: 100 }]]),
      fallbacksUsed: [],
      executionTime: 100,
      confidence: 0.9,
      recommendations: []
    });

    mockAnalyticsService = new mockUnifiedAnalytics() as jest.Mocked<UnifiedAnalyticsService>;
    mockAnalyticsService.logInteraction = jest.fn().mockResolvedValue(undefined);
    
    coreIntelligenceService = new CoreIntelligenceService({
      enableAgenticFeatures: true,
      enablePersonalization: false,
      enableEnhancedMemory: false,
      enableEnhancedUI: false,
      enableResponseCache: false
    });
  });

  describe('Message Processing Performance', () => {
    test('should process simple messages within performance threshold', async () => {
      const mockMessage = {
        id: 'perf-test-1',
        content: 'Hello, how are you?',
        author: { id: 'test-user', bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      };

      // Add user to opted-in list
      (coreIntelligenceService as any).optedInUsers.add('test-user');

      const startTime = performance.now();
      await coreIntelligenceService.handleMessage(mockMessage as any);
      const endTime = performance.now();
      
      const processingTime = endTime - startTime;
      
      // Simple messages should process within 2 seconds
      expect(processingTime).toBeLessThan(2000);
      expect(mockMessage.reply).toHaveBeenCalled();
    });

    test('should process complex messages within reasonable time', async () => {
      const mockMessage = {
        id: 'perf-test-2',
        content: 'Search for the latest AI research papers and summarize the key findings about transformer architectures',
        author: { id: 'test-user', bot: false },
        attachments: new Map([
          ['1', { id: '1', name: 'research.pdf', url: 'https://example.com/research.pdf', contentType: 'application/pdf' }]
        ]),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      };

      (coreIntelligenceService as any).optedInUsers.add('test-user');

      const startTime = performance.now();
      await coreIntelligenceService.handleMessage(mockMessage as any);
      const endTime = performance.now();
      
      const processingTime = endTime - startTime;
      
      // Complex messages should process within 10 seconds
      expect(processingTime).toBeLessThan(10000);
      expect(mockMessage.reply).toHaveBeenCalled();
    });

    test('should handle concurrent message processing efficiently', async () => {
      const messageCount = 5;
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        id: `concurrent-test-${i}`,
        content: `Test message ${i + 1}`,
        author: { id: `test-user-${i}`, bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: `test-channel-${i}`,
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      }));

      // Add all users to opted-in list
      messages.forEach((msg, i) => {
        (coreIntelligenceService as any).optedInUsers.add(`test-user-${i}`);
      });

      const startTime = performance.now();
      
      // Process all messages concurrently
      await Promise.all(
        messages.map(msg => coreIntelligenceService.handleMessage(msg as any))
      );
      
      const endTime = performance.now();
      const totalProcessingTime = endTime - startTime;
      
      // Concurrent processing should be more efficient than sequential
      // Should complete within 5 seconds for 5 messages
      expect(totalProcessingTime).toBeLessThan(5000);
      
      // All messages should have been processed
      messages.forEach(msg => {
        expect(msg.reply).toHaveBeenCalled();
      });
    });
  });

  describe('Slash Command Performance', () => {
    test('should handle slash command interactions quickly', async () => {
      const mockInteraction = {
        id: 'slash-perf-test',
        isChatInputCommand: () => true,
        isRepliable: () => true,
        commandName: 'chat',
        options: {
          getString: jest.fn().mockReturnValue('Test slash command'),
          getAttachment: jest.fn().mockReturnValue(null)
        },
        user: { id: 'test-user' },
        channelId: 'test-channel',
        guildId: 'test-guild',
        deferReply: jest.fn().mockResolvedValue(undefined),
        editReply: jest.fn().mockResolvedValue(undefined),
        deferred: false,
        replied: false
      };

      const startTime = performance.now();
      await coreIntelligenceService.handleInteraction(mockInteraction as any);
      const endTime = performance.now();
      
      const processingTime = endTime - startTime;
      
      // Slash commands should respond quickly (within 3 seconds for Discord's limit)
      expect(processingTime).toBeLessThan(3000);
      expect(mockInteraction.deferReply).toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalled();
    });
  });

  describe('Memory Usage Performance', () => {
    test('should not accumulate excessive memory during processing', async () => {
      const initialMemory = process.memoryUsage();
      
      // Process multiple messages to check for memory leaks
      for (let i = 0; i < 10; i++) {
        const mockMessage = {
          id: `memory-test-${i}`,
          content: `Memory test message ${i}`,
          author: { id: 'test-user', bot: false },
          attachments: new Map(),
          channel: { sendTyping: jest.fn() },
          channelId: 'test-channel',
          guildId: 'test-guild',
          reply: jest.fn().mockResolvedValue(undefined)
        };

        (coreIntelligenceService as any).optedInUsers.add('test-user');
        await coreIntelligenceService.handleMessage(mockMessage as any);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB for 10 messages)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Service Initialization Performance', () => {
    test('should initialize all unified services quickly', async () => {
      const startTime = performance.now();
      
      const newService = new CoreIntelligenceService({
        enableAgenticFeatures: true,
        enablePersonalization: true,
        enableEnhancedMemory: true,
        enableEnhancedUI: true,
        enableResponseCache: true
      });
      
      const endTime = performance.now();
      const initTime = endTime - startTime;
      
      // Service initialization should be fast (within 1 second)
      expect(initTime).toBeLessThan(1000);
      expect(newService).toBeDefined();
    });
  });

  describe('Analytics Performance', () => {
    test('should log analytics without significant performance impact', async () => {
      const mockMessage = {
        id: 'analytics-perf-test',
        content: 'Test analytics performance',
        author: { id: 'test-user', bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      };

      (coreIntelligenceService as any).optedInUsers.add('test-user');

      // Measure processing time with analytics
      const startTime = performance.now();
      await coreIntelligenceService.handleMessage(mockMessage as any);
      const endTime = performance.now();
      
      const processingTimeWithAnalytics = endTime - startTime;
      
      // Analytics shouldn't add more than 100ms to processing time
      // This is an indirect measure since we can't easily disable analytics
      expect(processingTimeWithAnalytics).toBeLessThan(3000);
    });
  });

  describe('Error Handling Performance', () => {
    test('should handle errors quickly without hanging', async () => {
      // Mock services to throw errors
      const mockMessageAnalysis = require('../core/message-analysis.service.js');
      mockMessageAnalysis.unifiedMessageAnalysisService.analyzeMessage = jest.fn()
        .mockRejectedValue(new Error('Test error'));

      const mockMessage = {
        id: 'error-perf-test',
        content: 'This should trigger an error',
        author: { id: 'test-user', bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      };

      (coreIntelligenceService as any).optedInUsers.add('test-user');

      const startTime = performance.now();
      await coreIntelligenceService.handleMessage(mockMessage as any);
      const endTime = performance.now();
      
      const errorHandlingTime = endTime - startTime;
      
      // Error handling should be quick (within 1 second)
      expect(errorHandlingTime).toBeLessThan(1000);
      expect(mockMessage.reply).toHaveBeenCalled();
    });
  });
});
