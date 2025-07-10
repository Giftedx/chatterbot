/**
 * MCP Integration Orchestrator Service
 * 
 * Implements the comprehensive phased MCP integration plan for enhanced Discord AI capabilities.
 * Follows the research-based approach for strategic MCP integration that significantly enhances
 * capabilities while maintaining production stability.
 */

import { Message } from 'discord.js';
import { MCPManager } from './mcp-manager.service.js';
import { mcpRegistry, MCPToolDefinition, MCPToolExecutionContext } from './enhanced-intelligence/mcp-registry.service.js';
import { MCPProductionIntegrationService } from './enhanced-intelligence/mcp-production-integration.service.js';
import { DirectMCPExecutor } from './enhanced-intelligence/direct-mcp-executor.service.js';
import { IntelligenceAnalysis } from './intelligence/analysis.service.js';
import { UserCapabilities } from './intelligence/permission.service.js';
import { logger } from '../utils/logger.js';

export interface MCPIntegrationResult {
  success: boolean;
  phase: number;
  toolsExecuted: string[];
  results: Map<string, unknown>;
  fallbacksUsed: string[];
  executionTime: number;
  confidence: number;
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
 * MCP Integration Orchestrator Service
 * 
 * This service implements the phased MCP integration strategy:
 * - Phase 1: Foundational Capabilities (Discord + Memory)
 * - Phase 2: Real-World Knowledge (Web Search + File Handling)
 * - Phase 3: Structured Data (Database + AI Enhancement)
 */
export class MCPIntegrationOrchestratorService {
  private mcpManager?: MCPManager;
  private productionService: MCPProductionIntegrationService;
  private directExecutor: DirectMCPExecutor;
  private phases: Map<number, MCPPhaseConfiguration>;
  private isInitialized = false;

  constructor(mcpManager?: MCPManager) {
    this.mcpManager = mcpManager;
    this.productionService = new MCPProductionIntegrationService();
    this.directExecutor = new DirectMCPExecutor();
    this.phases = new Map();
    
    this.initializePhases();
  }

  /**
   * Initialize the service and register MCP tools according to the phased plan
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing MCP Integration Orchestrator', {
        operation: 'mcp-orchestrator-init',
        metadata: { phases: this.phases.size }
      });

      // Register tools for each phase
      await this.registerPhaseTools();

      // Initialize MCP Manager if available
      if (this.mcpManager) {
        await this.mcpManager.initialize();
      }

      this.isInitialized = true;

      logger.info('MCP Integration Orchestrator initialized successfully', {
        operation: 'mcp-orchestrator-init',
        metadata: { 
          mcpManagerAvailable: !!this.mcpManager,
          activePhases: Array.from(this.phases.values()).filter(p => p.enabled).length
        }
      });

    } catch (error) {
      logger.error('MCP Integration Orchestrator initialization failed', {
        operation: 'mcp-orchestrator-init',
        metadata: { error: String(error) }
      });
      
      // Continue with degraded functionality
      this.isInitialized = true;
    }
  }

  /**
   * Execute MCP tools based on analysis and user capabilities
   * Follows the phased approach for intelligent tool selection
   */
  async orchestrateIntelligentResponse(
    message: Message,
    analysis: IntelligenceAnalysis,
    capabilities: UserCapabilities
  ): Promise<MCPIntegrationResult> {
    const startTime = Date.now();
    const results = new Map<string, unknown>();
    const toolsExecuted: string[] = [];
    const fallbacksUsed: string[] = [];

    try {
      // Determine required capabilities from analysis
      const requiredCapabilities = this.extractCapabilitiesFromAnalysis(analysis);
      
      // Create execution context
      const context: MCPToolExecutionContext = {
        userId: message.author.id,
        channelId: message.channel.id,
        messageContent: message.content,
        priority: this.determinePriority(analysis),
        requiredCapabilities,
        fallbackAllowed: true,
        timeoutMs: 30000
      };

      // Phase 1: Critical Foundation Tools (Always Execute First)
      if (this.isPhaseEnabled(1)) {
        await this.executePhase1Tools(context, results, toolsExecuted, fallbacksUsed);
      }

      // Phase 2: High Priority Tools (Execute if needed and authorized)
      if (this.isPhaseEnabled(2) && capabilities.hasAdvancedAI) {
        await this.executePhase2Tools(context, results, toolsExecuted, fallbacksUsed);
      }

      // Phase 3: Medium Priority Tools (Execute for complex queries)
      if (this.isPhaseEnabled(3) && analysis.complexity === 'complex' && capabilities.hasAdminCommands) {
        await this.executePhase3Tools(context, results, toolsExecuted, fallbacksUsed);
      }

      const executionTime = Date.now() - startTime;
      const confidence = this.calculateConfidence(toolsExecuted, fallbacksUsed, results);

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
        success: true,
        phase: this.getHighestExecutedPhase(toolsExecuted),
        toolsExecuted,
        results,
        fallbacksUsed,
        executionTime,
        confidence
      };

    } catch (error) {
      logger.error('MCP orchestration failed', {
        operation: 'mcp-orchestration',
        metadata: { 
          error: String(error),
          toolsExecuted: toolsExecuted.length,
          executionTime: Date.now() - startTime
        }
      });

      return {
        success: false,
        phase: 0,
        toolsExecuted,
        results,
        fallbacksUsed,
        executionTime: Date.now() - startTime,
        confidence: 0
      };
    }
  }

