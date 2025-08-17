/**
 * Test suite for ReasoningServiceSelector
 * D1: Advanced reasoning service selection by strategy
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { ReasoningServiceSelector } from '../reasoning-service-selector.service.js';
import { DecisionResult } from '../decision-engine.service.js';

describe('ReasoningServiceSelector', () => {
  let selector: ReasoningServiceSelector;

  beforeEach(() => {
    selector = new ReasoningServiceSelector();
  });

  describe('Strategy-based Selection', () => {
    test('should select fast services for quick-reply strategy', async () => {
      const decisionResult: DecisionResult = {
        shouldRespond: true,
        reason: 'User asked a simple question',
        confidence: 0.6,
        strategy: 'quick-reply',
        tokenEstimate: 500,
      };

      const selection = await selector.selectReasoningService(
        decisionResult,
        'Simple question about weather',
      );

      // Quick-reply should prefer fast, low-resource services
      expect(['gemini-direct', 'causal-reasoning', 'gemini-reasoning']).toContain(
        selection.serviceName,
      );
      expect(selection.config.executionTime).toBe('fast');
      expect(selection.config.resourceIntensity).toBe('low');
    });

    test('should select advanced services for deep-reason strategy', async () => {
      const decisionResult: DecisionResult = {
        shouldRespond: true,
        reason: 'User asked a complex analytical question',
        confidence: 0.8,
        strategy: 'deep-reason',
        tokenEstimate: 3000,
      };

      const selection = await selector.selectReasoningService(
        decisionResult,
        'Complex analysis of market trends with multiple factors',
      );

      // Deep-reason should prefer complex or expert services
      expect(['tree-of-thoughts', 'enhanced-reasoning', 'neural-symbolic']).toContain(
        selection.serviceName,
      );
      expect(['complex', 'expert']).toContain(selection.config.complexity);
    });

    test('should handle defer strategy appropriately', async () => {
      const decisionResult: DecisionResult = {
        shouldRespond: true,
        reason: 'Need clarification on requirements',
        confidence: 0.4,
        strategy: 'defer',
        tokenEstimate: 1500,
      };

      // Defer should prefer context-aware or moderate complexity services
      const selection = await selector.selectReasoningService(
        decisionResult,
        'Need clarification on requirements',
      );

      // Should select a service appropriate for uncertain/defer situations
      expect(['moderate', 'complex']).toContain(selection.config.complexity);
      // Most services should handle context for defer scenarios
      expect(selection.config.minConfidence).toBeLessThanOrEqual(0.4);
    });
  });

  describe('Constraint Application', () => {
    test('should respect confidence constraints', async () => {
      const lowConfidenceResult: DecisionResult = {
        shouldRespond: true,
        reason: 'Low confidence query',
        confidence: 0.2,
        strategy: 'deep-reason',
        tokenEstimate: 1000,
      };

      const selection = await selector.selectReasoningService(
        lowConfidenceResult,
        'Low confidence query',
      );

      // Should not select services requiring high confidence
      expect(selection.config.minConfidence).toBeLessThanOrEqual(0.2);
    });

    test('should respect token constraints', async () => {
      const highTokenResult: DecisionResult = {
        shouldRespond: true,
        reason: 'Very long detailed analysis request',
        confidence: 0.8,
        strategy: 'deep-reason',
        tokenEstimate: 10000,
      };

      const selection = await selector.selectReasoningService(
        highTokenResult,
        'Very long detailed analysis request',
      );

      // Should fallback to services that can handle high token counts or use gemini-direct
      expect(selection.config.maxTokens).toBeGreaterThanOrEqual(8000);
    });
  });

  describe('System Load Awareness', () => {
    test('should prefer low-resource services under high load', async () => {
      const decisionResult: DecisionResult = {
        shouldRespond: true,
        reason: 'Analysis request',
        confidence: 0.7,
        strategy: 'deep-reason',
        tokenEstimate: 2000,
      };

      const selection = await selector.selectReasoningService(
        decisionResult,
        'Analysis request',
        undefined,
        0.95, // Very high system load
      );

      // Under high load, should select low-resource services only
      expect(selection.config.resourceIntensity).toBe('low');
    });

    test('should allow all services under normal load', async () => {
      const decisionResult: DecisionResult = {
        shouldRespond: true,
        reason: 'Analysis request',
        confidence: 0.8,
        strategy: 'deep-reason',
        tokenEstimate: 2000,
      };

      const selection = await selector.selectReasoningService(
        decisionResult,
        'Analysis request',
        undefined,
        0.3, // Low system load
      );

      // Under normal load, any appropriate service should be available
      expect(['low', 'medium', 'high']).toContain(selection.config.resourceIntensity);
    });
  });

  describe('Personality Context Integration', () => {
    test('should prefer personality-aware services for relationship context', async () => {
      const decisionResult: DecisionResult = {
        shouldRespond: true,
        reason: 'Help me understand this concept',
        confidence: 0.7,
        strategy: 'deep-reason',
        tokenEstimate: 1500,
      };

      const personalityContext = {
        relationshipStrength: 0.8,
        userMood: 'neutral' as const,
        personalityCompatibility: 0.8,
      };

      const selection = await selector.selectReasoningService(
        decisionResult,
        'Help me understand this concept',
        personalityContext,
      );

      // Should prefer personality-aware services for high-relationship users
      expect(selection.config.personalityAware).toBe(true);
    });
  });

  describe('Performance Learning', () => {
    test('should record service results for learning', () => {
      const serviceName = 'enhanced-reasoning';
      const initialMetrics = selector.getPerformanceMetrics().get(serviceName);
      const initialSuccessRate = initialMetrics?.successRate || 0;

      // Record a successful execution
      selector.recordServiceResult(serviceName, true, 1500, 0.9);

      const updatedMetrics = selector.getPerformanceMetrics().get(serviceName);

      // Success rate should improve
      expect(updatedMetrics?.successRate).toBeGreaterThanOrEqual(initialSuccessRate);
      expect(updatedMetrics?.performanceScore).toBeDefined();
    });

    test('should track service execution metrics', async () => {
      const testDecision: DecisionResult = {
        shouldRespond: true,
        reason: 'Test query',
        confidence: 0.8,
        strategy: 'deep-reason',
        tokenEstimate: 2000,
      };

      // Select service to get the actual service name that was chosen
      const selection = await selector.selectReasoningService(testDecision, 'Test complex query');
      const serviceName = selection.serviceName;

      // Record multiple results for the actual selected service
      selector.recordServiceResult(serviceName, true, 2000, 0.8);
      selector.recordServiceResult(serviceName, false, 3000, 0.3);
      selector.recordServiceResult(serviceName, true, 1800, 0.9);

      const metrics = selector.getPerformanceMetrics().get(serviceName);

      expect(metrics?.totalSelections).toBeGreaterThan(0);
      expect(metrics?.averageExecutionTime).toBeGreaterThan(0);
      expect(metrics?.successRate).toBeLessThan(1); // Should reflect the one failure
    });
  });

  describe('Fallback Chain Management', () => {
    test('should provide appropriate fallback services', async () => {
      const decisionResult: DecisionResult = {
        shouldRespond: true,
        reason: 'Complex analytical query',
        confidence: 0.8,
        strategy: 'deep-reason',
        tokenEstimate: 2000,
      };

      const selection = await selector.selectReasoningService(
        decisionResult,
        'Complex analytical query',
      );

      // Should have fallback services
      expect(selection.fallbacks.length).toBeGreaterThan(0);

      // Should include basic fallbacks
      expect(selection.fallbacks).toContain('gemini-direct');

      // Fallbacks should not include the primary selection
      expect(selection.fallbacks).not.toContain(selection.serviceName);
    });
  });

  describe('Service Configuration Management', () => {
    test('should provide access to service configurations', () => {
      const configs = selector.getServiceConfigs();

      // Should have all expected services
      const expectedServices = [
        'tree-of-thoughts',
        'enhanced-reasoning',
        'neural-symbolic',
        'causal-reasoning',
        'gemini-reasoning',
        'gemini-direct',
      ];

      expectedServices.forEach((serviceName) => {
        expect(configs.has(serviceName)).toBe(true);

        const config = configs.get(serviceName);
        expect(config?.name).toBe(serviceName);
        expect(config?.minConfidence).toBeGreaterThanOrEqual(0);
        expect(config?.maxTokens).toBeGreaterThan(0);
        expect(['simple', 'moderate', 'complex', 'expert']).toContain(config?.complexity);
      });
    });

    test('should provide performance metrics access', () => {
      const metrics = selector.getPerformanceMetrics();

      // Should have metrics for all services
      const configs = selector.getServiceConfigs();
      configs.forEach((config: any, serviceName: string) => {
        expect(metrics.has(serviceName)).toBe(true);

        const metric = metrics.get(serviceName);
        expect(metric?.totalSelections).toBeDefined();
        expect(metric?.successRate).toBeGreaterThanOrEqual(0);
        expect(metric?.successRate).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Complex Query Analysis', () => {
    test('should identify complex analytical queries', async () => {
      const complexQuery =
        'Please analyze the pros and cons of different machine learning approaches, compare their effectiveness, and evaluate the trade-offs';

      const decisionResult: DecisionResult = {
        shouldRespond: true,
        reason: 'Complex analysis request requiring deep reasoning',
        confidence: 0.8,
        strategy: 'deep-reason',
        tokenEstimate: 2500,
      };

      const selection = await selector.selectReasoningService(decisionResult, complexQuery);

      // Complex queries should prefer advanced reasoning services
      expect(['tree-of-thoughts', 'enhanced-reasoning', 'neural-symbolic']).toContain(
        selection.serviceName,
      );
      expect(['complex', 'expert']).toContain(selection.config.complexity);
    });

    test('should handle simple queries efficiently', async () => {
      const simpleQuery = 'What is the weather like today?';

      const decisionResult: DecisionResult = {
        shouldRespond: true,
        reason: 'Simple weather question',
        confidence: 0.6,
        strategy: 'quick-reply',
        tokenEstimate: 200,
      };

      const selection = await selector.selectReasoningService(decisionResult, simpleQuery);

      // Simple queries should use efficient services
      expect(['gemini-direct', 'gemini-reasoning', 'causal-reasoning']).toContain(
        selection.serviceName,
      );
      expect(selection.config.executionTime).toBe('fast');
    });
  });

  describe('Selection Reasoning', () => {
    test('should provide clear reasoning for service selection', async () => {
      const decisionResult: DecisionResult = {
        shouldRespond: true,
        reason: 'Complex analytical query requiring deep reasoning',
        confidence: 0.9,
        strategy: 'deep-reason',
        tokenEstimate: 3000,
      };

      const selection = await selector.selectReasoningService(
        decisionResult,
        'Complex analytical query requiring deep reasoning',
      );

      // Should provide human-readable reasoning
      expect(selection.reasoning).toBeTruthy();
      expect(typeof selection.reasoning).toBe('string');
      expect(selection.reasoning.length).toBeGreaterThan(0);

      // Selection confidence should be reasonable
      expect(selection.confidence).toBeGreaterThan(0);
      expect(selection.confidence).toBeLessThanOrEqual(1);
    });
  });
});
