import { performance } from 'perf_hooks';
import { logger } from '../utils/logger.js';

export interface PerformanceMetric {
  serviceId: string;
  operationName: string;
  executionTimeMs: number;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface ServicePerformanceStats {
  serviceId: string;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  p95ExecutionTime: number;
  errorRate: number;
  lastOperationTime?: Date;
}

export interface PerformanceDashboard {
  overallStats: {
    totalOperations: number;
    averageResponseTime: number;
    overallErrorRate: number;
    activeServices: number;
  };
  serviceStats: Map<string, ServicePerformanceStats>;
  recentMetrics: PerformanceMetric[];
  alerts: PerformanceAlert[];
}

export interface PerformanceAlert {
  id: string;
  serviceId: string;
  alertType: 'HIGH_LATENCY' | 'HIGH_ERROR_RATE' | 'SERVICE_DOWN' | 'RESOURCE_USAGE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private serviceStats: Map<string, ServicePerformanceStats> = new Map();
  private alerts: PerformanceAlert[] = [];
  private maxMetricsHistory = Number(process.env.PERFORMANCE_MONITORING_MAX_METRICS_HISTORY) || 10000;
  private alertThresholds = {
    highLatencyMs: Number(process.env.PERFORMANCE_MONITORING_ALERT_THRESHOLDS_HIGH_LATENCY_MS) || 5000,
    highErrorRate: Number(process.env.PERFORMANCE_MONITORING_ALERT_THRESHOLDS_HIGH_ERROR_RATE) || 0.15,
    criticalLatencyMs: Number(process.env.PERFORMANCE_MONITORING_ALERT_THRESHOLDS_CRITICAL_LATENCY_MS) || 10000,
    criticalErrorRate: Number(process.env.PERFORMANCE_MONITORING_ALERT_THRESHOLDS_CRITICAL_ERROR_RATE) || 0.30
  };

  private activeOperations: Map<string, number> = new Map();
  private isEnabled = process.env.ENABLE_PERFORMANCE_MONITORING === 'true';

  constructor() {
    if (!this.isEnabled) {
      logger.debug('Performance monitoring is disabled');
      return;
    }

    const cleanupIntervalHours = Number(process.env.PERFORMANCE_MONITORING_CLEANUP_INTERVAL_HOURS) || 24;
    const alertCheckIntervalMinutes = Number(process.env.PERFORMANCE_MONITORING_ALERT_CHECK_INTERVAL_MINUTES) || 5;
    
    // Clean up old metrics periodically
    setInterval(() => this.cleanupOldMetrics(), cleanupIntervalHours * 60 * 60 * 1000);
    
    // Check for performance alerts periodically
    setInterval(() => this.checkPerformanceAlerts(), alertCheckIntervalMinutes * 60 * 1000);
  }

  /**
   * Start timing a service operation
   */
  startOperation(serviceId: string, operationName: string): string {
    if (!this.isEnabled) return 'disabled';
    
    const operationId = `${serviceId}_${operationName}_${Date.now()}_${Math.random()}`;
    this.activeOperations.set(operationId, performance.now());
    return operationId;
  }

  /**
   * End timing a service operation and record metrics
   */
  endOperation(
    operationId: string,
    serviceId: string,
    operationName: string,
    success: boolean = true,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled || operationId === 'disabled') return;
    const startTime = this.activeOperations.get(operationId);
    if (!startTime) {
      logger.warn('Performance monitoring: Operation not found', { operationId, serviceId });
      return;
    }

    const executionTimeMs = performance.now() - startTime;
    this.activeOperations.delete(operationId);

    const metric: PerformanceMetric = {
      serviceId,
      operationName,
      executionTimeMs,
      timestamp: new Date(),
      success,
      errorMessage,
      metadata
    };

    this.recordMetric(metric);
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetric): void {
    // Add to metrics history
    this.metrics.push(metric);
    
    // Limit metrics history size
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Update service statistics
    this.updateServiceStats(metric);

    // Log performance metric
    logger.debug('Performance metric recorded', {
      serviceId: metric.serviceId,
      operation: metric.operationName,
      executionTime: `${metric.executionTimeMs.toFixed(2)}ms`,
      success: metric.success
    });
  }

  /**
   * Update service performance statistics
   */
  private updateServiceStats(metric: PerformanceMetric): void {
    const serviceId = metric.serviceId;
    let stats = this.serviceStats.get(serviceId);

    if (!stats) {
      stats = {
        serviceId,
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        averageExecutionTime: 0,
        minExecutionTime: metric.executionTimeMs,
        maxExecutionTime: metric.executionTimeMs,
        p95ExecutionTime: metric.executionTimeMs,
        errorRate: 0,
        lastOperationTime: metric.timestamp
      };
    }

    // Update counters
    stats.totalOperations++;
    if (metric.success) {
      stats.successfulOperations++;
    } else {
      stats.failedOperations++;
    }

    // Update execution time statistics
    const serviceMetrics = this.metrics
      .filter(m => m.serviceId === serviceId)
      .map(m => m.executionTimeMs);

    stats.averageExecutionTime = serviceMetrics.reduce((a, b) => a + b, 0) / serviceMetrics.length;
    stats.minExecutionTime = Math.min(...serviceMetrics);
    stats.maxExecutionTime = Math.max(...serviceMetrics);
    
    // Calculate P95
    const sortedTimes = serviceMetrics.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    stats.p95ExecutionTime = sortedTimes[p95Index] || stats.averageExecutionTime;

    // Update error rate
    stats.errorRate = stats.failedOperations / stats.totalOperations;
    stats.lastOperationTime = metric.timestamp;

    this.serviceStats.set(serviceId, stats);
  }

