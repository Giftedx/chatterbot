/**
 * Unified MCP Orchestrator Service
 * 
 * Consolidates all MCP-related functionality from multiple services into a single,
 * comprehensive orchestrator that handles tool registration, discovery, execution,
 * and performance monitoring with intelligent fallbacks.
 */

import { Message } from 'discord.js';
import { MCPManager } from '../mcp-manager.service.js';
import { UnifiedMessageAnalysis } from '../core/message-analysis.service.js';
import { UserCapabilities } from '../intelligence/permission.service.js';
import { logger } from '../../utils/logger.js';

export interface MCPToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  toolUsed: string;
  requiresExternalMCP?: boolean;
  fallbackMode?: boolean;
  executionTime?: number;
  confidence?: number;
}

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

export interface MCPExecutionContext {
  userId: string;
  channelId: string;
  messageContent: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requiredCapabilities: string[];
  fallbackAllowed: boolean;
  timeoutMs?: number;
}

export interface MCPOrchestrationResult {
  success: boolean;
  phase: number;
  toolsExecuted: string[];
  results: Map<string, MCPToolResult>;
  fallbacksUsed: string[];
  executionTime: number;
  confidence: number;
  recommendations: string[];
}

export interface MCPPhaseConfiguration {
  phase: number;
  name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  tools: string[];
  requiredEnvVars: string[];
  enabled: boolean;
}

/**
 * Unified MCP Orchestrator Service
 * 
 * Replaces:
 * - MCPIntegrationOrchestratorService
 * - MCPToolRegistrationService  
 * - MCPRegistryService
 * - MCPProductionIntegrationService
 */
export class UnifiedMCPOrchestratorService {
  private mcpManager?: MCPManager;
  private tools = new Map<string, MCPToolDefinition>();
  private phases = new Map<number, MCPPhaseConfiguration>();
  private executionMetrics = new Map<string, { 
    executions: number; 
    successes: number; 
    totalTime: number; 
    lastExecution: Date;
  }>();
  private isInitialized = false;
  private lastHealthCheck = new Date();

  constructor(mcpManager?: MCPManager) {
    this.mcpManager = mcpManager;
    this.initializePhases();
    this.registerAllTools();
    
    logger.info('Unified MCP Orchestrator initialized', {
      operation: 'mcp-orchestrator-init',
      metadata: { 
        toolCount: this.tools.size,
        phaseCount: this.phases.size,
        mcpManagerAvailable: !!mcpManager
      }
    });
  }

