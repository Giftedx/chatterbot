/**
 * Social Intelligence Service
 * 
 * Implements advanced social awareness, relationship modeling, and 
 * adaptive communication based on social context and user patterns.
 * 
 * Features:
 * - Personality trait analysis and modeling
 * - Relationship context tracking
 * - Social pattern recognition
 * - Adaptive communication strategies
 * - Emotional intelligence integration
 */

import { logger } from '../../utils/logger.js';
import { 
    SocialProfile,
    PersonalityTraits,
    UserPreferences,
    RelationshipContext,
    SocialPattern,
    CommunicationStyle,
    SocialAnalysis,
    EmotionalState,
    SocialDynamics,
    AdaptationSuggestion,
    ContextualFactor,
    TopicPreference,
    CommunicationPattern,
    AdvancedMemoryConfig
} from './types.js';

export class SocialIntelligenceService {
    private socialProfiles = new Map<string, SocialProfile>();
    private interactionHistory = new Map<string, InteractionRecord[]>();
    private globalSocialPatterns = new Map<string, SocialPattern>();

    constructor(private config: AdvancedMemoryConfig) {}

    /**
     * Analyze social context of a conversation
     */
    async analyzeSocialContext(
        userId: string,
        content: string,
        participants: string[],
        conversationHistory?: string[]
    ): Promise<SocialAnalysis> {
        const profile = await this.getSocialProfile(userId);
        const emotionalState = await this.analyzeEmotionalState(content, conversationHistory);
        const socialDynamics = await this.analyzeSocialDynamics(userId, content, participants);
        const adaptationSuggestions = await this.generateAdaptationSuggestions(
            profile, emotionalState, socialDynamics, content
        );
        const contextualFactors = await this.identifyContextualFactors(userId, participants, content);

        return {
            userId,
            conversationId: `conv-${Date.now()}`,
            emotionalState,
            socialDynamics,
            adaptationSuggestions,
            contextualFactors,
            timestamp: new Date()
        };
    }

    /**
     * Get or create social profile for a user
     */
    async getSocialProfile(userId: string): Promise<SocialProfile> {
        if (this.socialProfiles.has(userId)) {
            return this.socialProfiles.get(userId)!;
        }

        // Create new profile with default values
        const profile: SocialProfile = {
            userId,
            personality: this.createDefaultPersonality(),
            preferences: this.createDefaultPreferences(),
            relationships: new Map(),
            socialPatterns: [],
            communicationStyle: this.createDefaultCommunicationStyle(),
            lastUpdated: new Date()
        };

        this.socialProfiles.set(userId, profile);
        return profile;
    }

    /**
     * Update user personality traits based on interactions
     */
    async updatePersonalityTraits(
        userId: string,
        observedTraits: Partial<PersonalityTraits>
    ): Promise<void> {
        const profile = await this.getSocialProfile(userId);
        
        // Blend observed traits with existing ones (weighted average)
        const blendWeight = 0.2; // How much new observations affect the profile
        
        for (const [trait, value] of Object.entries(observedTraits)) {
            if (typeof value === 'number' && trait in profile.personality) {
                const currentValue = (profile.personality as any)[trait];
                (profile.personality as any)[trait] = currentValue * (1 - blendWeight) + value * blendWeight;
            }
        }
        
        profile.lastUpdated = new Date();
        logger.debug(`Updated personality traits for user ${userId}`);
    }

    /**
     * Track relationship dynamics between users
     */
    async updateRelationship(
        userId1: string,
        userId2: string,
        interactionType: string,
        sentiment: number // -1 to 1
    ): Promise<void> {
        const profile1 = await this.getSocialProfile(userId1);
        const profile2 = await this.getSocialProfile(userId2);
        
        // Update relationship in both directions
        await this.updateSingleRelationship(profile1, userId2, interactionType, sentiment);
        await this.updateSingleRelationship(profile2, userId1, interactionType, sentiment);
    }

