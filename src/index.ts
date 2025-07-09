import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes, ChatInputCommandInteraction, Interaction, ButtonInteraction, Message } from 'discord.js';
import { UnifiedIntelligenceService } from './services/unified-intelligence.service.js';
import { EnhancedInvisibleIntelligenceService } from './services/enhanced-intelligence/index.js';
import { startAnalyticsDashboardIfEnabled } from './services/analytics-dashboard.js';
import { healthCheck } from './health.js';
import { agenticIntelligenceService } from './services/agentic-intelligence.service.js';
import { agenticCommands } from './commands/agentic-commands.js';
import { logger } from './utils/logger.js';
import { mcpManager } from './services/mcp-manager.service.js';

console.log("Gemini API Key (first 8 chars):", process.env.GEMINI_API_KEY?.slice(0, 8));

// Validate required env vars early
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const ENABLE_ENHANCED_INTELLIGENCE = process.env.ENABLE_ENHANCED_INTELLIGENCE === 'true';
const ENABLE_AGENTIC_INTELLIGENCE = process.env.ENABLE_AGENTIC_INTELLIGENCE !== 'false'; // Default to true
if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  throw new Error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment variables');
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Initialize the intelligence services
let unifiedIntelligenceService: UnifiedIntelligenceService;
const enhancedIntelligenceService = ENABLE_ENHANCED_INTELLIGENCE ? new EnhancedInvisibleIntelligenceService() : null;

// Initialize UnifiedIntelligenceService without MCP first for command registration
unifiedIntelligenceService = new UnifiedIntelligenceService();

