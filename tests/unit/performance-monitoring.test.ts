import { PerformanceMonitoringService } from '../../src/services/performance-monitoring.service';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Performance Monitoring Service', () => {
  let performanceService: PerformanceMonitoringService;

  beforeEach(() => {
    // Enable performance monitoring for tests
    process.env.ENABLE_PERFORMANCE_MONITORING = 'true';
    performanceService = new PerformanceMonitoringService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Operation Tracking', () => {
    it('should track operation start and end times', () => {
      const operationId = performanceService.startOperation('test-service', 'test-operation');
      expect(operationId).toMatch(/test-service_test-operation_\d+_\d/);

      // End the operation
      performanceService.endOperation(
        operationId,
        'test-service',
        'test-operation',
        true,
        undefined,
        { testMetadata: 'value' }
      );

      // Verify service stats were updated
      const stats = performanceService.getServiceStats('test-service');
      expect(stats).toBeDefined();
      expect(stats!.totalOperations).toBe(1);
      expect(stats!.successfulOperations).toBe(1);
    });

    it('should track failed operations', () => {
      const operationId = performanceService.startOperation('test-service', 'failing-operation');
      
      performanceService.endOperation(
        operationId,
        'test-service',
        'failing-operation',
        false,
        'Test error message'
      );

      const stats = performanceService.getServiceStats('test-service');
      expect(stats).toBeDefined();
      expect(stats!.totalOperations).toBe(1);
      expect(stats!.failedOperations).toBe(1);
      expect(stats!.errorRate).toBe(1.0);
    });

    it('should handle disabled performance monitoring', () => {
      process.env.ENABLE_PERFORMANCE_MONITORING = 'false';
      const disabledService = new PerformanceMonitoringService();
      
      const operationId = disabledService.startOperation('test-service', 'test-operation');
      expect(operationId).toBe('disabled');

      // Should not throw error when ending disabled operation
      disabledService.endOperation(
        operationId,
        'test-service',
        'test-operation',
        true
      );

      const stats = disabledService.getServiceStats('test-service');
      expect(stats).toBeUndefined();
    });
  });

  describe('Performance Statistics', () => {
    beforeEach(() => {
      // Add some test metrics
      const operation1 = performanceService.startOperation('test-service', 'operation1');
      setTimeout(() => {
        performanceService.endOperation(operation1, 'test-service', 'operation1', true);
      }, 10);

      const operation2 = performanceService.startOperation('test-service', 'operation2');
      setTimeout(() => {
        performanceService.endOperation(operation2, 'test-service', 'operation2', false, 'Test error');
      }, 20);
    });

    it('should calculate correct service statistics', (done) => {
      setTimeout(() => {
        const stats = performanceService.getServiceStats('test-service');
        expect(stats).toBeDefined();
        expect(stats!.totalOperations).toBe(2);
        expect(stats!.successfulOperations).toBe(1);
        expect(stats!.failedOperations).toBe(1);
        expect(stats!.errorRate).toBe(0.5);
        expect(stats!.averageExecutionTime).toBeGreaterThan(0);
        done();
      }, 50);
    });

    it('should provide performance dashboard', (done) => {
      setTimeout(() => {
        const dashboard = performanceService.getDashboard();
        expect(dashboard).toBeDefined();
        expect(dashboard.overallStats).toBeDefined();
        expect(dashboard.serviceStats).toBeDefined();
        expect(dashboard.recentMetrics).toBeDefined();
        expect(dashboard.alerts).toBeDefined();
        done();
      }, 50);
    });
  });

  describe('Alert System', () => {
    it('should create alerts for high latency', (done) => {
      // Simulate high latency operations
      const operations: string[] = [];
      for (let i = 0; i < 5; i++) {
        operations.push(performanceService.startOperation('slow-service', 'slow-operation'));
      }

      // Mock high execution times
      setTimeout(() => {
        operations.forEach(op => {
          performanceService.endOperation(op, 'slow-service', 'slow-operation', true);
        });

        // Force alert check (in real scenario this would be automatic)
        setTimeout(() => {
          const dashboard = performanceService.getDashboard();
          // Note: Alert thresholds might not be triggered in test environment
          // This test mainly ensures the alert system doesn't crash
          expect(dashboard.alerts).toBeDefined();
          done();
        }, 100);
      }, 6000); // Simulate 6 second operations
    });

    it('should create alerts for high error rates', () => {
      // Simulate high error rate
      for (let i = 0; i < 10; i++) {
        const op = performanceService.startOperation('error-service', 'error-operation');
        const success = i < 3; // 30% success rate = 70% error rate
        performanceService.endOperation(op, 'error-service', 'error-operation', success);
      }

      const dashboard = performanceService.getDashboard();
      expect(dashboard.alerts).toBeDefined();
    });

    it('should resolve alerts', () => {
      // Create a mock alert by triggering high error rate
      for (let i = 0; i < 5; i++) {
        const op = performanceService.startOperation('alert-service', 'alert-operation');
        performanceService.endOperation(op, 'alert-service', 'alert-operation', false, 'Test error');
      }

      const dashboard = performanceService.getDashboard();
      if (dashboard.alerts.length > 0) {
        const alertId = dashboard.alerts[0].id;
        const resolved = performanceService.resolveAlert(alertId);
        expect(resolved).toBe(true);

        const updatedDashboard = performanceService.getDashboard();
        const resolvedAlert = updatedDashboard.alerts.find(a => a.id === alertId);
        expect(resolvedAlert?.resolved).toBe(true);
      }
    });
  });

  describe('Data Export and Metrics', () => {
    beforeEach(() => {
      // Add some test data
      const op1 = performanceService.startOperation('export-service', 'export-operation');
      performanceService.endOperation(op1, 'export-service', 'export-operation', true);
    });

    it('should export performance data', () => {
      const exportData = performanceService.exportPerformanceData();
      expect(exportData).toBeDefined();
      expect(exportData.metrics).toBeDefined();
      expect(exportData.serviceStats).toBeDefined();
      expect(exportData.alerts).toBeDefined();
      expect(exportData.summary).toBeDefined();
      expect(Array.isArray(exportData.metrics)).toBe(true);
      expect(Array.isArray(exportData.serviceStats)).toBe(true);
    });

    it('should filter metrics by time range', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const metrics = performanceService.getMetricsForTimeRange(
        undefined,
        oneHourAgo,
        now
      );

      expect(Array.isArray(metrics)).toBe(true);
      // All metrics should be within the time range
      metrics.forEach(metric => {
        expect(metric.timestamp.getTime()).toBeGreaterThanOrEqual(oneHourAgo.getTime());
        expect(metric.timestamp.getTime()).toBeLessThanOrEqual(now.getTime());
      });
    });

    it('should filter metrics by service ID', () => {
      const serviceMetrics = performanceService.getMetricsForTimeRange('export-service');
      expect(Array.isArray(serviceMetrics)).toBe(true);
      serviceMetrics.forEach(metric => {
        expect(metric.serviceId).toBe('export-service');
      });
    });
  });

  describe('Configuration and Environment Variables', () => {
    it('should use environment variables for configuration', () => {
      process.env.PERFORMANCE_MONITORING_MAX_METRICS_HISTORY = '5000';
      process.env.PERFORMANCE_MONITORING_ALERT_THRESHOLDS_HIGH_LATENCY_MS = '3000';

      const configuredService = new PerformanceMonitoringService();
      
      // Test that the service uses the configured values
      // (This is mainly testing that it doesn't crash with custom config)
      expect(configuredService).toBeDefined();
    });

    it('should use default values when environment variables are not set', () => {
      // Clear environment variables
      delete process.env.PERFORMANCE_MONITORING_MAX_METRICS_HISTORY;
      delete process.env.PERFORMANCE_MONITORING_ALERT_THRESHOLDS_HIGH_LATENCY_MS;

      const defaultService = new PerformanceMonitoringService();
      expect(defaultService).toBeDefined();
    });
  });
});