import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes, ChatInputCommandInteraction, Interaction, ButtonInteraction } from 'discord.js';
import { UnifiedIntelligenceService } from './services/unified-intelligence.service.js';
import { startAnalyticsDashboardIfEnabled } from './services/analytics-dashboard';

// Validate required env vars early
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  throw new Error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment variables');
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Initialize the unified intelligence service
const unifiedIntelligenceService = new UnifiedIntelligenceService();

// Register only the /optin command
const commands = [
  unifiedIntelligenceService.buildOptinCommand().toJSON()
];

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}`);

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commands });
    console.log('✅ Registered unified /optin command');
  } catch (error) {
    console.error('Error registering commands:', error);
  }

  // Start analytics dashboard if enabled
  startAnalyticsDashboardIfEnabled();
});

// Handle all interactions through the unified service
client.on('interactionCreate', async (interaction: Interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await unifiedIntelligenceService.handleOptinCommand(interaction as ChatInputCommandInteraction);
    } else if (interaction.isButton()) {
      await unifiedIntelligenceService.handleButtonInteraction(interaction as ButtonInteraction);
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    
    // Provide user feedback for errors
    const errorMessage = '❌ An error occurred while processing your request.';
    try {
      if (interaction.isRepliable()) {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      }
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
});

client.login(DISCORD_TOKEN);
