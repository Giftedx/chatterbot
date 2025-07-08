/**
 * Escalation Service
 * Routes complex queries to human moderators when AI can't handle them
 */

import { smartFlaggingService, FlaggingResult } from './smart-flagging.service.js';
import { knowledgeBaseService } from './knowledge-base.service.js';
import { logger } from '../utils/logger.js';

export interface EscalationTicket {
  id: string;
  query: string;
  userId: string;
  channelId: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  context?: {
    previousMessages?: string[];
    userRole?: string;
    channelType?: string;
    flaggingResult?: FlaggingResult;
  };
}

export interface EscalationDecision {
  shouldEscalate: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
  suggestedAssignee?: string;
  autoResponse?: string;
}

export interface EscalationConfig {
  enableAutoEscalation: boolean;
  escalationThreshold: number; // 0-1 confidence threshold
  autoResponseEnabled: boolean;
  notificationChannelId?: string;
  moderatorRoleIds: string[];
  escalationReasons: {
    [key: string]: {
      priority: 'low' | 'medium' | 'high' | 'urgent';
      autoResponse?: string;
    };
  };
}

export class EscalationService {
  private static instance: EscalationService;
  private config: EscalationConfig;

  private constructor() {
    this.config = {
      enableAutoEscalation: true,
      escalationThreshold: 0.4,
      autoResponseEnabled: true,
      moderatorRoleIds: [],
      escalationReasons: {
        'no_grounded_knowledge': {
          priority: 'medium',
          autoResponse: 'I need to escalate this to a human moderator for a more accurate response.'
        },
        'low_confidence': {
          priority: 'medium',
          autoResponse: 'I\'m not confident enough to provide a reliable answer. Let me get help from a moderator.'
        },
        'safety_concern': {
          priority: 'high',
          autoResponse: 'This requires moderator review for safety reasons.'
        },
        'complex_query': {
          priority: 'medium',
          autoResponse: 'This is a complex query that would benefit from human expertise.'
        },
        'user_request': {
          priority: 'low',
          autoResponse: 'I\'ll connect you with a human moderator as requested.'
        }
      }
    };
  }

  static getInstance(): EscalationService {
    if (!EscalationService.instance) {
      EscalationService.instance = new EscalationService();
    }
    return EscalationService.instance;
  }

  /**
   * Determine if a query should be escalated
   */
  async shouldEscalate(
    query: string,
    response: string,
    userId: string,
    channelId: string,
    context?: {
      previousMessages?: string[];
      userRole?: string;
      channelType?: string;
    }
  ): Promise<EscalationDecision> {
    try {
      // Check 1: Smart flagging analysis
      const flaggingResult = await smartFlaggingService.analyzeResponse({
        query,
        response,
        channelId,
        userId,
        context
      });

      // Check 2: Knowledge grounding
      const hasGroundedKnowledge = await knowledgeBaseService.hasGroundedKnowledge(
        query,
        0.6
      );

      // Check 3: User explicitly requested escalation
      const userRequestedEscalation = this.detectEscalationRequest(query);

      // Determine escalation decision
      let shouldEscalate = false;
      let priority: 'low' | 'medium' | 'high' | 'urgent' = 'low';
      let reason = '';
      let autoResponse = '';

      // High priority: Safety concerns
      if (flaggingResult.riskLevel === 'high') {
        shouldEscalate = true;
        priority = 'high';
        reason = 'safety_concern';
        autoResponse = this.config.escalationReasons.safety_concern.autoResponse || '';
      }
      // Medium priority: No grounded knowledge or low confidence
      else if (!hasGroundedKnowledge || flaggingResult.confidence > 0.6) {
        shouldEscalate = true;
        priority = 'medium';
        reason = !hasGroundedKnowledge ? 'no_grounded_knowledge' : 'low_confidence';
        autoResponse = this.config.escalationReasons[reason]?.autoResponse || '';
      }
      // Low priority: User requested escalation
      else if (userRequestedEscalation) {
        shouldEscalate = true;
        priority = 'low';
        reason = 'user_request';
        autoResponse = this.config.escalationReasons.user_request.autoResponse || '';
      }
      // Medium priority: Complex query
      else if (this.isComplexQuery(query)) {
        shouldEscalate = true;
        priority = 'medium';
        reason = 'complex_query';
        autoResponse = this.config.escalationReasons.complex_query.autoResponse || '';
      }

      // Override: Check if user has moderator role
      if (context?.userRole && this.config.moderatorRoleIds.includes(context.userRole)) {
        shouldEscalate = false; // Don't escalate for moderators
      }

      return {
        shouldEscalate,
        priority,
        reason,
        autoResponse: this.config.autoResponseEnabled ? autoResponse : undefined
      };
    } catch (error) {
      logger.error('Failed to determine escalation', error);
      return {
        shouldEscalate: false,
        priority: 'low',
        reason: 'error'
      };
    }
  }

