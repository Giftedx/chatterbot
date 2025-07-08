/**
 * Health Check Endpoint
 * Provides system status for monitoring and deployment verification
 */

import { createServer } from 'http';
import { logger } from './utils/logger.js';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  environment: string;
  version: string;
  features: {
    discord: boolean;
    gemini: boolean;
    database: boolean;
    moderation: boolean;
  };
}

export class HealthCheck {
  private server: any;
  private port: number;

  constructor(port = 3000) {
    this.port = port;
    this.server = createServer(this.handleRequest.bind(this));
  }

  private async handleRequest(req: any, res: any) {
    if (req.url === '/health' && req.method === 'GET') {
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
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
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
        discord: !!process.env.BOT_TOKEN,
        gemini: !!process.env.GEMINI_API_KEY,
        database: !!process.env.DATABASE_URL,
        moderation: true // Always enabled as it's built-in
      }
    };
  }

  start(): void {
    this.server.listen(this.port, () => {
      logger.info(`Health check server running on port ${this.port}`);
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
    }
  }
}

// Export singleton instance
export const healthCheck = new HealthCheck(); 