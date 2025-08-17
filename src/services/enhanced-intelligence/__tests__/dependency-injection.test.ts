/**
 * Test suite for dependency injection in EnhancedInvisibleIntelligenceService
 * Validates that the service properly accepts dependencies and can be mocked for testing
 */

import { 
  EnhancedInvisibleIntelligenceService, 
  createEnhancedInvisibleIntelligenceService 
} from '../index.js';
import type { 
  IEnhancedIntelligenceServiceDependencies,
  IMCPToolsService,
  IMemoryService,
  IUIService,
  IResponseService,
  ICacheService,
  IUserMemoryService,
  IPersonalizationEngine,
  IBehaviorAnalyticsService,
  ISmartRecommendationService
} from '../interfaces.js';


describe('EnhancedInvisibleIntelligenceService - Dependency Injection', () => {
  let mockDependencies: IEnhancedIntelligenceServiceDependencies;
  let mockMCPToolsService: jest.Mocked<IMCPToolsService>;
  let mockMemoryService: jest.Mocked<IMemoryService>;
  let mockUIService: jest.Mocked<IUIService>;
  let mockResponseService: jest.Mocked<IResponseService>;
  let mockCacheService: jest.Mocked<ICacheService>;
  let mockUserMemoryService: jest.Mocked<IUserMemoryService>;
  let mockPersonalizationEngine: jest.Mocked<IPersonalizationEngine>;
  let mockBehaviorAnalytics: jest.Mocked<IBehaviorAnalyticsService>;
  let mockSmartRecommendations: jest.Mocked<ISmartRecommendationService>;

  beforeEach(() => {
    // Create mock implementations for all dependencies
    mockMCPToolsService = {
      processWithAllTools: jest.fn().mockResolvedValue(undefined),
      getToolRecommendations: jest.fn().mockReturnValue([
        { id: 'test-tool', name: 'Test Tool', confidence: 0.8, reasoning: 'Test reasoning' }
      ]),
      initialize: jest.fn().mockResolvedValue(undefined)
    };

    mockMemoryService = {
      storeConversationMemory: jest.fn().mockResolvedValue(undefined),
      getUserMemories: jest.fn().mockReturnValue([{ // Return a mock memory entry
        userId: 'test-user',
        channelId: 'test-channel',
        timestamp: new Date(),
        prompt: 'test prompt',
        response: 'test response',
        toolsUsed: ['test-tool'],
        analysis: { complexity: 'simple', intents: [], requiredTools: [] }
      }]),
      cleanupOldMemories: jest.fn().mockReturnValue(undefined)
    };

    mockUIService = {
      initializeStreamingResponse: jest.fn().mockResolvedValue(undefined),
      finalizeStreamingResponse: jest.fn().mockResolvedValue(undefined),
      getLastPrompt: jest.fn().mockReturnValue('test prompt') // Return a prompt instead of undefined
    };

    mockResponseService = {
      generateEnhancedResponse: jest.fn().mockResolvedValue('Mock response'),
      generateRegeneratedResponse: jest.fn().mockResolvedValue('Mock regenerated response'),
      generateProcessingExplanation: jest.fn().mockReturnValue('Mock explanation')
    };

    mockCacheService = {
      getCachedResponse: jest.fn().mockReturnValue(null),
      cacheResponse: jest.fn().mockReturnValue(undefined),
      clear: jest.fn().mockReturnValue(undefined),
      getStats: jest.fn().mockReturnValue({ size: 0, hitRate: 0, totalEntries: 0 })
    };

    mockUserMemoryService = {
      processConversation: jest.fn().mockResolvedValue(true)
    };

    mockPersonalizationEngine = {
      recordInteraction: jest.fn().mockResolvedValue(undefined),
      generatePersonalizedRecommendations: jest.fn().mockResolvedValue([]),
      adaptResponse: jest.fn().mockResolvedValue({
        originalResponse: 'test',
        personalizedResponse: 'personalized test',
        adaptations: [],
        confidenceScore: 0.5
      }),
      getPersonalizationMetrics: jest.fn().mockReturnValue({
        totalUsers: 0,
        totalInteractions: 0,
        averageInteractionsPerUser: 0,
        recommendationAccuracy: 0,
        averageConfidence: 0
      })
    };

    mockBehaviorAnalytics = {
      recordBehaviorMetric: jest.fn().mockResolvedValue(undefined),
      analyzeBehaviorPatterns: jest.fn().mockResolvedValue({ patterns: [] }),
      generateBehaviorSummary: jest.fn().mockResolvedValue(null)
    };

    mockSmartRecommendations = {
      generateSmartRecommendations: jest.fn().mockResolvedValue([]),
      getContextualToolRecommendations: jest.fn().mockResolvedValue([]),
      getLearningPathRecommendations: jest.fn().mockResolvedValue([]),
      recordRecommendationFeedback: jest.fn().mockResolvedValue(undefined),
      getRecommendationMetrics: jest.fn().mockReturnValue({
        totalEngines: 0,
        engineWeights: {}
      })
    };

    mockDependencies = {
      mcpToolsService: mockMCPToolsService,
      memoryService: mockMemoryService,
      uiService: mockUIService,
      responseService: mockResponseService,
      cacheService: mockCacheService,
      userMemoryService: mockUserMemoryService,
      personalizationEngine: mockPersonalizationEngine,
      behaviorAnalytics: mockBehaviorAnalytics,
      smartRecommendations: mockSmartRecommendations
    };
  });

  describe('Constructor Dependency Injection', () => {
    it('should accept all dependencies via constructor', () => {
      const service = new EnhancedInvisibleIntelligenceService(mockDependencies);
      expect(service).toBeDefined();
      expect(service.createSlashCommand).toBeDefined();
    });

    it('should initialize MCP tools service on construction', () => {
      new EnhancedInvisibleIntelligenceService(mockDependencies);
      expect(mockMCPToolsService.initialize).toHaveBeenCalledTimes(1);
    });

    it('should work with minimal dependencies (no optional personalization services)', () => {
      const minimalDependencies = {
        mcpToolsService: mockMCPToolsService,
        memoryService: mockMemoryService,
        uiService: mockUIService,
        responseService: mockResponseService,
        cacheService: mockCacheService,
        userMemoryService: mockUserMemoryService
      };

      const service = new EnhancedInvisibleIntelligenceService(minimalDependencies);
      expect(service).toBeDefined();
      expect(service.createSlashCommand).toBeDefined();
    });
  });

  describe('Service Method Interaction with Dependencies', () => {
    let service: EnhancedInvisibleIntelligenceService;

    beforeEach(() => {
      service = new EnhancedInvisibleIntelligenceService(mockDependencies);
    });

    it('should use response service to generate enhanced response', async () => {
      const testUserId = 'test-user';
      const testChannelId = 'test-channel';
      
      const result = await service.handleRegenerateEnhanced(testUserId, testChannelId, null);
      
      expect(result).toBe('Mock regenerated response');
      expect(mockResponseService.generateRegeneratedResponse).toHaveBeenCalledWith(
        testUserId,
        testChannelId,
        null,
        expect.any(String)
      );
    });

    it('should use memory service to get user memories', async () => {
      const testUserId = 'test-user';
      
      const result = await service.handleExplainProcessing(testUserId);
      
      expect(mockMemoryService.getUserMemories).toHaveBeenCalledWith(testUserId);
      expect(result).toBe('Mock explanation');
    });

    it('should use cache service for performance stats', () => {
      const stats = service.getPerformanceStats();
      
      expect(mockCacheService.getStats).toHaveBeenCalledTimes(1);
      expect(stats).toEqual({
        cache: { size: 0, hitRate: 0, totalEntries: 0 },
        service: 'Enhanced Intelligence v2.0'
      });
    });

    it('should use personalization engine when available', async () => {
      const testUserId = 'test-user';
      const testResponse = 'test response';
      
      // Use a private method via reflection to test adaptPersonalizedResponse
      const adaptMethod = (service as any).adaptPersonalizedResponse;
      const result = await adaptMethod.call(service, testUserId, testResponse);
      
      expect(mockPersonalizationEngine.adaptResponse).toHaveBeenCalledWith(
        testUserId,
        testResponse,
        undefined
      );
      expect(result).toBe('personalized test');
    });

    it('should handle missing personalization engine gracefully', async () => {
      const dependenciesWithoutPersonalization = {
        ...mockDependencies,
        personalizationEngine: undefined
      };
      
      const serviceWithoutPersonalization = new EnhancedInvisibleIntelligenceService(dependenciesWithoutPersonalization);
      
      const testUserId = 'test-user';
      const testResponse = 'test response';
      
      // Use a private method via reflection to test adaptPersonalizedResponse
      const adaptMethod = (serviceWithoutPersonalization as any).adaptPersonalizedResponse;
      const result = await adaptMethod.call(serviceWithoutPersonalization, testUserId, testResponse);
      
      expect(result).toBe(testResponse); // Should return original response
    });
  });

  describe('Factory Function', () => {
    it('should create service with real dependencies via factory', () => {
      const service = createEnhancedInvisibleIntelligenceService();
      expect(service).toBeDefined();
      expect(service.createSlashCommand).toBeDefined();
    });

    it('should create service with MCP manager via factory', () => {
      const mockMCPManager = {} as any;
      const service = createEnhancedInvisibleIntelligenceService(mockMCPManager);
      expect(service).toBeDefined();
      expect(service.createSlashCommand).toBeDefined();
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should call cleanup on memory and cache services', () => {
      const service = new EnhancedInvisibleIntelligenceService(mockDependencies);
      
      service.cleanup();
      
      expect(mockMemoryService.cleanupOldMemories).toHaveBeenCalledTimes(1);
      expect(mockCacheService.clear).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling with Dependencies', () => {
    it('should handle MCP service initialization failure gracefully', () => {
      const failingMCPService = {
        ...mockMCPToolsService,
        initialize: jest.fn().mockRejectedValue(new Error('MCP init failed'))
      };
      
      const dependenciesWithFailingMCP = {
        ...mockDependencies,
        mcpToolsService: failingMCPService
      };
      
      // Should not throw during construction
      expect(() => {
        new EnhancedInvisibleIntelligenceService(dependenciesWithFailingMCP);
      }).not.toThrow();
    });

    it('should handle personalization service initialization failure gracefully', () => {
      const failingPersonalizationEngine = {
        ...mockPersonalizationEngine,
        recordInteraction: jest.fn().mockRejectedValue(new Error('Personalization failed'))
      };
      
      const dependenciesWithFailingPersonalization = {
        ...mockDependencies,
        personalizationEngine: failingPersonalizationEngine
      };
      
      // Should not throw during construction
      expect(() => {
        new EnhancedInvisibleIntelligenceService(dependenciesWithFailingPersonalization);
      }).not.toThrow();
    });
  });

  describe('Command Creation', () => {
    it('should create proper slash command structure', () => {
      const service = new EnhancedInvisibleIntelligenceService(mockDependencies);
      const command = service.createSlashCommand();
      
      expect(command.name).toBe('chat');
  expect(command.description).toBe('Opt in to start chatting (initial setup only)');
      
      // Convert to JSON to access the properties
  const commandData = command.toJSON();
  expect((commandData as any).options || []).toHaveLength(0);
    });
  });
});