// Build command list with agentic commands  
const commands = [
  // Core optin command
  enhancedIntelligenceService ? 
    enhancedIntelligenceService.createSlashCommand().toJSON() : 
    unifiedIntelligenceService.buildOptinCommand().toJSON(),
  
  // Agentic commands
  ...(ENABLE_AGENTIC_INTELLIGENCE ? agenticCommands.map(cmd => cmd.data.toJSON()) : [])
];

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user?.tag}`);
  console.log(`🤖 ${ENABLE_ENHANCED_INTELLIGENCE ? 'Enhanced' : 'Unified'} Intelligence Discord Bot v2.0 ready!`);
  console.log(`📋 Mode: ${ENABLE_ENHANCED_INTELLIGENCE ? 'Enhanced Intelligence (MCP-enabled)' : 'Unified Intelligence (Standard)'}`);
  console.log(`🧠 Agentic Intelligence: ${ENABLE_AGENTIC_INTELLIGENCE ? 'Enabled' : 'Disabled'}`);

      // Initialize MCP Manager if enhanced intelligence is enabled
  if (ENABLE_ENHANCED_INTELLIGENCE) {
    console.log(`🔧 Initializing MCP Manager...`);
    try {
      await mcpManager.initialize();
      const status = mcpManager.getStatus();
      console.log(`✅ MCP Manager initialized: ${status.connectedServers}/${status.totalServers} servers connected`);
      
      if (status.connectedServers > 0) {
        console.log(`🔗 Active MCP Servers:`);
        for (const [name, serverStatus] of Object.entries(status.serverStatus)) {
          if (serverStatus.connected) {
            console.log(`   - ${name} (Phase ${serverStatus.phase}, ${serverStatus.priority} priority)`);
          }
        }
        
        // Recreate UnifiedIntelligenceService with MCP Manager
        unifiedIntelligenceService = new UnifiedIntelligenceService(undefined, mcpManager);
        console.log(`🔗 UnifiedIntelligenceService updated with MCP integration`);
      }
    } catch (error) {
      console.error(`❌ MCP Manager initialization failed:`, error);
      console.log(`⚡ Bot will continue with fallback capabilities`);
    }
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commands });
    console.log(`✅ Registered ${commands.length} commands:`);
    console.log(`   - /optin (core AI assistance)`);
    if (ENABLE_AGENTIC_INTELLIGENCE) {
      console.log(`   - /learn (add knowledge to AI)`);
      console.log(`   - /knowledge (search knowledge base)`);
      console.log(`   - /escalate (manual escalation)`);
      console.log(`   - /agentic-stats (view statistics)`);
      console.log(`   - /agentic-config (configure settings)`);
      console.log(`   - /agentic-help (get help)`);
    }
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }

  // Start analytics dashboard if enabled
  startAnalyticsDashboardIfEnabled();
});

// Handle all interactions through the appropriate service
client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    // Handle agentic commands
    if (ENABLE_AGENTIC_INTELLIGENCE) {
      const agenticCommand = agenticCommands.find(cmd => cmd.data.name === interaction.commandName);
      if (agenticCommand) {
        await agenticCommand.execute(interaction);
        return;
      }
    }

    // Handle core optin command
    if (interaction.commandName === 'optin') {
      // Use agentic intelligence if enabled, otherwise fallback to basic Gemini
      if (ENABLE_AGENTIC_INTELLIGENCE) {
        await handleAgenticOptin(interaction);
      } else {
        await handleBasicOptin(interaction);
      }
    }
  } catch (error) {
    logger.error('Error handling interaction:', error);
    const errorMessage = 'An error occurred while processing your request. Please try again.';
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ content: errorMessage });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

// Handle agentic optin command
async function handleAgenticOptin(interaction: ChatInputCommandInteraction) {
  const prompt = interaction.options.getString('prompt', true);
  
  await interaction.deferReply();

  try {
    const agenticResponse = await agenticIntelligenceService.processQuery({
      query: prompt,
      userId: interaction.user.id,
      channelId: interaction.channelId,
      context: {
        userRole: (interaction.member as any)?.roles?.highest?.name || 'user',
        channelType: interaction.channel?.type?.toString() || 'text'
      },
      options: {
        includeCitations: true,
        enableEscalation: true,
        minConfidence: 0.6
      }
    });

    // Build response with agentic features
    let response = agenticResponse.response;
    
    // Add confidence indicator if low
    if (agenticResponse.confidence < 0.7) {
      response += `\n\n⚠️ *Confidence: ${Math.round(agenticResponse.confidence * 100)}%*`;
    }

    // Add source citations if available
    if (agenticResponse.citations.hasCitations) {
      response += `\n\n📚 *Sources: ${agenticResponse.sourceSummary}*`;
    }

    // Add escalation notice if needed
    if (agenticResponse.escalation.shouldEscalate && agenticResponse.escalation.autoResponse) {
      response += `\n\n🚨 ${agenticResponse.escalation.autoResponse}`;
    }

    await interaction.editReply({ content: response });

    // Log interaction for learning
    logger.info('Agentic optin processed', {
      userId: interaction.user.id,
      channelId: interaction.channelId,
      confidence: agenticResponse.confidence,
      knowledgeGrounded: agenticResponse.knowledgeGrounded,
      shouldEscalate: agenticResponse.escalation.shouldEscalate,
      processingTime: agenticResponse.metadata.processingTime
    });

  } catch (error) {
    logger.error('Error in agentic optin:', error);
    await interaction.editReply({ 
      content: 'I encountered an error processing your request. Please try again or contact a moderator if the issue persists.' 
    });
  }
}

// Handle basic optin command (fallback)
async function handleBasicOptin(interaction: ChatInputCommandInteraction) {
  const prompt = interaction.options.getString('prompt', true);
  
  await interaction.deferReply();

  try {
    // Minimal Gemini call, bypass all bot logic
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      await interaction.editReply({ content: 'Gemini API key not configured' });
      return;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    await interaction.editReply({ content: text || 'No response from Gemini' });
  } catch (error) {
    logger.error('Error in basic optin:', error);
    await interaction.editReply({ content: 'Error calling Gemini: ' + error });
  }
}

// Handle messages for intelligent conversation with agentic features
client.on('messageCreate', async (message: Message) => {
  // Skip bot messages and commands
  if (message.author.bot || message.content.startsWith('/')) return;

  console.log('[DEBUG] Message received:', message.content, 'from user:', message.author.username);
  
  try {
    // Use agentic intelligence if enabled
    if (ENABLE_AGENTIC_INTELLIGENCE) {
      await handleAgenticMessage(message);
    } else {
      // Use enhanced intelligence service if enabled and available
      if (enhancedIntelligenceService && 'handleIntelligentMessage' in enhancedIntelligenceService) {
        console.log('[DEBUG] Using enhanced intelligence service');
        await enhancedIntelligenceService.handleIntelligentMessage(message);
      } else {
        console.log('[DEBUG] Using unified intelligence service');
        // Fallback to unified service
        await unifiedIntelligenceService.handleIntelligentMessage(message);
      }
    }
  } catch (error) {
    logger.error('❌ Error handling message:', error);
    // Don't spam users with error messages for every message
    // The service will handle user feedback internally
  }
});

// Handle messages with agentic intelligence
async function handleAgenticMessage(message: Message) {
  try {
    // Check if message mentions the bot or is in a designated channel
    const isBotMentioned = message.mentions.users.has(client.user?.id || '');
    const isInDesignatedChannel = process.env.AGENTIC_CHANNELS?.split(',').includes(message.channelId);
    
    if (!isBotMentioned && !isInDesignatedChannel) {
      return; // Don't process every message
    }

    // Remove bot mention from content
    const cleanContent = message.content.replace(/<@!\d+>|<@\d+>/g, '').trim();
    if (!cleanContent) return;

    // Process with agentic intelligence
    const agenticResponse = await agenticIntelligenceService.processQuery({
      query: cleanContent,
      userId: message.author.id,
      channelId: message.channelId,
      context: {
        userRole: (message.member as any)?.roles?.highest?.name || 'user',
        channelType: message.channel?.type?.toString() || 'text'
      },
      options: {
        includeCitations: true,
        enableEscalation: true,
        minConfidence: 0.5
      }
    });

    // Build response
    let response = agenticResponse.response;
    
    // Add confidence indicator if low
    if (agenticResponse.confidence < 0.6) {
      response += `\n\n⚠️ *Confidence: ${Math.round(agenticResponse.confidence * 100)}%*`;
    }

    // Add source citations if available
    if (agenticResponse.citations.hasCitations) {
      response += `\n\n📚 *Sources: ${agenticResponse.sourceSummary}*`;
    }

    // Add escalation notice if needed
    if (agenticResponse.escalation.shouldEscalate && agenticResponse.escalation.autoResponse) {
      response += `\n\n🚨 ${agenticResponse.escalation.autoResponse}`;
    }

    await message.reply(response);

    // Log interaction for learning
    logger.info('Agentic message processed', {
      userId: message.author.id,
      channelId: message.channelId,
      confidence: agenticResponse.confidence,
      knowledgeGrounded: agenticResponse.knowledgeGrounded,
      shouldEscalate: agenticResponse.escalation.shouldEscalate,
      processingTime: agenticResponse.metadata.processingTime
    });

  } catch (error) {
    logger.error('Error in agentic message handling:', error);
    // Don't reply with errors to avoid spam
  }
}

console.log(`🚀 Starting ${ENABLE_ENHANCED_INTELLIGENCE ? 'Enhanced' : 'Unified'} Intelligence Discord Bot...`);
console.log(`🧠 Agentic Intelligence: ${ENABLE_AGENTIC_INTELLIGENCE ? 'Enabled' : 'Disabled'}`);

// Start health check server
healthCheck.start();

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  
  try {
    // Shutdown MCP Manager if enabled
    if (ENABLE_ENHANCED_INTELLIGENCE) {
      console.log('🔧 Shutting down MCP Manager...');
      await mcpManager.shutdown();
      console.log('✅ MCP Manager shutdown complete');
    }
    
    // Destroy Discord client
    console.log('🤖 Closing Discord connection...');
    client.destroy();
    console.log('✅ Discord connection closed');
    
    // Stop health check server
    console.log('🩺 Stopping health check server...');
    // Assuming healthCheck has a stop method
    // healthCheck.stop();
    
    console.log('🎯 Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

client.login(DISCORD_TOKEN);