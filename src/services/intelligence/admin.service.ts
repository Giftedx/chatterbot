/**
 * Intelligence Admin Features Service
 * 
 * Handles administrative features like stats, persona management,
 * and other admin-only functionality for the intelligence system.
 */

import { Message } from 'discord.js';
import { getStats } from '../analytics.js';
import { listPersonas, createOrUpdatePersona, setActivePersona } from '../persona-manager.js';
import { UserCapabilities } from './permission.service.js';
import { logger } from '../../utils/logger.js';

export interface AdminFeatureResult {
  handled: boolean;
  response?: string;
  requiresPermission?: string;
}

export class IntelligenceAdminService {
  /**
   * Handle administrative features automatically when detected
   */
  public async handleAdminFeatures(message: Message, capabilities: UserCapabilities): Promise<AdminFeatureResult> {
    try {
      const content = message.content.toLowerCase();

      // Handle stats requests
      if (content.includes('stats') || content.includes('statistics') || content.includes('usage')) {
        return await this.handleStatsRequest(capabilities);
      }

      // Handle persona management
      if (content.includes('persona') || content.includes('personality')) {
        return await this.handlePersonaRequest(message, content, capabilities);
      }

      return { handled: false };

    } catch (error) {
      logger.error('Admin feature handling failed', {
        operation: 'admin-features',
        metadata: { error: String(error) }
      });

      return {
        handled: true,
        response: '❌ There was an error processing your admin request.'
      };
    }
  }

  /**
   * Handle stats request
   */
  private async handleStatsRequest(capabilities: UserCapabilities): Promise<AdminFeatureResult> {
    if (!capabilities.hasAnalytics) {
      return {
        handled: true,
        response: '🚫 You don\'t have permission to view analytics. Contact an administrator.',
        requiresPermission: 'analytics.view'
      };
    }

    try {
      const stats = await getStats();
      const description = Object.entries(stats.perUser)
        .slice(0, 10) // Limit to top 10 users
        .map(([user, count]) => `• <@${user}>: ${count}`)
        .join('\n');
      
      const response = `📊 **Usage Statistics**\n\n${description}\n\n**Total Commands:** ${stats.total}\n**Commands Today:** ${stats.commandsToday}`;

      logger.info('Stats requested via auto-detection', {
        operation: 'auto-admin-stats',
        metadata: { statsRequested: true }
      });

      return {
        handled: true,
        response
      };
    } catch (error) {
      logger.error('Stats retrieval failed', {
        operation: 'stats-retrieval',
        metadata: { error: String(error) }
      });

      return {
        handled: true,
        response: '❌ Failed to retrieve statistics. Please try again later.'
      };
    }
  }

  /**
   * Handle persona-related requests
   */
  private async handlePersonaRequest(message: Message, content: string, capabilities: UserCapabilities): Promise<AdminFeatureResult> {
    // Handle persona listing (available to all)
    if (content.includes('list') || content.includes('show')) {
      return this.handlePersonaList();
    }
    
    // Handle persona creation (requires admin commands permission)
    const createMatch = content.match(/create persona.*?["']([^"']+)["'].*?["']([^"']+)["']/i);
    if (createMatch) {
      return await this.handlePersonaCreation(createMatch[1], createMatch[2], capabilities);
    }
    
    // Handle persona switching (available to all)
    const setMatch = content.match(/(?:set|use|switch to) persona.*?["']?([a-zA-Z]+)["']?/i);
    if (setMatch) {
      return this.handlePersonaSwitch(message, setMatch[1]);
    }

    return { handled: false };
  }

  /**
   * Handle persona list request
   */
  private handlePersonaList(): AdminFeatureResult {
    try {
      const personas = listPersonas().map(p => {
        const desc = (p as unknown as { [k: string]: unknown })['description'];
        return `• **${p.name}**: ${typeof desc === 'string' ? desc : 'No description'}`;
      }).join('\n');
      
      return {
        handled: true,
        response: `🎭 **Available Personas:**\n${personas || '• No personas available'}`
      };
    } catch (error) {
      logger.error('Persona list failed', {
        operation: 'persona-list',
        metadata: { error: String(error) }
      });

      return {
        handled: true,
        response: '❌ Failed to retrieve persona list.'
      };
    }
  }

  /**
   * Handle persona creation request
   */
  private async handlePersonaCreation(name: string, description: string, capabilities: UserCapabilities): Promise<AdminFeatureResult> {
    if (!capabilities.hasAdminCommands) {
      return {
        handled: true,
        response: '🚫 You don\'t have permission to create personas. Contact an administrator.',
        requiresPermission: 'commands.admin'
      };
    }

    try {
      await createOrUpdatePersona(name, description, [name]);
      
      logger.info('Persona created via auto-detection', {
        operation: 'auto-persona-creation',
        metadata: { personaName: name }
      });

      return {
        handled: true,
        response: `✅ Created persona **${name}**: ${description}`
      };
    } catch (error) {
      logger.error('Persona creation failed', {
        operation: 'persona-creation',
        metadata: { name, error: String(error) }
      });

      return {
        handled: true,
        response: `❌ Failed to create persona "${name}". Please try again.`
      };
    }
  }

  /**
   * Handle persona switch request
   */
  private handlePersonaSwitch(message: Message, personaName: string): AdminFeatureResult {
    try {
      setActivePersona(message.guildId || 'default', personaName);
      
      logger.info('Persona switched via auto-detection', {
        operation: 'auto-persona-switch',
        metadata: { personaName, guildId: message.guildId }
      });

      return {
        handled: true,
        response: `🎭 Switched to **${personaName}** persona`
      };
    } catch (error) {
      logger.warn('Persona switch failed', {
        operation: 'persona-switch',
        metadata: { personaName, error: String(error) }
      });

      return {
        handled: true,
        response: `❌ Failed to switch to "${personaName}" persona. Make sure it exists.`
      };
    }
  }

  /**
   * Get admin context for AI responses
   */
  public async getAdminContext(capabilities: UserCapabilities): Promise<string | null> {
    if (!capabilities.hasAnalytics && !capabilities.hasAdminCommands) {
      return null;
    }

    const contextParts = [];

    if (capabilities.hasAnalytics) {
      try {
        const stats = await getStats();
        contextParts.push(`[ADMIN INFO] Bot usage: ${stats.total} total commands, ${stats.commandsToday} today.`);
      } catch (error) {
        logger.warn('Failed to get stats for admin context', {
          operation: 'admin-context',
          metadata: { error: String(error) }
        });
      }
    }

    if (capabilities.hasAdminCommands) {
      contextParts.push('[ADMIN INFO] User has administrative command privileges.');
    }

    return contextParts.length > 0 ? contextParts.join(' ') : null;
  }

  /**
   * Check if content contains admin intent
   */
  public hasAdminIntent(content: string): boolean {
    const adminKeywords = [
      'stats', 'statistics', 'usage', 'analytics',
      'persona', 'personality', 'create persona', 'switch persona'
    ];

    return adminKeywords.some(keyword => content.toLowerCase().includes(keyword));
  }
}

// Export singleton instance
export const intelligenceAdminService = new IntelligenceAdminService();
