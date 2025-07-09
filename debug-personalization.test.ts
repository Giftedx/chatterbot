/**
 * Debug test for personalization engine topic extraction
 */

import { PersonalizationEngine } from './src/services/enhanced-intelligence/personalization-engine.service.js';
import { MCPManager } from './src/services/mcp-manager.service.js';

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

    console.log('All recommendations:', JSON.stringify(recommendations, null, 2));

    const webSearchRecs = recommendations.filter(rec => 
      rec.title.includes('Research') || 
      rec.description.includes('web search') ||
      rec.description.includes('real-time')
    );

    console.log('Web search recommendations:', JSON.stringify(webSearchRecs, null, 2));
  });
});
