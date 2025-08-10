/**
 * Simple Test Suite for Cycle 8: Advanced Performance Optimization
 * Basic validation of streaming processor, request batching, and adaptive rate limiting
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    monitor: jest.fn(async (operation: string, fn: () => Promise<any>, context?: any) => {
      return await fn();
    })
  }
}));

// Import with debug logging
let StreamingResponseProcessor: any;
let RequestBatchProcessor: any;
let AdaptiveRateLimiter: any;

try {
  const streamingModule = await import('../../utils/streaming-processor.js');
  StreamingResponseProcessor = streamingModule.default;
  console.log('StreamingResponseProcessor imported:', !!StreamingResponseProcessor);
} catch (error) {
  console.error('Failed to import StreamingResponseProcessor:', error);
}

try {
  const batchModule = await import('../../utils/request-batch-processor.js');
  RequestBatchProcessor = batchModule.default;
  console.log('RequestBatchProcessor imported:', !!RequestBatchProcessor);
} catch (error) {
  console.error('Failed to import RequestBatchProcessor:', error);
}

try {
  const rateLimiterModule = await import('../../utils/adaptive-rate-limiter.js');
  AdaptiveRateLimiter = rateLimiterModule.default;
  console.log('AdaptiveRateLimiter imported:', !!AdaptiveRateLimiter);
} catch (error) {
  console.error('Failed to import AdaptiveRateLimiter:', error);
}

describe('Cycle 8: Performance Optimization - Basic Tests', () => {
  describe('StreamingResponseProcessor', () => {
    let processor: any;
    
    beforeEach(() => {
      if (!StreamingResponseProcessor) {
        throw new Error('StreamingResponseProcessor not available');
      }
      processor = new StreamingResponseProcessor();
    });

    afterEach(() => {
      if (processor && typeof processor.cleanup === 'function') {
        processor.cleanup();
      }
    });

    it('should initialize without errors', () => {
      expect(processor).toBeDefined();
      expect(typeof processor.getPerformanceStatistics).toBe('function');
    });

    it('should process simple streaming data', async () => {
      const streamId = 'test-stream';
      
      async function* testGenerator() {
        yield 'hello';
        yield 'world';
      }

      console.log('Processor methods:', Object.getOwnPropertyNames(processor));
      console.log('processStreamingResponse type:', typeof processor.processStreamingResponse);

      const metrics = await processor.processStreamingResponse(streamId, testGenerator());
      
      console.log('Metrics returned:', metrics);
      
      expect(metrics).toBeDefined();
      expect(metrics.totalBytes).toBe(10); // 'hello' + 'world' = 10 chars
      expect(metrics.totalChunks).toBeGreaterThan(0);
      expect(metrics.streamingDuration).toBeGreaterThanOrEqual(0);
    });

    it('should provide performance statistics', () => {
      const stats = processor.getPerformanceStatistics();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalStreams).toBe('number');
      expect(typeof stats.avgThroughput).toBe('number');
      expect(typeof stats.optimalChunkSize).toBe('number');
    });
  });

  describe('RequestBatchProcessor', () => {
    let batchProcessor: any;
    
    beforeEach(() => {
      if (!RequestBatchProcessor) {
        throw new Error('RequestBatchProcessor not available');
      }
      batchProcessor = new RequestBatchProcessor({
        maxBatchSize: 3,
        batchTimeoutMs: 500
      });
    });

    afterEach(async () => {
      if (batchProcessor && typeof batchProcessor.shutdown === 'function') {
        await batchProcessor.shutdown(1000);
      }
    });

    it('should initialize without errors', () => {
      expect(batchProcessor).toBeDefined();
      expect(typeof batchProcessor.getMetrics).toBe('function');
      expect(typeof batchProcessor.getQueueStatus).toBe('function');
    });

    it('should accept and queue requests', async () => {
      let callbackResult: unknown = null;
      
      const requestId = await batchProcessor.addRequest({
        userId: 'test-user',
        priority: 'medium',
        type: 'text',
        data: { prompt: 'test prompt' },
        callback: (result: unknown) => {
          callbackResult = result;
        },
        timeoutMs: 5000,
        maxRetries: 1
      });

      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');
      
      const metrics = batchProcessor.getMetrics();
      expect(metrics.totalRequests).toBe(1);
    });

    it('should provide queue status', () => {
      const status = batchProcessor.getQueueStatus();
      
      expect(status).toBeDefined();
      expect(typeof status.queueSize).toBe('number');
      expect(typeof status.processingBatches).toBe('number');
      expect(typeof status.estimatedProcessingTime).toBe('number');
    });
  });

  describe('AdaptiveRateLimiter', () => {
    let rateLimiter: any;
    
    beforeEach(() => {
      if (!AdaptiveRateLimiter) {
        throw new Error('AdaptiveRateLimiter not available');
      }
      rateLimiter = new AdaptiveRateLimiter({
        global: {
          requestsPerMinute: 10,
          tokensPerMinute: 10000,
          burstLimit: 5,
          adaptiveThrottling: true
        }
      });
    });

    it('should initialize without errors', () => {
      expect(rateLimiter).toBeDefined();
      expect(typeof rateLimiter.checkRateLimit).toBe('function');
      expect(typeof rateLimiter.getMetrics).toBe('function');
    });

    it('should allow requests within limits', async () => {
      console.log('RateLimiter methods:', Object.getOwnPropertyNames(rateLimiter));
      console.log('checkRateLimit type:', typeof rateLimiter.checkRateLimit);

      const result = await rateLimiter.checkRateLimit('test-user', 1000);
      
      console.log('Rate limit result:', result);
      
      expect(result).toBeDefined();
      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
    });

    it('should provide comprehensive metrics', () => {
      const metrics = rateLimiter.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.currentLimits).toBeDefined();
      expect(metrics.globalUsage).toBeDefined();
      expect(metrics.adaptiveMetrics).toBeDefined();
      expect(metrics.connectionMetrics).toBeDefined();
      expect(metrics.recentPerformance).toBeDefined();
    });

    it('should record request completion', () => {
      expect(() => {
        rateLimiter.recordRequestCompletion('test-user', 200, true, 1000);
      }).not.toThrow();
      
      const metrics = rateLimiter.getMetrics();
      expect(metrics.recentPerformance).toBeDefined();
    });
  });

  describe('Integration: Basic Component Coordination', () => {
    let streamingProcessor: any;
    let batchProcessor: any;
    let rateLimiter: any;
    
    beforeEach(() => {
      if (!StreamingResponseProcessor || !RequestBatchProcessor || !AdaptiveRateLimiter) {
        throw new Error('One or more components not available');
      }
      streamingProcessor = new StreamingResponseProcessor();
      batchProcessor = new RequestBatchProcessor({ maxBatchSize: 2 });
      rateLimiter = new AdaptiveRateLimiter({
        global: { requestsPerMinute: 5, tokensPerMinute: 5000, burstLimit: 3, adaptiveThrottling: false }
      });
    });

    afterEach(async () => {
      if (streamingProcessor && typeof streamingProcessor.cleanup === 'function') {
        streamingProcessor.cleanup();
      }
      if (batchProcessor && typeof batchProcessor.shutdown === 'function') {
        await batchProcessor.shutdown(1000);
      }
    });

    it('should coordinate all components without errors', async () => {
      // Test rate limiting
      const rateLimitResult = await rateLimiter.checkRateLimit('integration-user', 500);
      expect(rateLimitResult.allowed).toBe(true);

      // Test streaming
      async function* testStream() {
        yield 'integration';
        yield 'test';
      }

      const streamMetrics = await streamingProcessor.processStreamingResponse(
        'integration-stream',
        testStream()
      );
      expect(streamMetrics.totalBytes).toBeGreaterThan(0);

      // Test batch processing
      let batchResult: unknown = null;
      await batchProcessor.addRequest({
        userId: 'integration-user',
        priority: 'high',
        type: 'text',
        data: { prompt: 'integration test' },
        callback: (result: unknown) => { batchResult = result; },
        timeoutMs: 5000,
        maxRetries: 1
      });

      // All components should work together
      expect(rateLimitResult.allowed).toBe(true);
      expect(streamMetrics.totalBytes).toBeGreaterThan(0);
      expect(batchProcessor.getMetrics().totalRequests).toBe(1);
    });
  });
});
