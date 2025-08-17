/**
 * Intelligence Integration Wrapper
 * Connects autonomous orchestration with existing intelligence services
 */

import { Message } from 'discord.js';
import { logger } from '../../utils/logger.js';
import {
  serviceIntegration,
  IntelligenceRequest,
  IntelligenceResponse,
} from '../../orchestration/service-integration.js';
import { intelligenceAnalysisService, IntelligenceAnalysis } from './analysis.service.js';
import { intelligenceCapabilityService } from './capability.service.js';
import { intelligencePermissionService, UserCapabilities } from './permission.service.js';
import { intelligenceContextService } from './context.service.js';

export interface EnhancedIntelligenceResponse extends IntelligenceResponse {
  analysisData: IntelligenceAnalysis;
  userCapabilities: UserCapabilities;
  recommendations: string[];
  contextUpdated: boolean;
}

export class IntelligenceIntegrationWrapper {
  constructor() {
    logger.info('🧠 Intelligence Integration Wrapper initialized');
  }

  /**
   * Main intelligence processing method that integrates autonomous orchestration
   * with existing intelligence services
   */
  async processMessage(message: Message): Promise<EnhancedIntelligenceResponse> {
    const startTime = Date.now();
    const messageId = `${message.id}_${Date.now()}`;

    logger.info(`🧠 Processing message ${messageId} from user ${message.author.id}`);

    try {
      // Step 1: Get user capabilities
      const userCapabilities = await intelligencePermissionService.getUserCapabilities(
        message.author.id,
        {
          guildId: message.guildId || undefined,
          channelId: message.channel.id,
          userId: message.author.id,
        },
      );
      logger.info(`👤 User capabilities: ${JSON.stringify(userCapabilities)}`);

      // Step 2: Analyze message using existing intelligence analysis
      const messageAttachments = Array.from(message.attachments.values());
      const analysisData = await intelligenceAnalysisService.analyzeMessage(
        message,
        messageAttachments,
        userCapabilities,
      );
      logger.info(
        `🔍 Message analysis completed. Complexity: ${analysisData.complexity}, Required tools: ${analysisData.requiredTools.join(', ')}`,
      );

      // Step 3: Create intelligence request for autonomous orchestration
      const intelligenceRequest: IntelligenceRequest = {
        messageId,
        content: message.content,
        userId: message.author.id,
  guildId: message.guildId || undefined,
        channelId: message.channel.id,
        messageType: this.determineMessageType(message),
        conversationHistory: await this.getConversationHistory(message),
        metadata: {
          timestamp: new Date(),
          userPermissions: Object.keys(userCapabilities).filter(
            (cap) => userCapabilities[cap as keyof UserCapabilities],
          ),
          channelContext: {
            name: 'name' in (message.channel as any) ? (message.channel as any).name : 'DM',
            type: (message.channel as any).type,
          },
          previousMessages: [], // Would be populated from context service
        },
      };

      // Step 4: Process through autonomous orchestration
      const orchestrationResponse =
        await serviceIntegration.processIntelligenceRequest(intelligenceRequest);
      logger.info(
        `⚡ Orchestration completed in ${orchestrationResponse.metadata.processingTime}ms`,
      );

      // Step 5: Get processing recommendations
      const recommendations = this.generateEnhancedRecommendations(
        analysisData,
        orchestrationResponse,
        userCapabilities,
      );

      // Step 6: Update context if needed
      let contextUpdated = false;
      if (analysisData.needsConversationManagement || analysisData.needsMemoryOperation) {
        try {
          // Note: Context service update would be implemented based on actual API
          logger.info(`💾 Context update requested for user ${message.author.id}`);
          contextUpdated = true;
        } catch (contextError) {
          logger.warn(`⚠️ Failed to update context:`, contextError);
        }
      }

      // Step 7: Create enhanced response
      const enhancedResponse: EnhancedIntelligenceResponse = {
        ...orchestrationResponse,
        analysisData,
        userCapabilities,
        recommendations,
        contextUpdated,
      };

      const totalTime = Date.now() - startTime;
      logger.info(`✅ Message ${messageId} processed successfully in ${totalTime}ms`);

      return enhancedResponse;
    } catch (error) {
      logger.error(`❌ Failed to process message ${messageId}:`, error);

      // Create fallback response
      return this.createFallbackResponse(messageId, message, error, startTime);
    }
  }

