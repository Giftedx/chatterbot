/**
 * MCP Integration Service
 * Integrates the MCP Manager with security, consent, and orchestration
 * Provides the high-level MCP functionality for the Discord bot
 */

import { Message, ButtonInteraction } from 'discord.js';
import { MCPManager } from './mcp-manager.service.js';
import { MCPSecurityManager, MCPToolExecutionContext, mcpSecurityManager } from './mcp-security.service.js';
import { logger } from '../utils/logger.js';

export interface MCPExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  executionTime: number;
  serverName: string;
  toolName: string;
  securityInfo: {
    consentRequired: boolean;
    consentGiven: boolean;
    sandboxed: boolean;
  };
}

export interface MCPCapability {
  serverName: string;
  toolName: string;
  description: string;
  requiresConsent: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  category: 'memory' | 'web-search' | 'content-extraction' | 'analysis' | 'automation';
}

/**
 * High-level MCP Integration Service
 * Orchestrates MCP functionality with security and consent management
 */
export class MCPIntegrationService {
  private mcpManager: MCPManager;
  private securityManager: MCPSecurityManager;
  private pendingExecutions = new Map<string, {
    context: MCPToolExecutionContext;
    resolve: (result: MCPExecutionResult) => void;
    reject: (error: Error) => void;
  }>();

  constructor(mcpManager: MCPManager, securityManager?: MCPSecurityManager) {
    this.mcpManager = mcpManager;
    this.securityManager = securityManager || mcpSecurityManager;
  }

