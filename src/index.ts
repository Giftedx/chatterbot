import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes, Interaction, Message } from 'discord.js';
import { CoreIntelligenceService, CoreIntelligenceConfig } from './services/core-intelligence.service.js';
import { startAnalyticsDashboardIfEnabled } from './services/analytics-dashboard.js';
import { stopAnalyticsDashboard } from './services/analytics-dashboard.js';
import { healthCheck } from './health.js';
import { handlePrivacyModalSubmit, handlePrivacyButtonInteraction } from './ui/privacy-consent.handlers.js';
import { logger } from './utils/logger.js';
import { enhancedIntelligenceActivation } from './services/enhanced-intelligence-activation.service.js';
import { startTemporalOrchestrationIfEnabled } from './orchestration/temporal/loader.js';
import { memoryConsolidationScheduler } from './services/schedulers/memory-consolidation.scheduler.js';
import { vectorMaintenanceScheduler } from './services/schedulers/vector-maintenance.scheduler.js';
import { runWithTrace } from './utils/async-context.js';
import crypto from 'node:crypto';
import { sdk as otelSdk } from './telemetry.js';
import { RateLimiter } from './utils/rate-limiter.js';


// console.log("Gemini API Key (first 8 chars):", process.env.GEMINI_API_KEY?.slice(0, 8));

// Validate required env vars early
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  throw new Error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment variables');
}

// Start OpenTelemetry as early as possible
await otelSdk.start();

// Determine feature flags from environment variables
const enableAgenticFeatures = process.env.ENABLE_AGENTIC_INTELLIGENCE !== 'false'; // Default to true
// Mapping ENABLE_ENHANCED_INTELLIGENCE to more granular flags for CoreIntelligenceService
const enablePersonalization = process.env.ENABLE_ENHANCED_INTELLIGENCE === 'true';
const enableEnhancedMemory = process.env.ENABLE_ENHANCED_INTELLIGENCE === 'true';
const enableEnhancedUI = process.env.ENABLE_ENHANCED_INTELLIGENCE === 'true';
const enableResponseCache = process.env.ENABLE_ENHANCED_INTELLIGENCE === 'true'; // Assuming enhanced includes cache
const enableAdvancedCapabilities = process.env.ENABLE_ADVANCED_CAPABILITIES !== 'false'; // Default to true

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Per-user rate limiter
const maxPerMinute = Number(process.env.MAX_REQUESTS_PER_MINUTE || 60);
const rateLimiter = new RateLimiter({ maxRequests: maxPerMinute, windowMs: 60_000 });

// Configure and initialize CoreIntelligenceService
const coreIntelConfig: CoreIntelligenceConfig = {
    enableAgenticFeatures,
    enablePersonalization,
    enableEnhancedMemory,
    enableEnhancedUI,
    enableResponseCache,
    enableAdvancedCapabilities,
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

// Hide extra commands: do not register privacy/memory/agentic by default
const allCommands = [
  ...coreCommands
];

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user?.tag}`);
  console.log(`🤖 Core Intelligence Discord Bot v3.0 ready!`);
  console.log(`Features: Agentic(${enableAgenticFeatures}), Personalization(${enablePersonalization}), EnhancedMemory(${enableEnhancedMemory}), EnhancedUI(${enableEnhancedUI}), ResponseCache(${enableResponseCache})`);

  // Start orchestration worker if enabled
  try {
    const orchestration = await startTemporalOrchestrationIfEnabled();
    if (orchestration.started) {
      console.log('🧩 Orchestration worker started.');
    }
  } catch (error) {
    console.error('❌ Failed to start orchestration worker:', error);
  }

  // Start memory consolidation scheduler
  try {
    memoryConsolidationScheduler.start();
    console.log('🧠 Memory consolidation scheduler started.');
  } catch (error) {
    console.error('❌ Failed to start memory consolidation scheduler:', error);
  }

  // Start vector maintenance scheduler
  try {
    vectorMaintenanceScheduler.start();
    console.log('🧹 Vector maintenance scheduler started.');
  } catch (error) {
    console.error('❌ Failed to start vector maintenance scheduler:', error);
  }

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
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }

  startAnalyticsDashboardIfEnabled();
  // Start background KB ingest if configured
  const { BackgroundIngestJob } = await import('./services/ingest/background-ingest.job.js');
  new BackgroundIngestJob(client).start();
});

client.on('interactionCreate', async (interaction: Interaction) => {
  const traceId = crypto.randomUUID();
  await runWithTrace(traceId, async () => {
    try {
      // Rate limit per user
      const uid = (interaction as any)?.user?.id || (interaction as any)?.member?.user?.id || 'unknown';
      try {
        await rateLimiter.checkLimits(uid);
      } catch (rlErr) {
        const anyIx = interaction as any;
        if (!anyIx.replied && !anyIx.deferred && typeof anyIx.reply === 'function') {
          await anyIx.reply({ content: 'You are sending requests too quickly. Please wait a moment and try again.', ephemeral: true });
        }
        return;
      }

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
          // Let core service own privacy buttons (consent agree/decline) to unify logic
          // Previously this returned early which prevented CoreIntelligenceService from seeing the button
          try {
            await handlePrivacyButtonInteraction(interaction);
          } catch (e) {
            logger.debug('Non-fatal privacy button handler error (will continue to core handler)', { error: String(e) });
          }
          // Do NOT return here so the core service can handle consent buttons
        }
      }

      // Handle MCP consent button interactions
      if (interaction.isButton() && interaction.customId.startsWith('mcp_consent_')) {
        try {
          if (mcpManagerInstance) {
            const { MCPIntegrationService } = await import('./services/mcp-integration.service.js');
            const mcpIntegration = new MCPIntegrationService(mcpManagerInstance);
            await mcpIntegration.handleConsentInteraction(interaction);
          }
        } catch (error) {
          logger.error('Error handling MCP consent interaction', error as Error, { metadata: { traceId } });
          if (!interaction.replied) {
            await interaction.reply({ content: 'An error occurred processing your consent decision.', ephemeral: true });
          }
        }
        return;
      }

      await coreIntelligenceService.handleInteraction(interaction);
    } catch (err) {
      logger.error('Unhandled error in interactionCreate', err as Error, { metadata: { traceId } });
    }
  });
});


client.on('messageCreate', async (message: Message) => {
  if (message.author.bot || message.content.startsWith('/')) return;
  const traceId = crypto.randomUUID();
  await runWithTrace(traceId, async () => {
    try {
      // Rate limit per user for free-form messages
      try {
        await rateLimiter.checkLimits(message.author.id);
      } catch {
        await message.reply('You are sending requests too quickly. Please wait a moment and try again.');
        return;
      }

      await coreIntelligenceService.handleMessage(message);
    } catch (err) {
      logger.error('Unhandled error in messageCreate', err as Error, { metadata: { traceId } });
    }
  });
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
    try { 
      stopAnalyticsDashboard(); 
    } catch (error) {
      console.error('❌ Failed to stop analytics dashboard:', error);
    }

    console.log('🤖 Closing Discord connection...');
    client.destroy();
    console.log('✅ Discord connection closed');

    // Shutdown OpenTelemetry
    try {
      await otelSdk.shutdown();
    } catch (e) {
      console.error('❌ Error shutting down OpenTelemetry:', e);
    }
    
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

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason as Error);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', err);
});

client.login(DISCORD_TOKEN);