  /**
   * Create escalation ticket
   */
  async createEscalationTicket(
    query: string,
    userId: string,
    channelId: string,
    reason: string,
    priority: 'low' | 'medium' | 'high' | 'urgent',
    context?: {
      previousMessages?: string[];
      userRole?: string;
      channelType?: string;
      flaggingResult?: FlaggingResult;
    }
  ): Promise<EscalationTicket> {
    try {
      const ticket: EscalationTicket = {
        id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        query,
        userId,
        channelId,
        reason,
        priority,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        context
      };

      // In a real implementation, this would be stored in a database
      logger.info('Created escalation ticket', {
        ticketId: ticket.id,
        query: query.substring(0, 100),
        userId,
        channelId,
        priority,
        reason
      });

      return ticket;
    } catch (error) {
      logger.error('Failed to create escalation ticket', error);
      throw error;
    }
  }

  /**
   * Get available moderators
   */
  async getAvailableModerators(): Promise<string[]> {
    // In a real implementation, this would query the database
    // For now, return the configured moderator role IDs
    return this.config.moderatorRoleIds;
  }

  /**
   * Assign ticket to moderator
   */
  async assignTicket(
    ticketId: string,
    moderatorId: string
  ): Promise<void> {
    try {
      logger.info('Assigned escalation ticket', {
        ticketId,
        moderatorId
      });
    } catch (error) {
      logger.error('Failed to assign ticket', error);
      throw error;
    }
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(
    ticketId: string,
    status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed'
  ): Promise<void> {
    try {
      logger.info('Updated escalation ticket status', {
        ticketId,
        status
      });
    } catch (error) {
      logger.error('Failed to update ticket status', error);
      throw error;
    }
  }

  /**
   * Get escalation statistics
   */
  async getEscalationStats(): Promise<{
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    averageResolutionTime: number;
    byPriority: Record<string, number>;
    byReason: Record<string, number>;
  }> {
    // In a real implementation, this would query the database
    return {
      totalTickets: 0,
      openTickets: 0,
      resolvedTickets: 0,
      averageResolutionTime: 0,
      byPriority: {},
      byReason: {}
    };
  }

  /**
   * Update escalation configuration
   */
  updateConfig(newConfig: Partial<EscalationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Updated escalation configuration', newConfig);
  }

  /**
   * Detect if user explicitly requested escalation
   */
  private detectEscalationRequest(query: string): boolean {
    const escalationPhrases = [
      'escalate',
      'human',
      'moderator',
      'admin',
      'support',
      'help',
      'talk to someone',
      'speak to someone'
    ];

    const queryLower = query.toLowerCase();
    return escalationPhrases.some(phrase => queryLower.includes(phrase));
  }

  /**
   * Check if query is complex
   */
  private isComplexQuery(query: string): boolean {
    // Simple heuristics for complex queries
    const complexIndicators = [
      query.length > 200, // Very long query
      query.split(' ').length > 30, // Many words
      /how\s+do\s+i\s+.*\s+.*\s+.*/i.test(query), // Multi-step how-to
      /\?.*\?.*\?/.test(query), // Multiple questions
      /(urgent|emergency|critical)/i.test(query) // Urgent language
    ];

    return complexIndicators.some(indicator => indicator);
  }

  /**
   * Send notification to moderators
   */
  async notifyModerators(ticket: EscalationTicket): Promise<void> {
    try {
      if (this.config.notificationChannelId) {
        // In a real implementation, this would send a Discord message
        logger.info('Notified moderators of escalation', {
          ticketId: ticket.id,
          channelId: this.config.notificationChannelId,
          priority: ticket.priority
        });
      }
    } catch (error) {
      logger.error('Failed to notify moderators', error);
    }
  }
}

// Export singleton instance
export const escalationService = EscalationService.getInstance(); 