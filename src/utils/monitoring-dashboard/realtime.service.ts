/**
 * Real-time Service
 * Handles real-time data updates and client notifications for the dashboard
 */

import { DashboardWidget, DashboardLayout, ClientConnection } from './types.js';
import { WidgetService } from './widget.service.js';
import { AnalyticsDashboard } from '../analytics-engine.js';
import { logger } from '../logger.js';

export class RealtimeService {
  private widgetService: WidgetService;
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor(widgetService: WidgetService) {
    this.widgetService = widgetService;
  }

  /**
   * Start real-time updates for dashboard layouts
   */
  startRealtimeUpdates(
    layouts: Map<string, DashboardLayout>,
    updateInterval: number,
    analyticsProvider: () => AnalyticsDashboard
  ): void {
    if (this.isRunning) {
      logger.warn('Real-time updates already running');
      return;
    }

    this.isRunning = true;

    // Start global update interval
    const globalInterval = setInterval(() => {
      this.updateAllLayouts(layouts, analyticsProvider());
    }, updateInterval);

    this.updateIntervals.set('global', globalInterval);

    // Start individual widget intervals for different refresh rates
    layouts.forEach(layout => {
      layout.widgets.forEach(widget => {
        if (widget.config.autoRefresh && widget.config.refreshInterval !== updateInterval) {
          this.startWidgetSpecificUpdates(widget, analyticsProvider);
        }
      });
    });

    logger.info('Real-time updates started', {
      operation: 'realtime-start',
      metadata: {
        layouts: layouts.size,
        updateInterval,
        intervals: this.updateIntervals.size
      }
    });
  }

  /**
   * Stop all real-time updates
   */
  stopRealtimeUpdates(): void {
    if (!this.isRunning) {
      return;
    }

    this.updateIntervals.forEach((interval, key) => {
      clearInterval(interval);
      logger.debug('Cleared update interval', { intervalKey: key });
    });

    this.updateIntervals.clear();
    this.isRunning = false;

    logger.info('Real-time updates stopped', {
      operation: 'realtime-stop'
    });
  }

