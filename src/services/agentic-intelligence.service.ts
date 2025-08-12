/**
 * Agentic Intelligence Service
 * Orchestrates all agentic features for zero-hallucination, self-improving AI
 */

import { knowledgeBaseService } from './knowledge-base.service.js';
import { smartFlaggingService, FlaggingResult } from './smart-flagging.service.js';
import { sourceCitationService, CitationResult } from './source-citation.service.js';
import { escalationService, EscalationDecision } from './escalation.service.js';
import { logger } from '../utils/logger.js';
import { GeminiService } from './gemini.service.js';
import { ChatMessage } from './context-manager.js';
import { modelRouterService } from './model-router.service.js';
import { langGraphWorkflow } from '../agents/langgraph/workflow.js';

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
    previousMessages?: ChatMessage[];
    userRole?: string;
    channelType?: string;
    userPermissions?: string[];
  };
  options?: {
    includeCitations?: boolean;
    enableEscalation?: boolean;
    minConfidence?: number;
    guildId?: string;
  };
}

export class AgenticIntelligenceService {
  private static instance: AgenticIntelligenceService;
  private geminiService: GeminiService;

  private constructor(geminiService: GeminiService = new GeminiService()) {
    this.geminiService = geminiService;
  }

  static getInstance(): AgenticIntelligenceService {
    if (!AgenticIntelligenceService.instance) {
      AgenticIntelligenceService.instance = new AgenticIntelligenceService();
    }
    return AgenticIntelligenceService.instance;
  }

  /**
   * Check if the query is a request for help
   */
  private isHelpQuery(query: string): boolean {
    const helpKeywords = ['help', 'what can you do', 'capabilities', 'features', 'commands'];
    const queryLower = query.toLowerCase();
    return helpKeywords.some(keyword => queryLower.includes(keyword));
  }

  /**
   * Generate a help message describing the bot's capabilities
   */
  private getHelpMessage(): AgenticResponse {
    const startTime = Date.now();
    const response = `
**Unified Intelligence Service**

I am an advanced AI assistant with the following capabilities:

- **Continuous Learning**: I learn from our conversations to improve my responses.
- **Proactive Escalation**: I automatically detect when a query is too complex for me and escalate it to a human moderator.
- **Source Citations**: I can cite my sources to provide transparency and allow you to verify the information.
- **Contextual Awareness**: I understand the context of our conversation and can tailor my responses accordingly.

There are no special commands to use these features. Simply chat with me, and I will use the appropriate tools to assist you.
    `;

    return {
      response,
      confidence: 1,
      citations: { citations: [], hasCitations: false, confidence: 1 },
      flagging: { shouldFlag: false, reasons: [], riskLevel: 'low' },
      escalation: { shouldEscalate: false, priority: 'low', reason: '' },
      knowledgeGrounded: true,
      sourceSummary: 'This is a help message.',
      metadata: {
        processingTime: Date.now() - startTime,
        knowledgeEntriesFound: 0,
        responseQuality: 'high',
      },
    };
  }

  /**
   * Check if the query is an implicit request for escalation to a human
   */
  private isImplicitEscalation(query: string): boolean {
    const escalationKeywords = [
      'talk to a human',
      'speak to a person',
      'can I talk to someone',
      'get a moderator',
      'human help',
      'real person'
    ];
    const queryLower = query.toLowerCase();
    return escalationKeywords.some(keyword => queryLower.includes(keyword));
  }

  /**
   * Check if the query is a request for statistics
   */
  private isStatsQuery(query: string): boolean {
    const statsKeywords = ['stats', 'statistics', 'performance', 'metrics', 'status'];
    const queryLower = query.toLowerCase();
    return statsKeywords.some(keyword => queryLower.includes(keyword));
  }

  /**
   * Generate a statistics message
   */
  private async getStatsMessage(): Promise<AgenticResponse> {
    const startTime = Date.now();
    const stats = await this.getStats();

    const response = `
**System Performance & Statistics**

- **Knowledge Base**: ${stats.knowledgeBase.totalEntries} entries, ${stats.knowledgeBase.recentAdditions} added recently.
- **Moderation**: ${stats.escalation.totalTickets} escalations, ${stats.flagging.flaggedCount} items flagged.
- **Citations**: ${stats.citations.totalCitations} citations generated.

I am operating at peak performance.
    `;

    return {
      response,
      confidence: 1,
      citations: { citations: [], hasCitations: false, confidence: 1 },
      flagging: { shouldFlag: false, reasons: [], riskLevel: 'low' },
      escalation: { shouldEscalate: false, priority: 'low', reason: '' },
      knowledgeGrounded: true,
      sourceSummary: 'This is a statistics message.',
      metadata: {
        processingTime: Date.now() - startTime,
        knowledgeEntriesFound: 0,
        responseQuality: 'high',
      },
    };
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
        guildId = 'default'
      } = options || {};

      logger.info('Processing agentic query', {
        query: query.substring(0, 100),
        userId,
        channelId,
        includeCitations,
        enableEscalation
      });

      // Optional: pre-analyze with LangGraph if enabled
      try {
        const lg = await langGraphWorkflow.run({ query });
        if (lg?.intent) {
          logger.debug('LangGraph intent detected', { intent: lg.intent });
        }
      } catch {}

      // Step 0: Check for help query
      if (this.isHelpQuery(query)) {
        return this.getHelpMessage();
      }

      // Step 0.1: Check for stats query
      if (this.isStatsQuery(query)) {
        return this.getStatsMessage();
      }

