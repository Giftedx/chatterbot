/**
 * D1: Reasoning Service Selector - Advanced reasoning service selection by strategy
 *
 * This service intelligently selects the most appropriate reasoning service based on:
 * - Decision strategy and confidence
 * - Query complexity and token estimates
 * - User context and preferences
 * - System load and resource availability
 * - Historical performance metrics
 */

import { logger } from '../utils/logger.js';
import { DecisionResult, DecisionContext } from './decision-engine.service.js';

export interface ReasoningServiceConfig {
  name: string;
  minConfidence: number;
  maxTokens: number;
  minTokens: number;
  complexity: 'simple' | 'moderate' | 'complex' | 'expert';
  executionTime: 'fast' | 'moderate' | 'slow';
  resourceIntensity: 'low' | 'medium' | 'high';
  fallbackTo?: string[];
  personalityAware: boolean;
  contextAware: boolean;
}

export interface ReasoningSelection {
  serviceName: string;
  config: ReasoningServiceConfig;
  parameters: Record<string, any>;
  confidence: number;
  reasoning: string;
  fallbacks: string[];
}

export interface ReasoningMetrics {
  totalSelections: number;
  successRate: number;
  averageExecutionTime: number;
  lastUsed: Date;
  performanceScore: number;
}

/**
 * Manages selection of reasoning services based on context and strategy
 */
export class ReasoningServiceSelector {
  private serviceConfigs: Map<string, ReasoningServiceConfig> = new Map();
  private performanceMetrics: Map<string, ReasoningMetrics> = new Map();
  private readonly fallbackChain: string[] = ['gemini-direct', 'simple-reasoning'];

  constructor() {
    this.initializeServiceConfigs();
  }

  /**
   * Initialize available reasoning service configurations
   */
  private initializeServiceConfigs(): void {
    const configs: ReasoningServiceConfig[] = [
      {
        name: 'tree-of-thoughts',
        minConfidence: 0.7,
        maxTokens: 8000,
        minTokens: 1000,
        complexity: 'expert',
        executionTime: 'slow',
        resourceIntensity: 'high',
        fallbackTo: ['enhanced-reasoning', 'neural-symbolic'],
        personalityAware: true,
        contextAware: true,
      },
      {
        name: 'enhanced-reasoning',
        minConfidence: 0.5,
        maxTokens: 4000,
        minTokens: 500,
        complexity: 'complex',
        executionTime: 'moderate',
        resourceIntensity: 'medium',
        fallbackTo: ['neural-symbolic', 'gemini-reasoning'],
        personalityAware: true,
        contextAware: true,
      },
      {
        name: 'neural-symbolic',
        minConfidence: 0.4,
        maxTokens: 3000,
        minTokens: 300,
        complexity: 'complex',
        executionTime: 'moderate',
        resourceIntensity: 'medium',
        fallbackTo: ['causal-reasoning', 'gemini-reasoning'],
        personalityAware: false,
        contextAware: true,
      },
      {
        name: 'causal-reasoning',
        minConfidence: 0.3,
        maxTokens: 2500,
        minTokens: 200,
        complexity: 'moderate',
        executionTime: 'fast',
        resourceIntensity: 'low',
        fallbackTo: ['gemini-reasoning'],
        personalityAware: false,
        contextAware: false,
      },
      {
        name: 'gemini-reasoning',
        minConfidence: 0.2,
        maxTokens: 6000,
        minTokens: 100,
        complexity: 'moderate',
        executionTime: 'fast',
        resourceIntensity: 'low',
        fallbackTo: ['gemini-direct'],
        personalityAware: true,
        contextAware: true,
      },
      {
        name: 'gemini-direct',
        minConfidence: 0.0,
        maxTokens: 8000,
        minTokens: 0,
        complexity: 'simple',
        executionTime: 'fast',
        resourceIntensity: 'low',
        fallbackTo: [],
        personalityAware: true,
        contextAware: false,
      },
    ];

    configs.forEach((config) => {
      this.serviceConfigs.set(config.name, config);
      this.performanceMetrics.set(config.name, {
        totalSelections: 0,
        successRate: 1.0,
        averageExecutionTime: 1000,
        lastUsed: new Date(),
        performanceScore: 0.5,
      });
    });
  }

