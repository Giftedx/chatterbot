/**
 * MCP Tool Registry Service
 * 
 * Centralized registry and discovery system for all MCP tools.
 * Provides intelligent tool selection, capability discovery, and performance monitoring.
 */

import { MCPToolResult } from './types.js';
import { logger } from '../../utils/logger.js';

export interface MCPToolDefinition {
  id: string;
  name: string;
  category: 'memory' | 'search' | 'content' | 'reasoning' | 'automation' | 'communication' | 'database' | 'ai';
  priority: 'critical' | 'high' | 'medium' | 'low';
  capabilities: string[];
  requiredEnvVars?: string[];
  dependencies?: string[];
  executorFunction: (params: Record<string, unknown>) => Promise<MCPToolResult>;
  healthCheck?: () => Promise<boolean>;
  metadata: {
    description: string;
    version: string;
    author: string;
    installComplexity: 'easy' | 'medium' | 'hard';
    performance: {
      avgResponseTime: number;
      reliability: number;
      lastHealthCheck?: Date;
    };
  };
}

export interface MCPToolExecutionContext {
  userId: string;
  channelId: string;
  messageContent: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requiredCapabilities: string[];
  fallbackAllowed: boolean;
  timeoutMs?: number;
}

export interface MCPRegistryStatus {
  totalTools: number;
  availableTools: number;
  healthyTools: number;
  categoriesAvailable: string[];
  lastHealthCheck: Date;
  performanceMetrics: {
    averageResponseTime: number;
    totalExecutions: number;
    successRate: number;
  };
}

export class MCPToolRegistryService {
  private tools = new Map<string, MCPToolDefinition>();
  private executionMetrics = new Map<string, { 
    executions: number; 
    successes: number; 
    totalTime: number; 
    lastExecution: Date;
  }>();
  private lastHealthCheck = new Date();

  constructor() {
    this.initializeDefaultTools();
    logger.info('MCP Tool Registry initialized', {
      operation: 'registry-init',
      metadata: { toolCount: this.tools.size }
    });
  }

  /**
   * Register a new MCP tool
   */
  registerTool(tool: MCPToolDefinition): void {
    this.tools.set(tool.id, tool);
    this.executionMetrics.set(tool.id, {
      executions: 0,
      successes: 0,
      totalTime: 0,
      lastExecution: new Date()
    });

    logger.info('MCP tool registered', {
      operation: 'tool-registration',
      metadata: { 
        toolId: tool.id, 
        category: tool.category, 
        priority: tool.priority 
      }
    });
  }

  /**
   * Discover tools by capability requirements
   */
  discoverTools(context: MCPToolExecutionContext): MCPToolDefinition[] {
    const availableTools = Array.from(this.tools.values())
      .filter(tool => this.isToolAvailable(tool))
      .filter(tool => this.hasRequiredCapabilities(tool, context.requiredCapabilities))
      .sort((a, b) => this.calculateToolScore(b, context) - this.calculateToolScore(a, context));

    logger.debug('Tools discovered', {
      operation: 'tool-discovery',
      metadata: { 
        requestedCapabilities: context.requiredCapabilities,
        availableTools: availableTools.length,
        topTool: availableTools[0]?.id
      }
    });

    return availableTools;
  }

