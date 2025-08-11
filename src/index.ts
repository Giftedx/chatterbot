import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes, Interaction, Message } from 'discord.js';
import { CoreIntelligenceService, CoreIntelligenceConfig } from './services/core-intelligence.service.js';
import { startAnalyticsDashboardIfEnabled } from './services/analytics-dashboard.js';
import { healthCheck } from './health.js';
import { agenticCommands } from './commands/agentic-commands.js';
import { privacyCommands, handlePrivacyModalSubmit, handlePrivacyButtonInteraction } from './commands/privacy-commands.js';
import { memoryCommands } from './commands/memory-commands.js';
import { logger } from './utils/logger.js';
import { enhancedIntelligenceActivation } from './services/enhanced-intelligence-activation.service.js';
// Import AgenticIntelligenceService if its direct command handling is to be preserved outside CoreIntelligenceService
// import { agenticIntelligenceService } from './services/agentic-intelligence.service.js';


// console.log("Gemini API Key (first 8 chars):", process.env.GEMINI_API_KEY?.slice(0, 8));

// Validate required env vars early
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  throw new Error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment variables');
}

// Determine feature flags from environment variables
const enableAgenticFeatures = process.env.ENABLE_AGENTIC_INTELLIGENCE !== 'false'; // Default to true
// Mapping ENABLE_ENHANCED_INTELLIGENCE to more granular flags for CoreIntelligenceService
const enablePersonalization = process.env.ENABLE_ENHANCED_INTELLIGENCE === 'true';
const enableEnhancedMemory = process.env.ENABLE_ENHANCED_INTELLIGENCE === 'true';
const enableEnhancedUI = process.env.ENABLE_ENHANCED_INTELLIGENCE === 'true';
const enableResponseCache = process.env.ENABLE_ENHANCED_INTELLIGENCE === 'true'; // Assuming enhanced includes cache

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Configure and initialize CoreIntelligenceService
const coreIntelConfig: CoreIntelligenceConfig = {
    enableAgenticFeatures,
    enablePersonalization,
    enableEnhancedMemory,
    enableEnhancedUI,
    enableResponseCache,
    // MCP Manager will be passed after its initialization if needed
};

// Initialize MCP Manager if any enhanced features that depend on it are enabled
// For instance, if PersonalizationEngine within CoreIntelligenceService needs it.
let mcpManagerInstance: import('./services/mcp-manager.service.js').MCPManager | undefined = undefined;
if (enablePersonalization) { // Example: Personalization needs MCP Manager
    const { MCPManager } = await import('./services/mcp-manager.service.js');
    mcpManagerInstance = new MCPManager();
    await mcpManagerInstance.initialize();
}
coreIntelConfig.mcpManager = mcpManagerInstance;


const coreIntelligenceService = new CoreIntelligenceService(coreIntelConfig);

// Build command list
const coreCommands = coreIntelligenceService.buildCommands().map(cmd => cmd.toJSON());
const privacyCommandsJson = privacyCommands.map(cmd => cmd.data.toJSON());
const memoryCommandsJson = memoryCommands.map(cmd => cmd.data.toJSON());
const allCommands = [
  ...coreCommands,
  ...privacyCommandsJson,
  ...memoryCommandsJson,
  ...(enableAgenticFeatures ? agenticCommands.map(cmd => cmd.data.toJSON()) : [])
];

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user?.tag}`);
  console.log(`🤖 Core Intelligence Discord Bot v3.0 ready!`);
  console.log(`Features: Agentic(${enableAgenticFeatures}), Personalization(${enablePersonalization}), EnhancedMemory(${enableEnhancedMemory}), EnhancedUI(${enableEnhancedUI}), ResponseCache(${enableResponseCache})`);

  // Initialize Enhanced Intelligence if enabled
  if (process.env.ENABLE_ENHANCED_INTELLIGENCE === 'true') {
    console.log(`🚀 Activating Enhanced Intelligence features...`);
    try {
      const enhancedStatus = await enhancedIntelligenceActivation.activateEnhancedIntelligence();
      console.log(`✅ Enhanced Intelligence activated with ${enhancedStatus.availableFeatures.length} features:`);
      enhancedStatus.availableFeatures.forEach(feature => {
        console.log(`   - ${feature}`);
      });
      console.log(`🔗 MCP Connections: ${enhancedStatus.mcpConnectionsActive} active`);
      console.log(`⚡ Production Optimizations: ${enhancedStatus.performanceOptimizationsActive ? 'Enabled' : 'Disabled'}`);
    } catch (error) {
      console.error(`❌ Enhanced Intelligence activation failed:`, error);
      console.log(`⚡ Bot will continue with standard capabilities.`);
    }
  }

  if (mcpManagerInstance) {
    console.log(`🔧 Initializing MCP Manager...`);
    try {
      await mcpManagerInstance.initialize();
      const status = mcpManagerInstance.getStatus();
      console.log(`✅ MCP Manager initialized: ${status.connectedServers}/${status.totalServers} servers connected`);
      if (status.connectedServers > 0) {
        console.log(`🔗 Active MCP Servers:`);
        for (const [name, serverStatus] of Object.entries(status.serverStatus)) {
          if (serverStatus.connected) {
            console.log(`   - ${name} (Phase ${serverStatus.phase}, ${serverStatus.priority} priority)`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ MCP Manager initialization failed:`, error);
      console.log(`⚡ Bot will continue with fallback capabilities for MCP-dependent features.`);
    }
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: allCommands });
    console.log(`✅ Registered ${allCommands.length} commands:`);
    coreCommands.forEach(cmd => console.log(`   - /${cmd.name} (Core Intelligence)`));
    privacyCommandsJson.forEach(cmd => console.log(`   - /${cmd.name} (Privacy & Data Control)`));
    memoryCommandsJson.forEach(cmd => console.log(`   - /${cmd.name} (Memory Management)`));
    if (enableAgenticFeatures) {
      agenticCommands.forEach(cmd => console.log(`   - /${cmd.data.name} (Agentic System)`));
    }
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }

  startAnalyticsDashboardIfEnabled();
});

