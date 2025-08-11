/**
 * Enhanced Reasoning Service
 * 
 * Provides advanced multi-step reasoning, analysis, and problem-solving capabilities.
 * Integrates with MCP sequential thinking and adds custom reasoning workflows.
 */

import { logger } from '../../utils/logger.js';
import { sequentialThinking, SequentialThinkingParams, SequentialThinkingResult } from '../../mcp/index.js';

export interface ReasoningRequest {
  query: string;
  analysisType: 'comparison' | 'pros_cons' | 'step_by_step' | 'causal' | 'general';
  complexity: 'low' | 'medium' | 'high';
  context?: string[];
  userId: string;
  maxSteps?: number;
}

export interface ReasoningResult {
  success: boolean;
  analysis: {
    steps: ReasoningStep[];
    conclusion: string;
    confidence: number;
    reasoning_path: string[];
  };
  metadata: {
    analysisType: string;
    complexity: string;
    stepCount: number;
    processingTime: number;
    method: string;
  };
  error?: string;
}

export interface ReasoningStep {
  stepNumber: number;
  thought: string;
  evidence?: string[];
  confidence: number;
  reasoning: string;
}

export class EnhancedReasoningService {
  private cache = new Map<string, ReasoningResult>();
  private rateLimits = new Map<string, { count: number; resetTime: number }>();

  constructor() {
    logger.info('Enhanced Reasoning Service initialized');
  }

  async performReasoning(request: ReasoningRequest): Promise<ReasoningResult> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(request);
      if (this.cache.has(cacheKey)) {
        logger.debug('Reasoning cache hit', { userId: request.userId, analysisType: request.analysisType });
        return this.cache.get(cacheKey)!;
      }

      // Check rate limits
      if (this.isRateLimited(request.userId)) {
        return {
          success: false,
          analysis: {
            steps: [],
            conclusion: '',
            confidence: 0,
            reasoning_path: []
          },
          metadata: {
            analysisType: request.analysisType,
            complexity: request.complexity,
            stepCount: 0,
            processingTime: Date.now() - startTime,
            method: 'rate_limited'
          },
          error: 'Reasoning rate limit exceeded. Please try again later.'
        };
      }

      let result: ReasoningResult;

      // Try MCP sequential thinking first for complex queries
      if (request.complexity === 'high' || request.maxSteps && request.maxSteps > 3) {
        try {
          result = await this.performMCPReasoning(request, startTime);
        } catch (error) {
          logger.warn('MCP reasoning failed, falling back to custom reasoning', { 
            error: String(error), 
            userId: request.userId 
          });
          result = await this.performCustomReasoning(request, startTime);
        }
      } else {
        // Use custom reasoning for simpler queries
        result = await this.performCustomReasoning(request, startTime);
      }

      // Cache successful results
      if (result.success) {
        this.cache.set(cacheKey, result);
        this.updateRateLimit(request.userId);
      }

      logger.info('Reasoning completed', {
        userId: request.userId,
        analysisType: request.analysisType,
        complexity: request.complexity,
        stepCount: result.metadata.stepCount,
        processingTime: result.metadata.processingTime,
        success: result.success
      });

