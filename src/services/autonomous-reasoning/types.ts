/**
 * Autonomous Reasoning Types
 * 
 * Defines interfaces and types for autonomous reasoning capabilities
 * including self-reflection, goal setting, and adaptive persona development.
 */

export interface SelfReflectionResult {
    id: string;
    userId: string;
    context: string;
    reflection: string;
    insights: string[];
    actionItems: string[];
    confidence: number;
    timestamp: Date;
    improvedUnderstanding: boolean;
    previousMisconceptions?: string[];
    learningAreas: string[];
}

export interface AutonomousGoal {
    id: string;
    userId: string;
    description: string;
    category: 'learning' | 'assistance' | 'relationship' | 'knowledge' | 'performance';
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'planning' | 'active' | 'paused' | 'completed' | 'abandoned';
    steps: GoalStep[];
    successCriteria: string[];
    deadline?: Date;
    createdAt: Date;
    updatedAt: Date;
    progress: number; // 0-1
    dependencies: string[]; // Other goal IDs
}

export interface GoalStep {
    id: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    estimatedDuration?: number;
    actualDuration?: number;
    resources: string[];
    completedAt?: Date;
    notes?: string;
}

export interface PersonaAdaptation {
    userId: string;
    currentPersona: PersonaProfile;
    suggestedAdaptations: PersonaAdjustment[];
    adaptationHistory: PersonaEvolution[];
    lastAdaptation: Date;
    adaptationTriggers: string[];
    effectivenessMetrics: PersonaEffectiveness;
}

export interface PersonaProfile {
    id: string;
    name: string;
    description: string;
    traits: PersonalityTrait[];
    communicationStyle: CommunicationAdaptation;
    expertiseAreas: string[];
    interactionPatterns: InteractionPattern[];
    adaptationRules: AdaptationRule[];
}

export interface PersonalityTrait {
    trait: string;
    intensity: number; // 0-1
    consistency: number; // 0-1
    contextDependency: boolean;
    applicableContexts?: string[];
}

export interface CommunicationAdaptation {
    formality: number; // 0-1
    technicality: number; // 0-1
    enthusiasm: number; // 0-1
    supportiveness: number; // 0-1
    directness: number; // 0-1
    creativity: number; // 0-1
    humor: number; // 0-1
}

export interface InteractionPattern {
    pattern: string;
    frequency: number;
    effectiveness: number; // 0-1
    contexts: string[];
    userFeedback: number; // -1 to 1
    lastUsed: Date;
}

export interface AdaptationRule {
    trigger: string;
    condition: string;
    adaptation: string;
    priority: number;
    enabled: boolean;
}

export interface PersonaAdjustment {
    type: 'trait' | 'communication' | 'expertise' | 'pattern';
    target: string;
    currentValue: number;
    suggestedValue: number;
    reasoning: string;
    confidence: number;
    urgency: 'low' | 'medium' | 'high';
}

export interface PersonaEvolution {
    timestamp: Date;
    changes: PersonaAdjustment[];
    trigger: string;
    effectiveness: number; // 0-1
    userSatisfaction: number; // 0-1
    notes: string;
}

export interface PersonaEffectiveness {
    overallSatisfaction: number; // 0-1
    engagementLevel: number; // 0-1
    taskCompletionRate: number; // 0-1
    userRetention: number; // 0-1
    adaptationSuccess: number; // 0-1
    feedbackScore: number; // -1 to 1
}

export interface CritiqueAnalysis {
    id: string;
    context: string;
    subject: string;
    perspectives: CritiquePerspective[];
    consensus: string;
    disagreements: string[];
    recommendations: string[];
    confidence: number;
    timestamp: Date;
}

export interface CritiquePerspective {
    critic: string;
    expertise: string[];
    analysis: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    confidence: number;
    reasoning: string;
}

export interface MultiPerspectiveAnalysis {
    topic: string;
    perspectives: {
        [viewpoint: string]: {
            analysis: string;
            evidence: string[];
            confidence: number;
            biases: string[];
            counterArguments: string[];
        };
    };
    synthesis: string;
    areasOfAgreement: string[];
    areasOfDisagreement: string[];
    recommendedApproach: string;
    uncertainties: string[];
}

export interface AutonomousReasoningConfig {
    enableSelfReflection: boolean;
    enableGoalSetting: boolean;
    enablePersonaAdaptation: boolean;
    enableCouncilOfCritics: boolean;
    
    reflectionFrequency: number; // minutes
    goalEvaluationInterval: number; // minutes
    personaAdaptationThreshold: number; // 0-1
    maxActiveGoals: number;
    maxReflectionHistory: number;
    
    criticCount: number;
    criticExpertise: string[];
    consensusThreshold: number; // 0-1
    
    adaptationSensitivity: number; // 0-1
    conservatismBias: number; // 0-1 (0 = very adaptive, 1 = very conservative)
}

export interface AutonomousReasoningContext {
    userId: string;
    conversationHistory: string[];
    currentGoals: AutonomousGoal[];
    recentReflections: SelfReflectionResult[];
    personaState: PersonaAdaptation;
    userFeedback: UserFeedbackData;
    environmentFactors: EnvironmentFactor[];
}

export interface UserFeedbackData {
    satisfactionRatings: number[];
    explicitFeedback: string[];
    implicitSignals: ImplicitSignal[];
    behaviorChanges: BehaviorChange[];
    preferences: UserPreference[];
}

export interface ImplicitSignal {
    signal: string;
    strength: number; // 0-1
    interpretation: string;
    confidence: number; // 0-1
    timestamp: Date;
}

export interface BehaviorChange {
    behavior: string;
    previousPattern: string;
    newPattern: string;
    significance: number; // 0-1
    timestamp: Date;
}

export interface UserPreference {
    domain: string;
    preference: string;
    strength: number; // 0-1
    stability: number; // 0-1
    lastObserved: Date;
}

export interface EnvironmentFactor {
    factor: string;
    value: any;
    influence: number; // -1 to 1
    reliability: number; // 0-1
    timestamp: Date;
}

export interface ReasoningProgress {
    goalId: string;
    currentStep: string;
    progress: number; // 0-1
    obstacles: string[];
    adaptations: string[];
    learnings: string[];
    timeToCompletion: number; // estimated minutes
}

export interface KnowledgeSynthesis {
    topic: string;
    sources: string[];
    synthesis: string;
    keyInsights: string[];
    gaps: string[];
    certaintyLevel: number; // 0-1
    methodologyUsed: string;
    timestamp: Date;
}