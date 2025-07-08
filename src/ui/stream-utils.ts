import { ChatInputCommandInteraction, MessageEditOptions } from 'discord.js';
import { streamControlRows } from './components.js';

/**
 * Incrementally edits a Discord reply while consuming a text stream.
 * Throttles edits to avoid Discord rate limits (5 edits / 5s).
 */
export async function sendStream(
  interaction: ChatInputCommandInteraction,
  stream: AsyncGenerator<string>,
  {
    throttleMs = 1200,
    withControls = true,
  }: { throttleMs?: number; withControls?: boolean } = {},
): Promise<string> {
  let accumulator = '';

  // Attach control buttons if requested
  if (withControls) {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '...' , components: streamControlRows });
    } else {
      await interaction.editReply({ components: streamControlRows });
    }
  }
  let lastEdit = Date.now();

  for await (const chunk of stream) {
    accumulator += chunk;
    const now = Date.now();
    if (now - lastEdit >= throttleMs) {
      await safeEdit(interaction, truncate(accumulator) + ' ▌');
      lastEdit = now;
    }
  }

  // Stream finished – disable buttons if they are present
  if (withControls) {
    const disableRows: MessageEditOptions['components'] = streamControlRows.map(row => {
      // discord.js v14 allows cloning via toJSON() but we manually disable
      const disabledRow = row.toJSON();
      disabledRow.components = disabledRow.components.map(c => ({ ...c, disabled: true }));
      return disabledRow;
    });
    await safeEdit(interaction, truncate(accumulator), disableRows);
  } else {
    await safeEdit(interaction, truncate(accumulator));
  }
  return accumulator;
}

async function safeEdit(interaction: ChatInputCommandInteraction, content: string, components?: MessageEditOptions['components']) {
  if (interaction.replied || interaction.deferred) {
    await interaction.editReply({ content, components });
  }
}

const MAX_DISCORD_LEN = 2000;
function truncate(text: string): string {
  return text.length > MAX_DISCORD_LEN ? text.slice(0, MAX_DISCORD_LEN - 3) + '...' : text;
}
