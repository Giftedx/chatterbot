/**
 * Advanced Memory Manager
 * 
 * Orchestrates episodic memory and social intelligence services to provide
 * comprehensive memory-enhanced conversational AI capabilities.
 */

import { logger } from '../../utils/logger.js';
import { EpisodicMemoryService } from './episodic-memory.service.js';
import { SocialIntelligenceService } from './social-intelligence.service.js';
import {
    AdvancedMemoryConfig,
    EpisodicMemory,
    MemoryQuery,
    MemorySearchResult,
    SocialAnalysis,
    MemoryEnhancedResponse,
    MemoryContext,
    EmotionalContext,
    SocialProfile
} from './types.js';

export interface MemoryProcessingContext {
    userId: string;
    channelId: string;
    guildId?: string;
    conversationId: string;
    participants: string[];
    content: string;
    attachments?: any[];
    timestamp: Date;
}

export interface MemoryEnhancementResult {
    enhancedResponse: string;
    memoriesUsed: EpisodicMemory[];
    socialAdaptations: string[];
    emotionalConsiderations: string[];
    confidenceBoost: number;
    personalizations: string[];
    socialAnalysis: SocialAnalysis;
}

export class AdvancedMemoryManager {
    private episodicMemory: EpisodicMemoryService;
    private socialIntelligence: SocialIntelligenceService;
    private isInitialized = false;

    constructor(private config: AdvancedMemoryConfig) {
        this.episodicMemory = new EpisodicMemoryService(config);
        this.socialIntelligence = new SocialIntelligenceService(config);
    }

    /**
     * Initialize the memory manager
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        logger.info('Initializing Advanced Memory Manager', {
            operation: 'memory_init',
            enableEpisodicMemory: this.config.enableEpisodicMemory,
            enableSocialIntelligence: this.config.enableSocialIntelligence,
            enableEmotionalIntelligence: this.config.enableEmotionalIntelligence
        });

        this.isInitialized = true;
        logger.info('Advanced Memory Manager initialized successfully');
    }

    /**
     * Process and store conversation memory
     */
    async storeConversationMemory(context: MemoryProcessingContext): Promise<void> {
        if (!this.config.enableEpisodicMemory) return;

        try {
            const memoryContext: MemoryContext = {
                conversationId: context.conversationId,
                channel: context.channelId,
                guild: context.guildId,
                participants: context.participants,
                timeOfDay: this.getTimeOfDay(context.timestamp),
                dayOfWeek: this.getDayOfWeek(context.timestamp),
                season: this.getSeason(context.timestamp)
            };

            // Analyze emotional context
            const emotionalContext = await this.analyzeEmotionalContext(
                context.content,
                context.userId
            );

            // Store episodic memory
            await this.episodicMemory.storeMemory(
                context.userId,
                context.content,
                memoryContext,
                emotionalContext
            );

            logger.debug('Conversation memory stored', {
                operation: 'store_memory',
                userId: context.userId,
                contentLength: context.content.length
            });
        } catch (error) {
            logger.error('Failed to store conversation memory', error, {
                operation: 'store_memory',
                userId: context.userId
            });
        }
    }

    /**
     * Enhance response using memory and social intelligence
     */
    async enhanceResponse(
        originalResponse: string,
        context: MemoryProcessingContext
    ): Promise<MemoryEnhancementResult> {
        const result: MemoryEnhancementResult = {
            enhancedResponse: originalResponse,
            memoriesUsed: [],
            socialAdaptations: [],
            emotionalConsiderations: [],
            confidenceBoost: 0,
            personalizations: [],
            socialAnalysis: await this.createEmptySocialAnalysis(context.userId)
        };

        try {
            // Retrieve relevant memories
            if (this.config.enableEpisodicMemory) {
                const memories = await this.retrieveRelevantMemories(context);
                result.memoriesUsed = memories.map(m => m.memory);
                
                if (memories.length > 0) {
                    result.confidenceBoost += 0.2;
                    result.personalizations.push('Used relevant conversation history');
                }
            }

            // Analyze social context
            if (this.config.enableSocialIntelligence) {
                result.socialAnalysis = await this.socialIntelligence.analyzeSocialContext(
                    context.userId,
                    context.content,
                    context.participants
                );

                result.socialAdaptations = result.socialAnalysis.adaptationSuggestions.map(
                    suggestion => suggestion.suggestion
                );

                result.confidenceBoost += 0.1;
            }

            // Apply emotional intelligence
            if (this.config.enableEmotionalIntelligence) {
                const emotionalConsiderations = await this.analyzeEmotionalConsiderations(
                    context,
                    result.socialAnalysis
                );
                result.emotionalConsiderations = emotionalConsiderations;
                result.confidenceBoost += 0.1;
            }

            // Generate enhanced response
            result.enhancedResponse = await this.generateEnhancedResponse(
                originalResponse,
                result,
                context
            );

            logger.debug('Response enhanced with memory and social intelligence', {
                operation: 'enhance_response',
                userId: context.userId,
                memoriesUsed: result.memoriesUsed.length,
                socialAdaptations: result.socialAdaptations.length,
                confidenceBoost: result.confidenceBoost
            });

        } catch (error) {
            logger.error('Failed to enhance response with memory', error, {
                operation: 'enhance_response',
                userId: context.userId
            });
        }

        return result;
    }

    /**
     * Get social profile for a user
     */
    async getSocialProfile(userId: string): Promise<SocialProfile> {
        return await this.socialIntelligence.getSocialProfile(userId);
    }

    /**
     * Get memory statistics for a user
     */
    getMemoryStatistics(userId: string): Record<string, any> {
        if (!this.config.enableEpisodicMemory) {
            return { totalMemories: 0, status: 'disabled' };
        }

        return this.episodicMemory.getMemoryStatistics(userId);
    }

