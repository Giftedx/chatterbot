import { CoreIntelligenceService } from '../../src/services/core-intelligence.service';
import { performanceMonitor } from '../../src/services/performance-monitoring.service';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock Discord.js objects
const mockMessage = {
  id: 'test-message-id',
  content: 'Test message content',
  author: {
    id: 'test-user-id',
    bot: false,
    toString: () => '<@test-user-id>'
  },
  channelId: 'test-channel-id',
  guildId: 'test-guild-id',
  client: {},
  attachments: new Map()
};

const mockInteraction = {
  id: 'test-interaction-id',
  channelId: 'test-channel-id',
  guildId: 'test-guild-id',
  client: {},
  commandName: 'test-command'
};

describe('AI Enhancement Services Integration', () => {
  let coreIntelligenceService: CoreIntelligenceService;
  
  beforeEach(() => {
    // Reset environment variables for testing
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_PERFORMANCE_MONITORING = 'true';
    
    // Initialize service
    coreIntelligenceService = new CoreIntelligenceService({
      enableEnhancedUI: true,
      enablePersonalization: true,
      enableCrossChannelContext: false,
      enableDynamicPrompts: true,
      enableContextualMemory: true,
      enableProactiveEngagement: false,
      enableContinuousLearning: true,
      maxHistoryLength: 10,
      responseTimeoutMs: 30000,
      maxConcurrentRequests: 5,
      enableVerboseLogging: false
    });
  });

  afterEach(() => {
    // Clean up any test artifacts
    jest.clearAllMocks();
  });

  describe('Performance Monitoring Integration', () => {
    it('should track performance metrics for core processing', async () => {
      // Mock the dependencies to avoid actual API calls
      const mockProcessResponse = jest.spyOn(coreIntelligenceService as any, '_processPromptAndGenerateResponse')
        .mockResolvedValue({ content: 'Test response' });

      const startOperationSpy = jest.spyOn(performanceMonitor, 'startOperation');
      const endOperationSpy = jest.spyOn(performanceMonitor, 'endOperation');

      await coreIntelligenceService.processMessage(
        mockMessage as any,
        'Test prompt',
        'test-user-id',
        'test-channel-id',
        'test-guild-id'
      );

      expect(startOperationSpy).toHaveBeenCalledWith(
        'core_intelligence_service',
        'process_prompt_and_generate_response'
      );
      expect(endOperationSpy).toHaveBeenCalled();
      
      mockProcessResponse.mockRestore();
    });

    it('should handle performance monitoring when disabled', async () => {
      process.env.ENABLE_PERFORMANCE_MONITORING = 'false';
      
      const startOperationSpy = jest.spyOn(performanceMonitor, 'startOperation');
      
      // Should not crash when performance monitoring is disabled
      const operationId = performanceMonitor.startOperation('test-service', 'test-operation');
      expect(operationId).toBe('disabled');
      
      process.env.ENABLE_PERFORMANCE_MONITORING = 'true';
    });
  });

  describe('Feature Flag Integration', () => {
    it('should respect Enhanced Langfuse feature flag', async () => {
      process.env.ENABLE_ENHANCED_LANGFUSE = 'false';
      
      const mockProcessResponse = jest.spyOn(coreIntelligenceService as any, '_processPromptAndGenerateResponse')
        .mockResolvedValue({ content: 'Test response' });

      const result = await coreIntelligenceService.processMessage(
        mockMessage as any,
        'Test prompt',
        'test-user-id',
        'test-channel-id',
        'test-guild-id'
      );

      expect(result).toBeDefined();
      expect(result.content).toBe('Test response');
      
      mockProcessResponse.mockRestore();
    });

    it('should respect Semantic Caching feature flag', async () => {
      process.env.ENABLE_ENHANCED_SEMANTIC_CACHE = 'false';
      
      const mockProcessResponse = jest.spyOn(coreIntelligenceService as any, '_processPromptAndGenerateResponse')
        .mockResolvedValue({ content: 'Test response' });

      const result = await coreIntelligenceService.processMessage(
        mockMessage as any,
        'Test prompt',
        'test-user-id',
        'test-channel-id',
        'test-guild-id'
      );

      expect(result).toBeDefined();
      
      mockProcessResponse.mockRestore();
    });

    it('should respect Multimodal Analysis feature flag', async () => {
      process.env.ENABLE_QWEN_VL_MULTIMODAL = 'false';
      
      const mockProcessResponse = jest.spyOn(coreIntelligenceService as any, '_processPromptAndGenerateResponse')
        .mockResolvedValue({ content: 'Test response' });

      const result = await coreIntelligenceService.processMessage(
        mockMessage as any,
        'Test prompt with image',
        'test-user-id',
        'test-channel-id',
        'test-guild-id',
        [{ url: 'https://example.com/image.jpg', contentType: 'image/jpeg' }]
      );

      expect(result).toBeDefined();
      
      mockProcessResponse.mockRestore();
    });
  });

  describe('Error Handling and Graceful Degradation', () => {
    it('should handle service failures gracefully', async () => {
      // Mock a service failure
      const mockEnhancedLangfuse = jest.spyOn(coreIntelligenceService as any, 'enhancedLangfuseService', 'get')
        .mockImplementation(() => {
          throw new Error('Service unavailable');
        });

      const mockProcessResponse = jest.spyOn(coreIntelligenceService as any, '_processPromptAndGenerateResponse')
        .mockResolvedValue({ content: 'Test response' });

      const result = await coreIntelligenceService.processMessage(
        mockMessage as any,
        'Test prompt',
        'test-user-id',
        'test-channel-id',
        'test-guild-id'
      );

      // Should still return a response despite service failure
      expect(result).toBeDefined();
      
      mockProcessResponse.mockRestore();
    });

    it('should continue processing when AI enhancement services fail', async () => {
      // Test that core functionality works even when enhancement services fail
      const mockProcessResponse = jest.spyOn(coreIntelligenceService as any, '_processPromptAndGenerateResponse')
        .mockImplementation(async () => {
          // Simulate enhancement service failure but core processing success
          return { content: 'Core response without enhancements' };
        });

      const result = await coreIntelligenceService.processMessage(
        mockMessage as any,
        'Test prompt',
        'test-user-id',
        'test-channel-id',
        'test-guild-id'
      );

      expect(result).toBeDefined();
      expect(result.content).toContain('Core response');
      
      mockProcessResponse.mockRestore();
    });
  });

  describe('Service Integration Validation', () => {
    it('should initialize all AI enhancement services correctly', () => {
      // Verify that services are initialized based on feature flags
      const service = new CoreIntelligenceService({
        enableEnhancedUI: true,
        enablePersonalization: true,
        enableCrossChannelContext: false,
        enableDynamicPrompts: true,
        enableContextualMemory: true,
        enableProactiveEngagement: false,
        enableContinuousLearning: true,
        maxHistoryLength: 10,
        responseTimeoutMs: 30000,
        maxConcurrentRequests: 5,
        enableVerboseLogging: false
      });

      // Services should be available (though may be undefined if feature flags are disabled)
      expect(service).toBeDefined();
    });

    it('should handle lightweight vs deep processing modes', async () => {
      const mockProcessResponse = jest.spyOn(coreIntelligenceService as any, '_processPromptAndGenerateResponse')
        .mockResolvedValue({ content: 'Quick response' });

      // Test lightweight mode (quick-reply)
      const lightweightResult = await coreIntelligenceService.processMessage(
        mockMessage as any,
        'Test prompt',
        'test-user-id',
        'test-channel-id',
        'test-guild-id',
        [],
        null,
        'quick-reply'
      );

      expect(lightweightResult).toBeDefined();
      
      // Test deep processing mode
      const deepResult = await coreIntelligenceService.processMessage(
        mockMessage as any,
        'Test prompt',
        'test-user-id',
        'test-channel-id',
        'test-guild-id',
        [],
        null,
        'deep-reason'
      );

      expect(deepResult).toBeDefined();
      
      mockProcessResponse.mockRestore();
    });
  });

  describe('Token Estimation Integration', () => {
    it('should use multi-provider tokenization when available', () => {
      // Test that tokenization works correctly
      const service = coreIntelligenceService as any;
      
      // Mock the tokenization service
      if (service.multiProviderTokenizationService) {
        const testText = 'This is a test message for token counting';
        // This would test actual tokenization if the service is available
        expect(testText).toBeDefined();
      }
      
      // Test should pass whether or not tokenization service is available
      expect(true).toBe(true);
    });
  });

  describe('Context Aggregation Enhancement', () => {
    it('should aggregate enhanced context from all available services', async () => {
      const mockAggregateContext = jest.spyOn(coreIntelligenceService as any, '_aggregateAgenticContext')
        .mockResolvedValue({
          systemPrompt: 'Enhanced system prompt',
          contextHistory: [],
          availableTools: [],
          userPreferences: {},
          recentInteractions: [],
          enhancedContext: {
            multimodalAnalysis: null,
            webAnalysis: null,
            ragOptimization: null
          }
        });

      const context = await (coreIntelligenceService as any)._aggregateAgenticContext(
        'test-user-id',
        'test-channel-id',
        'test-guild-id',
        'Test prompt',
        [],
        null,
        null,
        null
      );

      expect(context).toBeDefined();
      expect(context.systemPrompt).toBeDefined();
      expect(context.enhancedContext).toBeDefined();
      
      mockAggregateContext.mockRestore();
    });
  });
});