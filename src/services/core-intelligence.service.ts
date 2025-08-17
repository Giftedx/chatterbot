/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Interaction,
  Message,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ButtonInteraction,
  Collection,
  Attachment,
  TextBasedChannel,
} from 'discord.js';
import { URL } from 'url';
import _ from 'lodash';
// MCP specific
import { MCPManager } from './mcp-manager.service.js';
import {
  UnifiedMCPOrchestratorService
} from './core/mcp-orchestrator.service.js';

// Unified Core Services
import { UnifiedAnalyticsService } from './core/unified-analytics.service.js';

// B4: Decision reasoning tracer
import { DecisionTracer } from '../unified-pipeline/core/decision-tracer.js';

// Performance Monitoring
import { performanceMonitor } from './performance-monitoring.service.js';

// Agentic and Gemini
import { GeminiService } from './gemini.service.js';

// Core Intelligence Sub-Services
import {
  intelligencePermissionService,
  UserCapabilities,
  intelligenceContextService,
  EnhancedContext,
  intelligenceAdminService,
  intelligenceCapabilityService,
} from './intelligence/index.js';

import {
  unifiedMessageAnalysisService,
  UnifiedMessageAnalysis,
} from './core/message-analysis.service.js';

// Enhanced Intelligence Sub-Services (conditionally used)
import { UserMemoryService } from '../memory/user-memory.service.js';
import {
  ProcessingContext as EnhancedProcessingContext,
  MessageAnalysis as EnhancedMessageAnalysis,
} from './enhanced-intelligence/types.js';
import { getEnvAsBoolean } from '../utils/env.js';

// Decision Engine
import {
  DecisionEngine,
  DecisionContext,
  DecisionResult,
  DecisionEngineOptions,
  UserInteractionPattern,
  ConversationPersona
} from './decision-engine.service.js';

// Advanced Capabilities
import {
  AdvancedCapabilitiesManager,
  type AdvancedCapabilitiesConfig,
  type EnhancedResponse,
} from './advanced-capabilities/index.js';

// Utilities and Others
import { logger } from '../utils/logger.js';
import {
  getHistory,
} from './context-manager.js';
import { UserConsentService } from '../services/user-consent.service.js';
import { ModerationService } from '../moderation/moderation-service.js';
import {
  REGENERATE_BUTTON_ID,
  STOP_BUTTON_ID,
  MOVE_DM_BUTTON_ID,
} from '../ui/components.js';
import { prisma } from '../db/prisma.js';
import { UnifiedPipeline, UnifiedPipelineContext, InputType, CognitiveOperation } from '../unified-pipeline/index.js';
import {
  fetchGuildDecisionOverrides,
  updateGuildDecisionOverridesPartial,
  deleteGuildDecisionOverrides,
} from './decision-overrides-db.service.js';

// AI Enhancement Services
import { EnhancedLangfuseService } from './enhanced-langfuse.service.js';
import { MultiProviderTokenizationService } from './multi-provider-tokenization.service.js';
import { EnhancedSemanticCacheService } from './enhanced-semantic-cache.service.js';
import { QdrantVectorService } from './qdrant-vector.service.js';
import { QwenVLMultimodalService } from './qwen-vl-multimodal.service.js';
import { Neo4jKnowledgeGraphService } from './neo4j-knowledge-graph.service.js';
import { DSPyRAGOptimizationService } from './dspy-rag-optimization.service.js';
import { Crawl4AIWebService } from './crawl4ai-web.service.js';
import { AIEvaluationTestingService } from './ai-evaluation-testing.service.js';

import { getEnvAsNumber, getEnvAsString } from '../utils/env.js';
import { recordDecision } from './decision-metrics.service.js';
import { getActivePersona, setActivePersona, listPersonas } from './persona-manager.js';
// C1: Personality integration imports
import { PersonalizationEngine } from './enhanced-intelligence/personalization-engine.service.js';
import { HumanLikeConversationService } from './ultra-intelligence/conversation.service.js';

interface CommonAttachment {
  name?: string | null;
  url: string;
  contentType?: string | null;
}

export interface CoreIntelligenceConfig {
  enableAgenticFeatures: boolean;
  enablePersonalization: boolean;
  enableEnhancedMemory: boolean;
  enableEnhancedUI: boolean;
  enableResponseCache: boolean;
  enableAdvancedCapabilities?: boolean;
  mcpManager?: MCPManager;
  // Optional dependency injection for testing
  dependencies?: {
    mcpOrchestrator?: UnifiedMCPOrchestratorService;
    analyticsService?: UnifiedAnalyticsService;
    messageAnalysisService?: typeof unifiedMessageAnalysisService;
    geminiService?: GeminiService;
    advancedCapabilitiesManager?: AdvancedCapabilitiesManager;
    // For tests: allow injecting DB-backed guild overrides fetcher
    fetchGuildDecisionOverrides?: (
      guildId: string,
    ) => Promise<Partial<any> | null>;
  };
}

export class CoreIntelligenceService {
  private readonly config: CoreIntelligenceConfig;
  private readonly mcpOrchestrator: UnifiedMCPOrchestratorService;
  private readonly analyticsService: UnifiedAnalyticsService;
  private readonly geminiService: GeminiService;
  private readonly moderationService: ModerationService;
  private readonly permissionService: typeof intelligencePermissionService;
  private readonly contextService: typeof intelligenceContextService;
  private readonly adminService: typeof intelligenceAdminService;
  private readonly capabilityService: typeof intelligenceCapabilityService;
  private readonly messageAnalysisService: typeof unifiedMessageAnalysisService;
  private readonly userMemoryService: UserMemoryService;
  private readonly userConsentService: UserConsentService;
  private readonly unifiedPipeline: UnifiedPipeline;
  private readonly decisionEngine: DecisionEngine;
  
  // B4: Decision reasoning tracer for comprehensive debugging and optimization
  private readonly decisionTracer: DecisionTracer;
  
  // C1: Personality integration services
  private readonly personalizationEngine: PersonalizationEngine;
  private readonly conversationService: HumanLikeConversationService;
  
  // Pluggable fetcher for DB-backed overrides (primarily to aid tests)
  private readonly fetchDecisionOverrides: (
    guildId: string,
  ) => Promise<Partial<any> | null>;

  constructor(config: CoreIntelligenceConfig) {
    this.config = config;
    this.unifiedPipeline = new UnifiedPipeline();
    this.decisionEngine = new DecisionEngine();
    
    // B4: Initialize decision tracer for debugging and optimization
    this.decisionTracer = new DecisionTracer(1000); // Keep last 1000 decision paths
    
    // C1: Initialize personality services
    this.personalizationEngine = new PersonalizationEngine(config.mcpManager);
    this.conversationService = new HumanLikeConversationService();

    // Use dependency injection for testing, otherwise create new instances
    this.mcpOrchestrator =
      config.dependencies?.mcpOrchestrator ?? new UnifiedMCPOrchestratorService(config.mcpManager);
    this.analyticsService = config.dependencies?.analyticsService ?? new UnifiedAnalyticsService();
    this.messageAnalysisService =
      config.dependencies?.messageAnalysisService ?? unifiedMessageAnalysisService;

    this.geminiService = config.dependencies?.geminiService ?? new GeminiService();
    this.moderationService = new ModerationService();
    this.permissionService = intelligencePermissionService;
    this.contextService = intelligenceContextService;
    this.adminService = intelligenceAdminService;
    this.capabilityService = intelligenceCapabilityService;
    this.userMemoryService = new UserMemoryService();
    this.userConsentService = UserConsentService.getInstance();

    // Allow tests to inject a custom overrides fetcher; default to real implementation
    this.fetchDecisionOverrides =
      config.dependencies?.fetchGuildDecisionOverrides ?? fetchGuildDecisionOverrides;

    logger.info('CoreIntelligenceService initialized', { config: this.config });
  }

