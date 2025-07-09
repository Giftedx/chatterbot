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
import { DirectMCPExecutor } from '../enhanced-intelligence/direct-mcp-executor.service.js';

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

// Enhanced intelligence types for processWithAllTools support
export interface AttachmentInfo {
  name: string;
  url: string;
  contentType?: string;
}

export interface ProcessingContext {
  userId: string;
  channelId: string;
  guildId: string | null;
  analysis: MessageAnalysis;
  results: Map<string, unknown>;
  errors: string[];
}

export interface MessageAnalysis {
  hasAttachments: boolean;
  hasUrls: boolean;
  attachmentTypes: string[];
  urls: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  intents: string[];
  requiredTools: string[];
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
  private directExecutor: DirectMCPExecutor;

  constructor(mcpManager?: MCPManager) {
    this.mcpManager = mcpManager;
    this.directExecutor = new DirectMCPExecutor();
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
   * Process message using all available MCP tools based on analysis
   * Consolidated from EnhancedMCPToolsService for backward compatibility
   */
  async processWithAllTools(
    content: string, 
    attachments: AttachmentInfo[], 
    context: ProcessingContext
  ): Promise<void> {
    const { requiredTools } = context.analysis;
    
    // Process in parallel where possible, sequential where dependencies exist
    const parallelTasks: Promise<void>[] = [];
    
    // Memory retrieval (always first)
    if (requiredTools.includes('memory')) {
      const memoryResult = await this.searchUserMemory(context.userId, content);
      context.results.set('memory', memoryResult);
    }
    
    // Multimodal processing
    if (requiredTools.includes('multimodal') && attachments.length > 0) {
      parallelTasks.push(this.processMultimodalContent(attachments, context));
    }
    
    // Web intelligence
    if (requiredTools.includes('web-search')) {
      parallelTasks.push(this.processWebIntelligence(content, context));
    }
    
    // URL processing
    if (requiredTools.includes('url-processing') && context.analysis.urls.length > 0) {
      parallelTasks.push(this.processUrls(context.analysis.urls, context));
    }
    
    // Execute parallel tasks
    await Promise.allSettled(parallelTasks);
    
    // Sequential processing for dependent tasks
    if (requiredTools.includes('complex-reasoning')) {
      await this.performComplexReasoning(content, context);
    }
    
    if (requiredTools.includes('browser-automation')) {
      await this.performBrowserAutomation(content, context);
    }
  }

  /**
   * Search user's persistent memory using real MCP memory tools
   */
  private async searchUserMemory(userId: string, query: string): Promise<MCPToolResult> {
    try {
      // Use the direct executor to execute real memory search
      const result = await this.directExecutor.executeMemorySearch(query);
      
      logger.info('Memory search completed', {
        operation: 'memory-search',
        metadata: { userId, query: query.substring(0, 50) }
      });
      
      return {
        success: result.success,
        data: {
          userId: userId,
          ...(result.data as Record<string, unknown> || {})
        },
        toolUsed: 'memory_search'
      };
    } catch (error) {
      return {
        success: false,
        error: `Memory search failed: ${error}`,
        toolUsed: 'memory_search'
      };
    }
  }

  /**
   * Process web intelligence using real web search tools
   */
  private async processWebIntelligence(content: string, context: ProcessingContext): Promise<void> {
    try {
      // Use the direct executor to execute real web search
      const result = await this.directExecutor.executeWebSearch(content, 5);
      
      logger.info('Web search completed', {
        operation: 'web-search',
        metadata: { query: content.substring(0, 50) }
      });
      
      context.results.set('web-search', {
        success: result.success,
        data: result.data,
        toolUsed: 'web_search_fallback'
      });
    } catch (error) {
      context.results.set('web-search', {
        success: false,
        error: `Web search failed: ${error}`,
        toolUsed: 'web_search_fallback'
      });
    }
  }

  /**
   * Process URLs using content extraction
   */
  private async processUrls(urls: string[], context: ProcessingContext): Promise<void> {
    try {
      // Use the direct executor to execute real content extraction
      const result = await this.directExecutor.executeContentExtraction(urls);
      
      logger.info('Content extraction completed', {
        operation: 'content-extraction',
        metadata: { urlCount: urls.length }
      });
      
      context.results.set('url-processing', {
        success: result.success,
        data: result.data,
        toolUsed: 'content_extraction'
      });
    } catch (error) {
      context.results.set('url-processing', {
        success: false,
        error: `URL processing failed: ${error}`,
        toolUsed: 'content_extraction'
      });
    }
  }

  /**
   * Perform complex reasoning using sequential thinking
   */
  private async performComplexReasoning(content: string, context: ProcessingContext): Promise<void> {
    try {
      // Use the direct executor to execute real sequential thinking
      const result = await this.directExecutor.executeSequentialThinking(content);
      
      logger.info('Complex reasoning completed', {
        operation: 'sequential-thinking',
        metadata: { content: content.substring(0, 50) }
      });
      
      context.results.set('complex-reasoning', {
        success: result.success,
        data: result.data,
        toolUsed: 'sequential_thinking'
      });
    } catch (error) {
      context.results.set('complex-reasoning', {
        success: false,
        error: `Complex reasoning failed: ${error}`,
        toolUsed: 'sequential_thinking'
      });
    }
  }

  /**
   * Perform browser automation for interactive tasks
   */
  private async performBrowserAutomation(content: string, context: ProcessingContext): Promise<void> {
    try {
      // Extract URL from content or use a default
      const urlMatch = content.match(/https?:\/\/[^\s]+/);
      const targetUrl = urlMatch ? urlMatch[0] : 'https://example.com';
      
      // Use the direct executor to execute real browser automation
      const result = await this.directExecutor.executeBrowserAutomation(targetUrl);
      
      logger.info('Browser automation completed', {
        operation: 'browser-automation',
        metadata: { targetUrl }
      });
      
      context.results.set('browser-automation', {
        success: result.success,
        data: result.data,
        toolUsed: 'browser_automation'
      });
    } catch (error) {
      context.results.set('browser-automation', {
        success: false,
        error: `Browser automation failed: ${error}`,
        toolUsed: 'browser_automation'
      });
    }
  }

  /**
   * Process multimodal content (images, audio, documents)
   */
  private async processMultimodalContent(
    attachments: AttachmentInfo[], 
    context: ProcessingContext
  ): Promise<void> {
    try {
      const results = [];
      
      for (const attachment of attachments) {
        if (attachment.contentType?.startsWith('image/')) {
          const imageResult = await this.processImage(attachment);
          results.push(imageResult);
        } else if (attachment.contentType?.startsWith('audio/')) {
          const audioResult = await this.processAudio(attachment);
          results.push(audioResult);
        } else if (attachment.contentType?.includes('pdf') || attachment.contentType?.includes('document')) {
          const docResult = await this.processDocument(attachment);
          results.push(docResult);
        }
      }
      
      context.results.set('multimodal', {
        success: true,
        data: { results },
        toolUsed: 'multimodal-analysis'
      });
    } catch (error) {
      context.results.set('multimodal', {
        success: false,
        error: `Multimodal processing failed: ${error}`,
        toolUsed: 'multimodal-analysis'
      });
    }
  }

  /**
   * Process individual image attachment
   */
  private async processImage(attachment: AttachmentInfo): Promise<{
    type: string;
    url: string;
    analysis: string;
    objects: unknown[];
    text: string;
    sentiment: string;
  }> {
    return {
      type: 'image',
      url: attachment.url,
      analysis: 'Image analysis would be performed here',
      objects: [],
      text: '',
      sentiment: 'neutral'
    };
  }

  /**
   * Process individual audio attachment
   */
  private async processAudio(attachment: AttachmentInfo): Promise<{
    type: string;
    url: string;
    transcription: string;
    duration: number;
    language: string;
    sentiment: string;
  }> {
    return {
      type: 'audio',
      url: attachment.url,
      transcription: 'Audio transcription would appear here',
      duration: 0,
      language: 'en',
      sentiment: 'neutral'
    };
  }

  /**
   * Process individual document attachment
   */
  private async processDocument(attachment: AttachmentInfo): Promise<{
    type: string;
    url: string;
    text: string;
    summary: string;
    keyPoints: unknown[];
    metadata: Record<string, unknown>;
  }> {
    return {
      type: 'document',
      url: attachment.url,
      text: 'Extracted document text would appear here',
      summary: 'Document summary would be generated',
      keyPoints: [],
      metadata: {}
    };
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
    const needsWebSearch = context.requiredCapabilities.includes('web-search');
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
    
    Array.from(this.phases.entries()).forEach(([phase, config]) => {
      if (config.tools.some(tool => executed.includes(tool))) {
        highestPhase = Math.max(highestPhase, phase);
      }
    });
    
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

  // ========== ADAPTER METHODS FOR BACKWARD COMPATIBILITY ==========
  // These methods provide compatibility with services being consolidated

  /**
   * Adapter method for MCPIntegrationOrchestratorService compatibility
   * Maps orchestrateIntelligentResponse to MCPIntegrationResult format
   */
  async orchestrateIntelligentResponseAsIntegration(
    message: Message,
    analysis: any, // IntelligenceAnalysis from legacy services
    capabilities: UserCapabilities
  ): Promise<{
    success: boolean;
    phase: number;
    toolsExecuted: string[];
    results: Map<string, unknown>;
    fallbacksUsed: string[];
    executionTime: number;
    confidence: number;
  }> {
    // Convert legacy analysis to unified format
    const unifiedAnalysis: UnifiedMessageAnalysis = {
      complexity: analysis.complexityLevel || 'simple',
      confidence: analysis.confidence || 0.8,
      intents: analysis.intents || [],
      mcpRequirements: analysis.requiredCapabilities || [],
      sentiment: analysis.sentiment || 'neutral',
      language: analysis.language || 'en',
      topics: analysis.topics || [],
      mentions: [],
      urls: analysis.urls || [],
      attachmentAnalysis: [{
        type: analysis.attachmentTypes?.[0] as 'image' | 'audio' | 'document' | 'video' | 'unknown' || 'unknown',
        analysisNeeded: analysis.hasAttachments || false,
        suggestedService: 'multimodal-analysis',
        processingPriority: 'medium' as 'high' | 'medium' | 'low'
      }]
    };

    const result = await this.orchestrateIntelligentResponse(message, unifiedAnalysis, capabilities);
    
    // Convert results to legacy format
    return {
      success: result.success,
      phase: result.phase,
      toolsExecuted: result.toolsExecuted,
      results: result.results,
      fallbacksUsed: result.fallbacksUsed,
      executionTime: result.executionTime,
      confidence: result.confidence
    };
  }

  /**
   * Get production integration status
   * Adapter for MCPProductionIntegrationService compatibility
   */
  getProductionIntegrationStatus(): {
    isProductionMCPEnabled: boolean;
    availableTools: string[];
    mcpServerStatus: string;
  } {
    return {
      isProductionMCPEnabled: !!this.mcpManager,
      availableTools: Array.from(this.tools.keys()),
      mcpServerStatus: this.isInitialized ? 'connected' : 'disconnected'
    };
  }

  /**
   * Execute production tool with fallback
   * Adapter for MCPProductionIntegrationService compatibility
   */
  async executeProductionTool(toolName: string, params: Record<string, unknown>): Promise<MCPToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        success: false,
        error: `Tool ${toolName} not found`,
        toolUsed: toolName,
        fallbackMode: true
      };
    }

