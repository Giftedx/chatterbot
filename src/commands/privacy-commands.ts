/**
 * Privacy and Data Management Commands
 * Discord compliance commands for user privacy and data control
 */

import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  DMChannel
} from 'discord.js';
import { UserConsentService } from '../services/user-consent.service.js';
import { logger } from '../utils/logger.js';

const userConsentService = UserConsentService.getInstance();

export const privacyCommands = [
  // Main privacy information command
  {
    data: new SlashCommandBuilder()
      .setName('privacy')
      .setDescription('View privacy policy and data controls'),

    async execute(interaction: ChatInputCommandInteraction) {
      try {
        const userId = interaction.user.id;
        const consent = await userConsentService.getUserConsent(userId);

        const embed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('🔒 Privacy Policy & Data Controls')
          .setDescription('Your privacy is important to us. Here\'s how we handle your data:')
          .addFields(
            {
              name: '📊 What We Store',
              value: '• Conversation memories to provide personalized assistance\n• Usage preferences for better responses\n• Basic interaction analytics (anonymous)\n• Message history for context (limited time)',
              inline: false
            },
            {
              name: '🛡️ Your Rights',
              value: '• **View your data**: Use `/data-export` to download all your data\n• **Delete memories**: Use `/memories delete` for specific memories\n• **Opt out**: Use `/optout` to stop all data collection\n• **Complete deletion**: Use `/forget-me` to permanently delete everything',
              inline: false
            },
            {
              name: '⏰ Data Retention',
              value: `• Default retention: 90 days from last activity\n• You can modify this with \`/privacy-settings\`\n• Inactive accounts are automatically cleaned up`,
              inline: false
            },
            {
              name: '🔐 Security',
              value: '• All data encrypted at rest\n• No cross-server data sharing without consent\n• Secure deletion when requested\n• Regular security audits',
              inline: false
            }
          );

        if (consent) {
          embed.addFields({
            name: '📋 Your Current Status',
            value: [
              `✅ **Opted in**: ${consent.optedInAt?.toLocaleDateString() || 'Unknown'}`,
              `🔒 **Privacy accepted**: ${consent.privacyAccepted ? 'Yes' : 'No'}`,
              `💾 **Data storage**: ${consent.consentToStore ? 'Enabled' : 'Disabled'}`,
              `📈 **Analytics**: ${consent.consentToAnalyze ? 'Enabled' : 'Disabled'}`,
              `🎯 **Personalization**: ${consent.consentToPersonalize ? 'Enabled' : 'Disabled'}`,
              `⏱️ **Retention period**: ${consent.dataRetentionDays} days`,
              `📅 **Last activity**: ${consent.lastActivity.toLocaleDateString()}`
            ].join('\n'),
            inline: false
          });
        }

        embed.addFields({
          name: '📞 Contact',
          value: 'Questions about privacy? Contact the server administrators or check our [full privacy policy](https://example.com/privacy).',
          inline: false
        });

        const buttons = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('privacy_settings')
              .setLabel('Privacy Settings')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('⚙️'),
            new ButtonBuilder()
              .setCustomId('data_export')
              .setLabel('Export Data')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('📥'),
            new ButtonBuilder()
              .setCustomId('delete_data')
              .setLabel('Delete All Data')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('🗑️')
          );

        await interaction.reply({
          embeds: [embed],
          components: [buttons],
          ephemeral: true
        });

      } catch (error) {
        logger.error('Failed to execute privacy command', error);
        await interaction.reply({
          content: '❌ Failed to retrieve privacy information.',
          ephemeral: true
        });
      }
    }
  },

  // Opt out command
  {
    data: new SlashCommandBuilder()
      .setName('optout')
      .setDescription('Opt out of all bot interactions and data collection'),

    async execute(interaction: ChatInputCommandInteraction) {
      try {
        const userId = interaction.user.id;
        const success = await userConsentService.optOutUser(userId);

        if (success) {
          const embed = new EmbedBuilder()
            .setColor('#ff4444')
            .setTitle('❌ Opted Out Successfully')
            .setDescription('You have been opted out of all bot interactions.')
            .addFields(
              {
                name: 'What happens now?',
                value: '• The bot will no longer respond to your messages\n• No new data will be collected\n• Your existing data remains (use `/forget-me` to delete)\n• You can opt back in anytime with `/chat`',
                inline: false
              },
              {
                name: 'Data Management',
                value: 'Your existing data is preserved. Use `/data-export` to download it or `/forget-me` to permanently delete everything.',
                inline: false
              }
            )
            .setTimestamp();

          await interaction.reply({
            embeds: [embed],
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: '❌ Failed to opt out. Please try again or contact an administrator.',
            ephemeral: true
          });
        }

      } catch (error) {
        logger.error('Failed to execute optout command', error);
        await interaction.reply({
          content: '❌ An error occurred while opting out.',
          ephemeral: true
        });
      }
    }
  },

  // Pause command for temporary opt-out
  {
    data: new SlashCommandBuilder()
      .setName('pause')
      .setDescription('Temporarily pause bot interactions')
      .addIntegerOption(option =>
        option.setName('minutes')
          .setDescription('How long to pause (1-1440 minutes, default: 60)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(1440)
      ),

    async execute(interaction: ChatInputCommandInteraction) {
      try {
        const userId = interaction.user.id;
        const minutes = interaction.options.getInteger('minutes') ?? 60;
        
        const resumeAt = await userConsentService.pauseUser(userId, minutes);

        if (resumeAt) {
          const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('⏸️ Interactions Paused')
            .setDescription(`Bot interactions paused for ${minutes} minutes.`)
            .addFields(
              {
                name: 'Resume Time',
                value: `<t:${Math.floor(resumeAt.getTime() / 1000)}:F>`,
                inline: true
              },
              {
                name: 'Manual Resume',
                value: 'Use `/resume` to resume interactions early',
                inline: true
              }
            )
            .setTimestamp();

          await interaction.reply({
            embeds: [embed],
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: '❌ Failed to pause interactions. Please try again.',
            ephemeral: true
          });
        }

      } catch (error) {
        logger.error('Failed to execute pause command', error);
        await interaction.reply({
          content: '❌ An error occurred while pausing interactions.',
          ephemeral: true
        });
      }
    }
  },

  // Resume command
  {
    data: new SlashCommandBuilder()
      .setName('resume')
      .setDescription('Resume bot interactions (if paused)'),

    async execute(interaction: ChatInputCommandInteraction) {
      try {
        const userId = interaction.user.id;
        const success = await userConsentService.resumeUser(userId);

        if (success) {
          const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('▶️ Interactions Resumed')
            .setDescription('Bot interactions have been resumed.')
            .setTimestamp();

          await interaction.reply({
            embeds: [embed],
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: '❌ Failed to resume interactions or you were not paused.',
            ephemeral: true
          });
        }

      } catch (error) {
        logger.error('Failed to execute resume command', error);
        await interaction.reply({
          content: '❌ An error occurred while resuming interactions.',
          ephemeral: true
        });
      }
    }
  },

  // Data export command
  {
    data: new SlashCommandBuilder()
      .setName('data-export')
      .setDescription('Export all your data as JSON (sent via DM)'),

    async execute(interaction: ChatInputCommandInteraction) {
      try {
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;
        const exportData = await userConsentService.exportUserData(userId);

        if (!exportData) {
          await interaction.editReply({
            content: '❌ No data found to export or you are not opted in.'
          });
          return;
        }

        // Create DM channel and send data
        try {
          const dmChannel = await interaction.user.createDM();
          
          const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📥 Your Data Export')
            .setDescription('Here is all the data we have stored about you.')
            .addFields(
              {
                name: '📊 Export Summary',
                value: [
                  `**Memories**: ${exportData.memories.length} entries`,
                  `**Conversations**: ${exportData.conversations.length} messages`,
                  `**Analytics**: ${exportData.analytics.length} events`,
                  `**Export Date**: ${exportData.exportTimestamp.toISOString()}`,
                  `**Retention**: ${exportData.retentionInfo.dataRetentionDays} days`
                ].join('\n'),
                inline: false
              },
              {
                name: '🔒 Privacy Notice',
                value: 'This data export contains all information we have about you. Keep it secure and delete it when no longer needed.',
                inline: false
              }
            )
            .setTimestamp();

          // Split large data into chunks if necessary
          const jsonData = JSON.stringify(exportData, null, 2);
          const maxFileSize = 8 * 1024 * 1024; // 8MB Discord limit

          if (jsonData.length > maxFileSize) {
            // Split into multiple files
            const chunks = [];
            for (let i = 0; i < jsonData.length; i += maxFileSize) {
              chunks.push(jsonData.slice(i, i + maxFileSize));
            }

            await dmChannel.send({ embeds: [embed] });
            
            for (let i = 0; i < chunks.length; i++) {
              const buffer = Buffer.from(chunks[i], 'utf8');
              await dmChannel.send({
                content: `Data export part ${i + 1}/${chunks.length}:`,
                files: [{
                  attachment: buffer,
                  name: `data-export-part-${i + 1}.json`
                }]
              });
            }
          } else {
            const buffer = Buffer.from(jsonData, 'utf8');
            await dmChannel.send({
              embeds: [embed],
              files: [{
                attachment: buffer,
                name: `data-export-${new Date().toISOString().split('T')[0]}.json`
              }]
            });
          }

          await interaction.editReply({
            content: '✅ Your data export has been sent to your DMs. Check your direct messages.'
          });

        } catch (dmError) {
          logger.error('Failed to send DM with data export', dmError);
          await interaction.editReply({
            content: '❌ Failed to send data export via DM. Please ensure your DMs are open and try again.'
          });
        }

      } catch (error) {
        logger.error('Failed to execute data-export command', error);
        await interaction.editReply({
          content: '❌ Failed to export data. Please try again later.'
        });
      }
    }
  },

  // Forget me command (GDPR compliance)
  {
    data: new SlashCommandBuilder()
      .setName('forget-me')
      .setDescription('⚠️ Permanently delete ALL your data (irreversible)'),

    async execute(interaction: ChatInputCommandInteraction) {
      try {
        const userId = interaction.user.id;

        // Create confirmation modal
        const modal = new ModalBuilder()
          .setCustomId('forget_me_confirm')
          .setTitle('⚠️ Confirm Data Deletion');

        const confirmInput = new TextInputBuilder()
          .setCustomId('confirmation')
          .setLabel('Type "DELETE ALL MY DATA" to confirm')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50);

        const reasonInput = new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Reason for deletion (optional)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(500);

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(confirmInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
        );

        await interaction.showModal(modal);

      } catch (error) {
        logger.error('Failed to show forget-me modal', error);
        await interaction.reply({
          content: '❌ Failed to show confirmation dialog.',
          ephemeral: true
        });
      }
    }
  }
];

