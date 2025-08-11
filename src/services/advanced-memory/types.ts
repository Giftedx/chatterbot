/**
 * Advanced Memory & Social Intelligence Types
 */

// Episodic Memory Types
export interface EpisodicMemory {
    id: string;
    userId: string;
    content: string;
    context: MemoryContext;
    emotions: EmotionalContext;
    semanticTags: string[];
    embedding?: number[];
    importance: number; // 0-1
    recency: number; // 0-1 based on time decay
    accessibility: number; // 0-1 based on retrieval frequency
    associations: string[]; // IDs of related memories
    createdAt: Date;
    lastAccessedAt: Date;
    accessCount: number;
}

export interface MemoryContext {
    conversationId: string;
    channel: string;
    guild?: string;
    participants: string[];
    topic?: string;
    activity?: string;
    timeOfDay: string;
    dayOfWeek: string;
    season: string;
}

export interface EmotionalContext {
    userEmotion?: string;
    botEmotion?: string;
    conversationTone: 'positive' | 'negative' | 'neutral' | 'mixed';
    intensity: number; // 0-1
    emotionalTriggers?: string[];
}

// Social Intelligence Types
export interface SocialProfile {
    userId: string;
    personality: PersonalityTraits;
    preferences: UserPreferences;
    relationships: Map<string, RelationshipContext>;
    socialPatterns: SocialPattern[];
    communicationStyle: CommunicationStyle;
    lastUpdated: Date;
}

export interface PersonalityTraits {
    openness: number; // 0-1
    conscientiousness: number; // 0-1
    extraversion: number; // 0-1
    agreeableness: number; // 0-1
    neuroticism: number; // 0-1
    humor: number; // 0-1
    creativity: number; // 0-1
    curiosity: number; // 0-1
}

export interface UserPreferences {
    communicationStyle: 'formal' | 'casual' | 'technical' | 'friendly' | 'adaptive';
    responseLength: 'brief' | 'moderate' | 'detailed' | 'adaptive';
    interactionFrequency: 'high' | 'moderate' | 'low';
    topics: TopicPreference[];
    timePreferences: TimePreference[];
    feedbackStyle: 'direct' | 'gentle' | 'encouraging' | 'adaptive';
}

export interface TopicPreference {
    topic: string;
    interest: number; // 0-1
    expertise: number; // 0-1
    frequency: number; // How often discussed
    lastDiscussed?: Date;
}

export interface TimePreference {
    timeOfDay: string;
    activityLevel: number; // 0-1
    preferredInteractionType: string;
}

export interface RelationshipContext {
    targetUserId: string;
    relationshipType: 'friend' | 'colleague' | 'mentor' | 'mentee' | 'acquaintance' | 'unknown';
    closeness: number; // 0-1
    trust: number; // 0-1
    sharedExperiences: string[];
    communicationPatterns: CommunicationPattern[];
    lastInteraction?: Date;
    interactionCount: number;
}

export interface CommunicationPattern {
    pattern: string;
    frequency: number;
    context: string;
    effectiveness: number; // 0-1
}

export interface SocialPattern {
    pattern: string;
    contexts: string[];
    frequency: number;
    effectiveness: number; // 0-1
    examples: string[];
    lastObserved: Date;
}

export interface CommunicationStyle {
    formality: number; // 0-1 (casual to formal)
    directness: number; // 0-1 (indirect to direct)
    emotiveness: number; // 0-1 (reserved to expressive)
    humor: number; // 0-1 (serious to humorous)
    supportiveness: number; // 0-1 (critical to supportive)
    curiosity: number; // 0-1 (passive to questioning)
}

// Memory Retrieval Types
export interface MemoryQuery {
    content?: string;
    emotions?: string[];
    context?: Partial<MemoryContext>;
    timeRange?: {
        start?: Date;
        end?: Date;
    };
    importance?: {
        min?: number;
        max?: number;
    };
    semanticTags?: string[];
    userId?: string;
    limit?: number;
}

export interface MemorySearchResult {
    memory: EpisodicMemory;
    relevance: number; // 0-1
    reason: string;
}

// Social Intelligence Analysis Types
export interface SocialAnalysis {
    userId: string;
    conversationId: string;
    emotionalState: EmotionalState;
    socialDynamics: SocialDynamics;
    adaptationSuggestions: AdaptationSuggestion[];
    contextualFactors: ContextualFactor[];
    timestamp: Date;
}

export interface EmotionalState {
    detected: string[];
    confidence: number; // 0-1
    intensity: number; // 0-1
    trajectory: 'improving' | 'declining' | 'stable' | 'fluctuating';
    triggers?: string[];
}

export interface SocialDynamics {
    dominanceLevel: number; // 0-1
    engagement: number; // 0-1
    cooperativeness: number; // 0-1
    influenceAttempts: number;
    responsiveness: number; // 0-1
}

export interface AdaptationSuggestion {
    type: 'tone' | 'style' | 'content' | 'timing' | 'approach';
    suggestion: string;
    reasoning: string;
    confidence: number; // 0-1
    priority: 'high' | 'medium' | 'low';
}

export interface ContextualFactor {
    factor: string;
    influence: number; // -1 to 1
    description: string;
}

// Memory Configuration
export interface AdvancedMemoryConfig {
    enableEpisodicMemory: boolean;
    enableSocialIntelligence: boolean;
    enableEmotionalIntelligence: boolean;
    enableSemanticClustering: boolean;
    enableMemoryConsolidation: boolean;
    
    maxMemoriesPerUser: number;
    memoryDecayRate: number; // How fast memories fade
    importanceThreshold: number; // Minimum importance to retain
    consolidationInterval: number; // How often to consolidate memories (ms)
    
    socialAnalysisDepth: 'basic' | 'moderate' | 'comprehensive';
    emotionalSensitivity: number; // 0-1
    adaptationAggressiveness: number; // 0-1
}

// Response Enhancement Types
export interface MemoryEnhancedResponse {
    originalResponse: string;
    enhancedResponse: string;
    memoriesUsed: EpisodicMemory[];
    socialAdaptations: AdaptationSuggestion[];
    emotionalConsiderations: string[];
    confidenceBoost: number; // How much memory improved confidence
    personalizations: string[];
}

export interface ConversationMemory {
    conversationId: string;
    participants: string[];
    startTime: Date;
    endTime?: Date;
    topic?: string;
    keyMoments: KeyMoment[];
    emotionalArc: EmotionalState[];
    summary?: string;
    importance: number; // 0-1
}

export interface KeyMoment {
    timestamp: Date;
    content: string;
    significance: number; // 0-1
    participants: string[];
    emotionalImpact: number; // -1 to 1
    memoryIds: string[];
}