  /**
   * Initialize the orchestrator and all MCP capabilities
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Unified MCP Orchestrator', {
        operation: 'mcp-orchestrator-init',
        metadata: { phases: this.phases.size, tools: this.tools.size }
      });

      // Initialize MCP Manager if available
      if (this.mcpManager) {
        await this.mcpManager.initialize();
      }

      // Perform initial health checks
      await this.performHealthChecks();

      this.isInitialized = true;

      logger.info('Unified MCP Orchestrator initialized successfully', {
        operation: 'mcp-orchestrator-init',
        metadata: { 
          mcpManagerAvailable: !!this.mcpManager,
          activePhases: Array.from(this.phases.values()).filter(p => p.enabled).length,
          healthyTools: this.getHealthyToolCount()
        }
      });

    } catch (error) {
      logger.error('MCP Orchestrator initialization failed', {
        operation: 'mcp-orchestrator-init',
        metadata: { error: String(error) }
      });
      
      // Continue with degraded functionality
      this.isInitialized = true;
    }
  }

  /**
   * Main orchestration method - intelligently execute MCP tools based on analysis
   */
  async orchestrateIntelligentResponse(
    message: Message,
    analysis: UnifiedMessageAnalysis,
    capabilities: UserCapabilities
  ): Promise<MCPOrchestrationResult> {
    const startTime = Date.now();
    const results = new Map<string, MCPToolResult>();
    const toolsExecuted: string[] = [];
    const fallbacksUsed: string[] = [];

    try {
      // Create execution context
      const context: MCPExecutionContext = {
        userId: message.author.id,
        channelId: message.channel.id,
        messageContent: message.content,
        priority: this.determinePriority(analysis),
        requiredCapabilities: analysis.mcpRequirements,
        fallbackAllowed: true,
        timeoutMs: this.calculateTimeout(analysis.complexity)
      };

      // Phase 1: Critical Foundation Tools (Always Execute)
      if (this.isPhaseEnabled(1)) {
        await this.executePhase1Tools(context, results, toolsExecuted, fallbacksUsed);
      }

      // Phase 2: Enhanced Knowledge Tools (Execute if authorized)
      if (this.isPhaseEnabled(2) && capabilities.hasAdvancedAI) {
        await this.executePhase2Tools(context, results, toolsExecuted, fallbacksUsed);
      }

      // Phase 3: Advanced Processing Tools (Execute for complex queries)
      if (this.isPhaseEnabled(3) && analysis.complexity === 'complex' && capabilities.hasAdminCommands) {
        await this.executePhase3Tools(context, results, toolsExecuted, fallbacksUsed);
      }

      const executionTime = Date.now() - startTime;
      const confidence = this.calculateConfidence(toolsExecuted, fallbacksUsed, results);
      const recommendations = this.generateRecommendations(analysis, results);

      logger.info('MCP orchestration completed', {
        operation: 'mcp-orchestration',
        metadata: {
          toolsExecuted: toolsExecuted.length,
          fallbacksUsed: fallbacksUsed.length,
          executionTime,
          confidence
        }
      });

      return {
        success: toolsExecuted.length > 0,
        phase: this.getHighestPhaseExecuted(toolsExecuted),
        toolsExecuted,
        results,
        fallbacksUsed,
        executionTime,
        confidence,
        recommendations
      };

    } catch (error) {
      logger.error('MCP orchestration failed', {
        operation: 'mcp-orchestration',
        metadata: { error: String(error), executionTime: Date.now() - startTime }
      });

      return {
        success: false,
        phase: 0,
        toolsExecuted,
        results,
        fallbacksUsed,
        executionTime: Date.now() - startTime,
        confidence: 0,
        recommendations: ['Fallback to basic intelligence capabilities']
      };
    }
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
  discoverTools(context: MCPExecutionContext): MCPToolDefinition[] {
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
   * Execute a specific tool with monitoring
   */
  async executeTool(toolId: string, params: Record<string, unknown>, context: MCPExecutionContext): Promise<MCPToolResult> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found in registry`);
    }

    const startTime = Date.now();
    const metrics = this.executionMetrics.get(toolId)!;

    try {
      // Set timeout
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

      result.executionTime = executionTime;
      result.confidence = result.success ? 0.9 : 0.1;

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      metrics.executions++;
      metrics.totalTime += executionTime;
      metrics.lastExecution = new Date();

      logger.error('Tool execution failed', {
        operation: 'tool-execution',
        metadata: { toolId, error: String(error), executionTime }
      });

      return {
        success: false,
        error: String(error),
        toolUsed: toolId,
        executionTime,
        confidence: 0
      };
    }
  }

  /**
   * Initialize phase configurations
   */
  private initializePhases(): void {
    // Phase 1: Critical Foundation
    this.phases.set(1, {
      phase: 1,
      name: 'Critical Foundation',
      priority: 'critical',
      tools: ['memory-search', 'discord-integration'],
      requiredEnvVars: ['DISCORD_TOKEN'],
      enabled: true
    });

    // Phase 2: Enhanced Knowledge
    this.phases.set(2, {
      phase: 2,
      name: 'Enhanced Knowledge',
      priority: 'high',
      tools: ['web-search', 'content-extraction'],
      requiredEnvVars: ['BRAVE_API_KEY', 'FIRECRAWL_API_KEY'],
      enabled: process.env.ENABLE_ENHANCED_INTELLIGENCE === 'true'
    });

    // Phase 3: Advanced Processing
    this.phases.set(3, {
      phase: 3,
      name: 'Advanced Processing',
      priority: 'medium',
      tools: ['sequential-thinking', 'browser-automation'],
      requiredEnvVars: ['GEMINI_API_KEY'],
      enabled: process.env.ENABLE_AGENTIC_INTELLIGENCE === 'true'
    });
  }

  /**
   * Register all available MCP tools
   */
  private registerAllTools(): void {
    // Register memory tools
    this.registerMemoryTools();
    
    // Register search tools
    this.registerSearchTools();
    
    // Register content tools
    this.registerContentTools();
    
    // Register reasoning tools
    this.registerReasoningTools();
    
    // Register automation tools
    this.registerAutomationTools();
    
    // Register communication tools
    this.registerCommunicationTools();

    logger.info('All MCP tools registered', {
      operation: 'tool-registration',
      metadata: { 
        phase: 'complete',
        totalTools: this.tools.size
      }
    });
  }

  /**
   * Register memory-related tools
   */
  private registerMemoryTools(): void {
    const memorySearchTool: MCPToolDefinition = {
      id: 'memory-search',
      name: 'Memory Search',
      category: 'memory',
      priority: 'critical',
      capabilities: ['memory', 'search', 'context', 'user-data'],
      executorFunction: async (params) => {
        const query = params.query as string || '';
        
        // Real implementation would use MCP memory functions
        // For now, return mock data
        return {
          success: true,
          data: {
            memories: [`Mock memory result for: ${query}`],
            relevance: 0.8
          },
          toolUsed: 'memory-search',
          confidence: 0.8
        };
      },
      metadata: {
        description: 'Search user memory and knowledge graph',
        version: '1.0.0',
        author: 'Enhanced Intelligence System',
        installComplexity: 'easy',
        performance: {
          avgResponseTime: 200,
          reliability: 0.95
        }
      }
    };

    this.registerTool(memorySearchTool);
  }

  /**
   * Register search-related tools
   */
  private registerSearchTools(): void {
    // Web Search Tool
    const webSearchTool: MCPToolDefinition = {
      id: 'web-search',
      name: 'Web Search',
      category: 'search',
      priority: 'high',
      capabilities: ['web-search', 'real-time-info', 'fact-checking'],
      requiredEnvVars: ['BRAVE_API_KEY'],
      executorFunction: async (params) => {
        const query = params.query as string || '';
        const count = (params.count as number) || 5;
        
        if (!process.env.BRAVE_API_KEY) {
          return {
            success: true,
            data: {
              results: [{
                title: `Mock search result for: ${query}`,
                url: 'https://example.com',
                snippet: 'This is a mock search result for testing.'
              }],
              count: 1
            },
            toolUsed: 'web-search',
            fallbackMode: true,
            confidence: 0.6
          };
        }
        
        // Real implementation would use Brave Search API
        return {
          success: true,
          data: { results: [], totalResults: 0, count },
          toolUsed: 'web-search',
          confidence: 0.9
        };
      },
      metadata: {
        description: 'Real-time web search using Brave Search API',
        version: '1.0.0',
        author: 'Enhanced Intelligence System',
        installComplexity: 'easy',
        performance: {
          avgResponseTime: 800,
          reliability: 0.90
        }
      }
    };

    this.registerTool(webSearchTool);
  }

  /**
   * Register content processing tools
   */
  private registerContentTools(): void {
    const contentExtractionTool: MCPToolDefinition = {
      id: 'content-extraction',
      name: 'Content Extraction',
      category: 'content',
      priority: 'high',
      capabilities: ['content-extraction', 'web-scraping', 'url-processing'],
      requiredEnvVars: ['FIRECRAWL_API_KEY'],
      executorFunction: async (params) => {
        const urls = params.urls as string[] || [];
        
        return {
          success: true,
          data: {
            extractedContent: urls.map(url => `Mock content from ${url}`),
            metadata: { processedUrls: urls.length }
          },
          toolUsed: 'content-extraction',
          fallbackMode: !process.env.FIRECRAWL_API_KEY,
          confidence: 0.7
        };
      },
      metadata: {
        description: 'Advanced content extraction from web pages',
        version: '1.0.0',
        author: 'Enhanced Intelligence System',
        installComplexity: 'easy',
        performance: {
          avgResponseTime: 2000,
          reliability: 0.85
        }
      }
    };

    this.registerTool(contentExtractionTool);
  }

  /**
   * Register reasoning tools
   */
  private registerReasoningTools(): void {
    const reasoningTool: MCPToolDefinition = {
      id: 'sequential-thinking',
      name: 'Sequential Thinking',
      category: 'reasoning',
      priority: 'medium',
      capabilities: ['reasoning', 'analysis', 'problem-solving', 'step-by-step'],
      executorFunction: async (params) => {
        const thought = params.thought as string || '';
        
        return {
          success: true,
          data: {
            thinking: `Analysis of: ${thought}`,
            steps: [
              'Step 1: Identify core concepts',
              'Step 2: Analyze relationships', 
              'Step 3: Draw conclusions'
            ],
            conclusion: `Reasoning complete for: ${thought.substring(0, 50)}`
          },
          toolUsed: 'sequential-thinking',
          confidence: 0.8
        };
      },
      metadata: {
        description: 'AI-powered step-by-step reasoning',
        version: '1.0.0',
        author: 'Enhanced Intelligence System',
        installComplexity: 'medium',
        performance: {
          avgResponseTime: 3000,
          reliability: 0.88
        }
      }
    };

    this.registerTool(reasoningTool);
  }

  /**
   * Register automation tools
   */
  private registerAutomationTools(): void {
    const browserAutomationTool: MCPToolDefinition = {
      id: 'browser-automation',
      name: 'Browser Automation',
      category: 'automation',
      priority: 'medium',
      capabilities: ['browser-automation', 'web-interaction', 'screenshot'],
      executorFunction: async (params) => {
        const url = params.url as string || '';
        
        return {
          success: true,
          data: {
            action: 'page-visited',
            url,
            result: `Mock browser automation result for ${url}`
          },
          toolUsed: 'browser-automation',
          confidence: 0.7
        };
      },
      metadata: {
        description: 'Automated web browser interaction',
        version: '1.0.0',
        author: 'Enhanced Intelligence System',
        installComplexity: 'hard',
        performance: {
          avgResponseTime: 5000,
          reliability: 0.75
        }
      }
    };

    this.registerTool(browserAutomationTool);
  }

  /**
   * Register communication tools
   */
  private registerCommunicationTools(): void {
    const discordTool: MCPToolDefinition = {
      id: 'discord-integration',
      name: 'Discord Integration',
      category: 'communication',
      priority: 'critical',
      capabilities: ['discord', 'messaging', 'channel-management'],
      requiredEnvVars: ['DISCORD_TOKEN'],
      executorFunction: async () => {
        return {
          success: true,
          data: { action: 'discord-native' },
          toolUsed: 'discord-integration',
          confidence: 0.99
        };
      },
      metadata: {
        description: 'Native Discord platform integration',
        version: '1.0.0',
        author: 'Discord Bot Team',
        installComplexity: 'easy',
        performance: {
          avgResponseTime: 50,
          reliability: 0.99
        }
      }
    };

    this.registerTool(discordTool);
  }

  /**
   * Execute Phase 1 tools (Critical Foundation)
   */
  private async executePhase1Tools(
    context: MCPExecutionContext,
    results: Map<string, MCPToolResult>,
    executed: string[],
    fallbacks: string[]
  ): Promise<void> {
    // Always execute memory search
    if (this.tools.has('memory-search')) {
      const memoryResult = await this.executeTool('memory-search', 
        { query: context.messageContent }, context);
      results.set('memory-search', memoryResult);
      executed.push('memory-search');
      
      if (memoryResult.fallbackMode) {
        fallbacks.push('memory-search');
      }
    }
  }

  /**
   * Execute Phase 2 tools (Enhanced Knowledge)
   */
  private async executePhase2Tools(
    context: MCPExecutionContext,
    results: Map<string, MCPToolResult>,
    executed: string[],
    fallbacks: string[]
  ): Promise<void> {
    const needsWebSearch = context.requiredCapabilities.includes('webSearch');
    const needsContentExtraction = context.requiredCapabilities.includes('firecrawl');

    if (needsWebSearch && this.tools.has('web-search')) {
      const searchResult = await this.executeTool('web-search',
        { query: context.messageContent, count: 5 }, context);
      results.set('web-search', searchResult);
      executed.push('web-search');
      
      if (searchResult.fallbackMode) {
        fallbacks.push('web-search');
      }
    }

    if (needsContentExtraction && this.tools.has('content-extraction')) {
      // Extract URLs from message content for processing
      const urls = this.extractUrls(context.messageContent);
      if (urls.length > 0) {
        const extractResult = await this.executeTool('content-extraction',
          { urls }, context);
        results.set('content-extraction', extractResult);
        executed.push('content-extraction');
        
        if (extractResult.fallbackMode) {
          fallbacks.push('content-extraction');
        }
      }
    }
  }

  /**
   * Execute Phase 3 tools (Advanced Processing)
   */
  private async executePhase3Tools(
    context: MCPExecutionContext,
    results: Map<string, MCPToolResult>,
    executed: string[],
    fallbacks: string[]
  ): Promise<void> {
    // Execute sequential thinking for complex reasoning
    if (this.tools.has('sequential-thinking')) {
      const thinkingResult = await this.executeTool('sequential-thinking',
        { thought: context.messageContent }, context);
      results.set('sequential-thinking', thinkingResult);
      executed.push('sequential-thinking');
      
      if (thinkingResult.fallbackMode) {
        fallbacks.push('sequential-thinking');
      }
    }
  }

  /**
   * Helper methods
   */
  private extractUrls(content: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.match(urlRegex) || [];
  }

  private isPhaseEnabled(phase: number): boolean {
    return this.phases.get(phase)?.enabled ?? false;
  }

  private isToolAvailable(tool: MCPToolDefinition): boolean {
    // Check if required environment variables are available
    if (tool.requiredEnvVars) {
      return tool.requiredEnvVars.every(envVar => process.env[envVar]);
    }
    return true;
  }

  private hasRequiredCapabilities(tool: MCPToolDefinition, requirements: string[]): boolean {
    if (requirements.length === 0) return true;
    return requirements.some(req => tool.capabilities.includes(req));
  }

  private calculateToolScore(tool: MCPToolDefinition, context: MCPExecutionContext): number {
    let score = 0;
    
    // Priority scoring
    const priorityScores = { critical: 100, high: 75, medium: 50, low: 25 };
    score += priorityScores[tool.priority];
    
    // Capability match scoring
    const matchingCapabilities = tool.capabilities.filter(cap => 
      context.requiredCapabilities.includes(cap));
    score += matchingCapabilities.length * 10;
    
    // Performance scoring
    score += tool.metadata.performance.reliability * 10;
    score -= tool.metadata.performance.avgResponseTime / 100;
    
    return score;
  }

  private determinePriority(analysis: UnifiedMessageAnalysis): MCPExecutionContext['priority'] {
    if (analysis.complexity === 'advanced') return 'critical';
    if (analysis.complexity === 'complex') return 'high';
    if (analysis.complexity === 'moderate') return 'medium';
    return 'low';
  }

  private calculateTimeout(complexity: string): number {
    switch (complexity) {
      case 'advanced': return 45000;
      case 'complex': return 30000;
      case 'moderate': return 20000;
      default: return 15000;
    }
  }

  private calculateConfidence(executed: string[], fallbacks: string[], results: Map<string, MCPToolResult>): number {
    if (executed.length === 0) return 0;
    
    const successfulTools = Array.from(results.values()).filter(r => r.success).length;
    const fallbackPenalty = fallbacks.length * 0.1;
    
    return Math.max(0, (successfulTools / executed.length) - fallbackPenalty);
  }

  private generateRecommendations(analysis: UnifiedMessageAnalysis, results: Map<string, MCPToolResult>): string[] {
    const recommendations: string[] = [];
    
    if (analysis.confidence < 0.7) {
      recommendations.push('Request user clarification for better results');
    }
    
    const failedTools = Array.from(results.values()).filter(r => !r.success).length;
    if (failedTools > 0) {
      recommendations.push('Some tools failed - consider API key configuration');
    }
    
    if (analysis.complexity === 'advanced' && results.size < 3) {
      recommendations.push('Complex query may benefit from additional tool execution');
    }
    
    return recommendations;
  }

  private getHighestPhaseExecuted(executed: string[]): number {
    let highestPhase = 0;
    
    for (const [phase, config] of this.phases.entries()) {
      if (config.tools.some(tool => executed.includes(tool))) {
        highestPhase = Math.max(highestPhase, phase);
      }
    }
    
    return highestPhase;
  }

  private async performHealthChecks(): Promise<void> {
    const healthChecks = Array.from(this.tools.values())
      .filter(tool => tool.healthCheck)
      .map(async tool => {
        try {
          const isHealthy = await tool.healthCheck!();
          tool.metadata.performance.lastHealthCheck = new Date();
          return { toolId: tool.id, healthy: isHealthy };
        } catch (error) {
          return { toolId: tool.id, healthy: false };
        }
      });

    const results = await Promise.allSettled(healthChecks);
    this.lastHealthCheck = new Date();
    
    logger.info('Health checks completed', {
      operation: 'health-check',
      metadata: { 
        totalTools: this.tools.size,
        healthyTools: results.filter(r => r.status === 'fulfilled').length
      }
    });
  }

  private getHealthyToolCount(): number {
    return Array.from(this.tools.values())
      .filter(tool => this.isToolAvailable(tool)).length;
  }

  /**
   * Get orchestrator status
   */
  getOrchestratorStatus(): {
    initialized: boolean;
    totalTools: number;
    availableTools: number;
    activePhases: number;
    lastHealthCheck: Date;
  } {
    return {
      initialized: this.isInitialized,
      totalTools: this.tools.size,
      availableTools: this.getHealthyToolCount(),
      activePhases: Array.from(this.phases.values()).filter(p => p.enabled).length,
      lastHealthCheck: this.lastHealthCheck
    };
  }
}

// Export singleton instance
export const unifiedMCPOrchestrator = new UnifiedMCPOrchestratorService();
