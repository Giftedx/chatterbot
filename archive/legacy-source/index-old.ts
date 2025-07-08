import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes, ChatInputCommandInteraction, Interaction, SlashCommandBuilder, SlashCommandStringOption, SlashCommandAttachmentOption, SlashCommandSubcommandBuilder, ButtonInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, Message } from 'discord.js';
import { REGENERATE_BUTTON_ID, STOP_BUTTON_ID } from './ui/components';
import { listPersonas, setActivePersona, createOrUpdatePersona, getActivePersona } from './services/persona-manager';
import { logInteraction, getStats } from './services/analytics';
import { moderationService } from './moderation/moderation-service';
import { buildModerationCommand, handleModerationCommand } from './commands/moderation-commands';
import { data as memoryCommandData, execute as executeMemoryCommand } from './commands/memory-commands';
import { UserMemoryService } from './memory/user-memory.service';
import { getHistory, updateHistory, updateHistoryWithParts } from './services/context-manager';
import { GeminiService } from './services/gemini.service';
import { urlToGenerativePart } from './utils/image-helper';
import { startAnalyticsDashboardIfEnabled } from './services/analytics-dashboard';
import { InvisibleIntelligenceService } from './commands/invisible-intelligence.service.js';
import { EnhancedInvisibleIntelligenceService } from './services/enhanced-invisible-intelligence.service.js';

// Validate required env vars early
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  throw new Error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment variables');
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const geminiService = new GeminiService();
const userMemoryService = new UserMemoryService();
const invisibleIntelligenceService = new InvisibleIntelligenceService();
const enhancedInvisibleService = new EnhancedInvisibleIntelligenceService();

// Define /gemini slash command
// ---------------- Persona slash command ----------------
const personaCommand = new SlashCommandBuilder()
  .setName('persona')
  .setDescription('Manage bot personas')
  .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
    sub.setName('list').setDescription('List available personas')
  )
  .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
    sub.setName('set')
      .setDescription('Set active persona')
      .addStringOption((opt: SlashCommandStringOption) =>
        opt.setName('name').setDescription('Persona name').setRequired(true)
      )
  )
  .addSubcommand((sub: SlashCommandSubcommandBuilder) =>
    sub.setName('create')
      .setDescription('Create or overwrite a persona')
      .addStringOption((opt: SlashCommandStringOption) =>
        opt.setName('name').setDescription('Persona name').setRequired(true)
      )
      .addStringOption((opt: SlashCommandStringOption) =>
        opt.setName('prompt').setDescription('System prompt text').setRequired(true)
      )
  );

const statsCommand = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('Show bot usage statistics (admin only)');

