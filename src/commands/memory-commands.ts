/**
 * Memory Management Commands
 * Commands for users to view and manage their stored memories
 */

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder
} from 'discord.js';
import { UserMemoryService } from '../memory/user-memory.service.js';
import { UserConsentService } from '../services/user-consent.service.js';
import { logger } from '../utils/logger.js';

const userMemoryService = new UserMemoryService();
const userConsentService = UserConsentService.getInstance();

export const memoryCommands = [
  {
    data: new SlashCommandBuilder()
      .setName('memories')
      .setDescription('Manage your stored memories')
      .addSubcommand(subcommand =>
        subcommand
          .setName('view')
          .setDescription('View your stored memories')
          .addStringOption(option =>
            option.setName('type')
              .setDescription('Type of memories to view')
              .setRequired(false)
              .addChoices(
                { name: 'All memories', value: 'all' },
                { name: 'Preferences', value: 'preferences' },
                { name: 'Personal info', value: 'personal' },
                { name: 'Projects', value: 'projects' }
              )
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('delete')
          .setDescription('Delete specific memories')
          .addStringOption(option =>
            option.setName('type')
              .setDescription('Type of memories to delete')
              .setRequired(true)
              .addChoices(
                { name: 'All memories', value: 'all' },
                { name: 'Preferences only', value: 'preferences' },
                { name: 'Personal info only', value: 'personal' },
                { name: 'Projects only', value: 'projects' }
              )
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('stats')
          .setDescription('View memory statistics')
      ),

    async execute(interaction: ChatInputCommandInteraction) {
      try {
        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        // Check if user is opted in
        const isOptedIn = await userConsentService.isUserOptedIn(userId);
        if (!isOptedIn) {
          await interaction.reply({
            content: '❌ You need to opt in with `/chat` first to manage memories.',
            ephemeral: true
          });
          return;
        }

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
          case 'view':
            await handleViewMemories(interaction, userId, guildId);
            break;
          case 'delete':
            await handleDeleteMemories(interaction, userId, guildId);
            break;
          case 'stats':
            await handleMemoryStats(interaction, userId, guildId);
            break;
          default:
            await interaction.reply({
              content: '❌ Unknown subcommand.',
              ephemeral: true
            });
        }

      } catch (error) {
        logger.error('Failed to execute memories command', error);
        await interaction.reply({
          content: '❌ An error occurred while managing memories.',
          ephemeral: true
        });
      }
    }
  }
];

async function handleViewMemories(
  interaction: ChatInputCommandInteraction, 
  userId: string, 
  guildId: string | null
) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const type = interaction.options.getString('type') || 'all';
    const userMemory = await userMemoryService.getUserMemory(userId, guildId || undefined);

    if (!userMemory || userMemory.memoryCount === 0) {
      await interaction.editReply({
        content: '📝 No memories stored yet. Chat with me more to build up your memory profile!'
      });
      return;
    }

    const memories = userMemory.memories;
    const preferences = userMemory.preferences || {};

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🧠 Your Stored Memories')
      .setTimestamp();

    switch (type) {
      case 'all':
        // Show summary of all memories
        const memoryFields = [];
        
        if (memories.name) memoryFields.push(`**Name**: ${memories.name}`);
        if (memories.role) memoryFields.push(`**Role**: ${memories.role}`);
        if (memories.location) memoryFields.push(`**Location**: ${memories.location}`);
        if (memories.programmingLanguages) memoryFields.push(`**Languages**: ${memories.programmingLanguages}`);
        if (memories.currentProject) memoryFields.push(`**Current project**: ${memories.currentProject}`);
        if (memories.learningGoals) memoryFields.push(`**Learning goals**: ${memories.learningGoals}`);

        if (memoryFields.length > 0) {
          embed.addFields({
            name: '👤 Personal Information',
            value: memoryFields.join('\n'),
            inline: false
          });
        }

        const prefFields = [];
        if (preferences.communicationStyle) prefFields.push(`**Communication style**: ${preferences.communicationStyle}`);
        if (preferences.helpLevel) prefFields.push(`**Help level**: ${preferences.helpLevel}`);
        if (preferences.responseLength) prefFields.push(`**Response length**: ${preferences.responseLength}`);
        if (preferences.includeExamples) prefFields.push(`**Include examples**: ${preferences.includeExamples ? 'Yes' : 'No'}`);

        if (prefFields.length > 0) {
          embed.addFields({
            name: '⚙️ Preferences',
            value: prefFields.join('\n'),
            inline: false
          });
        }
        break;

      case 'preferences':
        const allPrefs = Object.entries(preferences).map(([key, value]) => `**${key}**: ${value}`);
        embed.addFields({
          name: '⚙️ Your Preferences',
          value: allPrefs.length > 0 ? allPrefs.join('\n') : 'No preferences stored',
          inline: false
        });
        break;

      case 'personal':
        const personalInfo = [
          memories.name && `**Name**: ${memories.name}`,
          memories.role && `**Role**: ${memories.role}`,
          memories.location && `**Location**: ${memories.location}`,
        ].filter(Boolean);
        
        embed.addFields({
          name: '👤 Personal Information',
          value: personalInfo.length > 0 ? personalInfo.join('\n') : 'No personal information stored',
          inline: false
        });
        break;

      case 'projects':
        const projectInfo = [
          memories.programmingLanguages && `**Languages**: ${memories.programmingLanguages}`,
          memories.currentProject && `**Current project**: ${memories.currentProject}`,
          memories.learningGoals && `**Learning goals**: ${memories.learningGoals}`,
        ].filter(Boolean);
        
        embed.addFields({
          name: '💼 Projects & Learning',
          value: projectInfo.length > 0 ? projectInfo.join('\n') : 'No project information stored',
          inline: false
        });
        break;
    }

    embed.addFields({
      name: '📊 Memory Stats',
      value: [
        `**Total memories**: ${userMemory.memoryCount}`,
        `**Last updated**: ${userMemory.lastUpdated.toLocaleDateString()}`,
        `**Storage used**: ~${userMemory.tokenCount} tokens`
      ].join('\n'),
      inline: false
    });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    logger.error('Failed to view memories', error);
    await interaction.editReply({
      content: '❌ Failed to retrieve memories.'
    });
  }
}

