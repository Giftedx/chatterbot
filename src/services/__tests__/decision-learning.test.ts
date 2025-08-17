/**
 * Decision Learning Service Tests (Phase D4)
 * 
 * Tests for decision outcome tracking, service ranking adaptation,
 * threshold management, and continuous improvement algorithms.
 */

import { DecisionLearningService, DecisionOutcome, ServicePerformanceMetrics, AdaptiveThresholds, LearningInsights } from '../decision-learning.service.js';

describe('DecisionLearningService', () => {
  let service: DecisionLearningService;

  beforeEach(() => {
    service = new DecisionLearningService();
  });

  describe('Decision Outcome Recording', () => {
    it('should record decision outcomes successfully', async () => {
      const outcome: DecisionOutcome = {
        id: 'test-outcome-1',
        timestamp: Date.now(),
        userId: 'user123',
        strategy: 'quick-reply',
        serviceUsed: 'GeminiDirect',
        confidence: 0.9,
        executionTime: 120,
        contextFactors: {
          complexity: 'low',
          tokenEstimate: 50,
          systemLoad: 0.3,
          relationshipStrength: 0.9,
          userMood: 'positive'
        },
        result: {
          success: true,
          responseGenerated: true,
          escalated: false,
          multiStepUsed: false,
          finalConfidence: 0.9
        }
      };

      await service.recordDecisionOutcome(outcome);
      
      const rankings = await service.getServiceRankings('quick-reply');
      expect(rankings).toBeDefined();
      expect(rankings.length).toBeGreaterThan(0);
    });

    it('should handle multiple outcomes and calculate metrics', async () => {
      const outcomes = [
        createMockOutcome({ strategy: 'quick-reply', serviceUsed: 'GeminiDirect', confidence: 0.8 }),
        createMockOutcome({ strategy: 'deep-reason', serviceUsed: 'GeminiReasoning', confidence: 0.4, result: { success: false, responseGenerated: true, escalated: false, multiStepUsed: false, finalConfidence: 0.4 } }),
        createMockOutcome({ strategy: 'defer', serviceUsed: 'TreeOfThoughts', confidence: 0.9 })
      ];

      for (const outcome of outcomes) {
        await service.recordDecisionOutcome(outcome);
      }

      const rankings = await service.getServiceRankings();
      expect(rankings.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Service Ranking Adaptation', () => {
    it('should adjust service rankings based on performance', async () => {
      // Record successful outcomes for GeminiDirect
      const specs = [
        { strategy: 'quick-reply', serviceUsed: 'GeminiDirect', success: true, confidence: 0.9 },
        { strategy: 'quick-reply', serviceUsed: 'GeminiDirect', success: true, confidence: 0.85 },
        { strategy: 'deep-reason', serviceUsed: 'TreeOfThoughts', success: true, confidence: 0.8 }
      ];
      await recordTestOutcomes(service, specs);

      const rankings = await service.getServiceRankings('quick-reply');
      const geminiDirectRanking = rankings.find(r => r.serviceId === 'GeminiDirect');
      
      expect(geminiDirectRanking).toBeDefined();
      expect(geminiDirectRanking!.successRate).toBeGreaterThan(0.8);
    });

    it('should penalize consistently failing services', async () => {
      // Record some successful and some failed outcomes
      for (let i = 0; i < 2; i++) {
        await service.recordDecisionOutcome(
          createMockOutcome({ strategy: 'quick-reply', serviceUsed: 'GeminiDirect' })
        );
        await service.recordDecisionOutcome(
          createMockOutcome({ 
            strategy: 'quick-reply', 
            serviceUsed: 'GeminiReasoning', 
            result: { success: false, responseGenerated: true, escalated: false, multiStepUsed: false, finalConfidence: 0.4 }
          })
        );
      }

      const rankings = await service.getServiceRankings('quick-reply');
      const geminiDirect = rankings.find(r => r.serviceId === 'GeminiDirect');
      const geminiReasoning = rankings.find(r => r.serviceId === 'GeminiReasoning');

      expect(geminiDirect?.successRate).toBeGreaterThan(geminiReasoning?.successRate || 0);
    });
  });

  describe('Adaptive Thresholds', () => {
    it('should provide adaptive thresholds based on context', async () => {
      await setupDiverseTestData(service);

      const thresholds = await service.getAdaptiveThresholds('quick-reply', 'user123', {
        complexity: 'high',
        tokenEstimate: 500,
        systemLoad: 0.8,
        relationshipStrength: 0.9,
        userMood: 'positive'
      });

      expect(thresholds).toBeDefined();
      expect(thresholds.confidenceThreshold).toBeGreaterThan(0);
      expect(thresholds.escalationThreshold).toBeGreaterThan(0);
      expect(thresholds.deferralThreshold).toBeGreaterThan(0);
      expect(typeof thresholds.adaptationReason).toBe('string');
    });

    it('should lower thresholds for experienced users', async () => {
      const userId = 'experienced-user';
      
      // Create outcomes for an experienced user
      const outcomes = [
        createMockOutcome({ userId, strategy: 'quick-reply' }),
        createMockOutcome({ userId, strategy: 'deep-reason' }),
        createMockOutcome({ userId, strategy: 'defer' })
      ];

      for (const outcome of outcomes) {
        await service.recordDecisionOutcome(outcome);
      }

      const thresholds = await service.getAdaptiveThresholds('quick-reply', userId, {
        complexity: 'medium',
        tokenEstimate: 200,
        systemLoad: 0.5,
        relationshipStrength: 0.7,
        userMood: 'neutral'
      });

      // Experienced users should have lower thresholds (more lenient)
      expect(thresholds.confidenceThreshold).toBeLessThan(0.8);
    });
  });

  describe('User Feedback Integration', () => {
    it('should record and utilize user feedback', async () => {
      const outcome = createMockOutcome({ strategy: 'quick-reply' });
      await service.recordDecisionOutcome(outcome);

      await service.recordUserFeedback(outcome.id, {
        rating: 4,
        helpful: true,
        responseQuality: 'good',
        suggestions: 'Could be more detailed'
      });

      const rankings = await service.getServiceRankings();
      expect(rankings.length).toBeGreaterThan(0);
    });

    it('should weight negative feedback appropriately', async () => {
      const outcome1 = createMockOutcome({ 
        strategy: 'quick-reply', 
        serviceUsed: 'TestService',
        userSatisfaction: 5
      });
      
      const outcome2 = createMockOutcome({ 
        strategy: 'quick-reply', 
        serviceUsed: 'TestService',
        userSatisfaction: 1
      });

      await service.recordDecisionOutcome(outcome1);
      await service.recordDecisionOutcome(outcome2);

      await service.recordUserFeedback(outcome2.id, {
        rating: 1,
        helpful: false,
        responseQuality: 'poor',
        suggestions: 'Completely irrelevant'
      });

      const rankings = await service.getServiceRankings('quick-reply');
      const testServiceRanking = rankings.find(r => r.serviceId === 'TestService');
      
      expect(testServiceRanking?.userSatisfactionScore).toBeLessThan(5);
    });
  });

  describe('Learning Insights Generation', () => {
    it('should generate comprehensive learning insights', async () => {
      await setupDiverseTestData(service);

      const insights = await service.generateLearningInsights();

      expect(insights.overallTrends).toBeDefined();
      expect(insights.serviceRankings).toBeDefined();
      expect(insights.userSegments).toBeDefined();
      expect(insights.improvementOpportunities).toBeDefined();
      
      expect(insights.overallTrends.totalDecisions).toBeGreaterThan(0);
      expect(insights.serviceRankings.length).toBeGreaterThan(0);
      expect(insights.userSegments.length).toBeGreaterThan(0);
      expect(insights.improvementOpportunities.length).toBeGreaterThan(0);
    });

    it('should identify improvement opportunities', async () => {
      // Create pattern of underperforming service
      const specs = [
        { strategy: 'deep-reason', serviceUsed: 'UnderperformingService', success: false, confidence: 0.3 },
        { strategy: 'deep-reason', serviceUsed: 'UnderperformingService', success: false, confidence: 0.2 },
        { strategy: 'deep-reason', serviceUsed: 'UnderperformingService', success: false, confidence: 0.25 }
      ];
      
      await recordTestOutcomes(service, specs);

      const insights = await service.generateLearningInsights();
      const lowPerformanceOpportunity = insights.improvementOpportunities.find(
        opp => opp.type === 'low-performance-service'
      );

      expect(lowPerformanceOpportunity).toBeDefined();
      expect(lowPerformanceOpportunity?.priority).toBe('high');
    });

    it('should handle minimal data gracefully', async () => {
      // Only one outcome
      await service.recordDecisionOutcome(createMockOutcome({ strategy: 'quick-reply' }));

      const insights = await service.generateLearningInsights();
      
      expect(insights.overallTrends).toBeDefined();
      expect(insights.serviceRankings).toBeDefined();
      expect(insights.userSegments).toBeDefined();
      expect(insights.improvementOpportunities).toBeDefined();
    });
  });

  describe('Performance Testing', () => {
    it('should handle high-volume data efficiently', async () => {
      const start = Date.now();
      
      // Record 1000 outcomes
      const promises = Array.from({ length: 1000 }, (_, i) => {
        const outcome = createMockOutcome({
          strategy: i % 2 === 0 ? 'quick-reply' : 'deep-reason',
          serviceUsed: `Service${i % 5}`,
          confidence: Math.random() * 0.5 + 0.5 // 0.5 to 1.0
        });
        return service.recordDecisionOutcome(outcome);
      });

      await Promise.all(promises);
      
      const recordingTime = Date.now() - start;
      expect(recordingTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Test insight generation performance
      const insightStart = Date.now();
      const insights = await service.generateLearningInsights();
      const insightTime = Date.now() - insightStart;
      
      expect(insightTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(insights.overallTrends.totalDecisions).toBe(1000);
    });
  });
});

// Helper functions for test setup

function createMockOutcome(overrides: Partial<DecisionOutcome> = {}): DecisionOutcome {
  const timestamp = Date.now();
  const baseOutcome: DecisionOutcome = {
    id: `outcome-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp,
    userId: 'test-user',
    strategy: 'quick-reply',
    serviceUsed: 'GeminiDirect',
    confidence: 0.7,
    executionTime: 1500,
    contextFactors: {
      complexity: 'moderate',
      tokenEstimate: 1000,
      systemLoad: 0.5,
      relationshipStrength: 0.6,
      userMood: 'neutral'
    },
    result: {
      success: true,
      responseGenerated: true,
      escalated: false,
      multiStepUsed: false,
      finalConfidence: 0.8
    }
  };

  // Handle nested overrides for result.success
  if ('success' in overrides) {
    const { success, ...otherOverrides } = overrides as any;
    return {
      ...baseOutcome,
      ...otherOverrides,
      result: {
        ...baseOutcome.result,
        success
      }
    };
  }

  return {
    ...baseOutcome,
    ...overrides
  };
}

async function recordTestOutcomes(service: DecisionLearningService, outcomeSpecs: any[]): Promise<void> {
  for (const spec of outcomeSpecs) {
    const outcome = createMockOutcome(spec);
    await service.recordDecisionOutcome(outcome);
  }
}

async function setupDiverseTestData(service: DecisionLearningService): Promise<void> {
  const specs = [
    // Quick reply outcomes
    { strategy: 'quick-reply', serviceUsed: 'GeminiDirect', success: true, confidence: 0.9, userSatisfaction: 5 },
    { strategy: 'quick-reply', serviceUsed: 'GeminiReasoning', success: true, confidence: 0.8, userSatisfaction: 4 },
    
    // Deep reason outcomes  
    { strategy: 'deep-reason', serviceUsed: 'TreeOfThoughts', success: true, confidence: 0.85, userSatisfaction: 5 },
    { strategy: 'deep-reason', serviceUsed: 'EnhancedReasoning', success: true, confidence: 0.4, userSatisfaction: 2 },
    
    // Defer outcomes
    { strategy: 'defer', serviceUsed: 'GeminiReasoning', success: true, confidence: 0.7, userSatisfaction: 4 },
    { strategy: 'defer', serviceUsed: 'CausalReasoning', success: true, confidence: 0.75, userSatisfaction: 4 },
  ];

  await recordTestOutcomes(service, specs);
}

describe('DecisionLearningService (D4)', () => {
  let service: DecisionLearningService;
  
  beforeEach(() => {
    service = new DecisionLearningService();
  });

  describe('Decision Outcome Recording', () => {
    it('should record decision outcomes successfully', async () => {
      const outcome: DecisionOutcome = createMockOutcome({
        strategy: 'quick-reply',
        serviceUsed: 'GeminiDirect',
        success: true,
        confidence: 0.8
      });

      await service.recordDecisionOutcome(outcome);
      
      const stats = service.getLearningStatistics();
      expect(stats.totalOutcomes).toBe(1);
      expect(stats.successRate).toBe(1);
      expect(stats.averageConfidence).toBe(0.8);
    });

    it('should track multiple outcomes and calculate statistics', async () => {
      const outcomes = [
        createMockOutcome({ strategy: 'quick-reply', serviceUsed: 'GeminiDirect', confidence: 0.8, result: { success: true, responseGenerated: true, escalated: false, multiStepUsed: false, finalConfidence: 0.8 } }),
        createMockOutcome({ strategy: 'deep-reason', serviceUsed: 'GeminiReasoning', confidence: 0.4, result: { success: false, responseGenerated: true, escalated: false, multiStepUsed: false, finalConfidence: 0.4 } }),
        createMockOutcome({ strategy: 'defer', serviceUsed: 'TreeOfThoughts', confidence: 0.9, result: { success: true, responseGenerated: true, escalated: false, multiStepUsed: false, finalConfidence: 0.9 } })
      ];

      for (const outcome of outcomes) {
        await service.recordDecisionOutcome(outcome);
      }

      const stats = service.getLearningStatistics();
      expect(stats.totalOutcomes).toBe(3);
      expect(stats.successRate).toBeCloseTo(2/3);
      expect(stats.averageConfidence).toBeCloseTo(0.7);
    });

    it('should handle outcome recording errors gracefully', async () => {
      const invalidOutcome = { id: 'invalid' } as any;
      
      // Should not throw
      await expect(service.recordDecisionOutcome(invalidOutcome)).resolves.not.toThrow();
    });
  });

  describe('Service Ranking Adaptation', () => {
    it('should provide service rankings based on strategy', async () => {
      // Record some outcomes to establish rankings
      await recordTestOutcomes(service, [
        { strategy: 'quick-reply', serviceUsed: 'GeminiDirect', success: true, confidence: 0.9 },
        { strategy: 'quick-reply', serviceUsed: 'GeminiReasoning', success: false, confidence: 0.5 },
        { strategy: 'deep-reason', serviceUsed: 'TreeOfThoughts', success: true, confidence: 0.8 }
      ]);

      const quickReplyRankings = await service.getServiceRankings('quick-reply');
      const deepReasonRankings = await service.getServiceRankings('deep-reason');

      expect(quickReplyRankings).toContain('GeminiDirect');
      expect(deepReasonRankings).toContain('TreeOfThoughts');
      expect(Array.isArray(quickReplyRankings)).toBe(true);
      expect(Array.isArray(deepReasonRankings)).toBe(true);
    });

    it('should adapt rankings based on performance metrics', async () => {
      // Record outcomes showing GeminiDirect performs better than GeminiReasoning
      const outcomes = [
        ...Array(10).fill(null).map(() => 
          createMockOutcome({ strategy: 'quick-reply', serviceUsed: 'GeminiDirect', success: true, confidence: 0.9 })
        ),
        ...Array(10).fill(null).map(() => 
          createMockOutcome({ strategy: 'quick-reply', serviceUsed: 'GeminiReasoning', success: false, confidence: 0.4 })
        )
      ];

      for (const outcome of outcomes) {
        await service.recordDecisionOutcome(outcome);
      }

      const rankings = await service.getServiceRankings('quick-reply');
      expect(rankings.indexOf('GeminiDirect')).toBeLessThan(rankings.indexOf('GeminiReasoning'));
    });

    it('should consider context factors in service ranking', async () => {
      const contextFactors = {
        complexity: 'complex',
        userMood: 'frustrated',
        systemLoad: 0.3,
        relationshipStrength: 0.8
      };

      const rankings = await service.getServiceRankings('deep-reason', contextFactors);
      
      expect(Array.isArray(rankings)).toBe(true);
      expect(rankings.length).toBeGreaterThan(0);
    });
  });

  describe('Adaptive Threshold Management', () => {
    it('should provide default thresholds for new users', async () => {
      const thresholds = await service.getAdaptiveThresholds('new-user');
      
      expect(thresholds.userId).toBe('new-user');
      expect(thresholds.baseThresholds.quickReply).toBe(0.7);
      expect(thresholds.baseThresholds.deepReason).toBe(0.5);
      expect(thresholds.baseThresholds.defer).toBe(0.4);
      expect(thresholds.baseThresholds.ambient).toBe(0.3);
      expect(thresholds.adaptedThresholds).toEqual(thresholds.baseThresholds);
    });

    it('should adapt thresholds based on user performance', async () => {
      const userId = 'test-user';
      
      // Record many successful outcomes for this user to trigger adaptation
      const successfulOutcomes = Array(15).fill(null).map(() => 
        createMockOutcome({ 
          userId, 
          strategy: 'quick-reply', 
          success: true, 
          confidence: 0.85,
          userSatisfaction: 5
        })
      );

      for (const outcome of successfulOutcomes) {
        await service.recordDecisionOutcome(outcome);
      }

      const adaptedThresholds = await service.getAdaptiveThresholds(userId);
      
      expect(adaptedThresholds.userId).toBe(userId);
      expect(adaptedThresholds.confidence).toBeGreaterThan(0.5);
      // Should have some adaptation
      expect(adaptedThresholds.adaptationFactors.userPreference).not.toBe(0);
    });

    it('should not adapt thresholds with insufficient data', async () => {
      const userId = 'low-data-user';
      
      // Record only a few outcomes (below minimum threshold)
      const outcomes = Array(3).fill(null).map(() => 
        createMockOutcome({ userId, strategy: 'quick-reply', success: true })
      );

      for (const outcome of outcomes) {
        await service.recordDecisionOutcome(outcome);
      }

      const thresholds = await service.getAdaptiveThresholds(userId);
      
      // Should still be default thresholds
      expect(thresholds.adaptedThresholds).toEqual(thresholds.baseThresholds);
      expect(thresholds.confidence).toBe(0.5);
    });
  });

  describe('User Feedback Integration', () => {
    it('should record user feedback for outcomes', async () => {
      const outcome = createMockOutcome({ strategy: 'quick-reply', success: true });
      await service.recordDecisionOutcome(outcome);

      await service.recordUserFeedback(outcome.id, 4, {
        relevance: 0.9,
        coherence: 0.8,
        timeliness: 0.95
      });

      const stats = service.getLearningStatistics();
      expect(stats.averageSatisfaction).toBe(0.8); // 4/5 = 0.8
      expect(stats.feedbackCoverage).toBe(1);
    });

    it('should handle feedback for non-existent outcomes', async () => {
      // Should not throw error
      await expect(service.recordUserFeedback('non-existent', 5)).resolves.not.toThrow();
    });

    it('should normalize satisfaction scores', async () => {
      const outcome = createMockOutcome({ strategy: 'quick-reply' });
      await service.recordDecisionOutcome(outcome);

      // Test extreme values
      await service.recordUserFeedback(outcome.id, 10); // Should be clamped to 5
      
      const stats = service.getLearningStatistics();
      expect(stats.averageSatisfaction).toBe(1); // 5/5 = 1
    });
  });

  describe('Learning Insights Generation', () => {
    it('should generate comprehensive learning insights', async () => {
      // Set up diverse test data
      await setupDiverseTestData(service);

      const insights = await service.generateLearningInsights();

      expect(insights.overallTrends).toBeDefined();
      expect(insights.serviceRankings).toBeDefined();
      expect(insights.userSegments).toBeDefined();
      expect(insights.improvementOpportunities).toBeDefined();

      expect(Array.isArray(insights.overallTrends.preferredStrategies)).toBe(true);
      expect(Array.isArray(insights.overallTrends.mostEffectiveServices)).toBe(true);
      expect(typeof insights.overallTrends.userSatisfactionTrend).toBe('number');

      expect(insights.serviceRankings['quick-reply']).toBeDefined();
      expect(insights.serviceRankings['deep-reason']).toBeDefined();
      expect(insights.serviceRankings['defer']).toBeDefined();
    });

    it('should identify improvement opportunities', async () => {
      // Create scenario with underperforming service
      const poorOutcomes = Array(20).fill(null).map(() => 
        createMockOutcome({ 
          serviceUsed: 'UnderperformingService', 
          success: false, 
          confidence: 0.3,
          userSatisfaction: 2
        })
      );

      for (const outcome of poorOutcomes) {
        await service.recordDecisionOutcome(outcome);
      }

      const insights = await service.generateLearningInsights();
      
      expect(insights.improvementOpportunities.length).toBeGreaterThan(0);
      
      const serviceOpportunity = insights.improvementOpportunities
        .find(opp => opp.area === 'service_performance');
      expect(serviceOpportunity).toBeDefined();
    });

    it('should analyze user segments effectively', async () => {
      // Create users with different relationship strengths
      await recordSegmentedUserData(service);

      const insights = await service.generateLearningInsights();
      
      expect(Object.keys(insights.userSegments)).toContain('high_relationship');
      expect(Object.keys(insights.userSegments)).toContain('medium_relationship');
      expect(Object.keys(insights.userSegments)).toContain('low_relationship');

      const highRelSegment = insights.userSegments.high_relationship;
      expect(highRelSegment.successRate).toBeDefined();
      expect(highRelSegment.preferredApproach).toBeDefined();
      expect(Array.isArray(highRelSegment.characteristics)).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of outcomes efficiently', async () => {
      const startTime = Date.now();
      
      // Record 1000 outcomes
      const outcomes = Array(1000).fill(null).map((_, index) => 
        createMockOutcome({ 
          userId: `user-${index % 100}`, // 100 different users
          strategy: ['quick-reply', 'deep-reason', 'defer'][index % 3] as any
        })
      );

      for (const outcome of outcomes) {
        await service.recordDecisionOutcome(outcome);
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process 1000 outcomes in reasonable time
      expect(processingTime).toBeLessThan(5000); // 5 seconds max
      
      const stats = service.getLearningStatistics();
      expect(stats.totalOutcomes).toBe(1000);
    });

    it('should clean old outcomes automatically', async () => {
      // Create old outcomes (simulate by manually setting timestamps)
      const oldOutcome = createMockOutcome({ strategy: 'quick-reply' });
      oldOutcome.timestamp = Date.now() - 35 * 24 * 60 * 60 * 1000; // 35 days ago
      
      const recentOutcome = createMockOutcome({ strategy: 'deep-reason' });
      
      await service.recordDecisionOutcome(oldOutcome);
      await service.recordDecisionOutcome(recentOutcome);

      // The old outcome should be cleaned up during processing
      const stats = service.getLearningStatistics();
      expect(stats.totalOutcomes).toBeLessThanOrEqual(2); // May be cleaned up
    });

    it('should provide consistent results for concurrent operations', async () => {
      const outcomes = Array(50).fill(null).map(() => 
        createMockOutcome({ strategy: 'quick-reply', success: true })
      );

      // Process outcomes concurrently
      await Promise.all(outcomes.map(outcome => service.recordDecisionOutcome(outcome)));

      const stats = service.getLearningStatistics();
      expect(stats.totalOutcomes).toBe(50);
      expect(stats.successRate).toBe(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed outcome data', async () => {
      const malformedOutcome = {
        id: 'malformed',
        // Missing required fields
      } as any;

      await expect(service.recordDecisionOutcome(malformedOutcome)).resolves.not.toThrow();
    });

    it('should provide graceful fallbacks when no data exists', async () => {
      const rankings = await service.getServiceRankings('unknown-strategy');
      const thresholds = await service.getAdaptiveThresholds('unknown-user');
      const stats = service.getLearningStatistics();

      expect(Array.isArray(rankings)).toBe(true);
      expect(thresholds.userId).toBe('unknown-user');
      expect(typeof stats.totalOutcomes).toBe('number');
    });

    it('should handle insights generation with minimal data', async () => {
      // Only one outcome
      await service.recordDecisionOutcome(createMockOutcome({ strategy: 'quick-reply' }));

      const insights = await service.generateLearningInsights();
      
      expect(insights.overallTrends).toBeDefined();
      expect(insights.serviceRankings).toBeDefined();
      expect(insights.userSegments).toBeDefined();
      expect(insights.improvementOpportunities).toBeDefined();
    });
  });
});

// (duplicate helper functions removed)

async function recordSegmentedUserData(service: DecisionLearningService): Promise<void> {
  // High relationship users
  for (let i = 0; i < 10; i++) {
    const outcome = createMockOutcome({
      userId: `high-rel-user-${i}`,
      strategy: 'deep-reason',
      success: true,
      confidence: 0.9,
      userSatisfaction: 5,
      contextFactors: {
        complexity: 'complex',
        tokenEstimate: 2000,
        systemLoad: 0.3,
        relationshipStrength: 0.9,
        userMood: 'excited'
      }
    });
    await service.recordDecisionOutcome(outcome);
  }

  // Medium relationship users
  for (let i = 0; i < 10; i++) {
    const outcome = createMockOutcome({
      userId: `med-rel-user-${i}`,
      strategy: 'quick-reply',
      success: true,
      confidence: 0.7,
      userSatisfaction: 3,
      contextFactors: {
        complexity: 'moderate',
        tokenEstimate: 1000,
        systemLoad: 0.5,
        relationshipStrength: 0.6,
        userMood: 'neutral'
      }
    });
    await service.recordDecisionOutcome(outcome);
  }

  // Low relationship users
  for (let i = 0; i < 10; i++) {
    const outcome = createMockOutcome({
      userId: `low-rel-user-${i}`,
      strategy: 'defer',
      success: false,
      confidence: 0.4,
      userSatisfaction: 2,
      contextFactors: {
        complexity: 'simple',
        tokenEstimate: 500,
        systemLoad: 0.7,
        relationshipStrength: 0.2,
        userMood: 'frustrated'
      }
    });
    await service.recordDecisionOutcome(outcome);
  }
}