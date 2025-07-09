/**
 * Simple debug output test
 */

import { PersonalizationEngine } from '../personalization-engine.service.js';
import { MCPManager } from '../../mcp-manager.service.js';
import fs from 'fs';

describe('Debug Output', () => {
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

  test('should generate recommendations and write to file', async () => {
    // Memory test scenario 
    for (let i = 0; i < 5; i++) {
      await personalizationEngine.recordInteraction({
        userId: 'frequent-user',
        messageType: 'conversation',
        toolsUsed: ['memory', 'analysis'],
        responseTime: 1200 + i * 100,
        userSatisfaction: 4 + (i % 2),
        conversationContext: `Extended conversation session ${i + 1}`,
        timestamp: new Date(Date.now() - i * 3600000)
      });
    }

    const recommendations = await personalizationEngine.generatePersonalizedRecommendations(
      'frequent-user'
    );

    let output = `=== Frequent User Memory Test ===\n`;
    output += `Total recommendations: ${recommendations.length}\n\n`;
    
    recommendations.forEach((rec, index) => {
      output += `${index + 1}. "${rec.title}" (${rec.type}, ${rec.priority})\n`;
      output += `   Description: "${rec.description}"\n`;
      output += `   Confidence: ${rec.confidenceScore}\n\n`;
    });

    // Test the filter
    const memoryRecs = recommendations.filter(rec => 
      rec.title.includes('Memory') || 
      rec.description.includes('memory') ||
      rec.description.includes('continuity')
    );

    output += `=== Filter Results ===\n`;
    output += `Recommendations matching memory filter: ${memoryRecs.length}\n\n`;
    
    // Individual filter checks
    const titleMemory = recommendations.filter(rec => rec.title.includes('Memory'));
    const descMemory = recommendations.filter(rec => rec.description.includes('memory'));
    const descContinuity = recommendations.filter(rec => rec.description.includes('continuity'));

    output += `Title includes 'Memory': ${titleMemory.length}\n`;
    output += `Description includes 'memory': ${descMemory.length}\n`;
    output += `Description includes 'continuity': ${descContinuity.length}\n\n`;

    // Write to file
    fs.writeFileSync('/tmp/debug-output.txt', output);
    
    expect(recommendations.length).toBeGreaterThan(0);
  });
});
