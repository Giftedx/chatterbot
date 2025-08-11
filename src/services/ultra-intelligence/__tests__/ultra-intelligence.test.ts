/**
 * Ultra-Intelligence System Tests
 * 
 * Comprehensive tests for the ultra-intelligent Discord AI capabilities
 */

import { UltraIntelligenceOrchestrator } from '../orchestrator.service.js';
import { UltraIntelligentResearchService } from '../research.service.js';
import { HumanLikeConversationService } from '../conversation.service.js';
import type { UltraIntelligenceConfig, UltraIntelligenceContext } from '../orchestrator.service.js';

// Mock logger to prevent console spam in tests
jest.mock('../../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock MCP functions
const mockBraveWebSearch = jest.fn();
jest.mock('../../../mcp/index.js', () => ({
  braveWebSearch: mockBraveWebSearch
}));

describe('Ultra-Intelligence System', () => {
  let orchestrator: UltraIntelligenceOrchestrator;
  let config: UltraIntelligenceConfig;

  beforeEach(() => {
    config = {
      enableAdvancedMemory: true,
      enableAutonomousReasoning: true,
      enableUltraResearch: true,
      enableHumanConversation: true,
      adaptationSpeed: 0.7,
      creativityLevel: 0.8,
      socialAwareness: 0.9,
      expertiseConfidence: 0.8,
      preferredPersonality: 'adaptive',
      maxProcessingTime: 30000,
      enableRealTimeLearning: true,
      enableProactiveInsights: true,
      enableMultiModalProcessing: true,
      enableServerCultureAdaptation: true,
      enableUserRelationshipMemory: true,
      enableContinuousImprovement: true
    };

    orchestrator = new UltraIntelligenceOrchestrator(config);

    // Setup mock search results
    mockBraveWebSearch.mockResolvedValue({
      webPages: {
        value: [
          {
            url: 'https://example.com/article1',
            name: 'Comprehensive Guide to Gaming',
            snippet: 'A detailed guide covering all aspects of gaming strategies and techniques.',
            dateLastCrawled: new Date().toISOString()
          },
          {
            url: 'https://reddit.com/r/gaming/article2',
            name: 'Latest Gaming Meta Discussion',
            snippet: 'Discussion about current gaming meta and tier lists for competitive play.',
            dateLastCrawled: new Date().toISOString()
          }
        ]
      }
    });
  });

  describe('UltraIntelligenceOrchestrator', () => {
    test('should initialize with all capabilities enabled', () => {
      const status = orchestrator.getUltraIntelligenceStatus();
      
      expect(status.config).toEqual(config);
      expect(status.capabilityStatus.advancedMemory).toBe(true);
      expect(status.capabilityStatus.autonomousReasoning).toBe(true);
      expect(status.capabilityStatus.ultraResearch).toBe(true);
      expect(status.capabilityStatus.humanConversation).toBe(true);
      expect(status.readiness).toBe('optimal');
    });

    test('should process gaming-related query with ultra-intelligence', async () => {
      const context: UltraIntelligenceContext = {
        userId: 'user123',
        serverId: 'server456',
        channelId: 'channel789',
        messageContent: 'What are the best strategies for Valorant?',
        conversationHistory: [],
        serverContext: {
          culture: 'gaming',
          activityLevel: 'moderate',
          memberCount: 150,
          commonTopics: ['valorant', 'esports', 'gaming']
        },
        userContext: {
          relationshipLevel: 0.3,
          preferredStyle: 'casual',
          expertiseAreas: ['gaming'],
          currentMood: 'curious'
        },
        requestContext: {
          complexity: 'moderate',
          urgency: 'medium',
          domain: 'gaming',
          requiresResearch: true,
          requiresMemory: false
        }
      };

      const result = await orchestrator.processWithUltraIntelligence(
        'What are the best strategies for Valorant?',
        context
      );

      expect(result.response).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.naturalness).toBeGreaterThan(0.4);
      expect(result.capabilitiesUsed).toContain('Ultra Research');
      expect(result.capabilitiesUsed).toContain('Human Conversation');
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    test('should handle technical query with high complexity', async () => {
      const context: UltraIntelligenceContext = {
        userId: 'dev456',
        serverId: 'techserver',
        channelId: 'dev-channel',
        messageContent: 'How do I implement a microservices architecture with proper load balancing and fault tolerance?',
        conversationHistory: [],
        serverContext: {
          culture: 'professional',
          activityLevel: 'busy',
          memberCount: 50,
          commonTopics: ['programming', 'architecture', 'devops']
        },
        userContext: {
          relationshipLevel: 0.8,
          preferredStyle: 'technical',
          expertiseAreas: ['programming', 'system design'],
          currentMood: 'serious'
        },
        requestContext: {
          complexity: 'expert',
          urgency: 'high',
          domain: 'technical',
          requiresResearch: true,
          requiresMemory: true
        }
      };

      const result = await orchestrator.processWithUltraIntelligence(
        'How do I implement a microservices architecture with proper load balancing and fault tolerance?',
        context
      );

      expect(result.response).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.expertiseLevel).toBeGreaterThan(0.7);
      expect(result.capabilitiesUsed).toContain('Autonomous Reasoning');
      expect(result.learningOutcomes.length).toBeGreaterThan(0);
    });

    test('should adapt to user relationship and context', async () => {
      // First interaction - new user
      const newUserContext: UltraIntelligenceContext = {
        userId: 'newuser',
        serverId: 'server123',
        channelId: 'general',
        messageContent: 'Hi there! Can you help me with something?',
        conversationHistory: [],
        serverContext: {
          culture: 'casual',
          activityLevel: 'moderate',
          memberCount: 100,
          commonTopics: []
        },
        userContext: {
          relationshipLevel: 0.0,
          preferredStyle: 'adaptive',
          expertiseAreas: [],
          currentMood: 'neutral'
        },
        requestContext: {
          complexity: 'simple',
          urgency: 'low',
          domain: 'general',
          requiresResearch: false,
          requiresMemory: false
        }
      };

      const result1 = await orchestrator.processWithUltraIntelligence(
        'Hi there! Can you help me with something?',
        newUserContext
      );

      expect(result1.adaptationsApplied.length).toBeGreaterThan(0);
      expect(result1.learningOutcomes).toContain('Updated user behavioral profile');

      // Second interaction - returning user
      const returningUserContext = {
        ...newUserContext,
        userContext: {
          ...newUserContext.userContext,
          relationshipLevel: 0.5
        }
      };

      const result2 = await orchestrator.processWithUltraIntelligence(
        'Thanks for the help earlier! I have another question.',
        returningUserContext
      );

      expect(result2.naturalness).toBeGreaterThanOrEqual(result1.naturalness);
      expect(result2.adaptationsApplied.length).toBeGreaterThan(0);
    });

    test('should provide fallback when components fail', async () => {
      // Create orchestrator with all capabilities disabled
      const limitedConfig: UltraIntelligenceConfig = {
        ...config,
        enableAdvancedMemory: false,
        enableAutonomousReasoning: false,
        enableUltraResearch: false,
        enableHumanConversation: false
      };

      const limitedOrchestrator = new UltraIntelligenceOrchestrator(limitedConfig);
      
      const context: UltraIntelligenceContext = {
        userId: 'user123',
        serverId: 'server456',
        channelId: 'channel789',
        messageContent: 'Test message',
        conversationHistory: [],
        serverContext: {
          culture: 'mixed',
          activityLevel: 'moderate',
          memberCount: 50,
          commonTopics: []
        },
        userContext: {
          relationshipLevel: 0.5,
          preferredStyle: 'adaptive',
          expertiseAreas: [],
          currentMood: 'neutral'
        },
        requestContext: {
          complexity: 'simple',
          urgency: 'low',
          domain: 'general',
          requiresResearch: false,
          requiresMemory: false
        }
      };

      const result = await limitedOrchestrator.processWithUltraIntelligence('Test message', context);

      expect(result.response).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.3); // Should still provide meaningful response
      expect(result.capabilitiesUsed).toContain('Base Intelligence');
    });
  });

  describe('UltraIntelligentResearchService', () => {
    let researchService: UltraIntelligentResearchService;

    beforeEach(() => {
      researchService = new UltraIntelligentResearchService();
    });

    test('should conduct comprehensive research for gaming queries', async () => {
      const result = await researchService.conductUltraIntelligentResearch(
        'best Valorant agents for competitive play',
        'gaming',
        'comprehensive'
      );

      expect(result.query).toBe('best Valorant agents for competitive play');
      expect(result.summary).toBeDefined();
      expect(result.keyFindings.length).toBeGreaterThan(0);
      expect(result.sources.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.actionableInsights.length).toBeGreaterThan(0);
      expect(result.relatedTopics.length).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    test('should handle research failures gracefully', async () => {
      // Mock search failure
      mockBraveWebSearch.mockRejectedValueOnce(new Error('Network error'));

      const result = await researchService.conductUltraIntelligentResearch(
        'failing query',
        'general',
        'basic'
      );

      expect(result.query).toBe('failing query');
      expect(result.summary).toContain('difficulties researching');
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.verificationStatus).toBe('unverified');
    });

    test('should provide domain-specific research for technical queries', async () => {
      const result = await researchService.conductUltraIntelligentResearch(
        'microservices deployment best practices',
        'technical',
        'expert'
      );

      expect(result.actionableInsights).toContain('Review official documentation for best practices');
      expect(result.actionableInsights).toContain('Check GitHub repositories for implementation examples');
    });

    test('should maintain research capabilities status', () => {
      const capabilities = researchService.getResearchCapabilities();

      expect(capabilities.domains.length).toBeGreaterThan(0);
      expect(capabilities.expertise).toBeGreaterThan(0.5);
      expect(['ready', 'limited', 'offline']).toContain(capabilities.readiness);
    });
  });

  describe('HumanLikeConversationService', () => {
    let conversationService: HumanLikeConversationService;

    beforeEach(() => {
      conversationService = new HumanLikeConversationService();
    });

    test('should generate human-like responses with personality', async () => {
      const context = {
        userId: 'user123',
        serverId: 'server456',
        channelId: 'channel789',
        messageHistory: [],
        currentTopic: 'gaming',
        userMood: 'excited' as const,
        conversationFlow: 'starting' as const,
        timeContext: 'evening' as const,
        serverActivity: 'moderate' as const
      };

      const result = await conversationService.generateHumanLikeResponse(
        'Hey! I just got a new game and I\'m super excited to play it!',
        'That sounds awesome! I\'d love to hear about your new game.',
        context
      );

      expect(result.content).toBeDefined();
      expect(result.naturalness).toBeGreaterThan(0.5);
      expect(result.personality).toBeDefined();
      expect(result.conversationFlow.feelsNatural).toBe(true);
      expect(result.conversationFlow.showsPersonality).toBe(true);
      expect(result.timing.idealDelay).toBeGreaterThan(0);
      expect(result.adaptations.length).toBeGreaterThan(0);
    });

    test('should adapt conversation style based on user mood', async () => {
      const baseContext = {
        userId: 'user123',
        serverId: 'server456',
        channelId: 'channel789',
        messageHistory: [],
        currentTopic: 'help',
        conversationFlow: 'continuing' as const,
        timeContext: 'work_hours' as const,
        serverActivity: 'moderate' as const
      };

      // Test frustrated mood
      const frustratedContext = {
        ...baseContext,
        userMood: 'frustrated' as const
      };

      const frustratedResult = await conversationService.generateHumanLikeResponse(
        'This is so frustrating! Nothing is working!',
        'I understand your frustration. Let me help you troubleshoot this issue.',
        frustratedContext
      );

      expect(frustratedResult.adaptations).toContain('Adapted for frustrated mood');
      expect(frustratedResult.personality.personality.empathy).toBeGreaterThan(0.7);

      // Test excited mood
      const excitedContext = {
        ...baseContext,
        userMood: 'excited' as const
      };

      const excitedResult = await conversationService.generateHumanLikeResponse(
        'This is amazing! Everything is working perfectly!',
        'That\'s fantastic! I\'m glad everything is working well for you.',
        excitedContext
      );

      expect(excitedResult.adaptations).toContain('Adapted for excited mood');
      expect(excitedResult.personality.personality.enthusiasm).toBeGreaterThan(0.6);
    });

    test('should maintain conversation capabilities status', () => {
      const capabilities = conversationService.getConversationCapabilities();

      expect(capabilities.activePersonas).toBeGreaterThan(0);
      expect(['ready', 'learning', 'limited']).toContain(capabilities.readiness);
    });

    test('should generate appropriate timing for natural conversation', async () => {
      const context = {
        userId: 'user123',
        serverId: 'server456',
        channelId: 'channel789',
        messageHistory: [],
        currentTopic: 'general',
        userMood: 'neutral' as const,
        conversationFlow: 'continuing' as const,
        timeContext: 'evening' as const,
        serverActivity: 'moderate' as const
      };

      const result = await conversationService.generateHumanLikeResponse(
        'This is a short message.',
        'Thanks for the message!',
        context
      );

      expect(result.timing.idealDelay).toBeGreaterThan(500);
      expect(result.timing.idealDelay).toBeLessThan(10000);
      expect(result.timing.typingDuration).toBeGreaterThan(0);
      expect(result.timing.typingDuration).toBeLessThanOrEqual(result.timing.idealDelay);
    });
  });

  describe('Integration Tests', () => {
    test('should process complex multi-domain query end-to-end', async () => {
      const context: UltraIntelligenceContext = {
        userId: 'poweruser',
        serverId: 'mixedserver',
        channelId: 'general',
        messageContent: 'I\'m trying to build a Discord bot for my gaming server that can track player statistics and provide real-time game updates. What technologies should I use and how should I architect it?',
        conversationHistory: [],
        serverContext: {
          culture: 'mixed',
          activityLevel: 'busy',
          memberCount: 300,
          commonTopics: ['gaming', 'programming', 'discord']
        },
        userContext: {
          relationshipLevel: 0.6,
          preferredStyle: 'technical',
          expertiseAreas: ['programming', 'gaming'],
          currentMood: 'curious'
        },
        requestContext: {
          complexity: 'expert',
          urgency: 'medium',
          domain: 'technical',
          requiresResearch: true,
          requiresMemory: true
        }
      };

      const result = await orchestrator.processWithUltraIntelligence(
        context.messageContent,
        context
      );

      // Should demonstrate ultra-intelligence capabilities
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.naturalness).toBeGreaterThan(0.6);
      expect(result.expertiseLevel).toBeGreaterThan(0.7);
      
      // Should use multiple capabilities
      expect(result.capabilitiesUsed.length).toBeGreaterThan(2);
      expect(result.capabilitiesUsed).toContain('Ultra Research');
      expect(result.capabilitiesUsed).toContain('Human Conversation');
      
      // Should provide comprehensive response
      expect(result.response.length).toBeGreaterThan(200);
      expect(result.autonomousInsights.length).toBeGreaterThan(0);
      expect(result.recommendedFollowUps.length).toBeGreaterThan(0);
      
      // Should demonstrate learning
      expect(result.learningOutcomes.length).toBeGreaterThan(0);
      expect(result.adaptationsApplied.length).toBeGreaterThan(0);
    });

    test('should maintain performance under load', async () => {
      const context: UltraIntelligenceContext = {
        userId: 'testuser',
        serverId: 'testserver',
        channelId: 'testchannel',
        messageContent: 'Simple test query',
        conversationHistory: [],
        serverContext: {
          culture: 'casual',
          activityLevel: 'moderate',
          memberCount: 50,
          commonTopics: []
        },
        userContext: {
          relationshipLevel: 0.5,
          preferredStyle: 'casual',
          expertiseAreas: [],
          currentMood: 'neutral'
        },
        requestContext: {
          complexity: 'simple',
          urgency: 'low',
          domain: 'general',
          requiresResearch: false,
          requiresMemory: false
        }
      };

      // Process multiple queries in parallel
      const promises = Array.from({ length: 5 }, (_, i) =>
        orchestrator.processWithUltraIntelligence(`Test query ${i}`, {
          ...context,
          userId: `testuser${i}`
        })
      );

      const results = await Promise.all(promises);

      // All should complete successfully
      results.forEach((result, i) => {
        expect(result.response).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0.3);
        expect(result.processingTime).toBeLessThan(30000); // Under 30 seconds
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle network failures gracefully', async () => {
      // Mock network failure
      mockBraveWebSearch.mockRejectedValue(new Error('Network timeout'));

      const context: UltraIntelligenceContext = {
        userId: 'user123',
        serverId: 'server456',
        channelId: 'channel789',
        messageContent: 'What are the latest gaming trends?',
        conversationHistory: [],
        serverContext: {
          culture: 'gaming',
          activityLevel: 'moderate',
          memberCount: 100,
          commonTopics: []
        },
        userContext: {
          relationshipLevel: 0.5,
          preferredStyle: 'casual',
          expertiseAreas: [],
          currentMood: 'neutral'
        },
        requestContext: {
          complexity: 'moderate',
          urgency: 'medium',
          domain: 'gaming',
          requiresResearch: true,
          requiresMemory: false
        }
      };

      const result = await orchestrator.processWithUltraIntelligence(
        'What are the latest gaming trends?',
        context
      );

      // Should still provide meaningful response
      expect(result.response).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.capabilitiesUsed).toContain('Base Intelligence');
    });

    test('should recover from component initialization failures', () => {
      // Test orchestrator with some components failing to initialize
      const partialConfig: UltraIntelligenceConfig = {
        ...config,
        enableAdvancedMemory: false, // Simulate this component failing
        enableAutonomousReasoning: true,
        enableUltraResearch: true,
        enableHumanConversation: true
      };

      const partialOrchestrator = new UltraIntelligenceOrchestrator(partialConfig);
      const status = partialOrchestrator.getUltraIntelligenceStatus();

      expect(status.readiness).toBe('ready'); // Should still be ready with 3/4 capabilities
      expect(status.capabilityStatus.advancedMemory).toBe(false);
      expect(status.capabilityStatus.autonomousReasoning).toBe(true);
      expect(status.capabilityStatus.ultraResearch).toBe(true);
      expect(status.capabilityStatus.humanConversation).toBe(true);
    });
  });
});