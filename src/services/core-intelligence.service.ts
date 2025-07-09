import {
    Interaction,
    Message,
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ButtonInteraction,
    EmbedBuilder,
    Collection,
    Attachment,
    Client // Added Client for _createMessageForPipeline
} from 'discord.js';
import { URL } from 'url';

// MCP specific
import { MCPManager } from './mcp-manager.service';
import { UnifiedMCPOrchestratorService, MCPOrchestrationResult, MCPToolResult } from './core/mcp-orchestrator.service';

// Agentic and Gemini
import { AgenticIntelligenceService, AgenticQuery, AgenticResponse } from './agentic-intelligence.service';
import { GeminiService } from './gemini.service';

// Core Intelligence Sub-Services
import {
    intelligencePermissionService,
    UserCapabilities,
    intelligenceContextService,
    EnhancedContext,
    // IntelligenceAnalysis, // Not directly used here, adapted from UnifiedMessageAnalysis
    intelligenceAdminService,
    intelligenceCapabilityService
} from './intelligence';
import { unifiedMessageAnalysisService, UnifiedMessageAnalysis, AttachmentAnalysis } from './core/message-analysis.service';

// Enhanced Intelligence Sub-Services (conditionally used)
import { EnhancedMemoryService } from './enhanced-intelligence/memory.service';
import { EnhancedUIService } from './enhanced-intelligence/ui.service';
import { EnhancedResponseService } from './enhanced-intelligence/response.service';
import { EnhancedCacheService } from './enhanced-intelligence/cache.service';
import { PersonalizationEngine } from './enhanced-intelligence/personalization-engine.service';
import { UserBehaviorAnalyticsService } from './enhanced-intelligence/behavior-analytics.service';
import { SmartRecommendationService } from './enhanced-intelligence/smart-recommendation.service';
import { UserMemoryService } from '../memory/user-memory.service';
import { ProcessingContext as EnhancedProcessingContext, MessageAnalysis as EnhancedMessageAnalysis } from './enhanced-intelligence/types';


// Utilities and Others
import { logger } from '../utils/logger';
import { logInteraction } from './analytics';
import { ChatMessage, getHistory, updateHistory, updateHistoryWithParts } from './context-manager';
import { ModerationService } from '../moderation/moderation-service';
import { REGENERATE_BUTTON_ID, STOP_BUTTON_ID } from '../ui/components';
import { urlToGenerativePart } from '../utils/image-helper';
// import { sendStream } from '../ui/stream-utils'; // sendStream is used by EnhancedUIService

// Local MCPResultValue types for context aggregation (ideally imported or shared)
type LocalWebSearchResult = { query: string; results: Array<{ title: string; description: string; url: string; snippet: string; }>; metadata: any; };
type LocalContentExtractionResult = { urls: Array<{ url: string; title: string; content: string; metadata: any; }>; };
type LocalOSRSDataResult = { query: string; data: string; metadata: any; };
type LocalMCPResultValue = LocalWebSearchResult | LocalContentExtractionResult | LocalOSRSDataResult | { error: string } | { data: any };


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
}

export class CoreIntelligenceService {
    private readonly config: CoreIntelligenceConfig;
    private optedInUsers = new Set<string>();
    private activeStreams = new Map<string, { abortController: AbortController; isStreaming: boolean }>();
    private lastPromptCache = new Map<string, { prompt: string; attachments: CommonAttachment[]; channelId: string }>();

