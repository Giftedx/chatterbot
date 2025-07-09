/**
 * Debug test for recommendation filter matching
 */

import { PersonalizationEngine } from '../personalization-engine.service.js';
import { MCPManager } from '../../mcp-manager.service.js';

describe('Debug Filter Matching', () => {
  let personalizationEngine: PersonalizationEngine;
  let mockMCPManager: jest.Mocked<MCPManager>;

  beforeEach(() => {
    // Create mock MCP Manager
    mockMCPManager = {
      getStatus: jest.fn(),
    } as unknown as jest.Mocked<MCPManager>;

    // Mock MCP Manager status with all servers connected
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

  afterEach(() => {
    // Clean up any timers
    jest.clearAllTimers();
  });

  test('FAILING TEST 1: should generate web search recommendations for research-oriented users', async () => {
    // Record interactions showing research interest
    await personalizationEngine.recordInteraction({
      userId: 'researcher-user',
      messageType: 'question',
      toolsUsed: ['memory'],
      responseTime: 1800,
      conversationContext: 'Questions about current events and technology trends',
      timestamp: new Date()
    });

    const recommendations = await personalizationEngine.generatePersonalizedRecommendations(
      'researcher-user',
      undefined,
      'current events research'
    );

    console.log('\n=== FAILING TEST 1: Web Search Recommendations ===');
    console.log(`Total recommendations: ${recommendations.length}`);
    
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. "${rec.title}" (${rec.type}, ${rec.priority})`);
      console.log(`   Description: "${rec.description}"`);
      console.log(`   Confidence: ${rec.confidenceScore}`);
    });

    // Test exact filter criteria that's failing
    const webSearchRecs = recommendations.filter(rec => 
      rec.title.includes('Research') || 
      rec.description.includes('web search') ||
      rec.description.includes('real-time')
    );

    console.log(`\n=== Filter Results ===`);
    console.log(`Recommendations matching filter: ${webSearchRecs.length}`);
    webSearchRecs.forEach((rec, index) => {
      console.log(`${index + 1}. "${rec.title}" - "${rec.description}"`);
    });

    // Check individual filter conditions
    const titleMatches = recommendations.filter(rec => rec.title.includes('Research'));
    const webSearchMatches = recommendations.filter(rec => rec.description.includes('web search'));
    const realTimeMatches = recommendations.filter(rec => rec.description.includes('real-time'));

    console.log(`\n=== Individual Filter Analysis ===`);
    console.log(`Title includes 'Research': ${titleMatches.length}`);
    console.log(`Description includes 'web search': ${webSearchMatches.length}`);
    console.log(`Description includes 'real-time': ${realTimeMatches.length}`);

    expect(webSearchRecs.length).toBeGreaterThan(0);
  });

  test('FAILING TEST 2: should recommend memory features for frequent users', async () => {
    // Simulate frequent user with long sessions (same pattern as failing test)
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

    console.log('\n=== FAILING TEST 2: Memory Recommendations ===');
    console.log(`Total recommendations: ${recommendations.length}`);
    
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. "${rec.title}" (${rec.type}, ${rec.priority})`);
      console.log(`   Description: "${rec.description}"`);
    });

    const memoryRecs = recommendations.filter(rec => 
      rec.title.includes('Memory') || 
      rec.description.includes('memory') ||
      rec.description.includes('continuity')
    );

    console.log(`\n=== Filter Results ===`);
    console.log(`Recommendations matching filter: ${memoryRecs.length}`);
    memoryRecs.forEach((rec, index) => {
      console.log(`${index + 1}. "${rec.title}" - "${rec.description}"`);
    });

    // Check individual filter conditions
    const titleMemory = recommendations.filter(rec => rec.title.includes('Memory'));
    const descMemory = recommendations.filter(rec => rec.description.includes('memory'));
    const descContinuity = recommendations.filter(rec => rec.description.includes('continuity'));

    console.log(`\n=== Individual Filter Analysis ===`);
    console.log(`Title includes 'Memory': ${titleMemory.length}`);
    console.log(`Description includes 'memory': ${descMemory.length}`);
    console.log(`Description includes 'continuity': ${descContinuity.length}`);

    expect(memoryRecs.length).toBeGreaterThan(0);
  });
});
