/**
 * Unified Analytics Service
 * 
 * Consolidates AnalyticsService and AnalyticsDashboard functionality
 * following the refactoring guide principles and merge intervals pattern.
 * 
 * Replaces:
 * - AnalyticsService (src/services/analytics.ts)
 * - AnalyticsDashboard (src/services/analytics-dashboard.ts)
 */

import { createServer } from 'http';
import { URL } from 'url';
import { prisma } from '../../db/prisma.js';

// Consolidated interfaces
export interface InteractionLog {
  guildId: string | null;
  userId: string;
  command: string;
  isSuccess: boolean;
}

export interface DetailedStats {
  total: number;
  commandsToday: number;
  commandsThisWeek: number;
  commandsThisMonth: number;
  perUser: Record<string, number>;
  perGuild: Record<string, number>;
  perCommand: Record<string, number>;
  successRate: number;
  topUsers: Array<{ userId: string; count: number }>;
  topGuilds: Array<{ guildId: string; count: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
  dailyTrend: Array<{ date: string; count: number }>;
}

export interface UsageMetrics {
  timeRange: 'today' | 'week' | 'month' | 'all';
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  uniqueUsers: number;
  uniqueGuilds: number;
  averageCommandsPerUser: number;
  mostActiveHour: number;
  mostActiveDay: string;
  commandBreakdown: Record<string, number>;
}

export interface DashboardConfig {
  port: number;
  host: string;
  enableCors: boolean;
  allowedOrigins: string[];
}

export interface AnalyticsOptions {
  enableDashboard?: boolean;
  dashboardConfig?: Partial<DashboardConfig>;
  enableRealTimeMetrics?: boolean;
  retentionDays?: number;
}

/**
 * Unified Analytics Service
 * Combines data collection, metrics tracking, performance monitoring, and dashboard functionality
 */
export class UnifiedAnalyticsService {
  private server: ReturnType<typeof createServer> | null = null;
  private dashboardConfig: DashboardConfig;
  private options: AnalyticsOptions;
  private metricsCache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 60000; // 1 minute cache

  constructor(options: AnalyticsOptions = {}) {
    this.options = {
      enableDashboard: true,
      enableRealTimeMetrics: true,
      retentionDays: 90,
      ...options
    };

    this.dashboardConfig = {
      port: 3001,
      host: '0.0.0.0',
      enableCors: true,
      allowedOrigins: ['http://localhost:3000', 'http://localhost:3001'],
      ...options.dashboardConfig
    };
  }

  // Backward-compatibility shim for tests expecting logMessage
  async logMessage(params: { guildId?: string | null; userId: string; command: string; isSuccess: boolean }): Promise<void> {
    return this.logInteraction({
      guildId: params.guildId ?? null,
      userId: params.userId,
      command: params.command,
      isSuccess: params.isSuccess
    });
  }

  /**
   * Log interaction event (core analytics functionality)
   */
  async logInteraction({ guildId, userId, command, isSuccess }: InteractionLog): Promise<void> {
    try {
      await prisma.analyticsEvent.create({ 
        data: { 
          guildId: guildId ?? undefined, 
          userId, 
          command, 
          isSuccess,
          timestamp: new Date()
        } 
      });

      // Invalidate relevant caches
      this.invalidateMetricsCache(['detailed-stats', 'usage-metrics-today', 'usage-metrics-week', 'usage-metrics-month', 'usage-metrics-all']);
      
    } catch (error) {
      console.error('Failed to log interaction:', error);
    }
  }

  /**
   * Get comprehensive statistics
   */
  async getDetailedStats(): Promise<DetailedStats> {
    const cached = this.getCachedMetrics('detailed-stats');
    if (cached) return cached;

    try {
      const events = await prisma.analyticsEvent.findMany({
        orderBy: { timestamp: 'desc' }
      });

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Calculate metrics
      const total = events.length;
      const commandsToday = events.filter((e: any) => e.timestamp >= today).length;
      const commandsThisWeek = events.filter((e: any) => e.timestamp >= thisWeek).length;
      const commandsThisMonth = events.filter((e: any) => e.timestamp >= thisMonth).length;
      
      const successfulEvents = events.filter((e: any) => e.isSuccess);
      const successRate = total > 0 ? (successfulEvents.length / total) * 100 : 0;

      // Aggregate data
      const perUser: Record<string, number> = {};
      const perGuild: Record<string, number> = {};
      const perCommand: Record<string, number> = {};
      const hourlyDistribution = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));

      events.forEach((event: any) => {
        // User stats
        perUser[event.userId] = (perUser[event.userId] || 0) + 1;
        
        // Guild stats
        if (event.guildId) {
          perGuild[event.guildId] = (perGuild[event.guildId] || 0) + 1;
        }
        
        // Command stats
        perCommand[event.command] = (perCommand[event.command] || 0) + 1;
        
        // Hourly distribution
        const hour = event.timestamp.getHours();
        hourlyDistribution[hour].count++;
      });

      // Top users and guilds
      const topUsers = Object.entries(perUser)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([userId, count]) => ({ userId, count: count as number }));

