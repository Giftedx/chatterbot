import { ModalSubmitInteraction, ButtonInteraction } from 'discord.js';
import { UserConsentService } from '../services/user-consent.service.js';

const userConsentService = UserConsentService.getInstance();

export async function handlePrivacyModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction || !interaction.customId) return;
  if (interaction.customId !== 'forget_me_confirm') return;
  try {
    const confirmation = interaction.fields.getTextInputValue('confirmation');
    if (confirmation !== 'DELETE ALL MY DATA') {
      await interaction.reply({
        content: '❌ Confirmation text does not match. Data deletion cancelled.',
        ephemeral: true,
      });
      return;
    }
    // In our mocks, deferReply may be available via BaseInteraction; call if exists
    // @ts-expect-error mock compatibility
    await interaction.deferReply?.({ ephemeral: true });
    const ok = await userConsentService.forgetUser(interaction.user.id);
    await interaction.editReply({
      content: ok
        ? '✅ All your data has been permanently deleted.'
        : '❌ Failed to delete data. Please try again.',
    });
  } catch (e) {
    if (interaction.deferred)
      await interaction.editReply({ content: '❌ An error occurred during data deletion.' });
  }
}

export async function handlePrivacyButtonInteraction(
  interaction: ButtonInteraction,
): Promise<void> {
  try {
    const cid = interaction?.customId || '';
    if (
      typeof cid === 'string' &&
      cid.startsWith('privacy_') &&
      !interaction.deferred &&
      !interaction.replied
    ) {
      // Pre-ack button press to avoid timeout; core handler will edit this reply
      await interaction.deferReply({ ephemeral: true });
    }
  } catch {
    // Non-fatal; core handler will still attempt to handle
  }
}
