/**
 * AI Routing Intelligence Integration Test
 * 
 * End-to-end test to verify the complete routing intelligence pipeline works properly.
 */

import { describe, test, expect } from '@jest/globals';

describe('AI Routing Intelligence Integration', () => {
  test('should complete full message routing pipeline', async () => {
    // Test that all routing services work together
    const { UnifiedMessageAnalysisService } = await import('../../src/services/core/message-analysis.service.js');
    const { FeatureRoutingMatrixService } = await import('../../src/services/feature-routing-matrix.service.js');
    
    const analysisService = new UnifiedMessageAnalysisService();
    const routingService = new FeatureRoutingMatrixService();
    
    // Test a simple message analysis and routing
    const testMessage = "Hello, can you help me with a complex coding problem?";
    
    const analysis = await analysisService.analyzeMessage(testMessage, []);
    expect(analysis).toBeDefined();
    expect(analysis.complexity).toBeDefined();
    expect(analysis.intents).toBeDefined();
    
    const routingDecision = await routingService.routeMessage(analysis);
    expect(routingDecision).toBeDefined();
    expect(routingDecision.primaryService).toBeDefined();
    expect(routingDecision.confidence).toBeGreaterThan(0);
    expect(routingDecision.confidence).toBeLessThanOrEqual(1);
    
    // Verify routing decision structure
    expect(['coreIntelligence', 'agenticIntelligence', 'enhancedIntelligence', 'advancedCapabilities'])
      .toContain(routingDecision.primaryService);
  });

  test('should handle complex multimodal routing scenarios', async () => {
    const { UnifiedMessageAnalysisService } = await import('../../src/services/core/message-analysis.service.js');
    const { FeatureRoutingMatrixService } = await import('../../src/services/feature-routing-matrix.service.js');
    
    const analysisService = new UnifiedMessageAnalysisService();
    const routingService = new FeatureRoutingMatrixService();
    
    // Test complex message with attachments
    const complexMessage = "Analyze this image and create a detailed technical report with code examples";
    const mockAttachments = [
      { name: 'diagram.png', url: 'http://example.com/image.png', contentType: 'image/png' }
    ];
    
    const analysis = await analysisService.analyzeMessage(complexMessage, mockAttachments);
    const routingDecision = await routingService.routeMessage(analysis);
    
    // Should route to advanced capabilities for multimodal processing
    expect(routingDecision.capabilities.needsMultimodal).toBe(true);
    expect(routingDecision.estimatedComplexity).toBeGreaterThan(5);
  });

  test('should provide comprehensive routing statistics', async () => {
    const { FeatureRoutingMatrixService } = await import('../../src/services/feature-routing-matrix.service.js');
    
    const routingService = new FeatureRoutingMatrixService();
    const stats = routingService.getStats();
    
    expect(stats).toHaveProperty('totalRules');
    expect(stats).toHaveProperty('enabledRules');
    expect(stats).toHaveProperty('intentMappings');
    expect(stats.totalRules).toBeGreaterThan(0);
    expect(stats.enabledRules).toBeGreaterThan(0);
    expect(stats.intentMappings).toBeGreaterThan(0);
  });
});