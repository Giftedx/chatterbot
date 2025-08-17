import { CognitiveOperation } from './context.js';

// B3: Enhanced operation mapping with context awareness and adaptability
export type ResponseStrategy = 'quick-reply' | 'deep-reason' | 'defer' | 'ignore';

export interface OperationMapping {
  operations: CognitiveOperation[];
  priority: number;
  confidence: number;
  tokenBudget: number;
  parallel: boolean; // Can operations run in parallel?
  dependencies: Array<{ operation: CognitiveOperation; required: boolean }>;
  contextRequirements?: {
    minConfidence?: number;
    maxTokens?: number;
    requiredFeatures?: string[];
    excludedFeatures?: string[];
  };
}

export interface ContextualFactors {
  userInteractionHistory?: number; // Recent interaction count
  channelActivity?: 'low' | 'medium' | 'high';
  messageComplexity?: 'low' | 'medium' | 'high';
  timeOfDay?: 'peak' | 'off-peak';
  userPreference?: 'speed' | 'accuracy' | 'balanced';
  systemLoad?: 'low' | 'medium' | 'high';
}

export interface MappingContext {
  strategy: ResponseStrategy;
  confidence: number;
  tokenEstimate: number;
  contextualFactors: ContextualFactors;
  previousResults?: {
    successful: boolean;
    executionTime: number;
    operations: CognitiveOperation[];
  };
}

/**
 * B3: Sophisticated strategy-to-operation mapping with context awareness,
 * adaptive learning, and optimization capabilities
 */
export class StrategyOperationMapper {
  private mappingRules: Map<string, OperationMapping[]>;
  private adaptationHistory: Map<string, Array<{ mapping: OperationMapping; success: boolean; executionTime: number }>>;
  private performanceMetrics: Map<string, { avgExecutionTime: number; successRate: number; usageCount: number }>;

  constructor() {
    this.mappingRules = new Map();
    this.adaptationHistory = new Map();
    this.performanceMetrics = new Map();
    this.initializeDefaultMappings();
  }

  /**
   * B3: Get operation mapping based on strategy and context
   */
  public getOperationMapping(context: MappingContext): OperationMapping {
    console.log('B3: Strategy-to-operation mapping initiated', {
      strategy: context.strategy,
      confidence: context.confidence,
      contextualFactors: context.contextualFactors
    });

    // B3: Get candidate mappings for the strategy
    const candidateMappings = this.getCandidateMappings(context);
    
    if (candidateMappings.length === 0) {
      console.warn('B3: No candidate mappings found, using fallback', { strategy: context.strategy });
      return this.getFallbackMapping(context);
    }

    // B3: Score and select the best mapping based on context
    const scoredMappings = candidateMappings.map(mapping => ({
      mapping,
      score: this.scoreMapping(mapping, context)
    }));

    // Sort by score (highest first)
    scoredMappings.sort((a, b) => b.score - a.score);
    
    const selectedMapping = scoredMappings[0].mapping;
    
    console.log('B3: Operation mapping selected', {
      strategy: context.strategy,
      operations: selectedMapping.operations,
      priority: selectedMapping.priority,
      score: scoredMappings[0].score,
      parallel: selectedMapping.parallel
    });

    return selectedMapping;
  }