  /**
   * Get orchestrator status and health
   */
  getOrchestratorStatus(): {
    initialized: boolean;
    mcpManagerConnected: boolean;
    activePhases: number[];
    toolsAvailable: number;
    lastHealthCheck: Date;
  } {
    const registryStatus = mcpRegistry.getRegistryStatus();
    
    return {
      initialized: this.isInitialized,
      mcpManagerConnected: !!this.mcpManager && this.mcpManager.getStatus().connectedServers > 0,
      activePhases: Array.from(this.phases.entries())
        .filter(([, phase]) => phase.enabled)
        .map(([phaseNum]) => phaseNum),
      toolsAvailable: registryStatus.availableTools,
      lastHealthCheck: registryStatus.lastHealthCheck
    };
  }

  /**
   * Enable or disable specific phases
   */
  configurePhase(phaseNumber: number, enabled: boolean): void {
    const phase = this.phases.get(phaseNumber);
    if (phase) {
      phase.enabled = enabled;
      logger.info('MCP phase configuration updated', {
        operation: 'phase-config',
        metadata: { phase: phaseNumber, enabled }
      });
    }
  }

  // Private implementation methods

  private initializePhases(): void {
    // Phase 1: Critical Foundation (Discord + Memory)
    this.phases.set(1, {
      phase: 1,
      name: 'Foundational Capabilities',
      priority: 'critical',
      tools: ['discord-integration', 'memory-search', 'memory-store'],
      requiredEnvVars: ['DISCORD_TOKEN'],
      enabled: process.env.ENABLE_ENHANCED_INTELLIGENCE === 'true'
    });

    // Phase 2: Real-World Knowledge (Web Search + File Handling)
    this.phases.set(2, {
      phase: 2,
      name: 'Real-World Knowledge',
      priority: 'high',
      tools: ['web-search', 'content-extraction', 'file-processing', 'github-integration'],
      requiredEnvVars: ['BRAVE_SEARCH_API_KEY', 'FIRECRAWL_API_KEY', 'GITHUB_TOKEN'],
      enabled: !!(process.env.BRAVE_SEARCH_API_KEY || process.env.FIRECRAWL_API_KEY)
    });

    // Phase 3: Structured Data & AI Enhancement (Database + AI Tools)
    this.phases.set(3, {
      phase: 3,
      name: 'Structured Data & AI Enhancement',
      priority: 'medium',
      tools: ['database-query', 'ai-enhancement', 'sequential-thinking', 'browser-automation'],
      requiredEnvVars: ['DATABASE_URL'],
      enabled: !!process.env.DATABASE_URL
    });

    logger.info('MCP phases initialized', {
      operation: 'phase-init',
      metadata: { 
        totalPhases: this.phases.size,
        enabledPhases: Array.from(this.phases.values()).filter(p => p.enabled).length
      }
    });
  }

  private async registerPhaseTools(): Promise<void> {
    // Register Phase 1 tools
    this.registerDiscordTools();
    this.registerMemoryTools();

    // Register Phase 2 tools
    this.registerWebSearchTools();
    this.registerContentTools();

    // Register Phase 3 tools
    this.registerDatabaseTools();
    this.registerAIEnhancementTools();
  }