    /**
     * Search memories based on query
     */
    async searchMemories(query: MemoryQuery): Promise<MemorySearchResult[]> {
        if (!this.config.enableEpisodicMemory) return [];

        return await this.episodicMemory.retrieveMemories(query);
    }

    /**
     * Update user personality based on interaction patterns
     */
    async updatePersonality(userId: string, observedTraits: any): Promise<void> {
        if (!this.config.enableSocialIntelligence) return;

        await this.socialIntelligence.updatePersonalityTraits(userId, observedTraits);
    }

    /**
     * Consolidate memories for better organization
     */
    async consolidateMemories(userId?: string): Promise<void> {
        if (!this.config.enableEpisodicMemory) return;

        await this.episodicMemory.consolidateMemories(userId);
        logger.info('Memory consolidation completed', { userId });
    }

    // Private helper methods

    private async retrieveRelevantMemories(context: MemoryProcessingContext): Promise<MemorySearchResult[]> {
        const query: MemoryQuery = {
            userId: context.userId,
            content: context.content,
            limit: 5,
            timeRange: {
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
        };

        return await this.episodicMemory.retrieveMemories(query);
    }

    private async analyzeEmotionalContext(
        content: string,
        userId: string
    ): Promise<EmotionalContext> {
        // Simplified emotional analysis
        let conversationTone: 'positive' | 'negative' | 'neutral' | 'mixed' = 'neutral';
        let intensity = 0.3;

        // Basic sentiment analysis
        const positiveWords = ['happy', 'great', 'awesome', 'love', 'excellent', 'amazing', 'wonderful'];
        const negativeWords = ['sad', 'angry', 'terrible', 'hate', 'awful', 'horrible', 'disappointed'];

        const contentLower = content.toLowerCase();
        const positiveCount = positiveWords.filter(word => contentLower.includes(word)).length;
        const negativeCount = negativeWords.filter(word => contentLower.includes(word)).length;

        if (positiveCount > negativeCount) {
            conversationTone = 'positive';
            intensity = Math.min(0.8, 0.3 + positiveCount * 0.1);
        } else if (negativeCount > positiveCount) {
            conversationTone = 'negative';
            intensity = Math.min(0.8, 0.3 + negativeCount * 0.1);
        } else if (positiveCount > 0 && negativeCount > 0) {
            conversationTone = 'mixed';
            intensity = 0.5;
        }

        // Check for emotional indicators
        if (content.includes('!') || content.includes('?')) {
            intensity = Math.min(1.0, intensity + 0.1);
        }

        return {
            conversationTone,
            intensity
        };
    }

    private async analyzeEmotionalConsiderations(
        context: MemoryProcessingContext,
        socialAnalysis: SocialAnalysis
    ): Promise<string[]> {
        const considerations: string[] = [];

        // Based on emotional state
        if (socialAnalysis.emotionalState.intensity > 0.7) {
            if (socialAnalysis.emotionalState.detected.includes('positive')) {
                considerations.push('User appears to be in a very positive mood');
            } else if (socialAnalysis.emotionalState.detected.includes('negative')) {
                considerations.push('User may need emotional support or gentle response');
            }
        }

        // Based on social dynamics
        if (socialAnalysis.socialDynamics.engagement < 0.3) {
            considerations.push('User seems disengaged, consider asking engaging questions');
        }

        if (socialAnalysis.socialDynamics.dominanceLevel > 0.8) {
            considerations.push('User is being assertive, acknowledge their perspective');
        }

        return considerations;
    }

    private async generateEnhancedResponse(
        originalResponse: string,
        enhancement: MemoryEnhancementResult,
        context: MemoryProcessingContext
    ): Promise<string> {
        let enhanced = originalResponse;

        // Add personalization based on memories
        if (enhancement.memoriesUsed.length > 0) {
            const recentMemory = enhancement.memoriesUsed[0];
            if (recentMemory.context.topic) {
                enhanced = `Thinking about our previous discussion on ${recentMemory.context.topic}, ${enhanced}`;
            }
        }

        // Apply social adaptations
        if (enhancement.socialAdaptations.length > 0) {
            const adaptation = enhancement.socialAdaptations[0];
            if (adaptation.includes('formal')) {
                enhanced = enhanced.replace(/hey|hi/gi, 'Hello');
            } else if (adaptation.includes('casual')) {
                enhanced = enhanced.replace(/Hello/gi, 'Hey');
            }
        }

        // Apply emotional considerations
        if (enhancement.emotionalConsiderations.some(c => c.includes('support'))) {
            enhanced += ' I hope you\'re doing well!';
        }

        return enhanced;
    }

    private async createEmptySocialAnalysis(userId: string): Promise<SocialAnalysis> {
        return {
            userId,
            conversationId: `conv-${Date.now()}`,
            emotionalState: {
                detected: ['neutral'],
                confidence: 0.5,
                intensity: 0.3,
                trajectory: 'stable'
            },
            socialDynamics: {
                dominanceLevel: 0.5,
                engagement: 0.5,
                cooperativeness: 0.5,
                influenceAttempts: 0,
                responsiveness: 0.5
            },
            adaptationSuggestions: [],
            contextualFactors: [],
            timestamp: new Date()
        };
    }

    private getTimeOfDay(date: Date): string {
        const hour = date.getHours();
        if (hour < 6) return 'night';
        if (hour < 12) return 'morning';
        if (hour < 17) return 'afternoon';
        if (hour < 21) return 'evening';
        return 'night';
    }

    private getDayOfWeek(date: Date): string {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()];
    }

    private getSeason(date: Date): string {
        const month = date.getMonth();
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'autumn';
        return 'winter';
    }
}