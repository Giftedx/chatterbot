/**
 * MCP Manager Service - Real MCP SDK Implementation
 * Centralized management of all Model Context Protocol server connections
 * Implements the architectural patterns outlined in the MCP integration plan
 */

import { MCPServerConfig, getEnabledServers, validateServerConfig } from '../config/mcp-servers.config.js';
import { logger } from '../utils/logger.js';

// Import real MCP SDK types and classes
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { 
  Implementation, 
  ServerCapabilities, 
  CallToolRequest,
  ListToolsRequest
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Real MCP Client wrapper for consistency with existing interface
 */
export class MCPClientWrapper {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private serverConfig: MCPServerConfig;
  private connected = false;

  constructor(clientInfo: Implementation, serverConfig: MCPServerConfig) {
    this.client = new Client(clientInfo, {
      capabilities: {
        // Define client capabilities
        tools: {},
        resources: { subscribe: true },
        prompts: {},
        logging: {}
      }
    });
    this.serverConfig = serverConfig;
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // Create stdio transport for local MCP servers
      this.transport = new StdioClientTransport({
        command: this.serverConfig.command,
        args: this.serverConfig.args,
        env: this.filterEnv(this.serverConfig.env)
      });

      // Connect to the MCP server
      await this.client.connect(this.transport);
      this.connected = true;

      logger.info('MCP Client connected successfully', {
        operation: 'mcp-connect',
        metadata: { 
          serverName: this.serverConfig.description,
          command: this.serverConfig.command,
          capabilities: this.client.getServerCapabilities()
        }
      });

    } catch (error) {
      logger.error('MCP Client connection failed', {
        operation: 'mcp-connect',
        metadata: { 
          serverConfig: this.serverConfig,
          error: String(error)
        }
      });
      throw error;
    }
  }

  async callTool(params: { name: string; arguments?: Record<string, unknown> }): Promise<unknown> {
    if (!this.connected) {
      throw new Error('MCP Client not connected');
    }

    try {
      const callParams: CallToolRequest['params'] = {
        name: params.name,
        arguments: params.arguments || {}
      };

      const result = await this.client.callTool(callParams);
      return result;

    } catch (error) {
      logger.error('MCP Tool call failed', {
        operation: 'mcp-tool-call',
        metadata: { 
          toolName: params.name,
          error: String(error)
        }
      });
      throw error;
    }
  }

  async listTools(): Promise<any> {
    if (!this.connected) {
      throw new Error('MCP Client not connected');
    }

    try {
      const listParams: ListToolsRequest['params'] = {};
      const result = await this.client.listTools(listParams);
      return result;

    } catch (error) {
      logger.error('MCP List tools failed', {
        operation: 'mcp-list-tools',
        metadata: { error: String(error) }
      });
      throw error;
    }
  }

  getServerCapabilities(): ServerCapabilities | undefined {
    return this.client.getServerCapabilities();
  }

  getServerVersion(): Implementation | undefined {
    return this.client.getServerVersion();
  }

  async close(): Promise<void> {
    if (this.transport && this.connected) {
      try {
        await this.transport.close();
        this.connected = false;
        
        logger.info('MCP Client disconnected', {
          operation: 'mcp-disconnect',
          metadata: { serverConfig: this.serverConfig.description }
        });
      } catch (error) {
        logger.warn('Error closing MCP client', {
          operation: 'mcp-disconnect',
          metadata: { error: String(error) }
        });
      }
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private filterEnv(env: Record<string, string | undefined>): Record<string, string> {
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined && value !== null) {
        filtered[key] = value;
      }
    }
    return filtered;
  }
}

/**
 * MCP Manager - Central coordination of all MCP server connections
 * Now using real MCP SDK integration
 */
export class MCPManager {
  private clients: Map<string, MCPClientWrapper> = new Map();
  private connectionAttempts: Map<string, number> = new Map();
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  /**
   * Initialize all enabled MCP servers
   */
  public async initialize(): Promise<void> {
    const enabledServers = getEnabledServers();
    
    logger.info('Initializing MCP Manager', {
      operation: 'mcp-manager-init',
      metadata: { 
        serverCount: Object.keys(enabledServers).length,
        servers: Object.keys(enabledServers)
      }
    });

    const connectionPromises = Object.entries(enabledServers).map(
      ([name, config]) => this.connectServer(name, config)
    );

    // Wait for all connections to complete (some may fail)
    await Promise.allSettled(connectionPromises);

    const connectedCount = Array.from(this.clients.values())
      .filter(client => client.isConnected()).length;

    logger.info('MCP Manager initialization complete', {
      operation: 'mcp-manager-init',
      metadata: { 
        totalServers: Object.keys(enabledServers).length,
        connectedServers: connectedCount
      }
    });
  }