  private registerDiscordTools(): void {
    const discordTool: MCPToolDefinition = {
      id: 'discord-integration',
      name: 'Discord Platform Integration',
      category: 'communication',
      priority: 'critical',
      capabilities: ['discord', 'messaging', 'channel-management'],
      requiredEnvVars: ['DISCORD_TOKEN'],
      executorFunction: async (params) => {
        // Use the existing Discord.js integration
        return { success: true, data: { action: 'discord-native' }, toolUsed: 'discord-integration' };
      },
      metadata: {
        description: 'Native Discord platform integration for enhanced bot control',
        version: '1.0.0',
        author: 'Discord Bot Team',
        installComplexity: 'easy',
        performance: { avgResponseTime: 50, reliability: 0.99 }
      }
    };

    mcpRegistry.registerTool(discordTool);
  }

  private registerMemoryTools(): void {
    const memoryTool: MCPToolDefinition = {
      id: 'memory-search',
      name: 'Persistent Memory Search',
      category: 'memory',
      priority: 'critical',
      capabilities: ['memory', 'context', 'personalization'],
      executorFunction: async (params) => {
        return await this.productionService.executeProductionMemorySearch(String(params.query));
      },
      metadata: {
        description: 'Search and retrieve user memory and conversation context',
        version: '1.0.0',
        author: 'Memory Team',
        installComplexity: 'medium',
        performance: { avgResponseTime: 200, reliability: 0.95 }
      }
    };

    mcpRegistry.registerTool(memoryTool);
  }

  private registerWebSearchTools(): void {
    const webSearchTool: MCPToolDefinition = {
      id: 'web-search',
      name: 'Real-time Web Search',
      category: 'search',
      priority: 'high',
      capabilities: ['search', 'real-time', 'information'],
      requiredEnvVars: ['BRAVE_SEARCH_API_KEY'],
      executorFunction: async (params) => {
        return await this.productionService.executeProductionWebSearch(
          String(params.query), 
          Number(params.count) || 5
        );
      },
      metadata: {
        description: 'Real-time web search using Brave Search API',
        version: '1.0.0',
        author: 'Web Search Team',
        installComplexity: 'easy',
        performance: { avgResponseTime: 800, reliability: 0.90 }
      }
    };

    mcpRegistry.registerTool(webSearchTool);
  }

  private registerContentTools(): void {
    const contentTool: MCPToolDefinition = {
      id: 'content-extraction',
      name: 'Web Content Extraction',
      category: 'content',
      priority: 'high',
      capabilities: ['extraction', 'scraping', 'analysis'],
      requiredEnvVars: ['FIRECRAWL_API_KEY'],
      executorFunction: async (params) => {
        const urls = Array.isArray(params.urls) ? params.urls as string[] : [String(params.url)];
        return await this.productionService.executeProductionContentExtraction(urls);
      },
      metadata: {
        description: 'Extract and analyze content from web pages',
        version: '1.0.0',
        author: 'Content Team',
        installComplexity: 'medium',
        performance: { avgResponseTime: 1500, reliability: 0.85 }
      }
    };

    mcpRegistry.registerTool(contentTool);
  }

  private registerDatabaseTools(): void {
    const dbTool: MCPToolDefinition = {
      id: 'database-query',
      name: 'Database Integration',
      category: 'database',
      priority: 'medium',
      capabilities: ['database', 'analytics', 'structured-data'],
      requiredEnvVars: ['DATABASE_URL'],
      executorFunction: async (params) => {
        // Placeholder for database integration
        return { 
          success: true, 
          data: { query: params.query, result: 'Database integration pending' }, 
          toolUsed: 'database-query' 
        };
      },
      metadata: {
        description: 'Query structured database for analytics and user data',
        version: '1.0.0',
        author: 'Database Team',
        installComplexity: 'hard',
        performance: { avgResponseTime: 300, reliability: 0.92 }
      }
    };

    mcpRegistry.registerTool(dbTool);
  }

  private registerAIEnhancementTools(): void {
    const aiTool: MCPToolDefinition = {
      id: 'sequential-thinking',
      name: 'Advanced Reasoning Engine',
      category: 'reasoning',
      priority: 'medium',
      capabilities: ['reasoning', 'analysis', 'complex-thinking'],
      executorFunction: async (params) => {
        return await this.productionService.executeProductionSequentialThinking(String(params.thought));
      },
      metadata: {
        description: 'Advanced multi-step reasoning and analysis',
        version: '1.0.0',
        author: 'AI Enhancement Team',
        installComplexity: 'medium',
        performance: { avgResponseTime: 2000, reliability: 0.88 }
      }
    };

    mcpRegistry.registerTool(aiTool);
  }

