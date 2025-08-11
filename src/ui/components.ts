import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * Reusable Discord components used across the bot UI layer.
 *
 * Exports two single-row components containing one button each:
 * 1. `regenerateButtonRow` – A green "Regenerate" button used to restart a response stream.
 * 2. `stopButtonRow`       – A red "Stop" button used to halt an active response stream.
 */

export const REGENERATE_BUTTON_ID = 'regenerate_response';
export const STOP_BUTTON_ID = 'stop_generation';

/** Green "Regenerate" button row. */
export const regenerateButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId(REGENERATE_BUTTON_ID)
    .setLabel('Regenerate')
    .setStyle(ButtonStyle.Success),
);

/** Red "Stop" button row. */
export const stopButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId(STOP_BUTTON_ID)
    .setLabel('Stop')
    .setStyle(ButtonStyle.Danger),
);

/**
 * Convenience array containing both rows for easy spreading into message options:
 * ```ts
 * await interaction.followUp({ content: '...', components: streamControlRows });
 * ```
 */
export const streamControlRows = [regenerateButtonRow, stopButtonRow];

// One-time Move to DM button for onboarding
export const MOVE_DM_BUTTON_ID = 'move_to_dm';
export const moveDmButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId(MOVE_DM_BUTTON_ID)
    .setLabel('Move to DM?')
    .setStyle(ButtonStyle.Secondary)
);
