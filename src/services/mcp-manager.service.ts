// Restore MCPManager class definition and export
export class MCPManager {
  private clients: Map<string, MCPClientWrapper> = new Map();
  private connectionAttempts: Map<string, number> = new Map();
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  /**
   * Initialize all enabled MCP servers
   */
  public async initialize(): Promise<void> {
    // ...existing code for initialization...
  }

  /**
   * Connect to a specific MCP server
   */
  private async connectServer(_name: string, _config: MCPServerConfig): Promise<void> {
    // ...existing code for connecting a server...
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
    return client.callTool({ name: toolName, arguments: params });
  }

  /**
   * Execute memory search across available memory servers
   */
  public async searchMemory(query: string): Promise<unknown> {
    const memoryServers = ['memory', 'knowledge_base'];
    for (const serverName of memoryServers) {
      const client = this.getClient(serverName);
      if (client) {
        try {
          return await this.callTool(serverName, 'search_memory', { query });
        } catch (error) {
          continue;
        }
      }
    }
    throw new Error('No memory servers available');
  }

  /**
   * Execute web search using available search servers
   */
  public async searchWeb(query: string, count: number = 5): Promise<unknown> {
    const searchServers = ['brave_search', 'web_search'];
    for (const serverName of searchServers) {
      const client = this.getClient(serverName);
      if (client) {
        try {
          return await this.callTool(serverName, 'web_search', { query, count });
        } catch (error) {
          continue;
        }
      }
    }
    throw new Error('No web search servers available');
  }

  /**
   * Extract content from URLs using available extraction servers
   */
  public async extractContent(urls: string[]): Promise<unknown> {
    const extractionServers = ['firecrawl', 'content_extraction'];
    for (const serverName of extractionServers) {
      const client = this.getClient(serverName);
      if (client) {
        try {
          return await this.callTool(serverName, 'extract_content', { urls });
        } catch (error) {
          continue;
        }
      }
    }
    throw new Error('No content extraction servers available');
  }

  /**
   * Get status of all MCP connections
   */
  public getStatus(): {
    totalServers: number;
    connectedServers: number;
    serverStatus: Record<string, { connected: boolean; phase: number; priority: string }>;
  } {
    // ...existing code for status...
    return {
      totalServers: 0,
      connectedServers: 0,
      serverStatus: {}
    };
  }

  /**
   * Gracefully shutdown all MCP connections
   */
  public async shutdown(): Promise<void> {
    // ...existing code for shutdown...
  }

  /**
   * Reconnect to failed servers
   */
  public async reconnectFailedServers(): Promise<void> {
    // ...existing code for reconnecting failed servers...
  }
}
export const mcpManager = new MCPManager();
/**
 * MCP Manager Service
 * Centralized management of all Model Context Protocol server connections
 * Implements the architectural patterns outlined in the MCP integration plan
 * Now using real MCP SDK instead of placeholder implementations
 */

import { MCPServerConfig } from '../config/mcp-servers.config.js';
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

// Real MCP Client wrapper for consistency with existing interface
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

  async listTools(): Promise<unknown> {
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
