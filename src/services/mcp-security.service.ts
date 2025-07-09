/**
 * MCP Security and Governance Framework
 * Implements user consent management, tool execution safety, and audit logging
 * as outlined in the MCP integration research document
 */

import { Message, ButtonInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

export interface MCPConsentDecision {
  userId: string;
  serverName: string;
  toolName: string;
  action: 'allow_once' | 'always_allow' | 'deny' | 'always_deny';
  timestamp: Date;
  guildId?: string;
}

export interface MCPAuditLog {
  userId: string;
  serverName: string;
  toolName: string;
  parameters: Record<string, unknown>;
  result: 'success' | 'failure' | 'blocked';
  executionTime: number;
  timestamp: Date;
  guildId?: string;
  errorMessage?: string;
}

export interface MCPToolExecutionContext {
  userId: string;
  guildId?: string;
  channelId: string;
  serverName: string;
  toolName: string;
  parameters: Record<string, unknown>;
  requiresConsent: boolean;
}

/**
 * MCP Security Manager - Handles consent, sandboxing, and audit logging
 * Implements the security framework outlined in the research document
 */
export class MCPSecurityManager {
  private consentCache = new Map<string, MCPConsentDecision>();
  private readonly consentCacheTTL = 1000 * 60 * 60; // 1 hour

  /**
   * Check if user has given consent for MCP tool execution
   */
  public async checkUserConsent(context: MCPToolExecutionContext): Promise<{
    hasConsent: boolean;
    requiresPrompt: boolean;
    reason?: string;
  }> {
    const cacheKey = `${context.userId}:${context.serverName}:${context.toolName}`;
    
    // Check cache first
    const cachedConsent = this.consentCache.get(cacheKey);
    if (cachedConsent && this.isConsentValid(cachedConsent)) {
      if (cachedConsent.action === 'always_allow') {
        return { hasConsent: true, requiresPrompt: false };
      }
      if (cachedConsent.action === 'always_deny') {
        return { hasConsent: false, requiresPrompt: false, reason: 'User previously denied access' };
      }
    }

    // Check database for persistent consent decisions
    try {
      const storedConsent = await this.getStoredConsent(context.userId, context.serverName, context.toolName);
      if (storedConsent) {
        this.consentCache.set(cacheKey, storedConsent);
        
        if (storedConsent.action === 'always_allow') {
          return { hasConsent: true, requiresPrompt: false };
        }
        if (storedConsent.action === 'always_deny') {
          return { hasConsent: false, requiresPrompt: false, reason: 'User previously denied access' };
        }
      }
    } catch (error) {
      logger.warn('Failed to check stored consent', { error: String(error), context });
    }

    // Require user prompt for consent
    return { hasConsent: false, requiresPrompt: true };
  }

  /**
   * Generate consent prompt for Discord
   */
  public createConsentPrompt(context: MCPToolExecutionContext): {
    embeds: EmbedBuilder[];
    components: ActionRowBuilder<ButtonBuilder>[];
  } {
    const embed = new EmbedBuilder()
      .setTitle('🔐 MCP Tool Permission Request')
      .setDescription(`The AI wants to use the **${context.toolName}** tool from the **${context.serverName}** server.`)
      .addFields([
        {
          name: '🛠️ Tool Details',
          value: `**Server:** ${context.serverName}\n**Tool:** ${context.toolName}`,
          inline: true
        },
        {
          name: '📋 Parameters',
          value: this.formatParameters(context.parameters),
          inline: true
        },
        {
          name: '🛡️ Security Notice',
          value: 'This tool may access external data or perform actions. Please review carefully.',
          inline: false
        }
      ])
      .setColor('#FFA500')
      .setFooter({ text: 'Your privacy and security are important to us' });

    const actionRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`mcp_consent_allow_once_${context.userId}_${context.serverName}_${context.toolName}`)
          .setLabel('Allow Once')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId(`mcp_consent_always_allow_${context.userId}_${context.serverName}_${context.toolName}`)
          .setLabel('Always Allow')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🔓'),
        new ButtonBuilder()
          .setCustomId(`mcp_consent_deny_${context.userId}_${context.serverName}_${context.toolName}`)
          .setLabel('Deny')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌'),
        new ButtonBuilder()
          .setCustomId(`mcp_consent_always_deny_${context.userId}_${context.serverName}_${context.toolName}`)
          .setLabel('Always Deny')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🚫')
      );

    return { embeds: [embed], components: [actionRow] };
  }

  /**
   * Handle consent decision from button interaction
   */
  public async handleConsentDecision(interaction: ButtonInteraction): Promise<{
    action: MCPConsentDecision['action'];
    context: MCPToolExecutionContext;
  }> {
    const customId = interaction.customId;
    const parts = customId.split('_');
    
    if (parts.length < 6 || parts[0] !== 'mcp' || parts[1] !== 'consent') {
      throw new Error('Invalid consent button interaction');
    }

    const action = parts[2] === 'allow' ? (parts[3] === 'once' ? 'allow_once' : 'always_allow') :
                   parts[2] === 'deny' ? 'deny' :
                   parts[2] === 'always' && parts[3] === 'deny' ? 'always_deny' : 'deny';
    
    const userId = parts[parts.length - 3];
    const serverName = parts[parts.length - 2];
    const toolName = parts[parts.length - 1];

    const consent: MCPConsentDecision = {
      userId,
      serverName,
      toolName,
      action: action as MCPConsentDecision['action'],
      timestamp: new Date(),
      guildId: interaction.guildId || undefined
    };

    // Store consent decision
    await this.storeConsentDecision(consent);
    
    // Update cache
    const cacheKey = `${userId}:${serverName}:${toolName}`;
    this.consentCache.set(cacheKey, consent);

    const context: MCPToolExecutionContext = {
      userId,
      serverName,
      toolName,
      guildId: interaction.guildId || undefined,
      channelId: interaction.channelId,
      parameters: {},
      requiresConsent: true
    };

    return { action: consent.action, context };
  }

  /**
   * Log MCP tool execution for audit trail
   */
  public async logToolExecution(context: MCPToolExecutionContext, result: {
    success: boolean;
    executionTime: number;
    errorMessage?: string;
  }): Promise<void> {
    const auditLog: MCPAuditLog = {
      userId: context.userId,
      serverName: context.serverName,
      toolName: context.toolName,
      parameters: context.parameters,
      result: result.success ? 'success' : 'failure',
      executionTime: result.executionTime,
      timestamp: new Date(),
      guildId: context.guildId,
      errorMessage: result.errorMessage
    };

    try {
      // Log to structured logger
      logger.info('MCP Tool Execution', {
        operation: 'mcp-tool-execution',
        metadata: auditLog
      });

      // Store in database for long-term audit trail
      await this.storeAuditLog(auditLog);
    } catch (error) {
      logger.error('Failed to log MCP tool execution', {
        operation: 'mcp-audit-logging',
        metadata: { error: String(error), auditLog }
      });
    }
  }

  /**
   * Validate tool execution in sandboxed environment
   */
  public validateToolExecution(context: MCPToolExecutionContext): {
    allowed: boolean;
    reason?: string;
    sanitizedParameters?: Record<string, unknown>;
  } {
    // Check for dangerous parameters
    const dangerous = this.checkDangerousParameters(context.parameters);
    if (dangerous.length > 0) {
      return {
        allowed: false,
        reason: `Dangerous parameters detected: ${dangerous.join(', ')}`
      };
    }

    // Sanitize parameters
    const sanitizedParameters = this.sanitizeParameters(context.parameters);

    // Check rate limits
    if (!this.checkRateLimit(context.userId, context.serverName, context.toolName)) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded for this tool'
      };
    }

    return {
      allowed: true,
      sanitizedParameters
    };
  }

  /**
   * Get comprehensive security metrics
   */
  public async getSecurityMetrics(): Promise<{
    totalExecutions: number;
    blockedExecutions: number;
    uniqueUsers: number;
    topTools: Array<{ serverName: string; toolName: string; count: number }>;
    consentDecisions: {
      allowOnce: number;
      alwaysAllow: number;
      deny: number;
      alwaysDeny: number;
    };
  }> {
    // This would query the audit logs and consent decisions
    // Simplified implementation for now
    return {
      totalExecutions: 0,
      blockedExecutions: 0,
      uniqueUsers: 0,
      topTools: [],
      consentDecisions: {
        allowOnce: 0,
        alwaysAllow: 0,
        deny: 0,
        alwaysDeny: 0
      }
    };
  }

  // Private helper methods

  private isConsentValid(consent: MCPConsentDecision): boolean {
    const now = Date.now();
    const consentTime = consent.timestamp.getTime();
    return (now - consentTime) < this.consentCacheTTL;
  }

  private async getStoredConsent(userId: string, serverName: string, toolName: string): Promise<MCPConsentDecision | null> {
    // In a real implementation, this would query the database
    // For now, return null (no stored consent)
    return null;
  }

  private async storeConsentDecision(consent: MCPConsentDecision): Promise<void> {
    // In a real implementation, this would store in the database
    logger.info('Storing MCP consent decision', {
      operation: 'mcp-consent-storage',
      metadata: consent
    });
  }

  private async storeAuditLog(auditLog: MCPAuditLog): Promise<void> {
    // In a real implementation, this would store in the database
    logger.info('Storing MCP audit log', {
      operation: 'mcp-audit-storage',
      metadata: auditLog
    });
  }

  private formatParameters(params: Record<string, unknown>): string {
    const keys = Object.keys(params);
    if (keys.length === 0) return 'None';
    if (keys.length > 3) return `${keys.slice(0, 3).join(', ')} and ${keys.length - 3} more...`;
    return keys.join(', ');
  }

  private checkDangerousParameters(params: Record<string, unknown>): string[] {
    const dangerous: string[] = [];
    const dangerousPatterns = [
      /\.\.\//, // Path traversal
      /system|exec|eval|function/i, // Code execution
      /drop|delete|truncate/i, // Database operations
      /<script|javascript:|data:/i // XSS patterns
    ];

    for (const [key, value] of Object.entries(params)) {
      const strValue = String(value);
      for (const pattern of dangerousPatterns) {
        if (pattern.test(strValue)) {
          dangerous.push(key);
          break;
        }
      }
    }

    return dangerous;
  }

  private sanitizeParameters(params: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // Basic sanitization - remove potentially dangerous characters
        sanitized[key] = value
          .replace(/[<>'"]/g, '') // Remove HTML/script chars
          .replace(/\.\./g, '.') // Remove path traversal
          .trim();
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  private checkRateLimit(userId: string, serverName: string, toolName: string): boolean {
    // Simple rate limiting - in real implementation would use Redis or similar
    // For now, always allow
    return true;
  }
}

// Export singleton instance
export const mcpSecurityManager = new MCPSecurityManager();