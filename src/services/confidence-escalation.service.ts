/**
 * D2: Confidence-based Escalation Service - Automatic escalation for low-confidence results
 *
 * This service manages escalation paths when initial processing results have low confidence:
 * - Automatically triggers additional reasoning services for low-confidence results
 * - Manages confidence thresholds with dynamic adjustment
 * - Provides escalation decision logging and performance tracking
 * - Implements smart escalation strategies to improve overall result quality
 */

import { logger } from '../utils/logger.js';
import { DecisionResult, DecisionContext } from './decision-engine.service.js';
import {
  ReasoningServiceSelector,
  ReasoningSelection,
} from './reasoning-service-selector.service.js';

export interface EscalationConfig {
  // Confidence thresholds for triggering escalation
  lowConfidenceThreshold: number;
  criticalConfidenceThreshold: number;

  // Escalation limits
  maxEscalationAttempts: number;
  maxEscalationTime: number; // milliseconds

  // Strategy-specific thresholds
  strategyThresholds: {
    [strategy: string]: {
      escalationThreshold: number;
      maxAttempts: number;
    };
  };

  // Context-based adjustments
  personalityAdjustments: boolean;
  systemLoadAdjustments: boolean;
}

export interface EscalationAttempt {
  attemptNumber: number;
  originalConfidence: number;
  serviceName: string;
  parameters: Record<string, any>;
  startTime: Date;
  endTime?: Date;
  resultConfidence?: number;
  success: boolean;
  errorMessage?: string;
  executionTimeMs?: number;
}

export interface EscalationResult {
  triggered: boolean;
  originalConfidence: number;
  finalConfidence: number;
  totalAttempts: number;
  successfulAttempts: number;
  totalExecutionTime: number;
  bestResult?: any;
  bestResultConfidence?: number;
  escalationPath: EscalationAttempt[];
  reasoning: string;
  recommendNextAction: string;
}

export interface EscalationMetrics {
  totalEscalations: number;
  successfulEscalations: number;
  averageImprovementRate: number; // Confidence improvement percentage
  averageExecutionTime: number;
  strategySuccessRates: Map<string, number>;
  serviceSuccessRates: Map<string, number>;
  lastUpdated: Date;
}

/**
 * Manages confidence-based escalation of reasoning services
 */
export class ConfidenceEscalationService {
  private config!: EscalationConfig;
  private escalationMetrics!: EscalationMetrics;
  private reasoningServiceSelector: ReasoningServiceSelector;

  constructor(reasoningServiceSelector: ReasoningServiceSelector) {
    this.reasoningServiceSelector = reasoningServiceSelector;
    this.initializeConfig();
    this.initializeMetrics();
  }

  /**
   * Initialize escalation configuration
   */
  private initializeConfig(): void {
    this.config = {
      lowConfidenceThreshold: 0.6,
      criticalConfidenceThreshold: 0.3,
      maxEscalationAttempts: 3,
      maxEscalationTime: 30000, // 30 seconds

      strategyThresholds: {
        'quick-reply': {
          escalationThreshold: 0.7, // Higher threshold for quick replies
          maxAttempts: 2,
        },
        'deep-reason': {
          escalationThreshold: 0.5, // Lower threshold for deep reasoning
          maxAttempts: 4,
        },
        defer: {
          escalationThreshold: 0.4, // Lowest threshold for deferred processing
          maxAttempts: 3,
        },
      },

      personalityAdjustments: true,
      systemLoadAdjustments: true,
    };
  }

  /**
   * Initialize escalation metrics
   */
  private initializeMetrics(): void {
    this.escalationMetrics = {
      totalEscalations: 0,
      successfulEscalations: 0,
      averageImprovementRate: 0,
      averageExecutionTime: 0,
      strategySuccessRates: new Map(),
      serviceSuccessRates: new Map(),
      lastUpdated: new Date(),
    };
  }

