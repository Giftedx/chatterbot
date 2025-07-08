/**
 * Analytics Engine - Main Orchestrator
 * Modularized version that coordinates all analytics capabilities
 */

import { AnalyticsEvent, AnalyticsDashboard, AlertRule, MetricSnapshot } from './types.js';

// Import modular services
import { AnalyticsEventCollectionService } from './event-collection.service.js';
import { AnalyticsMetricsService } from './metrics.service.js';
import { AnalyticsDashboardService } from './dashboard.service.js';

import { logger } from '../logger.js';

/**
 * Real-Time Analytics Engine
 * Provides comprehensive real-time analytics, monitoring, and insights
 * for Discord Gemini Bot performance optimization and user behavior analysis.
 */
export class AnalyticsEngine {
  
  // Modular services
  private eventCollectionService: AnalyticsEventCollectionService;
  private metricsService: AnalyticsMetricsService;
  private dashboardService: AnalyticsDashboardService;
  
  // Event storage and alerting
  private events: AnalyticsEvent[] = [];
  private alertRules: AlertRule[] = [];
  private readonly maxEventHistory = 10000;

  constructor() {
    this.eventCollectionService = new AnalyticsEventCollectionService();
    this.metricsService = new AnalyticsMetricsService();
    this.dashboardService = new AnalyticsDashboardService(this.metricsService);
    
    this.initializeDefaultAlertRules();
    this.startEventProcessing();
  }

  /**
   * Track a new analytics event
   */
  track(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): void {
    // Create full event with ID and timestamp
    const fullEvent: AnalyticsEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    
    // Store in local events array
    this.events.push(fullEvent);
    
    // Maintain event history limit
    if (this.events.length > this.maxEventHistory) {
      this.events = this.events.slice(-this.maxEventHistory);
    }
    
    // Also track with collection service
    this.eventCollectionService.track(event);
  }

