/**
 * Analytics Dashboard API Server
 * Provides REST endpoints for bot analytics and metrics
 */

import { createServer } from 'http';
import { URL } from 'url';
import { getDetailedStats, getUsageMetrics } from './analytics.js';

export interface DashboardConfig {
  port: number;
  host: string;
  enableCors: boolean;
  allowedOrigins: string[];
}

const DEFAULT_CONFIG: DashboardConfig = {
  port: 3001,
  host: '0.0.0.0',
  enableCors: true,
  allowedOrigins: ['http://localhost:3000', 'http://localhost:3001']
};

/**
 * Analytics Dashboard HTTP Server
 */
export class AnalyticsDashboard {
  private server: ReturnType<typeof createServer> | null = null;
  private config: DashboardConfig;

  constructor(config: Partial<DashboardConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the analytics dashboard server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer(this.handleRequest.bind(this));
      
      this.server.listen(this.config.port, this.config.host, () => {
        console.log(`📊 Analytics Dashboard API running on http://${this.config.host}:${this.config.port}`);
        resolve();
      });

      this.server.on('error', (error) => {
        console.error('Analytics Dashboard server error:', error);
        reject(error);
      });
    });
  }

  /**
   * Stop the analytics dashboard server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('📊 Analytics Dashboard API stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle incoming HTTP requests
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleRequest(req: any, res: any): Promise<void> {
    try {
      // CORS headers
      if (this.config.enableCors) {
        const origin = req.headers.origin;
        if (this.config.allowedOrigins.includes(origin)) {
          res.setHeader('Access-Control-Allow-Origin', origin);
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      }

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host}`);
      const path = url.pathname;
      const method = req.method;

      // Route handling
      if (method === 'GET') {
        await this.handleGetRequest(path, url.searchParams, res);
      } else {
        this.sendError(res, 405, 'Method Not Allowed');
      }

    } catch (error) {
      console.error('Request handling error:', error);
      this.sendError(res, 500, 'Internal Server Error');
    }
  }

  /**
   * Handle GET requests
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleGetRequest(path: string, params: URLSearchParams, res: any): Promise<void> {
    switch (path) {
      case '/':
      case '/health':
        this.sendJson(res, { status: 'ok', service: 'Analytics Dashboard API' });
        break;

      case '/api/stats': {
        const stats = await getDetailedStats();
        this.sendJson(res, stats);
        break;
      }

      case '/api/metrics': {
        const timeRange = params.get('timeRange') as 'today' | 'week' | 'month' | 'all' || 'all';
        const metrics = await getUsageMetrics(timeRange);
        this.sendJson(res, metrics);
        break;
      }

      case '/api/overview': {
        const [overviewStats, overviewMetrics] = await Promise.all([
          getDetailedStats(),
          getUsageMetrics('today')
        ]);
        
        this.sendJson(res, {
          summary: {
            totalCommands: overviewStats.total,
            commandsToday: overviewStats.commandsToday,
            successRate: overviewStats.successRate,
            activeUsers: overviewStats.topUsers.length,
            activeGuilds: overviewStats.topGuilds.length
          },
          todayMetrics: overviewMetrics,
          trends: {
            hourlyDistribution: overviewStats.hourlyDistribution,
            dailyTrend: overviewStats.dailyTrend.slice(-7) // Last 7 days
          }
        });
        break;
      }

      default:
        this.sendError(res, 404, 'Not Found');
    }
  }

  /**
   * Send JSON response
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sendJson(res: any, data: any, statusCode = 200): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }

  /**
   * Send error response
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sendError(res: any, statusCode: number, message: string): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message, statusCode }));
  }
}

// Default instance
export const analyticsDashboard = new AnalyticsDashboard();

/**
 * Start analytics dashboard if environment variable is set
 */
export function startAnalyticsDashboardIfEnabled(): void {
  if (process.env.ENABLE_ANALYTICS_DASHBOARD === 'true') {
    const port = process.env.ANALYTICS_DASHBOARD_PORT ? parseInt(process.env.ANALYTICS_DASHBOARD_PORT) : 3001;
    
    const dashboard = new AnalyticsDashboard({ port });
    dashboard.start().catch(error => {
      console.error('Failed to start analytics dashboard:', error);
    });
  }
}