  /**
   * D2: Evaluate if escalation is needed and execute escalation path
   */
  async evaluateAndEscalate(
    originalResult: any,
    originalConfidence: number,
    decisionResult: DecisionResult,
    promptText: string,
    personalityContext?: DecisionContext['personality'],
    systemLoad?: number,
  ): Promise<EscalationResult> {
    const startTime = Date.now();

    logger.debug('Evaluating escalation need', {
      originalConfidence,
      strategy: decisionResult.strategy,
      threshold: this.getEscalationThreshold(
        decisionResult.strategy,
        personalityContext,
        systemLoad,
      ),
    });

    const escalationResult: EscalationResult = {
      triggered: false,
      originalConfidence,
      finalConfidence: originalConfidence,
      totalAttempts: 0,
      successfulAttempts: 0,
      totalExecutionTime: 0,
      escalationPath: [],
      reasoning: '',
      recommendNextAction: 'none',
    };

    // Check if escalation is needed
    if (
      !this.shouldEscalate(
        originalConfidence,
        decisionResult.strategy,
        personalityContext,
        systemLoad,
      )
    ) {
      escalationResult.reasoning = 'Confidence above threshold, no escalation needed';
      escalationResult.recommendNextAction = 'proceed';
      return escalationResult;
    }

    // Trigger escalation
    escalationResult.triggered = true;
    escalationResult.reasoning = 'Low confidence detected, initiating escalation';

    logger.info('Initiating confidence escalation', {
      originalConfidence,
      strategy: decisionResult.strategy,
      maxAttempts: this.getMaxAttempts(decisionResult.strategy),
    });

    // Execute escalation attempts
    await this.executeEscalationAttempts(
      escalationResult,
      decisionResult,
      promptText,
      personalityContext,
      systemLoad,
      startTime,
    );

    // Update metrics
    this.updateEscalationMetrics(escalationResult, decisionResult.strategy);

    return escalationResult;
  }

  /**
   * Determine if escalation should be triggered
   */
  private shouldEscalate(
    confidence: number,
    strategy: string,
    personalityContext?: DecisionContext['personality'],
    systemLoad?: number,
  ): boolean {
    const threshold = this.getEscalationThreshold(strategy, personalityContext, systemLoad);

    // Always escalate critically low confidence
    if (confidence < this.config.criticalConfidenceThreshold) {
      return true;
    }

    // Standard threshold check
    return confidence < threshold;
  }

  /**
   * Get escalation threshold based on strategy and context
   */
  private getEscalationThreshold(
    strategy: string,
    personalityContext?: DecisionContext['personality'],
    systemLoad?: number,
  ): number {
    let threshold = this.config.lowConfidenceThreshold;

    // Strategy-specific threshold
    const strategyConfig = this.config.strategyThresholds[strategy];
    if (strategyConfig) {
      threshold = strategyConfig.escalationThreshold;
    }

    // Personality adjustments
    if (this.config.personalityAdjustments && personalityContext) {
      // Higher standards for strong relationships
      if (
        personalityContext.relationshipStrength &&
        personalityContext.relationshipStrength > 0.8
      ) {
        threshold += 0.1; // Raise bar for escalation
      }

      // Lower threshold for frustrated users (escalate more readily)
      if (personalityContext.userMood === 'frustrated') {
        threshold -= 0.15;
      }

      // Adjust based on active persona
      if (personalityContext.activePersona?.personality?.supportiveness) {
        const supportiveness = personalityContext.activePersona.personality.supportiveness;
        if (supportiveness > 0.7) {
          threshold += 0.1; // Supportive personas have higher standards
        }
      }
    }

    // System load adjustments
    if (this.config.systemLoadAdjustments && systemLoad) {
      if (systemLoad > 0.8) {
        threshold -= 0.1; // Lower threshold under high load (escalate less)
      }
    }

    return Math.max(0.1, Math.min(0.9, threshold)); // Clamp between 0.1 and 0.9
  }

  /**
   * Get maximum escalation attempts for strategy
   */
  private getMaxAttempts(strategy: string): number {
    const strategyConfig = this.config.strategyThresholds[strategy];
    return strategyConfig?.maxAttempts || this.config.maxEscalationAttempts;
  }

  /**
   * Execute escalation attempts
   */
  private async executeEscalationAttempts(
    escalationResult: EscalationResult,
    decisionResult: DecisionResult,
    promptText: string,
    personalityContext?: DecisionContext['personality'],
    systemLoad?: number,
    startTime?: number,
  ): Promise<void> {
    const actualStartTime = startTime || Date.now();
    const maxAttempts = this.getMaxAttempts(decisionResult.strategy);
    let bestConfidence = escalationResult.originalConfidence;
    let bestResult: any = null;

    for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber++) {
      // Check time limit
      if (Date.now() - actualStartTime > this.config.maxEscalationTime) {
        logger.warn('Escalation time limit reached', {
          attemptNumber,
          timeElapsed: Date.now() - actualStartTime,
        });
        break;
      }

      const attempt = await this.executeEscalationAttempt(
        attemptNumber,
        decisionResult,
        promptText,
        personalityContext,
        systemLoad,
      );

      escalationResult.escalationPath.push(attempt);
      escalationResult.totalAttempts++;

      if (attempt.success && attempt.resultConfidence) {
        escalationResult.successfulAttempts++;

        // Track best result
        if (attempt.resultConfidence > bestConfidence) {
          bestConfidence = attempt.resultConfidence;
          bestResult = attempt; // In a real implementation, this would store the actual result
          escalationResult.bestResult = bestResult;
          escalationResult.bestResultConfidence = attempt.resultConfidence;
        }

        // Check if we've achieved sufficient confidence
        const targetThreshold = this.getEscalationThreshold(
          decisionResult.strategy,
          personalityContext,
          systemLoad,
        );
        if (attempt.resultConfidence >= targetThreshold + 0.2) {
          // Add buffer for success
          logger.info('Escalation successful', {
            attemptNumber,
            originalConfidence: escalationResult.originalConfidence,
            finalConfidence: attempt.resultConfidence,
            improvement: attempt.resultConfidence - escalationResult.originalConfidence,
          });
          break;
        }
      }
    }