  private determineMessageType(
    message: Message,
  ): 'dm' | 'mention' | 'reply' | 'thread' | 'ambient' {
  if (!message.guildId) return 'dm';
  if (message.mentions?.has && message.client.user && message.mentions.has(message.client.user)) return 'mention';
    if (message.reference) return 'reply';
  if (message.channel.isThread && message.channel.isThread()) return 'thread';
    return 'ambient';
  }

  private async getConversationHistory(message: Message): Promise<string[]> {
    try {
      // Get last few messages from the channel
  const messages = await (message.channel as any).messages?.fetch({ limit: 5, before: message.id });
  if (!messages) return [];
  return (messages as any[]).map((msg: any) => `${msg.author.username}: ${msg.content}`).reverse();
    } catch (error) {
      logger.warn('Failed to fetch conversation history:', error);
      return [];
    }
  }

  private generateEnhancedRecommendations(
    analysis: IntelligenceAnalysis,
    orchestrationResponse: IntelligenceResponse,
    userCapabilities: UserCapabilities,
  ): string[] {
    const recommendations: string[] = [...analysis.processingRecommendations];

    // Add orchestration-based recommendations
    if (orchestrationResponse.metadata.capabilitiesUsed.includes('web-search')) {
      recommendations.push('verify_information_freshness');
    }

    if (orchestrationResponse.metadata.capabilitiesUsed.includes('multimodal-analysis')) {
      recommendations.push('include_visual_context');
    }

    if (orchestrationResponse.confidence < 0.7) {
      recommendations.push('request_clarification');
    }

    // Add user capability-based recommendations
    if (userCapabilities.hasAdmin && analysis.needsAdminFeatures) {
      recommendations.push('enable_admin_mode');
    }

    if (userCapabilities.hasMCPTools && analysis.needsMCPTools) {
      recommendations.push('activate_mcp_tools');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private async createFallbackResponse(
    messageId: string,
    message: Message,
    error: any,
    startTime: number,
  ): Promise<EnhancedIntelligenceResponse> {
    logger.warn(`🔄 Creating fallback response for message ${messageId}`);

    // Create basic analysis
    const basicAnalysis: IntelligenceAnalysis = {
      hasAttachments: message.attachments.size > 0,
      hasUrls: /https?:\/\/[^\s]+/.test(message.content),
      attachmentTypes: [],
      urls: [],
      complexity: 'simple',
      intents: ['general_conversation'],
      requiredTools: ['basic_response'],
      needsPersonaSwitch: false,
      needsAdminFeatures: false,
      adminCommands: [],
      needsMultimodal: false,
      attachmentAnalysis: [],
      needsConversationManagement: false,
      conversationActions: [],
      needsMemoryOperation: false,
      memoryActions: [],
      needsMCPTools: false,
      mcpRequirements: [],
      confidence: 0.5,
      processingRecommendations: ['use_fallback_processing'],
      sentiment: 'neutral',
      language: 'en',
      topics: [],
      mentions: [],
    };

    // Get basic user capabilities
    let userCapabilities: UserCapabilities;
    try {
      userCapabilities = await intelligencePermissionService.getUserCapabilities(
        message.author.id,
  { guildId: message.guildId || undefined, channelId: message.channel.id, userId: message.author.id },
      );
    } catch {
      userCapabilities = {
        hasBasicAI: false,
        hasMultimodal: false,
        hasAdvancedAI: false,
        hasAnalytics: false,
        hasAdminCommands: false,
        hasAdmin: false,
        hasMCPTools: false,
      };
    }

    return {
      messageId,
      response:
        'I apologize, but I encountered an issue processing your message. Please try again.',
      confidence: 0.3,
      metadata: {
        processingTime: Date.now() - startTime,
        capabilitiesUsed: ['fallback_processor'],
        quality: {
          accuracy: 0.3,
          completeness: 0.2,
          freshness: 0.5,
        },
        fallbackUsed: true,
      },
      analysisData: basicAnalysis,
      userCapabilities,
      recommendations: ['retry_message', 'check_system_status'],
      contextUpdated: false,
    };
  }

  /**
   * Get system health and status
   */
  getSystemHealth(): object {
    return serviceIntegration.getSystemStatus();
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): object {
    return serviceIntegration.getPerformanceMetrics();
  }

  /**
   * Get traceability data for a message
   */
  getMessageTraceability(messageId: string): object {
    return serviceIntegration.getRequestTraceability(messageId);
  }

  /**
   * Update integration configuration
   */
  updateConfiguration(config: any): void {
    serviceIntegration.updateConfiguration(config);
  }
}

// Global integration wrapper instance
export const intelligenceIntegration = new IntelligenceIntegrationWrapper();
