/**
 * Conversation Management Commands
 * Slash commands for advanced conversation management features
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction
} from 'discord.js';
import { ConversationThreadService } from '../conversation/conversation-thread.service.js';
import { ConversationSummaryService } from '../conversation/conversation-summary.service.js';
import { ContextWindowService } from '../conversation/context-window.service.js';
import { logger } from '../utils/logger.js';

/**
 * Conversation management slash commands
 */
export class ConversationCommands {
  private readonly threadService: ConversationThreadService;
  private readonly summaryService: ConversationSummaryService;
  private readonly contextService: ContextWindowService;

  constructor() {
    this.threadService = new ConversationThreadService();
    this.summaryService = new ConversationSummaryService();
    this.contextService = new ContextWindowService();
  }

  /**
   * Get all conversation management slash command definitions
   */
  public getCommands() {
    return [
      this.getThreadManagementCommand(),
      this.getSummaryCommand(),
      this.getContextCommand(),
      this.getTopicsCommand()
    ];
  }

  /**
   * Thread management command
   */
  private getThreadManagementCommand() {
    return new SlashCommandBuilder()
      .setName('thread')
      .setDescription('Manage conversation threads')
      .addSubcommand(subcommand =>
        subcommand
          .setName('create')
          .setDescription('Create a new conversation thread')
          .addStringOption(option =>
            option
              .setName('title')
              .setDescription('Thread title')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('topic')
              .setDescription('Initial topic')
              .setRequired(false)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('list')
          .setDescription('List your conversation threads')
          .addStringOption(option =>
            option
              .setName('status')
              .setDescription('Filter by status')
              .setRequired(false)
              .addChoices(
                { name: 'Active', value: 'active' },
                { name: 'Archived', value: 'archived' },
                { name: 'All', value: 'all' }
              )
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('archive')
          .setDescription('Archive a conversation thread')
          .addStringOption(option =>
            option
              .setName('thread-id')
              .setDescription('Thread ID to archive')
              .setRequired(true)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('info')
          .setDescription('Get information about a thread')
          .addStringOption(option =>
            option
              .setName('thread-id')
              .setDescription('Thread ID')
              .setRequired(true)
          )
      );
  }

  /**
   * Summary command
   */
  private getSummaryCommand() {
    return new SlashCommandBuilder()
      .setName('summary')
      .setDescription('Generate conversation summaries')
      .addSubcommand(subcommand =>
        subcommand
          .setName('thread')
          .setDescription('Summarize a specific thread')
          .addStringOption(option =>
            option
              .setName('thread-id')
              .setDescription('Thread ID to summarize')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('type')
              .setDescription('Summary type')
              .setRequired(false)
              .addChoices(
                { name: 'Brief', value: 'brief' },
                { name: 'Detailed', value: 'detailed' },
                { name: 'Comprehensive', value: 'comprehensive' }
              )
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('recent')
          .setDescription('Quick summary of recent activity')
          .addIntegerOption(option =>
            option
              .setName('messages')
              .setDescription('Number of recent messages to include')
              .setRequired(false)
              .setMinValue(5)
              .setMaxValue(50)
          )
      );
  }

  /**
   * Context command
   */
  private getContextCommand() {
    return new SlashCommandBuilder()
      .setName('context')
      .setDescription('Manage conversation context')
      .addSubcommand(subcommand =>
        subcommand
          .setName('window')
          .setDescription('Show current context window')
          .addStringOption(option =>
            option
              .setName('message')
              .setDescription('Reference message for context')
              .setRequired(false)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('search')
          .setDescription('Search conversation history')
          .addStringOption(option =>
            option
              .setName('query')
              .setDescription('Search query')
              .setRequired(true)
          )
          .addIntegerOption(option =>
            option
              .setName('limit')
              .setDescription('Maximum results')
              .setRequired(false)
              .setMinValue(1)
              .setMaxValue(20)
          )
      );
  }

  /**
   * Topics command
   */
  private getTopicsCommand() {
    return new SlashCommandBuilder()
      .setName('topics')
      .setDescription('Manage conversation topics')
      .addSubcommand(subcommand =>
        subcommand
          .setName('list')
          .setDescription('List recent topics')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('history')
          .setDescription('Show topic discussion history')
          .addStringOption(option =>
            option
              .setName('topic')
              .setDescription('Topic name')
              .setRequired(true)
          )
      );
  }

  /**
   * Handle thread management commands
   */
  public async handleThreadCommand(interaction: ChatInputCommandInteraction) {
    try {
      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'create':
          await this.handleThreadCreate(interaction);
          break;
        case 'list':
          await this.handleThreadList(interaction);
          break;
        case 'archive':
          await this.handleThreadArchive(interaction);
          break;
        case 'info':
          await this.handleThreadInfo(interaction);
          break;
        default:
          await interaction.reply({
            content: 'Unknown thread subcommand.',
            ephemeral: true
          });
      }
    } catch (error) {
      logger.error('Failed to handle thread command', {
        operation: 'thread-command',
        userId: interaction.user.id,
        subcommand: interaction.options.getSubcommand(),
        error: String(error)
      });

      await interaction.reply({
        content: 'An error occurred while processing the thread command.',
        ephemeral: true
      });
    }
  }

  /**
   * Handle summary commands
   */
  public async handleSummaryCommand(interaction: ChatInputCommandInteraction) {
    try {
      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'thread':
          await this.handleSummaryThread(interaction);
          break;
        case 'recent':
          await this.handleSummaryRecent(interaction);
          break;
        default:
          await interaction.reply({
            content: 'Unknown summary subcommand.',
            ephemeral: true
          });
      }
    } catch (error) {
      logger.error('Failed to handle summary command', {
        operation: 'summary-command',
        userId: interaction.user.id,
        subcommand: interaction.options.getSubcommand(),
        error: String(error)
      });

      await interaction.reply({
        content: 'An error occurred while processing the summary command.',
        ephemeral: true
      });
    }
  }

  /**
   * Create new thread
   */
  private async handleThreadCreate(interaction: ChatInputCommandInteraction) {
    const title = interaction.options.getString('title', true);
    const topic = interaction.options.getString('topic');

    await interaction.deferReply({ ephemeral: true });

    try {
      const thread = await this.threadService.createThread(
        interaction.channelId,
        interaction.user.id,
        interaction.guildId || undefined,
        {
          title,
          initialTopic: topic || undefined
        }
      );

      if (!thread) {
        await interaction.editReply('Failed to create thread.');
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('✅ Thread Created')
        .setDescription(`**${title}**`)
        .addFields(
          { name: 'Thread ID', value: thread.id?.toString() || 'Unknown', inline: true },
          { name: 'Status', value: thread.status, inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      if (topic) {
        embed.addFields({ name: 'Initial Topic', value: topic, inline: true });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      await interaction.editReply('Failed to create thread. Please try again.');
    }
  }

  /**
   * List user threads
   */
  private async handleThreadList(interaction: ChatInputCommandInteraction) {
    const status = interaction.options.getString('status') || 'active';

    await interaction.deferReply({ ephemeral: true });

    try {
      const threads = await this.threadService.getUserThreads(
        interaction.user.id,
        interaction.channelId,
        { status: status as any, limit: 10 }
      );

      if (threads.length === 0) {
        await interaction.editReply('No threads found.');
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`📋 Your Threads (${status})`)
        .setDescription(`Found ${threads.length} thread(s)`)
        .setColor(0x0099ff)
        .setTimestamp();

      const threadList = threads.slice(0, 10).map(thread => {
        const statusEmoji = thread.status === 'active' ? '🟢' : '📦';
        const lastActivity = `<t:${Math.floor(thread.lastActivity.getTime() / 1000)}:R>`;
        return `${statusEmoji} **${thread.threadTitle}** (ID: ${thread.id})\n` +
               `📊 ${thread.messageCount} messages • Last: ${lastActivity}`;
      }).join('\n\n');

      embed.setDescription(threadList);

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      await interaction.editReply('Failed to retrieve threads.');
    }
  }

  /**
   * Archive thread
   */
  private async handleThreadArchive(interaction: ChatInputCommandInteraction) {
    const threadId = interaction.options.getString('thread-id', true);

    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await this.threadService.archiveThread(parseInt(threadId), {
        generateSummary: true
      });

      if (!result.success) {
        await interaction.editReply('Thread not found or could not be archived.');
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('📦 Thread Archived')
        .setDescription(`Thread ${threadId} has been archived.`)
        .addFields(
          { name: 'Messages Preserved', value: result.messagesPreserved.toString(), inline: true },
          { name: 'Summary Generated', value: result.summaryGenerated ? 'Yes' : 'No', inline: true }
        )
        .setColor(0xff9900)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      await interaction.editReply('Failed to archive thread.');
    }
  }

  /**
   * Get thread info
   */
  private async handleThreadInfo(interaction: ChatInputCommandInteraction) {
    const threadId = interaction.options.getString('thread-id', true);

    await interaction.deferReply({ ephemeral: true });

    try {
      const insights = await this.threadService.getConversationInsights(parseInt(threadId));

      if (!insights) {
        await interaction.editReply('Thread not found.');
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('📊 Thread Information')
        .addFields(
          { name: 'Thread ID', value: threadId, inline: true },
          { name: 'Status', value: insights.engagementPattern, inline: true },
          { name: 'Messages', value: insights.totalMessages.toString(), inline: true },
          { name: 'Duration', value: `${insights.durationHours.toFixed(1)} hours`, inline: true },
          { name: 'Topics', value: insights.topicCount.toString(), inline: true },
          { name: 'Quality Score', value: `${insights.qualityScore.toFixed(1)}%`, inline: true }
        )
        .setColor(0x0099ff)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      await interaction.editReply('Failed to get thread information.');
    }
  }

  /**
   * Generate thread summary
   */
  private async handleSummaryThread(interaction: ChatInputCommandInteraction) {
    const threadId = interaction.options.getString('thread-id', true);
    const summaryType = interaction.options.getString('type') || 'detailed';

    await interaction.deferReply({ ephemeral: true });

    try {
      const summary = await this.summaryService.generateThreadSummary(threadId, {
        summaryType: summaryType as any,
        includeActionItems: true,
        includeDecisions: true,
        includeQuestions: true
      });

      if (!summary) {
        await interaction.editReply('Thread not found or could not generate summary.');
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('📝 Thread Summary')
        .setDescription(summary.summaryText)
        .addFields(
          { name: 'Messages', value: summary.messageCount.toString(), inline: true },
          { name: 'Key Points', value: summary.keyPoints.length.toString(), inline: true },
          { name: 'Topics', value: summary.topics.join(', ') || 'None', inline: false }
        )
        .setColor(0x00ff99)
        .setTimestamp();

      if (summary.actionItems.length > 0) {
        embed.addFields({
          name: 'Action Items',
          value: summary.actionItems.slice(0, 5).map(item => `• ${item}`).join('\n'),
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      await interaction.editReply('Failed to generate summary.');
    }
  }

  /**
   * Generate recent activity summary
   */
  private async handleSummaryRecent(interaction: ChatInputCommandInteraction) {
    const messageLimit = interaction.options.getInteger('messages') || 20;

    await interaction.deferReply({ ephemeral: true });

    try {
      const summary = await this.summaryService.generateQuickSummary(
        interaction.channelId,
        interaction.user.id,
        messageLimit
      );

      const embed = new EmbedBuilder()
        .setTitle('⚡ Recent Activity Summary')
        .setDescription(summary)
        .setColor(0xffff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      await interaction.editReply('Failed to generate recent activity summary.');
    }
  }
}
