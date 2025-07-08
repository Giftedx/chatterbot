/**
 * Interactive Monitoring Dashboard - Main Orchestrator
 * Coordinates all dashboard services and provides unified API
 */

import { 
  DashboardConfig, 
  DashboardLayout, 
  WebServerOptions,
  DEFAULT_DASHBOARD_CONFIG,
  ClientConnection
} from './types.js';
import { ChartDataService } from './chart-data.service.js';
import { WidgetService } from './widget.service.js';
import { ServerService } from './server.service.js';
import { RealtimeService } from './realtime.service.js';
import { ExportService } from './export.service.js';
import { AnalyticsEngine } from '../analytics-engine.js';
import { PerformanceMonitor } from '../resilience.js';
import { logger } from '../logger.js';

/**
 * Interactive monitoring dashboard with real-time analytics visualization
 */
export class InteractiveMonitoringDashboard {
  private analyticsEngine: AnalyticsEngine;
  private config: DashboardConfig;
  private layouts: Map<string, DashboardLayout> = new Map();
  private activeConnections: Set<ClientConnection> = new Set();

  // Service modules
  private chartDataService: ChartDataService;
  private widgetService: WidgetService;
  private serverService: ServerService;
  private realtimeService: RealtimeService;
  private exportService: ExportService;

  constructor(
    analyticsEngine: AnalyticsEngine,
    config: Partial<DashboardConfig> = {}
  ) {
    this.analyticsEngine = analyticsEngine;
    this.config = this.mergeDefaultConfig(config);
    
    // Initialize services
    this.chartDataService = new ChartDataService();
    this.widgetService = new WidgetService();
    this.serverService = new ServerService(this.createWebServerOptions());
    this.realtimeService = new RealtimeService(this.widgetService);
    this.exportService = new ExportService();
    
    this.initializeDefaultLayouts();
    this.startDashboardServices();

    logger.info('InteractiveMonitoringDashboard initialized', {
      operation: 'dashboard-init',
      metadata: {
        port: this.config.port,
        updateInterval: this.config.updateInterval,
        authEnabled: this.config.enableAuth,
        features: this.config.features,
        layouts: this.layouts.size
      }
    });
  }

  /**
   * Merge user config with defaults
   */
  private mergeDefaultConfig(userConfig: Partial<DashboardConfig>): DashboardConfig {
    return {
      ...DEFAULT_DASHBOARD_CONFIG,
      ...userConfig,
      cors: {
        ...DEFAULT_DASHBOARD_CONFIG.cors,
        ...userConfig.cors
      },
      features: {
        ...DEFAULT_DASHBOARD_CONFIG.features,
        ...userConfig.features
      }
    };
  }

  /**
   * Create web server options from dashboard config
   */
  private createWebServerOptions(): WebServerOptions {
    return {
      port: this.config.port,
      cors: this.config.cors,
      auth: {
        enabled: this.config.enableAuth,
        token: this.config.authToken
      }
    };
  }

