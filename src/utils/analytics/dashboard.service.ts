/**
 * Analytics Dashboard Service
 * Generates real-time dashboards and visualization data
 */

import { AnalyticsDashboard, AnalyticsEvent } from './types.js';
import { AnalyticsMetricsService } from './metrics.service.js';
import { logger } from '../logger.js';

export class AnalyticsDashboardService {
  private metricsService: AnalyticsMetricsService;

  constructor(metricsService: AnalyticsMetricsService) {
    this.metricsService = metricsService;
  }

  /**
   * Generate comprehensive dashboard data
   */
  generateDashboard(events: AnalyticsEvent[], timeRange: number = 24): AnalyticsDashboard {
    try {
      const performanceMetrics = this.metricsService.processPerformanceEvents(events);
      
      return {
        overview: this.generateOverview(events),
        performance: {
          throughput: performanceMetrics.throughput,
          latency: {
            p50: this.calculateLatencyPercentile(events, 50),
            p90: this.calculateLatencyPercentile(events, 90),
            p95: this.calculateLatencyPercentile(events, 95),
            p99: this.calculateLatencyPercentile(events, 99)
          },
          cacheHitRate: performanceMetrics.cacheHitRate,
          resourceUtilization: performanceMetrics.resourceUsage
        },
        usage: this.generateUsageMetrics(events),
        realTime: this.generateRealTimeMetrics(events)
      };
    } catch (error) {
      logger.error('Failed to generate dashboard', { error: String(error) });
      return this.getDefaultDashboard();
    }
  }

