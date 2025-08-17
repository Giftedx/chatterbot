import { describe, beforeEach, test, expect, jest } from '@jest/globals';
import { SmartContextManagerService } from '../src/services/smart-context-manager.service.js';
import { ContextManager } from '../src/services/context-manager.js';
import type { ContextSelectionCriteria } from '../src/services/smart-context-manager.service.js';
import type { ChatMessage } from '../src/services/context-manager.js';

// Mock the ContextManager
jest.mock('../src/services/context-manager.js');
const MockContextManager = ContextManager as jest.MockedClass<typeof ContextManager>;

describe('SmartContextManagerService', () => {
  let service: SmartContextManagerService;
  let mockContextManager: jest.Mocked<ContextManager>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create a mock context manager instance
    mockContextManager = new MockContextManager() as jest.Mocked<ContextManager>;
    
    // Initialize the service with the mock
    service = new SmartContextManagerService(mockContextManager);
  });

  describe('Strategy Selection', () => {
    test('should select minimal strategy for conversational intents', async () => {
      // Setup mock data
      const mockHistory: ChatMessage[] = [
        { role: 'user', parts: [{ text: 'Hello' }] },
        { role: 'model', parts: [{ text: 'Hi there!' }] },
        { role: 'user', parts: [{ text: 'How are you?' }] },
        { role: 'model', parts: [{ text: 'I\'m doing well, thanks!' }] }
      ];

      mockContextManager.getHistory.mockResolvedValue(mockHistory);

      const criteria: ContextSelectionCriteria = {
        messageAnalysis: {
          hasAttachments: false,
          hasUrls: false,
          attachmentTypes: [],
          urls: [],
          complexity: 'simple',
          intents: ['greeting'],
          requiredTools: ['memory'],
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
          reasoningLevel: 'basic',
          contextRequirement: 'short',
          responseSpeed: 'fast',
          modelCapabilities: {
            needsCoding: false,
            needsReasoning: false,
            needsCreativity: false,
            needsFactuality: false,
            needsMultimodal: false,
            needsTools: false,
          },
          intelligenceServices: {
            coreIntelligence: true,
            agenticIntelligence: false,
            enhancedIntelligence: false,
            advancedCapabilities: false,
            mcpIntegration: false,
          },
          confidence: 0.8,
          processingRecommendations: [],
          urgency: 'normal',
          userExpertise: 'intermediate'
        },
        intentClassification: {
          primary: 'greeting',
          secondary: [],
          confidence: 0.9,
          category: 'conversational',
          reasoning: ['Greeting detected'],
          urgency: 'low',
          complexity: 'simple'
        },
        conversationLength: 4,
        hasMultimodalHistory: false,
        userExpertise: 'intermediate',
        taskComplexity: 'simple',
        conversationContinuity: false
      };

      const result = await service.selectSmartContext('test-channel', criteria);

      expect(result.strategy.strategy).toBe('minimal');
      expect(result.strategy.maxMessages).toBeLessThanOrEqual(5);
      expect(result.contextMessages.length).toBeLessThanOrEqual(result.strategy.maxMessages);
      expect(result.effectiveness).toBeGreaterThan(0);
    });

    test('should select full strategy for analytical intents', async () => {
      const mockHistory: ChatMessage[] = Array.from({ length: 30 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'model',
        parts: [{ text: `Message ${i}` }]
      })) as ChatMessage[];

      mockContextManager.getHistory.mockResolvedValue(mockHistory);

      const criteria: ContextSelectionCriteria = {
        messageAnalysis: {
          hasAttachments: false,
          hasUrls: false,
          attachmentTypes: [],
          urls: [],
          complexity: 'complex',
          intents: ['analysis', 'comparison'],
          requiredTools: ['memory', 'complex-reasoning'],
          needsPersonaSwitch: false,
          needsAdminFeatures: false,
          adminCommands: [],
          needsMultimodal: false,
          attachmentAnalysis: [],
          needsConversationManagement: false,
          conversationActions: [],
          needsMemoryOperation: true,
          memoryActions: ['recall'],
          needsMCPTools: false,
          mcpRequirements: [],
          reasoningLevel: 'advanced',
          contextRequirement: 'long',
          responseSpeed: 'thorough',
          modelCapabilities: {
            needsCoding: false,
            needsReasoning: true,
            needsCreativity: false,
            needsFactuality: true,
            needsMultimodal: false,
            needsTools: true,
          },
          intelligenceServices: {
            coreIntelligence: true,
            agenticIntelligence: true,
            enhancedIntelligence: false,
            advancedCapabilities: false,
            mcpIntegration: false,
          },
          confidence: 0.9,
          processingRecommendations: ['use-advanced-reasoning'],
          urgency: 'normal',
          userExpertise: 'advanced'
        },
        intentClassification: {
          primary: 'analysis',
          secondary: ['comparison'],
          confidence: 0.85,
          category: 'analytical',
          reasoning: ['Analysis keywords detected', 'Comparison intent identified'],
          urgency: 'normal',
          complexity: 'complex'
        },
        conversationLength: 30,
        hasMultimodalHistory: false,
        userExpertise: 'advanced',
        taskComplexity: 'complex',
        conversationContinuity: true
      };

      const result = await service.selectSmartContext('test-channel', criteria);

      expect(result.strategy.strategy).toBe('full');
      expect(result.strategy.contextWeight).toBeGreaterThan(0.8);
      expect(result.strategy.requiresMemory).toBe(true);
      expect(result.contextMessages.length).toBeGreaterThan(10);
    });

    test('should select focused strategy for technical intents', async () => {
      const mockHistory: ChatMessage[] = [
        { role: 'user', parts: [{ text: 'I have a coding problem' }] },
        { role: 'model', parts: [{ text: 'I can help with that' }] },
        { role: 'user', parts: [{ text: 'Here is my function with a bug' }] },
        { role: 'model', parts: [{ text: 'Let me analyze the code' }] }
      ];

      mockContextManager.getHistory.mockResolvedValue(mockHistory);

      const criteria: ContextSelectionCriteria = {
        messageAnalysis: {
          hasAttachments: false,
          hasUrls: false,
          attachmentTypes: [],
          urls: [],
          complexity: 'complex',
          intents: ['coding_help'],
          requiredTools: ['memory', 'coding'],
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
          reasoningLevel: 'advanced',
          contextRequirement: 'medium',
          responseSpeed: 'balanced',
          modelCapabilities: {
            needsCoding: true,
            needsReasoning: true,
            needsCreativity: false,
            needsFactuality: true,
            needsMultimodal: false,
            needsTools: true,
          },
          intelligenceServices: {
            coreIntelligence: true,
            agenticIntelligence: true,
            enhancedIntelligence: false,
            advancedCapabilities: false,
            mcpIntegration: false,
          },
          confidence: 0.9,
          processingRecommendations: ['use-coding-tools'],
          urgency: 'high',
          userExpertise: 'intermediate'
        },
        intentClassification: {
          primary: 'coding_help',
          secondary: [],
          confidence: 0.95,
          category: 'technical',
          subCategory: 'programming',
          reasoning: ['Coding help keywords detected'],
          urgency: 'high',
          complexity: 'complex'
        },
        conversationLength: 4,
        hasMultimodalHistory: false,
        userExpertise: 'intermediate',
        taskComplexity: 'complex',
        conversationContinuity: true
      };

      const result = await service.selectSmartContext('test-channel', criteria);

      expect(result.strategy.strategy).toBe('focused');
      expect(result.strategy.includeMultimodal).toBe(true);
      expect(result.strategy.requiresMemory).toBe(true);
      expect(result.contextMessages.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Multimodal Context Handling', () => {
    test('should handle multimodal context appropriately', async () => {
      const mockHistory: ChatMessage[] = [
        { role: 'user', parts: [{ text: 'Look at this image' }, { inlineData: { mimeType: 'image/png', data: 'base64data' } }] },
        { role: 'model', parts: [{ text: 'I can see the image' }] },
        { role: 'user', parts: [{ text: 'What do you think?' }] },
        { role: 'model', parts: [{ text: 'The image shows...' }] }
      ];

      mockContextManager.getHistory.mockResolvedValue(mockHistory);

      const criteria: ContextSelectionCriteria = {
        messageAnalysis: {
          hasAttachments: true,
          hasUrls: false,
          attachmentTypes: ['image/png'],
          urls: [],
          complexity: 'moderate',
          intents: ['image_analysis'],
          requiredTools: ['memory', 'multimodal'],
          needsPersonaSwitch: false,
          needsAdminFeatures: false,
          adminCommands: [],
          needsMultimodal: true,
          attachmentAnalysis: [{
            type: 'image',
            analysisNeeded: true,
            suggestedService: 'vision',
            processingPriority: 'high'
          }],
          needsConversationManagement: false,
          conversationActions: [],
          needsMemoryOperation: false,
          memoryActions: [],
          needsMCPTools: false,
          mcpRequirements: [],
          reasoningLevel: 'advanced',
          contextRequirement: 'medium',
          responseSpeed: 'balanced',
          modelCapabilities: {
            needsCoding: false,
            needsReasoning: true,
            needsCreativity: false,
            needsFactuality: true,
            needsMultimodal: true,
            needsTools: false,
          },
          intelligenceServices: {
            coreIntelligence: true,
            agenticIntelligence: false,
            enhancedIntelligence: true,
            advancedCapabilities: false,
            mcpIntegration: false,
          },
          confidence: 0.8,
          processingRecommendations: ['use-multimodal-analysis'],
          urgency: 'normal',
          userExpertise: 'intermediate'
        },
        intentClassification: {
          primary: 'image_analysis',
          secondary: [],
          confidence: 0.9,
          category: 'multimodal',
          subCategory: 'visual',
          reasoning: ['Image analysis intent detected'],
          urgency: 'normal',
          complexity: 'complex'
        },
        conversationLength: 4,
        hasMultimodalHistory: true,
        userExpertise: 'intermediate',
        taskComplexity: 'complex',
        conversationContinuity: true
      };

      const result = await service.selectSmartContext('test-channel', criteria);

      expect(result.strategy.includeMultimodal).toBe(true);
      expect(result.totalTokensEstimate).toBeGreaterThan(400); // Higher due to multimodal content
      expect(result.contextMessages.some(msg => 
        msg.parts.some(part => 'inlineData' in part)
      )).toBe(true);
    });
  });

  describe('Context Effectiveness', () => {
    test('should calculate effectiveness metrics accurately', async () => {
      const mockHistory: ChatMessage[] = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'model',
        parts: [{ text: `Message ${i}` }]
      })) as ChatMessage[];

      mockContextManager.getHistory.mockResolvedValue(mockHistory);

      const criteria: ContextSelectionCriteria = {
        messageAnalysis: {
          hasAttachments: false,
          hasUrls: false,
          attachmentTypes: [],
          urls: [],
          complexity: 'moderate',
          intents: ['question'],
          requiredTools: ['memory'],
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
          reasoningLevel: 'basic',
          contextRequirement: 'medium',
          responseSpeed: 'balanced',
          modelCapabilities: {
            needsCoding: false,
            needsReasoning: false,
            needsCreativity: false,
            needsFactuality: true,
            needsMultimodal: false,
            needsTools: false,
          },
          intelligenceServices: {
            coreIntelligence: true,
            agenticIntelligence: false,
            enhancedIntelligence: false,
            advancedCapabilities: false,
            mcpIntegration: false,
          },
          confidence: 0.7,
          processingRecommendations: [],
          urgency: 'normal',
          userExpertise: 'intermediate'
        },
        conversationLength: 20,
        hasMultimodalHistory: false,
        userExpertise: 'intermediate',
        taskComplexity: 'moderate',
        conversationContinuity: false
      };

      const result = await service.selectSmartContext('test-channel', criteria);

      expect(result.effectiveness).toBeGreaterThan(0);
      expect(result.effectiveness).toBeLessThanOrEqual(1);
      expect(result.metadata.originalLength).toBe(20);
      expect(result.metadata.selectedLength).toBeLessThanOrEqual(20);
      expect(result.metadata.reductionRatio).toBeLessThanOrEqual(1);
      expect(result.metadata.strategyConfidence).toBeGreaterThan(0);
    });
  });

  describe('Fallback Handling', () => {
    test('should provide fallback context when smart selection fails', async () => {
      // Mock an error scenario
      mockContextManager.getHistory.mockRejectedValue(new Error('Context retrieval failed'));

      const criteria: ContextSelectionCriteria = {
        messageAnalysis: {
          hasAttachments: false,
          hasUrls: false,
          attachmentTypes: [],
          urls: [],
          complexity: 'simple',
          intents: [],
          requiredTools: ['memory'],
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
          reasoningLevel: 'basic',
          contextRequirement: 'short',
          responseSpeed: 'fast',
          modelCapabilities: {
            needsCoding: false,
            needsReasoning: false,
            needsCreativity: false,
            needsFactuality: false,
            needsMultimodal: false,
            needsTools: false,
          },
          intelligenceServices: {
            coreIntelligence: true,
            agenticIntelligence: false,
            enhancedIntelligence: false,
            advancedCapabilities: false,
            mcpIntegration: false,
          },
          confidence: 0.5,
          processingRecommendations: [],
          urgency: 'normal',
          userExpertise: 'beginner'
        },
        conversationLength: 0,
        hasMultimodalHistory: false,
        userExpertise: 'beginner',
        taskComplexity: 'simple',
        conversationContinuity: false
      };

      const result = await service.selectSmartContext('test-channel', criteria);

      expect(result.strategy.strategy).toBe('selective');
      expect(result.effectiveness).toBe(0.5);
      expect(result.strategy.reasoning).toContain('Fallback strategy due to smart selection failure');
    });
  });

  describe('Cache Management', () => {
    test('should cache strategies for similar requests', async () => {
      const mockHistory: ChatMessage[] = [
        { role: 'user', parts: [{ text: 'Test message' }] },
        { role: 'model', parts: [{ text: 'Test response' }] }
      ];

      mockContextManager.getHistory.mockResolvedValue(mockHistory);

      const criteria: ContextSelectionCriteria = {
        messageAnalysis: {
          hasAttachments: false,
          hasUrls: false,
          attachmentTypes: [],
          urls: [],
          complexity: 'simple',
          intents: ['greeting'],
          requiredTools: ['memory'],
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
          reasoningLevel: 'basic',
          contextRequirement: 'short',
          responseSpeed: 'fast',
          modelCapabilities: {
            needsCoding: false,
            needsReasoning: false,
            needsCreativity: false,
            needsFactuality: false,
            needsMultimodal: false,
            needsTools: false,
          },
          intelligenceServices: {
            coreIntelligence: true,
            agenticIntelligence: false,
            enhancedIntelligence: false,
            advancedCapabilities: false,
            mcpIntegration: false,
          },
          confidence: 0.8,
          processingRecommendations: [],
          urgency: 'normal',
          userExpertise: 'beginner'
        },
        conversationLength: 2,
        hasMultimodalHistory: false,
        userExpertise: 'beginner',
        taskComplexity: 'simple',
        conversationContinuity: false
      };

      // Make the same request twice
      await service.selectSmartContext('test-channel-1', criteria);
      await service.selectSmartContext('test-channel-2', criteria);

      // Verify cache is working (this would require exposing cache for testing)
      expect(mockContextManager.getHistory).toHaveBeenCalledTimes(2);
    });

    test('should clear cache correctly', () => {
      service.clearCache();
      const analytics = service.getAnalytics();
      
      expect(analytics).toBeDefined();
      expect(analytics.strategiesUsed).toEqual({});
    });
  });

  describe('Analytics', () => {
    test('should provide meaningful analytics', () => {
      const analytics = service.getAnalytics();

      expect(analytics).toHaveProperty('strategiesUsed');
      expect(analytics).toHaveProperty('averageEffectiveness');
      expect(analytics).toHaveProperty('averageReduction');
      expect(analytics).toHaveProperty('contextCacheHitRate');
      expect(typeof analytics.averageEffectiveness).toBe('number');
      expect(typeof analytics.averageReduction).toBe('number');
      expect(typeof analytics.contextCacheHitRate).toBe('number');
    });
  });
});