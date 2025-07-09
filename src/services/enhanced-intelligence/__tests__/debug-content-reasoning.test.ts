/**
 * Debug content analysis and reasoning tests
 */

import { PersonalizationEngine } from '../personalization-engine.service.js';
import { MCPManager } from '../../mcp-manager.service.js';
import fs from 'fs';

describe('Debug Content and Reasoning', () => {
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

  test('should generate content analysis recommendations', async () => {
    const recommendations = await personalizationEngine.generatePersonalizedRecommendations(
      'content-user',
      undefined,
      'document analysis'
    );

    let output = `=== Content Analysis Test ===\n`;
    output += `Context: 'document analysis'\n`;
    output += `Total recommendations: ${recommendations.length}\n\n`;
    
    recommendations.forEach((rec, index) => {
      output += `${index + 1}. "${rec.title}" (${rec.type}, ${rec.priority})\n`;
      output += `   Description: "${rec.description}"\n`;
      output += `   Confidence: ${rec.confidenceScore}\n\n`;
    });

    // Test the filter
    const contentRecs = recommendations.filter(rec => 
      rec.title.includes('Content') || 
      rec.description.includes('content') ||
      rec.description.includes('analysis')
    );

    output += `=== Content Filter Results ===\n`;
    output += `Recommendations matching content filter: ${contentRecs.length}\n\n`;
    
    // Individual filter checks
    const titleContent = recommendations.filter(rec => rec.title.includes('Content'));
    const descContent = recommendations.filter(rec => rec.description.includes('content'));
    const descAnalysis = recommendations.filter(rec => rec.description.includes('analysis'));

    output += `Title includes 'Content': ${titleContent.length}\n`;
    output += `Description includes 'content': ${descContent.length}\n`;
    output += `Description includes 'analysis': ${descAnalysis.length}\n\n`;

    fs.writeFileSync('/tmp/debug-content-output.txt', output);
    
    expect(recommendations.length).toBeGreaterThan(0);
  });

  test('should generate complex reasoning recommendations', async () => {
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

    let output = `=== Complex Reasoning Test ===\n`;
    output += `Context: 'strategic problem solving'\n`;
    output += `Total recommendations: ${recommendations.length}\n\n`;
    
    recommendations.forEach((rec, index) => {
      output += `${index + 1}. "${rec.title}" (${rec.type}, ${rec.priority})\n`;
      output += `   Description: "${rec.description}"\n`;
      output += `   Confidence: ${rec.confidenceScore}\n\n`;
    });

    // Test the filter
    const reasoningRecs = recommendations.filter(rec => 
      rec.title.includes('Reasoning') || 
      rec.description.includes('reasoning') ||
      rec.description.includes('complex')
    );

    output += `=== Reasoning Filter Results ===\n`;
    output += `Recommendations matching reasoning filter: ${reasoningRecs.length}\n\n`;
    
    // Individual filter checks
    const titleReasoning = recommendations.filter(rec => rec.title.includes('Reasoning'));
    const descReasoning = recommendations.filter(rec => rec.description.includes('reasoning'));
    const descComplex = recommendations.filter(rec => rec.description.includes('complex'));

    output += `Title includes 'Reasoning': ${titleReasoning.length}\n`;
    output += `Description includes 'reasoning': ${descReasoning.length}\n`;
    output += `Description includes 'complex': ${descComplex.length}\n\n`;

    fs.appendFileSync('/tmp/debug-content-output.txt', '\n\n' + output);
    
    expect(recommendations.length).toBeGreaterThan(0);
  });
});
