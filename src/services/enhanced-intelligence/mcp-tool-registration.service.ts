/**
 * MCP Tool Registration Service
 * 
 * Registers all available MCP tools with the registry and provides
 * intelligent tool selection based on user context and requirements.
 */

import { MCPToolDefinition, mcpRegistry } from './mcp-registry.service.js';
import { directMCPExecutor } from './direct-mcp-executor.service.js';
import { MCPProductionIntegrationService } from './mcp-production-integration.service.js';
import { logger } from '../../utils/logger.js';

export class MCPToolRegistrationService {
  private productionService: MCPProductionIntegrationService;

  constructor() {
    this.productionService = new MCPProductionIntegrationService();
    this.registerAllTools();
  }

  /**
   * Register all available MCP tools with the registry
   */
  private registerAllTools(): void {
    // Memory tools
    this.registerMemoryTools();
    
    // Search tools
    this.registerSearchTools();
    
    // Content tools
    this.registerContentTools();
    
    // Reasoning tools
    this.registerReasoningTools();
    
    // Automation tools
    this.registerAutomationTools();

    logger.info('All MCP tools registered', {
      operation: 'tool-registration',
      metadata: { 
        phase: 'complete',
        totalTools: this.getTotalRegisteredTools()
      }
    });
  }

  private registerMemoryTools(): void {
    // Memory Search Tool
    const memorySearchTool: MCPToolDefinition = {
      id: 'mcp-memory-search',
      name: 'Memory Search',
      category: 'memory',
      priority: 'critical',
      capabilities: ['memory', 'search', 'context', 'user-data', 'knowledge-graph'],
      dependencies: ['knowledge-base'],
      executorFunction: async (params) => {
        const query = params.query as string || '';
        return await directMCPExecutor.executeMemorySearch(query);
      },
      healthCheck: async () => {
        try {
          const result = await directMCPExecutor.executeMemorySearch('health-check');
          return result.success;
        } catch {
          return false;
        }
      },
      metadata: {
        description: 'Searches user memory and knowledge graph for relevant information',
        version: '1.0.0',
        author: 'Enhanced Intelligence System',
        installComplexity: 'easy',
        performance: {
          avgResponseTime: 500,
          reliability: 0.95
        }
      }
    };

    mcpRegistry.registerTool(memorySearchTool);
  }

  private registerSearchTools(): void {
    // Web Search Tool (Brave) - Only register if API key is available
    if (process.env.BRAVE_API_KEY) {
      const webSearchTool: MCPToolDefinition = {
        id: 'mcp-brave-search',
        name: 'Brave Web Search',
        category: 'search',
        priority: 'high',
        capabilities: ['web-search', 'real-time-info', 'fact-checking', 'current-events'],
        requiredEnvVars: ['BRAVE_API_KEY'],
        executorFunction: async (params) => {
          const query = params.query as string || '';
          const count = params.count as number || 5;
          return await directMCPExecutor.executeWebSearch(query, count);
        },
        healthCheck: async () => {
          try {
            const result = await directMCPExecutor.executeWebSearch('test', 1);
            return result.success;
          } catch {
            return false;
          }
        },
        metadata: {
          description: 'Privacy-focused web search with real-time results',
          version: '1.0.0',
          author: 'Brave Search API',
          installComplexity: 'easy',
          performance: {
            avgResponseTime: 1200,
            reliability: 0.90
          }
        }
      };

      mcpRegistry.registerTool(webSearchTool);
    }

    // Fallback Search Tool (Mock for testing when no API keys available)
    const mockSearchTool: MCPToolDefinition = {
      id: 'mcp-mock-search',
      name: 'Mock Web Search',
      category: 'search',
      priority: 'medium',
      capabilities: ['web-search', 'real-time-info', 'fact-checking', 'current-events'],
      requiredEnvVars: [], // No API keys required
      executorFunction: async (params) => {
        const query = params.query as string || '';
        // Return mock search results for testing
        return {
          success: true,
          toolUsed: 'mcp-mock-search',
          result: {
            results: [
              {
                title: `Mock Result for: ${query}`,
                description: `This is a mock search result for testing purposes. Query: ${query}`,
                url: 'https://example.com/mock-result',
                timestamp: new Date().toISOString()
              }
            ],
            totalResults: 1,
            source: 'mock-search-api'
          },
          metadata: {
            executionTime: 100,
            capabilities: ['web-search', 'real-time-info', 'fact-checking', 'current-events'],
            responseSize: 'small'
          }
        };
      },
      healthCheck: async () => true, // Always healthy since it's a mock
      metadata: {
        description: 'Mock search service for testing when API keys are not available',
        version: '1.0.0',
        author: 'Enhanced Intelligence System',
        installComplexity: 'easy',
        performance: {
          avgResponseTime: 100,
          reliability: 1.0
        }
      }
    };

    mcpRegistry.registerTool(mockSearchTool);
  }

