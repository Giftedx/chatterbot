/**
 * Analytics Dashboard API Server
 * Provides REST endpoints for bot analytics and metrics
 */

import http from 'http';
import { logger } from '../utils/logger.js';
import { isLocalDBDisabled, getEnvAsBoolean } from '../utils/env.js';

const server: http.Server | null = null;
let metricsInterval: NodeJS.Timeout | null = null;
let dashboardInstance: AnalyticsDashboard | null = null;

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
  allowedOrigins: ['http://localhost:3000', 'http://localhost:3001'],
};

/**
 * Analytics Dashboard HTTP Server
 */
export class AnalyticsDashboard {
  private server: ReturnType<typeof http.createServer> | null = null;
  private config: DashboardConfig;

  constructor(config: Partial<DashboardConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the analytics dashboard server
   */
  start(): Promise<void> {
    // Try to bind to configured port; if in use, optionally fall back to next available port(s)
    const allowPortFallback = getEnvAsBoolean('ANALYTICS_DASHBOARD_PORT_FALLBACK', true);
    const maxAttempts = 10; // try up to +10 ports

    const attemptListen = (port: number, attemptsLeft: number): Promise<void> => {
      return new Promise((resolve, reject) => {
        this.server = http.createServer(this.handleRequest.bind(this));

        const onListening = () => {
          logger.info(`Analytics Dashboard API running on http://${this.config.host}:${port}`);
          // Update config.port to the actual bound port (in case of fallback)
          this.config.port = (this.server!.address() as any)?.port ?? port;
          resolve();
        };

        const onError = (error: any) => {
          // If the port is in use and fallback is allowed, try the next port
          if (
            allowPortFallback &&
            (error?.code === 'EADDRINUSE' || /EADDRINUSE/.test(String(error))) &&
            attemptsLeft > 0
          ) {
            logger.warn(`Port ${port} in use for Analytics Dashboard. Trying ${port + 1}...`);
            try {
              this.server?.removeListener('listening', onListening);
              this.server?.removeListener('error', onError);
              this.server?.close?.();
            } catch {}
            // Try next port
            attemptListen(port + 1, attemptsLeft - 1)
              .then(resolve)
              .catch(reject);
            return;
          }
          logger.error('Analytics Dashboard server error:', error);
          reject(error);
        };

        this.server.on('listening', onListening);
        this.server.on('error', onError);

        try {
          this.server.listen(port, this.config.host);
        } catch (err) {
          onError(err);
        }
      });
    };

    return attemptListen(this.config.port, maxAttempts);
  }

  /**
   * Stop the analytics dashboard server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('Analytics Dashboard API stopped');
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
      logger.error('Request handling error:', error);
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

      case '/api/metrics': {
        // Minimal metrics endpoint; extend as needed
        this.sendJson(res, { message: 'Metrics endpoint - extend as needed' });
        break;
      }

      case '/api/verification-metrics': {
        try {
          const { getVerificationMetrics } = await import(
            './verification/answer-verification.service.js'
          );
          const m = getVerificationMetrics();
          this.sendJson(res, m);
        } catch (e) {
          this.sendError(res, 500, 'Failed to load verification metrics');
        }
        break;
      }

      case '/api/decision-metrics': {
        try {
          const { getDecisionMetrics } = await import('./decision-metrics.service.js');
          const m = getDecisionMetrics();
          this.sendJson(res, m);
        } catch (e) {
          this.sendError(res, 500, 'Failed to load decision metrics');
        }
        break;
      }

      case '/api/telemetry': {
        try {
          const { modelTelemetryStore } = await import('./advanced-capabilities/index.js');
          const limit = parseInt(params.get('limit') || '20', 10);
          const data = modelTelemetryStore.snapshot(Math.max(1, Math.min(200, limit)));
          this.sendJson(res, data);
        } catch (e) {
          this.sendError(res, 500, 'Failed to load telemetry');
        }
        break;
      }

      case '/api/telemetry/db': {
        try {
          // In local DB-less mode, return an empty dataset instead of touching Prisma
          if (isLocalDBDisabled()) {
            const limit = Math.max(1, Math.min(200, parseInt(params.get('limit') || '50', 10)));
            const offset = Math.max(0, parseInt(params.get('offset') || '0', 10));
            this.sendJson(res, { items: [], limit, offset, disabled: true });
            break;
          }
          const { prisma } = await import('../db/prisma.js');
          const limit = Math.max(1, Math.min(200, parseInt(params.get('limit') || '50', 10)));
          const offset = Math.max(0, parseInt(params.get('offset') || '0', 10));
          const items = await prisma.modelSelection.findMany({
            orderBy: { timestamp: 'desc' },
            take: limit,
            skip: offset,
          });
          this.sendJson(res, { items, limit, offset });
        } catch (e) {
          this.sendError(res, 500, 'Failed to load DB telemetry');
        }
        break;
      }

      case '/api/kb-stats': {
        try {
          const { knowledgeBaseService } = await import('./knowledge-base.service.js');
          const stats = await knowledgeBaseService.getStats();
          this.sendJson(res, stats);
        } catch (e) {
          this.sendError(res, 500, 'Failed to load KB stats');
        }
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
  if (process.env.ENABLE_ANALYTICS_DASHBOARD !== 'true') return;

  // Start the full AnalyticsDashboard HTTP API instead of a placeholder server
  if (!dashboardInstance) {
    const port = parseInt(process.env.ANALYTICS_DASHBOARD_PORT || '3001', 10);
    dashboardInstance = new AnalyticsDashboard({ port });
    dashboardInstance
      .start()
      .then(() => {
        try {
          // Log the actual bound port (after any fallback adjustments)
          const boundPort = (dashboardInstance as any)?.['config']?.port ?? port;
          logger.info(`Analytics dashboard listening on :${boundPort}`);
        } catch {
          logger.info(`Analytics dashboard listening on :${port}`);
        }
      })
      .catch((err) => {
        logger.error('Failed to start analytics dashboard', err as Error);
      });
  }

  // Start periodic verification metrics logging every 15 minutes
  if (!metricsInterval) {
    metricsInterval = setInterval(
      async () => {
        try {
          const { getVerificationMetrics } = await import(
            './verification/answer-verification.service.js'
          );
          const m = getVerificationMetrics();
          logger.info('[VerificationMetrics] Snapshot', m as any);
        } catch (e) {
          logger.warn('Failed to emit verification metrics', { error: String(e) });
        }
      },
      15 * 60 * 1000,
    );
  }
}

export function stopAnalyticsDashboard(): void {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
  }
  if (dashboardInstance) {
    dashboardInstance
      .stop()
      .catch(() => {})
      .finally(() => {
        dashboardInstance = null;
      });
  }
}
