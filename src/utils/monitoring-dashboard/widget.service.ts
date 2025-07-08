/**
 * Widget Service
 * Manages dashboard widgets, their updates, and data synchronization
 */

import { 
  DashboardWidget, 
  ChartData, 
  MetricsGridData, 
  AlertListData,
  TableData
} from './types.js';
import { ChartDataService } from './chart-data.service.js';
import { AnalyticsDashboard } from '../analytics-engine.js';
import { logger } from '../logger.js';

export class WidgetService {
  private chartDataService: ChartDataService;
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.chartDataService = new ChartDataService();
  }

  /**
   * Update individual widget with fresh analytics data
   */
  updateWidget(widget: DashboardWidget, dashboard: AnalyticsDashboard): void {
    try {
      switch (widget.id) {
        case 'system-health':
          this.updateSystemHealthWidget(widget, dashboard);
          break;
        case 'request-throughput':
          this.updateThroughputChart(widget, dashboard);
          break;
        case 'response-time':
          this.updateResponseTimeChart(widget, dashboard);
          break;
        case 'active-alerts':
          this.updateAlertsWidget(widget, dashboard);
          break;
        case 'user-activity':
          this.updateUserActivityHeatmap(widget, dashboard);
          break;
        case 'cache-performance':
          this.updateCachePerformanceChart(widget, dashboard);
          break;
        case 'resource-utilization':
          this.updateResourceUtilizationChart(widget, dashboard);
          break;
        case 'queue-metrics':
          this.updateQueueMetricsChart(widget, dashboard);
          break;
        case 'user-distribution':
          this.updateUserDistributionChart(widget, dashboard);
          break;
        case 'top-guilds':
          this.updateTopGuildsTable(widget, dashboard);
          break;
        case 'usage-patterns':
          this.updateUsagePatternsChart(widget, dashboard);
          break;
        default:
          logger.warn('Unknown widget type for update', { widgetId: widget.id });
      }

      logger.debug('Widget updated successfully', {
        operation: 'widget-update',
        widgetId: widget.id,
        widgetType: widget.type
      });

    } catch (error) {
      logger.error('Failed to update widget', {
        operation: 'widget-update-error',
        widgetId: widget.id,
        error: String(error)
      });
    }
  }

  /**
   * Update system health widget with current metrics
   */
  private updateSystemHealthWidget(widget: DashboardWidget, dashboard: AnalyticsDashboard): void {
    const uptime = process.uptime();
    const uptimeStr = `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;

    const metricsData = widget.data as MetricsGridData;
    metricsData.metrics = [
      {
        id: 'uptime',
        label: 'Uptime',
        value: uptimeStr,
        status: 'healthy',
        trend: 'stable'
      },
      {
        id: 'active-users',
        label: 'Active Users',
        value: dashboard.overview.activeUsers,
        status: dashboard.overview.activeUsers > 0 ? 'healthy' : 'warning',
        trend: 'stable'
      },
      {
        id: 'success-rate',
        label: 'Success Rate',
        value: `${Math.round(dashboard.overview.successRate * 100)}%`,
        status: dashboard.overview.successRate > 0.95 ? 'healthy' : 'warning',
        trend: 'stable'
      },
      {
        id: 'avg-response',
        label: 'Avg Response',
        value: `${Math.round(dashboard.overview.avgResponseTime)}ms`,
        status: dashboard.overview.avgResponseTime < 2000 ? 'healthy' : 'warning',
        trend: 'stable'
      }
    ];
  }

  /**
   * Update throughput chart with real-time data
   */
  private updateThroughputChart(widget: DashboardWidget, dashboard: AnalyticsDashboard): void {
    const chartData = widget.data as ChartData;
    this.chartDataService.addDataPoint(
      chartData,
      'RPS',
      dashboard.realTime.currentRPS
    );
  }

  /**
   * Update response time chart with percentile data
   */
  private updateResponseTimeChart(widget: DashboardWidget, dashboard: AnalyticsDashboard): void {
    const chartData = widget.data as ChartData;
    const now = Date.now();

    this.chartDataService.updateChartData(chartData, [
      { timestamp: now, label: 'P50', value: dashboard.performance.latency.p50 },
      { timestamp: now, label: 'P90', value: dashboard.performance.latency.p90 },
      { timestamp: now, label: 'P95', value: dashboard.performance.latency.p95 },
      { timestamp: now, label: 'P99', value: dashboard.performance.latency.p99 }
    ]);
  }

  /**
   * Update alerts widget with current alerts
   */
  private updateAlertsWidget(widget: DashboardWidget, dashboard: AnalyticsDashboard): void {
    const alertData = widget.data as AlertListData;
    alertData.alerts = dashboard.realTime.alerts.slice(0, alertData.config.maxAlerts);
  }

  /**
   * Update user activity heatmap
   */
  private updateUserActivityHeatmap(widget: DashboardWidget, dashboard: AnalyticsDashboard): void {
    const chartData = widget.data as ChartData;
    
    const heatmapData = dashboard.usage.timeBasedMetrics.map(metric => ({
      label: `Hour ${metric.hour}`,
      value: metric.requests,
      metadata: { users: metric.users }
    }));

    this.chartDataService.updateChartData(chartData, heatmapData);
  }

  /**
   * Update cache performance chart
   */
  private updateCachePerformanceChart(widget: DashboardWidget, dashboard: AnalyticsDashboard): void {
    const chartData = widget.data as ChartData;
    this.chartDataService.addDataPoint(
      chartData,
      'Hit Rate',
      dashboard.performance.cacheHitRate * 100
    );
  }

  /**
   * Update resource utilization chart
   */
  private updateResourceUtilizationChart(widget: DashboardWidget, dashboard: AnalyticsDashboard): void {
    const chartData = widget.data as ChartData;
    
    const resourceData = [
      { label: 'Memory', value: dashboard.performance.resourceUtilization.memory },
      { label: 'CPU', value: dashboard.performance.resourceUtilization.cpu },
      { label: 'Connections', value: dashboard.performance.resourceUtilization.connections }
    ];

    this.chartDataService.updateChartData(chartData, resourceData);
  }

  /**
   * Update queue metrics chart
   */
  private updateQueueMetricsChart(widget: DashboardWidget, dashboard: AnalyticsDashboard): void {
    const chartData = widget.data as ChartData;
    
    const queueData = [
      { label: 'Queue Size', value: dashboard.realTime.queueSize },
      { label: 'Processing Time', value: dashboard.realTime.processingTime }
    ];

    this.chartDataService.updateChartData(chartData, queueData);
  }

  /**
   * Update user distribution chart
   */
  private updateUserDistributionChart(widget: DashboardWidget, dashboard: AnalyticsDashboard): void {
    const chartData = widget.data as ChartData;
    
    const distributionData = Object.entries(dashboard.usage.userDistribution).map(([label, value]) => ({
      label,
      value
    }));

    this.chartDataService.updateChartData(chartData, distributionData);
  }

  /**
   * Update top guilds table
   */
  private updateTopGuildsTable(widget: DashboardWidget, dashboard: AnalyticsDashboard): void {
    const tableData = widget.data as TableData;
    
    tableData.data = dashboard.usage.topGuilds.map(guild => ({
      guildId: guild.guildId.substring(0, 8) + '...',
      requests: guild.requests,
      users: guild.users,
      avgResponse: '~' + Math.round(dashboard.overview.avgResponseTime) + 'ms'
    }));
  }

  /**
   * Update usage patterns chart
   */
  private updateUsagePatternsChart(widget: DashboardWidget, dashboard: AnalyticsDashboard): void {
    const chartData = widget.data as ChartData;
    
    const patternData = dashboard.usage.timeBasedMetrics.map(metric => ({
      label: `${metric.hour}:00`,
      value: metric.requests,
      metadata: { users: metric.users }
    }));

    this.chartDataService.updateChartData(chartData, patternData);
  }

  /**
   * Start auto-refresh for a widget
   */
  startWidgetAutoRefresh(
    widget: DashboardWidget,
    updateCallback: (widget: DashboardWidget) => void
  ): void {
    if (!widget.config.autoRefresh) {
      return;
    }

    // Clear existing interval if any
    this.stopWidgetAutoRefresh(widget.id);

    const interval = setInterval(() => {
      updateCallback(widget);
    }, widget.config.refreshInterval);

    this.updateIntervals.set(widget.id, interval);

    logger.debug('Widget auto-refresh started', {
      operation: 'widget-autorefresh-start',
      widgetId: widget.id,
      refreshInterval: widget.config.refreshInterval
    });
  }

  /**
   * Stop auto-refresh for a widget
   */
  stopWidgetAutoRefresh(widgetId: string): void {
    const interval = this.updateIntervals.get(widgetId);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(widgetId);

      logger.debug('Widget auto-refresh stopped', {
        operation: 'widget-autorefresh-stop',
        widgetId
      });
    }
  }

  /**
   * Stop all widget auto-refresh intervals
   */
  stopAllAutoRefresh(): void {
    this.updateIntervals.forEach((interval, widgetId) => {
      clearInterval(interval);
      logger.debug('Stopped auto-refresh for widget', { widgetId });
    });
    
    this.updateIntervals.clear();

    logger.info('All widget auto-refresh stopped', {
      operation: 'widget-autorefresh-stop-all'
    });
  }

  /**
   * Get widget refresh status
   */
  getWidgetRefreshStatus(widgetId: string): {
    isActive: boolean;
    interval?: number;
  } {
    const hasInterval = this.updateIntervals.has(widgetId);
    return {
      isActive: hasInterval,
      interval: hasInterval ? undefined : undefined // Interval reference not exposed
    };
  }

  /**
   * Validate widget configuration
   */
  validateWidget(widget: DashboardWidget): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!widget.id || widget.id.trim() === '') {
      errors.push('Widget ID is required');
    }

    if (!widget.title || widget.title.trim() === '') {
      errors.push('Widget title is required');
    }

    if (!['chart', 'metric', 'alert', 'table', 'custom'].includes(widget.type)) {
      errors.push('Invalid widget type');
    }

    if (widget.config.refreshInterval < 1000) {
      errors.push('Refresh interval must be at least 1000ms');
    }

    if (!widget.position || widget.position.width <= 0 || widget.position.height <= 0) {
      errors.push('Invalid widget position or dimensions');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
