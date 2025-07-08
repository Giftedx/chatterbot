/**
 * Comprehensive Cache Infrastructure Tests
 * Tests all cache components: CacheService, CacheKeyGenerator, CacheMetrics, CachePolicyManager
 */

import { describe, beforeEach, it, expect } from '@jest/globals';
import { CacheService } from '../cache.service';
import { CacheKeyGenerator, type CacheableContent } from '../../utils/cache-key-generator';
import { CacheMetrics } from '../../utils/cache-metrics';
import { CachePolicyManager } from '../../config/cache-policies';

describe('Cache Infrastructure Tests', () => {
  describe('CacheService', () => {
    let cacheService: CacheService;

    beforeEach(() => {
      cacheService = new CacheService({
        maxSize: 100,
        maxMemory: 50 * 1024 * 1024, // 50MB
        defaultTtl: 300000, // 5 minutes
        enableMetrics: true
      });
    });

    it('should initialize with correct configuration', () => {
      expect(cacheService).toBeDefined();
    });

    it('should store and retrieve cache entries', async () => {
      const key = 'test-key';
      const value = { message: 'Hello World' };

      await cacheService.set(key, value);
      const retrieved = await cacheService.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should handle cache misses gracefully', async () => {
      const result = await cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should respect TTL expiration', async () => {
      const key = 'ttl-test';
      const value = { data: 'expires soon' };

      await cacheService.set(key, value, 100); // 100ms TTL
      
      // Should exist immediately
      let retrieved = await cacheService.get(key);
      expect(retrieved).toEqual(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      retrieved = await cacheService.get(key);
      expect(retrieved).toBeNull();
    });

    it('should implement LRU eviction', async () => {
      // Fill cache to capacity
      for (let i = 0; i < 100; i++) {
        await cacheService.set(`key-${i}`, { value: i });
      }

      // Add one more to trigger eviction
      await cacheService.set('key-new', { value: 'new' });

      // First key should be evicted
      const firstKey = await cacheService.get('key-0');
      expect(firstKey).toBeNull();

      // Last key should still exist
      const lastKey = await cacheService.get('key-new');
      expect(lastKey).toEqual({ value: 'new' });
    });

    it('should delete cache entries', async () => {
      const key = 'delete-test';
      const value = { data: 'to be deleted' };

      await cacheService.set(key, value);
      expect(await cacheService.get(key)).toEqual(value);

      const deleted = await cacheService.delete(key);
      expect(deleted).toBe(true);
      expect(await cacheService.get(key)).toBeNull();
    });

    it('should clear all cache entries', async () => {
      // Add multiple entries
      await cacheService.set('key1', { value: 1 });
      await cacheService.set('key2', { value: 2 });
      await cacheService.set('key3', { value: 3 });

      await cacheService.clear();

      // All should be gone
      expect(await cacheService.get('key1')).toBeNull();
      expect(await cacheService.get('key2')).toBeNull();
      expect(await cacheService.get('key3')).toBeNull();
    });

    it('should track cache statistics', async () => {
      await cacheService.set('key1', { value: 1 });
      await cacheService.get('key1'); // hit
      await cacheService.get('key2'); // miss

      const stats = cacheService.getMetrics();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should handle memory limits', async () => {
      // Create large entries that would exceed memory limit
      const largeValue = 'x'.repeat(10 * 1024 * 1024); // 10MB string
      
      // This should work for first few entries
      await cacheService.set('large1', largeValue);
      await cacheService.set('large2', largeValue);
      
      // Adding more should trigger eviction
      await cacheService.set('large3', largeValue);
      await cacheService.set('large4', largeValue);
      await cacheService.set('large5', largeValue);
      await cacheService.set('large6', largeValue);

      const stats = cacheService.getMetrics();
      expect(stats.evictions).toBeGreaterThan(0);
    });
  });

  describe('CacheKeyGenerator', () => {
    let keyGenerator: CacheKeyGenerator;

    beforeEach(() => {
      keyGenerator = new CacheKeyGenerator();
    });

    it('should generate consistent keys for same content', () => {
      const content: CacheableContent = {
        type: 'text',
        text: 'Hello World'
      };

      const key1 = keyGenerator.generateKey(content);
      const key2 = keyGenerator.generateKey(content);

      expect(key1).toBe(key2);
      expect(key1).toBeTruthy();
    });

    it('should generate different keys for different content', () => {
      const content1: CacheableContent = {
        type: 'text',
        text: 'Hello World'
      };

      const content2: CacheableContent = {
        type: 'text',
        text: 'Goodbye World'
      };

      const key1 = keyGenerator.generateKey(content1);
      const key2 = keyGenerator.generateKey(content2);

      expect(key1).not.toBe(key2);
    });

    it('should handle multimodal content', () => {
      const multimodalContent: CacheableContent = {
        type: 'multimodal',
        text: 'Describe this image',
        images: ['base64imagedata1', 'base64imagedata2']
      };

      const key = keyGenerator.generateKey(multimodalContent);
      expect(key).toBeTruthy();
      expect(key).toContain('multimodal');
    });

    it('should generate text-specific keys', () => {
      const key = keyGenerator.generateTextKey('Simple text message');
      expect(key).toBeTruthy();
      expect(key).toContain('text');
    });

    it('should generate multimodal-specific keys', () => {
      const key = keyGenerator.generateMultimodalKey(
        'Analyze these images',
        ['image1data', 'image2data'],
        { source: 'user' }
      );
      expect(key).toBeTruthy();
      expect(key).toContain('multimodal');
    });

    it('should validate cache keys', () => {
      expect(CacheKeyGenerator.validateKey('valid-key-123')).toBe(true);
      expect(CacheKeyGenerator.validateKey('')).toBe(false);
      expect(CacheKeyGenerator.validateKey('invalid<key>')).toBe(false);
    });

    it('should extract content type from keys', () => {
      const textKey = keyGenerator.generateTextKey('test');
      const multimodalKey = keyGenerator.generateMultimodalKey('test', ['img']);

      expect(CacheKeyGenerator.extractContentType(textKey)).toBe('text');
      expect(CacheKeyGenerator.extractContentType(multimodalKey)).toBe('multimodal');
    });

    it('should handle sensitive fields in context', () => {
      const content: CacheableContent = {
        type: 'text',
        text: 'User message'
      };

      const context1 = {
        userId: 'user123',
        message: 'public info'
      };

      const context2 = {
        userId: 'user456', // Different sensitive field
        message: 'public info' // Same public info
      };

      const key1 = keyGenerator.generateKey(content, context1);
      const key2 = keyGenerator.generateKey(content, context2);

      // Keys should be the same since sensitive fields are filtered
      expect(key1).toBe(key2);
    });
  });

  describe('CacheMetrics', () => {
    let metrics: CacheMetrics;

    beforeEach(() => {
      metrics = new CacheMetrics();
    });

    it('should record cache hits and misses', () => {
      metrics.recordHit(50);
      metrics.recordMiss(100);
      metrics.recordHit(30);

      const snapshot = metrics.takeSnapshot();
      expect(snapshot.hits).toBe(2);
      expect(snapshot.misses).toBe(1);
      expect(snapshot.avgResponseTime).toBeGreaterThan(0);
    });

    it('should record cache operations', () => {
      metrics.recordSet();
      metrics.recordDelete();
      metrics.recordEviction();
      metrics.updateCacheStats(100, 1024);

      const snapshot = metrics.takeSnapshot();
      expect(snapshot.sets).toBe(1);
      expect(snapshot.deletes).toBe(1);
      expect(snapshot.evictions).toBe(1);
      expect(snapshot.size).toBe(100);
      expect(snapshot.memoryUsage).toBe(1024);
    });

    it('should generate performance reports', () => {
      // Record some activity
      for (let i = 0; i < 10; i++) {
        metrics.recordHit(50);
      }
      for (let i = 0; i < 3; i++) {
        metrics.recordMiss(100);
      }
      metrics.updateCacheStats(100, 1024);

      const report = metrics.getPerformanceReport();
      expect(report.hitRate).toBeCloseTo(0.77, 2); // 10/(10+3)
      expect(report.efficiency).toBeGreaterThan(0);
      expect(report.healthScore).toBeGreaterThan(0);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should track metrics trends', () => {
      // Record activity over time
      for (let i = 0; i < 5; i++) {
        metrics.recordHit(50);
        metrics.recordMiss(100);
        metrics.takeSnapshot();
      }

      const trend = metrics.getMetricsTrend(60); // Last 60 minutes
      expect(trend.snapshots.length).toBeGreaterThan(0);
      expect(trend.summary).toBeDefined();
      expect(trend.summary.avgHitRate).toBeCloseTo(0.5, 1);
    });

    it('should export and clear metrics', () => {
      metrics.recordHit();
      metrics.recordMiss();
      
      const exported = metrics.exportMetrics();
      expect(exported.snapshots).toBeDefined();
      expect(exported.summary).toBeDefined();

      metrics.clearMetrics();
      const emptySnapshot = metrics.takeSnapshot();
      expect(emptySnapshot.hits).toBe(0);
      expect(emptySnapshot.misses).toBe(0);
    });
  });

  describe('CachePolicyManager', () => {
    let policyManager: CachePolicyManager;

    beforeEach(() => {
      policyManager = new CachePolicyManager();
    });

    it('should initialize with default policies', () => {
      const policies = policyManager.getAllPolicies();
      expect(policies.length).toBeGreaterThan(0);
      
      const policyNames = policies.map(p => p.name);
      expect(policyNames).toContain('text-response');
      expect(policyNames).toContain('multimodal-response');
    });

    it('should evaluate policies for text content', () => {
      const textContent: CacheableContent = {
        type: 'text',
        text: 'Simple text message'
      };

      const policy = policyManager.evaluatePolicy(textContent);
      expect(policy).toBeDefined();
      expect(policy.ttl).toBeGreaterThan(0);
      expect(policy.priority).toBeGreaterThan(0);
    });

    it('should evaluate policies for multimodal content', () => {
      const multimodalContent: CacheableContent = {
        type: 'multimodal',
        text: 'Describe this image',
        images: ['base64data']
      };

      const policy = policyManager.evaluatePolicy(multimodalContent);
      expect(policy).toBeDefined();
      expect(policy.name).toBe('multimodal-response');
    });

    it('should handle context in policy evaluation', () => {
      const content: CacheableContent = {
        type: 'text',
        text: 'User message'
      };

      const context = {
        userType: 'frequent-user',
        requestCount: 10
      };

      const policy = policyManager.evaluatePolicy(content, context);
      expect(policy).toBeDefined();
    });

    it('should adapt policies based on system load', () => {
      const content: CacheableContent = {
        type: 'text',
        text: 'Test message'
      };

      const highLoadMetrics = {
        cpuUsage: 90,
        memoryUsage: 85,
        cacheHitRate: 0.6,
        requestVolume: 1000
      };

      const policy = policyManager.evaluatePolicy(content, undefined, highLoadMetrics);
      expect(policy).toBeDefined();
      // High load should result in shorter TTL for adaptive policies
    });

    it('should add and retrieve custom policies', () => {
      const customPolicy = {
        name: 'test-policy',
        description: 'Test policy',
        ttl: 60000,
        priority: 7,
        adaptive: true,
        conditions: [{
          type: 'content-type' as const,
          operator: 'equals' as const,
          value: 'text',
          weight: 1.0
        }]
      };

      policyManager.addPolicy(customPolicy);
      const policies = policyManager.getAllPolicies();
      expect(policies.some(p => p.name === 'test-policy')).toBe(true);
    });

    it('should create custom policies', () => {
      const policy = policyManager.createCustomPolicy('custom-text', 'text', 15, 8);
      expect(policy.name).toBe('custom-text');
      expect(policy.ttl).toBe(15 * 60 * 1000); // 15 minutes in ms
      expect(policy.priority).toBe(8);
    });

    it('should handle edge cases gracefully', () => {
      const unusualContent: CacheableContent = {
        type: 'text',
        text: ''
      };

      const policy = policyManager.evaluatePolicy(unusualContent);
      expect(policy).toBeDefined();
      expect(policy.name).toBeDefined();
    });

    it('should analyze policy effectiveness', () => {
      const analysis = policyManager.analyzePolicyEffectiveness('text-response', 0.8, 50);
      expect(analysis.effectiveness).toBeGreaterThan(0);
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    let cacheService: CacheService;
    let keyGenerator: CacheKeyGenerator;
    let metrics: CacheMetrics;
    let policyManager: CachePolicyManager;

    beforeEach(() => {
      cacheService = new CacheService({
        maxSize: 100,
        maxMemory: 50 * 1024 * 1024,
        defaultTtl: 300000,
        enableMetrics: true
      });
      keyGenerator = new CacheKeyGenerator();
      metrics = new CacheMetrics();
      policyManager = new CachePolicyManager();
    });

    it('should work together for complete caching workflow', async () => {
      const content: CacheableContent = {
        type: 'text',
        text: 'Integration test message'
      };

      // Generate cache key
      const key = keyGenerator.generateKey(content);
      expect(key).toBeTruthy();

      // Get policy for content
      const policy = policyManager.evaluatePolicy(content);
      expect(policy).toBeDefined();

      // Store in cache with policy TTL
      await cacheService.set(key, { response: 'Cached response' }, policy.ttl);

      // Retrieve from cache
      const cached = await cacheService.get(key);
      expect(cached).toEqual({ response: 'Cached response' });

      // Record metrics
      metrics.recordHit(25);
      metrics.recordSet();

      const report = metrics.getPerformanceReport();
      expect(report.hitRate).toBeGreaterThan(0);
    });

    it('should handle multimodal content workflow', async () => {
      const multimodalContent: CacheableContent = {
        type: 'multimodal',
        text: 'Analyze this image',
        images: ['base64imagedata']
      };

      const key = keyGenerator.generateKey(multimodalContent);
      const policy = policyManager.evaluatePolicy(multimodalContent);

      await cacheService.set(key, { 
        analysis: 'Image shows a landscape',
        confidence: 0.95 
      }, policy.ttl);

      const result = await cacheService.get(key);
      expect(result).toBeDefined();
      expect((result as any)?.analysis).toBe('Image shows a landscape');
    });

    it('should handle cache eviction with metrics tracking', async () => {
      // Fill cache beyond capacity
      for (let i = 0; i < 150; i++) {
        const content: CacheableContent = {
          type: 'text',
          text: `Message ${i}`
        };
        
        const key = keyGenerator.generateKey(content);
        await cacheService.set(key, { response: `Response ${i}` });
        
        if (i % 10 === 0) {
          metrics.recordSet();
        }
      }

      // Check that evictions occurred
      const stats = cacheService.getMetrics();
      expect(stats.evictions).toBeGreaterThan(0);

      // Record eviction metrics
      metrics.recordEviction();
      const report = metrics.getPerformanceReport();
      expect(report.evictionRate).toBeGreaterThan(0);
    });

    it('should adapt caching strategy based on performance', async () => {
      // Simulate poor performance scenario
      for (let i = 0; i < 50; i++) {
        metrics.recordMiss(200); // High response times
      }
      metrics.updateCacheStats(1000, 50 * 1024 * 1024); // High memory usage

      const report = metrics.getPerformanceReport();
      expect(report.healthScore).toBeLessThan(50);
      expect(report.recommendations.length).toBeGreaterThan(0);

      // Policy manager should adapt to poor performance
      const content: CacheableContent = {
        type: 'text',
        text: 'Test message'
      };

      const systemLoad = {
        cpuUsage: 90,
        memoryUsage: 85,
        cacheHitRate: 0.1, // Poor hit rate
        requestVolume: 500
      };

      const policy = policyManager.evaluatePolicy(content, undefined, systemLoad);
      expect(policy).toBeDefined();
      // Should select appropriate policy for high load
    });

    it('should handle error scenarios gracefully', async () => {
      // Test with invalid key
      const invalidResult = await cacheService.get('');
      expect(invalidResult).toBeNull();

      // Test with extremely large content
      const largeContent: CacheableContent = {
        type: 'text',
        text: 'x'.repeat(1000000) // 1MB string
      };

      const key = keyGenerator.generateKey(largeContent);
      expect(key).toBeTruthy();
      expect(key.length).toBeLessThan(500); // Key should be normalized

      // Policy should handle large content
      const policy = policyManager.evaluatePolicy(largeContent);
      expect(policy).toBeDefined();
    });
  });
});
