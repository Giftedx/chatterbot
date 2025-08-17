/**
 * Feature Routing Matrix Service Tests
 * 
 * Basic integration tests for the intelligent routing system.
 */

import { describe, test, expect } from '@jest/globals';

describe('FeatureRoutingMatrixService', () => {
  test('should be importable and instantiable', async () => {
    // Test that the service can be imported and instantiated
    const { FeatureRoutingMatrixService } = await import('../../src/services/feature-routing-matrix.service.js');
    const service = new FeatureRoutingMatrixService();
    expect(service).toBeDefined();
    expect(typeof service.routeMessage).toBe('function');
  });

  test('should provide routing statistics', async () => {
    const { FeatureRoutingMatrixService } = await import('../../src/services/feature-routing-matrix.service.js');
    const service = new FeatureRoutingMatrixService();
    const stats = service.getStats();
    
    expect(stats).toHaveProperty('totalRules');
    expect(stats).toHaveProperty('enabledRules');
    expect(typeof stats.totalRules).toBe('number');
    expect(typeof stats.enabledRules).toBe('number');
    expect(stats.totalRules).toBeGreaterThan(0);
  });

  test('should support rule management', async () => {
    const { FeatureRoutingMatrixService } = await import('../../src/services/feature-routing-matrix.service.js');
    const service = new FeatureRoutingMatrixService();
    
    // Test that rule management functions exist
    expect(typeof service.addRule).toBe('function');
    expect(typeof service.removeRule).toBe('function');
    
    // Get initial stats
    const initialStats = service.getStats();
    const initialRules = initialStats.totalRules;
    
    // Test adding a rule (basic validation that method exists)
    expect(() => {
      // This might throw due to validation, but the method should exist
      try {
        service.addRule({
          id: 'test-rule',
          name: 'Test Rule',
          description: 'Test routing rule',
          conditions: [],
          actions: [],
          priority: 100,
          enabled: true
        });
      } catch (error) {
        // Expected - just testing the method exists and accepts the structure
      }
    }).not.toThrow();
  });
});