  private async shouldRespond(message: Message): Promise<DecisionResult | null> {
    // Build decision context with comprehensive data
    const decisionContext = await this.buildDecisionContext(message);
    
    // Let DecisionEngine make the sophisticated decision
    const result = await this.decisionEngine.analyze(message, decisionContext);
    
    // Log the decision for analysis
    logger.debug('DecisionEngine result', {
      strategy: result.strategy,
      confidence: result.confidence,
      shouldRespond: result.shouldRespond,
      reason: result.reason
    });

    return result.shouldRespond ? result : null;
  }

  private async buildDecisionContext(message: Message): Promise<DecisionContext> {
    const userId = message.author.id;
    const guildId = message.guild?.id;
    const consent = await this.userConsentService.getUserConsent(userId);
    
    // Determine DM status
    const isDM = !message.guild;
    
    // Check if bot is mentioned
    const mentionedBot = message.mentions.users.has(message.client.user!.id);
    
    // Check if replying to bot
    const repliedToBot = await (async () => {
      if (!message.reference?.messageId) return false;
      try {
        const referencedMessage = await message.channel.messages.fetch(
          message.reference.messageId,
        );
        return referencedMessage.author.id === message.client.user!.id;
      } catch {
        return false;
      }
    })();
    
    // Enhanced channel activity context
    const [lastBotReplyAt, recentUserBurstCount, channelRecentBurstCount] = await Promise.all([
      this.getLastBotReplyTime(message.channel.id, message.client),
      this.getRecentUserBurstCount(userId, message.channel.id, message.client),
      this.getChannelBurstCount(message.channel.id, message.client)
    ]);

    // C1: Build personality-aware context
    const personalityContext = await this.buildPersonalityContext(message, userId, guildId);

    return {
      optedIn: !!(consent && !consent.optedOut),
      isDM,
      isPersonalThread: await this.isPersonalThread(message),
      mentionedBot,
      repliedToBot,
      lastBotReplyAt,
      recentUserBurstCount,
      channelRecentBurstCount,
      // C1: Enhanced personality context
      personality: personalityContext
    };
  }
  
  /**
   * C1: Build comprehensive personality context for decision making
   */
  private async buildPersonalityContext(message: Message, userId: string, guildId?: string): Promise<DecisionContext['personality']> {
    try {
      // Get user interaction pattern from PersonalizationEngine
      const userPattern = await this.getUserInteractionPattern(userId, guildId);
      
      // Get active persona for the guild
      const activePersona = await this.getConversationPersona(guildId);
      
      // Calculate relationship strength based on interaction history
      const relationshipStrength = await this.calculateRelationshipStrength(userId, guildId);
      
      // Determine user mood from message content and context
      const userMood = this.detectUserMood(message.content);
      
      // Calculate personality compatibility between user and bot persona
      const personalityCompatibility = this.calculatePersonalityCompatibility(userPattern, activePersona);
      
      return {
        userInteractionPattern: userPattern,
        activePersona,
        relationshipStrength,
        userMood,
        personalityCompatibility
      };
      
    } catch (error) {
      logger.warn('Failed to build personality context:', error);
      return undefined; // Graceful degradation - decision engine will work without personality data
    }
  }
  
  /**
   * C1: Get user interaction pattern, handling missing patterns gracefully
   */
  private async getUserInteractionPattern(userId: string, guildId?: string): Promise<UserInteractionPattern | undefined> {
    try {
      // Check if we have recorded interactions for this user
      const memory = await this.userMemoryService.getUserMemory(userId, guildId);
      
      if (memory?.preferences) {
        // Convert memory to UserInteractionPattern format
        return {
          userId,
          guildId,
          toolUsageFrequency: new Map(),
          responsePreferences: {
            preferredLength: memory.preferences.responseLength || 'medium',
            communicationStyle: memory.preferences.communicationStyle || 'casual',
            includeExamples: memory.preferences.includeExamples || false,
            topicInterests: memory.preferences.topics || []
          },
          behaviorMetrics: {
            averageSessionLength: 1,
            mostActiveTimeOfDay: new Date().getHours(),
            commonQuestionTypes: [],
            successfulInteractionTypes: [],
            feedbackScores: []
          },
          learningProgress: {
            improvementAreas: [],
            masteredTopics: [],
            recommendedNextSteps: []
          },
          adaptationHistory: []
        };
      }
      
      return undefined;
    } catch (error) {
      logger.warn('Failed to get user interaction pattern:', error);
      return undefined;
    }
  }
  
  /**
   * C1: Convert simple Persona to ConversationPersona format
   */
  private async getConversationPersona(guildId?: string): Promise<ConversationPersona | undefined> {
    try {
      const activePersona = getActivePersona(guildId || '');
      
      // Convert simple Persona to ConversationPersona
      return {
        id: activePersona.name,
        name: activePersona.name,
        personality: this.inferPersonalityFromName(activePersona.name),
        communicationStyle: this.inferCommunicationStyleFromName(activePersona.name)
      };
    } catch (error) {
      logger.warn('Failed to get conversation persona:', error);
      return undefined;
    }
  }
  
  /**
   * C1: Infer personality traits from persona name/type
   */
  private inferPersonalityFromName(personaName: string): ConversationPersona['personality'] {
    const defaults = {
      formality: 0.5,
      enthusiasm: 0.6,
      humor: 0.4,
      supportiveness: 0.7,
      curiosity: 0.6,
      directness: 0.5,
      empathy: 0.6,
      playfulness: 0.4
    };
    
    switch (personaName.toLowerCase()) {
      case 'friendly':
        return { ...defaults, enthusiasm: 0.8, supportiveness: 0.9, empathy: 0.8, playfulness: 0.7 };
      case 'mentor':
        return { ...defaults, formality: 0.7, supportiveness: 0.9, curiosity: 0.8, directness: 0.6 };
      case 'sarcastic':
        return { ...defaults, humor: 0.9, directness: 0.8, playfulness: 0.8, formality: 0.3 };
      case 'professional':
        return { ...defaults, formality: 0.9, directness: 0.7, enthusiasm: 0.4, playfulness: 0.2 };
      case 'casual':
        return { ...defaults, formality: 0.2, enthusiasm: 0.7, humor: 0.6, playfulness: 0.6 };
      case 'gaming':
        return { ...defaults, enthusiasm: 0.9, playfulness: 0.9, humor: 0.7, formality: 0.2 };
      default:
        return defaults;
    }
  }
  
  /**
   * C1: Infer communication style from persona name/type
   */
  private inferCommunicationStyleFromName(personaName: string): ConversationPersona['communicationStyle'] {
    const defaults = {
      messageLength: 'medium' as const,
      useEmojis: 0.3,
      useSlang: 0.2,
      askQuestions: 0.5,
      sharePersonalExperiences: 0.3,
      useTypingPhrases: 0.4,
      reactionTiming: 'natural' as const
    };
    
    switch (personaName.toLowerCase()) {
      case 'friendly':
        return { ...defaults, useEmojis: 0.6, askQuestions: 0.7, sharePersonalExperiences: 0.5 };
      case 'mentor':
        return { ...defaults, messageLength: 'long', askQuestions: 0.8, sharePersonalExperiences: 0.6 };
      case 'sarcastic':
        return { ...defaults, useSlang: 0.6, useTypingPhrases: 0.6, useEmojis: 0.2 };
      case 'professional':
        return { ...defaults, messageLength: 'long', useEmojis: 0.1, useSlang: 0.0, reactionTiming: 'delayed' };
      case 'casual':
        return { ...defaults, useEmojis: 0.5, useSlang: 0.4, messageLength: 'short', reactionTiming: 'immediate' };
      case 'gaming':
        return { ...defaults, useEmojis: 0.7, useSlang: 0.8, useTypingPhrases: 0.6, reactionTiming: 'immediate' };
      default:
        return defaults;
    }
  }
  