    /**
     * Learn social patterns from user interactions
     */
    async learnSocialPattern(
        userId: string,
        pattern: string,
        context: string,
        effectiveness: number
    ): Promise<void> {
        const profile = await this.getSocialProfile(userId);
        
        // Find existing pattern or create new one
        let socialPattern = profile.socialPatterns.find(p => p.pattern === pattern);
        
        if (socialPattern) {
            // Update existing pattern
            socialPattern.frequency += 1;
            socialPattern.effectiveness = (socialPattern.effectiveness + effectiveness) / 2;
            socialPattern.lastObserved = new Date();
            
            if (!socialPattern.contexts.includes(context)) {
                socialPattern.contexts.push(context);
            }
        } else {
            // Create new pattern
            socialPattern = {
                pattern,
                contexts: [context],
                frequency: 1,
                effectiveness,
                examples: [],
                lastObserved: new Date()
            };
            profile.socialPatterns.push(socialPattern);
        }
        
        // Update global patterns
        this.updateGlobalPattern(pattern, context, effectiveness);
        
        profile.lastUpdated = new Date();
    }

    /**
     * Generate personalized communication recommendations
     */
    async generateCommunicationRecommendations(
        userId: string,
        targetUserId?: string,
        context?: string
    ): Promise<AdaptationSuggestion[]> {
        const profile = await this.getSocialProfile(userId);
        const targetProfile = targetUserId ? await this.getSocialProfile(targetUserId) : undefined;
        
        const suggestions: AdaptationSuggestion[] = [];
        
        // Personality-based recommendations
        suggestions.push(...this.getPersonalityBasedSuggestions(profile.personality));
        
        // Relationship-based recommendations
        if (targetProfile && targetUserId) {
            const relationship = profile.relationships.get(targetUserId);
            if (relationship) {
                suggestions.push(...this.getRelationshipBasedSuggestions(relationship, targetProfile));
            }
        }
        
        // Pattern-based recommendations
        suggestions.push(...this.getPatternBasedSuggestions(profile.socialPatterns, context));
        
        // Preference-based recommendations
        suggestions.push(...this.getPreferenceBasedSuggestions(profile.preferences));
        
        return this.prioritizeAndFilterSuggestions(suggestions);
    }

    /**
     * Adapt response based on social analysis
     */
    async adaptResponse(
        originalResponse: string,
        socialAnalysis: SocialAnalysis,
        targetUserId?: string
    ): Promise<string> {
        let adaptedResponse = originalResponse;
        const profile = await this.getSocialProfile(socialAnalysis.userId);
        
        // Apply high-priority adaptations
        const highPrioritySuggestions = socialAnalysis.adaptationSuggestions
            .filter(s => s.priority === 'high');
        
        for (const suggestion of highPrioritySuggestions) {
            adaptedResponse = this.applySuggestion(adaptedResponse, suggestion, profile);
        }
        
        // Apply relationship-specific adaptations
        if (targetUserId) {
            const relationship = profile.relationships.get(targetUserId);
            if (relationship) {
                adaptedResponse = this.applyRelationshipAdaptations(adaptedResponse, relationship);
            }
        }
        
        // Apply communication style adaptations
        adaptedResponse = this.applyCommunicationStyleAdaptations(adaptedResponse, profile.communicationStyle);
        
        return adaptedResponse;
    }

    /**
     * Analyze user preferences from interaction patterns
     */
    async analyzeUserPreferences(userId: string): Promise<UserPreferences> {
        const interactions = this.interactionHistory.get(userId) || [];
        const profile = await this.getSocialProfile(userId);
        
        // Analyze communication style preferences
        const communicationStyleAnalysis = this.analyzeCommunicationStylePreferences(interactions);
        
        // Analyze response length preferences
        const responseLengthAnalysis = this.analyzeResponseLengthPreferences(interactions);
        
        // Analyze topic preferences
        const topicPreferences = this.analyzeTopicPreferences(interactions);
        
        // Analyze timing preferences
        const timePreferences = this.analyzeTimePreferences(interactions);
        
        // Update profile with analyzed preferences
        profile.preferences = {
            communicationStyle: communicationStyleAnalysis,
            responseLength: responseLengthAnalysis,
            interactionFrequency: this.analyzeInteractionFrequency(interactions),
            topics: topicPreferences,
            timePreferences,
            feedbackStyle: this.analyzeFeedbackStylePreference(interactions)
        };
        
        profile.lastUpdated = new Date();
        return profile.preferences;
    }