  /**
   * Execute a tool with performance monitoring
   */
  async executeTool(toolId: string, params: Record<string, unknown>, context: MCPToolExecutionContext): Promise<MCPToolResult> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found in registry`);
    }

    const startTime = Date.now();
    const metrics = this.executionMetrics.get(toolId)!;

    try {
      // Set timeout if specified
      const timeout = context.timeoutMs || 30000;
      const timeoutPromise = new Promise<MCPToolResult>((_, reject) => 
        setTimeout(() => reject(new Error('Tool execution timeout')), timeout)
      );

      const result = await Promise.race([
        tool.executorFunction(params),
        timeoutPromise
      ]);

      // Update metrics
      const executionTime = Date.now() - startTime;
      metrics.executions++;
      metrics.totalTime += executionTime;
      metrics.lastExecution = new Date();

      if (result.success) {
        metrics.successes++;
      }

      // Update tool performance metadata
      tool.metadata.performance.avgResponseTime = metrics.totalTime / metrics.executions;
      tool.metadata.performance.reliability = metrics.successes / metrics.executions;

      logger.info('MCP tool executed', {
        operation: 'tool-execution',
        metadata: {
          toolId,
          success: result.success,
          executionTime,
          reliability: tool.metadata.performance.reliability
        }
      });

      return result;

    } catch (error) {
      metrics.executions++;
      metrics.lastExecution = new Date();

      logger.error('MCP tool execution failed', {
        operation: 'tool-execution',
        metadata: { 
          toolId, 
          error: String(error),
          executionTime: Date.now() - startTime
        }
      });

      return {
        success: false,
        error: `Tool ${toolId} execution failed: ${error}`,
        toolUsed: toolId,
        requiresExternalMCP: tool.metadata.description.includes('external')
      };
    }
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: MCPToolDefinition['category']): MCPToolDefinition[] {
    return Array.from(this.tools.values()).filter(tool => tool.category === category);
  }

  /**
   * Get registry status and health
   */
  getRegistryStatus(): MCPRegistryStatus {
    const tools = Array.from(this.tools.values());
    const healthyTools = tools.filter(tool => 
      tool.metadata.performance.reliability > 0.8 || 
      tool.metadata.performance.lastHealthCheck === undefined
    );

    const categories = [...new Set(tools.map(tool => tool.category))];
    
    // Calculate performance metrics
    const totalExecutions = Array.from(this.executionMetrics.values())
      .reduce((sum, metrics) => sum + metrics.executions, 0);
    const totalSuccesses = Array.from(this.executionMetrics.values())
      .reduce((sum, metrics) => sum + metrics.successes, 0);
    const totalTime = Array.from(this.executionMetrics.values())
      .reduce((sum, metrics) => sum + metrics.totalTime, 0);

    return {
      totalTools: tools.length,
      availableTools: tools.filter(tool => this.isToolAvailable(tool)).length,
      healthyTools: healthyTools.length,
      categoriesAvailable: categories,
      lastHealthCheck: this.lastHealthCheck,
      performanceMetrics: {
        averageResponseTime: totalExecutions > 0 ? totalTime / totalExecutions : 0,
        totalExecutions,
        successRate: totalExecutions > 0 ? totalSuccesses / totalExecutions : 1
      }
    };
  }

  /**
   * Run health checks on all tools
   */
  async runHealthChecks(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    this.lastHealthCheck = new Date();

    for (const [toolId, tool] of this.tools.entries()) {
      if (tool.healthCheck) {
        try {
          const isHealthy = await tool.healthCheck();
          results.set(toolId, isHealthy);
          tool.metadata.performance.lastHealthCheck = new Date();

          logger.debug('Tool health check completed', {
            operation: 'health-check',
            metadata: { toolId, isHealthy }
          });
        } catch (error) {
          results.set(toolId, false);
          logger.warn('Tool health check failed', {
            operation: 'health-check',
            metadata: { toolId, error: String(error) }
          });
        }
      } else {
        // No health check - assume healthy if recently used successfully
        const metrics = this.executionMetrics.get(toolId);
        const recentlyUsed = metrics && 
          (Date.now() - metrics.lastExecution.getTime()) < 3600000; // 1 hour
        const hasGoodReliability = metrics && metrics.successes > 0;
        
        results.set(toolId, !!(recentlyUsed && hasGoodReliability));
      }
    }

    logger.info('Health checks completed', {
      operation: 'health-check',
      metadata: { 
        totalTools: this.tools.size,
        healthyTools: Array.from(results.values()).filter(Boolean).length
      }
    });

    return results;
  }

  /**
   * Get tool execution metrics
   */
  getToolMetrics(toolId: string): { 
    executions: number; 
    successes: number; 
    reliability: number;
    avgResponseTime: number;
  } | null {
    const metrics = this.executionMetrics.get(toolId);
    const tool = this.tools.get(toolId);
    
    if (!metrics || !tool) return null;

    return {
      executions: metrics.executions,
      successes: metrics.successes,
      reliability: tool.metadata.performance.reliability,
      avgResponseTime: tool.metadata.performance.avgResponseTime
    };
  }

  // Private helper methods
  private isToolAvailable(tool: MCPToolDefinition): boolean {
    // Check if required environment variables are present
    if (tool.requiredEnvVars) {
      for (const envVar of tool.requiredEnvVars) {
        if (!process.env[envVar]) {
          return false;
        }
      }
    }

    // Check if tool is healthy
    const metrics = this.executionMetrics.get(tool.id);
    if (metrics && metrics.executions > 5 && tool.metadata.performance.reliability < 0.5) {
      return false; // Tool is consistently failing
    }

    return true;
  }

  private hasRequiredCapabilities(tool: MCPToolDefinition, requiredCapabilities: string[]): boolean {
    // If no capabilities required, match all tools
    if (requiredCapabilities.length === 0) {
      return true;
    }

    // Tool with wildcard capability matches everything
    if (tool.capabilities.includes('*')) {
      return true;
    }

    // Check if tool has at least one of the required capabilities
    // This is more flexible than requiring ALL capabilities
    return requiredCapabilities.some(capability => 
      tool.capabilities.includes(capability)
    );
  }

  private calculateToolScore(tool: MCPToolDefinition, context: MCPToolExecutionContext): number {
    let score = 0;

    // Priority score
    const priorityScores = { critical: 100, high: 75, medium: 50, low: 25 };
    score += priorityScores[tool.priority];

    // Context priority bonus
    if (tool.priority === context.priority) {
      score += 50;
    }

    // Reliability score
    score += tool.metadata.performance.reliability * 100;

    // Performance score (lower response time is better)
    const responseTime = tool.metadata.performance.avgResponseTime;
    if (responseTime > 0) {
      score += Math.max(0, 100 - (responseTime / 100)); // Penalty for slow tools
    }

    // Category matching bonus
    const contextCategories = this.inferCategoriesFromCapabilities(context.requiredCapabilities);
    if (contextCategories.includes(tool.category)) {
      score += 25;
    }

    return score;
  }

  private inferCategoriesFromCapabilities(capabilities: string[]): MCPToolDefinition['category'][] {
    const categoryMap: Record<string, MCPToolDefinition['category'][]> = {
      'memory': ['memory'],
      'remember': ['memory'],
      'search': ['search', 'content'],
      'web': ['search', 'content'],
      'browse': ['automation', 'content'],
      'think': ['reasoning'],
      'analyze': ['reasoning', 'ai'],
      'extract': ['content'],
      'download': ['content'],
      'database': ['database'],
      'sql': ['database'],
      'chat': ['communication'],
      'message': ['communication']
    };

    const categories = new Set<MCPToolDefinition['category']>();
    
    for (const capability of capabilities) {
      const lowerCapability = capability.toLowerCase();
      for (const [keyword, cats] of Object.entries(categoryMap)) {
        if (lowerCapability.includes(keyword)) {
          cats.forEach(cat => categories.add(cat));
        }
      }
    }

    return Array.from(categories);
  }

  private async initializeDefaultTools(): Promise<void> {
    // This will be populated with actual tool registrations
    // For now, we set up the structure for dynamic tool registration
    logger.info('Default MCP tools initialization completed', {
      operation: 'registry-init',
      metadata: { phase: 'default-tools-ready' }
    });
  }
}

// Export singleton instance
export const mcpRegistry = new MCPToolRegistryService();