  /**
   * Initialize default dashboard layouts
   */
  private initializeDefaultLayouts(): void {
    // Overview Dashboard
    const overviewLayout: DashboardLayout = {
      id: 'overview',
      name: 'System Overview',
      description: 'High-level system metrics and health indicators',
      widgets: [
        {
          id: 'system-health',
          title: 'System Health',
          type: 'metric',
          position: { x: 0, y: 0, width: 3, height: 2 },
          data: this.chartDataService.createSystemHealthWidget(),
          config: {
            refreshInterval: 5000,
            autoRefresh: true,
            interactive: false,
            exportable: false
          }
        },
        {
          id: 'request-throughput',
          title: 'Request Throughput',
          type: 'chart',
          position: { x: 3, y: 0, width: 6, height: 3 },
          data: this.chartDataService.createThroughputChart(),
          config: {
            refreshInterval: 2000,
            autoRefresh: true,
            interactive: true,
            exportable: true
          }
        },
        {
          id: 'response-time',
          title: 'Response Time Distribution',
          type: 'chart',
          position: { x: 9, y: 0, width: 3, height: 3 },
          data: this.chartDataService.createResponseTimeChart(),
          config: {
            refreshInterval: 5000,
            autoRefresh: true,
            interactive: true,
            exportable: true
          }
        },
        {
          id: 'active-alerts',
          title: 'Active Alerts',
          type: 'alert',
          position: { x: 0, y: 2, width: 3, height: 2 },
          data: this.chartDataService.createAlertsWidget(),
          config: {
            refreshInterval: 1000,
            autoRefresh: true,
            interactive: true,
            exportable: false
          }
        },
        {
          id: 'user-activity',
          title: 'User Activity Heatmap',
          type: 'chart',
          position: { x: 0, y: 4, width: 12, height: 3 },
          data: this.chartDataService.createUserActivityHeatmap(),
          config: {
            refreshInterval: 30000,
            autoRefresh: true,
            interactive: true,
            exportable: true
          }
        }
      ],
      globalConfig: {
        theme: 'dark',
        refreshRate: 5000,
        autoLayout: false
      }
    };

    // Performance Dashboard
    const performanceLayout: DashboardLayout = {
      id: 'performance',
      name: 'Performance Analytics',
      description: 'Detailed performance metrics and optimization insights',
      widgets: [
        {
          id: 'cache-performance',
          title: 'Cache Performance',
          type: 'chart',
          position: { x: 0, y: 0, width: 4, height: 3 },
          data: this.chartDataService.createCachePerformanceChart(),
          config: {
            refreshInterval: 10000,
            autoRefresh: true,
            interactive: true,
            exportable: true
          }
        },
        {
          id: 'resource-utilization',
          title: 'Resource Utilization',
          type: 'chart',
          position: { x: 4, y: 0, width: 4, height: 3 },
          data: this.chartDataService.createResourceUtilizationChart(),
          config: {
            refreshInterval: 5000,
            autoRefresh: true,
            interactive: true,
            exportable: true
          }
        },
        {
          id: 'queue-metrics',
          title: 'Queue Performance',
          type: 'chart',
          position: { x: 8, y: 0, width: 4, height: 3 },
          data: this.chartDataService.createQueueMetricsChart(),
          config: {
            refreshInterval: 3000,
            autoRefresh: true,
            interactive: true,
            exportable: true
          }
        }
      ],
      globalConfig: {
        theme: 'dark',
        refreshRate: 5000,
        autoLayout: false
      }
    };

    // User Analytics Dashboard
    const userAnalyticsLayout: DashboardLayout = {
      id: 'user-analytics',
      name: 'User Analytics',
      description: 'User behavior analysis and engagement metrics',
      widgets: [
        {
          id: 'user-distribution',
          title: 'User Activity Distribution',
          type: 'chart',
          position: { x: 0, y: 0, width: 6, height: 3 },
          data: this.chartDataService.createUserDistributionChart(),
          config: {
            refreshInterval: 60000,
            autoRefresh: true,
            interactive: true,
            exportable: true
          }
        },
        {
          id: 'top-guilds',
          title: 'Most Active Guilds',
          type: 'table',
          position: { x: 6, y: 0, width: 6, height: 3 },
          data: this.chartDataService.createTopGuildsTable(),
          config: {
            refreshInterval: 30000,
            autoRefresh: true,
            interactive: true,
            exportable: true
          }
        },
        {
          id: 'usage-patterns',
          title: 'Usage Patterns (24h)',
          type: 'chart',
          position: { x: 0, y: 3, width: 12, height: 3 },
          data: this.chartDataService.createUsagePatternsChart(),
          config: {
            refreshInterval: 300000, // 5 minutes
            autoRefresh: true,
            interactive: true,
            exportable: true
          }
        }
      ],
      globalConfig: {
        theme: 'dark',
        refreshRate: 30000,
        autoLayout: false
      }
    };

    this.layouts.set('overview', overviewLayout);
    this.layouts.set('performance', performanceLayout);
    this.layouts.set('user-analytics', userAnalyticsLayout);
  }