      const topGuilds = Object.entries(perGuild)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([guildId, count]) => ({ guildId, count: count as number }));

      // Daily trend (last 30 days)
      const dailyTrend = this.calculateDailyTrend(events, 30);

      const stats: DetailedStats = {
        total,
        commandsToday,
        commandsThisWeek,
        commandsThisMonth,
        perUser,
        perGuild,
        perCommand,
        successRate,
        topUsers,
        topGuilds,
        hourlyDistribution,
        dailyTrend
      };

      this.setCachedMetrics('detailed-stats', stats);
      return stats;

    } catch (error) {
      console.error('Failed to get detailed stats:', error);
      throw error;
    }
  }

  /**
   * Get usage metrics for specific time range
   */
  async getUsageMetrics(timeRange: 'today' | 'week' | 'month' | 'all' = 'week'): Promise<UsageMetrics> {
    const cacheKey = `usage-metrics-${timeRange}`;
    const cached = this.getCachedMetrics(cacheKey);
    if (cached) return cached;

    try {
      const timeFilter = this.getTimeFilter(timeRange);
      const events = await prisma.analyticsEvent.findMany({
        where: timeFilter ? { timestamp: { gte: timeFilter } } : {},
        orderBy: { timestamp: 'desc' }
      });

      const totalCommands = events.length;
      const successfulCommands = events.filter((e: any) => e.isSuccess).length;
      const failedCommands = totalCommands - successfulCommands;
      
      const uniqueUsers = new Set(events.map((e: any) => e.userId)).size;
      const uniqueGuilds = new Set(events.map((e: any) => e.guildId).filter(Boolean)).size;
      
      const averageCommandsPerUser = uniqueUsers > 0 ? totalCommands / uniqueUsers : 0;
      
      // Find most active hour and day
      const hourCounts = new Array(24).fill(0);
      const dayCounts: Record<string, number> = {};
      
      events.forEach((event: any) => {
        const hour = event.timestamp.getHours();
        hourCounts[hour]++;
        
        const day = event.timestamp.toDateString();
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      
      const mostActiveHour = hourCounts.indexOf(Math.max(...hourCounts));
      const mostActiveDay = Object.entries(dayCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || '';

      // Command breakdown
      const commandBreakdown: Record<string, number> = {};
      events.forEach((event: any) => {
        commandBreakdown[event.command] = (commandBreakdown[event.command] || 0) + 1;
      });

      const metrics: UsageMetrics = {
        timeRange,
        totalCommands,
        successfulCommands,
        failedCommands,
        uniqueUsers,
        uniqueGuilds,
        averageCommandsPerUser,
        mostActiveHour,
        mostActiveDay,
        commandBreakdown
      };

      this.setCachedMetrics(cacheKey, metrics);
      return metrics;

    } catch (error) {
      console.error('Failed to get usage metrics:', error);
      throw error;
    }
  }

  /**
   * Start analytics dashboard server (consolidated dashboard functionality)
   */
  async startDashboard(): Promise<void> {
    if (!this.options.enableDashboard) {
      console.log('📊 Analytics Dashboard disabled');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server = createServer(this.handleDashboardRequest.bind(this));
      
      this.server.listen(this.dashboardConfig.port, this.dashboardConfig.host, () => {
        console.log(`📊 Unified Analytics Dashboard running on http://${this.dashboardConfig.host}:${this.dashboardConfig.port}`);
        resolve();
      });

      this.server.on('error', (error) => {
        console.error('Analytics Dashboard server error:', error);
        reject(error);
      });
    });
  }

  /**
   * Stop analytics dashboard server
   */
  async stopDashboard(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.log('📊 Analytics Dashboard stopped');
          resolve();
        });
      });
    }
  }

  /**
   * Handle HTTP requests for analytics dashboard
   */
  private async handleDashboardRequest(req: any, res: any): Promise<void> {
    // CORS headers
    if (this.dashboardConfig.enableCors) {
      const origin = req.headers.origin;
      if (this.dashboardConfig.allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const path = url.pathname;

      res.setHeader('Content-Type', 'application/json');

      switch (path) {
        case '/stats': {
          const stats = await this.getDetailedStats();
          res.writeHead(200);
          res.end(JSON.stringify(stats));
          break;
        }

        case '/usage': {
          const timeRange = (url.searchParams.get('range') as any) || 'week';
          const usage = await this.getUsageMetrics(timeRange);
          res.writeHead(200);
          res.end(JSON.stringify(usage));
          break;
        }

        case '/health': {
          res.writeHead(200);
          res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
          break;
        }

        default:
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Endpoint not found' }));
      }
    } catch (error) {
      console.error('Dashboard request error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  /**
   * Clean up old analytics data
   */
  async cleanupOldData(): Promise<void> {
    if (!this.options.retentionDays) return;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.options.retentionDays);

      const deleted = await prisma.analyticsEvent.deleteMany({
        where: {
          timestamp: { lt: cutoffDate }
        }
      });

      console.log(`🧹 Cleaned up ${deleted.count} old analytics events`);
    } catch (error) {
      console.error('Failed to cleanup old analytics data:', error);
    }
  }

  // Helper methods
  private getTimeFilter(timeRange: string): Date | null {
    const now = new Date();
    switch (timeRange) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      default:
        return null;
    }
  }

  private calculateDailyTrend(events: any[], days: number): Array<{ date: string; count: number }> {
    const dailyCounts: Record<string, number> = {};
    
    events.forEach((event: any) => {
      const date = event.timestamp.toDateString();
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    const trend = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      trend.push({ date: dateStr, count: dailyCounts[dateStr] || 0 });
    }

    return trend;
  }

  private getCachedMetrics(key: string): any | null {
    const cached = this.metricsCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedMetrics(key: string, data: any): void {
    this.metricsCache.set(key, { data, timestamp: Date.now() });
  }

  private invalidateMetricsCache(keys: string[]): void {
    keys.forEach(key => this.metricsCache.delete(key));
  }
}

// Singleton instance for easy import
export let unifiedAnalyticsService = new UnifiedAnalyticsService();