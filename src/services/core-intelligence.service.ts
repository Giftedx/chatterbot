/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    Interaction,
    Message,
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ButtonInteraction,
    Collection,
    Attachment,
    TextBasedChannel
} from 'discord.js';
import { URL } from 'url';

// MCP specific
import { MCPManager } from './mcp-manager.service.js';
import { UnifiedMCPOrchestratorService, MCPOrchestrationResult } from './core/mcp-orchestrator.service.js';

// Unified Core Services
import { UnifiedAnalyticsService } from './core/unified-analytics.service.js';

// Agentic and Gemini
import { AgenticIntelligenceService, AgenticQuery, AgenticResponse } from './agentic-intelligence.service.js';
import { GeminiService } from './gemini.service.js';

// Core Intelligence Sub-Services
import {
    intelligencePermissionService,
    UserCapabilities,
    intelligenceContextService,
    EnhancedContext,
    // IntelligenceAnalysis, // Not directly used here, adapted from UnifiedMessageAnalysis
    intelligenceAdminService,
    intelligenceCapabilityService
} from './intelligence/index.js';

import { unifiedMessageAnalysisService, UnifiedMessageAnalysis, AttachmentInfo } from './core/message-analysis.service.js';

// Enhanced Intelligence Sub-Services (conditionally used)
import { EnhancedMemoryService } from './enhanced-intelligence/memory.service.js';
import { EnhancedUIService } from './enhanced-intelligence/ui.service.js';
import { EnhancedResponseService } from './enhanced-intelligence/response.service.js';
import { EnhancedCacheService } from './enhanced-intelligence/cache.service.js';
import { PersonalizationEngine } from './enhanced-intelligence/personalization-engine.service.js';
import { UserBehaviorAnalyticsService } from './enhanced-intelligence/behavior-analytics.service.js';
import { SmartRecommendationService } from './enhanced-intelligence/smart-recommendation.service.js';
import { UserMemoryService } from '../memory/user-memory.service.js';
import { ProcessingContext as EnhancedProcessingContext, MessageAnalysis as EnhancedMessageAnalysis } from './enhanced-intelligence/types.js';
import { modelRouterService } from './model-router.service.js';
import { knowledgeBaseService } from './knowledge-base.service.js';


// Utilities and Others
import { logger } from '../utils/logger.js';
import { ChatMessage, getHistory, updateHistory, updateHistoryWithParts } from './context-manager.js';
import { createPrivacyConsentEmbed, createPrivacyConsentButtons } from '../ui/privacy-consent.js';
import { UserConsentService } from '../services/user-consent.service.js';
import { ModerationService } from '../moderation/moderation-service.js';
import { REGENERATE_BUTTON_ID, STOP_BUTTON_ID, MOVE_DM_BUTTON_ID, moveDmButtonRow } from '../ui/components.js';
import { urlToGenerativePart } from '../utils/image-helper.js';
import { prisma } from '../db/prisma.js';

// import { sendStream } from '../ui/stream-utils'; // sendStream is used by EnhancedUIService




interface CommonAttachment {
    name?: string | null;
    url: string;
    contentType?: string | null;
}

export interface CoreIntelligenceConfig {
    enableAgenticFeatures: boolean;
    enablePersonalization: boolean;
    enableEnhancedMemory: boolean;
    enableEnhancedUI: boolean;
    enableResponseCache: boolean;
    mcpManager?: MCPManager;
    // Optional dependency injection for testing
    dependencies?: {
        mcpOrchestrator?: UnifiedMCPOrchestratorService;
        analyticsService?: UnifiedAnalyticsService;
        messageAnalysisService?: typeof unifiedMessageAnalysisService;
        geminiService?: GeminiService;
    };
}

export class CoreIntelligenceService {
    private readonly config: CoreIntelligenceConfig;
    private optedInUsers = new Set<string>();
    private activeStreams = new Map<string, { abortController: AbortController; isStreaming: boolean }>();
    private lastPromptCache = new Map<string, { prompt: string; attachments: CommonAttachment[]; channelId: string }>();
    private lastReplyAt = new Map<string, number>();
    private userThreadCache = new Map<string, string>();

    private readonly mcpOrchestrator: UnifiedMCPOrchestratorService;
    private readonly analyticsService: UnifiedAnalyticsService;
    private readonly agenticIntelligence: AgenticIntelligenceService;
    private readonly geminiService: GeminiService;
    private readonly moderationService: ModerationService;
    private readonly permissionService: typeof intelligencePermissionService;
    private readonly contextService: typeof intelligenceContextService;
    private readonly adminService: typeof intelligenceAdminService;
    private readonly capabilityService: typeof intelligenceCapabilityService;
    private readonly messageAnalysisService: typeof unifiedMessageAnalysisService;
    private readonly userMemoryService: UserMemoryService;
    private readonly userConsentService: UserConsentService;

    private enhancedMemoryService?: EnhancedMemoryService;
    private enhancedUiService?: EnhancedUIService;
    private enhancedResponseService?: EnhancedResponseService;
    private enhancedCacheService?: EnhancedCacheService;
    private personalizationEngine?: PersonalizationEngine;
    private behaviorAnalytics?: UserBehaviorAnalyticsService;
    private smartRecommendations?: SmartRecommendationService;

