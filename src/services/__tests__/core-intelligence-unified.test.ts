/**
 * Core Intelligence Service Tests with Unified Architecture
 * Tests the migration to unified services and integration capabilities
 */

import { CoreIntelligenceService } from '../core-intelligence.service.js';
import { UnifiedMCPOrchestratorService } from '../core/mcp-orchestrator.service.js';
import { UnifiedAnalyticsService } from '../core/unified-analytics.service.js';
import { unifiedMessageAnalysisService } from '../core/message-analysis.service.js';
import { intelligenceCapabilityService } from '../intelligence/capability.service.js';
import { intelligenceContextService } from '../intelligence/context.service.js';

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
const mockMessageAnalysis = unifiedMessageAnalysisService as jest.Mocked<typeof unifiedMessageAnalysisService>;
const mockCapabilityService = intelligenceCapabilityService as jest.Mocked<typeof intelligenceCapabilityService>;
const mockContextService = intelligenceContextService as jest.Mocked<typeof intelligenceContextService>;

describe('Core Intelligence Service - Unified Architecture', () => {
  let coreIntelligenceService: CoreIntelligenceService;
  let mockMCPOrchestrator: jest.Mocked<UnifiedMCPOrchestratorService>;
  let mockAnalyticsService: jest.Mocked<UnifiedAnalyticsService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks for constructor injection
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

    mockMessageAnalysis.analyzeMessage = jest.fn().mockResolvedValue({
      hasAttachments: false,
      hasUrls: false,
      attachmentTypes: [],
      urls: [],
      complexity: 'simple',
      intents: ['conversation'],
      requiredTools: [],
      needsPersonaSwitch: false,
      needsAdminFeatures: false,
      adminCommands: [],
      needsMultimodal: false,
      attachmentAnalysis: [],
      needsConversationManagement: false,
      conversationActions: [],
      needsMemoryOperation: false,
      memoryActions: [],
      needsMCPTools: false,
      mcpRequirements: [],
      confidence: 0.8,
      processingRecommendations: [],
      sentiment: 'neutral',
      language: 'en',
      topics: [],
      mentions: []
    });

    mockContextService.buildEnhancedContextWithUnified = jest.fn().mockResolvedValue({
      prompt: 'Test prompt with enhanced context',
      systemPrompt: 'Test system prompt',
      hasAttachments: false,
      complexity: 'simple'
    });

    mockCapabilityService.executeCapabilitiesWithUnified = jest.fn().mockResolvedValue({
      mcpResults: new Map(),
      personaSwitched: false,
      multimodalProcessed: false,
      conversationManaged: false,
      memoryUpdated: false
    });

    coreIntelligenceService = new CoreIntelligenceService({
      enableAgenticFeatures: true,
      enablePersonalization: false,
      enableEnhancedMemory: false,
      enableEnhancedUI: false,
      enableResponseCache: false,
      dependencies: {
        mcpOrchestrator: mockMCPOrchestrator,
        analyticsService: mockAnalyticsService,
        messageAnalysisService: mockMessageAnalysis
      }
    });
  });

  describe('Unified Service Integration', () => {
    test('should initialize with unified services', () => {
      expect(coreIntelligenceService).toBeDefined();
      expect(mockMCPOrchestrator.initialize).toHaveBeenCalled();
    });

    test('should build slash commands correctly', () => {
      const commands = coreIntelligenceService.buildCommands();
      
      expect(commands).toHaveLength(1);
      expect(commands[0].name).toBe('chat');
      expect(commands[0].description).toBe('Engage with intelligent conversation features.');
    });
  });

  describe('Message Processing with Unified Architecture', () => {
    test('should process message using unified services', async () => {
      const mockInteraction = {
        id: 'test-interaction',
        isChatInputCommand: () => true,
        commandName: 'chat',
        options: {
          getString: jest.fn().mockReturnValue('test message'),
          getAttachment: jest.fn().mockReturnValue(null)
        },
        user: { id: 'test-user' },
        channelId: 'test-channel',
        guildId: 'test-guild',
        deferReply: jest.fn().mockResolvedValue(undefined),
        editReply: jest.fn().mockResolvedValue(undefined)
      } as any;

      await coreIntelligenceService.handleInteraction(mockInteraction);

      expect(mockInteraction.deferReply).toHaveBeenCalled();
      expect(mockMessageAnalysis.analyzeMessage).toHaveBeenCalled();
      expect(mockMCPOrchestrator.orchestrateIntelligentResponse).toHaveBeenCalled();
      expect(mockAnalyticsService.logInteraction).toHaveBeenCalled();
    });

    test('should handle message analysis errors gracefully', async () => {
      mockMessageAnalysis.analyzeMessage = jest.fn().mockRejectedValue(new Error('Analysis failed'));

      const mockInteraction = {
        id: 'test-interaction',
        isChatInputCommand: () => true,
        commandName: 'chat',
        options: {
          getString: jest.fn().mockReturnValue('test message'),
          getAttachment: jest.fn().mockReturnValue(null)
        },
        user: { id: 'test-user' },
        channelId: 'test-channel',
        guildId: 'test-guild',
        deferReply: jest.fn().mockResolvedValue(undefined),
        editReply: jest.fn().mockResolvedValue(undefined)
      } as any;

      await coreIntelligenceService.handleInteraction(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('critical internal error')
      });
    });
  });

  describe('MCP Orchestration Integration', () => {
    test('should handle successful MCP orchestration', async () => {
      const mockMessage = {
        id: 'test-message',
        content: 'search for something',
        author: { id: 'test-user', bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      } as any;

      // Mock opted-in user
      (coreIntelligenceService as any).optedInUsers.add('test-user');

      await coreIntelligenceService.handleMessage(mockMessage);

      expect(mockMCPOrchestrator.orchestrateIntelligentResponse).toHaveBeenCalled();
      expect(mockMessage.reply).toHaveBeenCalled();
    });

    test('should handle MCP orchestration failures', async () => {
      mockMCPOrchestrator.orchestrateIntelligentResponse = jest.fn().mockResolvedValue({
        success: false,
        phase: 0,
        toolsExecuted: [],
        results: new Map(),
        fallbacksUsed: ['error'],
        executionTime: 50,
        confidence: 0.1,
        recommendations: ['Try again later']
      });

      const mockMessage = {
        id: 'test-message',
        content: 'search for something',
        author: { id: 'test-user', bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      } as any;

      (coreIntelligenceService as any).optedInUsers.add('test-user');

      await coreIntelligenceService.handleMessage(mockMessage);

      expect(mockMessage.reply).toHaveBeenCalled();
    });
  });

  describe('Analytics Integration', () => {
    test('should log interaction analytics using unified service', async () => {
      const mockInteraction = {
        id: 'test-interaction',
        isChatInputCommand: () => true,
        commandName: 'chat',
        options: {
          getString: jest.fn().mockReturnValue('test message'),
          getAttachment: jest.fn().mockReturnValue(null)
        },
        user: { id: 'test-user' },
        channelId: 'test-channel',
        guildId: 'test-guild',
        deferReply: jest.fn().mockResolvedValue(undefined),
        editReply: jest.fn().mockResolvedValue(undefined)
      } as any;

      await coreIntelligenceService.handleInteraction(mockInteraction);

      expect(mockAnalyticsService.logInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          guildId: 'test-guild',
          userId: 'test-user',
          command: expect.any(String),
          isSuccess: expect.any(Boolean)
        })
      );
    });
  });

  describe('Capability Service Integration', () => {
    test('should execute capabilities using unified method when available', async () => {
      mockCapabilityService.executeCapabilitiesWithUnified = jest.fn().mockResolvedValue({
        mcpResults: new Map([['webSearch', { query: 'test', results: [], metadata: {} }]]),
        personaSwitched: true,
        multimodalProcessed: false,
        conversationManaged: false,
        memoryUpdated: true
      });

      const mockMessage = {
        id: 'test-message',
        content: 'complex message requiring persona switch',
        author: { id: 'test-user', bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      } as any;

      (coreIntelligenceService as any).optedInUsers.add('test-user');

      // Mock analysis that requires capabilities
      mockMessageAnalysis.analyzeMessage = jest.fn().mockResolvedValue({
        hasAttachments: false,
        hasUrls: false,
        attachmentTypes: [],
        urls: [],
        complexity: 'complex',
        intents: ['conversation'],
        requiredTools: ['persona'],
        needsPersonaSwitch: true,
        suggestedPersona: 'helpful',
        needsAdminFeatures: false,
        adminCommands: [],
        needsMultimodal: false,
        attachmentAnalysis: [],
        needsConversationManagement: false,
        conversationActions: [],
        needsMemoryOperation: true,
        memoryActions: ['update'],
        needsMCPTools: true,
        mcpRequirements: ['webSearch'],
        confidence: 0.9,
        processingRecommendations: [],
        sentiment: 'neutral',
        language: 'en',
        topics: [],
        mentions: []
      });

      await coreIntelligenceService.handleMessage(mockMessage);

      expect(mockCapabilityService.executeCapabilitiesWithUnified).toHaveBeenCalled();
    });
  });

  describe('Context Service Integration', () => {
    test('should build enhanced context using unified method', async () => {
      const mockMessage = {
        id: 'test-message',
        content: 'test message with context',
        author: { id: 'test-user', bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      } as any;

      (coreIntelligenceService as any).optedInUsers.add('test-user');

      await coreIntelligenceService.handleMessage(mockMessage);

      expect(mockContextService.buildEnhancedContextWithUnified).toHaveBeenCalled();
    });

    test('should handle context building errors gracefully', async () => {
      mockContextService.buildEnhancedContextWithUnified = jest.fn().mockRejectedValue(new Error('Context failed'));

      const mockMessage = {
        id: 'test-message',
        content: 'test message',
        author: { id: 'test-user', bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      } as any;

      (coreIntelligenceService as any).optedInUsers.add('test-user');

      await coreIntelligenceService.handleMessage(mockMessage);

      // Should still reply despite context error
      expect(mockMessage.reply).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Fallbacks', () => {
    test('should gracefully handle unified service failures', async () => {
      // Mock all unified services to fail
      mockMCPOrchestrator.orchestrateIntelligentResponse = jest.fn().mockRejectedValue(new Error('MCP failed'));
      mockMessageAnalysis.analyzeMessage = jest.fn().mockRejectedValue(new Error('Analysis failed'));

      const mockInteraction = {
        id: 'test-interaction',
        isChatInputCommand: () => true,
        commandName: 'chat',
        options: {
          getString: jest.fn().mockReturnValue('test message'),
          getAttachment: jest.fn().mockReturnValue(null)
        },
        user: { id: 'test-user' },
        channelId: 'test-channel',
        guildId: 'test-guild',
        deferReply: jest.fn().mockResolvedValue(undefined),
        editReply: jest.fn().mockResolvedValue(undefined)
      } as any;

      await coreIntelligenceService.handleInteraction(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('critical internal error')
      });
    });

    test('should handle analytics logging failures gracefully', async () => {
      mockAnalyticsService.logInteraction = jest.fn().mockRejectedValue(new Error('Analytics failed'));

      const mockMessage = {
        id: 'test-message',
        content: 'test message',
        author: { id: 'test-user', bot: false },
        attachments: new Map(),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      } as any;

      (coreIntelligenceService as any).optedInUsers.add('test-user');

      await coreIntelligenceService.handleMessage(mockMessage);

      // Should still process message despite analytics failure
      expect(mockMessage.reply).toHaveBeenCalled();
    });
  });

  describe('Performance and Monitoring', () => {
    test('should track processing times through analytics', async () => {
      
      const mockInteraction = {
        id: 'test-interaction',
        isChatInputCommand: () => true,
        commandName: 'chat',
        options: {
          getString: jest.fn().mockReturnValue('test message'),
          getAttachment: jest.fn().mockReturnValue(null)
        },
        user: { id: 'test-user' },
        channelId: 'test-channel',
        guildId: 'test-guild',
        deferReply: jest.fn().mockResolvedValue(undefined),
        editReply: jest.fn().mockResolvedValue(undefined)
      } as any;

      await coreIntelligenceService.handleInteraction(mockInteraction);

      // Check that analytics was called with timing information
      expect(mockAnalyticsService.logInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          isSuccess: expect.any(Boolean)
        })
      );
    });

    test('should handle high-complexity messages efficiently', async () => {
      // Mock complex analysis
      mockMessageAnalysis.analyzeMessage = jest.fn().mockResolvedValue({
        hasAttachments: true,
        hasUrls: true,
        attachmentTypes: ['image', 'document'],
        urls: ['https://example.com'],
        complexity: 'advanced',
        intents: ['research', 'analysis'],
        requiredTools: ['webSearch', 'contentExtraction'],
        needsPersonaSwitch: true,
        suggestedPersona: 'expert',
        needsAdminFeatures: false,
        adminCommands: [],
        needsMultimodal: true,
        attachmentAnalysis: [{ type: 'image', processingPriority: 'high' }],
        needsConversationManagement: true,
        conversationActions: ['summary'],
        needsMemoryOperation: true,
        memoryActions: ['update', 'retrieve'],
        needsMCPTools: true,
        mcpRequirements: ['webSearch', 'contentExtraction'],
        confidence: 0.95,
        processingRecommendations: ['use_advanced_tools'],
        sentiment: 'neutral',
        language: 'en',
        topics: ['technology', 'research'],
        mentions: []
      });

      const mockMessage = {
        id: 'test-message',
        content: 'complex research message with attachments',
        author: { id: 'test-user', bot: false },
        attachments: new Map([
          ['1', { id: '1', name: 'test.jpg', url: 'https://example.com/test.jpg', contentType: 'image/jpeg' }]
        ]),
        channel: { sendTyping: jest.fn() },
        channelId: 'test-channel',
        guildId: 'test-guild',
        reply: jest.fn().mockResolvedValue(undefined)
      } as any;

      (coreIntelligenceService as any).optedInUsers.add('test-user');

      const startTime = Date.now();
      await coreIntelligenceService.handleMessage(mockMessage);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockMessage.reply).toHaveBeenCalled();
    });
  });
});