    escalationResult.finalConfidence = bestConfidence;
    escalationResult.totalExecutionTime = Date.now() - actualStartTime;
    escalationResult.recommendNextAction = this.determineNextAction(escalationResult);
    escalationResult.reasoning = this.generateEscalationReasoning(escalationResult);
  }

  /**
   * Execute single escalation attempt
   */
  private async executeEscalationAttempt(
    attemptNumber: number,
    decisionResult: DecisionResult,
    promptText: string,
    personalityContext?: DecisionContext['personality'],
    systemLoad?: number,
  ): Promise<EscalationAttempt> {
    const attempt: EscalationAttempt = {
      attemptNumber,
      originalConfidence: decisionResult.confidence,
      serviceName: '',
      parameters: {},
      startTime: new Date(),
      success: false,
    };

    try {
      // Create modified decision result for escalation
      // Escalation attempts should use more sophisticated services
      const escalatedDecision: DecisionResult = {
        ...decisionResult,
        strategy: attemptNumber === 1 ? 'deep-reason' : 'defer', // Escalate strategy complexity
        confidence: Math.max(0.7, decisionResult.confidence + 0.1 * attemptNumber), // Boost confidence for service selection
        tokenEstimate: Math.min(8000, decisionResult.tokenEstimate * 1.3), // Allow more tokens
      };

      // Select escalation service
      const serviceSelection = await this.reasoningServiceSelector.selectReasoningService(
        escalatedDecision,
        promptText,
        personalityContext,
        systemLoad,
      );

      attempt.serviceName = serviceSelection.serviceName;
      attempt.parameters = serviceSelection.parameters;

      logger.debug('Executing escalation attempt', {
        attemptNumber,
        serviceName: attempt.serviceName,
        serviceConfidence: serviceSelection.confidence,
      });

      // Simulate service execution (in real implementation, this would call the actual service)
      const executionStart = Date.now();
      const mockResult = await this.simulateServiceExecution(serviceSelection, promptText);
      const executionTime = Date.now() - executionStart;

      attempt.endTime = new Date();
      attempt.executionTimeMs = executionTime;
      attempt.resultConfidence = mockResult.confidence;
      attempt.success = mockResult.success;

      if (!attempt.success) {
        attempt.errorMessage = mockResult.error;
      }

      // Record result with reasoning service selector
      this.reasoningServiceSelector.recordServiceResult(
        attempt.serviceName,
        attempt.success,
        executionTime,
        attempt.resultConfidence,
      );

      logger.debug('Escalation attempt completed', {
        attemptNumber,
        serviceName: attempt.serviceName,
        success: attempt.success,
        resultConfidence: attempt.resultConfidence,
        executionTimeMs: executionTime,
      });
    } catch (error) {
      attempt.endTime = new Date();
      attempt.success = false;
      attempt.errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Escalation attempt failed', {
        attemptNumber,
        serviceName: attempt.serviceName,
        error: attempt.errorMessage,
      });
    }

    return attempt;
  }

  /**
   * Simulate service execution for testing (replace with real service calls)
   */
  private async simulateServiceExecution(
    serviceSelection: ReasoningSelection,
    promptText: string,
  ): Promise<{ success: boolean; confidence: number; error?: string }> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 2000 + 500));

    // Simulate success/failure based on service characteristics
    const baseSuccess = Math.random();
    const serviceMetrics = this.reasoningServiceSelector
      .getPerformanceMetrics()
      .get(serviceSelection.serviceName);
    const successRate = serviceMetrics?.successRate || 0.8;

    const success = baseSuccess < successRate;

    if (!success) {
      return { success: false, confidence: 0, error: 'Service execution failed' };
    }

    // Simulate confidence improvement (better services typically improve confidence more)
    const improvementFactor = this.getServiceImprovementFactor(serviceSelection.serviceName);
    const baseConfidence = serviceSelection.confidence;
    const improvedConfidence = Math.min(1.0, baseConfidence + Math.random() * improvementFactor);

    return {
      success: true,
      confidence: improvedConfidence,
    };
  }

  /**
   * Get expected confidence improvement factor for different services
   */
  private getServiceImprovementFactor(serviceName: string): number {
    const improvementFactors: Record<string, number> = {
      'tree-of-thoughts': 0.3,
      'enhanced-reasoning': 0.25,
      'neural-symbolic': 0.2,
      'causal-reasoning': 0.15,
      'gemini-reasoning': 0.1,
      'gemini-direct': 0.05,
    };

    return improvementFactors[serviceName] || 0.1;
  }

  /**
   * Determine recommended next action based on escalation results
   */
  private determineNextAction(escalationResult: EscalationResult): string {
    if (!escalationResult.triggered) {
      return 'proceed';
    }

    if (escalationResult.successfulAttempts === 0) {
      return 'fallback_to_basic';
    }

    const improvement = escalationResult.finalConfidence - escalationResult.originalConfidence;

    if (improvement >= 0.2) {
      return 'proceed_with_best';
    } else if (improvement >= 0.1) {
      return 'proceed_with_caution';
    } else {
      return 'manual_review_recommended';
    }
  }

  /**
   * Generate human-readable reasoning for escalation
   */
  private generateEscalationReasoning(escalationResult: EscalationResult): string {
    if (!escalationResult.triggered) {
      return 'Original confidence sufficient, no escalation needed';
    }

    const improvement = escalationResult.finalConfidence - escalationResult.originalConfidence;
    const reasons = [];

    reasons.push(
      `Escalated from ${escalationResult.originalConfidence.toFixed(2)} to ${escalationResult.finalConfidence.toFixed(2)} confidence`,
    );

    if (escalationResult.successfulAttempts > 0) {
      reasons.push(
        `${escalationResult.successfulAttempts}/${escalationResult.totalAttempts} attempts successful`,
      );
    }

    if (improvement >= 0.2) {
      reasons.push('significant improvement achieved');
    } else if (improvement >= 0.1) {
      reasons.push('moderate improvement achieved');
    } else {
      reasons.push('minimal improvement achieved');
    }

    const bestService = escalationResult.escalationPath
      .filter((a) => a.success && a.resultConfidence)
      .sort((a, b) => (b.resultConfidence || 0) - (a.resultConfidence || 0))[0];

    if (bestService) {
      reasons.push(`best result from ${bestService.serviceName}`);
    }

    return reasons.join(', ');
  }

  /**
   * Update escalation metrics
   */
  private updateEscalationMetrics(escalationResult: EscalationResult, strategy: string): void {
    this.escalationMetrics.totalEscalations++;

    if (escalationResult.successfulAttempts > 0) {
      this.escalationMetrics.successfulEscalations++;
    }

    // Update improvement rate
    const improvement = escalationResult.finalConfidence - escalationResult.originalConfidence;
    const improvementPercent = (improvement / escalationResult.originalConfidence) * 100;

    this.escalationMetrics.averageImprovementRate =
      (this.escalationMetrics.averageImprovementRate *
        (this.escalationMetrics.totalEscalations - 1) +
        improvementPercent) /
      this.escalationMetrics.totalEscalations;

    // Update execution time
    this.escalationMetrics.averageExecutionTime =
      (this.escalationMetrics.averageExecutionTime * (this.escalationMetrics.totalEscalations - 1) +
        escalationResult.totalExecutionTime) /
      this.escalationMetrics.totalEscalations;

    // Update strategy success rates
    const currentSuccessRate = this.escalationMetrics.strategySuccessRates.get(strategy) || 0;
    const successRate = escalationResult.successfulAttempts > 0 ? 1 : 0;
    const newSuccessRate = currentSuccessRate * 0.9 + successRate * 0.1; // Exponential moving average
    this.escalationMetrics.strategySuccessRates.set(strategy, newSuccessRate);

    // Update service success rates
    escalationResult.escalationPath.forEach((attempt) => {
      const currentRate = this.escalationMetrics.serviceSuccessRates.get(attempt.serviceName) || 0;
      const newRate = currentRate * 0.9 + (attempt.success ? 1 : 0) * 0.1;
      this.escalationMetrics.serviceSuccessRates.set(attempt.serviceName, newRate);
    });

    this.escalationMetrics.lastUpdated = new Date();

    logger.debug('Escalation metrics updated', {
      totalEscalations: this.escalationMetrics.totalEscalations,
      successRate:
        this.escalationMetrics.successfulEscalations / this.escalationMetrics.totalEscalations,
      averageImprovement: this.escalationMetrics.averageImprovementRate.toFixed(2),
    });
  }

  /**
   * Update escalation configuration
   */
  updateConfig(newConfig: Partial<EscalationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Escalation configuration updated', newConfig);
  }

  /**
   * Get escalation metrics for monitoring
   */
  getEscalationMetrics(): EscalationMetrics {
    return { ...this.escalationMetrics };
  }

  /**
   * Get escalation configuration
   */
  getEscalationConfig(): EscalationConfig {
    return { ...this.config };
  }

  /**
   * Reset metrics (for testing or clean state)
   */
  resetMetrics(): void {
    this.initializeMetrics();
    logger.info('Escalation metrics reset');
  }
}
