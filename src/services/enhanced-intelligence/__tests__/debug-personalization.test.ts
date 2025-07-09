/**
 * Debug test for personalization engine topic extraction
 */

import { PersonalizationEngine, PersonalizedRecommendation } from '../personalization-engine.service.js';
import { MCPManager } from '../../mcp-manager.service.js';

describe('Debug Personalization Engine', () => {
  let personalizationEngine: PersonalizationEngine;
  let mockMCPManager: jest.Mocked<MCPManager>;

  beforeEach(() => {
    // Create mock MCP Manager
    mockMCPManager = {
      getStatus: jest.fn(),
    } as unknown as jest.Mocked<MCPManager>;

    // Mock MCP Manager status
    mockMCPManager.getStatus.mockReturnValue({
      connectedServers: 5,
      totalServers: 8,
      serverStatus: {
        'memory': { connected: true, phase: 1, priority: 'critical' },
        'brave_search': { connected: true, phase: 1, priority: 'critical' },
        'firecrawl': { connected: true, phase: 2, priority: 'high' },
        'sequential_thinking': { connected: true, phase: 2, priority: 'high' },
        'playwright': { connected: true, phase: 3, priority: 'medium' },
      }
    });

    personalizationEngine = new PersonalizationEngine(mockMCPManager);
  });

  test('should extract research topics from conversation context', async () => {
    // Record interaction with research context
    await personalizationEngine.recordInteraction({
      userId: 'test-user',
      messageType: 'research-question',
      toolsUsed: [],
      responseTime: 2000,
      conversationContext: 'Questions about current events and technology trends and research',
      timestamp: new Date()
    });

    const recommendations = await personalizationEngine.generatePersonalizedRecommendations(
      'test-user',
      undefined,
      'current events research'
    );

    console.log('\n=== DEBUG: All recommendations ===');
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.title}`);
      console.log(`   Type: ${rec.type}, Priority: ${rec.priority}`);
      console.log(`   Description: ${rec.description}`);
      console.log(`   Confidence: ${rec.confidenceScore}`);
      console.log(`   Based on: ${rec.basedOn.join(', ')}`);
    });

    console.log('\n=== DEBUG: Filtering for web search recommendations ===');
    const webSearchRecs = recommendations.filter((rec: PersonalizedRecommendation) => {
      const matchesTitle = rec.title.includes('Research');
      const matchesWebSearch = rec.description.includes('web search');
      const matchesRealTime = rec.description.includes('real-time');
      
      console.log(`Checking "${rec.title}": title=${matchesTitle}, webSearch=${matchesWebSearch}, realTime=${matchesRealTime}`);
      return matchesTitle || matchesWebSearch || matchesRealTime;
    });

    console.log(`\n=== DEBUG: Found ${webSearchRecs.length} web search recommendations ===`);
    webSearchRecs.forEach((rec: PersonalizedRecommendation, index: number) => {
      console.log(`${index + 1}. ${rec.title} - ${rec.description}`);
    });

    expect(recommendations.length).toBeGreaterThan(0);
  });

  test('should generate frequent user memory recommendations', async () => {
    // Simulate frequent user with multiple interactions
    for (let i = 0; i < 15; i++) {
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

    console.log('\n=== DEBUG: Frequent user recommendations ===');
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.title} - ${rec.description}`);
    });

    const memoryRecs = recommendations.filter((rec: PersonalizedRecommendation) => 
      rec.title.includes('Memory') || 
      rec.description.includes('memory') ||
      rec.description.includes('continuity')
    );

    console.log(`\n=== DEBUG: Found ${memoryRecs.length} memory recommendations ===`);
    memoryRecs.forEach((rec: PersonalizedRecommendation, index: number) => {
      console.log(`${index + 1}. ${rec.title} - ${rec.description}`);
    });

    expect(recommendations.length).toBeGreaterThan(0);
  });
});