const commands = [
  personaCommand.toJSON(),
  statsCommand.toJSON(),
  buildModerationCommand().toJSON(),
  memoryCommandData.toJSON(),
  invisibleIntelligenceService.buildOptinCommand().toJSON(),
  enhancedInvisibleService.createSlashCommand().toJSON(),
  new SlashCommandBuilder()
    .setName('gemini')
    .setDescription('Ask Gemini AI a question')
    .addStringOption((option: SlashCommandStringOption) =>
      option.setName('prompt').setDescription('Your prompt').setRequired(true)
    )
    .addAttachmentOption((option: SlashCommandAttachmentOption) =>
      option.setName('image').setDescription('Optional image attachment').setRequired(false)
    )
    .toJSON()
];

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}`);

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commands });
    console.log('✅ Registered slash commands');
  } catch (error) {
    console.error('Error registering commands:', error);
  }

  // Start analytics dashboard if enabled
  startAnalyticsDashboardIfEnabled();
});

//  Store active streaming responses to handle STOP button
const activeStreams = new Map<string, { abortController: AbortController; isStreaming: boolean }>();

// Store last prompt per user for Regenerate feature
const lastPromptCache = new Map<string, { prompt: string; attachment?: string; channelId: string }>();

/**
 * Creates action row with Regenerate and Stop buttons for streaming responses
 */
function createStreamingButtons(streaming = true): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(REGENERATE_BUTTON_ID)
        .setLabel('🔄 Regenerate')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(streaming),
      new ButtonBuilder()
        .setCustomId(STOP_BUTTON_ID)
        .setLabel('⏹️ Stop')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!streaming)
    );
}

/**
 * Handles streaming response with real-time updates and memory integration
 */
async function handleStreamingResponse(
  interaction: ChatInputCommandInteraction,
  prompt: string,
  attachment?: string
): Promise<void> {
  const channelId = interaction.channelId;
  const userId = interaction.user.id;
  const guildId = interaction.guildId ?? 'default';
  const streamKey = `${userId}-${channelId}`;

  // Create abort controller for this stream
  const abortController = new AbortController();
  activeStreams.set(streamKey, { abortController, isStreaming: true });

  try {
    const persona = getActivePersona(guildId);
    const history = await getHistory(channelId);
    
    // Get user memory context for personalized responses
    const memoryContext = await userMemoryService.getMemoryContext(userId, guildId);
    let enhancedPrompt = prompt;
    
    if (memoryContext && memoryContext.contextPrompt) {
      enhancedPrompt = `${memoryContext.contextPrompt}\n\nUser's question: ${prompt}`;
    }
    
    const fullPrompt = `${persona.systemPrompt}\n\n${enhancedPrompt}`;
    
    // Initial response with streaming UI
    const initialContent = '🤖 *Thinking...*';
    const streamingRow = createStreamingButtons(true);
    
    await interaction.editReply({ 
      content: initialContent,
      components: [streamingRow]
    });

    let fullResponse = '';
    let lastUpdate = Date.now();
    const UPDATE_THROTTLE_MS = 1000; // Update every 1 second max
    
    // Handle multimodal vs text-only responses
    if (attachment) {
      // For multimodal, fall back to non-streaming for now since generateResponseStream doesn't support images
      const part = await urlToGenerativePart(attachment, 'image/png');
      fullResponse = await geminiService.generateMultimodalResponse(fullPrompt, part, history, userId, guildId);
      
      // Simulate brief "thinking" then show result
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalRow = createStreamingButtons(false);
      await interaction.editReply({
        content: fullResponse,
        components: [finalRow]
      });
    } else {
      // Use streaming API for text-only
      const streamGenerator = geminiService.generateResponseStream(
        enhancedPrompt, 
        history, 
        userId, 
        guildId
      );

      for await (const chunk of streamGenerator) {
        // Check if streaming was cancelled
        if (abortController.signal.aborted) {
          break;
        }

        fullResponse += chunk;
        
        // Throttle updates to prevent Discord rate limiting
        const now = Date.now();
        if (now - lastUpdate >= UPDATE_THROTTLE_MS) {
          try {
            await interaction.editReply({
              content: fullResponse + ' ▎', // Cursor indicator
              components: [streamingRow]
            });
            lastUpdate = now;
          } catch (error) {
            console.warn('Failed to update streaming response:', error);
            // Continue streaming even if update fails
          }
        }
      }

      // Final update - remove cursor and disable buttons
      const stream = activeStreams.get(streamKey);
      if (stream && !abortController.signal.aborted) {
        const finalRow = createStreamingButtons(false);
        await interaction.editReply({
          content: fullResponse,
          components: [finalRow]
        });
      }
    }

    // Update conversation history with multimodal support
    if (!abortController.signal.aborted) {
      if (attachment) {
        // Store multimodal conversation in history
        try {
          const imagePart = await urlToGenerativePart(attachment, 'image/png');
          updateHistoryWithParts(channelId, [{ text: prompt }, imagePart], fullResponse);
        } catch (error) {
          console.warn('Failed to store image in history, falling back to text-only:', error);
          updateHistory(channelId, prompt, fullResponse);
        }
      } else {
        updateHistory(channelId, prompt, fullResponse);
      }
      
      // Process conversation for memory extraction (background task)
      userMemoryService.processConversation({
        userId,
        guildId,
        channelId,
        messageContent: prompt,
        responseContent: fullResponse
      }).catch(error => {
        console.warn('Memory extraction failed:', error);
      });
      
      // Cache for regenerate
      lastPromptCache.set(userId, { prompt, attachment, channelId });
    }

  } catch (error) {
    console.error('Streaming error:', error);
    const errorRow = createStreamingButtons(false);
    await interaction.editReply({
      content: '❌ Error generating response',
      components: [errorRow]
    });
  } finally {
    // Cleanup
    activeStreams.delete(streamKey);
  }
}

client.on('interactionCreate', async (interaction: Interaction) => {
    if (interaction.isButton()) {
    await handleButtonInteraction(interaction);
    return;
  }
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'gemini') {
    await handleGeminiCommand(interaction);
    logInteraction({ guildId: interaction.guildId ?? null, userId: interaction.user.id, command: 'gemini', isSuccess: true });
  } else if (interaction.commandName === 'persona') {
    await handlePersonaCommand(interaction);
    logInteraction({ guildId: interaction.guildId ?? null, userId: interaction.user.id, command: 'persona', isSuccess: true });
  } else if (interaction.commandName === 'stats') {
    await handleStatsCommand(interaction);
    logInteraction({ guildId: interaction.guildId ?? null, userId: interaction.user.id, command: 'stats', isSuccess: true });
  } else if (interaction.commandName === 'moderation') {
    await handleModerationCommand(interaction);
    logInteraction({ guildId: interaction.guildId ?? null, userId: interaction.user.id, command: 'moderation', isSuccess: true });
  } else if (interaction.commandName === 'memory') {
    await executeMemoryCommand(interaction);
    logInteraction({ guildId: interaction.guildId ?? null, userId: interaction.user.id, command: 'memory', isSuccess: true });
  } else if (interaction.commandName === 'optin') {
    await enhancedInvisibleService.handleEnhancedConversation(interaction);
    logInteraction({ guildId: interaction.guildId ?? null, userId: interaction.user.id, command: 'optin', isSuccess: true });
  }
});