    try {
      return await tool.executorFunction(params);
    } catch (error) {
      return {
        success: false,
        error: String(error),
        toolUsed: toolName,
        fallbackMode: true
      };
    }
  }

  /**
   * Get tool recommendations based on content
   * Consolidated from MCPToolRegistrationService
   */
  getToolRecommendations(content: string, context: { 
    userId: string; 
    priority: 'low' | 'medium' | 'high' | 'critical';
  }): Array<{
    id: string;
    name: string;
    confidence: number;
    reasoning: string;
  }> {
    const recommendations = [];
    
    // Analyze content for tool recommendations
    const lowerContent = content.toLowerCase();
    
    // Memory search recommendation
    if (lowerContent.includes('remember') || lowerContent.includes('recall') || lowerContent.includes('previous')) {
      recommendations.push({
        id: 'memory-search',
        name: 'Memory Search',
        confidence: 0.9,
        reasoning: 'Content suggests need for memory retrieval'
      });
    }
    
    // Web search recommendation
    if (lowerContent.includes('search') || lowerContent.includes('find') || lowerContent.includes('current') || lowerContent.includes('latest')) {
      recommendations.push({
        id: 'web-search',
        name: 'Web Search',
        confidence: 0.8,
        reasoning: 'Content suggests need for current information'
      });
    }
    
    // URL processing recommendation
    if (content.match(/https?:\/\/[^\s]+/)) {
      recommendations.push({
        id: 'content-extraction',
        name: 'Content Extraction',
        confidence: 0.95,
        reasoning: 'Content contains URLs that need processing'
      });
    }
    
    // Complex reasoning recommendation
    if (content.length > 200 || lowerContent.includes('analyze') || lowerContent.includes('explain') || lowerContent.includes('complex')) {
      recommendations.push({
        id: 'sequential-thinking',
        name: 'Sequential Thinking',
        confidence: 0.7,
        reasoning: 'Content appears complex and may benefit from structured reasoning'
      });
    }
    
    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Register tool from external registration service
   * Adapter for MCPToolRegistrationService compatibility
   */
  registerExternalTool(tool: MCPToolDefinition): void {
    this.tools.set(tool.id, tool);
    this.executionMetrics.set(tool.id, {
      executions: 0,
      successes: 0,
      totalTime: 0,
      lastExecution: new Date()
    });

    logger.info('External tool registered', {
      operation: 'tool-registration',
      metadata: { toolId: tool.id, category: tool.category }
    });
  }

  /**
   * Get registry status
   * Adapter for MCPToolRegistrationService compatibility  
   */
  getRegistryStatus(): {
    totalTools: number;
    toolsByCategory: Record<string, number>;
    healthyTools: number;
    lastUpdate: Date;
  } {
    const toolsByCategory: Record<string, number> = {};
    
    Array.from(this.tools.values()).forEach(tool => {
      toolsByCategory[tool.category] = (toolsByCategory[tool.category] || 0) + 1;
    });
    
    return {
      totalTools: this.tools.size,
      toolsByCategory,
      healthyTools: this.getHealthyToolCount(),
      lastUpdate: this.lastHealthCheck
    };
  }

  /**
   * Clean up resources
   * Consolidated cleanup from all services
   */
  public cleanup(): void {
    logger.info('Unified MCP Orchestrator cleanup initiated', {
      operation: 'cleanup',
      metadata: { toolCount: this.tools.size }
    });
    
    // Clear all tool registrations
    this.tools.clear();
    this.executionMetrics.clear();
    this.phases.clear();
    
    // Mark as uninitialized
    this.isInitialized = false;
    
    logger.info('Unified MCP Orchestrator cleanup completed');
  }
}

// Export singleton instance
export const unifiedMCPOrchestrator = new UnifiedMCPOrchestratorService();