async function handleDeleteMemories(
  interaction: ChatInputCommandInteraction, 
  userId: string, 
  guildId: string | null
) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const type = interaction.options.getString('type', true);
    
    let typesToDelete: string[] = [];
    let description = '';

    switch (type) {
      case 'all':
        const success = await userMemoryService.deleteAllUserMemories(userId, guildId || undefined);
        if (success) {
          await interaction.editReply({
            content: '✅ All memories have been deleted successfully.'
          });
        } else {
          await interaction.editReply({
            content: '❌ Failed to delete memories.'
          });
        }
        return;

      case 'preferences':
        typesToDelete = ['communicationStyle', 'helpLevel', 'responseLength', 'includeExamples'];
        description = 'preferences';
        break;

      case 'personal':
        typesToDelete = ['name', 'role', 'location'];
        description = 'personal information';
        break;

      case 'projects':
        typesToDelete = ['programmingLanguages', 'currentProject', 'learningGoals'];
        description = 'project and learning information';
        break;

      default:
        await interaction.editReply({
          content: '❌ Invalid memory type specified.'
        });
        return;
    }

    const success = await userMemoryService.deleteUserMemories(userId, typesToDelete, guildId || undefined);
    
    if (success) {
      await interaction.editReply({
        content: `✅ Successfully deleted ${description}.`
      });
    } else {
      await interaction.editReply({
        content: `❌ Failed to delete ${description}.`
      });
    }

  } catch (error) {
    logger.error('Failed to delete memories', error);
    await interaction.editReply({
      content: '❌ Failed to delete memories.'
    });
  }
}

async function handleMemoryStats(
  interaction: ChatInputCommandInteraction, 
  userId: string, 
  guildId: string | null
) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const stats = await userMemoryService.getUserMemoryStats(userId, guildId || undefined);
    
    if (!stats) {
      await interaction.editReply({
        content: '📊 No memory data found. Start chatting to build your memory profile!'
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📊 Memory Statistics')
      .addFields(
        {
          name: '💾 Storage Overview',
          value: [
            `**Total memories**: ${stats.memoryCount}`,
            `**Token usage**: ${stats.tokenCount} tokens`,
            `**Memory types**: ${stats.memoryTypes.length}`,
            `**Has preferences**: ${stats.hasPreferences ? 'Yes' : 'No'}`
          ].join('\n'),
          inline: true
        },
        {
          name: '⏰ Activity',
          value: [
            `**Last updated**: ${stats.lastUpdated.toLocaleDateString()}`,
            `**Profile age**: ${Math.floor((Date.now() - stats.lastUpdated.getTime()) / (1000 * 60 * 60 * 24))} days`
          ].join('\n'),
          inline: true
        },
        {
          name: '📝 Memory Types Stored',
          value: stats.memoryTypes.length > 0 ? stats.memoryTypes.join(', ') : 'None',
          inline: false
        },
        {
          name: '📋 Summary',
          value: stats.summary || 'No summary available',
          inline: false
        }
      )
      .setFooter({ text: 'Use /memories view to see detailed memory contents' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    logger.error('Failed to get memory stats', error);
    await interaction.editReply({
      content: '❌ Failed to retrieve memory statistics.'
    });
  }
}