/**
 * Advanced Moderation Commands
 * Slash commands for managing moderation configuration and viewing stats
 */

import {
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { moderationConfigService, moderationIncidentService } from '../moderation/moderation-service';
import { logger } from '../utils/logger';

/**
 * Build moderation command with subcommands
 */
export function buildModerationCommand(): SlashCommandSubcommandsOnlyBuilder {
  return new SlashCommandBuilder()
    .setName('moderation')
    .setDescription('Advanced moderation system management (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('config')
        .setDescription('View or update moderation configuration')
        .addStringOption(option =>
          option
            .setName('strictness')
            .setDescription('Set moderation strictness level')
            .addChoices(
              { name: 'Low (minimal filtering)', value: 'low' },
              { name: 'Medium (balanced)', value: 'medium' },
              { name: 'High (strict filtering)', value: 'high' }
            )
            .setRequired(false)
        )
        .addChannelOption(option =>
          option
            .setName('log_channel')
            .setDescription('Channel for moderation logs')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('auto_delete')
            .setDescription('Automatically delete unsafe content')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View moderation statistics')
        .addIntegerOption(option =>
          option
            .setName('days')
            .setDescription('Number of days to analyze (default: 30)')
            .setMinValue(1)
            .setMaxValue(90)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('test')
        .setDescription('Test moderation system')
        .addStringOption(option =>
          option
            .setName('content')
            .setDescription('Content to test (text)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Type of content to test')
            .addChoices(
              { name: 'Text', value: 'text' },
              { name: 'Image URL', value: 'image' }
            )
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('features')
        .setDescription('Enable/disable moderation features')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Reset moderation configuration to defaults')
    );
}

/**
 * Handle moderation command interactions
 */
export async function handleModerationCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({ content: '❌ This command can only be used in servers.', ephemeral: true });
    return;
  }

  // Check permissions
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: '🚫 You need Manage Server permissions to use this command.', ephemeral: true });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  try {
    switch (subcommand) {
      case 'config':
        await handleConfigSubcommand(interaction, guildId);
        break;
      case 'stats':
        await handleStatsSubcommand(interaction, guildId);
        break;
      case 'test':
        await handleTestSubcommand(interaction, guildId);
        break;
      case 'features':
        await handleFeaturesSubcommand(interaction, guildId);
        break;
      case 'reset':
        await handleResetSubcommand(interaction);
        break;
      default:
        await interaction.reply({ content: '❌ Unknown subcommand.', ephemeral: true });
    }
  } catch (error) {
    logger.error('Moderation command error', {
      operation: 'moderation-command',
      guildId,
      userId: interaction.user.id,
      metadata: { 
        subcommand,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    const errorMessage = '❌ An error occurred while processing the moderation command.';
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}

/**
 * Handle config subcommand
 */
async function handleConfigSubcommand(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const strictness = interaction.options.getString('strictness') as 'low' | 'medium' | 'high' | null;
  const logChannel = interaction.options.getChannel('log_channel');
  const autoDelete = interaction.options.getBoolean('auto_delete');

  // If no options provided, show current config
  if (!strictness && !logChannel && autoDelete === null) {
    const config = await moderationConfigService.getConfig(guildId);
    
    const embed = new EmbedBuilder()
      .setTitle('🛡️ Moderation Configuration')
      .setColor(0x2f3136)
      .addFields(
        { name: 'Strictness Level', value: config.strictnessLevel, inline: true },
        { name: 'Auto Delete Unsafe', value: config.autoDeleteUnsafe ? 'Yes' : 'No', inline: true },
        { name: 'Log Channel', value: config.logChannelId ? `<#${config.logChannelId}>` : 'Not set', inline: true },
        { name: 'Enabled Features', value: config.enabledFeatures.join(', '), inline: true },
        { name: 'Custom Keywords', value: config.customKeywords?.length ? `${config.customKeywords.length} keywords` : 'None', inline: true }
      )
      .setFooter({ text: 'Use /moderation config with options to update settings' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  // Update configuration
  const updates: Record<string, unknown> = {};
  if (strictness) updates.strictnessLevel = strictness;
  if (logChannel) updates.logChannelId = logChannel.id;
  if (autoDelete !== null) updates.autoDeleteUnsafe = autoDelete;

  await moderationConfigService.updateConfig(guildId, updates);

  const embed = new EmbedBuilder()
    .setTitle('✅ Moderation Configuration Updated')
    .setColor(0x00ff00)
    .setDescription('The moderation configuration has been successfully updated.')
    .addFields(
      ...Object.entries(updates).map(([key, value]) => ({
        name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        value: String(value),
        inline: true
      }))
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Handle stats subcommand
 */
async function handleStatsSubcommand(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const days = interaction.options.getInteger('days') || 30;
  const stats = await moderationIncidentService.getStats(guildId, days);

  const embed = new EmbedBuilder()
    .setTitle('📊 Moderation Statistics')
    .setColor(0x5865f2)
    .addFields(
      { name: 'Total Incidents', value: stats.totalIncidents.toString(), inline: true },
      { name: 'Incidents Today', value: stats.incidentsToday.toString(), inline: true },
      { name: 'Time Period', value: `${days} days`, inline: true }
    );

  // Add incidents by type
  if (Object.keys(stats.incidentsByType).length > 0) {
    const typeStats = Object.entries(stats.incidentsByType)
      .map(([type, count]) => `${type}: ${count}`)
      .join('\n');
    embed.addFields({ name: 'By Type', value: typeStats, inline: true });
  }

  // Add incidents by severity
  if (Object.keys(stats.incidentsBySeverity).length > 0) {
    const severityStats = Object.entries(stats.incidentsBySeverity)
      .map(([severity, count]) => `${severity}: ${count}`)
      .join('\n');
    embed.addFields({ name: 'By Severity', value: severityStats, inline: true });
  }

  // Add top users
  if (stats.topUsers.length > 0) {
    const topUsers = stats.topUsers.slice(0, 5)
      .map(({ userId, count }) => `<@${userId}>: ${count}`)
      .join('\n');
    embed.addFields({ name: 'Most Flagged Users', value: topUsers, inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

/**
 * Handle test subcommand
 */
async function handleTestSubcommand(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const content = interaction.options.getString('content', true);
  const type = interaction.options.getString('type') as 'text' | 'image' || 'text';

  // Import moderation service here to avoid circular imports
  const { moderationService } = await import('../moderation/moderation-service');

  const context = {
    guildId,
    userId: interaction.user.id,
    channelId: interaction.channelId
  };

  const result = await moderationService.testModeration(content, type, context);

  const embed = new EmbedBuilder()
    .setTitle('🧪 Moderation Test Result')
    .setColor(result.verdict.safe ? 0x00ff00 : 0xff0000)
    .addFields(
      { name: 'Content Type', value: type, inline: true },
      { name: 'Safe', value: result.verdict.safe ? 'Yes' : 'No', inline: true },
      { name: 'Action', value: result.action, inline: true }
    );

  if (result.verdict.reason) {
    embed.addFields({ name: 'Reason', value: result.verdict.reason, inline: false });
  }

  if (result.verdict.confidence) {
    embed.addFields({ name: 'Confidence', value: `${Math.round(result.verdict.confidence * 100)}%`, inline: true });
  }

  if (result.verdict.severity) {
    embed.addFields({ name: 'Severity', value: result.verdict.severity, inline: true });
  }

  if (result.verdict.categories) {
    embed.addFields({ name: 'Categories', value: result.verdict.categories.join(', '), inline: true });
  }

  await interaction.editReply({ embeds: [embed] });
}

/**
 * Handle features subcommand
 */
async function handleFeaturesSubcommand(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const config = await moderationConfigService.getConfig(guildId);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('moderation_features')
    .setPlaceholder('Select features to enable/disable')
    .setMinValues(0)
    .setMaxValues(3)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Text Moderation')
        .setDescription('Filter unsafe text content')
        .setValue('text')
        .setDefault(config.enabledFeatures.includes('text')),
      new StringSelectMenuOptionBuilder()
        .setLabel('Image Moderation')
        .setDescription('Filter unsafe images')
        .setValue('image')
        .setDefault(config.enabledFeatures.includes('image')),
      new StringSelectMenuOptionBuilder()
        .setLabel('Attachment Moderation')
        .setDescription('Filter unsafe file attachments')
        .setValue('attachment')
        .setDefault(config.enabledFeatures.includes('attachment'))
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const embed = new EmbedBuilder()
    .setTitle('🔧 Moderation Features')
    .setDescription('Select which moderation features to enable for this server.')
    .setColor(0x5865f2)
    .addFields(
      { name: 'Current Features', value: config.enabledFeatures.join(', ') || 'None', inline: false }
    );

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

/**
 * Handle reset subcommand
 */
async function handleResetSubcommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const confirmButton = new ButtonBuilder()
    .setCustomId('confirm_reset')
    .setLabel('Confirm Reset')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId('cancel_reset')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

  const embed = new EmbedBuilder()
    .setTitle('⚠️ Reset Moderation Configuration')
    .setDescription('This will reset all moderation settings to defaults. This action cannot be undone.')
    .setColor(0xff9900);

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}
