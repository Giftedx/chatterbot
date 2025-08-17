/**
 * Tree of Thoughts Types
 * 
 * Type definitions for Tree of Thoughts reasoning system
 */

export interface ThoughtNode {
  id: string;
  content: string;
  parentId: string | null;
  children: string[];
  depth: number;
  value: number; // Evaluated score
  isExpanded: boolean;
  isSelected: boolean;
  metadata: {
    timestamp: Date;
    generationIndex?: number;
    evaluationReason?: string;
  };
}

export interface TreeOfThoughtsSession {
  id: string;
  problem: string;
  rootNodeId: string;
  nodes: Map<string, ThoughtNode>;
  maxDepth: number;
  branchingFactor: number;
  isComplete: boolean;
  selectedPath?: string[];
  createdAt: Date;
}

export interface ReasoningStep {
  id: string;
  type: 'thought' | 'evaluation' | 'selection';
  content: string;
  timestamp: Date;
  confidence: number;
  metadata: Record<string, any>;
}

export interface AdvancedReasoningResponse {
  id: string;
  type: 'tree-of-thoughts' | 'react' | 'chain-of-thought';
  primaryResponse: string;
  reasoningProcess: ReasoningStep[];
  confidence: number;
  alternatives: string[];
  metadata: {
    processingTime: number;
    complexityScore: number;
    resourcesUsed: string[];
  };
}

export interface TreeSearchConfig {
  maxDepth: number;
  branchingFactor: number;
  evaluationMethod: 'value' | 'vote' | 'confidence';
  searchStrategy: 'breadth-first' | 'depth-first' | 'best-first';
  pruningThreshold: number;
}

export interface ThoughtEvaluation {
  nodeId: string;
  value: number;
  reasoning: string;
  isPromising: boolean;
  shouldExpand: boolean;
}