  /**
   * B3: Record mapping performance for adaptive learning
   */
  public recordMappingPerformance(
    context: MappingContext, 
    mapping: OperationMapping, 
    result: { successful: boolean; executionTime: number }
  ): void {
    const key = this.getMappingKey(context.strategy, context.contextualFactors);
    
    // Record in adaptation history
    if (!this.adaptationHistory.has(key)) {
      this.adaptationHistory.set(key, []);
    }
    this.adaptationHistory.get(key)!.push({
      mapping,
      success: result.successful,
      executionTime: result.executionTime
    });

    // Update performance metrics
    const operationsKey = mapping.operations.join(',');
    if (!this.performanceMetrics.has(operationsKey)) {
      this.performanceMetrics.set(operationsKey, {
        avgExecutionTime: 0,
        successRate: 0,
        usageCount: 0
      });
    }

    const metrics = this.performanceMetrics.get(operationsKey)!;
    metrics.usageCount++;
    metrics.avgExecutionTime = (metrics.avgExecutionTime * (metrics.usageCount - 1) + result.executionTime) / metrics.usageCount;
    metrics.successRate = (metrics.successRate * (metrics.usageCount - 1) + (result.successful ? 1 : 0)) / metrics.usageCount;

    console.log('B3: Mapping performance recorded', {
      strategy: context.strategy,
      operations: mapping.operations,
      successful: result.successful,
      executionTime: result.executionTime,
      updatedMetrics: metrics
    });
  }

  /**
   * B3: Get performance insights for optimization
   */
  public getPerformanceInsights(): {
    topPerformingMappings: Array<{ operations: string; metrics: any }>;
    adaptationRecommendations: string[];
  } {
    const topPerforming = Array.from(this.performanceMetrics.entries())
      .sort((a, b) => (b[1].successRate * (1 / Math.log(b[1].avgExecutionTime + 1))) - 
                     (a[1].successRate * (1 / Math.log(a[1].avgExecutionTime + 1))))
      .slice(0, 5)
      .map(([operations, metrics]) => ({ operations, metrics }));

    const recommendations = this.generateAdaptationRecommendations();

    return {
      topPerformingMappings: topPerforming,
      adaptationRecommendations: recommendations
    };
  }

  // B3: Private methods for mapping logic
  private initializeDefaultMappings(): void {
    // Quick-reply mappings
    this.mappingRules.set('quick-reply:default', [{
      operations: [CognitiveOperation.Processing],
      priority: 1,
      confidence: 0.8,
      tokenBudget: 300,
      parallel: false,
      dependencies: []
    }]);

    this.mappingRules.set('quick-reply:high-confidence', [{
      operations: [CognitiveOperation.Processing, CognitiveOperation.Understanding],
      priority: 2,
      confidence: 0.9,
      tokenBudget: 500,
      parallel: true,
      dependencies: [
        { operation: CognitiveOperation.Processing, required: true }
      ],
      contextRequirements: {
        minConfidence: 0.8
      }
    }]);

    // Deep-reason mappings
    this.mappingRules.set('deep-reason:comprehensive', [{
      operations: [CognitiveOperation.Understanding, CognitiveOperation.Reasoning, CognitiveOperation.Remembering],
      priority: 3,
      confidence: 0.9,
      tokenBudget: 1500,
      parallel: false,
      dependencies: [
        { operation: CognitiveOperation.Understanding, required: true },
        { operation: CognitiveOperation.Reasoning, required: true }
      ]
    }]);

    this.mappingRules.set('deep-reason:research-heavy', [{
      operations: [CognitiveOperation.Researching, CognitiveOperation.Understanding, CognitiveOperation.Reasoning],
      priority: 4,
      confidence: 0.85,
      tokenBudget: 2000,
      parallel: false,
      dependencies: [
        { operation: CognitiveOperation.Researching, required: true },
        { operation: CognitiveOperation.Understanding, required: true }
      ],
      contextRequirements: {
        requiredFeatures: ['hasQuestion', 'highComplexity']
      }
    }]);

    // Defer mappings
    this.mappingRules.set('defer:routing-focused', [{
      operations: [CognitiveOperation.Researching, CognitiveOperation.Processing],
      priority: 2,
      confidence: 0.7,
      tokenBudget: 800,
      parallel: true,
      dependencies: [
        { operation: CognitiveOperation.Researching, required: true }
      ]
    }]);

    // Ignore mappings (minimal processing)
    this.mappingRules.set('ignore:minimal', [{
      operations: [CognitiveOperation.Processing],
      priority: 0,
      confidence: 0.3,
      tokenBudget: 100,
      parallel: false,
      dependencies: []
    }]);
  }