  /**
   * Update all layouts with fresh data
   */
  private updateAllLayouts(
    layouts: Map<string, DashboardLayout>,
    dashboard: AnalyticsDashboard
  ): void {
    try {
      layouts.forEach((layout) => {
        layout.widgets.forEach(widget => {
          this.widgetService.updateWidget(widget, dashboard);
        });
      });

      logger.debug('All layouts updated', {
        operation: 'realtime-update-all',
        metadata: {
          layoutCount: layouts.size,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      logger.error('Failed to update all layouts', {
        operation: 'realtime-update-error',
        metadata: { error: String(error) }
      });
    }
  }

  /**
   * Start widget-specific update intervals
   */
  private startWidgetSpecificUpdates(
    widget: DashboardWidget,
    analyticsProvider: () => AnalyticsDashboard
  ): void {
    const interval = setInterval(() => {
      try {
        const dashboard = analyticsProvider();
        this.widgetService.updateWidget(widget, dashboard);
      } catch (error) {
        logger.error('Widget-specific update failed', {
          operation: 'realtime-widget-update-error',
          metadata: {
            widgetId: widget.id,
            error: String(error)
          }
        });
      }
    }, widget.config.refreshInterval);

    this.updateIntervals.set(`widget-${widget.id}`, interval);

    logger.debug('Widget-specific updates started', {
      operation: 'realtime-widget-start',
      metadata: {
        widgetId: widget.id,
        refreshInterval: widget.config.refreshInterval
      }
    });
  }

  /**
   * Notify connected clients of data updates
   */
  notifyClients(
    connections: Set<ClientConnection>,
    updateData: {
      type: 'widget_update' | 'layout_update' | 'alert' | 'system_status';
      layoutId?: string;
      widgetId?: string;
      data: unknown;
      timestamp: number;
    }
  ): void {
    try {
      const activeConnections = Array.from(connections).filter(conn => conn.connected);

      let successCount = 0;
      const failedConnections: ClientConnection[] = [];

      activeConnections.forEach(connection => {
        try {
          // In a real implementation, this would use WebSockets or Server-Sent Events
          // For now, we'll simulate the notification
          
          // Simulated send: connection.send(message);
          connection.lastActivity = Date.now();
          successCount++;

        } catch (error) {
          failedConnections.push(connection);
          logger.warn('Failed to notify client', {
            operation: 'realtime-notify-error',
            metadata: {
              connectionId: connection.id,
              error: String(error)
            }
          });
        }
      });

      // Remove failed connections
      failedConnections.forEach(connection => {
        connection.connected = false;
        connections.delete(connection);
      });

      logger.debug('Client notifications sent', {
        operation: 'realtime-notify-complete',
        metadata: {
          updateType: updateData.type,
          totalConnections: activeConnections.length,
          successfulNotifications: successCount,
          failedConnections: failedConnections.length
        }
      });

    } catch (error) {
      logger.error('Failed to notify clients', {
        operation: 'realtime-notify-error',
        metadata: { error: String(error) }
      });
    }
  }

  /**
   * Broadcast system alert to all connected clients
   */
  broadcastAlert(
    connections: Set<ClientConnection>,
    alert: {
      type: string;
      message: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      timestamp: number;
    }
  ): void {
    this.notifyClients(connections, {
      type: 'alert',
      data: alert,
      timestamp: Date.now()
    });

    logger.info('Alert broadcasted to clients', {
      operation: 'realtime-alert-broadcast',
      metadata: {
        alertType: alert.type,
        severity: alert.severity,
        connections: connections.size
      }
    });
  }

  /**
   * Send layout update to clients
   */
  broadcastLayoutUpdate(
    connections: Set<ClientConnection>,
    layoutId: string,
    layoutData: DashboardLayout
  ): void {
    this.notifyClients(connections, {
      type: 'layout_update',
      layoutId,
      data: layoutData,
      timestamp: Date.now()
    });

    logger.debug('Layout update broadcasted', {
      operation: 'realtime-layout-broadcast',
      metadata: {
        layoutId,
        widgetCount: layoutData.widgets.length,
        connections: connections.size
      }
    });
  }

  /**
   * Send widget update to clients
   */
  broadcastWidgetUpdate(
    connections: Set<ClientConnection>,
    widgetId: string,
    widgetData: DashboardWidget
  ): void {
    this.notifyClients(connections, {
      type: 'widget_update',
      widgetId,
      data: widgetData,
      timestamp: Date.now()
    });

    logger.debug('Widget update broadcasted', {
      operation: 'realtime-widget-broadcast',
      metadata: {
        widgetId,
        widgetType: widgetData.type,
        connections: connections.size
      }
    });
  }

  /**
   * Send system status update to clients
   */
  broadcastSystemStatus(
    connections: Set<ClientConnection>,
    status: {
      uptime: number;
      activeUsers: number;
      performance: Record<string, unknown>;
      alerts: Array<unknown>;
    }
  ): void {
    this.notifyClients(connections, {
      type: 'system_status',
      data: status,
      timestamp: Date.now()
    });

    logger.debug('System status broadcasted', {
      operation: 'realtime-status-broadcast',
      metadata: {
        uptime: status.uptime,
        activeUsers: status.activeUsers,
        alertCount: status.alerts.length,
        connections: connections.size
      }
    });
  }

  /**
   * Get real-time service status
   */
  getStatus(): {
    running: boolean;
    activeIntervals: number;
    intervals: string[];
  } {
    return {
      running: this.isRunning,
      activeIntervals: this.updateIntervals.size,
      intervals: Array.from(this.updateIntervals.keys())
    };
  }

  /**
   * Force update for specific widget
   */
  forceWidgetUpdate(
    widgetId: string,
    layouts: Map<string, DashboardLayout>,
    dashboard: AnalyticsDashboard
  ): boolean {
    try {
      for (const layout of layouts.values()) {
        const widget = layout.widgets.find(w => w.id === widgetId);
        if (widget) {
          this.widgetService.updateWidget(widget, dashboard);
          
          logger.debug('Forced widget update completed', {
            operation: 'realtime-force-update',
            metadata: { widgetId }
          });
          
          return true;
        }
      }

      logger.warn('Widget not found for forced update', {
        operation: 'realtime-force-update-not-found',
        metadata: { widgetId }
      });

      return false;

    } catch (error) {
      logger.error('Forced widget update failed', {
        operation: 'realtime-force-update-error',
        metadata: {
          widgetId,
          error: String(error)
        }
      });

      return false;
    }
  }
}
