import { UnifiedPipelineContext } from './context.js';
import { BaseModule } from '../modules/base-module.js';
import { ReasoningModule } from '../modules/reasoning.js';
import { MemoryModule } from '../modules/memory.js';
import { RoutingModule } from '../modules/routing.js';
import { FeatureExtractionModule } from '../modules/feature-extraction.js';
import { CognitiveOperation } from './context.js';
import { 
  StrategyOperationMapper, 
  MappingContext, 
  ContextualFactors,
  ResponseStrategy 
} from './strategy-operation-mapper.js';

// B2: Strategy-aware module selection types (enhanced in B3)
export type { ResponseStrategy } from './strategy-operation-mapper.js';

interface StrategyModuleMapping {
  modules: BaseModule[];
  cognitiveOperation: CognitiveOperation;
  priority: number; // Higher = more important
}

export class DecisionMaker {
  private moduleMap: Map<CognitiveOperation, BaseModule[]>;
  private strategyMap: Map<ResponseStrategy, StrategyModuleMapping>; // B2: Strategy-aware mapping
  private strategyOperationMapper: StrategyOperationMapper; // B3: Advanced mapping

  constructor() {
    // Original cognitive operation mapping
    this.moduleMap = new Map();
    this.moduleMap.set(CognitiveOperation.Reasoning, [new ReasoningModule()]);
    this.moduleMap.set(CognitiveOperation.Remembering, [new MemoryModule()]);
    this.moduleMap.set(CognitiveOperation.Researching, [new RoutingModule()]);
    this.moduleMap.set(CognitiveOperation.Processing, [new FeatureExtractionModule()]);
    this.moduleMap.set(CognitiveOperation.Understanding, [new ReasoningModule(), new MemoryModule()]);

    // B2: Strategy-to-module mapping for decision-aware processing
    this.strategyMap = new Map();
    
    // Quick reply: lightweight processing, minimal modules
    this.strategyMap.set('quick-reply', {
      modules: [new FeatureExtractionModule()],
      cognitiveOperation: CognitiveOperation.Processing,
      priority: 1
    });

    // Deep reason: comprehensive analysis with reasoning and memory
    this.strategyMap.set('deep-reason', {
      modules: [new ReasoningModule(), new MemoryModule(), new FeatureExtractionModule()],
      cognitiveOperation: CognitiveOperation.Reasoning,
      priority: 3
    });

    // Defer: routing-focused for external processing
    this.strategyMap.set('defer', {
      modules: [new RoutingModule(), new FeatureExtractionModule()],
      cognitiveOperation: CognitiveOperation.Researching,
      priority: 2
    });

    // Ignore: minimal processing for potential filtering
    this.strategyMap.set('ignore', {
      modules: [new FeatureExtractionModule()],
      cognitiveOperation: CognitiveOperation.Processing,
      priority: 0
    });

    // B3: Initialize advanced strategy-operation mapper
    this.strategyOperationMapper = new StrategyOperationMapper();
  }

  // B3: Enhanced module selection with sophisticated strategy-operation mapping
  selectModules(context: UnifiedPipelineContext): BaseModule[] {
    const decisionStrategy = context.data?.decisionStrategy as ResponseStrategy;
    
    if (decisionStrategy) {
      // B3: Use advanced mapping for context-aware operation selection
      const mappingContext = this.createMappingContext(context, decisionStrategy);
      const operationMapping = this.strategyOperationMapper.getOperationMapping(mappingContext);
      
      console.log('B3: Advanced strategy-operation mapping applied', {
        strategy: decisionStrategy,
        selectedOperations: operationMapping.operations,
        priority: operationMapping.priority,
        parallel: operationMapping.parallel,
        tokenBudget: operationMapping.tokenBudget
      });

      // B3: Get modules for the selected operations
      const selectedModules = this.getModulesForOperations(operationMapping.operations);
      
      // B3: Update context with mapping metadata
      if (!context.metadata) context.metadata = {};
      context.metadata.operationMapping = {
        strategy: decisionStrategy,
        operations: operationMapping.operations,
        priority: operationMapping.priority,
        parallel: operationMapping.parallel,
        tokenBudget: operationMapping.tokenBudget
      };

      return selectedModules;
    }

    // Fallback to B2 implementation for backward compatibility
    if (decisionStrategy && this.strategyMap.has(decisionStrategy)) {
      const strategyMapping = this.strategyMap.get(decisionStrategy)!;
      
      console.log('B3: Fallback to B2 strategy mapping', {
        strategy: decisionStrategy,
        modules: strategyMapping.modules.map(m => m.constructor.name),
        cognitiveOperation: strategyMapping.cognitiveOperation,
        priority: strategyMapping.priority
      });

      // Update context cognitive operation based on strategy (B2 enhancement)
      context.cognitiveOperation = strategyMapping.cognitiveOperation;
      
      return strategyMapping.modules;
    }

    // Fallback to original cognitive operation-based selection
    console.log('B3: Fallback to cognitive operation selection', {
      cognitiveOperation: context.cognitiveOperation
    });
    
    return this.moduleMap.get(context.cognitiveOperation) || [];
  }

