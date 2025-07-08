/**
 * Memory Management Commands
 * Slash commands for user memory control and viewing
 */

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { UserMemoryService } from '../memory/user-memory.service.js';
import { logger } from '../utils/logger.js';

const userMemoryService = new UserMemoryService();

export const data = new SlashCommandBuilder()
  .setName('memory')
  .setDescription('Manage your personal memory settings')
  .addSubcommand(subcommand =>
    subcommand
      .setName('view')
      .setDescription('View your stored memories and preferences')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('delete')
      .setDescription('Delete specific memories')
      .addStringOption(option =>
        option
          .setName('types')
          .setDescription('Comma-separated list of memory types to delete (e.g., name,location)')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('clear')
      .setDescription('Clear all your stored memories')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('stats')
      .setDescription('View memory statistics')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('preferences')
      .setDescription('Update your preferences')
      .addStringOption(option =>
        option
          .setName('style')
          .setDescription('Communication style preference')
          .addChoices(
            { name: 'Formal', value: 'formal' },
            { name: 'Casual', value: 'casual' },
            { name: 'Technical', value: 'technical' }
          )
      )
      .addStringOption(option =>
        option
          .setName('level')
          .setDescription('Your experience level')
          .addChoices(
            { name: 'Beginner', value: 'beginner' },
            { name: 'Intermediate', value: 'intermediate' },
            { name: 'Expert', value: 'expert' }
          )
      )
      .addStringOption(option =>
        option
          .setName('length')
          .setDescription('Preferred response length')
          .addChoices(
            { name: 'Short', value: 'short' },
            { name: 'Medium', value: 'medium' },
            { name: 'Detailed', value: 'detailed' }
          )
      )
      .addBooleanOption(option =>
        option
          .setName('examples')
          .setDescription('Include code examples when relevant')
      )
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const subcommand = interaction.options.getSubcommand();
  const userId = interaction.user.id;
  const guildId = interaction.guild?.id;

  try {
    switch (subcommand) {
      case 'view':
        await handleViewMemories(interaction, userId, guildId);
        break;
      case 'delete':
        await handleDeleteMemories(interaction, userId, guildId);
        break;
      case 'clear':
        await handleClearMemories(interaction, userId, guildId);
        break;
      case 'stats':
        await handleMemoryStats(interaction, userId, guildId);
        break;
      case 'preferences':
        await handleUpdatePreferences(interaction, userId, guildId);
        break;
      default:
        await interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
  } catch (error) {
    logger.error('Memory command failed', {
      operation: 'memory-command',
      subcommand,
      userId,
      guildId,
      error: String(error)
    });

    await interaction.reply({
      content: 'An error occurred while processing your memory command.',
      ephemeral: true
    });
  }
}

async function handleViewMemories(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId?: string
): Promise<void> {
  const memory = await userMemoryService.getUserMemory(userId, guildId);
  
  if (!memory || memory.memoryCount === 0) {
    await interaction.reply({
      content: 'No memories stored yet. I\'ll learn about you as we chat!',
      ephemeral: true
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🧠 Your Personal Memory')
    .setColor(0x7289DA)
    .setDescription(memory.summary || 'Learning about you...')
    .setTimestamp(memory.lastUpdated);

  // Add memories field
  const memoriesText = Object.entries(memory.memories)
    .map(([key, value]) => `**${key}**: ${value}`)
    .join('\n') || 'None stored yet';

  if (memoriesText.length > 0) {
    embed.addFields({
      name: '📝 Stored Information',
      value: memoriesText.length > 1024 ? memoriesText.substring(0, 1021) + '...' : memoriesText,
      inline: false
    });
  }

  // Add preferences field
  if (memory.preferences && Object.keys(memory.preferences).length > 0) {
    const preferencesText = Object.entries(memory.preferences)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `**${key}**: ${value}`)
      .join('\n');

    if (preferencesText) {
      embed.addFields({
        name: '⚙️ Preferences',
        value: preferencesText,
        inline: false
      });
    }
  }

  embed.addFields({
    name: '📊 Statistics',
    value: `Memories: ${memory.memoryCount}\nTokens: ${memory.tokenCount}`,
    inline: true
  });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleDeleteMemories(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId?: string
): Promise<void> {
  const typesInput = interaction.options.getString('types', true);
  const memoryTypes = typesInput.split(',').map(type => type.trim());

  const success = await userMemoryService.deleteUserMemories(userId, memoryTypes, guildId);

  if (success) {
    await interaction.reply({
      content: `✅ Deleted memory types: ${memoryTypes.join(', ')}`,
      ephemeral: true
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to delete memories. They may not exist.',
      ephemeral: true
    });
  }
}

async function handleClearMemories(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId?: string
): Promise<void> {
  const success = await userMemoryService.deleteAllUserMemories(userId, guildId);

  if (success) {
    await interaction.reply({
      content: '✅ All memories cleared successfully.',
      ephemeral: true
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to clear memories or no memories exist.',
      ephemeral: true
    });
  }
}

async function handleMemoryStats(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId?: string
): Promise<void> {
  const stats = await userMemoryService.getUserMemoryStats(userId, guildId);

  if (!stats) {
    await interaction.reply({
      content: 'No memory statistics available.',
      ephemeral: true
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('📊 Memory Statistics')
    .setColor(0x7289DA)
    .addFields(
      { name: 'Total Memories', value: stats.memoryCount.toString(), inline: true },
      { name: 'Token Count', value: stats.tokenCount.toString(), inline: true },
      { name: 'Has Preferences', value: stats.hasPreferences ? 'Yes' : 'No', inline: true },
      { name: 'Memory Types', value: stats.memoryTypes.join(', ') || 'None', inline: false },
      { name: 'Last Updated', value: `<t:${Math.floor(stats.lastUpdated.getTime() / 1000)}:R>`, inline: false }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleUpdatePreferences(
  interaction: ChatInputCommandInteraction,
  userId: string,
  guildId?: string
): Promise<void> {
  const style = interaction.options.getString('style');
  const level = interaction.options.getString('level');
  const length = interaction.options.getString('length');
  const examples = interaction.options.getBoolean('examples');

  const preferences: Record<string, string | boolean> = {};
  if (style) preferences.communicationStyle = style;
  if (level) preferences.helpLevel = level;
  if (length) preferences.responseLength = length;
  if (examples !== null) preferences.includeExamples = examples;

  if (Object.keys(preferences).length === 0) {
    await interaction.reply({
      content: 'No preferences specified to update.',
      ephemeral: true
    });
    return;
  }

  const success = await userMemoryService.updateUserMemory(userId, {}, preferences, guildId);

  if (success) {
    const updatedText = Object.entries(preferences)
      .map(([key, value]) => `**${key}**: ${value}`)
      .join('\n');

    await interaction.reply({
      content: `✅ Preferences updated:\n${updatedText}`,
      ephemeral: true
    });
  } else {
    await interaction.reply({
      content: '❌ Failed to update preferences.',
      ephemeral: true
    });
  }
}
