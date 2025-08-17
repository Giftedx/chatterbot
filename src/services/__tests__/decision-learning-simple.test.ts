import { DecisionLearningService, DecisionOutcome } from '../decision-learning.service.js';

describe('DecisionLearningService - Basic Tests', () => {
  let service: DecisionLearningService;

  beforeEach(() => {
    service = new DecisionLearningService();
  });

  it('should create service instance', () => {
    expect(service).toBeDefined();
  });

  it('should record decision outcome', async () => {
    const outcome: DecisionOutcome = {
      id: 'test-1',
      timestamp: Date.now(),
      userId: 'user123',
      strategy: 'quick-reply',
      serviceUsed: 'GeminiDirect',
      confidence: 0.8,
      executionTime: 150,
      contextFactors: {
        complexity: 'low',
        tokenEstimate: 100,
        systemLoad: 0.3,
        relationshipStrength: 0.9,
        userMood: 'positive'
      },
      result: {
        success: true,
        responseGenerated: true,
        escalated: false,
        multiStepUsed: false,
        finalConfidence: 0.8
      }
    };

    await service.recordDecisionOutcome(outcome);
    
    // Basic verification - should not throw
    expect(true).toBe(true);
  });

  it('should get service rankings', async () => {
    const rankings = await service.getServiceRankings('quick-reply');
    expect(rankings).toBeDefined();
    expect(Array.isArray(rankings)).toBe(true);
  });

  it('should get adaptive thresholds', async () => {
    const thresholds = await service.getAdaptiveThresholds('user123');
    expect(thresholds).toBeDefined();
    expect(thresholds.userId).toBe('user123');
    expect(thresholds.baseThresholds).toBeDefined();
    expect(thresholds.adaptedThresholds).toBeDefined();
  });

  it('should generate learning insights', async () => {
    const insights = await service.generateLearningInsights();
    expect(insights).toBeDefined();
    expect(insights.overallTrends).toBeDefined();
    expect(insights.serviceRankings).toBeDefined();
    expect(insights.userSegments).toBeDefined();
    expect(insights.improvementOpportunities).toBeDefined();
  });

  it('should record user feedback', async () => {
    const outcome: DecisionOutcome = {
      id: 'test-feedback',
      timestamp: Date.now(),
      userId: 'user123',
      strategy: 'quick-reply',
      serviceUsed: 'GeminiDirect',
      confidence: 0.8,
      executionTime: 150,
      contextFactors: {
        complexity: 'low',
        tokenEstimate: 100,
        systemLoad: 0.3,
        relationshipStrength: 0.9,
        userMood: 'positive'
      },
      result: {
        success: true,
        responseGenerated: true,
        escalated: false,
        multiStepUsed: false,
        finalConfidence: 0.8
      }
    };

    await service.recordDecisionOutcome(outcome);
    await service.recordUserFeedback(outcome.id, 4);
    
    // Should not throw
    expect(true).toBe(true);
  });
});