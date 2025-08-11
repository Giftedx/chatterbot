/**
 * Advanced Reasoning Types and Interfaces
 * 
 * Defines core types for advanced reasoning capabilities
 */

// Core reasoning step interface
export interface ReasoningStep {
    id: string;
    type: 'observation' | 'thought' | 'action' | 'criticism' | 'refinement';
    content: string;
    timestamp: Date;
    confidence?: number;
    metadata?: Record<string, any>;
}

// ReAct Framework Types
export interface ReActStep {
    thought: string;
    action?: {
        name: string;
        parameters: Record<string, any>;
    };
    observation?: string;
    reasoning: string;
    confidence: number;
}

export interface ReActSession {
    id: string;
    goal: string;
    steps: ReActStep[];
    currentStep: number;
    isComplete: boolean;
    finalAnswer?: string;
    metadata: Record<string, any>;
}

// Chain of Draft Types
export interface Draft {
    id: string;
    content: string;
    version: number;
    critiques: Critique[];
    improvements: string[];
    confidence: number;
    metadata: Record<string, any>;
}

export interface Critique {
    id: string;
    focus: 'accuracy' | 'completeness' | 'clarity' | 'logic' | 'creativity';
    content: string;
    severity: 'minor' | 'moderate' | 'major';
    suggestions: string[];
    metadata?: Record<string, any>;
}

export interface ChainOfDraftSession {
    id: string;
    originalPrompt: string;
    drafts: Draft[];
    currentDraft: number;
    maxDrafts: number;
    isComplete: boolean;
    finalDraft?: Draft;
}

// Tree of Thoughts Types
export interface ThoughtNode {
    id: string;
    content: string;
    parentId?: string;
    children: string[];
    depth: number;
    value: number;
    isExpanded: boolean;
    isSelected: boolean;
    metadata: Record<string, any>;
}

export interface TreeOfThoughtsSession {
    id: string;
    problem: string;
    nodes: Map<string, ThoughtNode>;
    rootNodeId: string;
    selectedPath: string[];
    maxDepth: number;
    branchingFactor: number;
    isComplete: boolean;
    solution?: string;
}

// Council of Critics Types
export interface Critic {
    id: string;
    name: string;
    perspective: string;
    expertise: string[];
    personalityTraits: string[];
}

export interface CriticAnalysis {
    criticId: string;
    analysis: string;
    rating: number; // 1-10
    suggestions: string[];
    concerns: string[];
    strengths: string[];
}

export interface CouncilSession {
    id: string;
    topic: string;
    critics: Critic[];
    analyses: CriticAnalysis[];
    consensus?: string;
    finalRecommendation?: string;
    conflictResolution?: string;
    metadata?: Record<string, any>;
}

// Meta-cognitive Types
export interface MetaCognitiveState {
    currentStrategy: string;
    strategiesUsed: string[];
    effectiveness: Record<string, number>;
    confidence: number;
    uncertaintyAreas: string[];
    needsHumanInput: boolean;
}

export interface SelfReflection {
    id: string;
    trigger: string;
    analysis: string;
    improvements: string[];
    strategicChanges: string[];
    confidenceUpdate: number;
}

// Advanced Response Types
export interface AdvancedReasoningResponse {
    id: string;
    type: 'react' | 'chain-of-draft' | 'tree-of-thoughts' | 'council' | 'meta-cognitive';
    primaryResponse: string;
    reasoningProcess: ReasoningStep[];
    confidence: number;
    alternatives?: string[];
    metadata: {
        processingTime: number;
        complexityScore: number;
        resourcesUsed: string[];
        errorRecovery?: string[];
        synthesizedFrom?: string[];
    };
}

// Configuration Types
export interface AdvancedReasoningConfig {
    enableReAct: boolean;
    enableChainOfDraft: boolean;
    enableTreeOfThoughts: boolean;
    enableCouncilOfCritics: boolean;
    enableMetaCognitive: boolean;
    
    // Performance settings
    maxProcessingTime: number;
    maxReasoningSteps: number;
    confidenceThreshold: number;
    
    // Quality settings
    enableSelfReflection: boolean;
    enableErrorRecovery: boolean;
    adaptiveComplexity: boolean;
}