  /**
   * Get performance statistics for a specific service
   */
  getServiceStats(serviceId: string): ServicePerformanceStats | undefined {
    return this.serviceStats.get(serviceId);
  }

  /**
   * Get overall performance dashboard
   */
  getDashboard(): PerformanceDashboard {
    const allMetrics = this.metrics;
    const recentMetrics = allMetrics.slice(-100); // Last 100 operations

    const overallStats = {
      totalOperations: allMetrics.length,
      averageResponseTime: allMetrics.length > 0 
        ? allMetrics.reduce((sum, m) => sum + m.executionTimeMs, 0) / allMetrics.length 
        : 0,
      overallErrorRate: allMetrics.length > 0
        ? allMetrics.filter(m => !m.success).length / allMetrics.length
        : 0,
      activeServices: this.serviceStats.size
    };

    return {
      overallStats,
      serviceStats: this.serviceStats,
      recentMetrics,
      alerts: this.alerts.filter(a => !a.resolved).slice(-50) // Last 50 unresolved alerts
    };
  }

  /**
   * Check for performance alerts
   */
  private checkPerformanceAlerts(): void {
    for (const [serviceId, stats] of this.serviceStats) {
      // Check high latency
      if (stats.averageExecutionTime > this.alertThresholds.highLatencyMs) {
        const severity = stats.averageExecutionTime > this.alertThresholds.criticalLatencyMs 
          ? 'CRITICAL' : 'HIGH';
        
        this.createAlert(
          serviceId,
          'HIGH_LATENCY',
          severity,
          `Service ${serviceId} average latency is ${stats.averageExecutionTime.toFixed(2)}ms`
        );
      }

      // Check high error rate
      if (stats.errorRate > this.alertThresholds.highErrorRate) {
        const severity = stats.errorRate > this.alertThresholds.criticalErrorRate
          ? 'CRITICAL' : 'HIGH';
        
        this.createAlert(
          serviceId,
          'HIGH_ERROR_RATE',
          severity,
          `Service ${serviceId} error rate is ${(stats.errorRate * 100).toFixed(2)}%`
        );
      }

      // Check if service hasn't been active recently (5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (stats.lastOperationTime && stats.lastOperationTime < fiveMinutesAgo) {
        this.createAlert(
          serviceId,
          'SERVICE_DOWN',
          'MEDIUM',
          `Service ${serviceId} has not processed operations in the last 5 minutes`
        );
      }
    }
  }

  /**
   * Create a performance alert
   */
  private createAlert(
    serviceId: string,
    alertType: PerformanceAlert['alertType'],
    severity: PerformanceAlert['severity'],
    message: string
  ): void {
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(
      a => a.serviceId === serviceId && 
           a.alertType === alertType && 
           !a.resolved
    );

    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random()}`,
      serviceId,
      alertType,
      severity,
      message,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);

    logger.warn('Performance alert created', {
      alertId: alert.id,
      serviceId: alert.serviceId,
      type: alert.alertType,
      severity: alert.severity,
      message: alert.message
    });
  }

  /**
   * Resolve a performance alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      logger.info('Performance alert resolved', { alertId, serviceId: alert.serviceId });
      return true;
    }
    return false;
  }

  /**
   * Clean up old metrics and alerts
   */
  private cleanupOldMetrics(): void {
    // Keep metrics from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > oneDayAgo);

    // Keep alerts from last 7 days
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(a => a.timestamp > oneWeekAgo);

    logger.debug('Performance monitoring cleanup completed', {
      metricsCount: this.metrics.length,
      alertsCount: this.alerts.length
    });
  }

  /**
   * Get performance metrics for a time range
   */
  getMetricsForTimeRange(
    serviceId?: string,
    startTime?: Date,
    endTime?: Date
  ): PerformanceMetric[] {
    let filteredMetrics = this.metrics;

    if (serviceId) {
      filteredMetrics = filteredMetrics.filter(m => m.serviceId === serviceId);
    }

    if (startTime) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= startTime);
    }

    if (endTime) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp <= endTime);
    }

    return filteredMetrics;
  }

  /**
   * Export performance data for analysis
   */
  exportPerformanceData(): {
    metrics: PerformanceMetric[];
    serviceStats: Array<ServicePerformanceStats>;
    alerts: PerformanceAlert[];
    summary: {
      totalOperations: number;
      timeRange: { start: Date; end: Date };
      servicesMonitored: string[];
    };
  } {
    return {
      metrics: this.metrics,
      serviceStats: Array.from(this.serviceStats.values()),
      alerts: this.alerts,
      summary: {
        totalOperations: this.metrics.length,
        timeRange: {
          start: this.metrics.length > 0 ? this.metrics[0].timestamp : new Date(),
          end: this.metrics.length > 0 ? this.metrics[this.metrics.length - 1].timestamp : new Date()
        },
        servicesMonitored: Array.from(this.serviceStats.keys())
      }
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitoringService();