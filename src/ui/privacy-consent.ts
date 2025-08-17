/**
 * Privacy Consent Modal and UI Components
 * Handles Discord consent flows and privacy modals
 */

import { 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder, 
  EmbedBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';

export function createPrivacyConsentModal(): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId('privacy_consent_modal')
    .setTitle('🔒 Privacy & Data Consent');

  const consentInput = new TextInputBuilder()
    .setCustomId('consent_agreement')
    .setLabel('Type "I AGREE" to accept our privacy policy')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(20);

  const dataPrefsInput = new TextInputBuilder()
    .setCustomId('data_preferences')
    .setLabel('Data preferences (optional)')
    .setPlaceholder('e.g., "store memories: yes, analytics: no"')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(consentInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(dataPrefsInput)
  );

  return modal;
}

export function createPrivacyConsentEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('🔒 Welcome! Let\'s talk about your privacy')
    .setDescription('Before we start chatting, here\'s what you should know about how we handle your data:')
    .addFields(
      {
        name: '📊 What We Store',
        value: '• **Conversation memories** - To provide personalized assistance\n• **Basic preferences** - Response style, topics of interest\n• **Usage patterns** - Anonymous analytics to improve the bot\n• **Message history** - Limited context for better responses',
        inline: false
      },
      {
        name: '🛡️ Your Rights & Controls',
        value: '• **View your data** - Use `/data-export` anytime\n• **Delete specific memories** - Use `/memories delete`\n• **Opt out completely** - Use `/optout` or `/forget-me`\n• **Pause temporarily** - Use `/pause [minutes]`\n• **Update preferences** - Use `/privacy`',
        inline: false
      },
      {
        name: '⏰ Data Retention',
        value: '• **Default**: 90 days from last activity\n• **Automatic cleanup** of old, unused data\n• **No cross-server sharing** without your consent\n• **Secure deletion** when you request it',
        inline: false
      },
      {
        name: '🔐 Security & Privacy',
        value: '• **Encrypted storage** - All data encrypted at rest\n• **No selling** - We never sell your data\n• **Minimal collection** - We only store what\'s needed\n• **Your control** - You can delete everything anytime',
        inline: false
      }
    )
    .addFields({
      name: '📋 To Continue',
      value: 'Click **"Agree & Start"** below to accept our privacy policy and start using the bot. You can change your mind anytime using the privacy commands listed above.',
      inline: false
    })
    .setFooter({ 
      text: 'Full privacy policy available at /privacy • By continuing, you agree to our data practices' 
    })
    .setTimestamp();
}

export function createPrivacyConsentButtons(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('privacy_consent_agree')
        .setLabel('Agree & Start')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId('privacy_consent_decline')
        .setLabel('Not Now')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌'),
      new ButtonBuilder()
        .setLabel('Full Privacy Policy')
        .setStyle((ButtonStyle as any).Link ?? 5)
        .setURL('https://github.com/Giftedx/chatterbot/blob/main/PRIVACY.md')
    );
}

export function createThreadBasedResponseEmbed(threadId: string, threadName: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('🧵 Thread Created for Our Conversation')
    .setDescription('To keep the main channel clean, I\'ve created a dedicated thread for our conversation!')
    .addFields(
      {
        name: '📍 Your Thread',
        value: `<#${threadId}> - **${threadName}**`,
        inline: false
      },
      {
        name: '💬 How It Works',
        value: '• All our future conversations will happen in this thread\n• You can ask questions normally - no need for `/chat`\n• Other members won\'t see our conversation in the main channel\n• You can always use privacy commands like `/pause` or `/optout`',
        inline: false
      }
    )
    .setTimestamp();
}