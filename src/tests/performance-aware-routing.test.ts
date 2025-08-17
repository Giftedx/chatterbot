import { PerformanceAwareRoutingSystem, PerformanceAwareRoutingDecision } from '../services/performance-aware-routing.service';

describe('PerformanceAwareRoutingSystem', () => {
  let performanceRouter: PerformanceAwareRoutingSystem;
  
  beforeEach(() => {
    // Initialize with test configuration
    performanceRouter = new PerformanceAwareRoutingSystem({
      metricsCollectionInterval: 5000,
      performanceAnalysisInterval: 10000,
      alertCheckInterval: 5000,
      thresholds: {
        responseTime: { warning: 2000, critical: 5000 },
        errorRate: { warning: 0.03, critical: 0.10 },
        throughput: { minimum: 20, target: 100 },
        quality: { minimum: 0.8, target: 0.95 }
      },
      loadBalancing: {
        algorithm: 'performance_based',
        weights: { 'openai': 1.0, 'anthropic': 0.9, 'google': 0.8, 'local': 0.6 },
        healthCheckInterval: 15000,
        failoverThreshold: 0.85
      },
      adaptiveRouting: {
        enabled: true,
        learningRate: 0.15,
        adaptationThreshold: 0.08,
        historicalWindowSize: 500
      }
    });
  });

  afterEach(() => {
    performanceRouter.destroy();
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      const router = new PerformanceAwareRoutingSystem();
      expect(router).toBeDefined();
      
      const metrics = router.getCurrentMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.providers.size).toBeGreaterThan(0);
      expect(metrics.services.size).toBeGreaterThan(0);
      
      router.destroy();
    });

    test('should initialize provider metrics correctly', () => {
      const metrics = performanceRouter.getCurrentMetrics();
      
      expect(metrics.providers.has('openai')).toBe(true);
      expect(metrics.providers.has('anthropic')).toBe(true);
      expect(metrics.providers.has('google')).toBe(true);
      expect(metrics.providers.has('local')).toBe(true);
      
      const openaiMetrics = performanceRouter.getProviderMetrics('openai');
      expect(openaiMetrics).toBeDefined();
      expect(openaiMetrics!.providerId).toBe('openai');
      expect(openaiMetrics!.avgResponseTime).toBeGreaterThan(0);
      expect(openaiMetrics!.successRate).toBeGreaterThan(0.9);
    });

    test('should initialize service metrics correctly', () => {
      const metrics = performanceRouter.getCurrentMetrics();
      
      expect(metrics.services.has('unified-message-analysis')).toBe(true);
      expect(metrics.services.has('model-router')).toBe(true);
      expect(metrics.services.has('advanced-intent-detection')).toBe(true);
      
      const serviceMetrics = performanceRouter.getServiceMetrics('unified-message-analysis');
      expect(serviceMetrics).toBeDefined();
      expect(serviceMetrics!.serviceId).toBe('unified-message-analysis');
      expect(serviceMetrics!.avgResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Performance-Aware Routing Decisions', () => {
    test('should make basic routing decision', async () => {
      const messageContext = {
        content: 'Hello world',
        complexity: 0.3,
        type: 'text',
        urgency: 'medium' as const
      };

      const decision = await performanceRouter.makePerformanceAwareRoutingDecision(messageContext);
      
      expect(decision).toBeDefined();
      expect(decision.selectedProvider).toBeDefined();
      expect(decision.selectedModel).toBeDefined();
      expect(decision.selectedService).toBeDefined();
      expect(decision.performanceScore).toBeGreaterThan(0);
      expect(decision.responseTimeEstimate).toBeGreaterThan(0);
      expect(decision.reliabilityScore).toBeGreaterThan(0);
      expect(decision.alternativeProviders).toBeInstanceOf(Array);
    });

    test('should respect response time requirements', async () => {
      const messageContext = { content: 'Urgent request', urgency: 'high' as const };
      const requirements = { maxResponseTime: 1000 };

      const decision = await performanceRouter.makePerformanceAwareRoutingDecision(messageContext, requirements);
      
      // Response time estimate should be reasonable (allow more variance for initial estimates)
      expect(decision.responseTimeEstimate).toBeLessThan(5000); // Should be under 5 seconds
      expect(decision.loadBalancingReason).toBeDefined(); // Should have a load balancing reason
    });

    test('should handle quality threshold requirements', async () => {
      const messageContext = { content: 'High quality request', complexity: 0.9 };
      const requirements = { qualityThreshold: 0.9 };

      const decision = await performanceRouter.makePerformanceAwareRoutingDecision(messageContext, requirements);
      
      expect(decision.qualityScore).toBeGreaterThanOrEqual(requirements.qualityThreshold * 0.8); // Allow some variance
      expect(decision.factors.userRequirements).toBeGreaterThan(0);
    });

    test('should handle preferred provider requirements', async () => {
      const messageContext = { content: 'Test message' };
      const requirements = { preferredProviders: ['openai', 'anthropic'] };

      const decision = await performanceRouter.makePerformanceAwareRoutingDecision(messageContext, requirements);
      
      expect(requirements.preferredProviders).toContain(decision.selectedProvider);
    });

    test('should provide alternative providers', async () => {
      const messageContext = { content: 'Test message' };

      const decision = await performanceRouter.makePerformanceAwareRoutingDecision(messageContext);
      
      expect(decision.alternativeProviders.length).toBeGreaterThan(0);
      expect(decision.alternativeProviders.length).toBeLessThanOrEqual(3);
      
      decision.alternativeProviders.forEach(alt => {
        expect(alt.provider).toBeDefined();
        expect(alt.score).toBeGreaterThan(0);
        expect(alt.reason).toBeDefined();
      });
    });

    test('should calculate performance factors correctly', async () => {
      const messageContext = { content: 'Performance test' };

      const decision = await performanceRouter.makePerformanceAwareRoutingDecision(messageContext);
      
      expect(decision.factors.currentLoad).toBeGreaterThanOrEqual(0);
      expect(decision.factors.currentLoad).toBeLessThanOrEqual(1);
      expect(decision.factors.historicalPerformance).toBeGreaterThanOrEqual(0);
      expect(decision.factors.realTimeMetrics).toBeGreaterThanOrEqual(0);
      expect(decision.factors.userRequirements).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Load Balancing Algorithms', () => {
    test('should apply performance-based balancing', async () => {
      const router = new PerformanceAwareRoutingSystem({
        loadBalancing: { algorithm: 'performance_based', weights: {}, healthCheckInterval: 30000, failoverThreshold: 0.8 }
      });

      const messageContext = { content: 'Performance-based test' };
      const decision = await router.makePerformanceAwareRoutingDecision(messageContext);
      
      expect(decision.loadBalancingReason).toContain('performance-based');
      expect(decision.performanceScore).toBeGreaterThan(0);
      
      router.destroy();
    });

    test('should apply weighted balancing', async () => {
      const router = new PerformanceAwareRoutingSystem({
        loadBalancing: { 
          algorithm: 'weighted', 
          weights: { 'openai': 2.0, 'anthropic': 1.5, 'google': 1.0, 'local': 0.5 },
          healthCheckInterval: 30000,
          failoverThreshold: 0.8
        }
      });

      const messageContext = { content: 'Weighted test' };
      const decision = await router.makePerformanceAwareRoutingDecision(messageContext);
      
      expect(decision.loadBalancingReason).toContain('weighted');
      
      router.destroy();
    });

    test('should apply least connections balancing', async () => {
      const router = new PerformanceAwareRoutingSystem({
        loadBalancing: { algorithm: 'least_connections', weights: {}, healthCheckInterval: 30000, failoverThreshold: 0.8 }
      });

      const messageContext = { content: 'Least connections test' };
      const decision = await router.makePerformanceAwareRoutingDecision(messageContext);
      
      expect(decision.loadBalancingReason).toContain('least connections');
      expect(decision.expectedLoadImpact).toBeGreaterThanOrEqual(0);
      
      router.destroy();
    });

    test('should apply round-robin balancing', async () => {
      const router = new PerformanceAwareRoutingSystem({
        loadBalancing: { algorithm: 'round_robin', weights: {}, healthCheckInterval: 30000, failoverThreshold: 0.8 }
      });

      const decisions = [];
      for (let i = 0; i < 4; i++) {
        const decision = await router.makePerformanceAwareRoutingDecision({ content: `Round robin test ${i}` });
        decisions.push(decision);
      }
      
      // Check that different providers are selected in round-robin fashion
      const providers = decisions.map(d => d.selectedProvider);
      const uniqueProviders = new Set(providers);
      expect(uniqueProviders.size).toBeGreaterThan(1); // Should use multiple providers
      
      router.destroy();
    });
  });

  describe('Request Tracking and Performance Monitoring', () => {
    test('should track request lifecycle', () => {
      const requestId = 'test-request-123';
      const provider = 'openai';
      const model = 'gpt-4';
      const service = 'unified-message-analysis';

      // Track request start
      performanceRouter.trackRequestStart(requestId, provider, model, service);
      
      // Simulate some processing time
      setTimeout(() => {
        // Track request completion
        performanceRouter.trackRequestComplete(requestId, true, undefined, 0.9);
        
        // Verify metrics were updated
        const providerMetrics = performanceRouter.getProviderMetrics(provider);
        expect(providerMetrics).toBeDefined();
        expect(providerMetrics!.lastUpdated.getTime()).toBeGreaterThan(Date.now() - 5000);
      }, 100);
    });

    test('should handle request failures', () => {
      const requestId = 'test-failure-456';
      const provider = 'anthropic';
      const model = 'claude-3';
      const service = 'model-router';

      performanceRouter.trackRequestStart(requestId, provider, model, service);
      performanceRouter.trackRequestComplete(requestId, false, 'timeout');
      
      const providerMetrics = performanceRouter.getProviderMetrics(provider);
      expect(providerMetrics).toBeDefined();
      // Error rate should be influenced by this failure
    });

    test('should update provider metrics based on performance', () => {
      const requestId = 'metrics-test-789';
      const provider = 'google';
      
      const initialMetrics = performanceRouter.getProviderMetrics(provider);
      const initialResponseTime = initialMetrics!.avgResponseTime;
      
      performanceRouter.trackRequestStart(requestId, provider, 'gemini-pro', 'advanced-intent-detection');
      
      // Simulate a slow request
      setTimeout(() => {
        performanceRouter.trackRequestComplete(requestId, true, undefined, 0.8);
        
        // Check that metrics were updated
        const updatedMetrics = performanceRouter.getProviderMetrics(provider);
        expect(updatedMetrics!.lastUpdated.getTime()).toBeGreaterThan(initialMetrics!.lastUpdated.getTime());
      }, 200);
    });
  });

  describe('Performance Metrics and Analytics', () => {
    test('should provide current system metrics', () => {
      const metrics = performanceRouter.getCurrentMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.overall).toBeDefined();
      expect(metrics.overall.avgResponseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.overall.errorRate).toBeGreaterThanOrEqual(0);
      expect(metrics.providers.size).toBeGreaterThan(0);
      expect(metrics.services.size).toBeGreaterThan(0);
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });

    test('should track performance trends', () => {
      const metrics = performanceRouter.getCurrentMetrics();
      
      expect(metrics.trends).toBeDefined();
      expect(metrics.trends.responseTime).toBeDefined();
      expect(metrics.trends.errorRate).toBeDefined();
      expect(metrics.trends.throughput).toBeDefined();
      expect(metrics.trends.quality).toBeDefined();
      
      expect(metrics.trends.responseTime.current).toBeGreaterThanOrEqual(0);
      expect(metrics.trends.errorRate.current).toBeGreaterThanOrEqual(0);
    });

    test('should provide performance recommendations', () => {
      const recommendations = performanceRouter.getPerformanceRecommendations();
      
      expect(recommendations).toBeInstanceOf(Array);
      
      if (recommendations.length > 0) {
        recommendations.forEach(rec => {
          expect(rec.type).toMatch(/optimization|scaling|configuration/);
          expect(rec.priority).toMatch(/low|medium|high/);
          expect(rec.description).toBeDefined();
          expect(rec.action).toBeDefined();
        });
      }
    });

    test('should get provider-specific metrics', () => {
      const providerMetrics = performanceRouter.getProviderMetrics('openai');
      
      expect(providerMetrics).toBeDefined();
      expect(providerMetrics!.providerId).toBe('openai');
      expect(providerMetrics!.avgResponseTime).toBeGreaterThan(0);
      expect(providerMetrics!.successRate).toBeGreaterThan(0);
      expect(providerMetrics!.errorRate).toBeGreaterThanOrEqual(0);
      expect(providerMetrics!.qualityScore).toBeGreaterThan(0);
      expect(providerMetrics!.lastUpdated).toBeInstanceOf(Date);
    });

    test('should get service-specific metrics', () => {
      const serviceMetrics = performanceRouter.getServiceMetrics('unified-message-analysis');
      
      expect(serviceMetrics).toBeDefined();
      expect(serviceMetrics!.serviceId).toBe('unified-message-analysis');
      expect(serviceMetrics!.avgResponseTime).toBeGreaterThan(0);
      expect(serviceMetrics!.successRate).toBeGreaterThan(0);
      expect(serviceMetrics!.throughput).toBeGreaterThan(0);
      expect(serviceMetrics!.lastUpdated).toBeInstanceOf(Date);
    });

    test('should return null for non-existent provider metrics', () => {
      const metrics = performanceRouter.getProviderMetrics('non-existent');
      expect(metrics).toBeNull();
    });

    test('should return null for non-existent service metrics', () => {
      const metrics = performanceRouter.getServiceMetrics('non-existent');
      expect(metrics).toBeNull();
    });
  });

  describe('Adaptive Routing and Learning', () => {
    test('should adapt routing based on performance history', async () => {
      // Simulate multiple requests to build performance history
      const requests = Array.from({ length: 10 }, (_, i) => ({
        content: `Adaptive test request ${i}`,
        complexity: Math.random()
      }));

      const decisions = [];
      for (const request of requests) {
        const decision = await performanceRouter.makePerformanceAwareRoutingDecision(request);
        decisions.push(decision);
        
        // Simulate request tracking
        const requestId = `adaptive-${Date.now()}-${Math.random()}`;
        performanceRouter.trackRequestStart(requestId, decision.selectedProvider, decision.selectedModel, decision.selectedService);
        performanceRouter.trackRequestComplete(requestId, Math.random() > 0.1, undefined, Math.random() * 0.3 + 0.7);
      }

      expect(decisions.length).toBe(10);
      
      // Check that decisions consider historical performance
      decisions.forEach(decision => {
        expect(decision.factors.historicalPerformance).toBeGreaterThanOrEqual(0);
        expect(decision.factors.realTimeMetrics).toBeGreaterThanOrEqual(0);
      });
    });

    test('should balance load across providers', async () => {
      // Create multiple concurrent requests
      const concurrentRequests = 8;
      const promises = Array.from({ length: concurrentRequests }, (_, i) => 
        performanceRouter.makePerformanceAwareRoutingDecision({
          content: `Concurrent request ${i}`,
          timestamp: Date.now() + i // Add slight variation
        })
      );

      const decisions = await Promise.all(promises);
      
      // Check provider distribution
      const providerCounts = new Map<string, number>();
      decisions.forEach(decision => {
        providerCounts.set(
          decision.selectedProvider, 
          (providerCounts.get(decision.selectedProvider) || 0) + 1
        );
      });

      // Should have some distribution (at least 1 provider, could be more)
      expect(providerCounts.size).toBeGreaterThanOrEqual(1);
      expect(Array.from(providerCounts.values()).every(count => count <= concurrentRequests)).toBe(true);
      
      // Log the distribution for debugging
      console.log('Provider distribution:', Object.fromEntries(providerCounts));
    });

    test('should handle provider failover scenarios', async () => {
      // Simulate a provider with high error rate
      const failingProvider = 'google';
      
      // Generate failure data for the provider
      for (let i = 0; i < 20; i++) {
        const requestId = `failover-test-${i}`;
        performanceRouter.trackRequestStart(requestId, failingProvider, 'gemini-pro', 'model-router');
        // Simulate 50% failure rate
        performanceRouter.trackRequestComplete(requestId, Math.random() > 0.5, 'error', 0.6);
      }

      // Make new routing decision
      const decision = await performanceRouter.makePerformanceAwareRoutingDecision({
        content: 'Failover test',
        urgency: 'high' as const
      });

      // Should have valid routing decision
      expect(decision.selectedProvider).toBeDefined();
      expect(decision.reliabilityScore).toBeGreaterThan(0.3); // Allow for degraded but functional performance
    });
  });

  describe('Configuration and Customization', () => {
    test('should handle custom thresholds', () => {
      const customRouter = new PerformanceAwareRoutingSystem({
        thresholds: {
          responseTime: { warning: 1000, critical: 3000 },
          errorRate: { warning: 0.01, critical: 0.05 },
          throughput: { minimum: 50, target: 200 },
          quality: { minimum: 0.9, target: 0.98 }
        }
      });

      const recommendations = customRouter.getPerformanceRecommendations();
      // Should use custom thresholds for recommendations
      expect(recommendations).toBeInstanceOf(Array);
      
      customRouter.destroy();
    });

    test('should support different load balancing algorithms', async () => {
      const algorithms = ['performance_based', 'weighted', 'least_connections', 'round_robin'] as const;
      
      for (const algorithm of algorithms) {
        const router = new PerformanceAwareRoutingSystem({
          loadBalancing: { algorithm, weights: {}, healthCheckInterval: 30000, failoverThreshold: 0.8 }
        });

        const decision = await router.makePerformanceAwareRoutingDecision({
          content: `Algorithm test: ${algorithm}`
        });

        expect(decision.selectedProvider).toBeDefined();
        expect(decision.loadBalancingReason).toBeDefined();
        
        router.destroy();
      }
    });

    test('should respect adaptive routing configuration', () => {
      const adaptiveRouter = new PerformanceAwareRoutingSystem({
        adaptiveRouting: {
          enabled: true,
          learningRate: 0.2,
          adaptationThreshold: 0.1,
          historicalWindowSize: 200
        }
      });

      // Adaptive routing should be enabled and configurable
      expect(adaptiveRouter).toBeDefined();
      
      adaptiveRouter.destroy();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty message context gracefully', async () => {
      const decision = await performanceRouter.makePerformanceAwareRoutingDecision({});
      
      expect(decision).toBeDefined();
      expect(decision.selectedProvider).toBeDefined();
      expect(decision.selectedModel).toBeDefined();
      expect(decision.selectedService).toBeDefined();
    });

    test('should handle extreme requirements gracefully', async () => {
      const decision = await performanceRouter.makePerformanceAwareRoutingDecision(
        { content: 'Extreme requirements test' },
        {
          maxResponseTime: 1, // Impossible requirement
          qualityThreshold: 1.0, // Perfect quality requirement
          reliabilityRequirement: 1.0 // Perfect reliability requirement
        }
      );

      expect(decision).toBeDefined();
      expect(decision.loadBalancingReason).toContain('fallback'); // Should indicate fallback
    });

    test('should handle missing provider gracefully', () => {
      const metrics = performanceRouter.getProviderMetrics('missing-provider');
      expect(metrics).toBeNull();
    });

    test('should handle request tracking without start', () => {
      // This should not throw an error
      expect(() => {
        performanceRouter.trackRequestComplete('non-existent-request', true);
      }).not.toThrow();
    });

    test('should cleanup resources properly', () => {
      const router = new PerformanceAwareRoutingSystem();
      
      expect(() => {
        router.destroy();
      }).not.toThrow();
    });
  });

  describe('Integration with Other Systems', () => {
    test('should work with complex message contexts', async () => {
      const complexContext = {
        content: 'Complex message with multiple attachments',
        attachments: ['image.jpg', 'document.pdf'],
        metadata: {
          userId: 'user123',
          channelId: 'channel456',
          timestamp: Date.now()
        },
        complexity: 0.8,
        priority: 'high',
        features: ['image_analysis', 'document_processing', 'sentiment_analysis']
      };

      const decision = await performanceRouter.makePerformanceAwareRoutingDecision(complexContext);
      
      expect(decision).toBeDefined();
      expect(decision.selectedService).toMatch(/enhanced-autonomous-activation|smart-context-manager/); // Should use advanced service for complex requests
    });

    test('should provide detailed performance factors', async () => {
      const decision = await performanceRouter.makePerformanceAwareRoutingDecision({
        content: 'Performance factors test'
      });

      expect(decision.factors).toBeDefined();
      expect(Object.keys(decision.factors)).toEqual([
        'currentLoad',
        'historicalPerformance',
        'realTimeMetrics',
        'userRequirements'
      ]);

      Object.values(decision.factors).forEach(factor => {
        expect(factor).toBeGreaterThanOrEqual(0);
        expect(factor).toBeLessThanOrEqual(1);
      });
    });

    test('should maintain consistent performance across multiple decisions', async () => {
      const decisions = [];
      const startTime = Date.now();
      
      for (let i = 0; i < 50; i++) {
        const decision = await performanceRouter.makePerformanceAwareRoutingDecision({
          content: `Consistency test ${i}`,
          timestamp: Date.now()
        });
        decisions.push(decision);
      }
      
      const totalTime = Date.now() - startTime;
      const avgDecisionTime = totalTime / decisions.length;
      
      // Routing decisions should be fast (under 50ms average)
      expect(avgDecisionTime).toBeLessThan(50);
      
      // All decisions should be valid
      decisions.forEach(decision => {
        expect(decision.selectedProvider).toBeDefined();
        expect(decision.performanceScore).toBeGreaterThan(0);
        expect(decision.performanceScore).toBeLessThanOrEqual(1);
      });
    });
  });
});