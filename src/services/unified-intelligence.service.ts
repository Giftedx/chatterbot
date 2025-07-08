/**
 * Unified Intelligence Service (Refactored)
 * 
 * Single /optin command with AI-driven automatic feature selection.
 * Now modularized for maintainability and following best practices.
 * This service orchestrates the various intelligence modules.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  BaseMessageOptions,
  ButtonInteraction
} from 'discord.js';
import { GeminiService } from './gemini.service.js';
import { getHistory, updateHistory, updateHistoryWithParts } from './context-manager.js';
import { logInteraction } from './analytics.js';
import { moderationService } from '../moderation/moderation-service.js';
import { urlToGenerativePart } from '../utils/image-helper.js';
import { sendStream } from '../ui/stream-utils.js';
import { logger } from '../utils/logger.js';
import { REGENERATE_BUTTON_ID, STOP_BUTTON_ID } from '../ui/components.js';
import { AgenticIntelligenceService, AgenticQuery } from './agentic-intelligence.service.js';

// Modularized Intelligence Services
import {
  intelligencePermissionService,
  intelligenceAnalysisService,
  intelligenceCapabilityService,
  intelligenceAdminService,
  intelligenceContextService,
  type UserCapabilities,
  type EnhancedContext
} from './intelligence/index.js';

/**
 * Unified Intelligence Service - Single /optin command with comprehensive AI-driven features
 * Now modularized for better maintainability and separation of concerns
 */
export class UnifiedIntelligenceService {
  private readonly geminiService: GeminiService;
  private readonly agenticIntelligenceService: AgenticIntelligenceService;
  
  // Track users who have opted into intelligent conversation
  private optedInUsers = new Set<string>();
  
  // Store active streaming responses for button controls
  private activeStreams = new Map<string, { abortController: AbortController; isStreaming: boolean }>();
  
  // Store last prompt per user for Regenerate feature
  private lastPromptCache = new Map<string, { prompt: string; attachment?: string; channelId: string }>();

  constructor(agenticService?: AgenticIntelligenceService) {
    this.geminiService = new GeminiService();
    this.agenticIntelligenceService = agenticService ?? AgenticIntelligenceService.getInstance();
    this.loadOptedInUsers();
  }

  /**
   * Build the single /optin command
   */
  public buildOptinCommand(): SlashCommandBuilder {
    return new SlashCommandBuilder()
      .setName('optin')
      .setDescription('Enable intelligent conversation - I\'ll automatically understand and handle all your needs!')
      .addBooleanOption(option =>
        option
          .setName('enable')
          .setDescription('Enable (true) or disable (false) intelligent conversation')
          .setRequired(false)
      ) as SlashCommandBuilder;
  }

  /**
   * Handle the /optin command execution
   */
  public async handleOptinCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const enable = interaction.options.getBoolean('enable') ?? true;
      const userId = interaction.user.id;

      // Validate permissions using modular service
      const permissionResult = await intelligencePermissionService.validateCommandPermissions(interaction);
      if (!permissionResult.allowed) {
        await interaction.reply({
          content: permissionResult.reason,
          flags: 64
        });
        return;
      }

      // Sync Discord roles with RBAC before proceeding
      if (interaction.member && 'permissions' in interaction.member && 'roles' in interaction.member) {
        await intelligencePermissionService.syncDiscordRoles(interaction.member as import('discord.js').GuildMember);
      }

      if (enable) {
        await this.enableIntelligentConversation(userId, interaction);
      } else {
        await this.disableIntelligentConversation(userId, interaction);
      }

