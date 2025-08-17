import { UnifiedPipelineContext } from './context.js';
import { DecisionMaker, ResponseStrategy } from './decision-maker.js';
import { BaseModule } from '../modules/base-module.js';

export class UnifiedPipeline {
  private decisionMaker: DecisionMaker;

  constructor() {
    this.decisionMaker = new DecisionMaker();
  }

  async process(context: UnifiedPipelineContext): Promise<UnifiedPipelineContext> {
    // B2: Extract decision context for strategy-aware processing
    const decisionStrategy = context.data?.decisionStrategy as ResponseStrategy;
    const decisionConfidence = context.data?.decisionConfidence as number;
    
    console.log('B2: UnifiedPipeline processing started', {
      inputType: context.inputType,
      cognitiveOperation: context.cognitiveOperation,
      decisionStrategy,
      decisionConfidence,
      userId: context.data?.userId
    });

    // B3: Get strategy-aware modules with advanced context integration
    const modules = this.decisionMaker.selectModules(context);
    
    if (modules.length === 0) {
      console.warn('B3: No modules selected for processing', { 
        cognitiveOperation: context.cognitiveOperation,
        decisionStrategy 
      });
      return context;
    }

    let currentContext = context;
    const moduleResults: Array<{ moduleName: string; executionTime: number; success: boolean }> = [];
    const pipelineStartTime = performance.now();

    // B3: Check if modules can run in parallel (from operation mapping)
    const canRunInParallel = context.metadata?.operationMapping?.parallel || false;
    
    if (canRunInParallel && modules.length > 1) {
      console.log('B3: Executing modules in parallel mode');
      currentContext = await this.executeModulesInParallel(modules, currentContext, moduleResults);
    } else {
      console.log('B3: Executing modules in sequential mode');
      currentContext = await this.executeModulesSequentially(modules, currentContext, moduleResults);
    }

    const totalExecutionTime = performance.now() - pipelineStartTime;

    // B3: Record mapping performance for adaptive learning
    this.decisionMaker.recordMappingPerformance(currentContext, {
      successful: moduleResults.every(r => r.success),
      executionTime: totalExecutionTime
    });

    // B3: Add comprehensive processing metadata to context
    currentContext.metadata = {
      ...currentContext.metadata,
      processingResults: {
        decisionStrategy,
        decisionConfidence,
        moduleResults,
        totalModules: modules.length,
        successfulModules: moduleResults.filter(r => r.success).length,
        totalExecutionTime,
        parallelExecution: canRunInParallel,
        // B3: Advanced metadata
        operationMapping: context.metadata?.operationMapping,
        performanceScore: this.calculatePerformanceScore(moduleResults, totalExecutionTime)
      }
    };

    console.log('B3: UnifiedPipeline processing completed', {
      decisionStrategy,
      totalModules: modules.length,
      successfulModules: moduleResults.filter(r => r.success).length,
      totalExecutionTime: `${totalExecutionTime.toFixed(2)}ms`,
      parallelExecution: canRunInParallel,
      performanceScore: currentContext.metadata.processingResults.performanceScore
    });

    return currentContext;
  }

  // B3: Execute modules in parallel for optimized performance
  private async executeModulesInParallel(
    modules: BaseModule[], 
    context: UnifiedPipelineContext, 
    moduleResults: Array<{ moduleName: string; executionTime: number; success: boolean }>
  ): Promise<UnifiedPipelineContext> {
    const modulePromises = modules.map(async (module) => {
      const moduleStartTime = performance.now();
      const moduleName = module.constructor.name;
      
      try {
        console.log(`B3: Executing module in parallel: ${moduleName}`);

        // B3: Set decision context for strategy-aware execution
        if (context.data?.decisionStrategy && (module as any).setDecisionContext) {
          (module as any).setDecisionContext({
            strategy: context.data.decisionStrategy,
            confidence: context.data.decisionConfidence,
            tokenEstimate: context.data.tokenEstimate
          });
        }

        const result = await module.execute({ ...context }); // Create copy for parallel execution
        
        const executionTime = performance.now() - moduleStartTime;
        moduleResults.push({ moduleName, executionTime, success: true });
        
        console.log(`B3: Parallel module ${moduleName} completed`, {
          executionTime: `${executionTime.toFixed(2)}ms`,
          success: true
        });

        return result;
      } catch (error) {
        const executionTime = performance.now() - moduleStartTime;
        moduleResults.push({ moduleName, executionTime, success: false });
        
        console.error(`B3: Parallel module ${moduleName} failed`, {
          error: error instanceof Error ? error.message : String(error),
          executionTime: `${executionTime.toFixed(2)}ms`
        });

        throw error;
      }
    });

    try {
      const results = await Promise.all(modulePromises);
      // B3: Merge results from parallel execution (simple merge - could be enhanced)
      return this.mergeParallelResults(context, results);
    } catch (error) {
      console.error('B3: Parallel module execution failed, falling back to sequential', { error });
      // Fallback to sequential execution
      return this.executeModulesSequentially(modules, context, moduleResults);
    }
  }