  /**
   * Start dashboard background services
   */
  private startDashboardServices(): void {
    // Start real-time data updates
    this.realtimeService.startRealtimeUpdates(
      this.layouts,
      this.config.updateInterval,
      () => this.analyticsEngine.generateDashboard()
    );

    // Start web server
    this.serverService.start().catch(error => {
      logger.error('Failed to start dashboard server', {
        operation: 'dashboard-server-start-error',
        metadata: { error: String(error) }
      });
    });

    logger.info('Dashboard services started', {
      operation: 'dashboard-services-start',
      metadata: {
        layouts: this.layouts.size,
        updateInterval: this.config.updateInterval,
        serverPort: this.config.port
      }
    });
  }

  /**
   * Update all widgets with fresh data (backward compatibility method)
   */
  private async updateAllWidgets(): Promise<void> {
    return PerformanceMonitor.monitor('dashboard-update-all', async () => {
      const dashboard = this.analyticsEngine.generateDashboard();
      
      this.layouts.forEach(layout => {
        layout.widgets.forEach(widget => {
          this.widgetService.updateWidget(widget, dashboard);
        });
      });

      // Notify connected clients of updates
      this.notifyConnectedClients();
    });
  }

  /**
   * Notify connected clients of updates (backward compatibility method)
   */
  private notifyConnectedClients(): void {
    this.realtimeService.notifyClients(this.activeConnections, {
      type: 'layout_update',
      data: Array.from(this.layouts.values()),
      timestamp: Date.now()
    });
  }

  /**
   * Get layout data for client
   */
  getLayoutData(layoutId: string): DashboardLayout | undefined {
    return this.layouts.get(layoutId);
  }

  /**
   * Get all available layouts
   */
  getAvailableLayouts(): Array<{ id: string; name: string; description: string }> {
    return Array.from(this.layouts.values()).map(layout => ({
      id: layout.id,
      name: layout.name,
      description: layout.description
    }));
  }

  /**
   * Export dashboard configuration
   */
  exportConfiguration(): {
    layouts: DashboardLayout[];
    config: DashboardConfig;
  } {
    return this.exportService.exportConfiguration(this.layouts, this.config);
  }

  /**
   * Add custom layout
   */
  addLayout(layout: DashboardLayout): void {
    try {
      // Validate layout
      if (!layout.id || !layout.name) {
        throw new Error('Layout must have id and name');
      }

      this.layouts.set(layout.id, layout);

      logger.info('Custom layout added', {
        operation: 'dashboard-add-layout',
        metadata: {
          layoutId: layout.id,
          widgetCount: layout.widgets.length
        }
      });

    } catch (error) {
      logger.error('Failed to add layout', {
        operation: 'dashboard-add-layout-error',
        metadata: {
          layoutId: layout.id,
          error: String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Remove layout
   */
  removeLayout(layoutId: string): boolean {
    const success = this.layouts.delete(layoutId);
    
    if (success) {
      logger.info('Layout removed', {
        operation: 'dashboard-remove-layout',
        metadata: { layoutId }
      });
    }

    return success;
  }

  /**
   * Get dashboard status
   */
  getStatus(): {
    server: any;
    realtime: any;
    layouts: number;
    connections: number;
  } {
    return {
      server: this.serverService.getServerStatus(),
      realtime: this.realtimeService.getStatus(),
      layouts: this.layouts.size,
      connections: this.activeConnections.size
    };
  }

  /**
   * Force update for specific widget
   */
  forceWidgetUpdate(widgetId: string): boolean {
    const dashboard = this.analyticsEngine.generateDashboard();
    return this.realtimeService.forceWidgetUpdate(widgetId, this.layouts, dashboard);
  }

  /**
   * Cleanup and shutdown dashboard
   */
  shutdown(): void {
    try {
      // Stop real-time updates
      this.realtimeService.stopRealtimeUpdates();

      // Stop server
      this.serverService.stop().catch(error => {
        logger.warn('Error stopping server during shutdown', {
          error: String(error)
        });
      });

      // Clear connections
      this.activeConnections.clear();

      logger.info('Dashboard shutdown completed', {
        operation: 'dashboard-shutdown'
      });

    } catch (error) {
      logger.error('Error during dashboard shutdown', {
        operation: 'dashboard-shutdown-error',
        metadata: { error: String(error) }
      });
    }
  }
}

export default InteractiveMonitoringDashboard;
