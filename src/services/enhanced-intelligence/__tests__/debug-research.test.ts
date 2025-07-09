/**
 * Debug research recommendations
 */

import { PersonalizationEngine } from '../personalization-engine.service.js';
import { MCPManager } from '../../mcp-manager.service.js';
import fs from 'fs';

describe('Debug Research Output', () => {
  let personalizationEngine: PersonalizationEngine;
  let mockMCPManager: jest.Mocked<MCPManager>;

  beforeEach(() => {
    mockMCPManager = {
      getStatus: jest.fn(),
    } as unknown as jest.Mocked<MCPManager>;

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

  test('should generate research recommendations and write to file', async () => {
    // Research test scenario 
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

    let output = `=== Research User Test ===\n`;
    output += `Total recommendations: ${recommendations.length}\n\n`;
    
    recommendations.forEach((rec, index) => {
      output += `${index + 1}. "${rec.title}" (${rec.type}, ${rec.priority})\n`;
      output += `   Description: "${rec.description}"\n`;
      output += `   Confidence: ${rec.confidenceScore}\n\n`;
    });

    // Test the filter
    const webSearchRecs = recommendations.filter(rec => 
      rec.title.includes('Research') || 
      rec.description.includes('web search') ||
      rec.description.includes('real-time')
    );

    output += `=== Filter Results ===\n`;
    output += `Recommendations matching research filter: ${webSearchRecs.length}\n\n`;
    
    // Individual filter checks
    const titleResearch = recommendations.filter(rec => rec.title.includes('Research'));
    const descWebSearch = recommendations.filter(rec => rec.description.includes('web search'));
    const descRealTime = recommendations.filter(rec => rec.description.includes('real-time'));

    output += `Title includes 'Research': ${titleResearch.length}\n`;
    output += `Description includes 'web search': ${descWebSearch.length}\n`;
    output += `Description includes 'real-time': ${descRealTime.length}\n\n`;

    // Show matches
    webSearchRecs.forEach((rec, index) => {
      output += `MATCH ${index + 1}: "${rec.title}" - "${rec.description}"\n`;
    });

    // Write to file
    fs.writeFileSync('/tmp/debug-research-output.txt', output);
    
    expect(recommendations.length).toBeGreaterThan(0);
  });
});
