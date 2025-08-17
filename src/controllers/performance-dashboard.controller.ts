import { performanceMonitor, PerformanceDashboard } from '../services/performance-monitoring.service.js';
import { logger } from '../utils/logger.js';

/**
 * Performance Dashboard Controller
 * Provides API methods for accessing performance monitoring data
 * Can be integrated with existing web server infrastructure
 */
export class PerformanceDashboardController {
  
  /**
   * Get performance dashboard data
   */
  getDashboard(): { success: boolean; data?: any; error?: string } {
    try {
      const dashboard = performanceMonitor.getDashboard();
      return {
        success: true,
        data: this.formatDashboard(dashboard)
      };
    } catch (error) {
      logger.error('Failed to get performance dashboard', { error });
      return {
        success: false,
        error: 'Failed to retrieve performance dashboard'
      };
    }
  }

  /**
   * Get service-specific performance stats
   */
  getServiceStats(serviceId: string): { success: boolean; data?: any; error?: string } {
    try {
      const stats = performanceMonitor.getServiceStats(serviceId);
      
      if (!stats) {
        return {
          success: false,
          error: `Service '${serviceId}' not found`
        };
      }

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      logger.error('Failed to get service performance stats', { error, serviceId });
      return {
        success: false,
        error: 'Failed to retrieve service performance stats'
      };
    }
  }

  /**
   * Get metrics for time range
   */
  getMetrics(options: {
    serviceId?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  } = {}): { success: boolean; data?: any; error?: string } {
    try {
      const { serviceId, startTime, endTime, limit } = options;
      
      let metrics = performanceMonitor.getMetricsForTimeRange(
        serviceId,
        startTime,
        endTime
      );

      // Apply limit if specified
      if (limit && limit > 0) {
        metrics = metrics.slice(-limit);
      }

      return {
        success: true,
        data: {
          metrics,
          count: metrics.length,
          timeRange: {
            start: startTime || (metrics.length > 0 ? metrics[0].timestamp : null),
            end: endTime || (metrics.length > 0 ? metrics[metrics.length - 1].timestamp : null)
          }
        }
      };
    } catch (error) {
      logger.error('Failed to get performance metrics', { error });
      return {
        success: false,
        error: 'Failed to retrieve performance metrics'
      };
    }
  }

  /**
   * Export performance data
   */
  exportPerformanceData(): any {
    try {
      return performanceMonitor.exportPerformanceData();
    } catch (error) {
      logger.error('Failed to export performance data', { error });
      throw new Error('Failed to export performance data');
    }
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): { success: boolean; message?: string; error?: string } {
    try {
      const resolved = performanceMonitor.resolveAlert(alertId);
      
      if (resolved) {
        return {
          success: true,
          message: `Alert ${alertId} resolved successfully`
        };
      } else {
        return {
          success: false,
          error: `Alert '${alertId}' not found`
        };
      }
    } catch (error) {
      logger.error('Failed to resolve alert', { error, alertId });
      return {
        success: false,
        error: 'Failed to resolve alert'
      };
    }
  }

  /**
   * Get performance summary (lightweight endpoint for monitoring)
   */
  getSummary(): { success: boolean; data?: any; error?: string } {
    try {
      const dashboard = performanceMonitor.getDashboard();
      
      // Create a lightweight summary
      const summary = {
        status: 'healthy', // Will be determined by alerts and metrics
        overallStats: dashboard.overallStats,
        activeAlerts: dashboard.alerts.filter(a => !a.resolved).length,
        criticalAlerts: dashboard.alerts.filter(a => !a.resolved && a.severity === 'CRITICAL').length,
        servicesMonitored: Array.from(dashboard.serviceStats.keys()),
        lastUpdated: new Date()
      };

      // Determine overall health status
      if (summary.criticalAlerts > 0) {
        summary.status = 'critical';
      } else if (summary.activeAlerts > 0) {
        summary.status = 'warning';
      } else if (dashboard.overallStats.overallErrorRate > 0.1) { // 10% error rate threshold
        summary.status = 'degraded';
      }

      return {
        success: true,
        data: summary
      };
    } catch (error) {
      logger.error('Failed to get performance summary', { error });
      return {
        success: false,
        error: 'Failed to retrieve performance summary'
      };
    }
  }

  private formatDashboard(dashboard: PerformanceDashboard) {
    return {
      overallStats: dashboard.overallStats,
      serviceStats: Array.from(dashboard.serviceStats.entries()).map(([serviceId, stats]) => ({
        ...stats,
        healthStatus: this.getServiceHealthStatus(stats)
      })),
      recentMetrics: dashboard.recentMetrics.slice(-20), // Only show last 20 for API response
      alerts: dashboard.alerts.map(alert => ({
        ...alert,
        age: Date.now() - alert.timestamp.getTime()
      })),
      generatedAt: new Date()
    };
  }

  private getServiceHealthStatus(stats: any): 'healthy' | 'warning' | 'critical' {
    // Critical if error rate > 30% or average execution time > 10 seconds
    if (stats.errorRate > 0.3 || stats.averageExecutionTime > 10000) {
      return 'critical';
    }
    
    // Warning if error rate > 15% or average execution time > 5 seconds
    if (stats.errorRate > 0.15 || stats.averageExecutionTime > 5000) {
      return 'warning';
    }
    
    return 'healthy';
  }
}

// Singleton instance
export const performanceDashboardController = new PerformanceDashboardController();