    constructor(config: CoreIntelligenceConfig) {
        this.config = config;
        this.agenticIntelligence = AgenticIntelligenceService.getInstance();
        
        // Use dependency injection for testing, otherwise create new instances
        this.mcpOrchestrator = config.dependencies?.mcpOrchestrator ?? new UnifiedMCPOrchestratorService(config.mcpManager);
        this.analyticsService = config.dependencies?.analyticsService ?? new UnifiedAnalyticsService();
        this.messageAnalysisService = config.dependencies?.messageAnalysisService ?? unifiedMessageAnalysisService;
        
        this.geminiService = config.dependencies?.geminiService ?? new GeminiService();
        this.moderationService = new ModerationService();
        this.permissionService = intelligencePermissionService;
        this.contextService = intelligenceContextService;
        this.adminService = intelligenceAdminService;
        this.capabilityService = intelligenceCapabilityService;
        this.userMemoryService = new UserMemoryService();
        this.userConsentService = UserConsentService.getInstance();

        if (config.enableEnhancedMemory) this.enhancedMemoryService = new EnhancedMemoryService();
        if (config.enableEnhancedUI) this.enhancedUiService = new EnhancedUIService();
        if (config.enableResponseCache) this.enhancedCacheService = new EnhancedCacheService();
        this.enhancedResponseService = new EnhancedResponseService();

        if (config.enablePersonalization) {
            this.personalizationEngine = new PersonalizationEngine(config.mcpManager);
            this.behaviorAnalytics = new UserBehaviorAnalyticsService();
            this.smartRecommendations = new SmartRecommendationService();
        }

        this.loadOptedInUsers().catch(err => logger.error('Failed to load opted-in users', err));
        
        // Initialize MCP Orchestrator with comprehensive null safety
        if (this.mcpOrchestrator && typeof this.mcpOrchestrator.initialize === 'function') {
            try {
                const initResult = this.mcpOrchestrator.initialize();
                if (initResult && typeof initResult.catch === 'function') {
                    initResult.catch(err => logger.error('MCP Orchestrator failed to init in CoreIntelligenceService', err));
                }
            } catch (err) {
                logger.error('Error calling MCP Orchestrator initialize', err);
            }
        } else {
            logger.warn('MCP Orchestrator not available or missing initialize method');
        }
        
        logger.info('CoreIntelligenceService initialized', { config: this.config });
    }

    /**
     * Analytics wrapper to match expected interface
     */
    private recordAnalyticsInteraction(data: any): void {
        // Use the unified analytics service
        if (data.isSuccess !== undefined) {
            try {
                const logResult = this.analyticsService.logInteraction({
                    guildId: data.guildId || null,
                    userId: data.userId || 'unknown',
                    command: data.step || 'core-intelligence',
                    isSuccess: data.isSuccess
                });
                
                // Only call .catch() if logResult is a Promise
                if (logResult && typeof logResult.catch === 'function') {
                    logResult.catch((err: Error) => logger.warn('Analytics logging failed', { error: err.message }));
                }
            } catch (err) {
                logger.warn('Analytics logging failed', { error: err instanceof Error ? err.message : 'Unknown error' });
            }
        }
    }

    public buildCommands(): SlashCommandBuilder[] {
        const commands: SlashCommandBuilder[] = [];
        const chatCommand = new SlashCommandBuilder()
            .setName('chat')
            .setDescription('Engage with intelligent conversation features.')
            .addStringOption(option => option.setName('prompt').setDescription('Your message, question, or request.').setRequired(true))
            .addAttachmentOption(option => option.setName('attachment').setDescription('Optional file attachment.').setRequired(false));
        commands.push(chatCommand as SlashCommandBuilder);
        return commands;
    }