  /**
   * Generate overview metrics
   */
  private generateOverview(events: AnalyticsEvent[]): AnalyticsDashboard['overview'] {
    const performanceEvents = events.filter(e => e.type === 'performance');
    const errorEvents = events.filter(e => e.type === 'error');

    // Count unique users from all events that have a userId
    const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean)).size;
    // Calculate active users (users with recent activity - within time range)
    const activeUsers = uniqueUsers; // For now, consider all users as active
    
    // Include both performance and response events for request metrics
    const requestEvents = events.filter(e => e.type === 'performance' || e.type === 'response');
    const totalRequests = requestEvents.length;
    const successfulRequests = requestEvents.filter(e => e.data.success === true).length;
    const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 1;

    const responseTimes = performanceEvents
      .map(e => e.data.duration as number)
      .filter(d => typeof d === 'number');
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    return {
      totalUsers: uniqueUsers,
      activeUsers: activeUsers,
      totalRequests,
      successRate,
      avgResponseTime,
      errorRate: totalRequests > 0 ? errorEvents.length / totalRequests : 0
    };
  }

  /**
   * Generate usage metrics
   */
  private generateUsageMetrics(events: AnalyticsEvent[]): AnalyticsDashboard['usage'] {
    const requestsByType = events.reduce((acc, event) => {
      const category = event.category || 'unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const userDistribution = events.reduce((acc, event) => {
      if (event.userId) {
        acc[event.userId] = (acc[event.userId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      requestsByType,
      userDistribution,
      timeBasedMetrics: this.generateTimeBasedMetrics(events),
      topGuilds: this.generateTopGuilds(events)
    };
  }

  /**
   * Generate real-time metrics
   */
  private generateRealTimeMetrics(events: AnalyticsEvent[]): AnalyticsDashboard['realTime'] {
    const recentEvents = events.filter(e => e.timestamp > Date.now() - 60000); // Last minute
    const currentRPS = recentEvents.length / 60;

    return {
      currentRPS,
      activeConnections: this.estimateActiveConnections(recentEvents),
      queueSize: this.estimateQueueSize(recentEvents),
      processingTime: this.calculateCurrentProcessingTime(recentEvents),
      alerts: this.generateCurrentAlerts(events)
    };
  }

  /**
   * Calculate latency percentile
   */
  private calculateLatencyPercentile(events: AnalyticsEvent[], percentile: number): number {
    const latencies = events
      .filter(e => e.type === 'performance' || e.type === 'response')
      .map(e => (e.data.duration || e.data.processingTime) as number)
      .filter(d => typeof d === 'number')
      .sort((a, b) => a - b);

    if (latencies.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * latencies.length) - 1;
    return latencies[Math.max(0, index)];
  }

  /**
   * Calculate active users in recent period
   */
  private calculateActiveUsers(userEvents: AnalyticsEvent[]): number {
    const recentEvents = userEvents.filter(e => e.timestamp > Date.now() - 3600000); // Last hour
    return new Set(recentEvents.map(e => e.userId).filter(Boolean)).size;
  }

  /**
   * Generate time-based metrics
   */
  private generateTimeBasedMetrics(events: AnalyticsEvent[]): Array<{
    hour: number;
    requests: number;
    users: number;
  }> {
    const hourlyData: Record<number, { requests: number; users: Set<string> }> = {};
    
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = { requests: 0, users: new Set() };
      }
      
      hourlyData[hour].requests++;
      if (event.userId) {
        hourlyData[hour].users.add(event.userId);
      }
    });

    return Object.entries(hourlyData).map(([hour, data]) => ({
      hour: parseInt(hour),
      requests: data.requests,
      users: data.users.size
    }));
  }

  /**
   * Generate top guilds by activity
   */
  private generateTopGuilds(events: AnalyticsEvent[]): Array<{
    guildId: string;
    requests: number;
    users: number;
  }> {
    const guildData: Record<string, { requests: number; users: Set<string> }> = {};
    
    events.forEach(event => {
      if (event.guildId) {
        if (!guildData[event.guildId]) {
          guildData[event.guildId] = { requests: 0, users: new Set() };
        }
        
        guildData[event.guildId].requests++;
        if (event.userId) {
          guildData[event.guildId].users.add(event.userId);
        }
      }
    });

    return Object.entries(guildData)
      .map(([guildId, data]) => ({
        guildId,
        requests: data.requests,
        users: data.users.size
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);
  }

  /**
   * Estimate active connections
   */
  private estimateActiveConnections(recentEvents: AnalyticsEvent[]): number {
    // Simplified estimation based on unique users in recent events
    const uniqueUsers = new Set(recentEvents.map(e => e.userId).filter(Boolean));
    return uniqueUsers.size;
  }

  /**
   * Estimate queue size
   */
  private estimateQueueSize(recentEvents: AnalyticsEvent[]): number {
    // Simplified estimation
    const processingEvents = recentEvents.filter(e => e.type === 'performance');
    return Math.max(0, processingEvents.length - 10);
  }

  /**
   * Calculate current processing time
   */
  private calculateCurrentProcessingTime(recentEvents: AnalyticsEvent[]): number {
    const processingEvents = recentEvents.filter(e => e.type === 'performance');
    const durations = processingEvents
      .map(e => e.data.duration as number)
      .filter(d => typeof d === 'number');
    
    if (durations.length === 0) return 0;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  /**
   * Generate current alerts
   */
  private generateCurrentAlerts(events: AnalyticsEvent[]): Array<{
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: number;
  }> {
    const alerts: Array<{
      type: string;
      message: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      timestamp: number;
    }> = [];

    // Check error rate
    const recentEvents = events.filter(e => e.timestamp > Date.now() - 300000); // Last 5 minutes
    const errorEvents = recentEvents.filter(e => e.type === 'error');
    const errorRate = recentEvents.length > 0 ? errorEvents.length / recentEvents.length : 0;

    if (errorRate > 0.1) {
      alerts.push({
        type: 'error_rate',
        message: `High error rate detected: ${(errorRate * 100).toFixed(1)}%`,
        severity: errorRate > 0.2 ? 'critical' : 'high',
        timestamp: Date.now()
      });
    }

    // Check response time
    const performanceEvents = recentEvents.filter(e => e.type === 'performance');
    const responseTimes = performanceEvents
      .map(e => e.data.duration as number)
      .filter(d => typeof d === 'number');
    
    if (responseTimes.length > 0) {
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      if (avgResponseTime > 5000) {
        alerts.push({
          type: 'slow_response',
          message: `Slow response times detected: ${avgResponseTime.toFixed(0)}ms average`,
          severity: avgResponseTime > 10000 ? 'critical' : 'medium',
          timestamp: Date.now()
        });
      }
    }

    return alerts;
  }

  /**
   * Get default dashboard when generation fails
   */
  private getDefaultDashboard(): AnalyticsDashboard {
    return {
      overview: {
        totalUsers: 0,
        activeUsers: 0,
        totalRequests: 0,
        successRate: 0,
        avgResponseTime: 0,
        errorRate: 0
      },
      performance: {
        throughput: 0,
        latency: { p50: 0, p90: 0, p95: 0, p99: 0 },
        cacheHitRate: 0,
        resourceUtilization: { memory: 0, cpu: 0, connections: 0 }
      },
      usage: {
        requestsByType: {},
        userDistribution: {},
        timeBasedMetrics: [],
        topGuilds: []
      },
      realTime: {
        currentRPS: 0,
        activeConnections: 0,
        queueSize: 0,
        processingTime: 0,
        alerts: []
      }
    };
  }
}
