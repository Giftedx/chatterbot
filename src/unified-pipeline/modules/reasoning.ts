import { UnifiedPipelineContext } from '../core/context.js';
import { BaseModule, DecisionContext } from './base-module.js';

export class ReasoningModule extends BaseModule {
  // B2: React to decision context for strategy-aware reasoning
  protected onDecisionContextSet(context: DecisionContext): void {
    console.log('B2: ReasoningModule received decision context', {
      strategy: context.strategy,
      confidence: context.confidence,
      tokenBudget: this.getTokenBudget()
    });
  }

  async execute(context: UnifiedPipelineContext): Promise<UnifiedPipelineContext> {
    console.log('B2: Executing Reasoning Module with strategy awareness');

    // B2: Strategy-aware reasoning execution
    if (this.isLightweightMode()) {
      // Quick reasoning for simple queries
      console.log('B2: Using lightweight reasoning mode');
      context.data.reasoningResult = {
        mode: 'lightweight',
        analysis: 'Quick pattern matching and cached reasoning',
        confidence: this.decisionContext?.confidence || 0.5,
        tokenBudget: this.getTokenBudget()
      };
    } else if (this.isDeepProcessingMode()) {
      // Comprehensive reasoning for complex queries
      console.log('B2: Using deep processing reasoning mode');
      context.data.reasoningResult = {
        mode: 'deep',
        analysis: 'Comprehensive multi-step reasoning with context integration',
        confidence: this.decisionContext?.confidence || 0.8,
        tokenBudget: this.getTokenBudget(),
        steps: [
          'Context analysis',
          'Pattern recognition',
          'Causal reasoning',
          'Synthesis and validation'
        ]
      };
    } else {
      // Standard reasoning
      console.log('B2: Using standard reasoning mode');
      context.data.reasoningResult = {
        mode: 'standard',
        analysis: 'Standard reasoning with balanced depth and speed',
        confidence: this.decisionContext?.confidence || 0.6,
        tokenBudget: this.getTokenBudget()
      };
    }

    // B2: Add processing metadata
    if (!context.metadata) context.metadata = {};
    context.metadata.reasoningModule = {
      strategy: this.decisionContext?.strategy || 'unknown',
      mode: context.data.reasoningResult.mode,
      tokenBudget: context.data.reasoningResult.tokenBudget
    };

    return context;
  }
}