  private registerContentTools(): void {
    // Content Extraction Tool (Firecrawl)
    const contentExtractionTool: MCPToolDefinition = {
      id: 'mcp-firecrawl',
      name: 'Content Extraction',
      category: 'content',
      priority: 'high',
      capabilities: ['content-extraction', 'web-scraping', 'document-analysis', 'url-processing'],
      requiredEnvVars: ['FIRECRAWL_API_KEY'],
      executorFunction: async (params) => {
        const urls = params.urls as string[] || [];
        return await directMCPExecutor.executeContentExtraction(urls);
      },
      healthCheck: async () => {
        try {
          const result = await directMCPExecutor.executeContentExtraction(['https://example.com']);
          return result.success;
        } catch {
          return false;
        }
      },
      metadata: {
        description: 'Advanced web content extraction and analysis',
        version: '1.0.0',
        author: 'Firecrawl API',
        installComplexity: 'easy',
        performance: {
          avgResponseTime: 2000,
          reliability: 0.85
        }
      }
    };

    mcpRegistry.registerTool(contentExtractionTool);
  }

  private registerReasoningTools(): void {
    // Sequential Thinking Tool (Only register if API key is available)
    if (process.env.GEMINI_API_KEY) {
      const sequentialThinkingTool: MCPToolDefinition = {
        id: 'mcp-sequential-thinking',
        name: 'Sequential Thinking',
        category: 'reasoning',
        priority: 'medium',
        capabilities: ['reasoning', 'analysis', 'problem-solving', 'step-by-step', 'ai-thinking'],
        requiredEnvVars: ['GEMINI_API_KEY'],
        executorFunction: async (params) => {
          const thought = params.thought as string || '';
          return await directMCPExecutor.executeSequentialThinking(thought);
        },
        healthCheck: async () => {
          try {
            const result = await directMCPExecutor.executeSequentialThinking('test reasoning');
            return result.success;
          } catch {
            return false;
          }
        },
        metadata: {
          description: 'AI-powered step-by-step reasoning and analysis',
          version: '1.0.0',
          author: 'Enhanced Intelligence System',
          installComplexity: 'medium',
          performance: {
            avgResponseTime: 3000,
            reliability: 0.88
          }
        }
      };

      mcpRegistry.registerTool(sequentialThinkingTool);
    }

    // Mock Reasoning Tool (Always available for testing)
    const mockReasoningTool: MCPToolDefinition = {
      id: 'mcp-mock-reasoning',
      name: 'Mock Reasoning',
      category: 'reasoning',
      priority: 'medium', // Increased from 'low' to ensure it shows in top recommendations
      capabilities: ['reasoning', 'analysis', 'problem-solving', 'step-by-step'],
      requiredEnvVars: [], // No API keys required
      executorFunction: async (params) => {
        const thought = params.thought as string || '';
        // Return mock reasoning results for testing
        return {
          success: true,
          toolUsed: 'mcp-mock-reasoning',
          result: {
            thinking: `Mock analysis of: ${thought}`,
            steps: [
              'Step 1: Identify the core concepts',
              'Step 2: Analyze relationships',
              'Step 3: Draw logical conclusions'
            ],
            conclusion: `Based on mock reasoning, this appears to be about: ${thought.substring(0, 50)}`,
            confidence: 0.85
          },
          metadata: {
            executionTime: 200,
            capabilities: ['reasoning', 'analysis', 'problem-solving', 'step-by-step'],
            responseSize: 'medium'
          }
        };
      },
      healthCheck: async () => true, // Always healthy since it's a mock
      metadata: {
        description: 'Mock reasoning service for testing when API keys are not available',
        version: '1.0.0',
        author: 'Enhanced Intelligence System',
        installComplexity: 'easy',
        performance: {
          avgResponseTime: 200,
          reliability: 1.0
        }
      }
    };

    mcpRegistry.registerTool(mockReasoningTool);
  }

  private registerAutomationTools(): void {
    // Browser Automation Tool
    const browserAutomationTool: MCPToolDefinition = {
      id: 'mcp-playwright',
      name: 'Browser Automation',
      category: 'automation',
      priority: 'medium',
      capabilities: ['browser-automation', 'web-interaction', 'screenshot', 'navigation'],
      executorFunction: async (params) => {
        const url = params.url as string || '';
        return await directMCPExecutor.executeBrowserAutomation(url);
      },
      healthCheck: async () => {
        try {
          const result = await directMCPExecutor.executeBrowserAutomation('https://example.com');
          return result.success;
        } catch {
          return false;
        }
      },
      metadata: {
        description: 'Automated web browser interaction and content extraction',
        version: '1.0.0',
        author: 'Enhanced Intelligence System',
        installComplexity: 'hard',
        performance: {
          avgResponseTime: 5000,
          reliability: 0.75
        }
      }
    };

    mcpRegistry.registerTool(browserAutomationTool);
  }