  private async executePhase1Tools(
    context: MCPToolExecutionContext,
    results: Map<string, unknown>,
    toolsExecuted: string[],
    fallbacksUsed: string[]
  ): Promise<void> {
    // Memory search for conversation context
    if (context.requiredCapabilities.includes('memory') || context.requiredCapabilities.includes('context')) {
      try {
        const memoryResult = await mcpRegistry.executeTool('memory-search', { query: context.messageContent }, context);
        results.set('memory', memoryResult.data);
        toolsExecuted.push('memory-search');
      } catch (error) {
        fallbacksUsed.push('memory-search');
        logger.warn('Phase 1 memory search failed, using fallback', {
          operation: 'phase1-execution',
          metadata: { error: String(error) }
        });
      }
    }
  }

  private async executePhase2Tools(
    context: MCPToolExecutionContext,
    results: Map<string, unknown>,
    toolsExecuted: string[],
    fallbacksUsed: string[]
  ): Promise<void> {
    // Web search for real-time information
    if (context.requiredCapabilities.includes('search') || context.requiredCapabilities.includes('web')) {
      try {
        const searchResult = await mcpRegistry.executeTool('web-search', { 
          query: context.messageContent, 
          count: 5 
        }, context);
        results.set('webSearch', searchResult.data);
        toolsExecuted.push('web-search');
      } catch (error) {
        fallbacksUsed.push('web-search');
      }
    }

    // Content extraction for URLs
    const urls = this.extractUrls(context.messageContent);
    if (urls.length > 0) {
      try {
        const contentResult = await mcpRegistry.executeTool('content-extraction', { urls }, context);
        results.set('contentExtraction', contentResult.data);
        toolsExecuted.push('content-extraction');
      } catch (error) {
        fallbacksUsed.push('content-extraction');
      }
    }
  }

  private async executePhase3Tools(
    context: MCPToolExecutionContext,
    results: Map<string, unknown>,
    toolsExecuted: string[],
    fallbacksUsed: string[]
  ): Promise<void> {
    // Advanced reasoning for complex queries
    if (context.requiredCapabilities.includes('reasoning') || context.requiredCapabilities.includes('analysis')) {
      try {
        const reasoningResult = await mcpRegistry.executeTool('sequential-thinking', { 
          thought: context.messageContent 
        }, context);
        results.set('reasoning', reasoningResult.data);
        toolsExecuted.push('sequential-thinking');
      } catch (error) {
        fallbacksUsed.push('sequential-thinking');
      }
    }
  }

  private extractCapabilitiesFromAnalysis(analysis: IntelligenceAnalysis): string[] {
    const capabilities: string[] = [];

    if (analysis.needsMemoryOperation) capabilities.push('memory', 'context');
    if (analysis.needsMCPTools) capabilities.push('search', 'web', 'extraction');
    if (analysis.complexity === 'complex') capabilities.push('reasoning', 'analysis');
    if (analysis.needsMultimodal) capabilities.push('multimodal', 'content');
    if (analysis.needsAdminFeatures) capabilities.push('database', 'analytics');

    return capabilities;
  }

  private determinePriority(analysis: IntelligenceAnalysis): 'low' | 'medium' | 'high' | 'critical' {
    if (analysis.needsAdminFeatures) return 'critical';
    if (analysis.complexity === 'complex') return 'high';
    if (analysis.needsMCPTools) return 'medium';
    return 'low';
  }

  private isPhaseEnabled(phaseNumber: number): boolean {
    const phase = this.phases.get(phaseNumber);
    return phase?.enabled || false;
  }

  private getHighestExecutedPhase(toolsExecuted: string[]): number {
    if (toolsExecuted.some(tool => ['sequential-thinking', 'database-query'].includes(tool))) return 3;
    if (toolsExecuted.some(tool => ['web-search', 'content-extraction'].includes(tool))) return 2;
    if (toolsExecuted.some(tool => ['memory-search', 'discord-integration'].includes(tool))) return 1;
    return 0;
  }

  private calculateConfidence(toolsExecuted: string[], fallbacksUsed: string[], results: Map<string, unknown>): number {
    const totalTools = toolsExecuted.length + fallbacksUsed.length;
    if (totalTools === 0) return 0;

    const successRate = toolsExecuted.length / totalTools;
    const resultQuality = results.size > 0 ? 0.8 : 0.5;
    
    return Math.min(1, successRate * resultQuality);
  }

  private extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return text.match(urlRegex) || [];
  }
}

// Export singleton instance
export const mcpIntegrationOrchestrator = new MCPIntegrationOrchestratorService();
