import { UnifiedPipelineContext } from '../core/context.js';

// B2: Decision context interface for strategy-aware modules
export interface DecisionContext {
  strategy: string;
  confidence: number;
  tokenEstimate?: number;
}

export abstract class BaseModule {
  // B2: Optional decision context for strategy-aware execution
  protected decisionContext?: DecisionContext;

  abstract execute(context: UnifiedPipelineContext): Promise<UnifiedPipelineContext>;

  // B2: Method to set decision context for strategy-aware processing
  public setDecisionContext(context: DecisionContext): void {
    this.decisionContext = context;
    this.onDecisionContextSet(context);
  }

  // B2: Hook for modules to react to decision context changes
  protected onDecisionContextSet(context: DecisionContext): void {
    // Default implementation does nothing, modules can override
  }

  // B2: Helper method to check if module should use lightweight processing
  protected isLightweightMode(): boolean {
    return this.decisionContext?.strategy === 'quick-reply' || (this.decisionContext?.confidence ?? 1) < 0.5;
  }

  // B2: Helper method to check if module should use comprehensive processing  
  protected isDeepProcessingMode(): boolean {
    return this.decisionContext?.strategy === 'deep-reason' && (this.decisionContext?.confidence ?? 0) > 0.7;
  }

  // B2: Get token budget based on decision context
  protected getTokenBudget(): number {
    if (!this.decisionContext?.tokenEstimate) {
      return 1000; // Default budget
    }

    // Allocate token budget based on strategy
    switch (this.decisionContext.strategy) {
      case 'quick-reply':
        return Math.min(this.decisionContext.tokenEstimate * 0.3, 500);
      case 'deep-reason':
        return Math.min(this.decisionContext.tokenEstimate * 0.8, 2000);
      case 'defer':
        return Math.min(this.decisionContext.tokenEstimate * 0.5, 1000);
      default:
        return Math.min(this.decisionContext.tokenEstimate * 0.4, 800);
    }
  }
}