    public async handleInteraction(interaction: Interaction): Promise<void> {
        try {
            if (interaction.isChatInputCommand()) {
                await this.handleSlashCommand(interaction);
            } else if (interaction.isButton()) {
                await this.handleButtonPress(interaction);
            }
        } catch (error) {
            logger.error('[CoreIntelSvc] Failed to handle interaction:', { interactionId: interaction.id, error });
            console.error('Error handling interaction', error);
            if (interaction && typeof interaction.isRepliable === 'function' && interaction.isRepliable()) {
                const errorMessage = 'An error occurred while processing your request.';
                if (interaction.deferred || interaction.replied) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true }).catch(e => logger.error('[CoreIntelSvc] Failed to send error followUp', e));
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true }).catch(e => logger.error('[CoreIntelSvc] Failed to send error reply', e));
                }
            }
        }
    }

    private async handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        if (interaction.commandName === 'chat') {
            await this.processChatCommand(interaction);
        } else {
            logger.warn('[CoreIntelSvc] Unknown slash command received:', { commandName: interaction.commandName });
            await interaction.reply({ content: 'Unknown command.', ephemeral: true });
        }
    }

    private async processChatCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        const promptText = interaction.options.getString('prompt', true);
        const discordAttachment = interaction.options.getAttachment('attachment');
        const userId = interaction.user.id;
        const username = interaction.user.username;

        // Auto opt-in and consent: brief, friendly
        const userConsent = await this.userConsentService.getUserConsent(userId);
        if (!userConsent || !userConsent.privacyAccepted || userConsent.optedOut) {
          const embed = createPrivacyConsentEmbed();
          const buttons = createPrivacyConsentButtons();
          await interaction.reply({ embeds: [embed], components: [buttons], ephemeral: true });
          return;
        }

        // Respect pause
        if (await this.userConsentService.isUserPaused(userId)) {
          await interaction.reply({ content: '⏸️ You’re paused. Say “resume” or use /resume to continue.', ephemeral: true });
          return;
        }

        // Ensure presence and routing prefs
        await this.userConsentService.updateUserActivity(userId);
        this.optedInUsers.add(userId);

        // Open DM or personal thread
        const routing = await this.userConsentService.getRouting(userId);
        let targetChannelId = routing.lastThreadId || interaction.channelId;
        let movedToDm = false;

        try {
          if (routing.dmPreferred) {
            const dm = await interaction.user.createDM();
            targetChannelId = dm.id;
            movedToDm = true;
          } else {
            // Ensure a personal thread exists in this guild/channel
            if (!routing.lastThreadId && interaction.channel && interaction.channel.isTextBased()) {
              const parent = interaction.channel;
              const thread = await (parent as TextChannel).threads.create({
                name: `chat-${interaction.user.username}`.slice(0, 90),
                autoArchiveDuration: 1440,
                reason: 'Personal chat thread',
              });
              targetChannelId = thread.id;
              await this.userConsentService.setLastThreadId(userId, thread.id);
            }
          }
        } catch (e) {
          // Fallback to current channel if thread/DM failed
          targetChannelId = interaction.channelId;
        }

        // Acknowledge ephemerally
        const moveDmRow = routing.dmPreferred ? [] : [moveDmButtonRow];
        const ack = movedToDm
          ? 'DM opened. Chat with me there anytime.'
          : 'You’re all set. I’ll reply in your personal thread/DM.';
        await interaction.reply({ content: ack, components: moveDmRow, ephemeral: true });

        // If prompt provided, process and send to destination
        const commonAttachments: CommonAttachment[] = [];
        if (discordAttachment) {
          commonAttachments.push({ name: discordAttachment.name, url: discordAttachment.url, contentType: discordAttachment.contentType });
        }

        // Create a mock message context targeting the destination channel
        const messageOptions = await this._processPromptAndGenerateResponse(
          promptText,
          userId,
          targetChannelId,
          interaction.guildId,
          commonAttachments,
          interaction
        );

        try {
          // Send message to the destination
          if (routing.dmPreferred) {
            const dm = await interaction.user.createDM();
            await dm.send(messageOptions as any);
          } else if (targetChannelId !== interaction.channelId && interaction.client.channels) {
            const chan = await interaction.client.channels.fetch(targetChannelId);
            if (chan && chan?.isTextBased()) await (chan as TextBasedChannel).send(messageOptions);
          } else {
            await interaction.followUp(messageOptions);
          }
        } catch (_) {
          // As last resort, send as follow-up in current context
          await interaction.followUp(messageOptions);
        }
    }

    private async loadOptedInUsers(): Promise<void> { logger.info('[CoreIntelSvc] Opted-in user loading (mocked - in-memory).'); }
    private async saveOptedInUsers(): Promise<void> { logger.info('[CoreIntelSvc] Opted-in user saving (mocked - in-memory).'); }

    private withinCooldown(userId: string, ms: number): boolean {
        const now = Date.now();
        const last = this.lastReplyAt.get(userId) || 0;
        if (now - last < ms) return true;
        this.lastReplyAt.set(userId, now);
        return false;
    }

    private async shouldRespond(message: Message): Promise<boolean> {
        const userId = message.author.id;
        const consent = await this.userConsentService.getUserConsent(userId);
        if (!consent || consent.optedOut) return false;
        if (await this.userConsentService.isUserPaused(userId)) return false;

        const inDM = !message.guildId;
        if (inDM) return true;

        const routing = await this.userConsentService.getRouting(userId);
        const inPersonalThread = routing.lastThreadId && message.channelId === routing.lastThreadId;

        const mentionedBot = !!message.mentions?.users?.has(message.client.user!.id);
        const addressed = mentionedBot || /^(hey|hi|ok|bot|assistant)[\s,]+/i.test(message.content) || message.content.includes('?');

        return Boolean(inPersonalThread || mentionedBot || addressed);
    }

    private classifyControlIntent(text: string): { intent: string; payload?: any } {
        const t = text.toLowerCase();
        // DELETE / EXPORT
        if (/\b(delete|remove) my data\b|\bforget me\b/.test(t)) return { intent: 'DELETE' };
        if (/\bexport my data\b|\bdata export\b|\bwhat do you know about me\b/.test(t)) return { intent: 'EXPORT' };
        // PAUSE / RESUME
        const pauseMatch = t.match(/\bpause(?: for)?\s+(\d+)\s*(minute|minutes|hour|hours)?/);
        if (pauseMatch) {
          const n = parseInt(pauseMatch[1], 10);
          const unit = pauseMatch[2] || 'minutes';
          const minutes = /hour/.test(unit) ? n * 60 : n;
          return { intent: 'PAUSE', payload: { minutes } };
        }
        if (/\bpause\b|\bstop\b/.test(t)) return { intent: 'PAUSE', payload: { minutes: 60 } };
        if (/\bresume\b|\bcontinue\b/.test(t)) return { intent: 'RESUME' };
        // MOVE
        if (/\bswitch to dm\b|\bdm(s)?\b|\btalk in dm\b/.test(t)) return { intent: 'MOVE_DM' };
        if (/\btalk here\b|\bstay here\b/.test(t)) return { intent: 'MOVE_THREAD' };
        if (/\bnew topic\b|\bstart over\b|\brestart\b/.test(t)) return { intent: 'NEW_TOPIC' };
        return { intent: 'NONE' };
    }

      private async handleControlIntent(intent: string, payload: any, messageOrInteraction: Message | ChatInputCommandInteraction): Promise<boolean> {
    const targetUser = 'user' in messageOrInteraction ? (messageOrInteraction as ChatInputCommandInteraction).user : (messageOrInteraction as Message).author;
    const userId = targetUser.id;
    const guildId = (messageOrInteraction as any).guildId || null;

    const logIntent = async (type: string, pl?: any) => {
      try { await prisma.intentLog.create({ data: { userId, type, payload: pl ?? undefined } }); } catch (err) { console.error('Failed to log intent:', err); }
    };

    const dm = await targetUser.createDM();

        switch (intent) {
          case 'PAUSE': {
            const minutes = Math.max(1, Math.min(1440, payload?.minutes ?? 60));
            const resumeAt = await this.userConsentService.pauseUser(userId, minutes);
            await dm.send(`⏸️ Paused for ${minutes} minutes. I’ll be quiet until <t:${Math.floor((resumeAt?.getTime() || Date.now())/1000)}:t>.`);
            await logIntent('PAUSE', { minutes });
            return true;
          }
          case 'RESUME': {
            await this.userConsentService.resumeUser(userId);
            await dm.send('▶️ Resumed. I’m listening again.');
            await logIntent('RESUME');
            return true;
          }
          case 'DELETE': {
            await dm.send('🔒 Got it. Deleting your data now…');
            const ok = await this.userConsentService.forgetUser(userId);
            await dm.send(ok ? '✅ Done. Your data has been deleted.' : '❌ I couldn’t delete your data. Please try again.');
            await logIntent('DELETE');
            return true;
          }
          case 'EXPORT': {
            const data = await this.userConsentService.exportUserData(userId);
            if (!data) { await dm.send('❌ I couldn’t export your data right now. Please try later.'); await logIntent('EXPORT', { ok: false }); return true; }
            const json = JSON.stringify(data, null, 2);
            await dm.send({ content: '📥 Your data export is ready.', files: [{ attachment: Buffer.from(json, 'utf-8'), name: 'export.json' }] });
            await logIntent('EXPORT', { ok: true });
            return true;
          }
          case 'MOVE_DM': {
            await this.userConsentService.setDmPreference(userId, true);
            await dm.send('📩 Okay! I’ll reply in DMs from now on.');
            await logIntent('MOVE_DM');
            return true;
          }
          case 'MOVE_THREAD': {
            await this.userConsentService.setDmPreference(userId, false);
            await dm.send('🧵 Got it. I’ll reply in your thread here.');
            await logIntent('MOVE_THREAD');
            return true;
          }
          case 'NEW_TOPIC': {
            // Clear lastThreadId to force a fresh thread next time
            await this.userConsentService.setLastThreadId(userId, null);
            await dm.send('🆕 New topic set. I’ll start a fresh thread next time.');
            await logIntent('NEW_TOPIC');
            return true;
          }
          default:
            return false;
        }
    }

    public async handleMessage(message: Message): Promise<void> {
        try {
            if (message.author.bot || message.content.startsWith('/')) return;

            const userId = message.author.id;

            // Opt-in required
            const isOptedIn = await this.userConsentService.isUserOptedIn(userId);
            if (!isOptedIn) return;

            // Cooldown
            if (this.withinCooldown(userId, 8000)) return;

            // Gating: only respond when addressed, mentioned, or in personal thread/DM
            const respond = await this.shouldRespond(message);
            if (!respond) return;

            // Intent detection (latent controls). If handled, stop.
            const ctrl = this.classifyControlIntent(message.content);
            if (ctrl.intent !== 'NONE') {
                const handled = await this.handleControlIntent(ctrl.intent, ctrl.payload, message);
                if (handled) return;
            }

            // Update activity
            await this.userConsentService.updateUserActivity(userId);
            this.optedInUsers.add(userId);

            if ('sendTyping' in message.channel) await message.channel.sendTyping();
            const commonAttachments: CommonAttachment[] = Array.from(message.attachments.values()).map(att => ({ name: att.name, url: att.url, contentType: att.contentType }));

            // Log incoming
            try { await prisma.messageLog.create({ data: { userId, guildId: message.guildId || undefined, channelId: message.channelId, threadId: message.channelId, msgId: message.id, role: 'user', content: message.content } }); } catch (err) { logger.warn('[CoreIntelSvc] Failed to log user message', { messageId: message.id, error: err }); }

            const responseOptions = await this._processPromptAndGenerateResponse(message.content, message.author.id, message.channel.id, message.guildId, commonAttachments, message);
            await message.reply(responseOptions);

            // Log assistant reply
            try { await prisma.messageLog.create({ data: { userId, guildId: message.guildId || undefined, channelId: message.channelId, threadId: message.channelId, msgId: `${message.id}:reply`, role: 'assistant', content: typeof responseOptions.content === 'string' ? responseOptions.content : '[embed]' } }); } catch (err) { logger.error('[CoreIntelSvc] Failed to log assistant reply:', { messageId: message.id, error: err }); }
        } catch (error) {
            logger.error('[CoreIntelSvc] Failed to handle message:', { messageId: message.id, error });
            console.error('Failed to send reply', error);
            try { await message.reply({ content: '🤖 Sorry, I encountered an error while processing your message. Please try again later.' }); } catch {}
        }
    }

    private async _processPromptAndGenerateResponse(
        promptText: string, userId: string, channelId: string, guildId: string | null,
        commonAttachments: CommonAttachment[], uiContext: ChatInputCommandInteraction | Message
    ): Promise<any> {
        const startTime = Date.now();
        const analyticsData = { guildId: guildId || undefined, userId, commandOrEvent: uiContext instanceof ChatInputCommandInteraction ? uiContext.commandName : 'messageCreate', promptLength: promptText.length, attachmentCount: commonAttachments.length, startTime };

        try {
            this.recordAnalyticsInteraction({ ...analyticsData, step: 'start_processing', isSuccess: true, duration: 0 });

            const messageForPipeline = this._createMessageForPipeline(uiContext, promptText, userId, commonAttachments);

            const moderationStatus = await this._performModeration(promptText, commonAttachments, userId, channelId, guildId, uiContext.id, analyticsData);
            if (moderationStatus.blocked) return { content: `🚫 Your message was blocked: ${moderationStatus.reason}` };
            if (moderationStatus.error) {
                logger.warn(`[CoreIntelSvc] Moderation check encountered an error: ${moderationStatus.error}. Proceeding with caution.`, analyticsData);
                // Decide if this non-block error is critical enough to halt. For now, we proceed.
            }

            const capabilities = await this._fetchUserCapabilities(userId, channelId, guildId, analyticsData);
            const unifiedAnalysis = await this._analyzeInput(messageForPipeline, commonAttachments, capabilities, analyticsData);

            const mcpOrchestrationResult = await this._executeMcpPipeline(messageForPipeline, unifiedAnalysis, capabilities, analyticsData);
            if (!mcpOrchestrationResult.success) {
                logger.warn(`[CoreIntelSvc] MCP Pipeline indicated failure or partial success. Tools executed: ${mcpOrchestrationResult.toolsExecuted.join(', ')}. Fallbacks: ${mcpOrchestrationResult.fallbacksUsed.join(', ')}`, analyticsData);
            }

            // Execute capabilities using unified orchestration results
            logger.debug(`[CoreIntelSvc] Stage 4.5: Capability Execution`, { userId: messageForPipeline.author.id });
            try {
                const capabilityResult = await this.capabilityService.executeCapabilitiesWithUnified(unifiedAnalysis, messageForPipeline, mcpOrchestrationResult);
                this.recordAnalyticsInteraction({ ...analyticsData, step: 'capabilities_executed', isSuccess: true, duration: Date.now() - analyticsData.startTime });
                logger.info(`[CoreIntelSvc] Capabilities executed: MCP(${!!capabilityResult.mcpResults}), Persona(${!!capabilityResult.personaSwitched}), Multimodal(${!!capabilityResult.multimodalProcessed})`, { analyticsData });
            } catch (error: any) {
                logger.warn(`[CoreIntelSvc] Capability execution encountered an error: ${error.message}. Continuing with processing.`, { error, ...analyticsData });
                this.recordAnalyticsInteraction({ ...analyticsData, step: 'capabilities_error', isSuccess: false, error: error.message, duration: Date.now() - analyticsData.startTime });
            }

            const history = await getHistory(channelId);
            const agenticContextData = await this._aggregateAgenticContext(messageForPipeline, unifiedAnalysis, capabilities, mcpOrchestrationResult, history, analyticsData);

            let { fullResponseText } = await this._generateAgenticResponse(
                agenticContextData, userId, channelId, guildId, commonAttachments,
                uiContext, history, capabilities, unifiedAnalysis, analyticsData
            );

            fullResponseText = await this._applyPostResponsePersonalization(userId, guildId, fullResponseText, analyticsData);

            await this._updateStateAndAnalytics({
                userId, channelId, promptText, attachments: commonAttachments, fullResponseText,
                unifiedAnalysis, mcpOrchestrationResult, analyticsData, success: true
            });

            const finalComponents = (this.config.enableEnhancedUI && this.enhancedUiService && !(uiContext instanceof ChatInputCommandInteraction && this.activeStreams.has(`${userId}-${channelId}`)))
                ? [this.enhancedUiService.createResponseActionRow()] : [];
            return { content: fullResponseText, components: finalComponents };

        } catch (error: any) {
            logger.error(`[CoreIntelSvc] Critical Error in _processPromptAndGenerateResponse: ${error.message}`, { error, stack: error.stack, ...analyticsData });
            console.error('Critical Error in _processPromptAndGenerateResponse', error);
            this.recordAnalyticsInteraction({ ...analyticsData, step: 'critical_error_caught', isSuccess: false, error: error.message, duration: Date.now() - startTime });
            return { content: "🤖 Sorry, I encountered a critical internal error. Please try again later." };
        } finally {
            logger.info(`[CoreIntelSvc] Processing pipeline finished.`, { ...analyticsData, success: !(analyticsData as any).error, duration: Date.now() - startTime });
        }
    }

    private _createMessageForPipeline(uiContext: Message | ChatInputCommandInteraction, promptText: string, userId: string, commonAttachments: CommonAttachment[]): Message {
        if (uiContext instanceof Message) return uiContext;
        const interaction = uiContext;
        return {
            id: interaction.id, content: promptText, author: { id: userId, bot: false, toString: () => `<@${userId}>` } as any,
            channelId: interaction.channelId, guildId: interaction.guildId, client: interaction.client,
            attachments: new Collection(commonAttachments.map((att, i) => {
                const attachmentData = { id: `${interaction.id}_att_${i}`, name: att.name || new URL(att.url).pathname.split('/').pop() || 'attachment', url: att.url, contentType: att.contentType || 'application/octet-stream', size: 0, proxyURL: att.url, height: null, width: null, ephemeral: false, };
                return [attachmentData.id, attachmentData as Attachment];
            })),
            channel: interaction.channel, guild: interaction.guild, member: interaction.member,
            createdTimestamp: interaction.createdTimestamp, editedTimestamp: null,
            toString: () => promptText,
            fetchReference: async () => { logger.warn('[CoreIntelSvc] Mocked fetchReference called.'); throw new Error("Not implemented on mock."); },
        } as unknown as Message;
    }

    private async _performModeration(promptText: string, attachments: CommonAttachment[], userId: string, channelId: string, guildId: string | null, messageId: string, analyticsData: any): Promise<{ blocked: boolean, reason?: string, error?: string }> {
        try {
            const textModerationResult = await this.moderationService.moderateText(promptText, { guildId: guildId || '', userId, channelId, messageId });
            if (textModerationResult.action === 'block') {
                this.recordAnalyticsInteraction({ ...analyticsData, step: 'moderation_block_text', isSuccess: false, error: 'Text content blocked', duration: Date.now() - analyticsData.startTime });
                return { blocked: true, reason: textModerationResult.verdict.reason || 'Content flagged as unsafe' };
            }
            for (const att of attachments) {
                if (att.contentType?.startsWith('image/')) {
                    const imageModerationResult = await this.moderationService.moderateImage(att.url, att.contentType, { guildId: guildId || '', userId, channelId, messageId });
                    if (imageModerationResult.action === 'block') {
                        this.recordAnalyticsInteraction({ ...analyticsData, step: 'moderation_block_image', isSuccess: false, error: 'Image blocked', duration: Date.now() - analyticsData.startTime });
                        return { blocked: true, reason: imageModerationResult.verdict.reason || 'Image flagged as unsafe' };
                    }
                }
            }
            this.recordAnalyticsInteraction({ ...analyticsData, step: 'moderation_passed', isSuccess: true, duration: Date.now() - analyticsData.startTime });
            return { blocked: false };
        } catch (error: any) {
            logger.error(`[CoreIntelSvc] Error in _performModeration: ${error.message}`, { error, stack: error.stack, ...analyticsData });
            this.recordAnalyticsInteraction({ ...analyticsData, step: 'moderation_error', isSuccess: false, error: error.message, duration: Date.now() - analyticsData.startTime });
            return { blocked: false, error: "Moderation check failed." };
        }
    }

    private async _fetchUserCapabilities(userId: string, channelId: string, guildId: string | null, analyticsData: any): Promise<UserCapabilities> {
        logger.debug(`[CoreIntelSvc] Stage 2: Get User Capabilities`, { userId });
        try {
            const capabilities = await this.permissionService.getUserCapabilities(userId, { guildId: guildId || undefined, channelId, userId });
            this.recordAnalyticsInteraction({ ...analyticsData, step: 'capabilities_fetched', isSuccess: true, duration: Date.now() - analyticsData.startTime });
            return capabilities;
        } catch (error: any) {
            logger.error(`[CoreIntelSvc] Critical Error in _fetchUserCapabilities: ${error.message}`, { error, stack: error.stack, ...analyticsData });
            this.recordAnalyticsInteraction({ ...analyticsData, step: 'capabilities_error', isSuccess: false, error: error.message, duration: Date.now() - analyticsData.startTime });
            throw new Error(`Critical: Failed to fetch user capabilities for ${userId}.`);
        }
    }

    private async _analyzeInput(messageForPipeline: Message, commonAttachments: CommonAttachment[], capabilities: UserCapabilities, analyticsData: any): Promise<UnifiedMessageAnalysis> {
        logger.debug(`[CoreIntelSvc] Stage 3: Message Analysis`, { userId: messageForPipeline.author.id });
        try {
            const analysisAttachmentsData: AttachmentInfo[] = commonAttachments.map((a: any) => ({ 
                name: a.name || new URL(a.url).pathname.split('/').pop() || 'attachment', 
                url: a.url, 
                contentType: a.contentType || undefined 
            }));
            const unifiedAnalysis = await unifiedMessageAnalysisService.analyzeMessage(messageForPipeline, analysisAttachmentsData, capabilities);
            this.recordAnalyticsInteraction({ ...analyticsData, step: 'message_analyzed', isSuccess: true, duration: Date.now() - (analyticsData.startTime || Date.now()) });
            return unifiedAnalysis;
        } catch (error: any) {
            logger.error(`[CoreIntelSvc] Critical Error in _analyzeInput: ${error.message}`, { error, stack: error.stack, ...analyticsData });
            this.recordAnalyticsInteraction({ ...analyticsData, step: 'analysis_error', isSuccess: false, error: error.message, duration: Date.now() - (analyticsData.startTime || Date.now()) });
            throw new Error(`Critical: Failed to analyze input for user ${messageForPipeline.author.id}.`);
        }
    }

    private async _executeMcpPipeline(messageForAnalysis: Message, unifiedAnalysis: UnifiedMessageAnalysis, capabilities: UserCapabilities, analyticsData: any): Promise<MCPOrchestrationResult> {
        logger.debug(`[CoreIntelSvc] Stage 4: MCP Orchestration`, { userId: messageForAnalysis.author.id });
        try {
            const mcpResult = await this.mcpOrchestrator.orchestrateIntelligentResponse(messageForAnalysis, unifiedAnalysis, capabilities);
            logger.info(`[CoreIntelSvc] MCP Orchestration completed. Success: ${mcpResult.success}, Tools: ${mcpResult.toolsExecuted.join(',') || 'None'}`, { analyticsData });
            this.recordAnalyticsInteraction({ ...analyticsData, step: 'mcp_orchestrated', isSuccess: mcpResult.success, mcpToolsExecuted: mcpResult.toolsExecuted.join(','), duration: Date.now() - analyticsData.startTime });
            return mcpResult;
        } catch (error: any) {
            logger.error(`[CoreIntelSvc] Error in _executeMcpPipeline: ${error.message}`, { error, stack: error.stack, ...analyticsData });
            this.recordAnalyticsInteraction({ ...analyticsData, step: 'mcp_pipeline_error', isSuccess: false, error: error.message, duration: Date.now() - analyticsData.startTime });
            return { success: false, phase: 0, toolsExecuted: [], results: new Map(), fallbacksUsed: ['pipeline_error'], executionTime: 0, confidence: 0, recommendations: ["MCP pipeline encountered an unexpected error."] };
        }
    }

    private async _aggregateAgenticContext(messageForAnalysis: Message, unifiedAnalysis: UnifiedMessageAnalysis, capabilities: UserCapabilities, mcpOrchestrationResult: MCPOrchestrationResult, history: ChatMessage[], analyticsData: any): Promise<EnhancedContext> {
        logger.debug(`[CoreIntelSvc] Stage 5: Context Aggregation`, { userId: messageForAnalysis.author.id });
        try {
            // Use the contextService.buildEnhancedContextWithUnified for proper unified MCP integration
            const agenticContextData = await this.contextService.buildEnhancedContextWithUnified(messageForAnalysis, unifiedAnalysis, capabilities, mcpOrchestrationResult);
            this.recordAnalyticsInteraction({ ...analyticsData, step: 'context_aggregated', isSuccess: true, duration: Date.now() - analyticsData.startTime });
            return agenticContextData;
        } catch (error: any) {
            logger.error(`[CoreIntelSvc] Critical Error in _aggregateAgenticContext: ${error.message}`, { error, stack: error.stack, ...analyticsData });
            this.recordAnalyticsInteraction({ ...analyticsData, step: 'context_aggregation_error', isSuccess: false, error: error.message, duration: Date.now() - analyticsData.startTime });
            throw new Error(`Critical: Failed to aggregate agentic context for user ${messageForAnalysis.author.id}.`);
        }
    }

    private async _generateAgenticResponse(
        enhancedContext: EnhancedContext,
        userId: string, channelId: string, guildId: string | null, commonAttachments: CommonAttachment[],
        uiContext: ChatInputCommandInteraction | Message, history: ChatMessage[], capabilities: UserCapabilities,
        unifiedAnalysis: UnifiedMessageAnalysis, analyticsData: any
    ): Promise<{ agenticResponse: AgenticResponse, fullResponseText: string }> {
        try {
            if (this.config.enablePersonalization && this.smartRecommendations) {
                logger.debug(`[CoreIntelSvc] Stage 6: Personalization - Pre-Response`, analyticsData);
                // Assuming richPromptFromContext was enhancedContext.prompt
                const toolRecs = await this.smartRecommendations.getContextualToolRecommendations({ 
                    userId, 
                    guildId: guildId || undefined, 
                    currentMessage: enhancedContext.prompt,
                    activeTools: unifiedAnalysis.requiredTools,
                    userExpertise: unifiedAnalysis.complexity 
                });
                logger.debug(`[CoreIntelSvc] Personalized Tool Recommendations: ${toolRecs.length} recommendations.`);
                this.recordAnalyticsInteraction({ ...analyticsData, step: 'personalization_preresponse', isSuccess: true, duration: Date.now() - analyticsData.startTime });
            }

            logger.debug(`[CoreIntelSvc] Stage 7: Response Generation`, analyticsData);
            const agenticQuery: AgenticQuery = {
                query: enhancedContext.prompt,
                userId, channelId,
                context: { 
                    previousMessages: history, 
                    userRole: capabilities.hasAdminCommands ? 'admin' : 'user', 
                    userPermissions: Object.keys(capabilities).filter(k => capabilities[k as keyof UserCapabilities] === true) 
                },
                options: { guildId: guildId || 'default', includeCitations: this.config.enableAgenticFeatures }
                // Note: AgenticQuery doesn't support attachments - they would need to be passed separately
            };

            // Streaming not currently available in AgenticIntelligenceService
            logger.debug(`[CoreIntelSvc] Generating non-streamed response.`, analyticsData);
            // RAG: fetch top knowledge base snippets
            let ragPrefixedQuery = agenticQuery.query;
            try {
              const kbResults = await knowledgeBaseService.search({ query: agenticQuery.query, channelId, limit: 3, minConfidence: 0.6 });
              if (kbResults.length > 0) {
                const ctx = kbResults.map((r, i) => `(${i+1}) [${r.source}] conf=${Math.round(r.confidence*100)}%: ${r.content.slice(0, 500)}`).join('\n');
                const preamble = `You must ground answers in the retrieved context below. If insufficient, say you don't know.\nRetrieved Context:\n${ctx}\n---\n`;
                ragPrefixedQuery = `${preamble}${agenticQuery.query}`;
              }
            } catch (_) { /* ignore RAG failures */ }

            const fullResponseText: string = await modelRouterService.generate(
              ragPrefixedQuery,
              history,
              userId,
              guildId || 'default'
            );
            const agenticResponse: AgenticResponse = {
              response: fullResponseText,
              confidence: 0.8,
              citations: { citations: [], hasCitations: false, confidence: 0 },
              flagging: { shouldFlag: false, reasons: [], riskLevel: 'low' },
              escalation: { shouldEscalate: false, priority: 'low', reason: '' },
              knowledgeGrounded: kbResults.length > 0,
              sourceSummary: '',
              metadata: { processingTime: 0, knowledgeEntriesFound: 0, responseQuality: 'high' }
            };
            this.recordAnalyticsInteraction({ ...analyticsData, step: 'response_generated', isSuccess: true, responseLength: fullResponseText.length, duration: Date.now() - analyticsData.startTime });
            return { agenticResponse, fullResponseText };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            logger.error(`[CoreIntelSvc] Critical Error in _generateAgenticResponse: ${errorMessage}`, { error, stack: errorStack, ...analyticsData });
            this.recordAnalyticsInteraction({ ...analyticsData, step: 'agentic_response_error', isSuccess: false, error: errorMessage, duration: Date.now() - analyticsData.startTime });
            throw new Error(`Critical: Failed to generate agentic response for user ${userId}.`);
        }
    }

    private async _applyPostResponsePersonalization(userId: string, guildId: string | null, responseText: string, analyticsData: Record<string, unknown> & { startTime: number }): Promise<string> {
        if (!this.config.enablePersonalization || !this.personalizationEngine) return responseText;
        try {
            logger.debug(`[CoreIntelSvc] Stage 8: Personalization - Post-Response`, { userId });
            const adapted = await this.personalizationEngine.adaptResponse(userId, responseText, guildId || undefined);
            this.recordAnalyticsInteraction({ ...analyticsData, step: 'personalization_postresponse', isSuccess: true, duration: Date.now() - analyticsData.startTime });
            return adapted.personalizedResponse;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            logger.warn(`[CoreIntelSvc] Error in _applyPostResponsePersonalization: ${errorMessage}. Proceeding with non-personalized response.`, { error, stack: errorStack, ...analyticsData });
            this.recordAnalyticsInteraction({ ...analyticsData, step: 'personalization_postresponse_error', isSuccess: false, error: errorMessage, duration: Date.now() - analyticsData.startTime });
            return responseText;
        }
    }

    private async _updateStateAndAnalytics(data: { userId: string, channelId: string, promptText: string, attachments: CommonAttachment[], fullResponseText: string, unifiedAnalysis: UnifiedMessageAnalysis, mcpOrchestrationResult: MCPOrchestrationResult, analyticsData: Record<string, unknown> & { startTime: number }, success: boolean }): Promise<void> {
        const { userId, channelId, promptText, attachments, fullResponseText, unifiedAnalysis, mcpOrchestrationResult, analyticsData, success } = data;
        logger.debug(`[CoreIntelSvc] Stage 9: Update History, Cache, Memory`, { userId });
        try {
            const historyContentForUpdate = attachments.length > 0 && attachments[0].contentType?.startsWith('image/') && attachments[0].url
                ? [{ text: promptText }, await urlToGenerativePart(attachments[0].url, attachments[0].contentType || 'image/jpeg')]
                : promptText;
            if (Array.isArray(historyContentForUpdate)) await updateHistoryWithParts(channelId, historyContentForUpdate, fullResponseText);
            else await updateHistory(channelId, historyContentForUpdate, fullResponseText);
            this.lastPromptCache.set(userId, { prompt: promptText, attachments, channelId });
            if (this.config.enableResponseCache && this.enhancedCacheService && attachments.length === 0) this.enhancedCacheService.cacheResponse(promptText, userId, fullResponseText);
            if (this.config.enableEnhancedMemory && this.enhancedMemoryService) {
                // Construct ProcessingContext for EnhancedMemoryService
                const analysisForMemory: EnhancedMessageAnalysis = {
                    hasAttachments: attachments.length > 0,
                    hasUrls: unifiedAnalysis.urls?.length > 0,
                    attachmentTypes: attachments.map((att: CommonAttachment) => att.contentType?.split('/')[0] || 'unknown'), // e.g., 'image', 'application'
                    urls: unifiedAnalysis.urls || [],
                    complexity: unifiedAnalysis.complexity === 'advanced' ? 'complex' : unifiedAnalysis.complexity,
                    intents: unifiedAnalysis.intents || [],
                    requiredTools: unifiedAnalysis.mcpRequirements || [],
                };

                const resultsForMemory = new Map<string, unknown>();
                if (mcpOrchestrationResult && mcpOrchestrationResult.results) {
                    for (const [key, value] of mcpOrchestrationResult.results.entries()) {
                        if (value.success && value.data) {
                            resultsForMemory.set(key, value.data);
                        } else if (value.error) {
                            resultsForMemory.set(key, { error: value.error }); // Store error info
                        }
                    }
                }

                const processingContextForMemory: EnhancedProcessingContext = {
                    userId,
                    channelId,
                    guildId: typeof analyticsData.guildId === 'string' ? analyticsData.guildId : null, // from analyticsData which has guildId
                    analysis: analysisForMemory,
                    results: resultsForMemory,
                    errors: mcpOrchestrationResult.fallbacksUsed || [],
                };
                await this.enhancedMemoryService.storeConversationMemory(processingContextForMemory, promptText, fullResponseText);
            }
            if (this.config.enablePersonalization && this.behaviorAnalytics && success) {
                await this.behaviorAnalytics.recordBehaviorMetric({ userId, metricType: 'session_length', value: 1, timestamp: new Date() });
            }
            this.recordAnalyticsInteraction({ ...analyticsData, step: 'final_updates_complete', isSuccess: success, duration: Date.now() - analyticsData.startTime });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            logger.error(`[CoreIntelSvc] Error in _updateStateAndAnalytics: ${errorMessage}`, { error, stack: errorStack, ...analyticsData });
            this.recordAnalyticsInteraction({ ...analyticsData, step: 'state_update_error', isSuccess: false, error: errorMessage, duration: Date.now() - analyticsData.startTime });
        }
    }

    private async handleButtonPress(interaction: ButtonInteraction): Promise<void> {
        const userId = interaction.user.id;
        const streamKey = `${userId}-${interaction.channelId}`;
        if (interaction.customId === STOP_BUTTON_ID) {
            const stream = this.activeStreams.get(streamKey);
            if (stream) { stream.abortController.abort(); this.activeStreams.delete(streamKey); logger.info('Streaming response stopped by user', { userId, channelId: interaction.channelId }); }
            await interaction.update({ content: interaction.message.content, components: [] });
        } else if (interaction.customId === REGENERATE_BUTTON_ID) {
            const cachedPrompt = this.lastPromptCache.get(userId);
            if (!cachedPrompt || cachedPrompt.channelId !== interaction.channelId) {
                await interaction.reply({ content: 'No recent prompt found for this channel to regenerate.', ephemeral: true }); return;
            }
            await interaction.update({ content: `${interaction.message.content}\n\n🔄 Regenerating...`, components: [] });
            
            // Create a mock interaction-like object for regeneration
            const mockInteraction = {
                channelId: cachedPrompt.channelId,
                guildId: interaction.guildId,
                user: interaction.user
            } as ChatInputCommandInteraction;
            
            const regeneratedResponseOptions = await this._processPromptAndGenerateResponse(cachedPrompt.prompt, userId, cachedPrompt.channelId, interaction.guildId, cachedPrompt.attachments, mockInteraction);
            
            if (interaction.channel && 'send' in interaction.channel) {
                await interaction.channel.send(regeneratedResponseOptions);
            }
        } else if (interaction.customId === MOVE_DM_BUTTON_ID) {
            await this.userConsentService.setDmPreference(userId, true);
            await interaction.reply({ content: 'Okay! I’ll reply in DMs from now on.', ephemeral: true });
        }
    }
}