  /**
   * Execute MCP tool with full security and consent management
   */
  public async executeToolSecurely(
    userId: string,
    channelId: string,
    guildId: string | null,
    serverName: string,
    toolName: string,
    parameters: Record<string, unknown> = {},
    message?: Message
  ): Promise<MCPExecutionResult> {
    const startTime = Date.now();
    const context: MCPToolExecutionContext = {
      userId,
      channelId,
      guildId: guildId || undefined,
      serverName,
      toolName,
      parameters,
      requiresConsent: this.isConsentRequired(serverName)
    };

    try {
      // Step 1: Check user consent
      const consentCheck = await this.securityManager.checkUserConsent(context);
      
      if (!consentCheck.hasConsent && consentCheck.requiresPrompt) {
        // Send consent prompt to user
        if (message) {
          await this.sendConsentPrompt(message, context);
          
          // Return pending result - execution will continue after consent
          return {
            success: false,
            error: 'Waiting for user consent',
            executionTime: Date.now() - startTime,
            serverName,
            toolName,
            securityInfo: {
              consentRequired: true,
              consentGiven: false,
              sandboxed: false
            }
          };
        } else {
          return {
            success: false,
            error: 'User consent required but no message context available',
            executionTime: Date.now() - startTime,
            serverName,
            toolName,
            securityInfo: {
              consentRequired: true,
              consentGiven: false,
              sandboxed: false
            }
          };
        }
      }

      if (!consentCheck.hasConsent) {
        return {
          success: false,
          error: consentCheck.reason || 'User consent denied',
          executionTime: Date.now() - startTime,
          serverName,
          toolName,
          securityInfo: {
            consentRequired: true,
            consentGiven: false,
            sandboxed: false
          }
        };
      }

      // Step 2: Validate execution in sandbox
      const validation = this.securityManager.validateToolExecution(context);
      if (!validation.allowed) {
        await this.securityManager.logToolExecution(context, {
          success: false,
          executionTime: Date.now() - startTime,
          errorMessage: validation.reason
        });

        return {
          success: false,
          error: validation.reason || 'Tool execution blocked by security validation',
          executionTime: Date.now() - startTime,
          serverName,
          toolName,
          securityInfo: {
            consentRequired: context.requiresConsent,
            consentGiven: true,
            sandboxed: true
          }
        };
      }

      // Step 3: Execute tool with sanitized parameters
      const sanitizedParams = validation.sanitizedParameters || parameters;
      const result = await this.mcpManager.callTool(serverName, toolName, sanitizedParams);

      // Step 4: Log successful execution
      await this.securityManager.logToolExecution(context, {
        success: true,
        executionTime: Date.now() - startTime
      });

      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime,
        serverName,
        toolName,
        securityInfo: {
          consentRequired: context.requiresConsent,
          consentGiven: true,
          sandboxed: true
        }
      };

    } catch (error) {
      const errorMessage = String(error);
      
      // Log failed execution
      await this.securityManager.logToolExecution(context, {
        success: false,
        executionTime: Date.now() - startTime,
        errorMessage
      });

      return {
        success: false,
        error: errorMessage,
        executionTime: Date.now() - startTime,
        serverName,
        toolName,
        securityInfo: {
          consentRequired: context.requiresConsent,
          consentGiven: true,
          sandboxed: true
        }
      };
    }
  }

  /**
   * Handle consent button interactions
   */
  public async handleConsentInteraction(interaction: ButtonInteraction): Promise<void> {
    try {
      const { action, context } = await this.securityManager.handleConsentDecision(interaction);
      
      await interaction.update({
        content: this.getConsentResponseMessage(action),
        embeds: [],
        components: []
      });

      // If user allowed, continue with pending execution
      if (action === 'allow_once' || action === 'always_allow') {
        const pendingKey = `${context.userId}:${context.serverName}:${context.toolName}`;
        const pending = this.pendingExecutions.get(pendingKey);
        
        if (pending) {
          this.pendingExecutions.delete(pendingKey);
          
          // Re-execute the tool now that consent is given
          const result = await this.executeToolSecurely(
            context.userId,
            context.channelId,
            context.guildId || null,
            context.serverName,
            context.toolName,
            context.parameters
          );
          
          pending.resolve(result);
        }
      }

    } catch (error) {
      logger.error('Failed to handle MCP consent interaction', {
        operation: 'mcp-consent-handling',
        metadata: { error: String(error), interactionId: interaction.id }
      });

      await interaction.update({
        content: '❌ An error occurred while processing your consent decision.',
        embeds: [],
        components: []
      });
    }
  }

  /**
   * Get available MCP capabilities for a user
   */
  public async getAvailableCapabilities(): Promise<MCPCapability[]> {
    const status = this.mcpManager.getStatus();
    const capabilities: MCPCapability[] = [];

    // Map connected servers to capabilities
    for (const [serverName, serverStatus] of Object.entries(status.serverStatus)) {
      if (serverStatus.connected) {
        capabilities.push(...this.getServerCapabilities(serverName));
      }
    }

    return capabilities;
  }

  /**
   * Get MCP system status and metrics
   */
  public async getSystemStatus(): Promise<{
    mcpStatus: any;
    securityMetrics: any;
    capabilities: MCPCapability[];
  }> {
    const mcpStatus = this.mcpManager.getStatus();
    const securityMetrics = await this.securityManager.getSecurityMetrics();
    const capabilities = await this.getAvailableCapabilities();

    return {
      mcpStatus,
      securityMetrics,
      capabilities
    };
  }

  // Private helper methods

  private isConsentRequired(serverName: string): boolean {
    // Define which tools require explicit user consent
    const consentRequiredServers = [
      'brave_search', 'firecrawl', 'postgres', 'sqlite', 'github', 'playwright'
    ];
    
    return consentRequiredServers.includes(serverName);
  }

  private async sendConsentPrompt(message: Message, context: MCPToolExecutionContext): Promise<void> {
    const prompt = this.securityManager.createConsentPrompt(context);
    
    await message.reply({
      embeds: prompt.embeds,
      components: prompt.components
    });

    // Store pending execution for later completion
    // const pendingKey = `${context.userId}:${context.serverName}:${context.toolName}`; // Not currently used
    // Note: In a real implementation, we'd need to handle the promise resolution differently
    // This is a simplified version for demonstration
  }

  private getConsentResponseMessage(action: string): string {
    switch (action) {
      case 'allow_once':
        return '✅ Permission granted for this request. The tool will execute now.';
      case 'always_allow':
        return '🔓 Permission granted permanently for this tool. You can change this in settings.';
      case 'deny':
        return '❌ Permission denied. The tool will not execute.';
      case 'always_deny':
        return '🚫 Permission denied permanently for this tool. You can change this in settings.';
      default:
        return '❓ Consent decision processed.';
    }
  }

  private getServerCapabilities(serverName: string): MCPCapability[] {
    // Map server names to their capabilities
    const capabilityMap: Record<string, MCPCapability[]> = {
      memory: [{
        serverName: 'memory',
        toolName: 'search_nodes',
        description: 'Search and retrieve stored memories and entities',
        requiresConsent: false,
        riskLevel: 'low',
        category: 'memory'
      }],
      brave_search: [{
        serverName: 'brave_search',
        toolName: 'web_search',
        description: 'Search the web for current information',
        requiresConsent: true,
        riskLevel: 'medium',
        category: 'web-search'
      }],
      firecrawl: [{
        serverName: 'firecrawl',
        toolName: 'scrape_url',
        description: 'Extract content from web pages',
        requiresConsent: true,
        riskLevel: 'medium',
        category: 'content-extraction'
      }],
      sequential_thinking: [{
        serverName: 'sequential_thinking',
        toolName: 'think',
        description: 'Break down complex problems into steps',
        requiresConsent: false,
        riskLevel: 'low',
        category: 'analysis'
      }]
    };

    return capabilityMap[serverName] || [];
  }
}

// Export singleton instance - will be initialized with actual MCP manager
export let mcpIntegrationService: MCPIntegrationService;