/**
 * Handle modal submissions for privacy commands
 */
export async function handlePrivacyModalSubmit(interaction: ModalSubmitInteraction) {
  if (interaction.customId === 'forget_me_confirm') {
    try {
      const confirmation = interaction.fields.getTextInputValue('confirmation');
      const reason = interaction.fields.getTextInputValue('reason');

      if (confirmation !== 'DELETE ALL MY DATA') {
        await interaction.reply({
          content: '❌ Confirmation text does not match. Data deletion cancelled.',
          ephemeral: true
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const userId = interaction.user.id;
      const success = await userConsentService.forgetUser(userId);

      if (success) {
        logger.info('User data permanently deleted via forget-me command', {
          operation: 'forget-me-command',
          userId,
          reason: reason || 'No reason provided'
        });

        await interaction.editReply({
          content: '✅ **All your data has been permanently deleted.**\n\nThis includes:\n• All conversation memories\n• All preferences and settings\n• All interaction history\n• All analytics data\n\nYou have been opted out and can opt back in anytime with `/chat` if desired.'
        });
      } else {
        await interaction.editReply({
          content: '❌ Failed to delete data. Please try again or contact an administrator.'
        });
      }

    } catch (error) {
      logger.error('Failed to handle forget-me confirmation', error);
      await interaction.editReply({
        content: '❌ An error occurred during data deletion.'
      });
    }
  }
}

/**
 * Handle button interactions for privacy commands
 */
export async function handlePrivacyButtonInteraction(interaction: any) {
  const userId = interaction.user.id;
  const username = interaction.user.username;

  switch (interaction.customId) {
    case 'privacy_consent_agree':
      // User agrees to privacy policy and wants to start using the bot
      try {
        await interaction.deferReply({ ephemeral: true });
        
        const success = await userConsentService.optInUser(userId, username, {
          consentToStore: true,
          consentToAnalyze: false, // Default to conservative settings
          consentToPersonalize: false
        });

        if (success) {
          const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Welcome aboard!')
            .setDescription('You\'ve successfully opted in. Here\'s what happens next:')
            .addFields(
              {
                name: '💬 How to Chat',
                value: '• Use `/chat <your message>` to start conversations\n• After first use, I\'ll respond to your normal messages\n• Future conversations will happen in dedicated threads to keep channels clean',
                inline: false
              },
              {
                name: '🛠️ Privacy Controls',
                value: '• `/privacy` - View and manage your privacy settings\n• `/pause [minutes]` - Temporarily pause interactions\n• `/optout` - Stop all interactions\n• `/data-export` - Download your data\n• `/forget-me` - Delete all your data',
                inline: false
              },
              {
                name: '📋 Your Current Settings',
                value: '• **Data storage**: Enabled (memories and preferences)\n• **Analytics**: Disabled (you can enable in `/privacy`)\n• **Personalization**: Disabled (you can enable in `/privacy`)\n• **Retention**: 90 days from last activity',
                inline: false
              }
            )
            .setFooter({ text: 'You can change these settings anytime with /privacy' })
            .setTimestamp();

          await interaction.editReply({
            embeds: [embed]
          });
        } else {
          await interaction.editReply({
            content: '❌ Failed to complete opt-in. Please try again.'
          });
        }
      } catch (error) {
        logger.error('Failed to handle privacy consent agreement', error);
        await interaction.editReply({
          content: '❌ An error occurred during opt-in.'
        });
      }
      break;

    case 'privacy_consent_decline':
      // User declines to use the bot
      await interaction.reply({
        content: '👋 No problem! You can always use `/chat` later if you change your mind. Your privacy is important to us.',
        ephemeral: true
      });
      break;

    case 'privacy_settings':
      // This would open a settings modal - simplified for now
      await interaction.reply({
        content: '⚙️ Privacy settings are currently managed via commands. Use `/pause`, `/optout`, or `/privacy` for controls.',
        ephemeral: true
      });
      break;

    case 'data_export':
      await interaction.deferReply({ ephemeral: true });
      const exportData = await userConsentService.exportUserData(userId);
      
      if (exportData) {
        try {
          const dmChannel = await interaction.user.createDM();
          const jsonData = JSON.stringify(exportData, null, 2);
          const buffer = Buffer.from(jsonData, 'utf8');
          
          await dmChannel.send({
            content: '📥 Your requested data export:',
            files: [{
              attachment: buffer,
              name: `data-export-${new Date().toISOString().split('T')[0]}.json`
            }]
          });

          await interaction.editReply({
            content: '✅ Data export sent to your DMs.'
          });
        } catch (error) {
          await interaction.editReply({
            content: '❌ Failed to send data export. Please ensure your DMs are open.'
          });
        }
      } else {
        await interaction.editReply({
          content: '❌ No data found to export.'
        });
      }
      break;

    case 'delete_data':
      // Show the same modal as /forget-me
      const modal = new ModalBuilder()
        .setCustomId('forget_me_confirm')
        .setTitle('⚠️ Confirm Data Deletion');

      const confirmInput = new TextInputBuilder()
        .setCustomId('confirmation')
        .setLabel('Type "DELETE ALL MY DATA" to confirm')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(confirmInput)
      );

      await interaction.showModal(modal);
      break;
  }
}