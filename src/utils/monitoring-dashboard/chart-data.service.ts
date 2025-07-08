/**
 * Chart Data Service
 * Handles chart data generation and formatting for dashboard widgets
 */

import { 
  ChartData, 
  MetricsGridData, 
  AlertListData, 
  TableData,
  CHART_COLORS,
  PERFORMANCE_THRESHOLDS
} from './types.js';
import { logger } from '../logger.js';

export class ChartDataService {
  
  /**
   * Create system health metrics grid
   */
  createSystemHealthWidget(): MetricsGridData {
    return {
      type: 'metrics-grid',
      metrics: [
        {
          id: 'uptime',
          label: 'Uptime',
          value: '0d 0h 0m',
          status: 'healthy',
          trend: 'stable'
        },
        {
          id: 'active-users',
          label: 'Active Users',
          value: 0,
          status: 'healthy',
          trend: 'up'
        },
        {
          id: 'success-rate',
          label: 'Success Rate',
          value: '100%',
          status: 'healthy',
          trend: 'stable'
        },
        {
          id: 'avg-response',
          label: 'Avg Response',
          value: '0ms',
          status: 'healthy',
          trend: 'down'
        }
      ]
    };
  }

  /**
   * Create throughput chart configuration
   */
  createThroughputChart(): ChartData {
    return {
      id: 'throughput-chart',
      title: 'Requests per Second',
      type: 'line',
      data: [],
      config: {
        xAxis: 'time',
        yAxis: 'requests/sec',
        colors: [CHART_COLORS.primary[0], CHART_COLORS.primary[1]],
        realTime: true,
        refreshRate: 2000
      }
    };
  }

  /**
   * Create response time chart configuration
   */
  createResponseTimeChart(): ChartData {
    return {
      id: 'response-time-chart',
      title: 'Response Time Percentiles',
      type: 'line',
      data: [],
      config: {
        xAxis: 'time',
        yAxis: 'milliseconds',
        colors: CHART_COLORS.primary,
        thresholds: [
          { 
            value: PERFORMANCE_THRESHOLDS.responseTime.excellent, 
            color: CHART_COLORS.status.healthy, 
            label: 'Excellent' 
          },
          { 
            value: PERFORMANCE_THRESHOLDS.responseTime.good, 
            color: CHART_COLORS.status.warning, 
            label: 'Good' 
          },
          { 
            value: PERFORMANCE_THRESHOLDS.responseTime.poor, 
            color: CHART_COLORS.status.critical, 
            label: 'Poor' 
          }
        ],
        realTime: true,
        refreshRate: 5000
      }
    };
  }

  /**
   * Create alerts widget configuration
   */
  createAlertsWidget(): AlertListData {
    return {
      type: 'alert-list',
      alerts: [],
      config: {
        maxAlerts: 10,
        severityColors: {
          low: '#74B9FF',
          medium: '#FDCB6E',
          high: '#E17055',
          critical: '#D63031'
        }
      }
    };
  }

  /**
   * Create user activity heatmap configuration
   */
  createUserActivityHeatmap(): ChartData {
    return {
      id: 'user-activity-heatmap',
      title: 'User Activity by Hour',
      type: 'heatmap',
      data: [],
      config: {
        colors: ['#313395', '#2C6FBB', '#3498DB', '#52C4E0', '#76E5E5'],
        realTime: true,
        refreshRate: 30000
      }
    };
  }

  /**
   * Create cache performance chart configuration
   */
  createCachePerformanceChart(): ChartData {
    return {
      id: 'cache-performance',
      title: 'Cache Hit Rate & Performance',
      type: 'line',
      data: [],
      config: {
        xAxis: 'time',
        yAxis: 'percentage',
        colors: [CHART_COLORS.status.healthy, CHART_COLORS.status.warning],
        thresholds: [
          { 
            value: PERFORMANCE_THRESHOLDS.cacheHitRate.excellent * 100, 
            color: CHART_COLORS.status.healthy, 
            label: 'Excellent' 
          },
          { 
            value: PERFORMANCE_THRESHOLDS.cacheHitRate.good * 100, 
            color: CHART_COLORS.status.warning, 
            label: 'Good' 
          },
          { 
            value: PERFORMANCE_THRESHOLDS.cacheHitRate.poor * 100, 
            color: CHART_COLORS.status.critical, 
            label: 'Poor' 
          }
        ],
        realTime: true,
        refreshRate: 10000
      }
    };
  }