// Handle intelligent message processing for opted-in users
client.on('messageCreate', async (message: Message) => {
  // Process messages through the invisible intelligence system
  await invisibleIntelligenceService.handleIntelligentMessage(message);
});

async function handleGeminiCommand(interaction: ChatInputCommandInteraction) {
  if (interaction.commandName !== 'gemini') return;
    
  const prompt = interaction.options.getString('prompt', true);
  const attachment = interaction.options.getAttachment('image');

  // Use advanced moderation system
  const context = {
    guildId: interaction.guildId || 'default',
    userId: interaction.user.id,
    channelId: interaction.channelId,
    messageId: interaction.id
  };

  // Moderate text prompt
  const textResult = await moderationService.moderateText(prompt, context);
  if (textResult.action === 'block') {
    await interaction.reply({ 
      content: `🚫 ${textResult.verdict.reason || 'Content flagged as unsafe'}`, 
      ephemeral: true 
    });
    return;
  }

  // Moderate image attachment if present
  if (attachment) {
    if (!attachment.contentType?.startsWith('image/')) {
      await interaction.reply({ content: '🚫 Only image attachments are supported.', ephemeral: true });
      return;
    }

    const imageResult = await moderationService.moderateImage(attachment.url, attachment.contentType, context);
    if (imageResult.action === 'block') {
      await interaction.reply({ 
        content: `🚫 ${imageResult.verdict.reason || 'Image flagged as unsafe'}`, 
        ephemeral: true 
      });
      return;
    }
  }

  await interaction.deferReply();

  // Use streaming response for better UX
  try {
    await handleStreamingResponse(interaction, prompt, attachment?.url);
  } catch (err) {
    console.error('Error in handleGeminiCommand:', err);
    await interaction.editReply('❌ Error contacting Gemini API');
  }
}

async function handlePersonaCommand(interaction: ChatInputCommandInteraction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'list') {
    const personas = listPersonas().map(p => `• ${p.name}`).join('\n');
    await interaction.reply({ content: `Available personas:\n${personas}`, ephemeral: true });
  } else if (sub === 'set') {
    const name = interaction.options.getString('name', true);
    try {
      setActivePersona(interaction.guildId ?? 'default', name);
      await interaction.reply({ content: `✅ Persona set to **${name}**`, ephemeral: true });
    } catch (err) {
      await interaction.reply({ content: `❌ ${(err as Error).message}`, ephemeral: true });
    }
  } else if (sub === 'create') {
    const name = interaction.options.getString('name', true);
    const prompt = interaction.options.getString('prompt', true);
    await createOrUpdatePersona(name, prompt);
    await interaction.reply({ content: `✅ Persona **${name}** saved.`, ephemeral: true });
  }
}

async function handleButtonInteraction(interaction: ButtonInteraction) {
  if (interaction.customId === STOP_BUTTON_ID) {
    // Simply disable buttons – full stream cancellation requires AbortController integration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const disabledComponents = interaction.message.components.map((row: any): any => {
      const rowJson = row.toJSON();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rowJson.components = rowJson.components.map((c: any) => ({ ...c, disabled: true }));
      return rowJson;
    });
    await interaction.update({ components: disabledComponents });
  } else if (interaction.customId === REGENERATE_BUTTON_ID) {
    const cached = lastPromptCache.get(interaction.user.id);
    if (!cached) {
      await interaction.reply({ content: 'No previous prompt found.', ephemeral: true });
      return;
    }
    await interaction.deferReply();
    try {
      const history = await getHistory(cached.channelId);
      let response: string;
      if (cached.attachment) {
        const part = await urlToGenerativePart(cached.attachment, 'image/png');
        response = await geminiService.generateMultimodalResponse(cached.prompt, part, history, interaction.user.id, interaction.guildId ?? 'default');
      } else {
        response = await geminiService.generateResponse(cached.prompt, history, interaction.user.id, interaction.guildId ?? 'default');
      }
      updateHistory(cached.channelId, cached.prompt, response);
      await interaction.editReply(response);
    } catch (err) {
      await interaction.editReply('❌ Error regenerating response');
    }
  }
}

async function handleStatsCommand(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has('ManageGuild')) {
    await interaction.reply({ content: '🚫 Admins only.', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  const stats = await getStats();
  const description = Object.entries(stats.perUser)
    .map(([user, count]) => `• <@${user}>: ${count}`)
    .join('\n');
  await interaction.editReply({ embeds: [{
    title: 'Usage Statistics',
    description,
    fields: [
      { name: 'Total Commands', value: String(stats.total), inline: true },
      { name: 'Commands Today', value: String(stats.commandsToday), inline: true },
    ],
  }] });
}

client.login(DISCORD_TOKEN);