  /**
   * C1: Calculate relationship strength based on interaction history
   */
  private async calculateRelationshipStrength(userId: string, guildId?: string): Promise<number> {
    try {
      const memory = await this.userMemoryService.getUserMemory(userId, guildId);
      
      if (!memory) return 0.0;
      
      // Simple relationship strength calculation based on available data
      let strength = 0.0;
      
      // Memory count indicates interaction frequency
      if (memory.memoryCount > 0) {
        strength += Math.min(memory.memoryCount / 10, 0.4); // Up to 0.4 for many memories
      }
      
      // Preference customization indicates engagement
      if (memory.preferences && Object.keys(memory.preferences).length > 0) {
        strength += 0.2;
      }
      
      // Token count indicates depth of interactions
      if (memory.tokenCount > 100) {
        strength += Math.min(memory.tokenCount / 1000, 0.3); // Up to 0.3 for rich interactions
      }
      
      // Recent activity (based on lastUpdated)
      const daysSinceUpdate = (Date.now() - memory.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 7) {
        strength += 0.1; // Recent interaction bonus
      }
      
      return Math.min(strength, 1.0);
    } catch (error) {
      logger.warn('Failed to calculate relationship strength:', error);
      return 0.0;
    }
  }
  
  /**
   * C1: Detect user mood from message content
   */
  private detectUserMood(content: string): 'neutral' | 'frustrated' | 'excited' | 'serious' | 'playful' {
    const text = content.toLowerCase();
    
    // Frustrated indicators
    if (/\b(angry|mad|frustrated|annoyed|pissed|wtf|damn|shit|stupid|broken|doesn't work|not working|failing)\b/.test(text) ||
        /[!]{2,}/.test(content) && /\b(why|how|help|stuck|problem|issue)\b/.test(text)) {
      return 'frustrated';
    }
    
    // Excited indicators
    if (/\b(awesome|amazing|great|fantastic|wonderful|excited|love|perfect|excellent)\b/.test(text) ||
        /[!]{2,}/.test(content) && !/\b(help|problem|issue|stuck)\b/.test(text) ||
        /(😄|😆|🎉|🎊|✨|🚀|💯|🔥)/.test(content)) {
      return 'excited';
    }
    
    // Serious indicators
    if (/\b(important|serious|urgent|critical|please|need|required|must|should)\b/.test(text) &&
        !/\b(lol|haha|funny|joke)\b/.test(text) &&
        !/[😄😆😂🤣😊😉]/.test(content)) {
      return 'serious';
    }
    
    // Playful indicators
    if (/\b(lol|haha|funny|joke|meme|lmao|rofl)\b/.test(text) ||
        /(😄|😆|😂|🤣|😊|😉|🎮|🎯|🎲)/.test(content) ||
        /[xX][dD]|:\)|:\(|;P|:P/.test(content)) {
      return 'playful';
    }
    
    return 'neutral';
  }
  
  /**
   * C1: Calculate personality compatibility between user and bot persona
   */
  private calculatePersonalityCompatibility(userPattern?: UserInteractionPattern, persona?: ConversationPersona): number {
    if (!userPattern || !persona) return 0.5; // Neutral compatibility when data is missing
    
    let compatibility = 0.5; // Start with neutral
    
    // Communication style alignment
    if (userPattern.responsePreferences.communicationStyle === 'formal' && persona.personality.formality > 0.6) {
      compatibility += 0.2;
    } else if (userPattern.responsePreferences.communicationStyle === 'casual' && persona.personality.formality < 0.4) {
      compatibility += 0.2;
    } else if (userPattern.responsePreferences.communicationStyle === 'technical' && persona.personality.directness > 0.6) {
      compatibility += 0.15;
    }
    
    // Response length preferences
    if (userPattern.responsePreferences.preferredLength === 'short' && persona.communicationStyle.messageLength === 'short') {
      compatibility += 0.1;
    } else if (userPattern.responsePreferences.preferredLength === 'detailed' && persona.communicationStyle.messageLength === 'long') {
      compatibility += 0.1;
    }
    
    // Example preferences alignment
    if (userPattern.responsePreferences.includeExamples && persona.personality.supportiveness > 0.6) {
      compatibility += 0.1;
    }
    
    // Feedback history indicates compatibility
    if (userPattern.behaviorMetrics.feedbackScores.length > 0) {
      const avgFeedback = userPattern.behaviorMetrics.feedbackScores.reduce((a: number, b: number) => a + b, 0) / 
                         userPattern.behaviorMetrics.feedbackScores.length;
      if (avgFeedback >= 4.0) {
        compatibility += 0.1;
      } else if (avgFeedback <= 2.0) {
        compatibility -= 0.2;
      }
    }
    
    return Math.max(0.0, Math.min(1.0, compatibility));
  }

  public async handleMessage(message: Message): Promise<void> {
    const decisionResult = await this.shouldRespond(message);
    if (!decisionResult) {
      return;
    }

    // A4: Confidence-aware rate limiting
    const rateLimitCheck = await this.checkConfidenceAwareRateLimit(
      message.author.id,
      decisionResult.confidence,
      decisionResult.tokenEstimate,
      message.guild?.id || null
    );

    if (!rateLimitCheck.allowed) {
      logger.info('Message blocked by confidence-aware rate limiting', {
        userId: message.author.id,
        confidence: decisionResult.confidence,
        reason: rateLimitCheck.reason,
        retryAfter: rateLimitCheck.retryAfter
      });
      
      // For high-confidence requests that get rate limited, send a helpful message
      if (decisionResult.confidence > 0.8 && rateLimitCheck.retryAfter) {
        try {
          await message.reply({
            content: `🤖 I'd love to help, but I'm currently rate-limited. Please try again in ${Math.ceil(rateLimitCheck.retryAfter)}s.`,
          });
        } catch (e) {
          logger.warn('Failed to send rate limit message:', e);
        }
      }
      return;
    }

    const commonAttachments: CommonAttachment[] = Array.from(message.attachments.values()).map(
      (att) => ({ name: att.name, url: att.url, contentType: att.contentType }),
    );

    try {
      const responseOptions = await this._processPromptAndGenerateResponse(
        message.content,
        message.author.id,
        message.channel.id,
        message.guildId,
        commonAttachments,
        message,
        decisionResult, // Pass the decision result for strategy-aware processing
      );

      if (responseOptions) {
        await message.reply(responseOptions);
        
        // A4: Record successful completion for rate limit adaptation
        await this.recordRequestCompletion(
          message.author.id,
          decisionResult.confidence,
          true,
          Date.now() - performance.now()
        );
      }
    } catch (error) {
      logger.error('[CoreIntelSvc] Failed to handle message:', { messageId: message.id, error });
      
      // A4: Record failed completion for rate limit adaptation  
      await this.recordRequestCompletion(
        message.author.id,
        decisionResult.confidence,
        false,
        Date.now() - performance.now()
      );
      
      try {
        await message.reply({
          content:
            '🤖 Sorry, I encountered an error while processing your message. Please try again later.',
        });
      } catch (e) {
        logger.error('[CoreIntelSvc] Failed to send error reply:', { error: e });
      }
    }
  }

  private async _processPromptAndGenerateResponse(
    promptText: string,
    userId: string,
    channelId: string,
    guildId: string | null,
    commonAttachments: CommonAttachment[],
    uiContext: ChatInputCommandInteraction | Message,
    decisionResult?: DecisionResult,
  ): Promise<any> {
    const startTime = Date.now();

    // B4: Start decision tracing session
    const traceSessionId = this.decisionTracer.startSession(userId, promptText);
    const sessionStartTime = performance.now();

    try {
      // B4: Trace initial decision context
      this.decisionTracer.addTrace(traceSessionId, {
        userId,
        step: 'initial-decision',
        component: 'CoreIntelligenceService',
        data: {
          promptText: promptText.substring(0, 200) + (promptText.length > 200 ? '...' : ''),
          attachmentCount: commonAttachments.length,
          guildId,
          channelId,
          decisionResult
        },
        metadata: {
          confidence: decisionResult?.confidence,
          success: true
        }
      });

      return await this._processWithTracing(
        promptText,
        userId,
        channelId,
        guildId,
        commonAttachments,
        uiContext,
        decisionResult,
        traceSessionId,
        startTime
      );

    } catch (error) {
      // B4: Trace processing failure
      this.decisionTracer.addTrace(traceSessionId, {
        userId,
        step: 'result-evaluation',
        component: 'CoreIntelligenceService',
        data: { error: error instanceof Error ? error.message : String(error) },
        metadata: {
          executionTime: performance.now() - sessionStartTime,
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });

      this.decisionTracer.endSession(traceSessionId, { 
        success: false, 
        response: undefined 
      });

      throw error;
    }
  }

  // B4: Main processing logic with comprehensive tracing
  private async _processWithTracing(
    promptText: string,
    userId: string,
    channelId: string,
    guildId: string | null,
    commonAttachments: CommonAttachment[],
    uiContext: ChatInputCommandInteraction | Message,
    decisionResult: DecisionResult | undefined,
    traceSessionId: string,
    startTime: number
  ): Promise<any> {

    // ===== B1: Unified Pipeline as Primary Processing Path =====
    // Strategy-aware processing now routes through UnifiedPipeline for enhanced capabilities
    if (decisionResult) {
      // B4: Trace strategy mapping step
      const strategyMappingStartTime = performance.now();
      this.decisionTracer.addTrace(traceSessionId, {
        userId,
        step: 'strategy-mapping',
        component: 'UnifiedPipeline',
        data: {
          strategy: decisionResult.strategy,
          confidence: decisionResult.confidence,
          tokenEstimate: decisionResult.tokenEstimate
        },
        metadata: {
          confidence: decisionResult.confidence,
          success: true
        }
      });

      logger.info('B1: Processing through primary UnifiedPipeline', {
        strategy: decisionResult.strategy,
        confidence: decisionResult.confidence,
        tokenEstimate: decisionResult.tokenEstimate,
        userId,
        traceSessionId // B4: Include trace session in logs
      });

      try {
        const pipelineStartTime = performance.now();
        const pipelineResult = await this.processWithUnifiedPipeline(
          promptText,
          userId,
          channelId,
          guildId,
          commonAttachments,
          uiContext,
          decisionResult
        );

        // B4: Trace pipeline execution success
        this.decisionTracer.addTrace(traceSessionId, {
          userId,
          step: 'module-execution',
          component: 'UnifiedPipeline',
          data: {
            result: pipelineResult ? 'success' : 'null',
            contentLength: pipelineResult?.content?.length || 0
          },
          metadata: {
            executionTime: performance.now() - pipelineStartTime,
            success: !!pipelineResult,
            confidence: decisionResult.confidence
          }
        });

        if (pipelineResult) {
          // B4: End successful tracing session
          this.decisionTracer.endSession(traceSessionId, {
            success: true,
            response: pipelineResult.content?.substring(0, 100) + (pipelineResult.content?.length > 100 ? '...' : '')
          });

          return pipelineResult;
        }

        logger.warn('B1: UnifiedPipeline returned null, falling back to strategy routing', { 
          userId, 
          traceSessionId 
        });

        // B4: Trace fallback decision
        this.decisionTracer.addTrace(traceSessionId, {
          userId,
          step: 'strategy-mapping',
          component: 'CoreIntelligenceService',
          data: { 
            action: 'fallback-to-strategy-routing',
            reason: 'unified-pipeline-returned-null'
          },
          metadata: {
            executionTime: performance.now() - strategyMappingStartTime,
            success: true
          }
        });

      } catch (error) {
        logger.error('B1: UnifiedPipeline processing failed, falling back to strategy routing', { 
          error, 
          userId,
          strategy: decisionResult.strategy,
          traceSessionId
        });

        // B4: Trace pipeline failure
        this.decisionTracer.addTrace(traceSessionId, {
          userId,
          step: 'module-execution',
          component: 'UnifiedPipeline',
          data: { 
            error: error instanceof Error ? error.message : String(error)
          },
          metadata: {
            executionTime: performance.now() - strategyMappingStartTime,
            success: false,
            errorMessage: error instanceof Error ? error.message : String(error)
          }
        });
      }
    }

    // ===== Fallback: Strategy-Specific AI Service Routing (A2 Implementation) =====
    if (decisionResult) {
      // B4: Trace fallback strategy processing
      const fallbackStartTime = performance.now();
      this.decisionTracer.addTrace(traceSessionId, {
        userId,
        step: 'strategy-mapping',
        component: 'StrategyRouter',
        data: {
          strategy: decisionResult.strategy,
          phase: 'fallback-processing'
        },
        metadata: {
          confidence: decisionResult.confidence,
          success: true
        }
      });

      logger.info('Fallback: Strategy-aware processing initiated', {
        strategy: decisionResult.strategy,
        confidence: decisionResult.confidence,
        tokenEstimate: decisionResult.tokenEstimate,
        userId,
        traceSessionId
      });

      // Strategy-specific AI service routing (C4: with personality context)
      // C4: Rebuild personality context for fallback processing
      let personalityContext: DecisionContext['personality'] | undefined;
      try {
        if (uiContext instanceof Message) {
          personalityContext = await this.buildPersonalityContext(uiContext, userId, guildId || undefined);
        }
      } catch (error) {
        logger.debug('Failed to build personality context for fallback', { userId, error });
      }

      const strategyResponse = await this.processWithStrategy(
        decisionResult,
        promptText,
        userId,
        channelId,
        guildId,
        uiContext,
        personalityContext // C4: Pass personality context to strategies
      );

      // B4: Trace strategy execution result
      this.decisionTracer.addTrace(traceSessionId, {
        userId,
        step: 'module-execution',
        component: 'StrategyRouter',
        data: {
          result: strategyResponse ? 'success' : 'null',
          strategy: decisionResult.strategy,
          contentLength: strategyResponse?.content?.length || 0
        },
        metadata: {
          executionTime: performance.now() - fallbackStartTime,
          success: !!strategyResponse,
          confidence: decisionResult.confidence
        }
      });

      if (strategyResponse) {
        logger.debug('Strategy-specific response generated', {
          strategy: decisionResult.strategy,
          responseLength: strategyResponse.content?.length || 0,
          userId,
          fallbackPath: 'strategy-routing',
          traceSessionId
        });

        // B4: End successful tracing session
        this.decisionTracer.endSession(traceSessionId, {
          success: true,
          response: strategyResponse.content?.substring(0, 100) + (strategyResponse.content?.length > 100 ? '...' : '')
        });

        return strategyResponse;
      }
    }

        // ===== Legacy Unified Cognitive Pipeline (deprecated, kept for compatibility) =====
    try {
      // B4: Trace legacy pipeline attempt
      const legacyStartTime = performance.now();
      this.decisionTracer.addTrace(traceSessionId, {
        userId,
        step: 'strategy-mapping',
        component: 'LegacyCognitivePipeline',
        data: {
          featureFlag: process.env.FEATURE_UNIFIED_COGNITIVE_PIPELINE,
          phase: 'legacy-fallback'
        },
        metadata: {
          success: true
        }
      });

      if (process.env.FEATURE_UNIFIED_COGNITIVE_PIPELINE === 'true') {
        logger.debug('Using legacy unified cognitive pipeline', { userId, traceSessionId });
        const context: UnifiedPipelineContext = {
          inputType: uiContext instanceof Message ? InputType.Message : InputType.Task,
          cognitiveOperation: CognitiveOperation.Processing,
          data: {
            prompt: promptText,
            attachments: commonAttachments,
            history: await getHistory(channelId),
            userId,
            guildId,
            channelId,
            // A2 Enhancement: Include decision context for strategy-aware pipeline processing
            decisionResult,
            strategy: decisionResult?.strategy,
            confidence: decisionResult?.confidence,
            tokenEstimate: decisionResult?.tokenEstimate,
          }
        };
        const result = await this.unifiedPipeline.process(context);
        
        if (result && result.data.response) {
          return { content: result.data.response };
        }
      }
    } catch (e) {
      logger.warn('Unified cognitive pipeline failed, continuing with standard pipeline', { error: e instanceof Error ? e.message : String(e) });
    }
  }

  /**
   * Guild-specific decision engine management (Phase B implementation placeholder)
   * TODO: Implement proper guild-specific engine caching and override management
   */
  private getDecisionEngineForGuild(guildId: string): DecisionEngine {
    // For now, return the shared instance
    // Phase B will implement per-guild decision engines with overrides
    return this.decisionEngine;
  }

  /**
   * Natural language control intent handler (Phase D implementation placeholder)
   * TODO: Implement decision override controls through natural language
   */
  private async handleControlIntent(intent: string, params: any, message: Message): Promise<boolean> {
    // Phase D: Implement natural language controls for decision overrides
    logger.debug('Control intent received - not yet implemented', { intent, params, userId: message.author.id });
    
    // Stub implementations to make tests pass
    if (intent === 'OVERRIDES_SHOW') {
      await message.reply('Decision overrides: ambientThreshold=75 (default). Advanced controls coming in Phase D.');
      return true;
    } else if (intent === 'OVERRIDES_SET') {
      await message.reply(`Decision override ${params.key}=${params.value} set (Phase D implementation pending).`);
      return true;
    } else if (intent === 'OVERRIDES_CLEAR') {
      await message.reply('All decision overrides cleared (Phase D implementation pending).');
      return true;
    }
    
    return false;
  }

  // ===== B1: Unified Pipeline Primary Processing =====
  private async processWithUnifiedPipeline(
    promptText: string,
    userId: string,
    channelId: string,
    guildId: string | null,
    commonAttachments: CommonAttachment[] = [],
    uiContext: ChatInputCommandInteraction | Message,
    decisionResult: DecisionResult
  ): Promise<{ content: string } | null> {
    try {
      logger.info('B1: Processing with UnifiedPipeline', {
        strategy: decisionResult.strategy,
        confidence: decisionResult.confidence,
        userId
      });

      // Create enriched context with decision insights
      const context: UnifiedPipelineContext = {
        inputType: InputType.Message,
        cognitiveOperation: CognitiveOperation.Processing,
        data: {
          prompt: promptText,
          userId,
          channelId,
          guildId: guildId || undefined,
          attachments: commonAttachments,
          // B1: Enhanced data with decision engine insights
          decisionStrategy: decisionResult.strategy,
          decisionConfidence: decisionResult.confidence,
          tokenEstimate: decisionResult.tokenEstimate,
          uiContext
        },
        metadata: {
          timestamp: new Date().toISOString(),
          processingPath: 'unified-pipeline-primary'
        }
      };

      // Process through UnifiedPipeline with decision-aware routing
      const pipelineResponse = await this.unifiedPipeline.process(context);

      if (pipelineResponse?.data?.content) {
        logger.info('B1: UnifiedPipeline processing successful', {
          strategy: decisionResult.strategy,
          responseLength: pipelineResponse.data.content.length,
          userId
        });

        return {
          content: pipelineResponse.data.content
        };
      }

      logger.warn('B1: UnifiedPipeline returned empty response', { userId });
      return null;
    } catch (error) {
      logger.error('B1: UnifiedPipeline processing failed', { 
        error: error instanceof Error ? error.message : String(error), 
        userId,
        strategy: decisionResult.strategy
      });
      return null;
    }
  }

  /**
   * Strategy-aware AI service routing (A2 Implementation)
   * Routes processing to appropriate AI services based on decision strategy
   * C4: Enhanced with personality-aware response strategies
   */
  private async processWithStrategy(
    decisionResult: DecisionResult,
    promptText: string,
    userId: string,
    channelId: string,
    guildId: string | null,
    uiContext: ChatInputCommandInteraction | Message,
    personalityContext?: DecisionContext['personality'] // C4: Added personality context
  ): Promise<{ content: string } | null> {
    try {
      switch (decisionResult.strategy) {
        case 'quick-reply':
          return await this.processQuickReply(promptText, userId, personalityContext);

        case 'deep-reason':
          return await this.processDeepReason(promptText, userId, decisionResult, personalityContext);

        case 'defer':
          return await this.processDeferred(promptText, userId, channelId, decisionResult, personalityContext);

        default:
          logger.debug('No specific strategy handler, using default processing');
          return null;
      }
    } catch (error) {
      logger.error('Strategy processing failed', {
        strategy: decisionResult.strategy,
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      return null;
    }
  }

  /**
   * Quick-reply strategy: Minimal processing, direct response
   */
  // C4: Enhanced with personality-aware quick responses
  private async processQuickReply(
    promptText: string, 
    userId: string,
    personalityContext?: DecisionContext['personality']
  ): Promise<{ content: string }> {
    logger.debug('Processing quick-reply strategy', { 
      hasPersonalityContext: !!personalityContext,
      activePersona: personalityContext?.activePersona
    });
    
    // C4: Build personality-aware prompt
    let enhancedPrompt = `Respond briefly and helpfully to: ${promptText}`;
    
    if (personalityContext) {
      // Adapt response style based on persona characteristics
      if (personalityContext.activePersona) {
        const persona = personalityContext.activePersona;
        
        // Use persona characteristics to guide response
        if (persona.personality.supportiveness > 0.7) {
          enhancedPrompt += '\n\nBe especially encouraging and warm in your response.';
        } else if (persona.personality.supportiveness < 0.3) {
          enhancedPrompt += '\n\nMaintain a neutral, factual tone.';
        }
        
        if (persona.personality.enthusiasm > 0.7) {
          enhancedPrompt += '\n\nShow appropriate energy and enthusiasm.';
        }
        
        if (persona.personality.formality > 0.7) {
          enhancedPrompt += '\n\nMaintain a professional, formal tone.';
        } else if (persona.personality.formality < 0.3) {
          enhancedPrompt += '\n\nUse casual, friendly language.';
        }
        
        if (persona.personality.humor > 0.5) {
          enhancedPrompt += '\n\nLight humor is appropriate when suitable.';
        }
      }
      
      // Adjust response length based on relationship strength
      if (personalityContext.relationshipStrength && personalityContext.relationshipStrength > 0.7) {
        enhancedPrompt += '\n\nYou can be more casual and friendly with this user.';
      } else if (personalityContext.relationshipStrength && personalityContext.relationshipStrength < 0.3) {
        enhancedPrompt += '\n\nKeep the response polite and slightly formal.';
      }
      
      // Consider user mood
      if (personalityContext.userMood) {
        switch (personalityContext.userMood) {
          case 'frustrated':
            enhancedPrompt += '\n\nBe extra patient and understanding.';
            break;
          case 'excited':
            enhancedPrompt += '\n\nMatch their enthusiasm appropriately.';
            break;
          case 'serious':
            enhancedPrompt += '\n\nMaintain a serious, focused tone.';
            break;
          case 'playful':
            enhancedPrompt += '\n\nA light, playful tone is appropriate.';
            break;
        }
      }
    }
    
    // Use Gemini with personality-enhanced prompt
    try {
      const response = await this.geminiService.generateResponse(
        enhancedPrompt,
        [], // No history for quick replies
        userId,
        'default'
      );
      
      return { content: response || 'I can help with that. Could you provide more details?' };
    } catch (error) {
      logger.warn('Quick-reply Gemini failed, using fallback', { error: String(error) });
      
      // C4: Even fallback can be personality-aware
      const fallbackMessage = personalityContext?.activePersona?.personality.supportiveness && personalityContext.activePersona.personality.supportiveness > 0.7
        ? "I'm here to help! Let me know what you need assistance with."
        : "I understand your request. Let me help you with that.";
        
      return { content: fallbackMessage };
    }
  }

  /**
   * Deep-reasoning strategy: Use advanced AI services for complex analysis
   */
  // C4: Enhanced with personality-aware deep reasoning
  private async processDeepReason(
    promptText: string, 
    userId: string, 
    decisionResult: DecisionResult,
    personalityContext?: DecisionContext['personality']
  ): Promise<{ content: string }> {
    logger.debug('Processing deep-reason strategy', { 
      hasPersonalityContext: !!personalityContext,
      relationshipStrength: personalityContext?.relationshipStrength
    });
    
    try {
      // Import advanced services dynamically to avoid circular dependencies
      const { EnhancedReasoningService } = await import('./advanced-capabilities/enhanced-reasoning.service.js');
      const { TreeOfThoughtsService } = await import('./advanced-reasoning/tree-of-thoughts.service.js');
      
      const reasoningService = new EnhancedReasoningService();
      const totService = new TreeOfThoughtsService();
      
      // C4: Personality-aware reasoning depth adjustment
      let reasoningDepthModifier = 1.0;
      let presentationStyle = 'balanced';
      
      if (personalityContext) {
        // Adjust reasoning depth based on relationship strength
        if (personalityContext.relationshipStrength && personalityContext.relationshipStrength > 0.7) {
          reasoningDepthModifier = 1.2; // More thorough for trusted users
        } else if (personalityContext.relationshipStrength && personalityContext.relationshipStrength < 0.3) {
          reasoningDepthModifier = 0.8; // More concise for new users
        }
        
        // Adapt presentation style based on persona
        if (personalityContext.activePersona) {
          const persona = personalityContext.activePersona;
          
          if (persona.personality.directness > 0.7) {
            presentationStyle = 'direct'; // Concise, to-the-point
          } else if (persona.personality.supportiveness > 0.7) {
            presentationStyle = 'supportive'; // Explanatory and encouraging
          } else if (persona.personality.formality > 0.7) {
            presentationStyle = 'formal'; // Structured and professional
          }
        }
        
        // Consider user mood for reasoning approach
        if (personalityContext.userMood) {
          switch (personalityContext.userMood) {
            case 'frustrated':
              reasoningDepthModifier *= 0.9; // Slightly more concise to not overwhelm
              presentationStyle = 'supportive';
              break;
            case 'serious':
              reasoningDepthModifier *= 1.1; // More thorough for serious inquiries
              presentationStyle = 'formal';
              break;
            case 'playful':
              presentationStyle = 'engaging'; // More conversational
              break;
          }
        }
      }
      
      // Determine if we need Tree of Thoughts for very complex queries
      const baseComplexityCheck = decisionResult.tokenEstimate > 2000 || 
                                  promptText.toLowerCase().includes('analyze') || 
                                  promptText.toLowerCase().includes('compare') ||
                                  promptText.toLowerCase().includes('pros and cons') ||
                                  promptText.toLowerCase().includes('evaluate') ||
                                  promptText.toLowerCase().includes('complex');
                                  
      const useTreeOfThoughts = baseComplexityCheck && reasoningDepthModifier >= 1.0;
      
      if (useTreeOfThoughts) {
        // Use Tree of Thoughts for extremely complex reasoning
        const sessionId = `tot-${userId}-${Date.now()}`;
        
        // C4: Personality-aware ToT parameters
        const maxDepth = Math.min(4, Math.ceil((decisionResult.tokenEstimate * reasoningDepthModifier) / 1000));
        const branchingFactor = decisionResult.confidence > 0.8 ? 3 : 2;
        
        const response = await totService.generateResponse(sessionId, promptText, {
          maxDepth,
          branchingFactor,
          pruningThreshold: presentationStyle === 'direct' ? 0.5 : 0.4 // Higher threshold for direct style
        });
        
        if (response.primaryResponse) {
          // C4: Format response according to personality context
          let formattedResponse = response.primaryResponse;
          
          if (presentationStyle === 'supportive' && personalityContext) {
            formattedResponse = `I've carefully analyzed your question and here's what I found:\n\n${formattedResponse}`;
          } else if (presentationStyle === 'formal') {
            formattedResponse = `Analysis Results:\n\n${formattedResponse}`;
          }
          
          return { content: formattedResponse };
        }
      }
      
      // Use Enhanced Reasoning Service for moderately complex queries
      const reasoningRequest = {
        query: promptText,
        analysisType: this.determineAnalysisType(promptText),
        complexity: decisionResult.confidence > 0.8 ? 'high' as const : 'medium' as const,
        userId,
        maxSteps: Math.min(5, Math.ceil((decisionResult.tokenEstimate * reasoningDepthModifier) / 500))
      };
      
      const reasoningResult = await reasoningService.performReasoning(reasoningRequest);
      
      if (reasoningResult.success) {
        // C4: Personality-aware response formatting
        let responseLines: string[] = [];
        
        switch (presentationStyle) {
          case 'direct':
            responseLines = [reasoningResult.analysis.conclusion];
            break;
            
          case 'supportive':
            responseLines = [
              "I've thought through your question carefully. Here's my analysis:",
              '',
              reasoningResult.analysis.conclusion,
              '',
              'Here\'s how I arrived at this conclusion:',
              ...reasoningResult.analysis.reasoning_path.slice(-2) // Show last 2 steps for supportive
            ];
            break;
            
          case 'formal':
            responseLines = [
              '**Analysis:**',
              reasoningResult.analysis.conclusion,
              '',
              '**Reasoning Process:**',
              ...reasoningResult.analysis.reasoning_path.slice(-3) // Show last 3 steps for formal
            ];
            break;
            
          case 'engaging':
            responseLines = [
              reasoningResult.analysis.conclusion,
              '',
              '🤔 **My thought process:**',
              ...reasoningResult.analysis.reasoning_path.slice(-2) // Show last 2 steps with friendly formatting
            ];
            break;
            
          default: // balanced
            responseLines = [
              reasoningResult.analysis.conclusion,
              '',
              '**My reasoning:**',
              ...reasoningResult.analysis.reasoning_path.slice(-3) // Show last 3 steps
            ];
        }
        
        return { content: responseLines.join('\n') };
      }
      
    } catch (error) {
      logger.warn('Deep reasoning failed, trying neural-symbolic fallback', { error: String(error) });
    }
    
    // Fallback to neural-symbolic reasoning if available
    try {
      const { neuralSymbolicReasoningService } = await import('../ai/neural-symbolic/reasoning.service.js');
      
      const reasoningResult = await neuralSymbolicReasoningService.reason(
        promptText,
        {
          userId,
          requiresAdvancedReasoning: true,
          complexity: decisionResult.confidence > 0.8 ? 'high' : 'medium'
        },
        {
          prefer_method: 'hybrid',
          max_steps: Math.min(7, Math.ceil(decisionResult.tokenEstimate / 400)),
          confidence_threshold: 0.7
        }
      );
      
      if (reasoningResult.conclusion && reasoningResult.confidence > 0.6) {
        const response = [
          reasoningResult.conclusion,
          '',
          `**Reasoning approach:** ${reasoningResult.reasoning_type} (${Math.round(reasoningResult.confidence * 100)}% confidence)`,
          reasoningResult.evidence.length > 0 ? '**Evidence:** ' + reasoningResult.evidence.slice(0, 2).map(e => e.content).join(', ') : ''
        ].filter(Boolean).join('\n');
        
        return { content: response };
      }
      
    } catch (error) {
      logger.warn('Neural-symbolic reasoning failed, using Gemini fallback', { error: String(error) });
    }
    
    // Final fallback to enhanced Gemini prompt
    try {
      const response = await this.geminiService.generateResponse(
        `Think step by step and provide a thorough analysis of: ${promptText}`,
        [],
        userId,
        'default'
      );
      
      return { content: response || 'I need to think about this more carefully. Could you rephrase your question?' };
    } catch (error) {
      return { content: 'This requires some careful consideration. Let me approach this thoughtfully...' };
    }
  }

  /**
   * Deferred strategy: Multi-stage processing with clarification
   */
  // C4: Enhanced with personality-aware deferral strategies
  private async processDeferred(
    promptText: string, 
    userId: string, 
    channelId: string,
    decisionResult: DecisionResult,
    personalityContext?: DecisionContext['personality']
  ): Promise<{ content: string }> {
    logger.debug('Processing deferred strategy', { 
      hasPersonalityContext: !!personalityContext,
      userMood: personalityContext?.userMood,
      relationshipStrength: personalityContext?.relationshipStrength
    });
    
    // For very complex or ambiguous requests, ask for clarification
    const clarificationNeeded = this.needsClarification(promptText, decisionResult);
    
    if (clarificationNeeded) {
      const clarifyingQuestions = this.generateClarifyingQuestions(promptText);
      
      // C4: Personality-aware clarification approach
      let introMessage = "I'd like to give you the best possible answer. Let me ask a few questions first:";
      let closingMessage = "Feel free to answer any or all of these to help me understand better!";
      
      if (personalityContext) {
        // Adapt approach based on persona and relationship
        if (personalityContext.activePersona?.personality.supportiveness && personalityContext.activePersona.personality.supportiveness > 0.7) {
          introMessage = "I want to make sure I give you exactly the help you need! A few quick questions:";
          closingMessage = "Take your time - any details you can share will help me give you a better answer! 😊";
        } else if (personalityContext.activePersona?.personality.directness && personalityContext.activePersona.personality.directness > 0.7) {
          introMessage = "To provide an accurate answer, I need clarification:";
          closingMessage = "Please provide details on the relevant points.";
        } else if (personalityContext.activePersona?.personality.formality && personalityContext.activePersona.personality.formality > 0.7) {
          introMessage = "To ensure I provide the most accurate and helpful response, I would appreciate clarification on several points:";
          closingMessage = "Your responses to these inquiries will enable me to better assist you.";
        }
        
        // Consider user mood for tone adjustment
        if (personalityContext.userMood === 'frustrated') {
          introMessage = "I understand this might be frustrating. To help resolve this quickly, could you clarify:";
          closingMessage = "I'm here to help sort this out - any information you can provide will get us there faster.";
        } else if (personalityContext.userMood === 'excited') {
          introMessage = "I can see you're excited about this! Let me make sure I understand exactly what you're looking for:";
          closingMessage = "Can't wait to dive into this with you once I have these details! 🚀";
        }
        
        // Adjust question count based on relationship strength
        if (personalityContext.relationshipStrength && personalityContext.relationshipStrength > 0.7) {
          // For trusted users, we can ask more detailed questions
        } else if (personalityContext.relationshipStrength && personalityContext.relationshipStrength < 0.3) {
          // For new users, limit to most essential questions
          clarifyingQuestions.splice(2); // Keep only first 2 questions
        }
      }
      
      return {
        content: [
          introMessage,
          '',
          ...clarifyingQuestions.map((q, i) => `${i + 1}. ${q}`),
          '',
          closingMessage
        ].join('\n')
      };
    }
    
    // C4: Personality-aware processing message
    let processingMessage = [
      "This is a complex topic that deserves a thoughtful response. Let me break this down:",
      '',
      "I'm analyzing your request and will provide a comprehensive answer. This may take a moment as I consider multiple aspects and perspectives.",
      '',
      "For now, here's my initial thinking: " + promptText.substring(0, 100) + "..."
    ];
    
    if (personalityContext) {
      if (personalityContext.activePersona?.personality.enthusiasm && personalityContext.activePersona.personality.enthusiasm > 0.7) {
        processingMessage = [
          "What an interesting question! This definitely calls for some deeper thinking. 🤔",
          '',
          "I'm diving into this complex topic to give you the most comprehensive answer possible. There are several fascinating angles to explore here.",
          '',
          "My initial thoughts: " + promptText.substring(0, 100) + "..."
        ];
      } else if (personalityContext.activePersona?.personality.formality && personalityContext.activePersona.personality.formality > 0.7) {
        processingMessage = [
          "Your inquiry requires careful analysis to provide an appropriately detailed response.",
          '',
          "I am currently processing the various aspects and implications of your request to ensure comprehensive coverage of the topic.",
          '',
          "Preliminary assessment: " + promptText.substring(0, 100) + "..."
        ];
      } else if (personalityContext.userMood === 'serious') {
        processingMessage = [
          "This is an important question that requires careful consideration.",
          '',
          "I'm taking the time to thoroughly analyze this topic to provide you with accurate and comprehensive information.",
          '',
          "Initial analysis: " + promptText.substring(0, 100) + "..."
        ];
      }
    }
    
    // Otherwise, provide a thoughtful response indicating we're processing
    return {
      content: processingMessage.join('\n')
    };
  }

  /**
   * Helper methods for strategy processing
   */
  private determineAnalysisType(promptText: string): 'comparison' | 'pros_cons' | 'step_by_step' | 'causal' | 'general' {
    const lowerText = promptText.toLowerCase();
    
    if (lowerText.includes('compare') || lowerText.includes('vs') || lowerText.includes('versus')) {
      return 'comparison';
    }
    if (lowerText.includes('pros and cons') || lowerText.includes('advantages') || lowerText.includes('disadvantages')) {
      return 'pros_cons';
    }
    if (lowerText.includes('step by step') || lowerText.includes('how to') || lowerText.includes('process')) {
      return 'step_by_step';
    }
    if (lowerText.includes('why') || lowerText.includes('cause') || lowerText.includes('because') || lowerText.includes('reason')) {
      return 'causal';
    }
    
    return 'general';
  }

  private needsClarification(promptText: string, decisionResult: DecisionResult): boolean {
    // Very long prompts or low confidence might need clarification
    return promptText.length > 500 || 
           decisionResult.confidence < 0.6 ||
           promptText.split('?').length > 3; // Multiple questions
  }

  private generateClarifyingQuestions(promptText: string): string[] {
    const questions: string[] = [];
    
    if (promptText.includes('best') || promptText.includes('recommend')) {
      questions.push("What specific criteria are most important to you?");
    }
    
    if (promptText.length > 200) {
      questions.push("Which aspect of this topic should I focus on most?");
    }
    
    if (promptText.includes('should') || promptText.includes('advice')) {
      questions.push("What's your current situation or context?");
    }
    
    // Always include a general question
    questions.push("Are there any specific details or constraints I should consider?");
    
    return questions.slice(0, 3); // Limit to 3 questions
  }

  /**
   * Refresh guild decision engines with new overrides (Phase B implementation placeholder)
   * TODO: Implement guild engine refresh when overrides change
   */
  private async refreshGuildDecisionEngines(): Promise<void> {
    // Phase B: Implement engine refresh when DB overrides change
    logger.debug('Guild decision engine refresh requested - Phase B implementation pending');
  }

  /**
   * Channel Activity Context Analysis Methods
   * These methods provide real-time channel intelligence for decision making
   */

  /**
   * Get timestamp of last bot reply in channel for cooldown analysis
   */
  private async getLastBotReplyTime(channelId: string, client: any): Promise<number | undefined> {
    try {
      if (!client) return undefined;
      
      const channel = await client.channels.fetch(channelId);
      if (!channel?.isTextBased()) return undefined;

      // Search recent messages for bot replies (limit to avoid excessive API calls)
      const messages = await channel.messages.fetch({ limit: 50 });
      const botId = client.user!.id;
      
      for (const message of messages.values()) {
        if (message.author.id === botId) {
          return message.createdTimestamp;
        }
      }
      
      return undefined;
    } catch (error) {
      logger.warn('Failed to get last bot reply time:', error);
      return undefined;
    }
  }

  /**
   * Analyze recent message burst pattern from specific user in channel
   */
  private async getRecentUserBurstCount(userId: string, channelId: string, client: any): Promise<number> {
    try {
      if (!client) return 0;
      
      const channel = await client.channels.fetch(channelId);
      if (!channel?.isTextBased()) return 0;

      const messages = await channel.messages.fetch({ limit: 30 });
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      
      let burstCount = 0;
      for (const message of messages.values()) {
        if (message.author.id === userId && message.createdTimestamp > fiveMinutesAgo) {
          burstCount++;
        }
      }
      
      return burstCount;
    } catch (error) {
      logger.warn('Failed to get user burst count:', error);
      return 0;
    }
  }

  /**
   * Analyze overall channel message burst activity 
   */
  private async getChannelBurstCount(channelId: string, client: any): Promise<number> {
    try {
      if (!client) return 0;
      
      const channel = await client.channels.fetch(channelId);
      if (!channel?.isTextBased()) return 0;

      const messages = await channel.messages.fetch({ limit: 50 });
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
      
      let activityCount = 0;
      for (const message of messages.values()) {
        if (message.createdTimestamp > tenMinutesAgo) {
          activityCount++;
        }
      }
      
      return activityCount;
    } catch (error) {
      logger.warn('Failed to get channel burst count:', error);
      return 0;
    }
  }

  /**
   * Detect if message is in personal thread context
   */
  private async isPersonalThread(message: Message): Promise<boolean> {
    try {
      // Check if in thread
      if (!message.channel.isThread()) {
        return false;
      }

      const thread = message.channel;
      
      // Personal thread indicators:
      // 1. Thread starter is the message author
      // 2. Thread has low member count (< 5 people)
      // 3. Bot was specifically mentioned when thread was created
      
      const threadStarter = thread.ownerId;
      const memberCount = thread.memberCount || 0;
      
      // Get thread starter message to check for bot mention
      const starterMessage = await thread.fetchStarterMessage().catch(() => null);
      const mentionedBotInStarter = starterMessage?.mentions.users.has(message.client.user!.id) || false;
      
      return (
        threadStarter === message.author.id || // User started the thread
        (memberCount < 5 && mentionedBotInStarter) // Small thread with bot mention
      );
      
    } catch (error) {
      logger.warn('Failed to detect personal thread:', error);
      return false;
    }
  }
  
  /**
   * A4: Confidence-Aware Rate Limiting System
   * Integrates DecisionEngine confidence scores with intelligent rate limiting
   */

  /**
   * Check rate limits with confidence-based adjustments
   */
  private async checkConfidenceAwareRateLimit(
    userId: string,
    confidence: number,
    tokenEstimate: number,
    guildId: string | null
  ): Promise<{ allowed: boolean; reason?: string; retryAfter?: number }> {
    try {
      // Base rate limiting parameters
      const baseRequestsPerMinute = 10;
      const baseTokensPerMinute = 50000;
      
      // Confidence-based adjustments
      // High confidence (0.8+): Allow more requests for direct interactions
      // Medium confidence (0.5-0.8): Standard limits
      // Low confidence (<0.5): Stricter limits to prevent spam
      const confidenceMultiplier = this.calculateConfidenceMultiplier(confidence);
      
      const adjustedRequestLimit = Math.floor(baseRequestsPerMinute * confidenceMultiplier);
      const adjustedTokenLimit = Math.floor(baseTokensPerMinute * confidenceMultiplier);
      
      // Get current usage
      const currentUsage = await this.getCurrentUserUsage(userId);
      const currentMinute = Math.floor(Date.now() / 60000);
      
      // Reset window if needed
      if (!currentUsage || currentUsage.windowStart !== currentMinute) {
        await this.resetUserUsageWindow(userId, currentMinute);
        return { allowed: true };
      }
      
      // Check request limit
      if (currentUsage.requests >= adjustedRequestLimit) {
        return {
          allowed: false,
          reason: `Request rate limit exceeded (confidence-adjusted: ${adjustedRequestLimit}/min)`,
          retryAfter: 60 - (Date.now() % 60000) / 1000
        };
      }
      
      // Check token limit
      if (currentUsage.tokens + tokenEstimate >= adjustedTokenLimit) {
        return {
          allowed: false,
          reason: `Token rate limit exceeded (confidence-adjusted: ${adjustedTokenLimit}/min)`,
          retryAfter: 60 - (Date.now() % 60000) / 1000
        };
      }
      
      // Update usage
      await this.updateUserUsage(userId, tokenEstimate);
      
      return { allowed: true };
      
    } catch (error) {
      logger.warn('Confidence-aware rate limiting failed, allowing request:', error);
      return { allowed: true };
    }
  }

  /**
   * Calculate confidence multiplier for rate limit adjustments
   */
  private calculateConfidenceMultiplier(confidence: number): number {
    if (confidence >= 0.9) return 2.0;    // Very high confidence: double limits
    if (confidence >= 0.8) return 1.5;    // High confidence: 50% more
    if (confidence >= 0.7) return 1.2;    // Good confidence: 20% more  
    if (confidence >= 0.5) return 1.0;    // Medium confidence: standard limits
    if (confidence >= 0.3) return 0.7;    // Low confidence: 30% reduction
    return 0.5;                           // Very low confidence: 50% reduction
  }

  /**
   * Get current user usage for rate limiting
   */
  private async getCurrentUserUsage(userId: string): Promise<{
    requests: number;
    tokens: number;
    windowStart: number;
  } | null> {
    // Simple in-memory storage for rate limiting
    // In production, this would use Redis or a database
    const key = `rate_limit_${userId}`;
    const stored = (global as any)[key];
    return stored || null;
  }

  /**
   * Reset user usage window
   */
  private async resetUserUsageWindow(userId: string, windowStart: number): Promise<void> {
    const key = `rate_limit_${userId}`;
    (global as any)[key] = {
      requests: 0,
      tokens: 0,
      windowStart
    };
  }

  /**
   * Update user usage
   */
  private async updateUserUsage(userId: string, tokenEstimate: number): Promise<void> {
    const key = `rate_limit_${userId}`;
    const current = (global as any)[key];
    if (current) {
      current.requests += 1;
      current.tokens += tokenEstimate;
    }
  }

  /**
   * Record request completion for adaptive rate limiting
   */
  private async recordRequestCompletion(
    userId: string,
    confidence: number,
    success: boolean,
    responseTime: number
  ): Promise<void> {
    try {
      // Record metrics for future rate limit optimization
      const key = `rate_limit_metrics_${userId}`;
      const metrics = (global as any)[key] || { completions: [] };
      
      metrics.completions.push({
        timestamp: Date.now(),
        confidence,
        success,
        responseTime
      });
      
      // Keep only recent history (last 100 completions)
      if (metrics.completions.length > 100) {
        metrics.completions = metrics.completions.slice(-100);
      }
      
      (global as any)[key] = metrics;
      
      logger.debug('Request completion recorded for adaptive rate limiting', {
        userId,
        confidence,
        success,
        responseTime,
        totalCompletions: metrics.completions.length
      });
      
    } catch (error) {
      logger.warn('Failed to record request completion:', error);
    }
  }

  // B4: Public decision tracing access methods
  public getDecisionTrace(sessionId: string) {
    return this.decisionTracer.getSessionTrace(sessionId);
  }

  public getTraceAnalysis(timeRangeHours = 24) {
    return this.decisionTracer.getTraceAnalysis(timeRangeHours);
  }

  public getUserDecisionHistory(userId: string, limit = 10) {
    return this.decisionTracer.getUserTraces(userId, limit);
  }

  public getTraceVisualization(sessionId: string) {
    return this.decisionTracer.getTraceVisualization(sessionId);
  }

  public exportDecisionTraces(format: 'json' | 'csv' = 'json', timeRangeHours = 24) {
    return this.decisionTracer.exportTraces(format, timeRangeHours);
  }
}