      // Log the interaction
      logInteraction({ 
        guildId: interaction.guildId, 
        userId: interaction.user.id, 
        command: 'optin', 
        isSuccess: true 
      });

    } catch (error) {
      logger.error('Optin command failed', {
        operation: 'optin-command',
        metadata: {
          userId: interaction.user.id,
          error: String(error)
        }
      });

      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Something went wrong')
        .setDescription('I encountered an error while setting up intelligent conversation. Please try again!')
        .setColor(0xe74c3c)
        .setTimestamp();

      await interaction.reply({ embeds: [errorEmbed], flags: 64 });
      
      // Log failed interaction
      logInteraction({ 
        guildId: interaction.guildId, 
        userId: interaction.user.id, 
        command: 'optin', 
        isSuccess: false 
      });
    }
  }

  /**
   * Enable intelligent conversation for a user
   */
  private async enableIntelligentConversation(userId: string, interaction: ChatInputCommandInteraction): Promise<void> {
    // Add user to opted-in set
    this.optedInUsers.add(userId);
    await this.saveOptedInUsers();

    logger.info('User opted into intelligent conversation', {
      operation: 'enable-intelligence',
      metadata: {
        userId,
        guildId: interaction.guildId
      }
    });

    // Get user capabilities for personalized welcome message
    const capabilities = await intelligencePermissionService.getUserCapabilities(userId, {
      guildId: interaction.guildId || undefined,
      channelId: interaction.channelId,
      userId
    });

    const welcomeEmbed = this.buildWelcomeEmbed(capabilities);
    await interaction.reply({ embeds: [welcomeEmbed], flags: 64 });
  }

  /**
   * Disable intelligent conversation for a user
   */
  private async disableIntelligentConversation(userId: string, interaction: ChatInputCommandInteraction): Promise<void> {
    this.optedInUsers.delete(userId);
    await this.saveOptedInUsers();

    logger.info('User opted out of intelligent conversation', {
      operation: 'disable-intelligence',
      metadata: { userId }
    });

    const disableEmbed = new EmbedBuilder()
      .setTitle('🔕 Intelligent Conversation Disabled')
      .setDescription('I\'ve disabled automatic intelligent responses. You can re-enable anytime with `/optin enable:true`')
      .setColor(0xf39c12)
      .addFields({
        name: '💡 Note',
        value: 'Your conversation history and preferences are preserved. When you opt back in, I\'ll remember everything!',
        inline: false
      })
      .setTimestamp();

    await interaction.reply({ embeds: [disableEmbed], flags: 64 });
  }

  /**
   * Build welcome embed based on user capabilities
   */
  private buildWelcomeEmbed(capabilities: UserCapabilities): EmbedBuilder {
    const welcomeEmbed = new EmbedBuilder()
      .setTitle('🧠 Unified Intelligence Enabled!')
      .setDescription('🚀 Welcome to AI conversation! Here are the features available to you:')
      .setColor(0x9b59b6);

    // Basic features available to all
    welcomeEmbed.addFields({
      name: '💬 Smart Conversation',
      value: '• Natural AI responses to your messages\n• Context-aware personality adaptation\n• Intelligent memory of our conversations',
      inline: false
    });

    // Add capability-specific features
    if (capabilities.hasMultimodal) {
      welcomeEmbed.addFields({
        name: '🖼️ Multimodal Analysis',
        value: '• Image, audio, and document analysis\n• Real-time content processing\n• Cross-modal insights',
        inline: false
      });
    }

    if (capabilities.hasAdvancedAI) {
      welcomeEmbed.addFields({
        name: '🔍 Advanced AI Tools',
        value: '• Web search and research\n• Complex reasoning capabilities\n• External data integration',
        inline: false
      });
    }

    if (capabilities.hasAnalytics || capabilities.hasAdminCommands) {
      const adminFeatures = [];
      if (capabilities.hasAnalytics) adminFeatures.push('• Usage statistics and analytics');
      if (capabilities.hasAdminCommands) adminFeatures.push('• Persona creation and management');
      
      welcomeEmbed.addFields({
        name: '📊 Administrative Features',
        value: adminFeatures.join('\n'),
        inline: false
      });
    }

    welcomeEmbed.addFields({
      name: '✨ How it works',
      value: 'Just talk to me naturally! I\'ll automatically use the appropriate features based on your permissions and needs.',
      inline: false
    })
    .setFooter({ text: 'Your access level determines which advanced features are available.' })
    .setTimestamp();

    return welcomeEmbed;
  }

  /**
   * Main intelligence handler - processes messages from opted-in users
   */
  public async handleIntelligentMessage(message: Message): Promise<void> {
    try {
      // Only process messages from opted-in users
      if (!this.optedInUsers.has(message.author.id) || message.author.bot) {
        return;
      }

      // First, check for moderator corrections
      if (message.reference && message.reference.messageId) {
        const capabilities = await intelligencePermissionService.getUserCapabilities(message.author.id, {
          guildId: message.guildId || undefined,
          channelId: message.channel.id,
          userId: message.author.id
        });

        if (capabilities.hasAdminCommands) { // Assuming moderators have admin commands capability
          const repliedToMessage = await message.channel.messages.fetch(message.reference.messageId);
          // Check if the bot authored the message being replied to
          if (repliedToMessage.author.id === message.client.user?.id) {
            const originalMessageContent = repliedToMessage.embeds[0]?.description || repliedToMessage.content;
            await this.agenticIntelligenceService.addCorrectionToKnowledgeBase(
              originalMessageContent, // This is an approximation of the original query
              message.content, // The moderator's corrected response
              message.author.id,
              message.channel.id
            );
            // Optional: Confirm the correction was learned
            await message.react('✅');
            return; // Stop further processing
          }
        }
      }

      // Validate permissions using modular service
      const permissionResult = await intelligencePermissionService.validateMessagePermissions(message);
      if (!permissionResult.allowed) {
        await message.reply(permissionResult.reason || 'Permission denied');
        return;
      }

      // Don't respond to commands or very short messages without attachments
      if (message.content.startsWith('/') || (message.content.length < 3 && message.attachments.size === 0)) {
        return;
      }

      logger.info('Processing intelligent message', {
        operation: 'intelligent-message',
        metadata: {
          userId: message.author.id,
          channelId: message.channel.id,
          hasAttachments: message.attachments.size > 0,
          messageLength: message.content.length
        }
      });

      // Start typing to show processing
      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping();
      }

      // Process with unified intelligence using modular services
      const response = await this.generateUnifiedResponse(message);
      await this.sendUnifiedResponse(message, response);

    } catch (error) {
      logger.error('Intelligent message processing failed', {
        operation: 'intelligent-message',
        metadata: {
          userId: message.author.id,
          error: String(error)
        }
      });

      await message.reply('I\'m having trouble processing that right now. Could you try again? 🤔');
    }
  }

  /**
   * Generate unified intelligent response using modular services
   */
  private async generateUnifiedResponse(message: Message): Promise<AsyncGenerator<string>> {
    try {
      // Step 1: Apply automatic moderation
      const moderationResult = await this.applyModeration(message);
      if (moderationResult.blocked) {
        return this.createModerationResponse(moderationResult.reason || 'Content blocked');
      }

      // Step 2: Get user capabilities
      const capabilities = await intelligencePermissionService.getUserCapabilities(message.author.id, {
        guildId: message.guildId || undefined,
        channelId: message.channel.id,
        userId: message.author.id
      });

      // Step 3: Analyze message to determine needed capabilities
      const analysis = await intelligenceAnalysisService.analyzeMessage(message, capabilities);

      // Step 4: Check for admin features first (they might provide direct responses)
      if (intelligenceAdminService.hasAdminIntent(message.content)) {
        const adminResult = await intelligenceAdminService.handleAdminFeatures(message, capabilities);
        if (adminResult.handled && adminResult.response) {
          return this.createDirectResponse(adminResult.response);
        }
      }

      // Step 5: Execute detected capabilities
      await intelligenceCapabilityService.executeCapabilities(analysis, message);

      // Step 6: Build enhanced context with all gathered information
      const enhancedContext = await intelligenceContextService.buildEnhancedContext(
        message,
        analysis,
        capabilities
      );

      // Step 7: Generate AI response using the Agentic Intelligence Service
      const agenticQuery: AgenticQuery = {
        query: enhancedContext.prompt,
        userId: message.author.id,
        channelId: message.channel.id,
        context: {
          previousMessages: await getHistory(message.channel.id),
          userRole: capabilities.hasAdminCommands ? 'admin' : 'user',
          userPermissions: Object.keys(capabilities).filter(k => capabilities[k as keyof UserCapabilities]),
        },
        options: {
          guildId: message.guildId || 'default',
        }
      };

      const agenticResponse = await this.agenticIntelligenceService.processQuery(agenticQuery);

      // Log flagging and escalation results
      if (agenticResponse.flagging.shouldFlag) {
        logger.warn('Agentic response flagged', { ...agenticResponse.flagging, userId: message.author.id });
      }
      if (agenticResponse.escalation.shouldEscalate) {
        logger.warn('Agentic response escalated', { ...agenticResponse.escalation, userId: message.author.id });
      }

      // Update conversation history with the final, potentially modified, response
      updateHistory(message.channel.id, enhancedContext.prompt, agenticResponse.response);

      return this.createDirectResponse(agenticResponse.response);

    } catch (error) {
      logger.error('Unified response generation failed', {
        operation: 'generate-unified-response',
        metadata: {
          userId: message.author.id,
          error: String(error)
        }
      });

      return this.createFallbackResponse();
    }
  }

  /**
   * Apply intelligent content moderation
   */
  private async applyModeration(message: Message): Promise<{ blocked: boolean; reason?: string }> {
    try {
      // Check text content
      const textResult = await moderationService.moderateText(message.content, {
        guildId: message.guildId || 'default',
        userId: message.author.id,
        channelId: message.channel.id,
        messageId: message.id
      });

      if (textResult.action === 'block') {
        return { blocked: true, reason: textResult.verdict.reason || 'Content flagged as unsafe' };
      }

      // Check attachments if present
      if (message.attachments.size > 0) {
        for (const attachment of message.attachments.values()) {
          if (attachment.contentType?.startsWith('image/')) {
            const imageResult = await moderationService.moderateImage(
              attachment.url, 
              attachment.contentType,
              {
                guildId: message.guildId || 'default',
                userId: message.author.id,
                channelId: message.channel.id,
                messageId: message.id
              }
            );

            if (imageResult.action === 'block') {
              return { blocked: true, reason: imageResult.verdict.reason || 'Image flagged as unsafe' };
            }
          }
        }
      }

      return { blocked: false };

    } catch (error) {
      logger.warn('Moderation check failed, allowing content', { 
        operation: 'moderation-check',
        metadata: { error: String(error) }
      });
      return { blocked: false };
    }
  }

  /**
   * Generate AI response with enhanced context
   */
  private async generateAIResponse(enhancedContext: EnhancedContext, message: Message): Promise<AsyncGenerator<string>> {
    try {
      const history = await getHistory(message.channel.id);

      // Handle multimodal content
      if (message.attachments.size > 0) {
        for (const attachment of message.attachments.values()) {
          if (attachment.contentType?.startsWith('image/')) {
            const part = await urlToGenerativePart(attachment.url, attachment.contentType);
            // Use non-streaming version for now since streaming multimodal isn't available
            const response = await this.geminiService.generateMultimodalResponse(
              enhancedContext.prompt,
              part,
              history,
              message.author.id,
              message.guildId || 'default'
            );
            // Convert to async generator
            return this.createDirectResponse(response);
          }
        }
      }

      // Text-only response with streaming
      const responseStream = this.geminiService.generateResponseStream(
        enhancedContext.prompt,
        history,
        message.author.id,
        message.guildId || 'default'
      );

      return responseStream;

    } catch (error) {
      logger.error('AI response generation failed', { 
        operation: 'ai-response',
        metadata: { error: String(error) }
      });
      return this.createFallbackResponse();
    }
  }

  /**
   * Send unified response using streaming
   */
  private async sendUnifiedResponse(message: Message, responseStream: AsyncGenerator<string>): Promise<void> {
    try {
      // Create a message interaction proxy for sendStream
      const messageInteraction = {
        replied: false,
        deferred: false,
        reply: async (options: BaseMessageOptions) => {
          const reply = await message.reply(options);
          messageInteraction._reply = reply;
          messageInteraction.replied = true;
          return reply;
        },
        editReply: async (options: BaseMessageOptions) => {
          if (messageInteraction._reply) {
            return await messageInteraction._reply.edit(options);
          }
          throw new Error('No reply to edit');
        },
        _reply: null as Message | null
      };

      // Send with streaming and controls
      const fullResponse = await sendStream(
        messageInteraction as never,
        responseStream,
        {
          throttleMs: 1000,
          withControls: true
        }
      );

      // Update conversation context
      if (message.attachments.size > 0) {
        for (const attachment of message.attachments.values()) {
          if (attachment.contentType?.startsWith('image/')) {
            const part = await urlToGenerativePart(attachment.url, attachment.contentType);
            await updateHistoryWithParts(message.channel.id, [
              { text: message.content },
              part
            ], fullResponse);
            break;
          }
        }
      } else {
        updateHistory(message.channel.id, message.content, fullResponse);
      }

    } catch (error) {
      logger.error('Unified response sending failed', {
        operation: 'send-unified-response',
        metadata: {
          userId: message.author.id,
          error: String(error)
        }
      });

      await message.reply('❌ Something went wrong while generating my response. Please try again!');
    }
  }

  /**
   * Handle button interactions (regenerate, stop)
   */
  public async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    if (interaction.customId === STOP_BUTTON_ID) {
      const streamKey = `${interaction.user.id}-${interaction.channelId}`;
      const stream = this.activeStreams.get(streamKey);
      if (stream) {
        stream.abortController.abort();
        this.activeStreams.delete(streamKey);
      }

      await interaction.update({ 
        content: interaction.message.content,
        components: []
      });

    } else if (interaction.customId === REGENERATE_BUTTON_ID) {
      const cached = this.lastPromptCache.get(interaction.user.id);
      if (!cached) {
        await interaction.reply({ content: 'No previous prompt found.', flags: 64 });
        return;
      }

      await interaction.update({ 
        content: interaction.message.content,
        components: []
      });
      
      try {
        const history = await getHistory(cached.channelId);
        let response: string;
        
        if (cached.attachment) {
          const part = await urlToGenerativePart(cached.attachment, 'image/png');
          response = await this.geminiService.generateMultimodalResponse(
            cached.prompt, 
            part, 
            history, 
            interaction.user.id, 
            interaction.guildId ?? 'default'
          );
        } else {
          response = await this.geminiService.generateResponse(
            cached.prompt, 
            history, 
            interaction.user.id, 
            interaction.guildId ?? 'default'
          );
        }

        updateHistory(cached.channelId, cached.prompt, response);
        await interaction.followUp(response);

      } catch (err) {
        logger.error('Error regenerating response', { 
          operation: 'regenerate-response',
          metadata: { error: String(err) }
        });
        await interaction.followUp('❌ Error regenerating response');
      }
    }
  }

  /**
   * Response generators
   */
  private async* createDirectResponse(response: string): AsyncGenerator<string> {
    yield response;
  }

  private async* createModerationResponse(reason: string): AsyncGenerator<string> {
    yield `🚫 Your message was blocked: ${reason}`;
  }

  private async* createFallbackResponse(): AsyncGenerator<string> {
    yield 'I\'m having trouble processing that right now. Could you try again? 🤔';
  }

  /**
   * Storage methods
   */
  private async loadOptedInUsers(): Promise<void> {
    try {
      // Implementation would load from persistent storage
      // For now, keep in memory
    } catch (error) {
      logger.warn('Failed to load opted-in users', { 
        operation: 'load-opted-users',
        metadata: { error: String(error) }
      });
    }
  }

  private async saveOptedInUsers(): Promise<void> {
    try {
      // Implementation would save to persistent storage
      // For now, keep in memory
    } catch (error) {
      logger.warn('Failed to save opted-in users', { 
        operation: 'save-opted-users',
        metadata: { error: String(error) }
      });
    }
  }

  /**
   * Public utility methods
   */
  public isUserOptedIn(userId: string): boolean {
    return this.optedInUsers.has(userId);
  }

  public getUnifiedStats(): {
    optedInUsers: number;
    activeConversations: number;
    totalInteractions: number;
  } {
    return {
      optedInUsers: this.optedInUsers.size,
      activeConversations: this.activeStreams.size,
      totalInteractions: this.lastPromptCache.size
    };
  }
}
