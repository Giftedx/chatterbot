/**
 * Agentic Intelligence Service
 * Orchestrates all agentic features for zero-hallucination, self-improving AI
 */

import { knowledgeBaseService } from './knowledge-base.service.js';
import { smartFlaggingService, ResponseAnalysis } from './smart-flagging.service.js';
import { sourceCitationService, CitationResult } from './source-citation.service.js';
import { escalationService, EscalationDecision } from './escalation.service.js';
import { logger } from '../utils/logger.js';

export interface AgenticResponse {
  response: string;
  confidence: number;
  citations: CitationResult;
  flagging: {
    shouldFlag: boolean;
    reasons: string[];
    riskLevel: 'low' | 'medium' | 'high';
  };
  escalation: {
    shouldEscalate: boolean;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    reason: string;
    autoResponse?: string;
  };
  knowledgeGrounded: boolean;
  sourceSummary: string;
  metadata: {
    processingTime: number;
    knowledgeEntriesFound: number;
    responseQuality: 'high' | 'medium' | 'low';
  };
}

export interface AgenticQuery {
  query: string;
  userId: string;
  channelId: string;
  context?: {
    previousMessages?: string[];
    userRole?: string;
    channelType?: string;
    userPermissions?: string[];
  };
  options?: {
    includeCitations?: boolean;
    enableEscalation?: boolean;
    minConfidence?: number;
    maxResponseLength?: number;
  };
}

export class AgenticIntelligenceService {
  private static instance: AgenticIntelligenceService;

  private constructor() {}

  static getInstance(): AgenticIntelligenceService {
    if (!AgenticIntelligenceService.instance) {
      AgenticIntelligenceService.instance = new AgenticIntelligenceService();
    }
    return AgenticIntelligenceService.instance;
  }

  /**
   * Process a query using agentic intelligence
   */
  async processQuery(agenticQuery: AgenticQuery): Promise<AgenticResponse> {
    const startTime = Date.now();
    
    try {
      const { query, userId, channelId, context, options } = agenticQuery;
      const {
        includeCitations = true,
        enableEscalation = true,
        minConfidence = 0.6,
        maxResponseLength = 2000
      } = options || {};

      logger.info('Processing agentic query', {
        query: query.substring(0, 100),
        userId,
        channelId,
        includeCitations,
        enableEscalation
      });

      // Step 1: Check knowledge grounding
      const knowledgeGrounded = await knowledgeBaseService.hasGroundedKnowledge(
        query,
        minConfidence
      );

      // Step 2: Generate initial response (this would come from your existing AI service)
      const initialResponse = await this.generateInitialResponse(query, context);

      // Step 3: Smart flagging analysis
      const flaggingResult = await smartFlaggingService.analyzeResponse({
        query,
        response: initialResponse,
        channelId,
        userId,
        context
      });

      // Step 4: Generate citations if requested
      const citations = includeCitations 
        ? await sourceCitationService.generateCitations(query, initialResponse, channelId)
        : { citations: [], hasCitations: false, confidence: 0 };

      // Step 5: Escalation decision
      const escalation: EscalationDecision = enableEscalation 
        ? await escalationService.shouldEscalate(
            query,
            initialResponse,
            userId,
            channelId,
            context
          )
        : { shouldEscalate: false, priority: 'low', reason: '' };

      // Step 6: Format final response with citations
      const formattedResponse = includeCitations && citations.hasCitations
        ? await sourceCitationService.formatResponseWithCitations(
            initialResponse,
            citations.citations
          )
        : { response: initialResponse, citations: citations.citations, confidence: 0, sourceSummary: '' };

      // Step 7: Handle escalation if needed
      if (escalation.shouldEscalate) {
        await this.handleEscalation(query, userId, channelId, escalation, context);
      }

      // Step 8: Learn from this interaction
      await this.learnFromInteraction(query, initialResponse, channelId, userId, context);

      const processingTime = Date.now() - startTime;

      const response: AgenticResponse = {
        response: formattedResponse.response,
        confidence: Math.min(1, (formattedResponse.confidence + citations.confidence) / 2),
        citations,
        flagging: {
          shouldFlag: flaggingResult.shouldFlag,
          reasons: flaggingResult.reasons,
          riskLevel: flaggingResult.riskLevel
        },
        escalation: {
          shouldEscalate: escalation.shouldEscalate,
          priority: escalation.priority,
          reason: escalation.reason,
          autoResponse: escalation.autoResponse
        },
        knowledgeGrounded,
        sourceSummary: formattedResponse.sourceSummary,
        metadata: {
          processingTime,
          knowledgeEntriesFound: citations.citations.length,
          responseQuality: this.assessResponseQuality(formattedResponse.response, citations.hasCitations)
        }
      };

      logger.info('Agentic query processed successfully', {
        query: query.substring(0, 100),
        confidence: response.confidence,
        knowledgeGrounded,
        shouldEscalate: escalation.shouldEscalate,
        processingTime
      });

      return response;
    } catch (error) {
      logger.error('Failed to process agentic query', error);
      
      // Return fallback response
      return {
        response: 'I apologize, but I encountered an error processing your request. Please try again or contact a moderator for assistance.',
        confidence: 0,
        citations: { citations: [], hasCitations: false, confidence: 0 },
        flagging: {
          shouldFlag: true,
          reasons: ['Processing error'],
          riskLevel: 'medium'
        },
        escalation: {
          shouldEscalate: true,
          priority: 'medium',
          reason: 'processing_error'
        },
        knowledgeGrounded: false,
        sourceSummary: 'Error occurred during processing',
        metadata: {
          processingTime: Date.now() - startTime,
          knowledgeEntriesFound: 0,
          responseQuality: 'low'
        }
      };
    }
  }