  /**
   * D1: Select the best reasoning service based on strategy and context
   */
  async selectReasoningService(
    decisionResult: DecisionResult,
    promptText: string,
    personalityContext?: DecisionContext['personality'],
    systemLoad?: number,
  ): Promise<ReasoningSelection> {
    logger.debug('Selecting reasoning service', {
      strategy: decisionResult.strategy,
      confidence: decisionResult.confidence,
      tokenEstimate: decisionResult.tokenEstimate,
      hasPersonalityContext: !!personalityContext,
      systemLoad,
    });

    // Step 1: Strategy-based initial filtering
    const candidateServices = this.filterByStrategy(decisionResult.strategy);

    // Step 2: Apply confidence and token constraints
    const viableServices = this.applyConstraints(
      candidateServices,
      decisionResult.confidence,
      decisionResult.tokenEstimate,
    );

    // Step 3: Consider system load and resource availability
    const resourceFilteredServices = this.filterByResources(viableServices, systemLoad);

    // Step 4: Apply personality and context preferences
    const contextFilteredServices = this.applyContextFilters(
      resourceFilteredServices,
      personalityContext,
      promptText,
    );

    // Step 5: Score services based on historical performance
    const scoredServices = await this.scoreServices(
      contextFilteredServices,
      decisionResult,
      promptText,
    );

    // Step 6: Select the best service
    const selectedService = this.selectBestService(scoredServices);

    // Step 7: Generate parameters and fallback chain
    const parameters = this.generateServiceParameters(
      selectedService,
      decisionResult,
      personalityContext,
    );

    const fallbacks = this.buildFallbackChain(selectedService.name);

    const result: ReasoningSelection = {
      serviceName: selectedService.name,
      config: selectedService,
      parameters,
      confidence: this.calculateSelectionConfidence(selectedService, decisionResult),
      reasoning: this.generateSelectionReasoning(selectedService, decisionResult),
      fallbacks,
    };

    // Update metrics
    this.updateSelectionMetrics(selectedService.name);

    logger.info('Reasoning service selected', {
      service: result.serviceName,
      confidence: result.confidence,
      fallbacks: result.fallbacks.length,
      reasoning: result.reasoning,
    });

    return result;
  }

  /**
   * Filter services based on decision strategy
   */
  private filterByStrategy(strategy: string): ReasoningServiceConfig[] {
    const allServices = Array.from(this.serviceConfigs.values());

    switch (strategy) {
      case 'quick-reply':
        return allServices.filter(
          (s) => s.executionTime === 'fast' && s.resourceIntensity === 'low',
        );

      case 'deep-reason':
        return allServices.filter((s) => s.complexity === 'complex' || s.complexity === 'expert');

      case 'defer':
        return allServices.filter((s) => s.complexity === 'moderate' || s.complexity === 'complex');

      default:
        return allServices;
    }
  }

  /**
   * Apply confidence and token constraints
   */
  private applyConstraints(
    services: ReasoningServiceConfig[],
    confidence: number,
    tokenEstimate: number,
  ): ReasoningServiceConfig[] {
    return services.filter(
      (service) =>
        confidence >= service.minConfidence &&
        tokenEstimate <= service.maxTokens &&
        tokenEstimate >= service.minTokens,
    );
  }

  /**
   * Filter services based on system resources
   */
  private filterByResources(
    services: ReasoningServiceConfig[],
    systemLoad?: number,
  ): ReasoningServiceConfig[] {
    if (!systemLoad || systemLoad < 0.7) {
      return services; // All services available under normal load
    }

    if (systemLoad > 0.9) {
      // High load: only low-intensity services
      return services.filter((s) => s.resourceIntensity === 'low');
    }

    // Medium-high load: exclude high-intensity services
    return services.filter((s) => s.resourceIntensity !== 'high');
  }

