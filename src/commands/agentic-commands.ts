/**
 * Agentic Discord Commands
 * Slash commands for agentic intelligence features
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember, PermissionsBitField } from 'discord.js';
import { agenticIntelligenceService } from '../services/agentic-intelligence.service.js';
import { knowledgeBaseService } from '../services/knowledge-base.service.js';
import { escalationService } from '../services/escalation.service.js';
import { logger } from '../utils/logger.js';

export const agenticCommands = [
  // Knowledge Base Commands
  {
    data: new SlashCommandBuilder()
      .setName('learn')
      .setDescription('Add knowledge to the AI system')
      .addStringOption(option =>
        option.setName('question')
          .setDescription('The question or topic')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('answer')
          .setDescription('The answer or information')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('tags')
          .setDescription('Comma-separated tags (optional)')
          .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
      try {
        await interaction.deferReply();

        const question = interaction.options.getString('question', true);
        const answer = interaction.options.getString('answer', true);
        const tags = interaction.options.getString('tags')?.split(',').map(t => t.trim()) || [];

        // Check if user has permission to add knowledge
        const member = interaction.member as GuildMember;
        if (!member || !member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
          await interaction.editReply('❌ You need "Manage Messages" permission to add knowledge.');
          return;
        }

        await knowledgeBaseService.addFAQ(question, answer, tags);

        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('✅ Knowledge Added')
          .setDescription('The AI system has learned new information!')
          .addFields(
            { name: 'Question', value: question, inline: false },
            { name: 'Answer', value: answer.substring(0, 1000), inline: false },
            { name: 'Tags', value: tags.length > 0 ? tags.join(', ') : 'None', inline: true },
            { name: 'Added by', value: interaction.user.username, inline: true }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        logger.error('Failed to execute learn command', error);
        await interaction.editReply('❌ Failed to add knowledge. Please try again.');
      }
    }
  },

  {
    data: new SlashCommandBuilder()
      .setName('knowledge')
      .setDescription('Search the knowledge base')
      .addStringOption(option =>
        option.setName('query')
          .setDescription('What to search for')
          .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
      try {
        await interaction.deferReply();

        const query = interaction.options.getString('query', true);
        const results = await knowledgeBaseService.search({
          query,
          limit: 5
        });

        if (results.length === 0) {
          await interaction.editReply('❌ No knowledge found for that query.');
          return;
        }

        const embed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('🔍 Knowledge Search Results')
          .setDescription(`Found ${results.length} relevant entries for "${query}"`);

        results.forEach((entry, index) => {
          embed.addFields({
            name: `Entry ${index + 1} (${entry.source})`,
            value: `${entry.content.substring(0, 200)}...\n**Confidence:** ${Math.round(entry.confidence * 100)}%`,
            inline: false
          });
        });

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        logger.error('Failed to execute knowledge command', error);
        await interaction.editReply('❌ Failed to search knowledge base.');
      }
    }
  },

  // Escalation Commands
  {
    data: new SlashCommandBuilder()
      .setName('escalate')
      .setDescription('Manually escalate a query to moderators')
      .addStringOption(option =>
        option.setName('query')
          .setDescription('The query to escalate')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('reason')
          .setDescription('Reason for escalation')
          .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
      try {
        await interaction.deferReply();

        const query = interaction.options.getString('query', true);
        const reason = interaction.options.getString('reason') || 'Manual escalation';

        const ticket = await escalationService.createEscalationTicket(
          query,
          interaction.user.id,
          interaction.channelId,
          reason,
          'medium',
          {
            userRole: (interaction.member as GuildMember)?.roles?.highest?.name || 'user'
          }
        );

        const embed = new EmbedBuilder()
          .setColor('#ff9900')
          .setTitle('🚨 Escalation Created')
          .setDescription('Your query has been escalated to moderators.')
          .addFields(
            { name: 'Query', value: query, inline: false },
            { name: 'Reason', value: reason, inline: true },
            { name: 'Ticket ID', value: ticket.id, inline: true },
            { name: 'Status', value: 'Open', inline: true }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        logger.error('Failed to execute escalate command', error);
        await interaction.editReply('❌ Failed to create escalation ticket.');
      }
    }
  },

  // Analytics Commands
  {
    data: new SlashCommandBuilder()
      .setName('agentic-stats')
      .setDescription('View agentic intelligence statistics'),

    async execute(interaction: ChatInputCommandInteraction) {
      try {
        await interaction.deferReply();

        // Check if user has permission to view stats
        const member = interaction.member as GuildMember;
        if (!member || !member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
          await interaction.editReply('❌ You need "Manage Server" permission to view statistics.');
          return;
        }

        const stats = await agenticIntelligenceService.getStats();

        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('📊 Agentic Intelligence Statistics')
          .addFields(
            { 
              name: 'Knowledge Base', 
              value: `Total entries: ${stats.knowledgeBase.totalEntries || 0}\nRecent additions: ${stats.knowledgeBase.recentAdditions || 0}\nAvg confidence: ${Math.round((stats.knowledgeBase.averageConfidence || 0) * 100)}%`, 
              inline: true 
            },
            { 
              name: 'Smart Flagging', 
              value: `Total analyzed: ${stats.flagging.totalAnalyzed || 0}\nFlagged: ${stats.flagging.flaggedCount || 0}\nFlag rate: ${Math.round((stats.flagging.flagRate || 0) * 100)}%`, 
              inline: true 
            },
            { 
              name: 'Citations', 
              value: `Total citations: ${stats.citations.totalCitations || 0}\nRecent citations: ${stats.citations.recentCitations || 0}\nAvg confidence: ${Math.round((stats.citations.averageConfidence || 0) * 100)}%`, 
              inline: true 
            },
            { 
              name: 'Escalations', 
              value: `Total tickets: ${stats.escalation.totalTickets || 0}\nOpen tickets: ${stats.escalation.openTickets || 0}\nResolved: ${stats.escalation.resolvedTickets || 0}`, 
              inline: true 
            }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        logger.error('Failed to execute agentic-stats command', error);
        await interaction.editReply('❌ Failed to retrieve statistics.');
      }
    }
  },

  // Configuration Commands
  {
    data: new SlashCommandBuilder()
      .setName('agentic-config')
      .setDescription('Configure agentic intelligence settings')
      .addBooleanOption(option =>
        option.setName('enable_escalation')
          .setDescription('Enable automatic escalation')
          .setRequired(false))
      .addNumberOption(option =>
        option.setName('confidence_threshold')
          .setDescription('Minimum confidence threshold (0-1)')
          .setRequired(false)
          .setMinValue(0)
          .setMaxValue(1)),

    async execute(interaction: ChatInputCommandInteraction) {
      try {
        await interaction.deferReply();

        // Check if user has permission to configure
        const member = interaction.member as GuildMember;
        if (!member || !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          await interaction.editReply('❌ You need Administrator permission to configure settings.');
          return;
        }

        const enableEscalation = interaction.options.getBoolean('enable_escalation');
        const confidenceThreshold = interaction.options.getNumber('confidence_threshold');

        const config: { enableAutoEscalation?: boolean; escalationThreshold?: number } = {};
        if (enableEscalation !== null) config.enableAutoEscalation = enableEscalation;
        if (confidenceThreshold !== null) config.escalationThreshold = confidenceThreshold;

        if (Object.keys(config).length > 0) {
          agenticIntelligenceService.updateEscalationConfig(config);
        }

        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('⚙️ Configuration Updated')
          .setDescription('Agentic intelligence settings have been updated.')
          .addFields(
            { name: 'Auto Escalation', value: enableEscalation !== null ? (enableEscalation ? 'Enabled' : 'Disabled') : 'No change', inline: true },
            { name: 'Confidence Threshold', value: confidenceThreshold !== null ? confidenceThreshold.toString() : 'No change', inline: true }
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        logger.error('Failed to execute agentic-config command', error);
        await interaction.editReply('❌ Failed to update configuration.');
      }
    }
  },

  // Help Command
  {
    data: new SlashCommandBuilder()
      .setName('agentic-help')
      .setDescription('Get help with agentic intelligence features'),

    async execute(interaction: ChatInputCommandInteraction) {
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🤖 Agentic Intelligence Help')
        .setDescription('Your Discord bot now has enterprise-grade AI capabilities!')
        .addFields(
          { 
            name: '📚 Knowledge Management', 
            value: '`/learn` - Add knowledge to the AI system\n`/knowledge` - Search the knowledge base', 
            inline: false 
          },
          { 
            name: '🚨 Escalation', 
            value: '`/escalate` - Manually escalate a query to moderators', 
            inline: false 
          },
          { 
            name: '📊 Analytics', 
            value: '`/agentic-stats` - View system statistics and performance', 
            inline: false 
          },
          { 
            name: '⚙️ Configuration', 
            value: '`/agentic-config` - Configure AI behavior and thresholds', 
            inline: false 
          }
        )
        .addFields(
          { 
            name: '🔍 Features', 
            value: '• **Zero-hallucination**: Responses are grounded in trusted knowledge\n• **Smart flagging**: Automatically detects uncertain responses\n• **Source citations**: Every answer cites its sources\n• **Intelligent escalation**: Routes complex queries to humans\n• **Continuous learning**: Improves from moderator interactions', 
            inline: false 
          }
        )
        .setFooter({ text: 'Powered by Agentic AI - Enterprise-grade Discord intelligence' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  }
]; 