  /**
   * Generate initial response (placeholder - integrate with your existing AI service)
   */
  private async generateInitialResponse(
    query: string,
    context?: {
      previousMessages?: string[];
      userRole?: string;
      channelType?: string;
    }
  ): Promise<string> {
    // This is a placeholder - integrate with your existing Gemini service
    // For now, return a simple response
    return `I understand you're asking about "${query}". Let me provide you with the most accurate information I can find.`;
  }

  /**
   * Handle escalation process
   */
  private async handleEscalation(
    query: string,
    userId: string,
    channelId: string,
    escalation: EscalationDecision,
    context?: any
  ): Promise<void> {
    try {
      if (escalation.shouldEscalate) {
        // Create escalation ticket
        await escalationService.createEscalationTicket(
          query,
          userId,
          channelId,
          escalation.reason,
          escalation.priority,
          context
        );

        // Notify moderators
        // This would be implemented based on your Discord bot setup
        logger.info('Escalation handled', {
          query: query.substring(0, 100),
          userId,
          channelId,
          priority: escalation.priority,
          reason: escalation.reason
        });
      }
    } catch (error) {
      logger.error('Failed to handle escalation', error);
    }
  }

  /**
   * Learn from interaction to improve future responses
   */
  private async learnFromInteraction(
    query: string,
    response: string,
    channelId: string,
    userId: string,
    context?: any
  ): Promise<void> {
    try {
      // Add successful interactions to knowledge base
      // This helps the bot learn from its own responses
      if (context?.userRole === 'moderator' || context?.userRole === 'admin') {
        await knowledgeBaseService.addFromDiscordMessage(
          `learned_${Date.now()}`,
          response,
          channelId,
          userId,
          ['learned_response'],
          0.9
        );

        logger.info('Learned from interaction', {
          query: query.substring(0, 100),
          channelId,
          userId
        });
      }
    } catch (error) {
      logger.error('Failed to learn from interaction', error);
    }
  }

  /**
   * Assess response quality
   */
  private assessResponseQuality(
    response: string,
    hasCitations: boolean
  ): 'high' | 'medium' | 'low' {
    if (response.length < 10) return 'low';
    if (hasCitations && response.length > 50) return 'high';
    if (response.length > 100) return 'medium';
    return 'low';
  }

  /**
   * Get agentic intelligence statistics
   */
  async getStats(): Promise<{
    knowledgeBase: any;
    flagging: any;
    citations: any;
    escalation: any;
  }> {
    try {
      const [knowledgeStats, flaggingStats, citationStats, escalationStats] = await Promise.all([
        knowledgeBaseService.getStats(),
        smartFlaggingService.getFlaggingStats(),
        sourceCitationService.getCitationStats(),
        escalationService.getEscalationStats()
      ]);

      return {
        knowledgeBase: knowledgeStats,
        flagging: flaggingStats,
        citations: citationStats,
        escalation: escalationStats
      };
    } catch (error) {
      logger.error('Failed to get agentic intelligence stats', error);
      return {
        knowledgeBase: {},
        flagging: {},
        citations: {},
        escalation: {}
      };
    }
  }

  /**
   * Add FAQ to knowledge base
   */
  async addFAQ(
    question: string,
    answer: string,
    tags: string[] = []
  ): Promise<void> {
    try {
      await knowledgeBaseService.addFAQ(question, answer, tags);
      logger.info('Added FAQ to knowledge base', { question, tags });
    } catch (error) {
      logger.error('Failed to add FAQ', error);
      throw error;
    }
  }

  /**
   * Update escalation configuration
   */
  updateEscalationConfig(config: any): void {
    escalationService.updateConfig(config);
  }
}

// Export singleton instance
export const agenticIntelligenceService = AgenticIntelligenceService.getInstance(); 