    /**
     * Get social intelligence metrics for a user
     */
    getSocialMetrics(userId: string): Record<string, any> {
        const profile = this.socialProfiles.get(userId);
        if (!profile) {
            return { error: 'No social profile found' };
        }
        
        const interactions = this.interactionHistory.get(userId) || [];
        
        return {
            personalityProfile: profile.personality,
            relationshipCount: profile.relationships.size,
            learnedPatterns: profile.socialPatterns.length,
            communicationStyle: profile.communicationStyle,
            interactionCount: interactions.length,
            averageRelationshipCloseness: this.calculateAverageCloseness(profile.relationships),
            topSocialPatterns: profile.socialPatterns
                .sort((a, b) => b.effectiveness - a.effectiveness)
                .slice(0, 5),
            preferenceAdaptation: this.calculatePreferenceAdaptationScore(profile.preferences),
            lastProfileUpdate: profile.lastUpdated
        };
    }

    // Private helper methods

    private async analyzeEmotionalState(
        content: string,
        conversationHistory?: string[]
    ): Promise<EmotionalState> {
        const emotions = this.detectEmotions(content);
        const intensity = this.calculateEmotionalIntensity(content);
        const trajectory = this.analyzeEmotionalTrajectory(conversationHistory || []);
        
        return {
            detected: emotions,
            confidence: this.calculateEmotionConfidence(emotions, content),
            intensity,
            trajectory,
            triggers: this.identifyEmotionalTriggers(content)
        };
    }

    private detectEmotions(content: string): string[] {
        const emotions: string[] = [];
        const lowerContent = content.toLowerCase();
        
        // Simple emotion detection based on keywords
        const emotionKeywords = {
            'joy': ['happy', 'joy', 'excited', 'thrilled', 'delighted', '😊', '😄', '🎉'],
            'sadness': ['sad', 'down', 'disappointed', 'upset', 'depressed', '😢', '😞'],
            'anger': ['angry', 'frustrated', 'annoyed', 'mad', 'furious', '😠', '😡'],
            'fear': ['scared', 'afraid', 'worried', 'anxious', 'nervous', '😰', '😨'],
            'surprise': ['surprised', 'shocked', 'amazed', 'astonished', '😮', '😲'],
            'disgust': ['disgusted', 'revolted', 'sick', 'gross', '🤢', '🤮'],
            'anticipation': ['excited', 'looking forward', 'can\'t wait', 'anticipating'],
            'trust': ['trust', 'confident', 'believe', 'faith', 'reliable']
        };
        
        for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
            if (keywords.some(keyword => lowerContent.includes(keyword))) {
                emotions.push(emotion);
            }
        }
        