  /**
   * Apply personality and context filters
   */
  private applyContextFilters(
    services: ReasoningServiceConfig[],
    personalityContext?: DecisionContext['personality'],
    promptText?: string,
  ): ReasoningServiceConfig[] {
    let filtered = services;

    // If personality context is important, prefer personality-aware services
    if (personalityContext?.relationshipStrength && personalityContext.relationshipStrength > 0.6) {
      const personalityAware = services.filter((s) => s.personalityAware);
      if (personalityAware.length > 0) {
        filtered = personalityAware;
      }
    }

    // For complex analytical queries, prefer advanced services
    if (promptText && this.isComplexAnalyticalQuery(promptText)) {
      const advanced = filtered.filter(
        (s) => s.complexity === 'expert' || s.complexity === 'complex',
      );
      if (advanced.length > 0) {
        filtered = advanced;
      }
    }

    return filtered;
  }

  /**
   * Score services based on historical performance
   */
  private async scoreServices(
    services: ReasoningServiceConfig[],
    decisionResult: DecisionResult,
    promptText: string,
  ): Promise<Array<{ service: ReasoningServiceConfig; score: number }>> {
    return services.map((service) => {
      const metrics = this.performanceMetrics.get(service.name);
      let score = 0.5; // Base score

      if (metrics) {
        // Performance-based scoring
        score += metrics.performanceScore * 0.3;
        score += metrics.successRate * 0.2;

        // Recency bonus
        const daysSinceLastUsed = (Date.now() - metrics.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
        score += Math.max(0, (7 - daysSinceLastUsed) / 7) * 0.1;

        // Execution time preference (faster is better for most cases)
        const timePreference =
          service.executionTime === 'fast' ? 0.15 : service.executionTime === 'moderate' ? 0.05 : 0;
        score += timePreference;
      }

      // Strategy alignment bonus
      if (this.isServiceAlignedWithStrategy(service, decisionResult.strategy)) {
        score += 0.2;
      }

      return { service, score: Math.min(1.0, score) };
    });
  }

  /**
   * Select the best service from scored options
   */
  private selectBestService(
    scoredServices: Array<{ service: ReasoningServiceConfig; score: number }>,
  ): ReasoningServiceConfig {
    if (scoredServices.length === 0) {
      // Fallback to gemini-direct if no services match
      return this.serviceConfigs.get('gemini-direct')!;
    }

    // Sort by score descending
    const sorted = scoredServices.sort((a, b) => b.score - a.score);

    // Add some randomness to prevent always using the same service
    const topServices = sorted.filter((s) => s.score >= sorted[0].score * 0.9);
    const randomIndex = Math.floor(Math.random() * Math.min(3, topServices.length));

    return topServices[randomIndex].service;
  }

  /**
   * Generate service-specific parameters
   */
  private generateServiceParameters(
    service: ReasoningServiceConfig,
    decisionResult: DecisionResult,
    personalityContext?: DecisionContext['personality'],
  ): Record<string, any> {
    const baseParams: Record<string, any> = {
      confidence: decisionResult.confidence,
      tokenBudget: Math.min(service.maxTokens, decisionResult.tokenEstimate * 1.2),
    };

    switch (service.name) {
      case 'tree-of-thoughts':
        return {
          ...baseParams,
          maxDepth: Math.min(4, Math.ceil(decisionResult.tokenEstimate / 1000)),
          branchingFactor: decisionResult.confidence > 0.8 ? 3 : 2,
          pruningThreshold:
            personalityContext?.activePersona?.personality?.directness &&
            personalityContext.activePersona.personality.directness > 0.7
              ? 0.5
              : 0.4,
          personalityContext,
        };

      case 'enhanced-reasoning':
        return {
          ...baseParams,
          reasoningDepth: decisionResult.confidence > 0.7 ? 'deep' : 'standard',
          includeConfidenceScoring: true,
          personalityContext,
        };

      case 'neural-symbolic':
        return {
          ...baseParams,
          symbolicWeight: 0.6,
          neuralWeight: 0.4,
          maxIterations: Math.ceil(decisionResult.confidence * 5),
        };

      case 'causal-reasoning':
        return {
          ...baseParams,
          causalDepth: Math.min(3, Math.ceil(decisionResult.confidence * 4)),
          includeCounterfactuals: decisionResult.confidence > 0.6,
        };

      default:
        return baseParams;
    }
  }

  /**
   * Build fallback chain for the selected service
   */
  private buildFallbackChain(serviceName: string): string[] {
    const service = this.serviceConfigs.get(serviceName);
    if (!service || !service.fallbackTo || service.fallbackTo.length === 0) {
      return [...this.fallbackChain];
    }

    const fallbacks = [...service.fallbackTo];

    // Add global fallbacks if not already included
    this.fallbackChain.forEach((fb) => {
      if (!fallbacks.includes(fb) && fb !== serviceName) {
        fallbacks.push(fb);
      }
    });

    return fallbacks;
  }

  /**
   * Calculate confidence in the service selection
   */
  private calculateSelectionConfidence(
    service: ReasoningServiceConfig,
    decisionResult: DecisionResult,
  ): number {
    const metrics = this.performanceMetrics.get(service.name);
    if (!metrics) return 0.5;

    let confidence = 0.5;
    confidence += metrics.successRate * 0.3;
    confidence += metrics.performanceScore * 0.2;

    // Boost confidence if service well-aligned with decision
    if (decisionResult.confidence >= service.minConfidence * 1.2) {
      confidence += 0.2;
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Generate human-readable reasoning for the selection
   */
  private generateSelectionReasoning(
    service: ReasoningServiceConfig,
    decisionResult: DecisionResult,
  ): string {
    const reasons = [];

    if (decisionResult.confidence >= service.minConfidence * 1.5) {
      reasons.push('high confidence match');
    }

    if (decisionResult.tokenEstimate > 2000 && service.complexity === 'expert') {
      reasons.push('complex query requires advanced reasoning');
    }

    if (service.executionTime === 'fast' && decisionResult.strategy === 'quick-reply') {
      reasons.push('optimized for quick responses');
    }

    const metrics = this.performanceMetrics.get(service.name);
    if (metrics && metrics.successRate > 0.8) {
      reasons.push('proven track record');
    }

    return reasons.join(', ') || 'best available option';
  }

  /**
   * Update selection metrics
   */
  private updateSelectionMetrics(serviceName: string): void {
    const metrics = this.performanceMetrics.get(serviceName);
    if (metrics) {
      metrics.totalSelections += 1;
      metrics.lastUsed = new Date();
    }
  }

  /**
   * Record service execution results for learning
   * D4: This will be used for decision learning and adaptation
   */
  recordServiceResult(
    serviceName: string,
    success: boolean,
    executionTimeMs: number,
    qualityScore?: number,
  ): void {
    const metrics = this.performanceMetrics.get(serviceName);
    if (!metrics) return;

    // Update success rate using exponential moving average
    metrics.successRate = metrics.successRate * 0.9 + (success ? 1 : 0) * 0.1;

    // Update average execution time
    metrics.averageExecutionTime = metrics.averageExecutionTime * 0.8 + executionTimeMs * 0.2;

    // Update performance score
    if (qualityScore !== undefined) {
      metrics.performanceScore = metrics.performanceScore * 0.7 + qualityScore * 0.3;
    }

    logger.debug('Service metrics updated', {
      serviceName,
      success,
      executionTimeMs,
      qualityScore,
      newSuccessRate: metrics.successRate,
      newPerformanceScore: metrics.performanceScore,
    });
  }

  /**
   * Utility methods
   */
  private isComplexAnalyticalQuery(promptText: string): boolean {
    const complexIndicators = [
      'analyze',
      'compare',
      'evaluate',
      'assess',
      'critique',
      'pros and cons',
      'advantages',
      'disadvantages',
      'trade-offs',
      'implications',
      'consequences',
      'impact',
      'relationships',
    ];

    const lowerText = promptText.toLowerCase();
    return complexIndicators.some((indicator) => lowerText.includes(indicator));
  }

  private isServiceAlignedWithStrategy(service: ReasoningServiceConfig, strategy: string): boolean {
    switch (strategy) {
      case 'quick-reply':
        return service.executionTime === 'fast';
      case 'deep-reason':
        return service.complexity === 'expert' || service.complexity === 'complex';
      case 'defer':
        return service.contextAware;
      default:
        return true;
    }
  }

  /**
   * Get service configurations for debugging
   */
  getServiceConfigs(): Map<string, ReasoningServiceConfig> {
    return new Map(this.serviceConfigs);
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics(): Map<string, ReasoningMetrics> {
    return new Map(this.performanceMetrics);
  }
}
