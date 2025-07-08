/**
 * Server Service
 * Handles web server setup and HTTP request routing for the dashboard
 */

import { WebServerOptions, ClientConnection } from './types.js';
import { logger } from '../logger.js';

export class ServerService {
  private connections: Set<ClientConnection> = new Set();
  private isRunning = false;
  private options: WebServerOptions;

  constructor(options: WebServerOptions) {
    this.options = options;
  }

  /**
   * Start the dashboard web server
   */
  async start(): Promise<void> {
    try {
      // In a real implementation, this would start an Express server or similar
      // For this modular service, we'll simulate the server functionality
      
      this.isRunning = true;

      logger.info('Dashboard web server started', {
        operation: 'dashboard-server-start',
        metadata: {
          port: this.options.port,
          corsEnabled: this.options.cors.enabled,
          authEnabled: this.options.auth.enabled,
          allowedOrigins: this.options.cors.origins
        }
      });

    } catch (error) {
      logger.error('Failed to start dashboard server', {
        operation: 'dashboard-server-start-error',
        metadata: { 
          error: String(error),
          port: this.options.port
        }
      });
      throw error;
    }
  }

  /**
   * Stop the dashboard web server
   */
  async stop(): Promise<void> {
    try {
      this.isRunning = false;
      
      // Disconnect all clients
      this.connections.clear();

      logger.info('Dashboard web server stopped', {
        operation: 'dashboard-server-stop'
      });

    } catch (error) {
      logger.error('Error stopping dashboard server', {
        operation: 'dashboard-server-stop-error',
        metadata: { error: String(error) }
      });
      throw error;
    }
  }

  /**
   * Handle HTTP requests (simplified simulation)
   */
  async handleRequest(
    method: string,
    path: string,
    query: Record<string, string> = {},
    headers: Record<string, string> = {}
  ): Promise<{ status: number; data: unknown; headers: Record<string, string> }> {
    try {
      // CORS handling
      const responseHeaders: Record<string, string> = {};
      
      if (this.options.cors.enabled) {
        const origin = headers.origin;
        if (origin && this.options.cors.origins.includes(origin)) {
          responseHeaders['Access-Control-Allow-Origin'] = origin;
        }
        responseHeaders['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
        responseHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
      }

      // Authentication check
      if (this.options.auth.enabled && this.options.auth.token) {
        const authHeader = headers.authorization;
        if (!authHeader || !authHeader.includes(this.options.auth.token)) {
          return {
            status: 401,
            data: { error: 'Unauthorized' },
            headers: responseHeaders
          };
        }
      }

      // Handle preflight requests
      if (method === 'OPTIONS') {
        return {
          status: 200,
          data: {},
          headers: responseHeaders
        };
      }

      // Route handling
      if (method === 'GET') {
        return this.handleGetRequest(path, query, responseHeaders);
      }

      return {
        status: 405,
        data: { error: 'Method Not Allowed' },
        headers: responseHeaders
      };

    } catch (error) {
      logger.error('Request handling error', {
        operation: 'dashboard-request-error',
        metadata: {
          method,
          path,
          error: String(error)
        }
      });

      return {
        status: 500,
        data: { error: 'Internal Server Error' },
        headers: {}
      };
    }
  }

  /**
   * Handle GET requests
   */
  private async handleGetRequest(
    path: string,
    query: Record<string, string>,
    headers: Record<string, string>
  ): Promise<{ status: number; data: unknown; headers: Record<string, string> }> {
    
    switch (path) {
      case '/':
      case '/health':
        return {
          status: 200,
          data: { 
            status: 'ok', 
            service: 'Monitoring Dashboard API',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
          },
          headers
        };

      case '/api/layouts':
        return {
          status: 200,
          data: { layouts: [] }, // Would be populated by the main service
          headers
        };

      case '/api/widgets': {
        const layoutId = query.layout;
        return {
          status: 200,
          data: { 
            widgets: [],
            layoutId: layoutId || 'overview'
          },
          headers
        };
      }

      case '/api/config':
        return {
          status: 200,
          data: {
            config: {
              port: this.options.port,
              cors: this.options.cors,
              features: {
                realTimeCharts: true,
                exportData: true,
                alerts: true,
                userAnalytics: true
              }
            }
          },
          headers
        };

      case '/api/status':
        return {
          status: 200,
          data: {
            server: {
              running: this.isRunning,
              connections: this.connections.size,
              uptime: process.uptime()
            }
          },
          headers
        };

      default:
        return {
          status: 404,
          data: { error: 'Not Found' },
          headers
        };
    }
  }

  /**
   * Add a client connection
   */
  addConnection(connectionId: string): ClientConnection {
    const connection: ClientConnection = {
      id: connectionId,
      connected: true,
      lastActivity: Date.now()
    };

    this.connections.add(connection);

    logger.debug('Client connected to dashboard', {
      operation: 'dashboard-client-connect',
      metadata: {
        connectionId,
        totalConnections: this.connections.size
      }
    });

    return connection;
  }

  /**
   * Remove a client connection
   */
  removeConnection(connectionId: string): void {
    const connection = Array.from(this.connections).find(c => c.id === connectionId);
    if (connection) {
      this.connections.delete(connection);

      logger.debug('Client disconnected from dashboard', {
        operation: 'dashboard-client-disconnect',
        metadata: {
          connectionId,
          totalConnections: this.connections.size
        }
      });
    }
  }

  /**
   * Update connection activity
   */
  updateConnectionActivity(connectionId: string): void {
    const connection = Array.from(this.connections).find(c => c.id === connectionId);
    if (connection) {
      connection.lastActivity = Date.now();
    }
  }

  /**
   * Get active connections
   */
  getActiveConnections(): ClientConnection[] {
    return Array.from(this.connections);
  }

  /**
   * Clean up stale connections
   */
  cleanupStaleConnections(maxIdleTime: number = 300000): void { // 5 minutes default
    const now = Date.now();
    const staleConnections = Array.from(this.connections).filter(
      connection => now - connection.lastActivity > maxIdleTime
    );

    staleConnections.forEach(connection => {
      this.connections.delete(connection);
      logger.debug('Removed stale connection', {
        operation: 'dashboard-cleanup-stale',
        metadata: {
          connectionId: connection.id,
          idleTime: now - connection.lastActivity
        }
      });
    });

    if (staleConnections.length > 0) {
      logger.info('Cleaned up stale connections', {
        operation: 'dashboard-cleanup-complete',
        metadata: {
          removedConnections: staleConnections.length,
          activeConnections: this.connections.size
        }
      });
    }
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get server status
   */
  getServerStatus(): {
    running: boolean;
    connections: number;
    uptime: number;
    options: WebServerOptions;
  } {
    return {
      running: this.isRunning,
      connections: this.connections.size,
      uptime: process.uptime(),
      options: this.options
    };
  }
}
