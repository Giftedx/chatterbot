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
import { EnhancedMessageAnalysisService } from './message-analysis.service.js';
import { EnhancedMCPToolsService } from './mcp-tools.service.js';
import { EnhancedMemoryService } from './memory.service.js';
import { EnhancedUIService } from './ui.service.js';
import { EnhancedResponseService } from './response.service.js';
import { EnhancedCacheService } from './cache.service.js';

// Import types
import { ProcessingContext } from './types.js';

export class EnhancedInvisibleIntelligenceService {
  
  // Modular services
  private analysisService: EnhancedMessageAnalysisService;
  private mcpToolsService: EnhancedMCPToolsService;
  private memoryService: EnhancedMemoryService;
  private uiService: EnhancedUIService;
  private responseService: EnhancedResponseService;
  private cacheService: EnhancedCacheService;
  private userMemoryService: UserMemoryService;

  constructor() {
    this.analysisService = new EnhancedMessageAnalysisService();
    this.mcpToolsService = new EnhancedMCPToolsService();
    this.memoryService = new EnhancedMemoryService();
    this.uiService = new EnhancedUIService();
    this.responseService = new EnhancedResponseService();
    this.cacheService = new EnhancedCacheService();
    this.userMemoryService = new UserMemoryService();
    
    console.log('� Enhanced Intelligence Service initialized with API integrations');
  }

  /**
   * Creates the enhanced /optin slash command
   */
  createSlashCommand() {
    return new SlashCommandBuilder()
      .setName('optin')
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
      const context: ProcessingContext = {
        userId: interaction.user.id,
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        analysis: this.analysisService.analyzeMessage(content, attachments.map(att => ({
          name: att.name,
          url: att.url,
          contentType: att.contentType || undefined
        }))),
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
      
      // Step 5: Generate enhanced response
      let finalResponse: string;
      try {
        finalResponse = await this.responseService.generateEnhancedResponse(content, context);
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
        await this.memoryService.storeConversationMemory(context, content, finalResponse);
        await this.trackEnhancedAnalytics(context, startTime);
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
      const context: ProcessingContext = {
        userId,
        channelId,
        guildId,
        analysis: this.analysisService.analyzeMessage(lastPrompt, []),
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
        command: 'enhanced_optin',
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
      const context: ProcessingContext = {
        userId: message.author.id,
        channelId: message.channelId,
        guildId: message.guildId,
        analysis: this.analysisService.analyzeMessage(content, attachments),
        results: new Map(),
        errors: []
      };

      // Send typing indicator
      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping();
      }

      // Process with all available tools
      await this.mcpToolsService.processWithAllTools(content, attachments, context);
      
      // Generate enhanced response
      const response = await this.responseService.generateEnhancedResponse(content, context);
      
      // Cache the response for future use (if no attachments)
      if (attachments.length === 0) {
        this.cacheService.cacheResponse(content, message.author.id, response, 10 * 60 * 1000); // 10 minute TTL
      }
      
      // Send response
      await message.reply(response);
      
      // Store in memory and update analytics
      await this.memoryService.storeConversationMemory(context, content, response);
      
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
}
