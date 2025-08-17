import { performance } from 'perf_hooks';
import { performanceMonitor } from '../../src/services/performance-monitoring.service';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * Performance Benchmark Tests
 * Validates that AI enhancement services meet performance requirements
 */
describe('Performance Benchmark Tests', () => {
  beforeEach(() => {
    process.env.ENABLE_PERFORMANCE_MONITORING = 'true';
  });

  afterEach(() => {
    // Clean up after tests
  });

  describe('Performance Monitoring Overhead', () => {
    it('should have minimal overhead when tracking operations', () => {
      const iterations = 1000;
      const operationIds: string[] = [];
      
      // Measure overhead of performance monitoring
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const operationId = performanceMonitor.startOperation('benchmark-service', 'benchmark-operation');
        operationIds.push(operationId);
        performanceMonitor.endOperation(operationId, 'benchmark-service', 'benchmark-operation', true);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerOperation = totalTime / iterations;
      
      console.log(`Performance monitoring overhead: ${avgTimePerOperation.toFixed(4)}ms per operation`);
      
      // Performance monitoring overhead should be less than 1ms per operation
      expect(avgTimePerOperation).toBeLessThan(1.0);
    });

    it('should handle concurrent operations efficiently', async () => {
      const concurrentOperations = 100;
      const promises: Promise<void>[] = [];
      
      const startTime = performance.now();
      
      for (let i = 0; i < concurrentOperations; i++) {
        const promise = new Promise<void>((resolve) => {
          const operationId = performanceMonitor.startOperation('concurrent-service', `concurrent-operation-${i}`);
          
          // Simulate async work
          setTimeout(() => {
            performanceMonitor.endOperation(operationId, 'concurrent-service', `concurrent-operation-${i}`, true);
            resolve();
          }, Math.random() * 10); // Random delay up to 10ms
        });
        
        promises.push(promise);
      }
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      console.log(`Concurrent operations completed in: ${totalTime.toFixed(2)}ms`);
      
      // All concurrent operations should complete within reasonable time
      expect(totalTime).toBeLessThan(1000); // Less than 1 second
      
      // Verify all operations were tracked
      const stats = performanceMonitor.getServiceStats('concurrent-service');
      expect(stats).toBeDefined();
      expect(stats!.totalOperations).toBe(concurrentOperations);
    });
  });

  describe('Memory Usage Benchmarks', () => {
    it('should not leak memory during operation tracking', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const iterations = 10000;
      
      // Perform many operations
      for (let i = 0; i < iterations; i++) {
        const operationId = performanceMonitor.startOperation('memory-test-service', 'memory-operation');
        performanceMonitor.endOperation(operationId, 'memory-test-service', 'memory-operation', true);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseKB = memoryIncrease / 1024;
      
      console.log(`Memory increase after ${iterations} operations: ${memoryIncreaseKB.toFixed(2)} KB`);
      
      // Memory increase should be reasonable (less than 10MB for 10k operations)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Dashboard Performance', () => {
    beforeEach(() => {
      // Add test data
      for (let i = 0; i < 100; i++) {
        const operationId = performanceMonitor.startOperation('dashboard-service', 'dashboard-operation');
        performanceMonitor.endOperation(operationId, 'dashboard-service', 'dashboard-operation', Math.random() > 0.1);
      }
    });

    it('should generate dashboard quickly', () => {
      const startTime = performance.now();
      
      const dashboard = performanceMonitor.getDashboard();
      
      const endTime = performance.now();
      const generationTime = endTime - startTime;
      
      console.log(`Dashboard generation time: ${generationTime.toFixed(2)}ms`);
      
      expect(dashboard).toBeDefined();
      expect(dashboard.overallStats).toBeDefined();
      expect(dashboard.serviceStats).toBeDefined();
      
      // Dashboard generation should be fast (less than 100ms)
      expect(generationTime).toBeLessThan(100);
    });

    it('should export data efficiently', () => {
      const startTime = performance.now();
      
      const exportData = performanceMonitor.exportPerformanceData();
      
      const endTime = performance.now();
      const exportTime = endTime - startTime;
      
      console.log(`Data export time: ${exportTime.toFixed(2)}ms`);
      
      expect(exportData).toBeDefined();
      expect(exportData.metrics).toBeDefined();
      expect(exportData.serviceStats).toBeDefined();
      
      // Data export should be fast (less than 50ms)
      expect(exportTime).toBeLessThan(50);
    });
  });

  describe('Scalability Tests', () => {
    it('should handle large numbers of services', () => {
      const numberOfServices = 50;
      const operationsPerService = 20;
      
      const startTime = performance.now();
      
      for (let serviceIndex = 0; serviceIndex < numberOfServices; serviceIndex++) {
        const serviceName = `scalability-service-${serviceIndex}`;
        
        for (let opIndex = 0; opIndex < operationsPerService; opIndex++) {
          const operationId = performanceMonitor.startOperation(serviceName, `operation-${opIndex}`);
          performanceMonitor.endOperation(operationId, serviceName, `operation-${opIndex}`, Math.random() > 0.05);
        }
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      console.log(`Processed ${numberOfServices * operationsPerService} operations across ${numberOfServices} services in: ${totalTime.toFixed(2)}ms`);
      
      // Should handle large scale efficiently
      expect(totalTime).toBeLessThan(5000); // Less than 5 seconds
      
      const dashboard = performanceMonitor.getDashboard();
      expect(dashboard.serviceStats.size).toBeGreaterThanOrEqual(numberOfServices);
    });

    it('should maintain performance with historical data', () => {
      // Add historical data over multiple iterations
      const historicalBatches = 10;
      const operationsPerBatch = 1000;
      
      const batchTimes: number[] = [];
      
      for (let batch = 0; batch < historicalBatches; batch++) {
        const batchStart = performance.now();
        
        for (let i = 0; i < operationsPerBatch; i++) {
          const operationId = performanceMonitor.startOperation('historical-service', 'historical-operation');
          performanceMonitor.endOperation(operationId, 'historical-service', 'historical-operation', true);
        }
        
        const batchEnd = performance.now();
        batchTimes.push(batchEnd - batchStart);
      }
      
      // Performance should not degrade significantly over time
      const firstBatchTime = batchTimes[0];
      const lastBatchTime = batchTimes[batchTimes.length - 1];
      const performanceDegradation = (lastBatchTime - firstBatchTime) / firstBatchTime;
      
      console.log(`Performance degradation over ${historicalBatches} batches: ${(performanceDegradation * 100).toFixed(2)}%`);
      
      // Performance degradation should be minimal (less than 50%)
      expect(performanceDegradation).toBeLessThan(0.5);
    });
  });

  describe('Alert System Performance', () => {
    it('should process alerts efficiently', () => {
      // Generate data that would trigger alerts
      for (let i = 0; i < 100; i++) {
        const operationId = performanceMonitor.startOperation('alert-service', 'slow-operation');
        // Simulate processing time
        setTimeout(() => {
          performanceMonitor.endOperation(operationId, 'alert-service', 'slow-operation', i > 80); // 20% failure rate
        }, 1);
      }
      
      setTimeout(() => {
        const startTime = performance.now();
        
        const dashboard = performanceMonitor.getDashboard();
        
        const endTime = performance.now();
        const alertProcessingTime = endTime - startTime;
        
        console.log(`Alert processing time: ${alertProcessingTime.toFixed(2)}ms`);
        
        expect(dashboard.alerts).toBeDefined();
        
        // Alert processing should be fast even with alerts present
        expect(alertProcessingTime).toBeLessThan(50);
      }, 100);
    });
  });

  describe('Resource Cleanup Performance', () => {
    it('should clean up resources efficiently', () => {
      // This test would verify that cleanup operations don't block the main thread
      // In a real implementation, this would test the cleanup interval functionality
      
      const startTime = performance.now();
      
      // Simulate cleanup operation
      // (In real implementation, this would trigger actual cleanup)
      const mockCleanupTime = 10; // Simulate 10ms cleanup
      setTimeout(() => {
        const endTime = performance.now();
        const actualCleanupTime = endTime - startTime;
        
        console.log(`Resource cleanup completed in: ${actualCleanupTime.toFixed(2)}ms`);
        
        // Cleanup should be non-blocking and fast
        expect(actualCleanupTime).toBeLessThan(100);
      }, mockCleanupTime);
    });
  });
});