/**
 * Enhanced UI Components Service
 * Handles Discord UI components and streaming responses for enhanced intelligence
 */

import { 
  ChatInputCommandInteraction, 
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} from 'discord.js';
import { ProcessingContext } from './types.js';
import { updateHistory } from '../context-manager.js';

export class EnhancedUIService {
  
  // Store last prompts for regeneration
  private lastPrompts = new Map<string, string>();

  /**
   * Initialize streaming response
   */
  async initializeStreamingResponse(
    interaction: ChatInputCommandInteraction, 
    context: ProcessingContext
  ): Promise<void> {
    try {
      const initialMessage = this.getProcessingStatusMessage(context);
      
      // Check interaction state and respond appropriately
      if (interaction.deferred) {
        await interaction.editReply({
          content: initialMessage,
          components: [this.createProcessingActionRow()]
        });
      } else if (interaction.replied) {
        await interaction.followUp({
          content: initialMessage,
          components: [this.createProcessingActionRow()]
        });
      } else if (interaction.isRepliable()) {
        // This should not happen if deferReply was called, but handle as fallback
        await interaction.reply({
          content: initialMessage,
          components: [this.createProcessingActionRow()]
        });
      } else {
        console.warn('⚠️ Interaction is not repliable for UI initialization');
      }
    } catch (error) {
      console.error('❌ Failed to initialize streaming response:', error);
      // Continue processing even if UI update fails
    }
  }

  /**
   * Finalize streaming response with results
   */
  async finalizeStreamingResponse(
    interaction: ChatInputCommandInteraction,
    response: string,
    context: ProcessingContext,
    originalPrompt: string
  ): Promise<void> {
    try {
      // Update context history
      updateHistory(context.channelId, originalPrompt, response);
      
      // Store prompt for regeneration
      this.lastPrompts.set(context.userId, originalPrompt);
      
      // Check interaction state and respond appropriately
      if (interaction.deferred) {
        await interaction.editReply({
          content: response,
          components: [this.createResponseActionRow()]
        });
      } else if (interaction.replied) {
        await interaction.followUp({
          content: response,
          components: [this.createResponseActionRow()]
        });
      } else if (interaction.isRepliable()) {
        // Fallback: try to reply if not already responded
        await interaction.reply({
          content: response,
          components: [this.createResponseActionRow()]
        });
      } else {
        console.warn('⚠️ Interaction is not repliable for finalization');
      }
    } catch (error) {
      console.error('❌ Failed to finalize streaming response:', error);
      // Try to send a simple response as fallback
      try {
        if (interaction.deferred) {
          await interaction.editReply({ content: response });
        } else if (interaction.replied) {
          await interaction.followUp({ content: response });
        } else if (interaction.isRepliable()) {
          await interaction.reply({ content: response });
        }
      } catch (fallbackError) {
        console.error('❌ Failed to send fallback response:', fallbackError);
      }
    }
  }

  /**
   * Handle processing errors with user-friendly messaging
   */
  async handleProcessingError(interaction: ChatInputCommandInteraction, error: Error): Promise<void> {
    const errorMessage = 'I encountered an issue while processing your request. Let me try a simpler approach.';
    
    console.error('❌ Enhanced processing error:', error);
    
    try {
      if (interaction.deferred) {
        await interaction.editReply({
          content: errorMessage,
          components: [this.createErrorActionRow()]
        });
      } else if (interaction.replied) {
        await interaction.followUp({
          content: errorMessage,
          components: [this.createErrorActionRow()]
        });
      } else if (interaction.isRepliable()) {
        await interaction.reply({
          content: errorMessage,
          components: [this.createErrorActionRow()]
        });
      }
    } catch (editError) {
      console.error('❌ Failed to edit reply with error message:', editError);
    }
  }

  /**
   * Get processing status message based on analysis
   */
  private getProcessingStatusMessage(context: ProcessingContext): string {
    const { analysis } = context;
    let message = '🤖 Processing your request';
    
    if (analysis.hasAttachments) message += ' with attachments';
    if (analysis.hasUrls) message += ' and web content';
    if (analysis.complexity === 'complex') message += ' using advanced reasoning';
    
    message += '...';
    return message;
  }

  /**
   * Create action row for processing state
   */
  private createProcessingActionRow(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('cancel_processing')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⏹️')
      );
  }

  /**
   * Create action row for completed response
   */
  public createResponseActionRow(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('regenerate_enhanced')
          .setLabel('Regenerate')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔄'),
        new ButtonBuilder()
          .setCustomId('explain_processing')
          .setLabel('How was this processed?')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('❓')
      );
  }

  /**
   * Create action row for error states
   */
  private createErrorActionRow(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('retry_simplified')
          .setLabel('Try Again (Simplified)')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔄')
      );
  }

  /**
   * Get stored prompt for regeneration
   */
  getLastPrompt(userId: string): string | undefined {
    return this.lastPrompts.get(userId);
  }

  /**
   * Store prompt for regeneration
   */
  storeLastPrompt(userId: string, prompt: string): void {
    this.lastPrompts.set(userId, prompt);
  }
}