  /**
   * Create resource utilization chart configuration
   */
  createResourceUtilizationChart(): ChartData {
    return {
      id: 'resource-utilization',
      title: 'System Resource Usage',
      type: 'gauge',
      data: [],
      config: {
        colors: CHART_COLORS.primary.slice(0, 3),
        thresholds: [
          { 
            value: PERFORMANCE_THRESHOLDS.resourceUtilization.warning, 
            color: CHART_COLORS.status.warning, 
            label: 'Warning' 
          },
          { 
            value: PERFORMANCE_THRESHOLDS.resourceUtilization.critical, 
            color: CHART_COLORS.status.critical, 
            label: 'Critical' 
          }
        ],
        realTime: true,
        refreshRate: 5000
      }
    };
  }

  /**
   * Create queue metrics chart configuration
   */
  createQueueMetricsChart(): ChartData {
    return {
      id: 'queue-metrics',
      title: 'Queue Size & Processing Time',
      type: 'bar',
      data: [],
      config: {
        xAxis: 'metric',
        yAxis: 'value',
        colors: [CHART_COLORS.secondary[0], CHART_COLORS.secondary[1]],
        realTime: true,
        refreshRate: 3000
      }
    };
  }

  /**
   * Create user distribution chart configuration
   */
  createUserDistributionChart(): ChartData {
    return {
      id: 'user-distribution',
      title: 'User Activity Levels',
      type: 'pie',
      data: [],
      config: {
        colors: CHART_COLORS.primary,
        realTime: true,
        refreshRate: 60000
      }
    };
  }

  /**
   * Create top guilds table configuration
   */
  createTopGuildsTable(): TableData {
    return {
      type: 'data-table',
      columns: [
        { key: 'guildId', label: 'Guild ID', type: 'text' },
        { key: 'requests', label: 'Requests', type: 'number' },
        { key: 'users', label: 'Active Users', type: 'number' },
        { key: 'avgResponse', label: 'Avg Response', type: 'duration' }
      ],
      data: [],
      config: {
        sortable: true,
        searchable: true,
        pageSize: 10
      }
    };
  }

  /**
   * Create usage patterns chart configuration
   */
  createUsagePatternsChart(): ChartData {
    return {
      id: 'usage-patterns',
      title: 'Hourly Usage Patterns',
      type: 'bar',
      data: [],
      config: {
        xAxis: 'hour',
        yAxis: 'requests',
        colors: [CHART_COLORS.primary[0], CHART_COLORS.primary[1]],
        realTime: true,
        refreshRate: 300000
      }
    };
  }

  /**
   * Add data point to chart (for real-time updates)
   */
  addDataPoint(
    chartData: ChartData, 
    label: string, 
    value: number, 
    timestamp?: number,
    metadata?: Record<string, unknown>
  ): void {
    try {
      chartData.data.push({
        timestamp: timestamp || Date.now(),
        label,
        value,
        metadata
      });

      // Keep only last 50 data points for performance
      if (chartData.data.length > 50) {
        chartData.data.shift();
      }

      logger.debug('Data point added to chart', {
        chartId: chartData.id,
        label,
        value,
        dataPoints: chartData.data.length
      });

    } catch (error) {
      logger.error('Failed to add data point to chart', {
        chartId: chartData.id,
        error: String(error)
      });
    }
  }

  /**
   * Update chart data completely (for batch updates)
   */
  updateChartData(
    chartData: ChartData, 
    newData: Array<{
      timestamp?: number;
      label: string;
      value: number;
      metadata?: Record<string, unknown>;
    }>
  ): void {
    try {
      chartData.data = newData;

      logger.debug('Chart data updated', {
        chartId: chartData.id,
        dataPoints: newData.length
      });

    } catch (error) {
      logger.error('Failed to update chart data', {
        chartId: chartData.id,
        error: String(error)
      });
    }
  }
}
