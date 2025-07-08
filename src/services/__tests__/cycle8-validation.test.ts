/**
 * Basic Validation for Cycle 8: Advanced Performance Optimization
 * Simple instantiation and method testing
 */

import { describe, it, expect, jest } from '@jest/globals';

// Simple mocks
jest.mock('../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    performance: jest.fn()
  }
}));

jest.mock('../../utils/resilience.js', () => ({
  PerformanceMonitor: {
    monitor: jest.fn(async (_operation: string, fn: () => Promise<any>, _context?: object) => {
      return await fn();
    })
  }
}));

describe('Cycle 8: Performance Optimization - Validation', () => {
  it('should be able to import StreamingResponseProcessor', async () => {
    const { default: StreamingResponseProcessor } = await import('../../utils/streaming-processor.js');
    expect(StreamingResponseProcessor).toBeDefined();
    
    const processor = new StreamingResponseProcessor();
    expect(processor).toBeDefined();
    expect(typeof processor.getPerformanceStatistics).toBe('function');
    
    const stats = processor.getPerformanceStatistics();
    expect(stats).toBeDefined();
    expect(typeof stats.totalStreams).toBe('number');
  });

  it('should be able to import RequestBatchProcessor', async () => {
    const { default: RequestBatchProcessor } = await import('../../utils/request-batch-processor.js');
    expect(RequestBatchProcessor).toBeDefined();
    
    const processor = new RequestBatchProcessor();
    expect(processor).toBeDefined();
    expect(typeof processor.getMetrics).toBe('function');
    
    const metrics = processor.getMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics.totalRequests).toBe('number');
    
    await processor.shutdown(1000);
  });

  it('should be able to import AdaptiveRateLimiter', async () => {
    const { default: AdaptiveRateLimiter } = await import('../../utils/adaptive-rate-limiter.js');
    expect(AdaptiveRateLimiter).toBeDefined();
    
    const limiter = new AdaptiveRateLimiter();
    expect(limiter).toBeDefined();
    expect(typeof limiter.checkRateLimit).toBe('function');
    
    const metrics = limiter.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.currentLimits).toBeDefined();
  });

  it('should demonstrate basic functionality integration', async () => {
    const { default: StreamingResponseProcessor } = await import('../../utils/streaming-processor.js');
    const { default: RequestBatchProcessor } = await import('../../utils/request-batch-processor.js');
    const { default: AdaptiveRateLimiter } = await import('../../utils/adaptive-rate-limiter.js');
    
    // Basic instantiation test
    const streaming = new StreamingResponseProcessor();
    const batching = new RequestBatchProcessor();
    const rateLimiting = new AdaptiveRateLimiter();
    
    // Verify they can provide metrics
    const streamStats = streaming.getPerformanceStatistics();
    const batchMetrics = batching.getMetrics();
    const rateLimitMetrics = rateLimiting.getMetrics();
    
    expect(streamStats.totalStreams).toBe(0); // Initially no streams
    expect(batchMetrics.totalRequests).toBe(0); // Initially no requests
    expect(rateLimitMetrics.currentLimits).toBeDefined();
    
    // Cleanup
    streaming.cleanup();
    await batching.shutdown(1000);
    
    // All components initialized and provided metrics successfully
    expect(true).toBe(true);
  });
});
