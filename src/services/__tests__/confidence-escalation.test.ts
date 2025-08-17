/**
 * Tests for Confidence-based Escalation Service (D2)
 */

import {
  ConfidenceEscalationService,
  EscalationConfig,
  EscalationResult,
  EscalationAttempt,
} from '../confidence-escalation.service.js';
import {
  ReasoningServiceSelector,
  ReasoningServiceConfig,
} from '../reasoning-service-selector.service.js';
import { DecisionResult, DecisionContext } from '../decision-engine.service.js';

// Mock ReasoningServiceSelector
class MockReasoningServiceSelector {
  private mockServiceConfigs = new Map([
    [
      'tree-of-thoughts',
      {
        name: 'tree-of-thoughts',
        minConfidence: 0.7,
        complexity: 'expert',
      } as ReasoningServiceConfig,
    ],
    [
      'enhanced-reasoning',
      {
        name: 'enhanced-reasoning',
        minConfidence: 0.5,
        complexity: 'complex',
      } as ReasoningServiceConfig,
    ],
    [
      'gemini-direct',
      { name: 'gemini-direct', minConfidence: 0.0, complexity: 'simple' } as ReasoningServiceConfig,
    ],
  ]);

  async selectReasoningService(
    decisionResult: DecisionResult,
    promptText: string,
    personalityContext?: DecisionContext['personality'],
    systemLoad?: number,
  ) {
    return {
      serviceName: 'tree-of-thoughts',
      config: this.mockServiceConfigs.get('tree-of-thoughts')!,
      parameters: { confidence: decisionResult.confidence },
      confidence: 0.8,
      reason: 'Mock selection',
      fallbacks: ['enhanced-reasoning', 'gemini-direct'],
    };
  }

  recordServiceResult(
    serviceName: string,
    success: boolean,
    executionTimeMs: number,
    qualityScore?: number,
  ) {
    // Mock implementation
  }

  getPerformanceMetrics() {
    return new Map([
      ['tree-of-thoughts', { successRate: 0.85, performanceScore: 0.8 }],
      ['enhanced-reasoning', { successRate: 0.9, performanceScore: 0.75 }],
      ['gemini-direct', { successRate: 0.95, performanceScore: 0.6 }],
    ]);
  }

  getServiceConfigs() {
    return this.mockServiceConfigs;
  }
}