      // Step 1: Check knowledge grounding
      const knowledgeGrounded = await knowledgeBaseService.hasGroundedKnowledge(
        query,
        minConfidence
      );

      // Attempt retrieval context regardless; used to enrich if not grounded
      const retrieval = await (async () => {
        try {
          const { HybridRetrievalService } = await import('./hybrid-retrieval.service.js');
          const hrs = new HybridRetrievalService({ enableWeb: true, maxLocalDocs: 3 });
          return await hrs.retrieve(query, channelId);
        } catch { return { groundedSnippets: [], citations: [], usedWeb: false }; }
      })();

      // Step 2: Generate initial response (this would come from your existing AI service)
      const initialResponse = await this.generateInitialResponse(
        query,
        userId,
        guildId,
        context
        );

      // Step 3: Smart flagging analysis
      const flaggingResult = await smartFlaggingService.analyzeResponse({
        query,
        response: initialResponse,
        channelId,
        userId,
        context: {
          ...context,
          previousMessages: context?.previousMessages?.map(m => m.parts.map(p => p.text).join(' '))
        }
      });

      // Step 4: Generate citations if requested
      const citations = includeCitations 
        ? await sourceCitationService.generateCitations(query, initialResponse, channelId)
        : { citations: [], hasCitations: false, confidence: 0 };

      // Step 5: Escalation decision
      let escalation: EscalationDecision = enableEscalation 
        ? await escalationService.shouldEscalate(
            query,
            initialResponse,
            userId,
            channelId,
            {
              ...context,
              previousMessages: context?.previousMessages?.map(m => m.parts.map(p => p.text).join(' ')),
            }
          )
        : { shouldEscalate: false, priority: 'low', reason: '' };

      // Override escalation if implicit request is detected
      if (this.isImplicitEscalation(query)) {
        escalation = {
          shouldEscalate: true,
          priority: 'high',
          reason: 'implicit_human_request',
          autoResponse: 'It sounds like you need to speak with a human. I am escalating this to a moderator for you.'
        };
      }

      // Step 6: Format final response with citations
      const formattedResponse = includeCitations && citations.hasCitations
        ? await sourceCitationService.formatResponseWithCitations(
            initialResponse,
            citations.citations
          )
        : { response: initialResponse, citations: citations.citations, confidence: 0, sourceSummary: '' };

      // Enrich with grounded snippets if not grounded and we have retrieval
      let enrichedResponse = formattedResponse.response;
      if (!knowledgeGrounded && retrieval.groundedSnippets.length > 0) {
        const snippet = retrieval.groundedSnippets.slice(0, 2).join('\n- ');
        enrichedResponse = `${formattedResponse.response}\n\nRelevant info:\n- ${snippet}`;
      }

      // Step 7: Handle escalation if needed
      if (escalation.shouldEscalate) {
        await this.handleEscalation(query, userId, channelId, escalation, flaggingResult, context);
      }

      const processingTime = Date.now() - startTime;

      const response: AgenticResponse = {
        response: enrichedResponse,
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
          responseQuality: this.assessResponseQuality(enrichedResponse, citations.hasCitations)
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
    userId: string,
    guildId: string,
    context?: {
      previousMessages?: ChatMessage[];
      userRole?: string;
      channelType?: string;
    }
  ): Promise<string> {
    const history = context?.previousMessages || [];
    return modelRouterService.generate(query, history, userId, guildId);
  }

  /**
   * Handle escalation process
   */
  private async handleEscalation(
    query: string,
    userId: string,
    channelId: string,
    escalation: EscalationDecision,
    flaggingResult: FlaggingResult,
    context?: AgenticQuery['context']
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
          {
            ...context,
            previousMessages: context?.previousMessages?.map(m => m.parts.map(p => p.text).join(' ')),
            flaggingResult,
          }
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
  async addCorrectionToKnowledgeBase(
    originalQuery: string,
    correctedResponse: string,
    moderatorId: string,
    channelId: string
  ): Promise<void> {
    try {
      // Add successful interactions to knowledge base
      // This helps the bot learn from moderator corrections
      await knowledgeBaseService.addFromDiscordMessage(
        originalQuery,
        correctedResponse,
        channelId,
        moderatorId,
        ['corrected_response'],
        0.95 // Higher confidence for moderator corrections
      );

      logger.info('Learned from moderator correction', {
        originalQuery: originalQuery.substring(0, 100),
        channelId,
        moderatorId
      });
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
    knowledgeBase: Awaited<ReturnType<typeof knowledgeBaseService.getStats>>;
    flagging: Awaited<ReturnType<typeof smartFlaggingService.getFlaggingStats>>;
    citations: Awaited<ReturnType<typeof sourceCitationService.getCitationStats>>;
    escalation: Awaited<ReturnType<typeof escalationService.getEscalationStats>>;
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
        knowledgeBase: { totalEntries: 0, bySource: {}, averageConfidence: 0, recentAdditions: 0 },
        flagging: { totalAnalyzed: 0, flaggedCount: 0, flagRate: 0, byRiskLevel: {}, byAction: {} },
        citations: { totalCitations: 0, bySource: {}, averageConfidence: 0, recentCitations: 0 },
        escalation: { totalTickets: 0, openTickets: 0, resolvedTickets: 0, averageResolutionTime: 0, byPriority: {}, byReason: {} }
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
  updateEscalationConfig(config: Parameters<typeof escalationService.updateConfig>[0]): void {
    escalationService.updateConfig(config);
  }
}

// Export singleton instance
export const agenticIntelligenceService = AgenticIntelligenceService.getInstance();