  /**
   * Connect to a specific MCP server with retry logic
   */
  private async connectServer(name: string, config: MCPServerConfig): Promise<void> {
    const attempts = this.connectionAttempts.get(name) || 0;
    
    if (attempts >= this.maxRetries) {
      logger.warn('Max retry attempts reached for MCP server', {
        operation: 'mcp-connect',
        metadata: { serverName: name, attempts }
      });
      return;
    }

    try {
      // Validate server configuration
      const validationResult = validateServerConfig(config);
      if (!validationResult.isValid) {
        logger.error('Invalid MCP server configuration', {
          operation: 'mcp-connect',
          metadata: { 
            serverName: name, 
            errors: validationResult.errors 
          }
        });
        return;
      }

      // Create client wrapper with real MCP SDK
      const clientInfo: Implementation = {
        name: 'discord-gemini-bot',
        version: '1.0.0'
      };

      const client = new MCPClientWrapper(clientInfo, config);
      
      // Attempt connection
      await client.connect();
      
      // Store successful connection
      this.clients.set(name, client);
      this.connectionAttempts.delete(name);

      logger.info('MCP Server connected successfully', {
        operation: 'mcp-connect',
        metadata: { 
          serverName: name,
          phase: config.phase,
          priority: config.priority,
          capabilities: client.getServerCapabilities()
        }
      });

    } catch (error) {
      const newAttempts = attempts + 1;
      this.connectionAttempts.set(name, newAttempts);

      logger.warn('MCP Server connection failed', {
        operation: 'mcp-connect',
        metadata: { 
          serverName: name,
          attempt: newAttempts,
          maxRetries: this.maxRetries,
          error: String(error)
        }
      });

      // Retry with exponential backoff
      if (newAttempts < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, newAttempts - 1);
        logger.info(`Retrying MCP connection in ${delay}ms`, {
          operation: 'mcp-connect-retry',
          metadata: { serverName: name, delay }
        });
        
        setTimeout(() => {
          this.connectServer(name, config).catch(err => 
            logger.error('Retry failed', { serverName: name, error: String(err) })
          );
        }, delay);
      }
    }
  }

  /**
   * Get connected MCP client by server name
   */
  public getClient(serverName: string): MCPClientWrapper | undefined {
    return this.clients.get(serverName);
  }

  /**
   * Call a tool on a specific MCP server
   */
  public async callTool(
    serverName: string, 
    toolName: string, 
    params: Record<string, unknown> = {}
  ): Promise<unknown> {
    const client = this.getClient(serverName);
    
    if (!client) {
      throw new Error(`MCP Server '${serverName}' not found or not connected`);
    }

    if (!client.isConnected()) {
      throw new Error(`MCP Server '${serverName}' is not connected`);
    }

    try {
      const result = await client.callTool({
        name: toolName,
        arguments: params,
      });

      logger.info('MCP Tool executed successfully', {
        operation: 'mcp-tool-call',
        metadata: { 
          serverName,
          toolName,
          success: true
        }
      });

      return result;

    } catch (error) {
      logger.error('MCP Tool execution failed', {
        operation: 'mcp-tool-call',
        metadata: { 
          serverName,
          toolName,
          error: String(error)
        }
      });

      throw error;
    }
  }

  /**
   * List available tools from a specific server
   */
  public async listTools(serverName: string): Promise<any> {
    const client = this.getClient(serverName);
    
    if (!client) {
      throw new Error(`MCP Server '${serverName}' not found or not connected`);
    }

    if (!client.isConnected()) {
      throw new Error(`MCP Server '${serverName}' is not connected`);
    }

    try {
      const result = await client.listTools();
      return result;
    } catch (error) {
      logger.error('Failed to list MCP tools', {
        operation: 'mcp-list-tools',
        metadata: { serverName, error: String(error) }
      });
      throw error;
    }
  }

  /**
   * Get status of all MCP connections
   */
  public getStatus(): {
    totalServers: number;
    connectedServers: number;
    serverStatus: Record<string, {
      connected: boolean;
      phase: number;
      priority: string;
      capabilities?: any;
    }>;
  } {
    const enabledServers = getEnabledServers();
    const status: any = {
      totalServers: Object.keys(enabledServers).length,
      connectedServers: 0,
      serverStatus: {}
    };

    for (const [name, config] of Object.entries(enabledServers)) {
      const client = this.clients.get(name);
      const connected = client?.isConnected() || false;
      
      if (connected) {
        status.connectedServers++;
      }

      status.serverStatus[name] = {
        connected,
        phase: config.phase,
        priority: config.priority,
        capabilities: client?.getServerCapabilities()
      };
    }

    return status;
  }

  /**
   * Gracefully shutdown all MCP connections
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down MCP Manager', {
      operation: 'mcp-manager-shutdown',
      metadata: { clientCount: this.clients.size }
    });

    const shutdownPromises = Array.from(this.clients.values()).map(
      client => client.close().catch(err => 
        logger.warn('Error closing MCP client', { error: String(err) })
      )
    );

    await Promise.allSettled(shutdownPromises);
    
    this.clients.clear();
    this.connectionAttempts.clear();

    logger.info('MCP Manager shutdown complete', {
      operation: 'mcp-manager-shutdown'
    });
  }
}

// Export singleton instance
export const mcpManager = new MCPManager();