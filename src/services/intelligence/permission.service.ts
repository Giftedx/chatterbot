/**
 * Intelligence Permission Service
 * 
 * Handles all permission checking and user capability validation
 * for the unified intelligence system.
 */

import { Message, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { rbacService } from '../../security/rbac-service.js';
import { logger } from '../../utils/logger.js';

export interface UserCapabilities {
  hasBasicAI: boolean;
  hasMultimodal: boolean;
  hasAdvancedAI: boolean;
  hasAnalytics: boolean;
  hasAdminCommands: boolean;
}

export interface PermissionContext {
  guildId?: string;
  channelId: string;
  userId: string;
  command?: string;
}

export class IntelligencePermissionService {
  /**
   * Check if user has basic AI permissions
   */
  public async hasBasicAIPermission(userId: string, context: Partial<PermissionContext>): Promise<boolean> {
    try {
      // Ensure user has default role if they don't have any roles
      rbacService.ensureUserHasDefaultRole(userId);
      
      return await rbacService.hasPermission(userId, 'ai.query', {
        guildId: context.guildId,
        channelId: context.channelId,
        command: context.command
      });
    } catch (error) {
      logger.warn('Permission check failed, denying access', { 
        operation: 'permission-check',
        metadata: { userId, error: String(error) }
      });
      return false;
    }
  }

  /**
   * Get comprehensive user capabilities
   */
  public async getUserCapabilities(userId: string, context: Partial<PermissionContext>): Promise<UserCapabilities> {
    try {
      const [hasBasicAI, hasMultimodal, hasAdvancedAI, hasAnalytics, hasAdminCommands] = await Promise.all([
        rbacService.hasPermission(userId, 'ai.query', { guildId: context.guildId }),
        rbacService.hasPermission(userId, 'ai.multimodal', { guildId: context.guildId }),
        rbacService.hasPermission(userId, 'ai.advanced', { guildId: context.guildId }),
        rbacService.hasPermission(userId, 'analytics.view', { guildId: context.guildId }),
        rbacService.hasPermission(userId, 'commands.admin', { guildId: context.guildId })
      ]);

      return {
        hasBasicAI,
        hasMultimodal,
        hasAdvancedAI,
        hasAnalytics,
        hasAdminCommands
      };
    } catch (error) {
      logger.error('Failed to get user capabilities', {
        operation: 'get-capabilities',
        metadata: { userId, error: String(error) }
      });

      // Return minimal permissions on error
      return {
        hasBasicAI: false,
        hasMultimodal: false,
        hasAdvancedAI: false,
        hasAnalytics: false,
        hasAdminCommands: false
      };
    }
  }

  /**
   * Generate user permission summary for AI context
   */
  public async getPermissionSummaryForAI(userId: string, guildId?: string): Promise<string | null> {
    try {
      const capabilities = await this.getUserCapabilities(userId, { guildId });
      const enabledFeatures = [];

      if (capabilities.hasMultimodal) enabledFeatures.push('multimodal analysis');
      if (capabilities.hasAdvancedAI) enabledFeatures.push('advanced AI tools and web search');
      if (capabilities.hasAnalytics) enabledFeatures.push('analytics viewing');
      if (capabilities.hasAdminCommands) enabledFeatures.push('administrative commands');

      if (enabledFeatures.length > 0) {
        return `User has access to: ${enabledFeatures.join(', ')}. You can use these capabilities naturally in your response.`;
      }
      
      return 'User has basic AI access only. Avoid mentioning advanced features they cannot access.';
    } catch (error) {
      logger.warn('Failed to get permission summary', { 
        operation: 'permission-summary',
        metadata: { userId, error: String(error) }
      });
      return null;
    }
  }

  /**
   * Sync Discord roles with RBAC system
   */
  public async syncDiscordRoles(member: GuildMember): Promise<void> {
    try {
      await rbacService.syncDiscordRoles(member);
      logger.debug('Synced Discord roles', {
        operation: 'sync-roles',
        metadata: { userId: member.id, guildId: member.guild.id }
      });
    } catch (error) {
      logger.warn('Failed to sync Discord roles', {
        operation: 'sync-roles',
        metadata: { userId: member.id, error: String(error) }
      });
    }
  }

  /**
   * Check if user has permission for specific admin command
   */
  public async hasAdminCommandPermission(userId: string, command: string, context: Partial<PermissionContext>): Promise<boolean> {
    try {
      switch (command) {
        case 'stats':
          return await rbacService.hasPermission(userId, 'analytics.view', { guildId: context.guildId });
        case 'persona-create':
          return await rbacService.hasPermission(userId, 'commands.admin', { guildId: context.guildId });
        default:
          return false;
      }
    } catch (error) {
      logger.warn('Admin permission check failed', {
        operation: 'admin-permission-check',
        metadata: { userId, command, error: String(error) }
      });
      return false;
    }
  }

  /**
   * Validate permissions for message processing
   */
  public async validateMessagePermissions(message: Message): Promise<{ allowed: boolean; reason?: string }> {
    const userId = message.author.id;
    const context = {
      guildId: message.guildId || undefined,
      channelId: message.channel.id,
      userId
    };

    // Check basic AI permission
    const hasBasicAI = await this.hasBasicAIPermission(userId, context);
    if (!hasBasicAI) {
      return {
        allowed: false,
        reason: 'You no longer have permission to use AI features. Contact an administrator if this is an error.'
      };
    }

    return { allowed: true };
  }

  /**
   * Validate permissions for command interaction
   */
  public async validateCommandPermissions(interaction: ChatInputCommandInteraction): Promise<{ allowed: boolean; reason?: string }> {
    const userId = interaction.user.id;
    const context = {
      guildId: interaction.guildId || undefined,
      channelId: interaction.channelId,
      userId,
      command: interaction.commandName
    };

    // Check basic AI permission
    const hasBasicAI = await this.hasBasicAIPermission(userId, context);
    if (!hasBasicAI) {
      return {
        allowed: false,
        reason: '🚫 **Access Denied** - You don\'t have permission to use AI features. Contact an administrator for access.'
      };
    }

    return { allowed: true };
  }
}

// Export singleton instance
export const intelligencePermissionService = new IntelligencePermissionService();