  private getCandidateMappings(context: MappingContext): OperationMapping[] {
    const candidates: OperationMapping[] = [];
    
    // Get all mappings for this strategy
    for (const [key, mappings] of this.mappingRules.entries()) {
      if (key.startsWith(`${context.strategy}:`)) {
        for (const mapping of mappings) {
          if (this.mappingMeetsRequirements(mapping, context)) {
            candidates.push(mapping);
          }
        }
      }
    }

    return candidates;
  }

  private mappingMeetsRequirements(mapping: OperationMapping, context: MappingContext): boolean {
    const requirements = mapping.contextRequirements;
    if (!requirements) return true;

    // Check confidence requirement
    if (requirements.minConfidence && context.confidence < requirements.minConfidence) {
      return false;
    }

    // Check token limit
    if (requirements.maxTokens && context.tokenEstimate > requirements.maxTokens) {
      return false;
    }

    // Additional requirement checks can be added here
    return true;
  }

  private scoreMapping(mapping: OperationMapping, context: MappingContext): number {
    let score = mapping.priority * 10; // Base score from priority

    // Confidence alignment bonus
    const confidenceAlignment = 1 - Math.abs(mapping.confidence - context.confidence);
    score += confidenceAlignment * 20;

    // Token budget efficiency
    const tokenEfficiency = Math.min(mapping.tokenBudget / Math.max(context.tokenEstimate, 1), 1);
    score += tokenEfficiency * 15;

    // Performance history bonus
    const operationsKey = mapping.operations.join(',');
    const metrics = this.performanceMetrics.get(operationsKey);
    if (metrics) {
      score += metrics.successRate * 10;
      score += Math.max(0, 10 - Math.log(metrics.avgExecutionTime + 1)); // Bonus for speed
    }

    // Context-specific bonuses
    score += this.getContextualBonus(mapping, context);

    return score;
  }

  private getContextualBonus(mapping: OperationMapping, context: MappingContext): number {
    let bonus = 0;

    const factors = context.contextualFactors;

    // System load adjustments
    if (factors.systemLoad === 'high' && mapping.parallel) {
      bonus -= 5; // Penalty for parallel processing under high load
    }

    // User preference alignment
    if (factors.userPreference === 'speed' && mapping.operations.length === 1) {
      bonus += 3;
    } else if (factors.userPreference === 'accuracy' && mapping.operations.length > 2) {
      bonus += 3;
    }

    // Channel activity considerations
    if (factors.channelActivity === 'high' && mapping.priority > 2) {
      bonus -= 2; // Prefer lighter processing in busy channels
    }

    return bonus;
  }

  private getFallbackMapping(context: MappingContext): OperationMapping {
    return {
      operations: [CognitiveOperation.Processing],
      priority: 1,
      confidence: 0.5,
      tokenBudget: Math.min(context.tokenEstimate * 0.5, 500),
      parallel: false,
      dependencies: []
    };
  }

  private getMappingKey(strategy: ResponseStrategy, factors: ContextualFactors): string {
    return `${strategy}:${factors.userPreference || 'unknown'}:${factors.systemLoad || 'unknown'}`;
  }

  private generateAdaptationRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Analyze adaptation history for patterns
    for (const [key, history] of this.adaptationHistory.entries()) {
      if (history.length >= 5) {
        const recentResults = history.slice(-5);
        const successRate = recentResults.filter(r => r.success).length / recentResults.length;
        
        if (successRate < 0.6) {
          recommendations.push(`Consider adjusting mapping for ${key} - low success rate (${(successRate * 100).toFixed(1)}%)`);
        }
        
        const avgTime = recentResults.reduce((sum, r) => sum + r.executionTime, 0) / recentResults.length;
        if (avgTime > 5000) { // 5 seconds
          recommendations.push(`Consider optimizing ${key} - high execution time (${avgTime.toFixed(0)}ms)`);
        }
      }
    }

    return recommendations;
  }
}