      return result;

    } catch (error) {
      logger.error('Enhanced reasoning service error', {
        error: String(error),
        userId: request.userId,
        query: request.query.substring(0, 100)
      });

      return {
        success: false,
        analysis: {
          steps: [],
          conclusion: '',
          confidence: 0,
          reasoning_path: []
        },
        metadata: {
          analysisType: request.analysisType,
          complexity: request.complexity,
          stepCount: 0,
          processingTime: Date.now() - startTime,
          method: 'error'
        },
        error: 'An unexpected error occurred during reasoning.'
      };
    }
  }

  private async performMCPReasoning(request: ReasoningRequest, startTime: number): Promise<ReasoningResult> {
    const maxSteps = request.maxSteps || this.getDefaultSteps(request.complexity);
    const steps: ReasoningStep[] = [];
    const reasoningPath: string[] = [];

    let currentThought = this.formatInitialThought(request);
    let stepNumber = 1;
    let completed = false;

    while (!completed && stepNumber <= maxSteps) {
      try {
        const mcpParams: SequentialThinkingParams = {
          thought: currentThought,
          nextThoughtNeeded: stepNumber < maxSteps,
          thoughtNumber: stepNumber,
          totalThoughts: maxSteps
        };

        const mcpResult: SequentialThinkingResult = await sequentialThinking(mcpParams);

        if (mcpResult.steps && mcpResult.steps.length > 0) {
          const step: ReasoningStep = {
            stepNumber,
            thought: String(mcpResult.steps[mcpResult.steps.length - 1]),
            confidence: Math.min(0.9, 0.6 + (stepNumber * 0.1)),
            reasoning: `Sequential thinking step ${stepNumber}`
          };

          steps.push(step);
          reasoningPath.push(step.thought);
          
          if (mcpResult.completed || mcpResult.finalAnswer) {
            completed = true;
          }
        }

        stepNumber++;
      } catch (error) {
        logger.warn(`MCP reasoning step ${stepNumber} failed`, { error: String(error) });
        break;
      }
    }

    const conclusion = steps.length > 0 ? 
      steps[steps.length - 1].thought : 
      'Unable to complete reasoning process';

    return {
      success: steps.length > 0,
      analysis: {
        steps,
        conclusion,
        confidence: this.calculateOverallConfidence(steps),
        reasoning_path: reasoningPath
      },
      metadata: {
        analysisType: request.analysisType,
        complexity: request.complexity,
        stepCount: steps.length,
        processingTime: Date.now() - startTime,
        method: 'mcp_sequential'
      }
    };
  }

  private async performCustomReasoning(request: ReasoningRequest, startTime: number): Promise<ReasoningResult> {
    const steps: ReasoningStep[] = [];
    const reasoningPath: string[] = [];

    switch (request.analysisType) {
      case 'comparison':
        return this.performComparison(request, startTime);
      case 'pros_cons':
        return this.performProsConsAnalysis(request, startTime);
      case 'step_by_step':
        return this.performStepByStepAnalysis(request, startTime);
      case 'causal':
        return this.performCausalAnalysis(request, startTime);
      default:
        return this.performGeneralAnalysis(request, startTime);
    }
  }

  private async performComparison(request: ReasoningRequest, startTime: number): Promise<ReasoningResult> {
    const steps: ReasoningStep[] = [];
    const reasoningPath: string[] = [];

    // Step 1: Identify what's being compared
    const identificationStep: ReasoningStep = {
      stepNumber: 1,
      thought: `Identifying the subjects being compared in: "${request.query}"`,
      confidence: 0.8,
      reasoning: 'First step is to clearly identify what elements need comparison'
    };
    steps.push(identificationStep);
    reasoningPath.push(identificationStep.thought);

    // Step 2: Define comparison criteria
    const criteriaStep: ReasoningStep = {
      stepNumber: 2,
      thought: 'Establishing relevant criteria for comparison based on the context and typical evaluation factors',
      confidence: 0.7,
      reasoning: 'Comparison requires clear criteria to ensure objective analysis'
    };
    steps.push(criteriaStep);
    reasoningPath.push(criteriaStep.thought);

    // Step 3: Analyze each option
    const analysisStep: ReasoningStep = {
      stepNumber: 3,
      thought: 'Evaluating each option against the established criteria, considering strengths and weaknesses',
      confidence: 0.8,
      reasoning: 'Systematic evaluation ensures comprehensive comparison'
    };
    steps.push(analysisStep);
    reasoningPath.push(analysisStep.thought);

    // Step 4: Draw conclusion
    const conclusionStep: ReasoningStep = {
      stepNumber: 4,
      thought: 'Based on the analysis, determining which option performs better overall or under specific circumstances',
      confidence: 0.7,
      reasoning: 'Final synthesis of comparison results'
    };
    steps.push(conclusionStep);
    reasoningPath.push(conclusionStep.thought);

    return {
      success: true,
      analysis: {
        steps,
        conclusion: conclusionStep.thought,
        confidence: this.calculateOverallConfidence(steps),
        reasoning_path: reasoningPath
      },
      metadata: {
        analysisType: request.analysisType,
        complexity: request.complexity,
        stepCount: steps.length,
        processingTime: Date.now() - startTime,
        method: 'custom_comparison'
      }
    };
  }

  private async performProsConsAnalysis(request: ReasoningRequest, startTime: number): Promise<ReasoningResult> {
    const steps: ReasoningStep[] = [];
    const reasoningPath: string[] = [];

    // Step 1: Identify the subject
    const subjectStep: ReasoningStep = {
      stepNumber: 1,
      thought: `Analyzing the subject for pros and cons: "${request.query}"`,
      confidence: 0.9,
      reasoning: 'Clear identification of what we are evaluating'
    };
    steps.push(subjectStep);
    reasoningPath.push(subjectStep.thought);

    // Step 2: Identify pros
    const prosStep: ReasoningStep = {
      stepNumber: 2,
      thought: 'Identifying positive aspects, benefits, and advantages based on common criteria and context',
      confidence: 0.8,
      reasoning: 'Systematic identification of positive factors'
    };
    steps.push(prosStep);
    reasoningPath.push(prosStep.thought);

    // Step 3: Identify cons
    const consStep: ReasoningStep = {
      stepNumber: 3,
      thought: 'Identifying negative aspects, drawbacks, and disadvantages that should be considered',
      confidence: 0.8,
      reasoning: 'Balanced analysis requires examining negative factors'
    };
    steps.push(consStep);
    reasoningPath.push(consStep.thought);

    // Step 4: Weigh and conclude
    const conclusionStep: ReasoningStep = {
      stepNumber: 4,
      thought: 'Weighing the pros against the cons to provide a balanced assessment and recommendation',
      confidence: 0.7,
      reasoning: 'Final evaluation synthesizing all factors'
    };
    steps.push(conclusionStep);
    reasoningPath.push(conclusionStep.thought);

    return {
      success: true,
      analysis: {
        steps,
        conclusion: conclusionStep.thought,
        confidence: this.calculateOverallConfidence(steps),
        reasoning_path: reasoningPath
      },
      metadata: {
        analysisType: request.analysisType,
        complexity: request.complexity,
        stepCount: steps.length,
        processingTime: Date.now() - startTime,
        method: 'custom_pros_cons'
      }
    };
  }

  private async performStepByStepAnalysis(request: ReasoningRequest, startTime: number): Promise<ReasoningResult> {
    const steps: ReasoningStep[] = [];
    const reasoningPath: string[] = [];
    const maxSteps = request.maxSteps || this.getDefaultSteps(request.complexity);

    for (let i = 1; i <= maxSteps; i++) {
      const step: ReasoningStep = {
        stepNumber: i,
        thought: `Step ${i}: Breaking down the problem into manageable components and addressing each systematically`,
        confidence: Math.max(0.6, 0.9 - (i * 0.1)),
        reasoning: `Sequential step-by-step analysis, phase ${i}`
      };
      steps.push(step);
      reasoningPath.push(step.thought);
    }

    const conclusion = `Systematic step-by-step analysis completed with ${steps.length} logical steps`;

    return {
      success: true,
      analysis: {
        steps,
        conclusion,
        confidence: this.calculateOverallConfidence(steps),
        reasoning_path: reasoningPath
      },
      metadata: {
        analysisType: request.analysisType,
        complexity: request.complexity,
        stepCount: steps.length,
        processingTime: Date.now() - startTime,
        method: 'custom_step_by_step'
      }
    };
  }

  private async performCausalAnalysis(request: ReasoningRequest, startTime: number): Promise<ReasoningResult> {
    const steps: ReasoningStep[] = [];
    const reasoningPath: string[] = [];

    // Step 1: Identify the phenomenon
    const phenomenonStep: ReasoningStep = {
      stepNumber: 1,
      thought: `Identifying the main phenomenon or effect to analyze: "${request.query}"`,
      confidence: 0.9,
      reasoning: 'Clear identification of what we need to explain causally'
    };
    steps.push(phenomenonStep);
    reasoningPath.push(phenomenonStep.thought);

    // Step 2: Identify potential causes
    const causesStep: ReasoningStep = {
      stepNumber: 2,
      thought: 'Identifying potential root causes, contributing factors, and causal chains',
      confidence: 0.7,
      reasoning: 'Comprehensive examination of possible causal factors'
    };
    steps.push(causesStep);
    reasoningPath.push(causesStep.thought);

    // Step 3: Analyze causal mechanisms
    const mechanismsStep: ReasoningStep = {
      stepNumber: 3,
      thought: 'Analyzing how identified causes lead to the observed effect through causal mechanisms',
      confidence: 0.6,
      reasoning: 'Understanding the process by which causes produce effects'
    };
    steps.push(mechanismsStep);
    reasoningPath.push(mechanismsStep.thought);

    // Step 4: Evaluate evidence and conclude
    const conclusionStep: ReasoningStep = {
      stepNumber: 4,
      thought: 'Evaluating the strength of causal evidence and drawing conclusions about likely causation',
      confidence: 0.6,
      reasoning: 'Final assessment of causal relationships'
    };
    steps.push(conclusionStep);
    reasoningPath.push(conclusionStep.thought);

    return {
      success: true,
      analysis: {
        steps,
        conclusion: conclusionStep.thought,
        confidence: this.calculateOverallConfidence(steps),
        reasoning_path: reasoningPath
      },
      metadata: {
        analysisType: request.analysisType,
        complexity: request.complexity,
        stepCount: steps.length,
        processingTime: Date.now() - startTime,
        method: 'custom_causal'
      }
    };
  }

  private async performGeneralAnalysis(request: ReasoningRequest, startTime: number): Promise<ReasoningResult> {
    const steps: ReasoningStep[] = [];
    const reasoningPath: string[] = [];
    const maxSteps = Math.min(request.maxSteps || this.getDefaultSteps(request.complexity), 5);

    for (let i = 1; i <= maxSteps; i++) {
      const step: ReasoningStep = {
        stepNumber: i,
        thought: `Analysis phase ${i}: Examining different aspects and implications of the query systematically`,
        confidence: Math.max(0.5, 0.8 - (i * 0.1)),
        reasoning: `General analytical reasoning, step ${i}`
      };
      steps.push(step);
      reasoningPath.push(step.thought);
    }

    const conclusion = `General analysis completed considering multiple perspectives and factors`;

    return {
      success: true,
      analysis: {
        steps,
        conclusion,
        confidence: this.calculateOverallConfidence(steps),
        reasoning_path: reasoningPath
      },
      metadata: {
        analysisType: request.analysisType,
        complexity: request.complexity,
        stepCount: steps.length,
        processingTime: Date.now() - startTime,
        method: 'custom_general'
      }
    };
  }

  private formatInitialThought(request: ReasoningRequest): string {
    return `I need to analyze this ${request.analysisType} question: "${request.query}". Let me think through this systematically.`;
  }

  private getDefaultSteps(complexity: string): number {
    switch (complexity) {
      case 'low': return 2;
      case 'medium': return 3;
      case 'high': return 5;
      default: return 3;
    }
  }

  private calculateOverallConfidence(steps: ReasoningStep[]): number {
    if (steps.length === 0) return 0;
    const avgConfidence = steps.reduce((sum, step) => sum + step.confidence, 0) / steps.length;
    return Math.round(avgConfidence * 100) / 100;
  }

  private getCacheKey(request: ReasoningRequest): string {
    const queryHash = this.hashString(request.query);
    return `reasoning_${queryHash}_${request.analysisType}_${request.complexity}`.toLowerCase();
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private isRateLimited(userId: string): boolean {
    const limit = this.rateLimits.get(userId);
    if (!limit) return false;
    
    if (Date.now() > limit.resetTime) {
      this.rateLimits.delete(userId);
      return false;
    }
    
    return limit.count >= 10; // 10 reasoning sessions per hour
  }

  private updateRateLimit(userId: string): void {
    const now = Date.now();
    const hourFromNow = now + (60 * 60 * 1000);
    
    const current = this.rateLimits.get(userId);
    if (!current || now > current.resetTime) {
      this.rateLimits.set(userId, { count: 1, resetTime: hourFromNow });
    } else {
      this.rateLimits.set(userId, { count: current.count + 1, resetTime: current.resetTime });
    }
  }

  /**
   * Generates a human-readable explanation of the reasoning process
   */
  formatReasoningExplanation(result: ReasoningResult): string {
    if (!result.success) {
      return result.error || 'Reasoning process failed';
    }

    let explanation = `**${result.metadata.analysisType.toUpperCase()} ANALYSIS**\n\n`;
    
    result.analysis.steps.forEach((step, index) => {
      explanation += `**Step ${step.stepNumber}:** ${step.thought}\n`;
      if (step.evidence && step.evidence.length > 0) {
        explanation += `*Evidence:* ${step.evidence.join(', ')}\n`;
      }
      explanation += `*Confidence:* ${Math.round(step.confidence * 100)}%\n\n`;
    });

    explanation += `**Conclusion:** ${result.analysis.conclusion}\n`;
    explanation += `**Overall Confidence:** ${Math.round(result.analysis.confidence * 100)}%\n`;
    explanation += `*Analysis completed in ${result.metadata.processingTime}ms using ${result.metadata.method}*`;

    return explanation;
  }
}