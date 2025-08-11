/**
 * Enhanced Intelligence Service - Main Orchestrator
 * Modularized version that coordinates all enhanced intelligence capabilities
 */

import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder,
  Message,
  Attachment
} from 'discord.js';
import { logInteraction } from '../analytics.js';
import { UserMemoryService } from '../../memory/user-memory.service.js';

// Import modular services
import { UnifiedMCPOrchestratorService } from '../core/mcp-orchestrator.service.js';
import { EnhancedMemoryService } from './memory.service.js';
import { EnhancedUIService } from './ui.service.js';
import { EnhancedResponseService } from './response.service.js';
import { EnhancedCacheService } from './cache.service.js';
import { mcpRegistry } from './mcp-registry.service.js';

// Core unified services
import { unifiedMessageAnalysisService, type UnifiedMessageAnalysis } from '../core/message-analysis.service.js';

// Enhanced intelligence types for compatibility
import type { MessageAnalysis } from './types.js';

// Import personalization intelligence services
import { PersonalizationEngine } from './personalization-engine.service.js';
import { UserBehaviorAnalyticsService } from './behavior-analytics.service.js';
import { SmartRecommendationService } from './smart-recommendation.service.js';
// TODO: Re-enable when interface compatibility is resolved
// import { CrossSessionLearningEngine } from './cross-session-learning.service.js';

// Import types
import { ProcessingContext } from './types.js';
import type { MCPManager } from '../mcp-manager.service.js';

// Import Advanced Memory System
import { AdvancedMemoryManager } from '../advanced-memory/advanced-memory-manager.service.js';
import type { AdvancedMemoryConfig } from '../advanced-memory/types.js';

// Import interfaces for dependency injection
import type {
  IEnhancedIntelligenceServiceDependencies,
  IMCPToolsService,
  IMemoryService,
  IUIService,
  IResponseService,
  ICacheService,
  IUserMemoryService,
  IAdvancedMemoryManager,
  IPersonalizationEngine,
  IBehaviorAnalyticsService,
  ISmartRecommendationService
} from './interfaces.js';

export class EnhancedInvisibleIntelligenceService {
  
  // Modular services
  private mcpToolsService: IMCPToolsService;
  private memoryService: IMemoryService;
  private uiService: IUIService;
  private responseService: IResponseService;
  private cacheService: ICacheService;
  private userMemoryService: IUserMemoryService;
  private advancedMemoryManager?: IAdvancedMemoryManager;

  // Personalization intelligence services (optional features)
  private personalizationEngine?: IPersonalizationEngine;
  private behaviorAnalytics?: IBehaviorAnalyticsService;
  private smartRecommendations?: ISmartRecommendationService;
  // TODO: Add crossSessionLearning when interface compatibility is resolved
  // private crossSessionLearning: CrossSessionLearningEngine;

  constructor(dependencies: IEnhancedIntelligenceServiceDependencies) {
    this.mcpToolsService = dependencies.mcpToolsService;
    this.memoryService = dependencies.memoryService;
    this.uiService = dependencies.uiService;
    this.responseService = dependencies.responseService;
    this.cacheService = dependencies.cacheService;
    this.userMemoryService = dependencies.userMemoryService;
    this.advancedMemoryManager = dependencies.advancedMemoryManager;
    
    // Initialize personalization intelligence services
    try {
      this.behaviorAnalytics = dependencies.behaviorAnalytics;
      this.smartRecommendations = dependencies.smartRecommendations;
      // TODO: Fix interface compatibility for CrossSessionLearningEngine
      // this.crossSessionLearning = new CrossSessionLearningEngine(this.userMemoryService);
      this.personalizationEngine = dependencies.personalizationEngine;
      
      // Initialize Advanced Memory Manager if available
      if (this.advancedMemoryManager) {
        this.advancedMemoryManager.initialize().catch(error => {
          console.warn('⚠️ Advanced Memory Manager initialization failed:', error);
        });
      }
      
      // Initialize MCP tools service
      this.mcpToolsService.initialize().catch(error => {
        console.warn('⚠️ MCP Tools Service initialization failed:', error);
      });
      
      console.log('🧠 Enhanced Intelligence Service initialized with advanced memory, personalization capabilities and MCP integration');
    } catch (personalizationError) {
      console.error('⚠️ Advanced services failed to initialize:', personalizationError);
      // Initialize with fallback implementations if needed
      console.log('📝 Enhanced Intelligence Service initialized with API integrations');
    }
  }