client.on('interactionCreate', async (interaction: Interaction) => {
  // Handle privacy modal submissions
  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('forget_me_confirm') || interaction.customId.startsWith('privacy_')) {
      await handlePrivacyModalSubmit(interaction);
      return;
    }
  }

  // Handle privacy button interactions
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('privacy_') || interaction.customId.startsWith('data_') || interaction.customId.startsWith('delete_')) {
      await handlePrivacyButtonInteraction(interaction);
      return;
    }
  }

  // Handle MCP consent button interactions
  if (interaction.isButton() && interaction.customId.startsWith('mcp_consent_')) {
    try {
      // Initialize MCP integration service if not done
      if (mcpManagerInstance) {
        const { MCPIntegrationService } = await import('./services/mcp-integration.service.js');
        const mcpIntegration = new MCPIntegrationService(mcpManagerInstance);
        await mcpIntegration.handleConsentInteraction(interaction);
      }
    } catch (error) {
      logger.error('Error handling MCP consent interaction:', { error: String(error) });
      if (!interaction.replied) {
        await interaction.reply({ content: 'An error occurred processing your consent decision.', ephemeral: true });
      }
    }
    return;
  }

  // Handle privacy commands
  if (interaction.isChatInputCommand()) {
    const privacyCommand = privacyCommands.find(cmd => cmd.data.name === interaction.commandName);
    if (privacyCommand) {
      try {
        await privacyCommand.execute(interaction);
      } catch (error) {
        logger.error('Error executing privacy command:', { commandName: interaction.commandName, error });
        const errReply = { content: 'An error occurred with this privacy command.', ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(errReply).catch(e => logger.error("FollowUp Error", e));
        else await interaction.reply(errReply).catch(e => logger.error("Reply Error", e));
      }
      return;
    }

    // Handle memory commands
    const memoryCommand = memoryCommands.find(cmd => cmd.data.name === interaction.commandName);
    if (memoryCommand) {
      try {
        await memoryCommand.execute(interaction);
      } catch (error) {
        logger.error('Error executing memory command:', { commandName: interaction.commandName, error });
        const errReply = { content: 'An error occurred with this memory command.', ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(errReply).catch(e => logger.error("FollowUp Error", e));
        else await interaction.reply(errReply).catch(e => logger.error("Reply Error", e));
      }
      return;
    }
  }

  // Agentic commands can be handled separately if they are not integrated into CoreIntelligenceService's command map.
  // For full consolidation, CoreIntelligenceService's handleInteraction would internally route agentic commands too.
  // This example keeps agentic command handling separate for now if they have distinct logic not fitting CoreIntelligenceService.
  if (enableAgenticFeatures && interaction.isChatInputCommand()) {
    const agenticCommand = agenticCommands.find(cmd => cmd.data.name === interaction.commandName);
    if (agenticCommand) {
      try {
        await agenticCommand.execute(interaction);
      } catch (error) {
        logger.error('Error executing agentic command:', { commandName: interaction.commandName, error });
        // Generic error reply
        const errReply = { content: 'An error occurred with this agentic command.', ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(errReply).catch(e => logger.error("FollowUp Error", e));
        else await interaction.reply(errReply).catch(e => logger.error("Reply Error", e));
      }
      return; // Agentic command handled
    }
  }

  // All other interactions (including core /chat) go to CoreIntelligenceService
  await coreIntelligenceService.handleInteraction(interaction);
});


client.on('messageCreate', async (message: Message) => {
  if (message.author.bot || message.content.startsWith('/')) return;

  // Message handling is now primarily through CoreIntelligenceService
  await coreIntelligenceService.handleMessage(message);
});


console.log(`🚀 Starting Core Intelligence Discord Bot...`);
// Start health check server
healthCheck.start();

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  
  try {
    if (process.env.ENABLE_ENHANCED_INTELLIGENCE === 'true' && enhancedIntelligenceActivation.isActivated()) {
      console.log('🧠 Shutting down Enhanced Intelligence...');
      await enhancedIntelligenceActivation.shutdown();
      console.log('✅ Enhanced Intelligence shutdown complete');
    }
    
    if (mcpManagerInstance) {
      console.log('🔧 Shutting down MCP Manager...');
      await mcpManagerInstance.shutdown();
      console.log('✅ MCP Manager shutdown complete');
    }
    
    console.log('🤖 Closing Discord connection...');
    client.destroy();
    console.log('✅ Discord connection closed');
    
    // healthCheck.stop(); // Assuming a stop method
    console.log('🎯 Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

client.login(DISCORD_TOKEN);