  // B3: Record mapping performance for adaptive learning
  public recordMappingPerformance(
    context: UnifiedPipelineContext,
    result: { successful: boolean; executionTime: number }
  ): void {
    const decisionStrategy = context.data?.decisionStrategy as ResponseStrategy;
    if (decisionStrategy) {
      const mappingContext = this.createMappingContext(context, decisionStrategy);
      const operationMapping = this.strategyOperationMapper.getOperationMapping(mappingContext);
      
      this.strategyOperationMapper.recordMappingPerformance(
        mappingContext,
        operationMapping,
        result
      );
    }
  }

  // B3: Get performance insights
  public getPerformanceInsights() {
    return this.strategyOperationMapper.getPerformanceInsights();
  }

  // B2: Get strategy-specific cognitive operation (maintained for compatibility)
  public getStrategyOperation(strategy: ResponseStrategy): CognitiveOperation | undefined {
    return this.strategyMap.get(strategy)?.cognitiveOperation;
  }

  // B2: Get strategy priority for optimization (maintained for compatibility)
  public getStrategyPriority(strategy: ResponseStrategy): number {
    return this.strategyMap.get(strategy)?.priority || 0;
  }

  // B3: Private helper methods
  private createMappingContext(context: UnifiedPipelineContext, strategy: ResponseStrategy): MappingContext {
    // Extract contextual factors from the pipeline context
    const contextualFactors: ContextualFactors = {
      messageComplexity: this.extractComplexityFromContext(context),
      systemLoad: this.estimateSystemLoad(),
      userPreference: this.extractUserPreference(context),
      channelActivity: this.extractChannelActivity(context)
    };

    return {
      strategy,
      confidence: context.data?.decisionConfidence || 0.5,
      tokenEstimate: context.data?.tokenEstimate || 1000,
      contextualFactors
    };
  }

  private getModulesForOperations(operations: CognitiveOperation[]): BaseModule[] {
    const modules: BaseModule[] = [];
    const seenModules = new Set<string>();

    for (const operation of operations) {
      const operationModules = this.moduleMap.get(operation) || [];
      for (const module of operationModules) {
        const moduleName = module.constructor.name;
        if (!seenModules.has(moduleName)) {
          modules.push(module);
          seenModules.add(moduleName);
        }
      }
    }

    return modules;
  }

  private extractComplexityFromContext(context: UnifiedPipelineContext): 'low' | 'medium' | 'high' {
    const prompt = context.data?.prompt || '';
    const wordCount = prompt.split(/\s+/).length;
    
    if (wordCount < 10) return 'low';
    if (wordCount > 50) return 'high';
    return 'medium';
  }

  private estimateSystemLoad(): 'low' | 'medium' | 'high' {
    // Simple heuristic - can be enhanced with real system metrics
    const now = new Date();
    const hour = now.getHours();
    
    // Assume peak hours are 9-17 UTC
    if (hour >= 9 && hour <= 17) return 'high';
    if (hour >= 7 && hour <= 19) return 'medium';
    return 'low';
  }

  private extractUserPreference(context: UnifiedPipelineContext): 'speed' | 'accuracy' | 'balanced' {
    // Simple heuristic based on decision confidence
    const confidence = context.data?.decisionConfidence || 0.5;
    
    if (confidence < 0.4) return 'speed'; // Low confidence -> prefer quick response
    if (confidence > 0.8) return 'accuracy'; // High confidence -> can afford thorough processing
    return 'balanced';
  }

  private extractChannelActivity(context: UnifiedPipelineContext): 'low' | 'medium' | 'high' {
    // Placeholder - would integrate with actual channel activity metrics
    return 'medium';
  }
}