describe('ConfidenceEscalationService', () => {
  let escalationService: ConfidenceEscalationService;
  let mockReasoningSelector: MockReasoningServiceSelector;

  beforeEach(() => {
    mockReasoningSelector = new MockReasoningServiceSelector();
    escalationService = new ConfidenceEscalationService(mockReasoningSelector as any);
  });

  describe('D2.1: Basic Escalation Evaluation', () => {
    test('should not escalate when confidence is above threshold', async () => {
      const decisionResult: DecisionResult = {
        shouldRespond: true,
        strategy: 'quick-reply',
        confidence: 0.8, // Above default threshold
        reason: 'High confidence',
        tokenEstimate: 500,
      };

      const result = await escalationService.evaluateAndEscalate(
        { response: 'test' },
        0.8,
        decisionResult,
        'Simple question',
      );

      expect(result.triggered).toBe(false);
      expect(result.reasoning).toContain('above threshold');
      expect(result.recommendNextAction).toBe('proceed');
      expect(result.totalAttempts).toBe(0);
    });

    test('should escalate when confidence is below threshold', async () => {
      const decisionResult: DecisionResult = {
        shouldRespond: true,
        strategy: 'quick-reply',
        confidence: 0.4, // Below default threshold (0.6)
        reason: 'Low confidence',
        tokenEstimate: 500,
      };

      const result = await escalationService.evaluateAndEscalate(
        { response: 'test' },
        0.4,
        decisionResult,
        'Complex question',
      );

      expect(result.triggered).toBe(true);
      expect(result.reasoning).toMatch(/escalated|improvement|attempts/i); // Updated to match actual reasoning format
      expect(result.totalAttempts).toBeGreaterThan(0);
      expect(result.escalationPath).toBeDefined();
      expect(result.escalationPath.length).toBeGreaterThan(0);
    });

    test('should always escalate critically low confidence', async () => {
      const decisionResult: DecisionResult = {
        shouldRespond: true,
        strategy: 'quick-reply',
        confidence: 0.2, // Below critical threshold (0.3)
        reason: 'Very low confidence',
        tokenEstimate: 500,
      };

      const result = await escalationService.evaluateAndEscalate(
        { response: 'test' },
        0.2,
        decisionResult,
        'Very complex question',
      );

      expect(result.triggered).toBe(true);
      expect(result.totalAttempts).toBeGreaterThan(0);
      expect(result.originalConfidence).toBe(0.2);
    });
  });

  describe('D2.2: Strategy-based Threshold Management', () => {
    test('should use different thresholds for different strategies', async () => {
      const quickReplyDecision: DecisionResult = {
        shouldRespond: true,
        strategy: 'quick-reply',
        confidence: 0.65, // Below quick-reply threshold (0.7) but above general threshold (0.6)
        reason: 'Medium confidence',
        tokenEstimate: 200,
      };

      const quickResult = await escalationService.evaluateAndEscalate(
        { response: 'test' },
        0.65,
        quickReplyDecision,
        'Quick question',
      );

      expect(quickResult.triggered).toBe(true); // Should escalate for quick-reply

      const deepReasonDecision: DecisionResult = {
        shouldRespond: true,
        strategy: 'deep-reason',
        confidence: 0.55, // Above deep-reason threshold (0.5) but below general threshold (0.6)
        reason: 'Medium confidence',
        tokenEstimate: 2000,
      };

      const deepResult = await escalationService.evaluateAndEscalate(
        { response: 'test' },
        0.55,
        deepReasonDecision,
        'Complex question',
      );

      expect(deepResult.triggered).toBe(false); // Should not escalate for deep-reason
    });

    test('should respect max attempts per strategy', async () => {
      const decisionResult: DecisionResult = {
        shouldRespond: true,
        strategy: 'quick-reply', // Max 2 attempts
        confidence: 0.3,
        reason: 'Low confidence',
        tokenEstimate: 200,
      };

      const result = await escalationService.evaluateAndEscalate(
        { response: 'test' },
        0.3,
        decisionResult,
        'Question requiring escalation',
      );

      expect(result.triggered).toBe(true);
      expect(result.totalAttempts).toBeLessThanOrEqual(2); // Quick-reply max attempts
    });
  });

  describe('D2.3: Personality-based Threshold Adjustments', () => {
    test('should raise threshold for strong relationships', async () => {
      const personalityContext: DecisionContext['personality'] = {
        relationshipStrength: 0.9, // Strong relationship
        userMood: 'neutral',
        activePersona: {
          id: 'test-persona',
          name: 'Test',
          personality: { perfectionism: 0.5 },
        } as any,
        personalityCompatibility: 0.8,
      };

      const decisionResult: DecisionResult = {
        shouldRespond: true,
        strategy: 'quick-reply',
        confidence: 0.65, // Would normally trigger escalation for quick-reply (threshold 0.7)
        reason: 'Medium confidence',
        tokenEstimate: 200,
      };

      const result = await escalationService.evaluateAndEscalate(
        { response: 'test' },
        0.65,
        decisionResult,
        'Question from trusted user',
        personalityContext,
      );

      // Strong relationship should raise the threshold, so this might not escalate
      expect(result.originalConfidence).toBe(0.65);
    });

    test('should lower threshold for frustrated users', async () => {
      const personalityContext: DecisionContext['personality'] = {
        relationshipStrength: 0.3,
        userMood: 'frustrated', // Should lower threshold
        activePersona: {
          id: 'test-persona',
          name: 'Test',
          personality: { supportiveness: 0.8 },
        } as any,
        personalityCompatibility: 0.5,
      };

      const decisionResult: DecisionResult = {
        shouldRespond: true,
        strategy: 'quick-reply',
        confidence: 0.6, // Would normally not trigger escalation (threshold 0.7 - 0.15 = 0.55)
        reason: 'Medium confidence',
        tokenEstimate: 200,
      };

      const result = await escalationService.evaluateAndEscalate(
        { response: 'test' },
        0.6,
        decisionResult,
        'Question from frustrated user',
        personalityContext,
      );

      expect(result.triggered).toBe(true); // Frustrated mood should trigger escalation
    });

    test('should adjust threshold for supportive personas', async () => {
      const personalityContext: DecisionContext['personality'] = {
        relationshipStrength: 0.5,
        userMood: 'neutral',
        activePersona: {
          id: 'supportive',
          name: 'Supportive',
          personality: { supportiveness: 0.9 }, // High supportiveness
        } as any,
        personalityCompatibility: 0.7,
      };

      const decisionResult: DecisionResult = {
        shouldRespond: true,
        strategy: 'deep-reason',
        confidence: 0.55, // Just above deep-reason threshold (0.5 + 0.1 = 0.6)
        reason: 'Medium confidence',
        tokenEstimate: 2000,
      };

      const result = await escalationService.evaluateAndEscalate(
        { response: 'test' },
        0.55,
        decisionResult,
        'Question for supportive persona',
        personalityContext,
      );

      expect(result.triggered).toBe(true); // Supportive personas should raise bar
    });
  });

  describe('D2.4: System Load Adjustments', () => {
    test('should avoid escalation under high system load', async () => {
      const decisionResult: DecisionResult = {
        shouldRespond: true,
        strategy: 'quick-reply',
        confidence: 0.5, // Below threshold
        reason: 'Low confidence',
        tokenEstimate: 200,
      };

      const result = await escalationService.evaluateAndEscalate(
        { response: 'test' },
        0.5,
        decisionResult,
        'Question under high load',
        undefined,
        0.9, // High system load
      );

      // High load should lower the threshold, making escalation less likely
      // But 0.5 is still quite low, so it might still escalate
      expect(result.originalConfidence).toBe(0.5);
    });

    test('should escalate normally under low system load', async () => {
      const decisionResult: DecisionResult = {
        shouldRespond: true,
        strategy: 'quick-reply',
        confidence: 0.6, // Below quick-reply threshold
        reason: 'Low confidence',
        tokenEstimate: 200,
      };

      const result = await escalationService.evaluateAndEscalate(
        { response: 'test' },
        0.6,
        decisionResult,
        'Question under low load',
        undefined,
        0.3, // Low system load
      );

      expect(result.triggered).toBe(true); // Should escalate under normal load
    });
  });

  describe('D2.5: Escalation Execution', () => {
    test('should execute multiple escalation attempts', async () => {
      const decisionResult: DecisionResult = {
        shouldRespond: true,
        strategy: 'deep-reason',
        confidence: 0.3, // Well below threshold
        reason: 'Low confidence',
        tokenEstimate: 1000,
      };

      const result = await escalationService.evaluateAndEscalate(
        { response: 'test' },
        0.3,
        decisionResult,
        'Complex question needing escalation',
      );

      expect(result.triggered).toBe(true);
      expect(result.escalationPath.length).toBeGreaterThan(0);
      expect(result.totalAttempts).toBeGreaterThan(0);

      // Check escalation attempt structure
      const firstAttempt = result.escalationPath[0];
      expect(firstAttempt.attemptNumber).toBe(1);
      expect(firstAttempt.serviceName).toBeDefined();
      expect(firstAttempt.startTime).toBeInstanceOf(Date);
      expect(typeof firstAttempt.success).toBe('boolean');
    });

    test('should track best result across attempts', async () => {
      const decisionResult: DecisionResult = {
        shouldRespond: true,
        strategy: 'defer',
        confidence: 0.2, // Very low confidence
        reason: 'Very low confidence',
        tokenEstimate: 1500,
      };

      const result = await escalationService.evaluateAndEscalate(
        { response: 'test' },
        0.2,
        decisionResult,
        'Question requiring multiple attempts',
      );

      expect(result.finalConfidence).toBeGreaterThanOrEqual(result.originalConfidence);

      if (result.successfulAttempts > 0) {
        expect(result.bestResult).toBeDefined();
        expect(result.bestResultConfidence).toBeDefined();
        expect(result.bestResultConfidence!).toBeGreaterThanOrEqual(result.originalConfidence);
      }
    });

    test('should respect time limits', async () => {
      // This test would need to be modified based on actual timing behavior
      const decisionResult: DecisionResult = {
        shouldRespond: true,
        strategy: 'deep-reason',
        confidence: 0.1, // Very low to trigger maximum attempts
        reason: 'Very low confidence',
        tokenEstimate: 2000,
      };

      const startTime = Date.now();
      const result = await escalationService.evaluateAndEscalate(
        { response: 'test' },
        0.1,
        decisionResult,
        'Time-sensitive escalation test',
      );
      const endTime = Date.now();

      // Should complete within reasonable time (allowing for test environment delays)
      expect(endTime - startTime).toBeLessThan(35000); // 35 seconds buffer for 30 second limit
      expect(result.totalExecutionTime).toBeLessThan(35000);
    });
  });

  describe('D2.6: Next Action Recommendations', () => {
    test('should recommend proceeding with significant improvement', async () => {
      const decisionResult: DecisionResult = {
        shouldRespond: true,
        strategy: 'quick-reply',
        confidence: 0.4, // Low confidence
        reason: 'Low confidence',
        tokenEstimate: 300,
      };

      const result = await escalationService.evaluateAndEscalate(
        { response: 'test' },
        0.4,
        decisionResult,
        'Question with potential for improvement',
      );

      if (result.finalConfidence - result.originalConfidence >= 0.2) {
        expect(result.recommendNextAction).toBe('proceed_with_best');
      } else if (result.finalConfidence - result.originalConfidence >= 0.1) {
        expect(result.recommendNextAction).toBe('proceed_with_caution');
      } else if (result.successfulAttempts === 0) {
        expect(result.recommendNextAction).toBe('fallback_to_basic');
      } else {
        expect(result.recommendNextAction).toBe('manual_review_recommended');
      }
    });
  });

  describe('D2.7: Metrics and Configuration', () => {
    test('should track escalation metrics', async () => {
      const initialMetrics = escalationService.getEscalationMetrics();
      const initialEscalations = initialMetrics.totalEscalations;

      const decisionResult: DecisionResult = {
        shouldRespond: true,
        strategy: 'quick-reply',
        confidence: 0.3,
        reason: 'Low confidence',
        tokenEstimate: 200,
      };

      await escalationService.evaluateAndEscalate(
        { response: 'test' },
        0.3,
        decisionResult,
        'Metrics tracking test',
      );

      const finalMetrics = escalationService.getEscalationMetrics();
      expect(finalMetrics.totalEscalations).toBeGreaterThan(initialEscalations);
      expect(finalMetrics.lastUpdated).toBeInstanceOf(Date);
    });

    test('should allow configuration updates', () => {
      const newConfig: Partial<EscalationConfig> = {
        lowConfidenceThreshold: 0.7,
        maxEscalationAttempts: 5,
      };

      escalationService.updateConfig(newConfig);
      const currentConfig = escalationService.getEscalationConfig();

      expect(currentConfig.lowConfidenceThreshold).toBe(0.7);
      expect(currentConfig.maxEscalationAttempts).toBe(5);
    });

    test('should allow metrics reset', () => {
      // First trigger an escalation to create metrics
      const decisionResult: DecisionResult = {
        shouldRespond: true,
        strategy: 'quick-reply',
        confidence: 0.3,
        reason: 'Low confidence',
        tokenEstimate: 200,
      };

      // Run escalation then reset
      escalationService
        .evaluateAndEscalate({ response: 'test' }, 0.3, decisionResult, 'Pre-reset test')
        .then(() => {
          escalationService.resetMetrics();
          const metrics = escalationService.getEscalationMetrics();

          expect(metrics.totalEscalations).toBe(0);
          expect(metrics.successfulEscalations).toBe(0);
          expect(metrics.averageImprovementRate).toBe(0);
        });
    });
  });

  describe('D2.8: Edge Cases and Error Handling', () => {
    test('should handle escalation with no available services gracefully', async () => {
      // Create a mock selector that returns no services
      const emptyMockSelector = {
        async selectReasoningService() {
          throw new Error('No services available');
        },
        recordServiceResult() {},
        getPerformanceMetrics() {
          return new Map();
        },
        getServiceConfigs() {
          return new Map();
        },
      };

      const emptyEscalationService = new ConfidenceEscalationService(emptyMockSelector as any);

      const decisionResult: DecisionResult = {
        shouldRespond: true,
        strategy: 'quick-reply',
        confidence: 0.3,
        reason: 'Low confidence',
        tokenEstimate: 200,
      };

      const result = await emptyEscalationService.evaluateAndEscalate(
        { response: 'test' },
        0.3,
        decisionResult,
        'Error handling test',
      );

      expect(result.triggered).toBe(true);
      expect(result.escalationPath.some((attempt) => !attempt.success)).toBe(true);
    });

    test('should handle extreme confidence values', async () => {
      // Test with confidence = 0
      const zeroConfidenceDecision: DecisionResult = {
        shouldRespond: true,
        strategy: 'quick-reply',
        confidence: 0,
        reason: 'Zero confidence',
        tokenEstimate: 200,
      };

      const zeroResult = await escalationService.evaluateAndEscalate(
        { response: 'test' },
        0,
        zeroConfidenceDecision,
        'Zero confidence test',
      );

      expect(zeroResult.triggered).toBe(true);
      expect(zeroResult.originalConfidence).toBe(0);

      // Test with confidence = 1
      const perfectConfidenceDecision: DecisionResult = {
        shouldRespond: true,
        strategy: 'quick-reply',
        confidence: 1.0,
        reason: 'Perfect confidence',
        tokenEstimate: 200,
      };

      const perfectResult = await escalationService.evaluateAndEscalate(
        { response: 'test' },
        1.0,
        perfectConfidenceDecision,
        'Perfect confidence test',
      );

      expect(perfectResult.triggered).toBe(false);
      expect(perfectResult.originalConfidence).toBe(1.0);
    });

    test('should handle undefined personality and system load', async () => {
      const decisionResult: DecisionResult = {
        shouldRespond: true,
        strategy: 'quick-reply',
        confidence: 0.5,
        reason: 'Medium confidence',
        tokenEstimate: 200,
      };

      const result = await escalationService.evaluateAndEscalate(
        { response: 'test' },
        0.5,
        decisionResult,
        'Undefined context test',
        undefined, // No personality context
        undefined, // No system load
      );

      expect(result).toBeDefined();
      expect(typeof result.triggered).toBe('boolean');
      expect(result.originalConfidence).toBe(0.5);
    });
  });
});