  /**
   * Track a new analytics event (backward compatibility alias)
   */
  trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): string {
    // Create full event with ID and timestamp
    const fullEvent: AnalyticsEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    
    // Store in local events array
    this.events.push(fullEvent);
    
    // Maintain event history limit
    if (this.events.length > this.maxEventHistory) {
      this.events = this.events.slice(-this.maxEventHistory);
    }
    
    // Also track with collection service
    this.eventCollectionService.track(event);
    
    return fullEvent.id;
  }

  /**
   * Track user interaction
   */
  trackUserInteraction(
    userId: string,
    guildId: string | undefined,
    action: string,
    data: Record<string, unknown> = {}
  ): void {
    this.eventCollectionService.trackUserInteraction(userId, guildId, action, data);
  }

  /**
   * Track performance metric
   */
  trackPerformance(
    operation: string,
    duration: number,
    success: boolean,
    data: Record<string, unknown> = {}
  ): void {
    this.eventCollectionService.trackPerformance(operation, duration, success, data);
  }

  /**
   * Track error event
   */
  trackError(
    error: Error,
    context: Record<string, unknown> = {},
    userId?: string,
    guildId?: string
  ): void {
    this.eventCollectionService.trackError(error, context, userId, guildId);
  }

  /**
   * Track system event
   */
  trackSystem(event: string, data: Record<string, unknown> = {}): void {
    this.eventCollectionService.trackSystem(event, data);
  }

  /**
   * Generate real-time dashboard
   */
  generateDashboard(timeRange: number = 24): AnalyticsDashboard {
    const recentEvents = this.getRecentEvents(timeRange);
    return this.dashboardService.generateDashboard(recentEvents);
  }

  /**
   * Get metrics snapshot for a category
   */
  getMetricsSnapshot(category: string): MetricSnapshot | null {
    const recentEvents = this.getRecentEvents(1); // Last hour
    const categoryEvents = recentEvents.filter(e => e.category === category);
    
    if (categoryEvents.length === 0) return null;

    const metrics = this.extractMetricsFromEvents(categoryEvents);
    return this.metricsService.createMetricSnapshot(category, metrics);
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(category?: string, hours?: number): MetricSnapshot[] {
    return this.metricsService.getMetricsHistory(category, hours);
  }

  /**
   * Calculate trends for a metric
   */
  calculateTrends(category: string, metric: string, hours: number = 24) {
    return this.metricsService.calculateTrends(category, metric, hours);
  }

  /**
   * Detect anomalies in metrics
   */
  detectAnomalies(category: string, metric: string, hours: number = 24) {
    return this.metricsService.detectAnomalies(category, metric, hours);
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
    logger.info('Alert rule added', { ruleId: rule.id, metric: rule.metric });
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const index = this.alertRules.findIndex(r => r.id === ruleId);
    if (index >= 0) {
      this.alertRules.splice(index, 1);
      logger.info('Alert rule removed', { ruleId });
      return true;
    }
    return false;
  }

  /**
   * Get current alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * Generate summary statistics
   */
  generateSummaryStatistics(hours: number = 24) {
    return this.metricsService.generateSummaryStatistics(hours);
  }

  /**
   * Export analytics data
   */
  exportData(options: { includeEvents?: boolean; includeMetrics?: boolean } = {}): {
    dashboard: AnalyticsDashboard;
    events?: AnalyticsEvent[];
    timestamp: number;
  } {
    const dashboard = this.generateDashboard();
    const result: {
      dashboard: AnalyticsDashboard;
      events?: AnalyticsEvent[];
      timestamp: number;
    } = {
      dashboard,
      timestamp: Date.now()
    };

    if (options.includeEvents) {
      result.events = this.getRecentEvents(24); // Last 24 hours
    }

    return result;
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.eventCollectionService.getBufferSize();
  }

  /**
   * Manually flush events
   */
  flush(): void {
    this.eventCollectionService.flush();
  }

  /**
   * Clean shutdown
   */
  shutdown(): void {
    this.eventCollectionService.shutdown();
    logger.info('Analytics engine shutdown complete');
  }

  // Private methods

  private initializeDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        type: 'threshold',
        metric: 'error_rate',
        condition: { operator: 'gt', value: 0.1 },
        severity: 'high',
        enabled: true,
        actions: [{ type: 'notification', config: {} }]
      },
      {
        id: 'slow_response_time',
        name: 'Slow Response Time',
        type: 'threshold',
        metric: 'avg_response_time',
        condition: { operator: 'gt', value: 5000 },
        severity: 'medium',
        enabled: true,
        actions: [{ type: 'notification', config: {} }]
      }
    ];

    this.alertRules.push(...defaultRules);
  }

  private startEventProcessing(): void {
    // Set up periodic event processing
    setInterval(() => {
      this.processRecentEvents();
    }, 30000); // Every 30 seconds
  }

  private processRecentEvents(): void {
    try {
      const recentEvents = this.getRecentEvents(0.5); // Last 30 minutes
      
      // Check alert rules on recent events
      this.checkAlertRules(recentEvents);

    } catch (error) {
      logger.error('Failed to process recent events', { error: String(error) });
    }
  }

  private getRecentEvents(hours: number): AnalyticsEvent[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.events.filter(e => e.timestamp >= cutoff);
  }

  private extractMetricsFromEvents(events: AnalyticsEvent[]): Record<string, number> {
    const metrics: Record<string, number> = {};
    
    events.forEach(event => {
      // Extract numeric values from event data
      Object.entries(event.data).forEach(([key, value]) => {
        if (typeof value === 'number') {
          metrics[key] = (metrics[key] || 0) + value;
        }
      });
    });

    return metrics;
  }

  private checkAlertRules(events: AnalyticsEvent[]): void {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      try {
        const shouldAlert = this.evaluateAlertRule(rule, events);
        if (shouldAlert) {
          this.triggerAlert(rule, events);
        }
      } catch (error) {
        logger.error('Failed to evaluate alert rule', {
          ruleId: rule.id,
          error: String(error)
        });
      }
    }
  }

  private evaluateAlertRule(rule: AlertRule, events: AnalyticsEvent[]): boolean {
    // Simplified rule evaluation
    const relevantEvents = events.filter(e => e.category === rule.metric || e.type === rule.metric);
    
    if (relevantEvents.length === 0) return false;

    // Calculate current metric value
    let currentValue = 0;
    
    switch (rule.metric) {
      case 'error_rate': {
        const errorEvents = events.filter(e => e.type === 'error');
        currentValue = events.length > 0 ? errorEvents.length / events.length : 0;
        break;
      }
        
      case 'avg_response_time': {
        const performanceEvents = events.filter(e => e.type === 'performance');
        const durations = performanceEvents
          .map(e => e.data.duration as number)
          .filter(d => typeof d === 'number');
        currentValue = durations.length > 0 
          ? durations.reduce((a, b) => a + b, 0) / durations.length 
          : 0;
        break;
      }
        
      default: {
        // Generic metric extraction
        const values = relevantEvents
          .map(e => e.data[rule.metric] as number)
          .filter(v => typeof v === 'number');
        currentValue = values.length > 0 
          ? values.reduce((a, b) => a + b, 0) / values.length 
          : 0;
      }
    }

    // Evaluate condition
    const { operator, value } = rule.condition;
    switch (operator) {
      case 'gt': return currentValue > value;
      case 'gte': return currentValue >= value;
      case 'lt': return currentValue < value;
      case 'lte': return currentValue <= value;
      case 'eq': return currentValue === value;
      default: return false;
    }
  }

  private triggerAlert(rule: AlertRule, events: AnalyticsEvent[]): void {
    logger.warn('Alert triggered', {
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      eventCount: events.length
    });

    // Execute alert actions
    for (const action of rule.actions) {
      try {
        this.executeAlertAction(action, rule, events);
      } catch (error) {
        logger.error('Failed to execute alert action', {
          ruleId: rule.id,
          actionType: action.type,
          error: String(error)
        });
      }
    }
  }

  private executeAlertAction(
    action: { type: string; config: Record<string, unknown> },
    rule: AlertRule,
    events: AnalyticsEvent[]
  ): void {
    switch (action.type) {
      case 'notification':
        logger.info('Alert notification', {
          rule: rule.name,
          severity: rule.severity,
          eventCount: events.length
        });
        break;
        
      case 'webhook':
        // Would implement webhook call here
        logger.info('Webhook alert triggered', { ruleId: rule.id });
        break;
        
      case 'auto_scale':
        // Would implement auto-scaling logic here
        logger.info('Auto-scale triggered', { ruleId: rule.id });
        break;
        
      default:
        logger.warn('Unknown alert action type', { actionType: action.type });
    }
  }
}
