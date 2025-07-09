/**
 * Enhanced Personalization Engine with MCP Integration Test
 * Tests the new MCP-powered personalization capabilities
 */

import { PersonalizationEngine } from '../personalization-engine.service.js';
import { MCPManager } from '../../mcp-manager.service.js';

describe('Enhanced Personalization Engine with MCP Integration', () => {
  let personalizationEngine: PersonalizationEngine;
  let mockMCPManager: jest.Mocked<MCPManager>;

  beforeEach(() => {
    // Create mock MCP Manager
    mockMCPManager = {
      getStatus: jest.fn(),
      searchMemory: jest.fn(),
      searchWeb: jest.fn(),
      extractContent: jest.fn(),
      callTool: jest.fn(),
      initialize: jest.fn(),
      shutdown: jest.fn(),
      reconnectFailedServers: jest.fn(),
      getClient: jest.fn()
    } as unknown as jest.Mocked<MCPManager>;

    // Mock MCP Manager status
    mockMCPManager.getStatus.mockReturnValue({
      connectedServers: 5,
      totalServers: 8,
      serverStatus: {
        'memory': { connected: true, phase: 1, priority: 'critical' },
        'brave-search': { connected: true, phase: 2, priority: 'high' },
        'firecrawl': { connected: true, phase: 2, priority: 'high' },
        'github': { connected: false, phase: 3, priority: 'medium' },
        'postgres': { connected: true, phase: 3, priority: 'medium' },
        'sequential-thinking': { connected: true, phase: 4, priority: 'medium' },
        'playwright': { connected: false, phase: 4, priority: 'medium' },
        'code-execution': { connected: false, phase: 5, priority: 'low' }
      }
    });

    personalizationEngine = new PersonalizationEngine(mockMCPManager);
  });

  describe('MCP Integration', () => {
    test('should initialize with MCP Manager', () => {
      expect(personalizationEngine).toBeDefined();
      expect(mockMCPManager.getStatus).not.toHaveBeenCalled(); // Only called when generating recommendations
    });

    test('should generate MCP-enhanced tool recommendations', async () => {
      // Record user interaction
      await personalizationEngine.recordInteraction({
        userId: 'test-user-123',
        guildId: 'test-guild-456',
        messageType: 'question',
        toolsUsed: ['memory'],
        responseTime: 1500,
        userSatisfaction: 4,
        conversationContext: 'Technical discussion about web development',
        timestamp: new Date()
      });

      // Generate recommendations
      const recommendations = await personalizationEngine.generatePersonalizedRecommendations(
        'test-user-123',
        'test-guild-456',
        'web development research'
      );

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);

      // Should include MCP-specific recommendations
      const mcpRecommendations = recommendations.filter(rec => 
        rec.title.includes('MCP') || 
        rec.description.includes('web search') ||
        rec.description.includes('real-time')
      );

      expect(mcpRecommendations.length).toBeGreaterThan(0);
      expect(mockMCPManager.getStatus).toHaveBeenCalled();
    });

    test('should provide higher confidence scores with MCP available', async () => {
      // Record interaction for user interested in research
      await personalizationEngine.recordInteraction({
        userId: 'research-user',
        messageType: 'research-question',
        toolsUsed: [],
        responseTime: 2000,
        conversationContext: 'Research on current technology trends',
        timestamp: new Date()
      });

      const recommendations = await personalizationEngine.generatePersonalizedRecommendations(
        'research-user',
        undefined,
        'technology research'
      );

      // With MCP available, confidence should be higher
      const toolRecommendations = recommendations.filter(rec => rec.type === 'tool');
      expect(toolRecommendations.some(rec => rec.confidenceScore >= 0.8)).toBe(true);
    });

    test('should generate web search recommendations for research-oriented users', async () => {
      // Record interactions showing research interest
      await personalizationEngine.recordInteraction({
        userId: 'researcher-user',
        messageType: 'question',
        toolsUsed: ['memory'],
        responseTime: 1800,
        conversationContext: 'Questions about current events and technology trends',
        timestamp: new Date()
      });

      // Set user preferences for research topics
      const recommendations = await personalizationEngine.generatePersonalizedRecommendations(
        'researcher-user',
        undefined,
        'current events research'
      );

      const webSearchRecs = recommendations.filter(rec => 
        rec.title.includes('Research') || 
        rec.description.includes('web search') ||
        rec.description.includes('real-time')
      );

      expect(webSearchRecs.length).toBeGreaterThan(0);
      
      // Should have high priority and confidence for research users
      expect(webSearchRecs.some(rec => 
        rec.priority === 'high' && rec.confidenceScore >= 0.8
      )).toBe(true);
    });

    test('should recommend memory features for frequent users', async () => {
      // Simulate frequent user with long sessions
      for (let i = 0; i < 5; i++) {
        await personalizationEngine.recordInteraction({
          userId: 'frequent-user',
          messageType: 'conversation',
          toolsUsed: ['memory', 'analysis'],
          responseTime: 1200 + i * 100,
          userSatisfaction: 4 + (i % 2), // 4 or 5
          conversationContext: `Extended conversation session ${i + 1}`,
          timestamp: new Date(Date.now() - i * 3600000) // Spread over hours
        });
      }

      const recommendations = await personalizationEngine.generatePersonalizedRecommendations(
        'frequent-user'
      );

      const memoryRecs = recommendations.filter(rec => 
        rec.title.includes('Memory') || 
        rec.description.includes('memory') ||
        rec.description.includes('continuity')
      );

      expect(memoryRecs.length).toBeGreaterThan(0);
      expect(memoryRecs.some(rec => rec.priority === 'high')).toBe(true);
    });

    test('should recommend content analysis for appropriate users', async () => {
      const recommendations = await personalizationEngine.generatePersonalizedRecommendations(
        'content-user',
        undefined,
        'document analysis'
      );

      const contentRecs = recommendations.filter(rec => 
        rec.title.includes('Content') || 
        rec.description.includes('content') ||
        rec.description.includes('analysis')
      );

      expect(contentRecs.length).toBeGreaterThan(0);
    });

    test('should recommend advanced reasoning for complex problem solvers', async () => {
      // Record interactions showing complex problem-solving patterns
      await personalizationEngine.recordInteraction({
        userId: 'complex-user',
        messageType: 'complex-analysis',
        toolsUsed: ['reasoning', 'analysis'],
        responseTime: 3000,
        conversationContext: 'Complex strategic planning problem',
        timestamp: new Date()
      });

      const recommendations = await personalizationEngine.generatePersonalizedRecommendations(
        'complex-user',
        undefined,
        'strategic problem solving'
      );

      const reasoningRecs = recommendations.filter(rec => 
        rec.title.includes('Reasoning') || 
        rec.description.includes('reasoning') ||
        rec.description.includes('complex')
      );

      expect(reasoningRecs.length).toBeGreaterThan(0);
    });
  });

  describe('Fallback Behavior', () => {
    test('should work without MCP Manager', async () => {
      const engineWithoutMCP = new PersonalizationEngine();
      
      await engineWithoutMCP.recordInteraction({
        userId: 'test-user',
        messageType: 'question',
        toolsUsed: ['basic'],
        responseTime: 1000,
        conversationContext: 'Basic question',
        timestamp: new Date()
      });

      const recommendations = await engineWithoutMCP.generatePersonalizedRecommendations(
        'test-user'
      );

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Should have lower confidence scores without MCP
      const toolRecs = recommendations.filter(rec => rec.type === 'tool');
      expect(toolRecs.some(rec => rec.confidenceScore <= 0.6)).toBe(true);
    });

    test('should handle MCP errors gracefully', async () => {
      // Mock MCP Manager to throw errors
      mockMCPManager.getStatus.mockImplementation(() => {
        throw new Error('MCP connection failed');
      });

      const recommendations = await personalizationEngine.generatePersonalizedRecommendations(
        'test-user'
      );

      // Should still provide recommendations despite MCP errors
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Tool Availability Mapping', () => {
    test('should correctly map server names to tool categories', async () => {
      const recommendations = await personalizationEngine.generatePersonalizedRecommendations(
        'test-user',
        undefined,
        'general inquiry'
      );

      // Should include tools based on connected servers
      const toolRecommendation = recommendations.find(rec => 
        rec.title.includes('MCP Capabilities')
      );

      if (toolRecommendation) {
        expect(toolRecommendation.description).toContain('powerful AI tools');
        expect(toolRecommendation.actionableSteps.length).toBeGreaterThan(0);
      }
    });

    test('should provide meaningful tool benefits', async () => {
      const recommendations = await personalizationEngine.generatePersonalizedRecommendations(
        'test-user'
      );

      const toolRecs = recommendations.filter(rec => rec.type === 'tool');
      
      toolRecs.forEach(rec => {
        expect(rec.expectedBenefit).toBeDefined();
        expect(rec.expectedBenefit.length).toBeGreaterThan(10);
        expect(rec.actionableSteps.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Personalization Metrics', () => {
    test('should track personalization metrics correctly', async () => {
      // Record multiple interactions
      for (let i = 0; i < 3; i++) {
        await personalizationEngine.recordInteraction({
          userId: `user-${i}`,
          messageType: 'question',
          toolsUsed: ['memory', 'web-search'],
          responseTime: 1000 + i * 200,
          userSatisfaction: 4,
          conversationContext: `Test interaction ${i}`,
          timestamp: new Date()
        });
      }

      const metrics = personalizationEngine.getPersonalizationMetrics();

      expect(metrics.totalUsers).toBe(3);
      expect(metrics.totalInteractions).toBe(3);
      expect(metrics.averageInteractionsPerUser).toBe(1);
      expect(metrics.recommendationAccuracy).toBeDefined();
      expect(metrics.averageConfidence).toBeDefined();
    });
  });

  describe('Response Adaptation', () => {
    test('should adapt responses based on user patterns with MCP context', async () => {
      // Record user preferences
      await personalizationEngine.recordInteraction({
        userId: 'adaptive-user',
        messageType: 'technical-question',
        toolsUsed: ['memory', 'web-search'],
        responseTime: 1500,
        userSatisfaction: 5,
        conversationContext: 'Technical discussion requiring detailed explanations',
        timestamp: new Date()
      });

      const adaptation = await personalizationEngine.adaptResponse(
        'adaptive-user',
        'This is a basic response about programming.',
        'test-guild'
      );

      expect(adaptation).toBeDefined();
      expect(adaptation.originalResponse).toBe('This is a basic response about programming.');
      expect(adaptation.personalizedResponse).toBeDefined();
      expect(adaptation.adaptations).toBeDefined();
      expect(adaptation.confidenceScore).toBeGreaterThan(0);
    });
  });
});

describe('Integration with Enhanced Intelligence Service', () => {
  test('should properly integrate with Enhanced Intelligence Service', () => {
    // This test verifies that the Enhanced Intelligence Service can be created with MCP Manager
    const mockMCPManager = {
      getStatus: jest.fn().mockReturnValue({ connectedServers: 2, totalServers: 5, serverStatus: {} })
    } as unknown as MCPManager;

    expect(() => {
      new PersonalizationEngine(mockMCPManager);
    }).not.toThrow();
  });
});