  /**
   * Get intelligent tool recommendations based on user input
   */
  getToolRecommendations(
    userInput: string, 
    context: { userId: string; channelId: string; priority?: 'low' | 'medium' | 'high' | 'critical' }
  ): MCPToolDefinition[] {
    const capabilities = this.analyzeCapabilityRequirements(userInput);
    
    const executionContext = {
      userId: context.userId,
      channelId: context.channelId,
      messageContent: userInput,
      priority: context.priority || 'medium',
      requiredCapabilities: capabilities,
      fallbackAllowed: true
    };

    const recommendedTools = mcpRegistry.discoverTools(executionContext);

    logger.info('Tool recommendations generated', {
      operation: 'tool-recommendation',
      metadata: {
        userInput: userInput.substring(0, 100),
        capabilities,
        recommendedTools: recommendedTools.map(t => t.id),
        topTool: recommendedTools[0]?.id
      }
    });

    return recommendedTools.slice(0, 5); // Return top 5 recommendations
  }

  /**
   * Execute the best tool for a given input
   */
  async executeOptimalTool(
    userInput: string,
    context: { userId: string; channelId: string; priority?: 'low' | 'medium' | 'high' | 'critical' },
    additionalParams: Record<string, unknown> = {}
  ): Promise<{ toolId: string; result: unknown }> {
    const recommendations = this.getToolRecommendations(userInput, context);
    
    if (recommendations.length === 0) {
      throw new Error('No suitable tools found for the given input');
    }

    const bestTool = recommendations[0];
    const executionContext = {
      userId: context.userId,
      channelId: context.channelId,
      messageContent: userInput,
      priority: context.priority || 'medium',
      requiredCapabilities: this.analyzeCapabilityRequirements(userInput),
      fallbackAllowed: true
    };

    const params = {
      ...additionalParams,
      query: userInput,
      thought: userInput,
      url: this.extractUrls(userInput)[0],
      urls: this.extractUrls(userInput)
    };

    const result = await mcpRegistry.executeTool(bestTool.id, params, executionContext);

    return {
      toolId: bestTool.id,
      result
    };
  }

  /**
   * Get registry status
   */
  getRegistryStatus() {
    return mcpRegistry.getRegistryStatus();
  }

  /**
   * Run health checks on all tools
   */
  async runSystemHealthCheck() {
    return await mcpRegistry.runHealthChecks();
  }

  private analyzeCapabilityRequirements(userInput: string): string[] {
    const lowerInput = userInput.toLowerCase();
    const capabilities: string[] = [];

    // Memory/knowledge requirements
    if (lowerInput.includes('remember') || lowerInput.includes('recall') || lowerInput.includes('know')) {
      capabilities.push('memory', 'context');
    }

    // Search requirements
    if (lowerInput.includes('search') || lowerInput.includes('find') || lowerInput.includes('look up') || lowerInput.includes('lookup')) {
      capabilities.push('web-search', 'search');
    }

    // Content analysis requirements
    if (lowerInput.includes('analyze') || lowerInput.includes('extract') || lowerInput.includes('summarize')) {
      capabilities.push('content-extraction', 'analysis');
    }

    // URL processing requirements
    const urls = this.extractUrls(userInput);
    if (urls.length > 0) {
      capabilities.push('content-extraction', 'url-processing');
    }

    // Reasoning requirements
    if (lowerInput.includes('think') || lowerInput.includes('reason') || lowerInput.includes('explain')) {
      capabilities.push('reasoning', 'analysis');
    }

    // Current events and news requirements
    if (lowerInput.includes('current') || lowerInput.includes('latest') || lowerInput.includes('news') || 
        lowerInput.includes('recent') || lowerInput.includes('today') || lowerInput.includes('now')) {
      capabilities.push('web-search', 'real-time-info', 'current-events');
    }

    // Information gathering requirements  
    if (lowerInput.includes('information') || lowerInput.includes('info') || lowerInput.includes('data') ||
        lowerInput.includes('details') || lowerInput.includes('about')) {
      capabilities.push('web-search', 'search');
    }

    // Browse/automation requirements
    if (lowerInput.includes('browse') || lowerInput.includes('visit') || lowerInput.includes('navigate') ||
        lowerInput.includes('website') || lowerInput.includes('page')) {
      capabilities.push('browser-automation', 'web-interaction', 'content-extraction');
    }

    // Default to basic search if no specific capabilities identified
    if (capabilities.length === 0) {
      capabilities.push('search', 'reasoning');
    }

    // Remove duplicates and return
    return [...new Set(capabilities)];
  }

  private extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return text.match(urlRegex) || [];
  }

  private getTotalRegisteredTools(): number {
    return mcpRegistry.getRegistryStatus().totalTools;
  }
}

// Export singleton instance
export const mcpToolRegistration = new MCPToolRegistrationService();