        return emotions.length > 0 ? emotions : ['neutral'];
    }

    private calculateEmotionalIntensity(content: string): number {
        let intensity = 0.3; // Base neutral intensity
        
        // Punctuation intensity indicators
        const exclamationCount = (content.match(/!/g) || []).length;
        const questionCount = (content.match(/\?/g) || []).length;
        const capsCount = (content.match(/[A-Z]/g) || []).length;
        
        intensity += Math.min(0.3, exclamationCount * 0.1);
        intensity += Math.min(0.2, questionCount * 0.05);
        intensity += Math.min(0.2, (capsCount / content.length) * 2);
        
        // Content length and word choice intensity
        const intensifiers = ['very', 'extremely', 'incredibly', 'absolutely', 'totally'];
        const intensifierCount = intensifiers.filter(word => 
            content.toLowerCase().includes(word)
        ).length;
        
        intensity += Math.min(0.3, intensifierCount * 0.1);
        
        return Math.max(0.1, Math.min(1.0, intensity));
    }

    private analyzeEmotionalTrajectory(history: string[]): EmotionalState['trajectory'] {
        if (history.length < 2) return 'stable';
        
        const recentEmotions = history.slice(-3).map(msg => {
            const emotions = this.detectEmotions(msg);
            const intensity = this.calculateEmotionalIntensity(msg);
            return this.getEmotionalValence(emotions) * intensity;
        });
        
        if (recentEmotions.length < 2) return 'stable';
        
        const trend = recentEmotions[recentEmotions.length - 1] - recentEmotions[0];
        
        if (trend > 0.2) return 'improving';
        if (trend < -0.2) return 'declining';
        
        const variance = this.calculateVariance(recentEmotions);
        return variance > 0.3 ? 'fluctuating' : 'stable';
    }

    private getEmotionalValence(emotions: string[]): number {
        const valenceMap: Record<string, number> = {
            'joy': 0.8,
            'trust': 0.6,
            'anticipation': 0.5,
            'surprise': 0.0,
            'fear': -0.4,
            'sadness': -0.6,
            'disgust': -0.7,
            'anger': -0.8,
            'neutral': 0.0
        };
        
        if (emotions.length === 0) return 0;
        
        const sum = emotions.reduce((total, emotion) => total + (valenceMap[emotion] || 0), 0);
        return sum / emotions.length;
    }

    private calculateVariance(values: number[]): number {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        
        return variance;
    }

    private identifyEmotionalTriggers(content: string): string[] {
        const triggers: string[] = [];
        const lowerContent = content.toLowerCase();
        
        const triggerPatterns = {
            'deadline': ['deadline', 'due date', 'urgency', 'time pressure'],
            'conflict': ['disagree', 'conflict', 'argument', 'dispute'],
            'praise': ['great job', 'well done', 'excellent', 'amazing'],
            'criticism': ['wrong', 'bad', 'terrible', 'awful', 'mistake'],
            'uncertainty': ['maybe', 'not sure', 'uncertain', 'confused'],
            'achievement': ['accomplished', 'achieved', 'succeeded', 'won']
        };
        
        for (const [trigger, patterns] of Object.entries(triggerPatterns)) {
            if (patterns.some(pattern => lowerContent.includes(pattern))) {
                triggers.push(trigger);
            }
        }
        
        return triggers;
    }

    private calculateEmotionConfidence(emotions: string[], content: string): number {
        if (emotions.includes('neutral')) return 0.5;
        
        let confidence = 0.6; // Base confidence
        
        // Higher confidence with multiple emotion indicators
        if (emotions.length > 1) confidence += 0.2;
        
        // Higher confidence with strong emotional language
        const strongEmotionWords = ['love', 'hate', 'amazing', 'terrible', 'fantastic', 'awful'];
        if (strongEmotionWords.some(word => content.toLowerCase().includes(word))) {
            confidence += 0.2;
        }
        
        return Math.max(0.3, Math.min(1.0, confidence));
    }

    private async analyzeSocialDynamics(
        userId: string,
        content: string,
        participants: string[]
    ): Promise<SocialDynamics> {
        const profile = await this.getSocialProfile(userId);
        
        const dominanceLevel = this.calculateDominanceLevel(content, profile.personality);
        const engagement = this.calculateEngagement(content, participants.length);
        const cooperativeness = this.calculateCooperativeness(content);
        const influenceAttempts = this.countInfluenceAttempts(content);
        const responsiveness = this.calculateResponsiveness(content, profile.communicationStyle);
        
        return {
            dominanceLevel,
            engagement,
            cooperativeness,
            influenceAttempts,
            responsiveness
        };
    }

    private calculateDominanceLevel(content: string, personality: PersonalityTraits): number {
        let dominance = personality.extraversion * 0.5; // Base on extraversion
        
        // Language indicators of dominance
        const dominanceIndicators = ['should', 'must', 'need to', 'have to', 'will', 'going to'];
        const indicatorCount = dominanceIndicators.filter(indicator => 
            content.toLowerCase().includes(indicator)
        ).length;
        
        dominance += Math.min(0.4, indicatorCount * 0.1);
        
        // Question vs statement ratio (more statements = higher dominance)
        const questions = (content.match(/\?/g) || []).length;
        const statements = content.split(/[.!]/).length - 1;
        
        if (statements > 0) {
            dominance += Math.min(0.3, (statements - questions) / statements * 0.3);
        }
        
        return Math.max(0.1, Math.min(1.0, dominance));
    }

    private calculateEngagement(content: string, participantCount: number): number {
        let engagement = 0.5; // Base engagement
        
        // Length indicates engagement
        engagement += Math.min(0.3, content.length / 500);
        
        // Questions indicate engagement
        const questions = (content.match(/\?/g) || []).length;
        engagement += Math.min(0.2, questions * 0.1);
        
        // References to others indicate engagement
        const references = (content.match(/@\w+/g) || []).length;
        engagement += Math.min(0.2, references * 0.1);
        
        // Adjust for group size
        if (participantCount > 2) {
            engagement *= 1.2; // Group conversations often indicate higher engagement
        }
        
        return Math.max(0.1, Math.min(1.0, engagement));
    }

    private calculateCooperativeness(content: string): number {
        let cooperativeness = 0.5; // Base cooperativeness
        
        const cooperativeIndicators = ['we', 'us', 'together', 'agree', 'help', 'support', 'share'];
        const competitiveIndicators = ['i', 'me', 'my', 'disagree', 'wrong', 'better', 'best'];
        
        const cooperativeCount = cooperativeIndicators.filter(word => 
            content.toLowerCase().includes(word)
        ).length;
        
        const competitiveCount = competitiveIndicators.filter(word => 
            content.toLowerCase().includes(word)
        ).length;
        
        cooperativeness += (cooperativeCount - competitiveCount) * 0.1;
        
        return Math.max(0.1, Math.min(1.0, cooperativeness));
    }

    private countInfluenceAttempts(content: string): number {
        const influenceIndicators = [
            'should', 'must', 'need to', 'think about', 'consider', 'suggest',
            'recommend', 'would you', 'what if', 'how about'
        ];
        
        return influenceIndicators.filter(indicator => 
            content.toLowerCase().includes(indicator)
        ).length;
    }

    private calculateResponsiveness(content: string, style: CommunicationStyle): number {
        let responsiveness = style.directness * 0.3 + style.supportiveness * 0.4;
        
        // Quick responses or acknowledgments
        const responsiveIndicators = ['yes', 'no', 'okay', 'sure', 'thanks', 'got it'];
        const indicatorCount = responsiveIndicators.filter(word => 
            content.toLowerCase().includes(word)
        ).length;
        
        responsiveness += Math.min(0.3, indicatorCount * 0.1);
        
        return Math.max(0.1, Math.min(1.0, responsiveness));
    }

    private async generateAdaptationSuggestions(
        profile: SocialProfile,
        emotionalState: EmotionalState,
        socialDynamics: SocialDynamics,
        content: string
    ): Promise<AdaptationSuggestion[]> {
        const suggestions: AdaptationSuggestion[] = [];
        
        // Emotional adaptation suggestions
        if (emotionalState.intensity > 0.7) {
            suggestions.push({
                type: 'tone',
                suggestion: 'Match the high emotional intensity with empathetic and engaging language',
                reasoning: 'User is showing high emotional intensity',
                confidence: 0.8,
                priority: 'high'
            });
        }
        
        if (emotionalState.detected.includes('sadness') || emotionalState.detected.includes('anger')) {
            suggestions.push({
                type: 'approach',
                suggestion: 'Use supportive and understanding tone',
                reasoning: 'Negative emotions detected',
                confidence: 0.9,
                priority: 'high'
            });
        }
        
        // Social dynamics adaptations
        if (socialDynamics.dominanceLevel > 0.7) {
            suggestions.push({
                type: 'style',
                suggestion: 'Use more direct and confident language',
                reasoning: 'User shows high dominance - match their communication style',
                confidence: 0.7,
                priority: 'medium'
            });
        }
        
        if (socialDynamics.engagement < 0.4) {
            suggestions.push({
                type: 'content',
                suggestion: 'Ask engaging questions to increase participation',
                reasoning: 'Low engagement detected',
                confidence: 0.6,
                priority: 'medium'
            });
        }
        
        // Personality-based adaptations
        if (profile.personality.openness > 0.7) {
            suggestions.push({
                type: 'content',
                suggestion: 'Include creative and novel ideas in response',
                reasoning: 'High openness personality trait detected',
                confidence: 0.6,
                priority: 'low'
            });
        }
        
        return suggestions;
    }

    private async identifyContextualFactors(
        userId: string,
        participants: string[],
        content: string
    ): Promise<ContextualFactor[]> {
        const factors: ContextualFactor[] = [];
        
        // Group size factor
        factors.push({
            factor: 'group_size',
            influence: participants.length > 2 ? 0.3 : -0.2,
            description: `${participants.length} participants in conversation`
        });
        
        // Time of day factor (simplified)
        const hour = new Date().getHours();
        if (hour < 6 || hour > 22) {
            factors.push({
                factor: 'late_hours',
                influence: -0.2,
                description: 'Late hour conversation - user may be tired'
            });
        }
        
        // Content complexity factor
        const wordCount = content.split(' ').length;
        if (wordCount > 50) {
            factors.push({
                factor: 'complex_content',
                influence: 0.2,
                description: 'Long message indicates engaged conversation'
            });
        }
        
        return factors;
    }

    private createDefaultPersonality(): PersonalityTraits {
        return {
            openness: 0.5,
            conscientiousness: 0.5,
            extraversion: 0.5,
            agreeableness: 0.5,
            neuroticism: 0.5,
            humor: 0.5,
            creativity: 0.5,
            curiosity: 0.5
        };
    }

    private createDefaultPreferences(): UserPreferences {
        return {
            communicationStyle: 'adaptive',
            responseLength: 'adaptive',
            interactionFrequency: 'moderate',
            topics: [],
            timePreferences: [],
            feedbackStyle: 'adaptive'
        };
    }

    private createDefaultCommunicationStyle(): CommunicationStyle {
        return {
            formality: 0.5,
            directness: 0.5,
            emotiveness: 0.5,
            humor: 0.5,
            supportiveness: 0.5,
            curiosity: 0.5
        };
    }

    private async updateSingleRelationship(
        profile: SocialProfile,
        targetUserId: string,
        interactionType: string,
        sentiment: number
    ): Promise<void> {
        let relationship = profile.relationships.get(targetUserId);
        
        if (!relationship) {
            relationship = {
                targetUserId,
                relationshipType: 'acquaintance',
                closeness: 0.3,
                trust: 0.5,
                sharedExperiences: [],
                communicationPatterns: [],
                interactionCount: 0
            };
            profile.relationships.set(targetUserId, relationship);
        }
        
        // Update relationship metrics
        relationship.interactionCount++;
        relationship.lastInteraction = new Date();
        
        // Adjust closeness based on sentiment
        relationship.closeness += sentiment * 0.1;
        relationship.closeness = Math.max(0, Math.min(1, relationship.closeness));
        
        // Adjust trust based on positive interactions
        if (sentiment > 0) {
            relationship.trust += 0.05;
            relationship.trust = Math.min(1, relationship.trust);
        }
        
        // Update relationship type based on closeness and trust
        this.updateRelationshipType(relationship);
        
        // Add communication pattern
        this.addCommunicationPattern(relationship, interactionType, sentiment);
    }

    private updateRelationshipType(relationship: RelationshipContext): void {
        const score = (relationship.closeness + relationship.trust) / 2;
        
        if (score > 0.8) relationship.relationshipType = 'friend';
        else if (score > 0.6) relationship.relationshipType = 'colleague';
        else if (score > 0.4) relationship.relationshipType = 'acquaintance';
        else relationship.relationshipType = 'unknown';
    }

    private addCommunicationPattern(
        relationship: RelationshipContext,
        interactionType: string,
        sentiment: number
    ): void {
        let pattern = relationship.communicationPatterns.find(p => p.pattern === interactionType);
        
        if (pattern) {
            pattern.frequency++;
            pattern.effectiveness = (pattern.effectiveness + (sentiment + 1) / 2) / 2;
        } else {
            pattern = {
                pattern: interactionType,
                frequency: 1,
                context: 'general',
                effectiveness: (sentiment + 1) / 2
            };
            relationship.communicationPatterns.push(pattern);
        }
    }

    private updateGlobalPattern(pattern: string, context: string, effectiveness: number): void {
        let globalPattern = this.globalSocialPatterns.get(pattern);
        
        if (globalPattern) {
            globalPattern.frequency++;
            globalPattern.effectiveness = (globalPattern.effectiveness + effectiveness) / 2;
            globalPattern.lastObserved = new Date();
            
            if (!globalPattern.contexts.includes(context)) {
                globalPattern.contexts.push(context);
            }
        } else {
            globalPattern = {
                pattern,
                contexts: [context],
                frequency: 1,
                effectiveness,
                examples: [],
                lastObserved: new Date()
            };
            this.globalSocialPatterns.set(pattern, globalPattern);
        }
    }

    private getPersonalityBasedSuggestions(personality: PersonalityTraits): AdaptationSuggestion[] {
        const suggestions: AdaptationSuggestion[] = [];
        
        if (personality.extraversion > 0.7) {
            suggestions.push({
                type: 'style',
                suggestion: 'Use energetic and engaging language',
                reasoning: 'High extraversion detected',
                confidence: 0.7,
                priority: 'medium'
            });
        }
        
        if (personality.openness > 0.7) {
            suggestions.push({
                type: 'content',
                suggestion: 'Include creative and abstract concepts',
                reasoning: 'High openness to experience',
                confidence: 0.6,
                priority: 'low'
            });
        }
        
        if (personality.conscientiousness > 0.7) {
            suggestions.push({
                type: 'approach',
                suggestion: 'Provide detailed and structured information',
                reasoning: 'High conscientiousness - user appreciates thoroughness',
                confidence: 0.8,
                priority: 'medium'
            });
        }
        
        return suggestions;
    }

    private getRelationshipBasedSuggestions(
        relationship: RelationshipContext,
        targetProfile: SocialProfile
    ): AdaptationSuggestion[] {
        const suggestions: AdaptationSuggestion[] = [];
        
        if (relationship.closeness > 0.7) {
            suggestions.push({
                type: 'tone',
                suggestion: 'Use informal and friendly tone',
                reasoning: 'Close relationship detected',
                confidence: 0.9,
                priority: 'high'
            });
        }
        
        if (relationship.trust > 0.8) {
            suggestions.push({
                type: 'content',
                suggestion: 'Share more personal insights and opinions',
                reasoning: 'High trust relationship',
                confidence: 0.8,
                priority: 'medium'
            });
        }
        
        // Use successful communication patterns
        const bestPattern = relationship.communicationPatterns
            .sort((a, b) => b.effectiveness - a.effectiveness)[0];
        
        if (bestPattern && bestPattern.effectiveness > 0.7) {
            suggestions.push({
                type: 'approach',
                suggestion: `Use ${bestPattern.pattern} communication style`,
                reasoning: `This pattern has been effective in past interactions`,
                confidence: bestPattern.effectiveness,
                priority: 'medium'
            });
        }
        
        return suggestions;
    }

    private getPatternBasedSuggestions(patterns: SocialPattern[], context?: string): AdaptationSuggestion[] {
        const suggestions: AdaptationSuggestion[] = [];
        
        // Find effective patterns for current context
        const relevantPatterns = patterns.filter(p => 
            !context || p.contexts.includes(context)
        ).sort((a, b) => b.effectiveness - a.effectiveness);
        
        for (const pattern of relevantPatterns.slice(0, 3)) {
            if (pattern.effectiveness > 0.6) {
                suggestions.push({
                    type: 'approach',
                    suggestion: `Apply learned pattern: ${pattern.pattern}`,
                    reasoning: `This pattern has been effective (${pattern.effectiveness.toFixed(2)}) in similar contexts`,
                    confidence: pattern.effectiveness,
                    priority: 'medium'
                });
            }
        }
        
        return suggestions;
    }

    private getPreferenceBasedSuggestions(preferences: UserPreferences): AdaptationSuggestion[] {
        const suggestions: AdaptationSuggestion[] = [];
        
        if (preferences.responseLength !== 'adaptive') {
            suggestions.push({
                type: 'content',
                suggestion: `Adjust response length to ${preferences.responseLength}`,
                reasoning: 'User preference for response length',
                confidence: 0.8,
                priority: 'high'
            });
        }
        
        if (preferences.communicationStyle !== 'adaptive') {
            suggestions.push({
                type: 'style',
                suggestion: `Use ${preferences.communicationStyle} communication style`,
                reasoning: 'User communication style preference',
                confidence: 0.9,
                priority: 'high'
            });
        }
        
        return suggestions;
    }

    private prioritizeAndFilterSuggestions(suggestions: AdaptationSuggestion[]): AdaptationSuggestion[] {
        // Remove duplicates and sort by priority and confidence
        const uniqueSuggestions = suggestions.filter((suggestion, index, self) =>
            index === self.findIndex(s => s.suggestion === suggestion.suggestion)
        );
        
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        
        return uniqueSuggestions
            .sort((a, b) => {
                const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
                if (priorityDiff !== 0) return priorityDiff;
                return b.confidence - a.confidence;
            })
            .slice(0, 8); // Limit to top 8 suggestions
    }

    private applySuggestion(
        response: string,
        suggestion: AdaptationSuggestion,
        profile: SocialProfile
    ): string {
        // Simplified suggestion application - in real implementation would be more sophisticated
        switch (suggestion.type) {
            case 'tone':
                if (suggestion.suggestion.includes('supportive')) {
                    return `I understand how you feel. ${response}`;
                }
                if (suggestion.suggestion.includes('energetic')) {
                    return response.replace(/\./g, '!');
                }
                break;
                
            case 'style':
                if (suggestion.suggestion.includes('direct')) {
                    return response.replace(/maybe|perhaps|possibly/g, '');
                }
                break;
                
            case 'content':
                if (suggestion.suggestion.includes('questions')) {
                    return `${response} What are your thoughts on this?`;
                }
                break;
        }
        
        return response;
    }

    private applyRelationshipAdaptations(response: string, relationship: RelationshipContext): string {
        if (relationship.closeness > 0.7) {
            // More informal tone for close relationships
            response = response.replace(/Hello/g, 'Hey');
            response = response.replace(/Thank you/g, 'Thanks');
        }
        
        return response;
    }

    private applyCommunicationStyleAdaptations(response: string, style: CommunicationStyle): string {
        // Adjust formality
        if (style.formality < 0.3) {
            response = response.replace(/Hello/g, 'Hey');
            response = response.replace(/However,/g, 'But');
        }
        
        // Adjust humor
        if (style.humor > 0.7 && Math.random() > 0.5) {
            response += ' 😊';
        }
        
        return response;
    }

    // Interface definitions for private types
    private interface InteractionRecord {
        timestamp: Date;
        content: string;
        sentiment: number;
        type: string;
        participants: string[];
        responseLength: number;
    }

    // Placeholder implementations for preference analysis methods
    private analyzeCommunicationStylePreferences(interactions: any[]): UserPreferences['communicationStyle'] {
        return 'adaptive'; // Simplified implementation
    }

    private analyzeResponseLengthPreferences(interactions: any[]): UserPreferences['responseLength'] {
        return 'adaptive'; // Simplified implementation
    }

    private analyzeTopicPreferences(interactions: any[]): TopicPreference[] {
        return []; // Simplified implementation
    }

    private analyzeTimePreferences(interactions: any[]): any[] {
        return []; // Simplified implementation
    }

    private analyzeInteractionFrequency(interactions: any[]): UserPreferences['interactionFrequency'] {
        return 'moderate'; // Simplified implementation
    }

    private analyzeFeedbackStylePreference(interactions: any[]): UserPreferences['feedbackStyle'] {
        return 'adaptive'; // Simplified implementation
    }

    private calculateAverageCloseness(relationships: Map<string, RelationshipContext>): number {
        if (relationships.size === 0) return 0;
        
        const totalCloseness = Array.from(relationships.values())
            .reduce((sum, rel) => sum + rel.closeness, 0);
        
        return totalCloseness / relationships.size;
    }

    private calculatePreferenceAdaptationScore(preferences: UserPreferences): number {
        // Calculate how well we're adapting to user preferences
        let adaptationScore = 0.5; // Base score
        
        // Score based on preference specificity
        if (preferences.communicationStyle !== 'adaptive') adaptationScore += 0.2;
        if (preferences.responseLength !== 'adaptive') adaptationScore += 0.2;
        if (preferences.topics.length > 0) adaptationScore += 0.1;
        
        return Math.min(1.0, adaptationScore);
    }
}