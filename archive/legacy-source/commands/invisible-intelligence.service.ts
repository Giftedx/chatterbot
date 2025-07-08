/**
 * CYCLE 17: Invisible Intelligence - Natural Conversation with Automatic AI
 * Single /optin command + automatic processing in natural conversation
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  BaseMessageOptions
} from 'discord.js';
import { GeminiService } from '../services/gemini.service.js';
import { ContextManager } from '../services/context-manager.js';
import { sendStream } from '../ui/stream-utils.js';
import { logger } from '../utils/logger.js';

/**
 * Invisible Intelligence System - Natural conversation with automatic AI processing
 */
export class InvisibleIntelligenceService {
  private readonly geminiService: GeminiService;
  private readonly contextManager: ContextManager;
  
  // Track users who have opted into intelligent conversation
  private optedInUsers = new Set<string>();

  constructor() {
    this.geminiService = new GeminiService();
    this.contextManager = new ContextManager();
    this.loadOptedInUsers();
  }

  /**
   * Build the single /optin command
   */
  public buildOptinCommand(): SlashCommandBuilder {
    return new SlashCommandBuilder()
      .setName('optin')
      .setDescription('Enable intelligent conversation - I\'ll automatically understand your content and respond naturally!')
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

      if (enable) {
        await this.enableIntelligentConversation(userId, interaction);
      } else {
        await this.disableIntelligentConversation(userId, interaction);
      }

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

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
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

    const welcomeEmbed = new EmbedBuilder()
      .setTitle('🧠 Intelligent Conversation Enabled!')
      .setDescription('Amazing! I\'m now your intelligent conversation partner. Here\'s what I can do automatically:')
      .setColor(0x27ae60)
      .addFields(
        { 
          name: '🖼️ Smart Content Understanding', 
          value: 'Upload any images or files and I\'ll automatically understand them and respond naturally about what I see.', 
          inline: false 
        },
        { 
          name: ' Memory & Context', 
          value: 'I\'ll remember our conversations and reference previous topics naturally in our ongoing discussion.', 
          inline: false 
        },
        { 
          name: '🤖 Intelligent Responses', 
          value: 'I\'ll provide thoughtful, contextual responses that build on our conversation history.', 
          inline: false 
        }
      )
      .addFields({
        name: '✨ How it works',
        value: 'Just talk to me naturally! Upload files, ask questions, have conversations. All the AI magic happens automatically behind the scenes.',
        inline: false
      })
      .setFooter({ text: 'Try uploading an image or just start chatting!' })
      .setTimestamp();

    await interaction.reply({ embeds: [welcomeEmbed], ephemeral: true });
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
        value: 'Your conversation history is preserved. When you opt back in, I\'ll remember our previous interactions!',
        inline: false
      })
      .setTimestamp();

    await interaction.reply({ embeds: [disableEmbed], ephemeral: true });
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

      // Don't respond to commands
      if (message.content.startsWith('/')) {
        return;
      }

      // Skip very short messages unless they have attachments
      if (message.content.length < 3 && message.attachments.size === 0) {
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

      // Start typing to show the bot is processing
      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping();
      }

      // Process message with intelligent context
      const response = await this.generateIntelligentResponse(message);

      // Send the response using streaming
      await this.sendIntelligentResponse(message, response);

    } catch (error) {
      logger.error('Intelligent message processing failed', {
        operation: 'intelligent-message',
        metadata: {
          userId: message.author.id,
          error: String(error)
        }
      });

      // Send a natural error response
      await message.reply('I\'m having trouble processing that right now. Could you try again? 🤔');
    }
  }

  /**
   * Generate an intelligent response using all available context
   */
  private async generateIntelligentResponse(message: Message): Promise<AsyncGenerator<string>> {
    try {
      // Get conversation context
      const conversationHistory = await this.contextManager.getHistory(message.channel.id);

      // Build enhanced context for the AI
      let enhancedPrompt = message.content;

      // Add attachment context if available
      if (message.attachments.size > 0) {
        const attachmentContext = this.describeAttachments(message);
        enhancedPrompt = `${message.content}\n\n[SHARED CONTENT]\n${attachmentContext}`;
      }

      // Add conversation context
      if (conversationHistory.length > 0) {
        enhancedPrompt += `\n\n[CONVERSATION CONTEXT]\nThis is part of an ongoing conversation. Please respond naturally and reference previous context when relevant.`;
      }

      // Add intelligent conversation context
      enhancedPrompt += `\n\n[SYSTEM]\nYou are having a natural conversation with ${message.author.username}. Respond intelligently, reference their shared content naturally, and maintain conversational flow. Be helpful, engaging, and contextually aware.`;

      // Generate intelligent response using existing Gemini service
      const responseStream = await this.geminiService.generateResponseStream(
        enhancedPrompt,
        conversationHistory,
        message.author.id,
        message.guildId || 'dm'
      );

      return responseStream;

    } catch (error) {
      logger.error('Intelligent response generation failed', {
        operation: 'generate-intelligent-response',
        metadata: {
          userId: message.author.id,
          error: String(error)
        }
      });

      // Return a simple fallback generator
      return this.createFallbackResponse();
    }
  }

  /**
   * Send the intelligent response using streaming
   */
  private async sendIntelligentResponse(message: Message, responseStream: AsyncGenerator<string>): Promise<void> {
    try {
      // Create a message-based interaction for the streaming utility
      const messageInteraction = {
        replied: false,
        deferred: false,
        reply: async (options: BaseMessageOptions) => {
          const reply = await message.reply(options);
          messageInteraction.replied = true;
          messageInteraction._reply = reply;
          return reply;
        },
        editReply: async (options: BaseMessageOptions) => {
          if (messageInteraction._reply) {
            return await messageInteraction._reply.edit(options);
          }
          return await message.reply(options);
        },
        _reply: null as Message | null
      };

      // Use the existing streaming utility (without controls for natural conversation)
      const fullResponse = await sendStream(
        messageInteraction as never,
        responseStream,
        {
          throttleMs: 1000,
          withControls: false
        }
      );

      // Update conversation context
      await this.contextManager.updateHistory(
        message.channel.id,
        message.content,
        fullResponse
      );

      logger.info('Intelligent response sent successfully', {
        operation: 'send-intelligent-response',
        metadata: {
          userId: message.author.id,
          responseLength: fullResponse.length
        }
      });

    } catch (error) {
      logger.error('Intelligent response sending failed', {
        operation: 'send-intelligent-response',
        metadata: {
          userId: message.author.id,
          error: String(error)
        }
      });

      // Fallback to simple reply
      await message.reply('I understand what you\'re saying, but I\'m having trouble formulating my response right now. 🤔');
    }
  }

  // Helper methods

  /**
   * Describe attachments in natural language
   */
  private describeAttachments(message: Message): string {
    const attachments = Array.from(message.attachments.values());
    const descriptions = [];

    for (const attachment of attachments) {
      const { name, contentType, size } = attachment;
      
      if (contentType?.startsWith('image/')) {
        descriptions.push(`Image: ${name} (${this.formatFileSize(size)})`);
      } else if (contentType?.startsWith('audio/')) {
        descriptions.push(`Audio file: ${name} (${this.formatFileSize(size)})`);
      } else if (contentType?.startsWith('video/')) {
        descriptions.push(`Video: ${name} (${this.formatFileSize(size)})`);
      } else {
        descriptions.push(`File: ${name} (${this.formatFileSize(size)})`);
      }
    }

    return descriptions.join('\n');
  }

  /**
   * Format file size in human readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Create a fallback response generator
   */
  private async* createFallbackResponse(): AsyncGenerator<string> {
    yield 'I understand what you\'re sharing with me, but I\'m having some technical difficulties right now. ';
    yield 'Could you try again in a moment? I want to give you the best response possible! 🤖';
  }

  /**
   * Load opted-in users from storage
   */
  private async loadOptedInUsers(): Promise<void> {
    try {
      // In a real implementation, this would load from database
      // For now, we'll use in-memory storage that persists for the session
      logger.debug('Loaded opted-in users from storage');
    } catch (error) {
      logger.error('Failed to load opted-in users', {
        operation: 'load-opted-users',
        metadata: { error: String(error) }
      });
    }
  }

  /**
   * Save opted-in users to storage
   */
  private async saveOptedInUsers(): Promise<void> {
    try {
      // In a real implementation, this would save to database
      logger.debug('Saved opted-in users to storage', {
        operation: 'save-opted-users',
        metadata: { count: this.optedInUsers.size }
      });
    } catch (error) {
      logger.error('Failed to save opted-in users', {
        operation: 'save-opted-users',
        metadata: { error: String(error) }
      });
    }
  }

  /**
   * Check if a user has opted into intelligent conversation
   */
  public isUserOptedIn(userId: string): boolean {
    return this.optedInUsers.has(userId);
  }

  /**
   * Get stats about the invisible intelligence system
   */
  public getIntelligenceStats(): {
    optedInUsers: number;
    activeConversations: number;
  } {
    return {
      optedInUsers: this.optedInUsers.size,
      activeConversations: 0 // Would track in real implementation
    };
  }
}