  // B3: Execute modules sequentially (enhanced from B2)
  private async executeModulesSequentially(
    modules: BaseModule[], 
    context: UnifiedPipelineContext, 
    moduleResults: Array<{ moduleName: string; executionTime: number; success: boolean }>
  ): Promise<UnifiedPipelineContext> {
    let currentContext = context;

    for (const module of modules) {
      const moduleStartTime = performance.now();
      const moduleName = module.constructor.name;
      
      try {
        console.log(`B3: Executing module sequentially: ${moduleName}`);

        // B3: Pass decision context to module for strategy-aware execution
        if (currentContext.data?.decisionStrategy && (module as any).setDecisionContext) {
          (module as any).setDecisionContext({
            strategy: currentContext.data.decisionStrategy,
            confidence: currentContext.data.decisionConfidence,
            tokenEstimate: currentContext.data.tokenEstimate
          });
        }

        currentContext = await module.execute(currentContext);
        
        const executionTime = performance.now() - moduleStartTime;
        moduleResults.push({ moduleName, executionTime, success: true });
        
        console.log(`B3: Sequential module ${moduleName} completed`, {
          executionTime: `${executionTime.toFixed(2)}ms`,
          success: true
        });

      } catch (error) {
        const executionTime = performance.now() - moduleStartTime;
        moduleResults.push({ moduleName, executionTime, success: false });
        
        console.error(`B3: Sequential module ${moduleName} failed`, {
          error: error instanceof Error ? error.message : String(error),
          executionTime: `${executionTime.toFixed(2)}ms`,
          decisionStrategy: currentContext.data?.decisionStrategy
        });

        // B3: Continue processing other modules unless it's a critical failure
        const decisionStrategy = currentContext.data?.decisionStrategy;
        if (decisionStrategy === 'deep-reason' && moduleName === 'ReasoningModule') {
          // For deep-reason strategy, reasoning module failure is critical
          throw error;
        }
      }
    }

    return currentContext;
  }

  // B3: Merge results from parallel module execution
  private mergeParallelResults(
    originalContext: UnifiedPipelineContext, 
    results: UnifiedPipelineContext[]
  ): UnifiedPipelineContext {
    let mergedContext = { ...originalContext };

    // B3: Simple merge strategy - combine all data and metadata
    for (const result of results) {
      // Merge data objects
      if (result.data && typeof result.data === 'object') {
        mergedContext.data = { ...mergedContext.data, ...result.data };
      }

      // Merge metadata objects
      if (result.metadata && typeof result.metadata === 'object') {
        mergedContext.metadata = { ...mergedContext.metadata, ...result.metadata };
      }
    }

    console.log('B3: Merged parallel execution results', {
      resultCount: results.length,
      mergedDataKeys: Object.keys(mergedContext.data || {}),
      mergedMetadataKeys: Object.keys(mergedContext.metadata || {})
    });

    return mergedContext;
  }

  // B3: Calculate performance score for optimization
  private calculatePerformanceScore(
    moduleResults: Array<{ moduleName: string; executionTime: number; success: boolean }>,
    totalExecutionTime: number
  ): number {
    const successRate = moduleResults.filter(r => r.success).length / Math.max(moduleResults.length, 1);
    const avgExecutionTime = totalExecutionTime / Math.max(moduleResults.length, 1);
    
    // Performance score: higher is better
    // Formula: success rate (0-1) * speed factor (higher for faster execution)
    const speedFactor = Math.max(0, 1 - (avgExecutionTime / 5000)); // Normalize against 5 second baseline
    const performanceScore = successRate * (0.7 + speedFactor * 0.3);
    
    return Math.round(performanceScore * 100) / 100; // Round to 2 decimal places
  }

  // B2: Get strategy-specific cognitive operation (public method for external use)
  public getStrategyOperation(strategy: ResponseStrategy) {
    return this.decisionMaker.getStrategyOperation(strategy);
  }

  // B2: Get strategy priority for optimization decisions
  public getStrategyPriority(strategy: ResponseStrategy): number {
    return this.decisionMaker.getStrategyPriority(strategy);
  }

  // B3: Get performance insights for monitoring and optimization
  public getPerformanceInsights() {
    return this.decisionMaker.getPerformanceInsights();
  }
}