  /**
   * Adapter function to convert UnifiedMessageAnalysis to MessageAnalysis for enhanced intelligence compatibility
   */
  private adaptAnalysisInterface(unifiedAnalysis: UnifiedMessageAnalysis): MessageAnalysis {
    return {
      hasAttachments: unifiedAnalysis.hasAttachments,
      hasUrls: unifiedAnalysis.hasUrls,
      attachmentTypes: unifiedAnalysis.attachmentTypes,
      urls: unifiedAnalysis.urls,
      complexity: unifiedAnalysis.complexity === 'advanced' ? 'complex' : unifiedAnalysis.complexity,
      intents: unifiedAnalysis.intents,
      requiredTools: unifiedAnalysis.requiredTools
    };
  }

  /**
   * Creates the enhanced /chat slash command
   */
  createSlashCommand() {
    return new SlashCommandBuilder()
      .setName('chat')
      .setDescription('Opt into enhanced AI conversation with images, research and more')
      .addStringOption(option =>
        option.setName('message')
          .setDescription('Your message, question, or request')
          .setRequired(true)
      );
  }

  /**
   * Main processing handler for enhanced invisible intelligence
   */
  async handleEnhancedConversation(interaction: ChatInputCommandInteraction): Promise<void> {
    const startTime = Date.now();
    let interactionAcknowledged = false;
    
    try {
      // Step 1: Immediately acknowledge the interaction to prevent timeout
      try {
        if (!interaction.replied && !interaction.deferred && interaction.isRepliable()) {
          await interaction.deferReply({ ephemeral: false });
          interactionAcknowledged = true;
          console.log('✅ Interaction deferred successfully');
        } else {
          console.warn('⚠️ Interaction already responded to or not repliable');
          return;
        }
      } catch (deferError) {
        console.error('❌ Failed to defer reply:', deferError);
        
        // If defer fails, try immediate reply as fallback
        try {
          if (interaction.isRepliable() && !interaction.replied) {
            await interaction.reply({ 
              content: '🤖 Processing your request...', 
              ephemeral: false 
            });
            interactionAcknowledged = true;
            console.log('✅ Fallback reply sent successfully');
          } else {
            console.error('❌ Cannot reply to interaction - giving up');
            return;
          }
        } catch (replyError) {
          console.error('❌ Failed to send fallback reply:', replyError);
          return; // Give up if we can't respond at all
        }
      }
      
      const content = interaction.options.getString('message', true);
      const attachments = Array.from(interaction.options.resolved?.attachments?.values() || []);
      
      // Step 2: Create processing context
      const attachmentInfo = attachments.map(att => ({
        name: att.name,
        url: att.url,
        contentType: att.contentType || undefined
      }));
      
      const unifiedAnalysis = await unifiedMessageAnalysisService.analyzeMessage(content, attachmentInfo);
      
      const context: ProcessingContext = {
        userId: interaction.user.id,
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        analysis: this.adaptAnalysisInterface(unifiedAnalysis),
        results: new Map(),
        errors: []
      };

      // Step 3: Send initial processing message
      try {
        await this.uiService.initializeStreamingResponse(interaction, context);
      } catch (uiError) {
        console.warn('⚠️ Failed to initialize UI, continuing with processing:', uiError);
      }
      
      // Step 4: Process with all available tools (with timeout protection)
      const convertedAttachments = attachments.map(att => ({
        name: att.name,
        url: att.url,
        contentType: att.contentType || undefined
      }));
      
      // Add timeout protection for MCP processing
      const processingPromise = this.mcpToolsService.processWithAllTools(content, convertedAttachments, context);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Processing timeout')), 25000) // 25 second timeout
      );
      
      try {
        await Promise.race([processingPromise, timeoutPromise]);
      } catch (processingError) {
        console.warn('⚠️ Processing timeout or error, continuing with basic response:', processingError);
        context.errors.push('Processing timeout - using basic response');
      }
      
      // Step 5: Generate enhanced response with advanced memory and personalization
      let finalResponse: string;
      try {
        const baseResponse = await this.responseService.generateEnhancedResponse(content, context);
        
        // Apply advanced memory enhancement if available
        let memoryEnhancedResponse = baseResponse;
        if (this.advancedMemoryManager) {
          try {
            const memoryContext = {
              userId: interaction.user.id,
              channelId: interaction.channelId,
              guildId: interaction.guildId,
              conversationId: `conv-${interaction.channelId}-${Date.now()}`,
              participants: [interaction.user.id, 'bot'],
              content,
              timestamp: new Date()
            };

            const enhancement = await this.advancedMemoryManager.enhanceResponse(
              baseResponse,
              memoryContext
            );

            memoryEnhancedResponse = enhancement.enhancedResponse;
            
            // Log memory enhancement details
            if (enhancement.memoriesUsed.length > 0 || enhancement.socialAdaptations.length > 0) {
              console.log('🧠 Response enhanced with advanced memory:', {
                memoriesUsed: enhancement.memoriesUsed.length,
                socialAdaptations: enhancement.socialAdaptations.length,
                confidenceBoost: enhancement.confidenceBoost,
                personalizations: enhancement.personalizations.length
              });
            }
          } catch (memoryEnhancementError) {
            console.warn('⚠️ Advanced memory enhancement failed, using base response:', memoryEnhancementError);
          }
        }
        
        // Apply personalization if available
        finalResponse = await this.adaptPersonalizedResponse(
          interaction.user.id, 
          memoryEnhancedResponse, 
          interaction.guildId || undefined
        );
      } catch (responseError) {
        console.error('❌ Failed to generate enhanced response:', responseError);
        finalResponse = 'I encountered an issue while processing your request. Please try again with a simpler prompt.';
      }
      
      // Step 6: Send final response
      try {
        await this.uiService.finalizeStreamingResponse(interaction, finalResponse, context, content);
      } catch (uiError) {
        console.error('❌ Failed to finalize UI response:', uiError);
        
        // Fallback: try to send simple response
        try {
          if (interaction.deferred) {
            await interaction.editReply({ content: finalResponse });
          } else if (interaction.replied) {
            await interaction.followUp({ content: finalResponse });
          }
        } catch (fallbackError) {
          console.error('❌ Failed to send fallback response:', fallbackError);
        }
      }
      
      // Step 7: Store in memory and update analytics
      try {
        // Store in traditional memory service
        await this.memoryService.storeConversationMemory(context, content, finalResponse);
        
        // Store in advanced memory system if available
        if (this.advancedMemoryManager) {
          try {
            const memoryContext = {
              userId: interaction.user.id,
              channelId: interaction.channelId,
              guildId: interaction.guildId,
              conversationId: `conv-${interaction.channelId}-${Date.now()}`,
              participants: [interaction.user.id, 'bot'],
              content,
              timestamp: new Date()
            };

            await this.advancedMemoryManager.storeConversationMemory(memoryContext);
            console.log('🧠 Conversation stored in advanced memory system');
          } catch (advancedMemoryError) {
            console.warn('⚠️ Failed to store in advanced memory system:', advancedMemoryError);
          }
        }
        
        await this.trackEnhancedAnalytics(context, startTime);
        
        // Personalization: Record interaction for adaptive learning
        await this.recordPersonalizedInteraction(context, content, finalResponse, Date.now() - startTime);
      } catch (memoryError) {
        console.warn('⚠️ Failed to store memory or analytics:', memoryError);
      }
      
    } catch (error) {
      console.error('❌ Enhanced conversation error:', error);
      
      // Handle interaction errors gracefully
      try {
        if (interactionAcknowledged) {
          if (interaction.deferred) {
            await interaction.editReply({ 
              content: '❌ An error occurred while processing your request. Please try again.'
            });
          } else if (interaction.replied) {
            await interaction.followUp({ 
              content: '❌ An error occurred while processing your request. Please try again.'
            });
          }
        } else if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
          await interaction.reply({ 
            content: '❌ An error occurred while processing your request. Please try again.',
            ephemeral: false 
          });
        }
      } catch (replyError) {
        console.error('❌ Failed to send error message to user:', replyError);
      }
    }
  }

  /**
   * Handle regeneration with enhanced capabilities
   */
  async handleRegenerateEnhanced(userId: string, channelId: string, guildId: string | null): Promise<string> {
    try {
      const lastPrompt = this.uiService.getLastPrompt(userId);
      if (!lastPrompt) {
        return 'No previous prompt found to regenerate.';
      }

      // Create context for regeneration
      const unifiedAnalysis = await unifiedMessageAnalysisService.analyzeMessage(lastPrompt, []);
      
      const context: ProcessingContext = {
        userId,
        channelId,
        guildId,
        analysis: this.adaptAnalysisInterface(unifiedAnalysis),
        results: new Map(),
        errors: []
      };

      // Process again with all tools
      await this.mcpToolsService.processWithAllTools(lastPrompt, [], context);
      
      // Generate new response using the enhanced prompt
      const enhancedPrompt = this.buildEnhancedPromptFromContext(lastPrompt, context);
      return await this.responseService.generateRegeneratedResponse(userId, channelId, guildId, enhancedPrompt);
    } catch (error) {
      console.error('Enhanced regeneration failed:', error);
      return 'Failed to regenerate response. Please try your request again.';
    }
  }

  /**
   * Handle processing explanation request
   */
  async handleExplainProcessing(userId: string): Promise<string> {
    const userMemory = this.memoryService.getUserMemories(userId);
    if (!userMemory || userMemory.length === 0) {
      return 'No recent processing information available.';
    }

    const lastEntry = userMemory[userMemory.length - 1];
    const toolsUsed = lastEntry.toolsUsed || [];
    
    return this.responseService.generateProcessingExplanation(toolsUsed, lastEntry.analysis.complexity);
  }

  /**
   * Build enhanced prompt from processing context
   */
  private buildEnhancedPromptFromContext(originalPrompt: string, context: ProcessingContext): string {
    let enhancedPrompt = originalPrompt;
    
    // Add context from results
    const memoryResult = context.results.get('memory');
    if (memoryResult) {
      enhancedPrompt += `\n\nMEMORY CONTEXT: ${JSON.stringify(memoryResult)}`;
    }
    
    return enhancedPrompt;
  }

  /**
   * Track enhanced analytics
   */
  private async trackEnhancedAnalytics(context: ProcessingContext, startTime: number): Promise<void> {
    try {
      const duration = Date.now() - startTime;
      
      // Use basic analytics logging
      logInteraction({
        guildId: context.guildId,
        userId: context.userId,
        command: 'enhanced_chat',
        isSuccess: true
      });
      
      // Log additional metrics to console for now
      console.log(`Enhanced processing completed in ${duration}ms using tools: ${Array.from(context.results.keys()).join(', ')}`);
    } catch (error) {
      console.error('Analytics tracking failed:', error);
    }
  }

  /**
   * Handle intelligent message processing (for direct messages and mentions)
   */
  async handleIntelligentMessage(message: Message): Promise<void> {
    try {
      // Check if this message should be processed
      if (!this.shouldProcessMessage(message)) {
        return;
      }

      const content = message.content;
      const attachments = Array.from(message.attachments.values()).map((att: Attachment) => ({
        name: att.name,
        url: att.url,
        contentType: att.contentType || undefined
      }));

      // Check cache for similar responses (only for simple text queries without attachments)
      if (attachments.length === 0) {
        const cachedResponse = this.cacheService.getCachedResponse(content, message.author.id);
        if (cachedResponse) {
          await message.reply(`${cachedResponse}\n\n*⚡ Cached response for faster delivery*`);
          return;
        }
      }

      // Create processing context
      const unifiedAnalysis = await unifiedMessageAnalysisService.analyzeMessage(content, attachments);
      
      const context: ProcessingContext = {
        userId: message.author.id,
        channelId: message.channelId,
        guildId: message.guildId,
        analysis: this.adaptAnalysisInterface(unifiedAnalysis),
        results: new Map(),
        errors: []
      };

      // Send typing indicator
      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping();
      }

      // Process with intelligent tool selection using registry and personalization
      await this.processWithIntelligentToolSelection(content, attachments, context);
      
      // Generate enhanced response with personalization
      const baseResponse = await this.responseService.generateEnhancedResponse(content, context);
      const personalizedResponse = await this.adaptPersonalizedResponse(
        message.author.id, 
        baseResponse, 
        message.guildId || undefined
      );
      
      // Cache the response for future use (if no attachments)
      if (attachments.length === 0) {
        this.cacheService.cacheResponse(content, message.author.id, personalizedResponse, 10 * 60 * 1000); // 10 minute TTL
      }
      
      // Send response
      await message.reply(personalizedResponse);
      
      // Store in memory and update analytics with personalization tracking
      await this.memoryService.storeConversationMemory(context, content, personalizedResponse);
      await this.recordPersonalizedInteraction(context, content, personalizedResponse, Date.now() - Date.now()); // Simple timing
      
    } catch (error) {
      console.error('Enhanced message processing error:', error);
      try {
        await message.reply('I encountered an issue processing your message, but I\'m here to help! Could you try again?');
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError);
      }
    }
  }

  /**
   * Process message with intelligent tool selection using registry
   */
  private async processWithIntelligentToolSelection(
    content: string, 
    attachments: { name: string; url: string; contentType?: string }[], 
    context: ProcessingContext
  ): Promise<void> {
    try {
      // Get tool recommendations from unified orchestrator
      const recommendations = this.mcpToolsService.getToolRecommendations(content, {
        userId: context.userId,
        priority: this.determinePriority(content, attachments)
      });

      console.log(`🔧 Registry recommended ${recommendations.length} tools:`, 
        recommendations.map(t => t.id).join(', ')
      );

      // Execute tools in order of priority
      for (const tool of recommendations.slice(0, 2)) { // Execute top 2 tools
        try {
          const params = this.buildToolParams(content, attachments, tool.id);
          
          // Use a simple fallback for required capabilities based on tool id
          const requiredCapabilities = this.getCapabilitiesForTool(tool.id);
          
          const executionContext = {
            userId: context.userId,
            channelId: context.channelId,
            messageContent: content,
            priority: this.determinePriority(content, attachments),
            requiredCapabilities: requiredCapabilities,
            fallbackAllowed: true,
            timeoutMs: 15000
          };

          const result = await mcpRegistry.executeTool(tool.id, params, executionContext);
          context.results.set(tool.id, result);

          console.log(`✅ Tool ${tool.id} executed: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        } catch (toolError) {
          console.error(`❌ Tool ${tool.id} execution failed:`, toolError);
          context.errors.push(`Tool ${tool.id}: ${toolError}`);
        }
      }

      // Fallback to traditional processing if no tools succeeded
      if (context.results.size === 0 || !Array.from(context.results.values()).some(r => {
        const result = r as { success: boolean };
        return result.success;
      })) {
        console.log('🔄 Falling back to traditional MCP processing');
        await this.mcpToolsService.processWithAllTools(content, attachments, context);
      }
    } catch (error) {
      console.error('Intelligent tool selection failed:', error);
      // Fallback to traditional processing
      await this.mcpToolsService.processWithAllTools(content, attachments, context);
    }
  }

  /**
   * Determine processing priority based on content and attachments
   */
  private determinePriority(content: string, attachments: { name: string; url: string; contentType?: string }[]): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: Contains urgent words or multiple attachments
    if (content.toLowerCase().includes('urgent') || content.toLowerCase().includes('emergency') || attachments.length > 2) {
      return 'critical';
    }

    // High: Contains analysis requests or URLs
    if (content.toLowerCase().includes('analyze') || content.toLowerCase().includes('research') || /https?:\/\//.test(content)) {
      return 'high';
    }

    // Medium: Normal questions or requests
    if (content.includes('?') || content.toLowerCase().includes('help') || attachments.length > 0) {
      return 'medium';
    }

    // Low: Simple statements
    return 'low';
  }

  /**
   * Build tool-specific parameters
   */
  private buildToolParams(content: string, attachments: { name: string; url: string; contentType?: string }[], toolId: string): Record<string, unknown> {
    const params: Record<string, unknown> = {
      query: content,
      thought: content
    };

    // Add tool-specific parameters
    switch (toolId) {
      case 'mcp-brave-search': {
        params.count = 5;
        break;
      }
      case 'mcp-firecrawl': {
        const urls = this.extractUrls(content);
        params.urls = urls.length > 0 ? urls : attachments.map(a => a.url).filter(url => url);
        break;
      }
      case 'mcp-playwright': {
        const url = this.extractUrls(content)[0];
        if (url) params.url = url;
        break;
      }
    }

    return params;
  }

  /**
   * Extract URLs from content
   */
  private extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return text.match(urlRegex) || [];
  }

  /**
   * Check if a message should be processed by enhanced intelligence
   */
  private shouldProcessMessage(message: Message): boolean {
    // Don't process bot messages
    if (message.author.bot) return false;
    
    // Process DMs
    if (!message.guildId) return true;
    
    // Process mentions
    if (message.mentions.has(message.client.user)) return true;
    
    // Don't process other guild messages (only slash commands in guilds)
    return false;
  }

  /**
   * Cleanup method for memory management
   */
  cleanup(): void {
    this.memoryService.cleanupOldMemories();
    this.cacheService.clear();
  }

  /**
   * Get performance statistics for monitoring
   */
  getPerformanceStats(): { cache: { size: number; hitRate: number; totalEntries: number }; service: string } {
    return {
      cache: this.cacheService.getStats(),
      service: 'Enhanced Intelligence v2.0'
    };
  }

  /**
   * Get capabilities for a specific tool (fallback implementation)
   */
  private getCapabilitiesForTool(toolId: string): string[] {
    // Utility function to convert camelCase to kebab-case
    const toKebabCase = (str: string): string => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

    // Apply the conversion but don't use the result for now
    toKebabCase(toolId);
    
    // Simple mapping based on common tool IDs
    const toolCapabilities: Record<string, string[]> = {
      'web-search': ['web-search', 'research'],
      'memory': ['memory', 'context'],
      'content-extraction': ['firecrawl', 'content'],
      'sequential-thinking': ['reasoning', 'analysis'],
      'playwright': ['browser', 'automation'],
      'discord': ['discord', 'messaging'],
      'filesystem': ['files', 'storage']
    };
    
    return toolCapabilities[toolId] || [toolId];
  }

  /**
   * Record personalized interaction for adaptive learning
   */
  private async recordPersonalizedInteraction(
    context: ProcessingContext, 
    userMessage: string, 
    botResponse: string, 
    processingTime: number
  ): Promise<void> {
    try {
      if (!this.personalizationEngine) {
        return; // Personalization not available
      }

      // Record behavior metrics with basic interaction tracking
      if (this.behaviorAnalytics) {
        await this.behaviorAnalytics.recordBehaviorMetric({
          userId: context.userId,
          metricType: 'response_time',
          value: processingTime,
          timestamp: new Date()
        });
      }

      // Record interaction in personalization engine with correct format
      await this.personalizationEngine.recordInteraction({
        userId: context.userId,
        guildId: context.guildId || undefined,
        messageType: 'enhanced_conversation',
        toolsUsed: Array.from(context.results.keys()),
        responseTime: processingTime,
        conversationContext: `${userMessage.substring(0, 200)}...`,
        timestamp: new Date()
      });

      console.log('✅ Personalized interaction recorded for adaptive learning');
    } catch (error) {
      console.warn('⚠️ Failed to record personalized interaction:', error);
    }
  }

  /**
   * Get personalized tool recommendations (simplified for initial integration)
   */
  private async getPersonalizedToolRecommendations(userId: string): Promise<string[]> {
    try {
      if (!this.smartRecommendations) {
        return [];
      }

      // Get recommendations using the actual API with correct context format
      const recommendations = await this.smartRecommendations.getContextualToolRecommendations({
        userId,
        guildId: undefined,
        currentMessage: 'enhanced_conversation_context'
      });
      
      return recommendations.map((rec) => rec.type);
    } catch (error) {
      console.warn('⚠️ Failed to get personalized recommendations:', error);
      return [];
    }
  }

  /**
   * Adapt response based on user personalization
   */
  private async adaptPersonalizedResponse(
    userId: string, 
    originalResponse: string,
    guildId?: string
  ): Promise<string> {
    try {
      if (!this.personalizationEngine) {
        return originalResponse;
      }

      const adaptedResponse = await this.personalizationEngine.adaptResponse(userId, originalResponse, guildId);
      return adaptedResponse.personalizedResponse;
    } catch (error) {
      console.warn('⚠️ Failed to adapt personalized response:', error);
      return originalResponse;
    }
  }
}

/**
 * Factory function to create EnhancedInvisibleIntelligenceService with all dependencies
 * Maintains backward compatibility while enabling dependency injection
 */
export function createEnhancedInvisibleIntelligenceService(
  mcpManager?: MCPManager
): EnhancedInvisibleIntelligenceService {
  // Configure Advanced Memory System
  const advancedMemoryConfig: AdvancedMemoryConfig = {
    enableEpisodicMemory: process.env.ENABLE_EPISODIC_MEMORY !== 'false',
    enableSocialIntelligence: process.env.ENABLE_SOCIAL_INTELLIGENCE !== 'false',
    enableEmotionalIntelligence: process.env.ENABLE_EMOTIONAL_INTELLIGENCE !== 'false',
    enableSemanticClustering: true,
    enableMemoryConsolidation: true,
    maxMemoriesPerUser: parseInt(process.env.MAX_MEMORIES_PER_USER || '500'),
    memoryDecayRate: parseFloat(process.env.MEMORY_DECAY_RATE || '0.01'),
    importanceThreshold: parseFloat(process.env.MEMORY_IMPORTANCE_THRESHOLD || '0.3'),
    consolidationInterval: parseInt(process.env.MEMORY_CONSOLIDATION_INTERVAL || '3600000'), // 1 hour
    socialAnalysisDepth: (process.env.SOCIAL_ANALYSIS_DEPTH as 'basic' | 'moderate' | 'comprehensive') || 'moderate',
    emotionalSensitivity: parseFloat(process.env.EMOTIONAL_SENSITIVITY || '0.7'),
    adaptationAggressiveness: parseFloat(process.env.ADAPTATION_AGGRESSIVENESS || '0.6')
  };

  // Import the concrete implementations
  const dependencies: IEnhancedIntelligenceServiceDependencies = {
    mcpToolsService: new UnifiedMCPOrchestratorService(mcpManager),
    memoryService: new EnhancedMemoryService(),
    uiService: new EnhancedUIService(),
    responseService: new EnhancedResponseService(),
    cacheService: new EnhancedCacheService(),
    userMemoryService: new UserMemoryService(),
    // Advanced Memory & Social Intelligence System
    advancedMemoryManager: new AdvancedMemoryManager(advancedMemoryConfig),
    // Optional personalization services
    behaviorAnalytics: new UserBehaviorAnalyticsService(),
    smartRecommendations: new SmartRecommendationService(),
    personalizationEngine: new PersonalizationEngine(mcpManager)
  };
  
  return new EnhancedInvisibleIntelligenceService(dependencies);
}