    private readonly mcpOrchestrator: UnifiedMCPOrchestratorService;
    private readonly agenticIntelligence: AgenticIntelligenceService;
    private readonly geminiService: GeminiService;
    private readonly moderationService: ModerationService;
    private readonly permissionService: typeof intelligencePermissionService;
    private readonly contextService: typeof intelligenceContextService;
    private readonly adminService: typeof intelligenceAdminService;
    private readonly capabilityService: typeof intelligenceCapabilityService;
    private readonly messageAnalysisService: typeof unifiedMessageAnalysisService;
    private readonly userMemoryService: UserMemoryService;

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
        this.mcpOrchestrator = new UnifiedMCPOrchestratorService(config.mcpManager);
        this.geminiService = new GeminiService();
        this.moderationService = new ModerationService();
        this.permissionService = intelligencePermissionService;
        this.contextService = intelligenceContextService;
        this.adminService = intelligenceAdminService;
        this.capabilityService = intelligenceCapabilityService;
        this.messageAnalysisService = unifiedMessageAnalysisService;
        this.userMemoryService = new UserMemoryService();

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
        this.mcpOrchestrator.initialize().catch(err => logger.error('MCP Orchestrator failed to init in CoreIntelligenceService', err));
        logger.info('CoreIntelligenceService initialized', { config: this.config });
    }

    /**
     * Analytics wrapper to match expected interface
     */
    private recordAnalyticsInteraction(data: any): void {
        // Simple wrapper around the existing analytics function
        if (data.isSuccess !== undefined) {
            logInteraction({
                guildId: data.guildId || null,
                userId: data.userId || 'unknown',
                command: data.step || 'core-intelligence',
                isSuccess: data.isSuccess
            }).catch(err => logger.warn('Analytics logging failed', err));
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
            if (interaction.isRepliable()) {
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

        if (!this.optedInUsers.has(userId)) {
             this.optedInUsers.add(userId);
             await this.saveOptedInUsers();
        }
        await interaction.deferReply();
        const commonAttachments: CommonAttachment[] = [];
        if (discordAttachment) {
            commonAttachments.push({ name: discordAttachment.name, url: discordAttachment.url, contentType: discordAttachment.contentType });
        }
        const messageOptions = await this._processPromptAndGenerateResponse(promptText, userId, interaction.channelId, interaction.guildId, commonAttachments, interaction);
        await interaction.editReply(messageOptions);
    }

    public async handleMessage(message: Message): Promise<void> {
        if (message.author.bot || !this.optedInUsers.has(message.author.id) || message.content.startsWith('/') || (message.content.length < 3 && message.attachments.size === 0)) {
            return;
        }
        if ('sendTyping' in message.channel) await message.channel.sendTyping();
        const commonAttachments: CommonAttachment[] = Array.from(message.attachments.values()).map(att => ({ name: att.name, url: att.url, contentType: att.contentType }));
        const responseOptions = await this._processPromptAndGenerateResponse(message.content, message.author.id, message.channel.id, message.guildId, commonAttachments, message);
        await message.reply(responseOptions);
    }

    private async _processPromptAndGenerateResponse(
        promptText: string, userId: string, channelId: string, guildId: string | null,
        commonAttachments: CommonAttachment[], uiContext: ChatInputCommandInteraction | Message
    ): Promise<any> {
        const startTime = Date.now();
        const analyticsData: Record<string, any> = { guildId, userId, commandOrEvent: uiContext instanceof ChatInputCommandInteraction ? uiContext.commandName : 'messageCreate', promptLength: promptText.length, attachmentCount: commonAttachments.length, startTime };

        try {
            recordAnalyticsInteraction({ ...analyticsData, step: 'start_processing', isSuccess: true, duration: 0 });

            const messageForPipeline = this._createMessageForPipeline(uiContext, promptText, userId, commonAttachments);

            const moderationStatus = await this._performModeration(promptText, commonAttachments, userId, channelId, guildId, uiContext.id, analyticsData);
            if (moderationStatus.blocked) return { content: `🚫 Your message was blocked: ${moderationStatus.reason}` };
            if (moderationStatus.error) {
                logger.warn(`[CoreIntelSvc] Moderation check encountered an error: ${moderationStatus.error}. Proceeding with caution.`, analyticsData);
                // Decide if this non-block error is critical enough to halt. For now, we proceed.
            }

            const capabilities = await this._fetchUserCapabilities(userId, channelId, guildId, analyticsData);
            const unifiedAnalysis = await this._analyzeInput(messageForPipeline, commonAttachments, capabilities, analyticsData);

            let mcpOrchestrationResult = await this._executeMcpPipeline(messageForPipeline, unifiedAnalysis, capabilities, analyticsData);
            if (!mcpOrchestrationResult.success) {
                logger.warn(`[CoreIntelSvc] MCP Pipeline indicated failure or partial success. Tools executed: ${mcpOrchestrationResult.toolsExecuted.join(', ')}. Fallbacks: ${mcpOrchestrationResult.fallbacksUsed.join(', ')}`, analyticsData);
            }

            const history = await getHistory(channelId);
            const agenticContextData = await this._aggregateAgenticContext(messageForPipeline, unifiedAnalysis, capabilities, mcpOrchestrationResult, history, analyticsData);

            let { agenticResponse, fullResponseText } = await this._generateAgenticResponse(
                agenticContextData, userId, channelId, guildId, commonAttachments,
                uiContext, history, capabilities, unifiedAnalysis, analyticsData
            );

            fullResponseText = await this._applyPostResponsePersonalization(userId, guildId, fullResponseText, analyticsData);

            await this._updateStateAndAnalytics({
                userId, channelId, promptText, attachments: commonAttachments, fullResponseText,
                unifiedAnalysis, mcpOrchestrationResult, analyticsData, success: true
            });

            const finalComponents = (this.config.enableEnhancedUI && this.enhancedUiService && !(uiContext instanceof ChatInputCommandInteraction && this.activeStreams.has(`${userId}-${channelId}`)))
                ? this.enhancedUiService.getStandardResponseComponents() : [];
            return { content: fullResponseText, components: finalComponents };

        } catch (error: any) {
            logger.error(`[CoreIntelSvc] Critical Error in _processPromptAndGenerateResponse: ${error.message}`, { error, stack: error.stack, ...analyticsData });
            recordAnalyticsInteraction({ ...analyticsData, step: 'critical_error_caught', isSuccess: false, error: error.message, duration: Date.now() - startTime });
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
        } as Message;
    }

    private async _performModeration(promptText: string, attachments: CommonAttachment[], userId: string, channelId: string, guildId: string | null, messageId: string, analyticsData: any): Promise<{ blocked: boolean, reason?: string, error?: string }> {
        try {
            const textModerationResult = await this.moderationService.moderateText(promptText, { guildId, userId, channelId, messageId });
            if (textModerationResult.action === 'block') {
                recordAnalyticsInteraction({ ...analyticsData, step: 'moderation_block_text', isSuccess: false, error: 'Text content blocked', duration: Date.now() - analyticsData.startTime });
                return { blocked: true, reason: textModerationResult.verdict.reason || 'Content flagged as unsafe' };
            }
            for (const att of attachments) {
                if (att.contentType?.startsWith('image/')) {
                    const imageModerationResult = await this.moderationService.moderateImage(att.url, att.contentType, { guildId, userId, channelId, messageId });
                    if (imageModerationResult.action === 'block') {
                        recordAnalyticsInteraction({ ...analyticsData, step: 'moderation_block_image', isSuccess: false, error: 'Image blocked', duration: Date.now() - analyticsData.startTime });
                        return { blocked: true, reason: imageModerationResult.verdict.reason || 'Image flagged as unsafe' };
                    }
                }
            }
            recordAnalyticsInteraction({ ...analyticsData, step: 'moderation_passed', isSuccess: true, duration: Date.now() - analyticsData.startTime });
            return { blocked: false };
        } catch (error: any) {
            logger.error(`[CoreIntelSvc] Error in _performModeration: ${error.message}`, { error, stack: error.stack, ...analyticsData });
            recordAnalyticsInteraction({ ...analyticsData, step: 'moderation_error', isSuccess: false, error: error.message, duration: Date.now() - analyticsData.startTime });
            return { blocked: false, error: "Moderation check failed." };
        }
    }

    private async _fetchUserCapabilities(userId: string, channelId: string, guildId: string | null, analyticsData: any): Promise<UserCapabilities> {
        logger.debug(`[CoreIntelSvc] Stage 2: Get User Capabilities`, { userId });
        try {
            const capabilities = await this.permissionService.getUserCapabilities(userId, { guildId, channelId, userId });
            recordAnalyticsInteraction({ ...analyticsData, step: 'capabilities_fetched', isSuccess: true, duration: Date.now() - analyticsData.startTime });
            return capabilities;
        } catch (error: any) {
            logger.error(`[CoreIntelSvc] Critical Error in _fetchUserCapabilities: ${error.message}`, { error, stack: error.stack, ...analyticsData });
            recordAnalyticsInteraction({ ...analyticsData, step: 'capabilities_error', isSuccess: false, error: error.message, duration: Date.now() - analyticsData.startTime });
            throw new Error(`Critical: Failed to fetch user capabilities for ${userId}.`);
        }
    }

    private async _analyzeInput(messageForPipeline: Message, commonAttachments: CommonAttachment[], capabilities: UserCapabilities, analyticsData: any): Promise<UnifiedMessageAnalysis> {
        logger.debug(`[CoreIntelSvc] Stage 3: Message Analysis`, { userId: messageForPipeline.author.id });
        try {
            const analysisAttachmentsData: AttachmentAnalysisData[] = commonAttachments.map(a => ({ name: a.name || new URL(a.url).pathname.split('/').pop() || 'attachment', url: a.url, contentType: a.contentType || 'application/octet-stream' }));
            const unifiedAnalysis = await this.messageAnalysisService.analyzeMessage(messageForPipeline, analysisAttachmentsData, capabilities);
            recordAnalyticsInteraction({ ...analyticsData, step: 'message_analyzed', isSuccess: true, duration: Date.now() - (analyticsData.startTime || Date.now()) });
            return unifiedAnalysis;
        } catch (error: any) {
            logger.error(`[CoreIntelSvc] Critical Error in _analyzeInput: ${error.message}`, { error, stack: error.stack, ...analyticsData });
            recordAnalyticsInteraction({ ...analyticsData, step: 'analysis_error', isSuccess: false, error: error.message, duration: Date.now() - (analyticsData.startTime || Date.now()) });
            throw new Error(`Critical: Failed to analyze input for user ${messageForPipeline.author.id}.`);
        }
    }

    private async _executeMcpPipeline(messageForAnalysis: Message, unifiedAnalysis: UnifiedMessageAnalysis, capabilities: UserCapabilities, analyticsData: any): Promise<MCPOrchestrationResult> {
        logger.debug(`[CoreIntelSvc] Stage 4: MCP Orchestration`, { userId: messageForAnalysis.author.id });
        try {
            const mcpResult = await this.mcpOrchestrator.orchestrateIntelligentResponse(messageForAnalysis, unifiedAnalysis, capabilities);
            logger.info(`[CoreIntelSvc] MCP Orchestration completed. Success: ${mcpResult.success}, Tools: ${mcpResult.toolsExecuted.join(',') || 'None'}`, { analyticsData });
            recordAnalyticsInteraction({ ...analyticsData, step: 'mcp_orchestrated', isSuccess: mcpResult.success, mcpToolsExecuted: mcpResult.toolsExecuted.join(','), duration: Date.now() - analyticsData.startTime });
            return mcpResult;
        } catch (error: any) {
            logger.error(`[CoreIntelSvc] Error in _executeMcpPipeline: ${error.message}`, { error, stack: error.stack, ...analyticsData });
            recordAnalyticsInteraction({ ...analyticsData, step: 'mcp_pipeline_error', isSuccess: false, error: error.message, duration: Date.now() - analyticsData.startTime });
            return { success: false, phase: 0, toolsExecuted: [], results: new Map(), fallbacksUsed: ['pipeline_error'], executionTime: 0, confidence: 0, recommendations: ["MCP pipeline encountered an unexpected error."] };
        }
    }

    private async _aggregateAgenticContext(messageForAnalysis: Message, unifiedAnalysis: UnifiedMessageAnalysis, capabilities: UserCapabilities, mcpOrchestrationResult: MCPOrchestrationResult, history: ChatMessage[], analyticsData: any): Promise<EnhancedContext> {
        logger.debug(`[CoreIntelSvc] Stage 5: Context Aggregation`, { userId: messageForAnalysis.author.id });
        try {
            const adaptedAnalysisForContext = this.contextService.adaptAnalysisInterface(unifiedAnalysis);
            const adaptedMcpResultsForContext = new Map<string, LocalMCPResultValue>();
            if (mcpOrchestrationResult && mcpOrchestrationResult.results) {
                for (const [toolId, toolResult] of mcpOrchestrationResult.results.entries()) {
                    if (toolResult.success && toolResult.data) {
                        if (toolId.includes('search') && (toolResult.data as any).results) adaptedMcpResultsForContext.set('webSearch', toolResult.data as LocalWebSearchResult);
                        else if (toolId.includes('extraction') && (toolResult.data as any).urls) adaptedMcpResultsForContext.set('contentExtraction', toolResult.data as LocalContentExtractionResult);
                        else if (toolId.includes('osrs') && (toolResult.data as any).data) adaptedMcpResultsForContext.set('osrsData', toolResult.data as LocalOSRSDataResult);
                        else { adaptedMcpResultsForContext.set(toolId, { data: toolResult.data }); logger.debug(`[CoreIntelSvc] Passing raw data for toolId: ${toolId} to buildEnhancedContext`);}
                    } else if (!toolResult.success && toolResult.error) adaptedMcpResultsForContext.set(toolId, { error: toolResult.error });
                }
            }
            const agenticContextData = await this.contextService.buildEnhancedContext(messageForAnalysis, adaptedAnalysisForContext, capabilities, adaptedMcpResultsForContext );
            recordAnalyticsInteraction({ ...analyticsData, step: 'context_aggregated', isSuccess: true, duration: Date.now() - analyticsData.startTime });
            return agenticContextData;
        } catch (error: any) {
            logger.error(`[CoreIntelSvc] Critical Error in _aggregateAgenticContext: ${error.message}`, { error, stack: error.stack, ...analyticsData });
            recordAnalyticsInteraction({ ...analyticsData, step: 'context_aggregation_error', isSuccess: false, error: error.message, duration: Date.now() - analyticsData.startTime });
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
                const toolRecs = await this.smartRecommendations.getContextualToolRecommendations({ userId, guildId, currentMessage: enhancedContext.prompt, analysis: unifiedAnalysis });
                logger.debug(`[CoreIntelSvc] Personalized Tool Recommendations: ${toolRecs.length} recommendations.`);
                recordAnalyticsInteraction({ ...analyticsData, step: 'personalization_preresponse', isSuccess: true, duration: Date.now() - analyticsData.startTime });
            }

            logger.debug(`[CoreIntelSvc] Stage 7: Response Generation`, analyticsData);
            const agenticQuery: AgenticQuery = {
                query: enhancedContext.prompt,
                userId, channelId,
                context: { previousMessages: history, userRole: capabilities.hasAdminCommands ? 'admin' : 'user', userPermissions: Object.keys(capabilities).filter(k => (capabilities as any)[k]), },
                options: { guildId: guildId || 'default', includeCitations: this.config.enableAgenticFeatures, },
                attachments: commonAttachments.map(a => ({ url: a.url, mimeType: a.contentType || 'application/octet-stream' }))
                // TODO: Pass systemPrompt from enhancedContext to AgenticQuery if supported by AgenticIntelligenceService or GeminiService
            };

            let agenticResponse: AgenticResponse;
            let fullResponseText: string;

            if (this.config.enableEnhancedUI && this.enhancedUiService && uiContext instanceof ChatInputCommandInteraction && this.agenticIntelligence.processQueryStream) {
                logger.debug(`[CoreIntelSvc] Streaming response for interaction.`, analyticsData);
                const abortController = new AbortController();
                const streamKey = `${userId}-${channelId}`;
                this.activeStreams.set(streamKey, { abortController, isStreaming: true });
                try {
                    const responseStream = this.agenticIntelligence.processQueryStream({ ...agenticQuery, abortSignal: abortController.signal });
                    fullResponseText = await this.enhancedUiService.sendStreamedResponse(uiContext, responseStream, { stopButtonId: STOP_BUTTON_ID, regenerateButtonId: REGENERATE_BUTTON_ID });
                } finally { this.activeStreams.delete(streamKey); }
                agenticResponse = { response: fullResponseText, confidence: 0.9, citations: { hasCitations: false, sourceSummary: '' }, knowledgeGrounded: false, escalation: { shouldEscalate: false}, metadata: {processingTime: Date.now() - analyticsData.startTime } };
            } else {
                logger.debug(`[CoreIntelSvc] Generating non-streamed response.`, analyticsData);
                agenticResponse = await this.agenticIntelligence.processQuery(agenticQuery);
                fullResponseText = agenticResponse.response;
            }
            recordAnalyticsInteraction({ ...analyticsData, step: 'response_generated', isSuccess: true, responseLength: fullResponseText.length, duration: Date.now() - analyticsData.startTime });
            return { agenticResponse, fullResponseText };
        } catch (error: any) {
            logger.error(`[CoreIntelSvc] Critical Error in _generateAgenticResponse: ${error.message}`, { error, stack: error.stack, ...analyticsData });
            recordAnalyticsInteraction({ ...analyticsData, step: 'agentic_response_error', isSuccess: false, error: error.message, duration: Date.now() - analyticsData.startTime });
            throw new Error(`Critical: Failed to generate agentic response for user ${userId}.`);
        }
    }

    private async _applyPostResponsePersonalization(userId: string, guildId: string | null, responseText: string, analyticsData: any): Promise<string> {
        if (!this.config.enablePersonalization || !this.personalizationEngine) return responseText;
        try {
            logger.debug(`[CoreIntelSvc] Stage 8: Personalization - Post-Response`, { userId });
            const adapted = await this.personalizationEngine.adaptResponse(userId, responseText, guildId);
            recordAnalyticsInteraction({ ...analyticsData, step: 'personalization_postresponse', isSuccess: true, duration: Date.now() - analyticsData.startTime });
            return adapted.personalizedResponse;
        } catch (error: any) {
            logger.warn(`[CoreIntelSvc] Error in _applyPostResponsePersonalization: ${error.message}. Proceeding with non-personalized response.`, { error, stack: error.stack, ...analyticsData });
            recordAnalyticsInteraction({ ...analyticsData, step: 'personalization_postresponse_error', isSuccess: false, error: error.message, duration: Date.now() - analyticsData.startTime });
            return responseText;
        }
    }

    private async _updateStateAndAnalytics(data: { userId: string, channelId: string, promptText: string, attachments: CommonAttachment[], fullResponseText: string, unifiedAnalysis: UnifiedMessageAnalysis, mcpOrchestrationResult: MCPOrchestrationResult, analyticsData: any, success: boolean }): Promise<void> {
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
                    hasAttachments: commonAttachments.length > 0,
                    hasUrls: unifiedAnalysis.urls?.length > 0,
                    attachmentTypes: commonAttachments.map(att => att.contentType?.split('/')[0] || 'unknown'), // e.g., 'image', 'application'
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
                    guildId: analyticsData.guildId, // from analyticsData which has guildId
                    analysis: analysisForMemory,
                    results: resultsForMemory,
                    errors: mcpOrchestrationResult.fallbacksUsed || [],
                };
                await this.enhancedMemoryService.storeConversationMemory(processingContextForMemory, promptText, fullResponseText);
            }
            if (this.config.enablePersonalization && this.behaviorAnalytics && success) {
                await this.behaviorAnalytics.recordBehaviorMetric({ userId, metricType: 'successful_interaction', value: 1, timestamp: new Date() });
            }
            recordAnalyticsInteraction({ ...analyticsData, step: 'final_updates_complete', isSuccess: success, duration: Date.now() - analyticsData.startTime });
        } catch (error: any) {
            logger.error(`[CoreIntelSvc] Error in _updateStateAndAnalytics: ${error.message}`, { error, stack: error.stack, ...analyticsData });
            recordAnalyticsInteraction({ ...analyticsData, step: 'state_update_error', isSuccess: false, error: error.message, duration: Date.now() - analyticsData.startTime });
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
            const regeneratedResponseOptions = await this._processPromptAndGenerateResponse(cachedPrompt.prompt, userId, cachedPrompt.channelId, interaction.guildId, cachedPrompt.attachments, interaction);
            if (interaction.isRepliable()) await interaction.followUp(regeneratedResponseOptions);
            else await interaction.channel?.send(regeneratedResponseOptions);
        }
    }

    private async loadOptedInUsers(): Promise<void> { logger.info('[CoreIntelSvc] Opted-in user loading (mocked - in-memory).'); }
    private async saveOptedInUsers(): Promise<void> { logger.info('[CoreIntelSvc] Opted-in user saving (mocked - in-memory).'); }
}
