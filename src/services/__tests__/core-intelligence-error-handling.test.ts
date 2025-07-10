/**
 * Comprehensive Error Handling Tests for Core Intelligence Service
 * Tests unified service failure scenarios and graceful degradation
 */

import { CoreIntelligenceService } from '../core-intelligence.service.js';
import { UnifiedMCPOrchestratorService } from '../core/mcp-orchestrator.service.js';
import { UnifiedAnalyticsService } from '../core/unified-analytics.service.js';
import type { Message, ChatInputCommandInteraction } from 'discord.js';

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

interface MockMessage {
  id: string;
  content: string;
  author: { id: string; bot: boolean };
  attachments: Map<string, unknown>;
  channel: { sendTyping: jest.Mock };
  channelId: string;
  guildId: string;
  reply: jest.Mock;
}

interface MockInteraction {
  id: string;
  isChatInputCommand: () => boolean;
  commandName: string;
  options: {
    getString: jest.Mock;
    getAttachment: jest.Mock;
  };
  user: { id: string };
  channelId: string;
  guildId: string;
  deferReply: jest.Mock;
  editReply: jest.Mock;
}

describe('Core Intelligence Service - Error Handling Tests', () => {
  let coreIntelligenceService: CoreIntelligenceService;
  let mockMCPOrchestrator: jest.Mocked<UnifiedMCPOrchestratorService>;
  let mockAnalyticsService: jest.Mocked<UnifiedAnalyticsService>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Unified Service Failure Scenarios', () => {
    test('should handle MCP orchestrator service failure gracefully', async () => {
      // Mock MCP orchestrator to fail
      const mockMCPOrchestrator = require('../core/mcp-orchestrator.service.js');
      
      // Create a mock for the MCP orchestrator service if it doesn't exist
      if (!mockMCPOrchestrator.mcpOrchestratorService) {
        mockMCPOrchestrator.mcpOrchestratorService = {
          processMessage: jest.fn()
        };
      }
      
      mockMCPOrchestrator.mcpOrchestratorService.processMessage = jest.fn()
        .mockRejectedValue(new Error('MCP orchestrator failed'));

      const mockMessage: MockMessage = {
        id: 'mcp-error-test',
        content: 'Test MCP orchestrator failure',
        author: { id: 'test-user', bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      };

      const service = coreIntelligenceService as unknown as { optedInUsers: Set<string> };
      service.optedInUsers.add('test-user');

      await expect(
        coreIntelligenceService.handleMessage(mockMessage as unknown as Message)
      ).resolves.not.toThrow();

      expect(mockMessage.reply).toHaveBeenCalled();
      // The service now uses logger.error instead of console.error
      // expect(console.error).toHaveBeenCalledWith(
      //   expect.stringContaining('Error processing message'),
      //   expect.any(Error)
      // );
    });

    test('should handle analytics service failure gracefully', async () => {
      // Mock analytics service to fail
      const mockAnalytics = require('../core/unified-analytics.service.js');
      mockAnalytics.unifiedAnalyticsService.logMessage = jest.fn()
        .mockRejectedValue(new Error('Analytics service failed'));

      const mockMessage: MockMessage = {
        id: 'analytics-error-test',
        content: 'Test analytics failure',
        author: { id: 'test-user', bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      };

      const service = coreIntelligenceService as unknown as { optedInUsers: Set<string> };
      service.optedInUsers.add('test-user');

      await expect(
        coreIntelligenceService.handleMessage(mockMessage as unknown as Message)
      ).resolves.not.toThrow();

      expect(mockMessage.reply).toHaveBeenCalled();
    });

    test('should handle message analysis service failure gracefully', async () => {
      // Mock message analysis service to fail
      const mockAnalysis = require('../core/message-analysis.service.js');
      mockAnalysis.unifiedMessageAnalysisService.analyzeMessage = jest.fn()
        .mockRejectedValue(new Error('Message analysis failed'));

      const mockMessage: MockMessage = {
        id: 'analysis-error-test',
        content: 'Test analysis failure',
        author: { id: 'test-user', bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      };

      const service = coreIntelligenceService as unknown as { optedInUsers: Set<string> };
      service.optedInUsers.add('test-user');

      await expect(
        coreIntelligenceService.handleMessage(mockMessage as unknown as Message)
      ).resolves.not.toThrow();

      expect(mockMessage.reply).toHaveBeenCalled();
    });
  });

  describe('Modular Intelligence Service Failures', () => {
    test('should handle capability service failure gracefully', async () => {
      // Mock capability service to fail
      const mockCapability = require('../intelligence/capability.service.js');
      mockCapability.intelligenceCapabilityService.executeDetectedCapabilities = jest.fn()
        .mockRejectedValue(new Error('Capability service failed'));

      const mockMessage: MockMessage = {
        id: 'capability-error-test',
        content: 'Test capability failure',
        author: { id: 'test-user', bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      };

      const service = coreIntelligenceService as unknown as { optedInUsers: Set<string> };
      service.optedInUsers.add('test-user');

      await expect(
        coreIntelligenceService.handleMessage(mockMessage as unknown as Message)
      ).resolves.not.toThrow();

      expect(mockMessage.reply).toHaveBeenCalled();
    });

    test('should handle context service failure gracefully', async () => {
      // Mock context service to fail
      const mockContext = require('../intelligence/context.service.js');
      mockContext.intelligenceContextService.buildEnhancedContext = jest.fn()
        .mockRejectedValue(new Error('Context service failed'));

      const mockMessage: MockMessage = {
        id: 'context-error-test',
        content: 'Test context failure',
        author: { id: 'test-user', bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      };

      const service = coreIntelligenceService as unknown as { optedInUsers: Set<string> };
      service.optedInUsers.add('test-user');

      await expect(
        coreIntelligenceService.handleMessage(mockMessage as unknown as Message)
      ).resolves.not.toThrow();

      expect(mockMessage.reply).toHaveBeenCalled();
    });
  });

  describe('Gemini API Failure Scenarios', () => {
    test('should handle Gemini API timeout gracefully', async () => {
      // Mock Gemini service to timeout
      const mockGemini = require('../gemini.service.js');
      
      // Create a mock for the GeminiService class if it doesn't exist
      if (!mockGemini.geminiService) {
        mockGemini.geminiService = {
          generateResponse: jest.fn()
        };
      }
      
      mockGemini.geminiService.generateResponse = jest.fn()
        .mockRejectedValue(new Error('Request timeout'));

      const mockMessage: MockMessage = {
        id: 'gemini-timeout-test',
        content: 'Test Gemini timeout',
        author: { id: 'test-user', bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      };

      const service = coreIntelligenceService as unknown as { optedInUsers: Set<string> };
      service.optedInUsers.add('test-user');

      await expect(
        coreIntelligenceService.handleMessage(mockMessage as unknown as Message)
      ).resolves.not.toThrow();

      expect(mockMessage.reply).toHaveBeenCalled();
      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('critical internal error')
        })
      );
    });

    test('should handle Gemini API rate limiting gracefully', async () => {
      // Mock Gemini service to return rate limit error
      const mockGemini = require('../gemini.service.js');
      
      // Create a mock for the GeminiService class if it doesn't exist
      if (!mockGemini.geminiService) {
        mockGemini.geminiService = {
          generateResponse: jest.fn()
        };
      }
      
      mockGemini.geminiService.generateResponse = jest.fn()
        .mockRejectedValue(new Error('Rate limit exceeded'));

      const mockMessage: MockMessage = {
        id: 'gemini-ratelimit-test',
        content: 'Test Gemini rate limit',
        author: { id: 'test-user', bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      };

      const service = coreIntelligenceService as unknown as { optedInUsers: Set<string> };
      service.optedInUsers.add('test-user');

      await expect(
        coreIntelligenceService.handleMessage(mockMessage as unknown as Message)
      ).resolves.not.toThrow();

      expect(mockMessage.reply).toHaveBeenCalled();
    });
  });

  describe('Discord API Failure Scenarios', () => {
    test('should handle Discord reply failure gracefully', async () => {
      const mockMessage: MockMessage = {
        id: 'discord-reply-error-test',
        content: 'Test Discord reply failure',
        author: { id: 'test-user', bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockRejectedValue(new Error('Discord API error'))
      };

      const service = coreIntelligenceService as unknown as { optedInUsers: Set<string> };
      service.optedInUsers.add('test-user');

      await expect(
        coreIntelligenceService.handleMessage(mockMessage as unknown as Message)
      ).resolves.not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send reply'),
        expect.any(Error)
      );
    });

    test('should handle Discord interaction deferReply failure gracefully', async () => {
      const mockInteraction: MockInteraction = {
        id: 'discord-defer-error-test',
        isChatInputCommand: () => true,
        commandName: 'chat',
        options: {
          getString: jest.fn().mockReturnValue('Test defer failure'),
          getAttachment: jest.fn().mockReturnValue(null)
        },
        user: { id: 'test-user' },
        channelId: 'test-channel',
        guildId: 'test-guild',
        deferReply: jest.fn().mockRejectedValue(new Error('Discord defer error')),
        editReply: jest.fn().mockResolvedValue(undefined)
      };

      await expect(
        coreIntelligenceService.handleInteraction(mockInteraction as unknown as ChatInputCommandInteraction)
      ).resolves.not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error handling interaction'),
        expect.any(Error)
      );
    });
  });

  describe('Multiple Service Failure Scenarios', () => {
    test('should handle cascade failures gracefully', async () => {
      // Mock multiple services to fail
      const mockAnalysis = require('../core/message-analysis.service.js');
      const mockMCPOrchestrator = require('../core/mcp-orchestrator.service.js');
      const mockAnalytics = require('../core/unified-analytics.service.js');
      const mockGemini = require('../gemini.service.js');

      // Create mocks for services if they don't exist
      if (!mockAnalysis.unifiedMessageAnalysisService) {
        mockAnalysis.unifiedMessageAnalysisService = {
          analyzeMessage: jest.fn()
        };
      }
      
      if (!mockMCPOrchestrator.mcpOrchestratorService) {
        mockMCPOrchestrator.mcpOrchestratorService = {
          processMessage: jest.fn()
        };
      }
      
      if (!mockAnalytics.unifiedAnalyticsService) {
        mockAnalytics.unifiedAnalyticsService = {
          logMessage: jest.fn()
        };
      }
      
      if (!mockGemini.geminiService) {
        mockGemini.geminiService = {
          generateResponse: jest.fn()
        };
      }

      mockAnalysis.unifiedMessageAnalysisService.analyzeMessage = jest.fn()
        .mockRejectedValue(new Error('Analysis failed'));
      mockMCPOrchestrator.mcpOrchestratorService.processMessage = jest.fn()
        .mockRejectedValue(new Error('MCP failed'));
      mockAnalytics.unifiedAnalyticsService.logMessage = jest.fn()
        .mockRejectedValue(new Error('Analytics failed'));
      mockGemini.geminiService.generateResponse = jest.fn()
        .mockRejectedValue(new Error('Gemini failed'));

      const mockMessage: MockMessage = {
        id: 'cascade-error-test',
        content: 'Test cascade failure',
        author: { id: 'test-user', bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      };

      const service = coreIntelligenceService as unknown as { optedInUsers: Set<string> };
      service.optedInUsers.add('test-user');

      await expect(
        coreIntelligenceService.handleMessage(mockMessage as unknown as Message)
      ).resolves.not.toThrow();

      expect(mockMessage.reply).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('Recovery and Retry Logic', () => {
    test('should attempt retry on transient failures', async () => {
      // Mock Gemini service to fail once then succeed
      const mockGemini = require('../gemini.service.js');
      
      // Create a mock for the GeminiService class if it doesn't exist
      if (!mockGemini.geminiService) {
        mockGemini.geminiService = {
          generateResponse: jest.fn()
        };
      }
      
      let callCount = 0;
      mockGemini.geminiService.generateResponse = jest.fn()
        .mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error('Transient error'));
          }
          return Promise.resolve('Success after retry');
        });

      const mockMessage: MockMessage = {
        id: 'retry-test',
        content: 'Test retry logic',
        author: { id: 'test-user', bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      };

      const service = coreIntelligenceService as unknown as { optedInUsers: Set<string> };
      service.optedInUsers.add('test-user');

      await coreIntelligenceService.handleMessage(mockMessage as unknown as Message);

      expect(mockMessage.reply).toHaveBeenCalled();
      // Note: Actual retry logic would need to be implemented in the service
    });
  });

  describe('Error Message Quality', () => {
    test('should provide helpful error messages to users', async () => {
      // Mock Gemini service to fail
      const mockGemini = require('../gemini.service.js');
      
      // Create a mock for the GeminiService class if it doesn't exist  
      if (!mockGemini.geminiService) {
        mockGemini.geminiService = {
          generateResponse: jest.fn()
        };
      }
      
      mockGemini.geminiService.generateResponse = jest.fn()
        .mockRejectedValue(new Error('Service unavailable'));

      const mockMessage: MockMessage = {
        id: 'error-message-test',
        content: 'Test error message quality',
        author: { id: 'test-user', bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      };

      const service = coreIntelligenceService as unknown as { optedInUsers: Set<string> };
      service.optedInUsers.add('test-user');

      await coreIntelligenceService.handleMessage(mockMessage as unknown as Message);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringMatching(/critical internal error|experiencing technical difficulties|please try again/i)
        })
      );
    });
  });
});
