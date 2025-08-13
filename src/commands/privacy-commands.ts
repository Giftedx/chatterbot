import { SlashCommandBuilder } from 'discord.js';
import { createPrivacyConsentEmbed, createPrivacyConsentButtons } from '../ui/privacy-consent.js';
import { UserConsentService } from '../services/user-consent.service.js';

export const privacyCommands = [
  {
    data: new SlashCommandBuilder().setName('privacy').setDescription('Show privacy controls'),
    async execute(interaction: any) {
      const embed = createPrivacyConsentEmbed();
      const components = [createPrivacyConsentButtons()];
      await interaction.reply({ embeds: [embed], components, ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder().setName('optout').setDescription('Opt out of data processing'),
    async execute(interaction: any) {
      const svc = UserConsentService.getInstance();
      await svc.optOutUser(interaction.user.id);
      await interaction.reply({ embeds: [{ description: 'You have been opted out.' }], ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder().setName('pause').setDescription('Pause assistant interactions'),
    async execute(interaction: any) {
      const svc = UserConsentService.getInstance();
      await svc.pauseUser(interaction.user.id, 60);
      await interaction.reply({ embeds: [{ description: 'Paused for 60 minutes.' }], ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder().setName('resume').setDescription('Resume assistant interactions'),
    async execute(interaction: any) {
      const svc = UserConsentService.getInstance();
      await svc.resumeUser(interaction.user.id);
      await interaction.reply({ embeds: [{ description: 'Resumed.' }], ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder().setName('data-export').setDescription('Export your data'),
    async execute(interaction: any) {
      await interaction.reply({ embeds: [{ description: 'Your data export is being prepared.' }], ephemeral: true });
    },
  },
  {
    data: new SlashCommandBuilder().setName('forget-me').setDescription('Delete all your data'),
    async execute(interaction: any) {
      await interaction.reply({ embeds: [{ description: 'To confirm deletion, please use the in-chat flow.' }], ephemeral: true });
    },
  },
];

export async function handlePrivacyButtonInteraction(interaction: any) {
  // Simple passthrough to open the privacy modal/buttons again
  const embed = createPrivacyConsentEmbed();
  const components = [createPrivacyConsentButtons()];
  await interaction.reply({ embeds: [embed], components, ephemeral: true });
}