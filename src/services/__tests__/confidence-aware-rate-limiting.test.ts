import { CoreIntelligenceService } from '../core-intelligence.service.js';
import { DecisionResult } from '../decision-engine.service.js';

describe('Confidence-Aware Rate Limiting (A4)', () => {
  
  // Test helper to create a minimal service instance for testing private methods
  const createTestService = () => {
    const mockServices = {
      userConsentService: {} as any,
      geminiService: {} as any,
      unifiedPipeline: {} as any,
      moderationService: {} as any,
      advancedCapabilitiesManager: {} as any,
      decisionEngine: {} as any,
      mcpManager: {} as any,
      userMemoryService: {} as any,
      orchestratorService: {} as any
    };
    
    return new CoreIntelligenceService(mockServices.userConsentService) as any;
  };

  beforeEach(() => {
    // Clear global rate limiting storage before each test
    Object.keys(global as any).forEach(key => {
      if (key.startsWith('rate_limit')) {
        delete (global as any)[key];
      }
    });
  });

  describe('Confidence Multiplier Calculation', () => {
    test('calculates correct multipliers for different confidence levels', () => {
      const service = createTestService();
      
      const testCases = [
        { confidence: 0.95, expectedMultiplier: 2.0 },   // Very high
        { confidence: 0.85, expectedMultiplier: 1.5 },   // High  
        { confidence: 0.75, expectedMultiplier: 1.2 },   // Good
        { confidence: 0.60, expectedMultiplier: 1.0 },   // Medium
        { confidence: 0.40, expectedMultiplier: 0.7 },   // Low
        { confidence: 0.20, expectedMultiplier: 0.5 },   // Very low
      ];

      testCases.forEach(({ confidence, expectedMultiplier }) => {
        const multiplier = service.calculateConfidenceMultiplier(confidence);
        expect(multiplier).toBe(expectedMultiplier);
      });
    });
  });

  describe('Rate Limiting Logic', () => {
    test('allows requests within confidence-adjusted limits', async () => {
      const service = createTestService();
      const userId = 'user-123';
      const highConfidence = 0.9;  // 2.0 multiplier = 20 requests per minute
      const tokenEstimate = 1000;

      const result = await service.checkConfidenceAwareRateLimit(
        userId, 
        highConfidence, 
        tokenEstimate, 
        null
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.retryAfter).toBeUndefined();
    });

    test('blocks requests exceeding confidence-adjusted request limits', async () => {
      const service = createTestService();
      const userId = 'user-456';
      const lowConfidence = 0.3; // 0.7 multiplier = 7 requests per minute
      
      // Set up existing usage at the limit
      const currentMinute = Math.floor(Date.now() / 60000);
      await service.resetUserUsageWindow(userId, currentMinute);
      
      // Make requests up to the adjusted limit (7 for low confidence)
      for (let i = 0; i < 7; i++) {
        await service.updateUserUsage(userId, 100);
      }

      // Next request should be blocked
      const result = await service.checkConfidenceAwareRateLimit(
        userId,
        lowConfidence,
        100,
        null
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Request rate limit exceeded');
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    test('blocks requests exceeding confidence-adjusted token limits', async () => {
      const service = createTestService();
      const userId = 'user-789';
      const mediumConfidence = 0.6; // 1.0 multiplier = 50000 tokens per minute
      const currentMinute = Math.floor(Date.now() / 60000);
      
      await service.resetUserUsageWindow(userId, currentMinute);
      
      // Set usage near token limit
      await service.updateUserUsage(userId, 45000);

      // Request that would exceed token limit
      const result = await service.checkConfidenceAwareRateLimit(
        userId,
        mediumConfidence,
        10000, // This would exceed the 50000 limit
        null
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Token rate limit exceeded');
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    test('resets usage window for new time periods', async () => {
      const service = createTestService();
      const userId = 'user-reset';
      const confidence = 0.8; // 1.5 multiplier
      
      // Set usage in a previous window
      const previousMinute = Math.floor(Date.now() / 60000) - 1;
      (global as any)[`rate_limit_${userId}`] = {
        requests: 10,
        tokens: 40000,
        windowStart: previousMinute
      };

      // Request in current window should reset and allow
      const result = await service.checkConfidenceAwareRateLimit(
        userId,
        confidence,
        1000,
        null
      );

      expect(result.allowed).toBe(true);
      
      // Verify window was reset
      const currentUsage = await service.getCurrentUserUsage(userId);
      expect(currentUsage.windowStart).toBe(Math.floor(Date.now() / 60000));
      expect(currentUsage.requests).toBe(0);
      expect(currentUsage.tokens).toBe(0);
    });

    test('handles edge case where confidence exactly matches threshold', async () => {
      const service = createTestService();
      const userId = 'user-edge';
      
      // Test confidence exactly at 0.8 threshold
      const multiplier = service.calculateConfidenceMultiplier(0.8);
      expect(multiplier).toBe(1.5);
      
      // Test confidence exactly at 0.5 threshold  
      const multiplier2 = service.calculateConfidenceMultiplier(0.5);
      expect(multiplier2).toBe(1.0);
    });

    test('gracefully handles errors and allows requests on failure', async () => {
      const service = createTestService();
      
      // Force an error by corrupting global storage
      (global as any).rate_limit_error_user = { invalid: 'data' };
      
      const result = await service.checkConfidenceAwareRateLimit(
        'error_user',
        0.5,
        1000,
        null
      );
      
      // Should allow request despite error
      expect(result.allowed).toBe(true);
    });
  });

  describe('Request Completion Recording', () => {
    test('records successful completions with metrics', async () => {
      const service = createTestService();
      const userId = 'user-metrics';
      const confidence = 0.8;
      const responseTime = 1500;

      await service.recordRequestCompletion(userId, confidence, true, responseTime);

      const metrics = (global as any)[`rate_limit_metrics_${userId}`];
      expect(metrics).toBeDefined();
      expect(metrics.completions).toHaveLength(1);
      expect(metrics.completions[0]).toMatchObject({
        confidence,
        success: true,
        responseTime
      });
      expect(typeof metrics.completions[0].timestamp).toBe('number');
    });

    test('records failed completions', async () => {
      const service = createTestService();
      const userId = 'user-failures';
      const confidence = 0.6;
      const responseTime = 3000;

      await service.recordRequestCompletion(userId, confidence, false, responseTime);

      const metrics = (global as any)[`rate_limit_metrics_${userId}`];
      expect(metrics.completions[0].success).toBe(false);
      expect(metrics.completions[0].responseTime).toBe(3000);
    });

    test('limits completion history to last 100 entries', async () => {
      const service = createTestService();
      const userId = 'user-history';
      
      // Record 150 completions
      for (let i = 0; i < 150; i++) {
        await service.recordRequestCompletion(userId, 0.5, true, 1000);
      }

      const metrics = (global as any)[`rate_limit_metrics_${userId}`];
      expect(metrics.completions).toHaveLength(100);
    });

    test('handles concurrent completion recording', async () => {
      const service = createTestService();
      const userId = 'user-concurrent';
      
      // Record multiple completions simultaneously
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(service.recordRequestCompletion(userId, 0.7, true, 1000 + i));
      }
      
      await Promise.all(promises);
      
      const metrics = (global as any)[`rate_limit_metrics_${userId}`];
      expect(metrics.completions).toHaveLength(10);
    });
  });

  describe('Usage Window Management', () => {
    test('correctly manages user usage windows', async () => {
      const service = createTestService();
      const userId = 'user-window';
      const currentMinute = Math.floor(Date.now() / 60000);
      
      // Initially no usage
      let usage = await service.getCurrentUserUsage(userId);
      expect(usage).toBeNull();
      
      // Reset window
      await service.resetUserUsageWindow(userId, currentMinute);
      usage = await service.getCurrentUserUsage(userId);
      expect(usage).toMatchObject({
        requests: 0,
        tokens: 0,
        windowStart: currentMinute
      });
      
      // Update usage
      await service.updateUserUsage(userId, 500);
      usage = await service.getCurrentUserUsage(userId);
      expect(usage.requests).toBe(1);
      expect(usage.tokens).toBe(500);
      
      // Update again
      await service.updateUserUsage(userId, 200);
      usage = await service.getCurrentUserUsage(userId);
      expect(usage.requests).toBe(2);
      expect(usage.tokens).toBe(700);
    });
  });
});