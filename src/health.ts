/**
 * Health Check Endpoint
 * Provides system status for monitoring and deployment verification
 */

import { createServer, type IncomingMessage, type ServerResponse, type Server as HttpServer } from 'http';
import { logger } from './utils/logger.js';
import { modelTelemetryStore, providerHealthStore } from './services/advanced-capabilities/index.js';

let totalRequests = 0;
let healthRequests = 0;
let metricsRequests = 0;

/**
 * Detailed report of the system's operational status.
 */
interface HealthStatus {
  /** Overall system health identifier. */
  status: 'healthy' | 'unhealthy';
  /** ISO timestamp of the check. */
  timestamp: string;
  /** Process uptime in seconds. */
  uptime: number;
  /** Memory usage statistics (in MB). */
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  /** Deployment environment name (e.g., 'production'). */
  environment: string;
  /** Current application version. */
  version: string;
  /** Status of critical dependencies. */
  features: {
    discord: boolean;
    gemini: boolean;
    database: boolean;
    moderation: boolean;
  };
  /** Deep-dive metrics for AI providers. */
  providers?: {
    health: ReturnType<typeof providerHealthStore.snapshot>;
    recent: ReturnType<typeof modelTelemetryStore.snapshot>;
  };
}

/**
 * Lightweight HTTP server for health checking and metrics exposure.
 *
 * Endpoints:
 * - `GET /health`: Returns a JSON status report.
 * - `GET /metrics`: Returns Prometheus-formatted metrics.
 */
export class HealthCheck {
  private server: HttpServer;
  private port: number;
  private isStarted: boolean = false;

  /**
   * Creates a new health check server.
   * @param port - The port to listen on (default: env.HEALTH_CHECK_PORT or 3000).
   */
  constructor(port = Number(process.env.HEALTH_CHECK_PORT ?? 3000)) {
    this.port = port;
    this.server = createServer(this.handleRequest.bind(this));
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse) {
    totalRequests++;
    if (req.url === '/health' && req.method === 'GET') {
      healthRequests++;
      try {
        const healthStatus = await this.getHealthStatus();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(healthStatus, null, 2));
      } catch (error) {
        logger.error('Health check failed:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'unhealthy', 
          error: 'Health check failed' 
        }));
      }
      return;
    }

    if (req.url === '/metrics' && req.method === 'GET') {
      metricsRequests++;
      const mem = process.memoryUsage();
      const lines = [
        '# HELP app_process_uptime_seconds Process uptime in seconds',
        '# TYPE app_process_uptime_seconds gauge',
        `app_process_uptime_seconds ${process.uptime()}`,
        '# HELP app_process_heap_used_bytes Heap used in bytes',
        '# TYPE app_process_heap_used_bytes gauge',
        `app_process_heap_used_bytes ${mem.heapUsed}`,
        '# HELP app_process_heap_total_bytes Heap total in bytes',
        '# TYPE app_process_heap_total_bytes gauge',
        `app_process_heap_total_bytes ${mem.heapTotal}`,
        '# HELP app_requests_total Total HTTP requests to health server',
        '# TYPE app_requests_total counter',
        `app_requests_total ${totalRequests}`,
        '# HELP app_health_requests_total Total /health requests',
        '# TYPE app_health_requests_total counter',
        `app_health_requests_total ${healthRequests}`,
        '# HELP app_metrics_requests_total Total /metrics requests',
        '# TYPE app_metrics_requests_total counter',
        `app_metrics_requests_total ${metricsRequests}`
      ];
      res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
      res.end(lines.join('\n'));
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  }

  private async getHealthStatus(): Promise<HealthStatus> {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(usedMem / 1024 / 1024),
        total: Math.round(totalMem / 1024 / 1024),
        percentage: Math.round((usedMem / totalMem) * 100)
      },
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '0.1.0',
      features: {
        discord: !!process.env.DISCORD_TOKEN,
        gemini: !!process.env.GEMINI_API_KEY,
        database: !!process.env.DATABASE_URL,
        moderation: true // Always enabled as it's built-in
      },
      providers: {
        health: providerHealthStore.snapshot(),
        recent: modelTelemetryStore.snapshot(20)
      }
    };
  }

  /**
   * Starts the HTTP server.
   * Automatically attempts to bind to the next available port if the configured one is in use.
   */
  start(): void {
    if (this.isStarted) {
      logger.warn('Health check server already started');
      return;
    }

    this.server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.warn(`Port ${this.port} is already in use, trying next port...`);
        this.port += 1;
        setTimeout(() => this.start(), 100);
      } else {
        logger.error('Health check server error:', error);
      }
    });

    this.server.listen(this.port, () => {
      this.isStarted = true;
      logger.info(`Health check server running on port ${this.port}`);
    });
  }

  /**
   * Stops the HTTP server.
   */
  stop(): void {
    if (this.server && this.isStarted) {
      this.server.close();
      this.isStarted = false;
    }
  }
}

// Export singleton instance
export const healthCheck = new HealthCheck(); 