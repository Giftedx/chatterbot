/**
 * Orchestration Wiring Service
 * Explicit wiring between autonomous orchestration and existing data pipelines
 * with traceable decision tree integration
 */

import { logger } from '../utils/logger.js';
import {
  autonomousOrchestration,
  OrchestrationContext,
  CapabilityActivationTrace,
} from './autonomous-orchestration-integration.js';

export interface WiringConfiguration {
  enabled: boolean;
  traceabilityMode: 'full' | 'essential' | 'minimal';
  fallbackStrategy: 'graceful' | 'strict' | 'hybrid';
  dataFlowValidation: boolean;
  performanceMonitoring: boolean;
}

export interface DataFlowNode {
  id: string;
  type: 'input' | 'processor' | 'decision' | 'output' | 'fallback';
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  transformations: Map<string, string>;
  conditions?: {
    success: string[];
    failure: string[];
    timeout: string[];
  };
  metadata: {
    latency: number;
    reliability: number;
    resourceCost: number;
  };
}

export interface DecisionTreeNode {
  id: string;
  type: 'condition' | 'action' | 'capability' | 'fallback';
  description: string;
  condition?: string;
  trueNext?: string;
  falseNext?: string;
  action?: {
    type: 'activate' | 'deactivate' | 'configure' | 'fallback';
    target: string;
    parameters?: Map<string, any>;
  };
  children: string[];
  parent?: string;
  metadata: {
    priority: number;
    executionTime: number;
    successRate: number;
  };
}

export interface WiringTrace {
  timestamp: Date;
  messageId: string;
  nodeId: string;
  nodeType: string;
  action: string;
  dataIn: any[];
  dataOut: any[];
  decision?: {
    condition: string;
    result: boolean;
    reasoning: string;
  };
  performance: {
    startTime: number;
    endTime: number;
    latency: number;
    resourceUsage: number;
  };
  errors?: string[];
  nextNodes: string[];
}

export class OrchestrationWiring {
  private config: WiringConfiguration;
  private dataFlowNodes = new Map<string, DataFlowNode>();
  private decisionTree = new Map<string, DecisionTreeNode>();
  private wiringTraces = new Map<string, WiringTrace[]>();
  private activeFlows = new Map<
    string,
    {
      messageId: string;
      currentNode: string;
      startTime: Date;
      context: any;
    }
  >();

  constructor(
    config: WiringConfiguration = {
      enabled: true,
      traceabilityMode: 'full',
      fallbackStrategy: 'hybrid',
      dataFlowValidation: true,
      performanceMonitoring: true,
    },
  ) {
    this.config = config;
    this.initializeDataFlowNodes();
    this.initializeDecisionTree();
    logger.info('🔗 Orchestration Wiring Service initialized');
  }

  private initializeDataFlowNodes(): void {
    // Input Processing Nodes
    this.dataFlowNodes.set('input-analysis', {
      id: 'input-analysis',
      type: 'input',
      name: 'Input Analysis',
      description: 'Analyzes user input and extracts metadata',
      inputs: ['raw_message', 'user_context', 'conversation_history'],
      outputs: ['analyzed_message', 'intent_vector', 'complexity_score'],
      transformations: new Map([
        ['raw_message', 'tokenized_input'],
        ['tokenized_input', 'semantic_embedding'],
        ['semantic_embedding', 'intent_classification'],
      ]),
      metadata: { latency: 50, reliability: 0.95, resourceCost: 0.1 },
    });

    this.dataFlowNodes.set('context-enrichment', {
      id: 'context-enrichment',
      type: 'processor',
      name: 'Context Enrichment',
      description: 'Enriches message context with historical and environmental data',
      inputs: ['analyzed_message', 'user_profile', 'system_state'],
      outputs: ['enriched_context', 'quality_requirements', 'performance_constraints'],
      transformations: new Map([
        ['analyzed_message', 'contextual_metadata'],
        ['user_profile', 'personalization_data'],
        ['system_state', 'resource_availability'],
      ]),
      metadata: { latency: 75, reliability: 0.92, resourceCost: 0.15 },
    });

    // Decision Processing Nodes
    this.dataFlowNodes.set('capability-decision', {
      id: 'capability-decision',
      type: 'decision',
      name: 'Capability Decision Engine',
      description: 'Autonomous decision on which capabilities to activate',
      inputs: ['enriched_context', 'capability_registry', 'system_policies'],
      outputs: ['activation_plan', 'quality_prediction', 'performance_prediction'],
      transformations: new Map([
        ['enriched_context', 'activation_context'],
        ['activation_context', 'policy_evaluation'],
        ['policy_evaluation', 'capability_selection'],
      ]),
      conditions: {
        success: ['valid_activations', 'policy_compliant'],
        failure: ['invalid_selection', 'policy_violation'],
        timeout: ['decision_timeout'],
      },
      metadata: { latency: 150, reliability: 0.88, resourceCost: 0.25 },
    });

    this.dataFlowNodes.set('pipeline-planning', {
      id: 'pipeline-planning',
      type: 'processor',
      name: 'Pipeline Planning',
      description: 'Creates execution pipeline for selected capabilities',
      inputs: ['activation_plan', 'data_requirements', 'dependency_graph'],
      outputs: ['execution_pipeline', 'data_flow_map', 'fallback_strategies'],
      transformations: new Map([
        ['activation_plan', 'dependency_resolution'],
        ['dependency_resolution', 'execution_ordering'],
        ['execution_ordering', 'pipeline_optimization'],
      ]),
      metadata: { latency: 100, reliability: 0.9, resourceCost: 0.2 },
    });

    // Execution Nodes
    this.dataFlowNodes.set('capability-orchestration', {
      id: 'capability-orchestration',
      type: 'processor',
      name: 'Capability Orchestration',
      description: 'Executes capabilities according to the planned pipeline',
      inputs: ['execution_pipeline', 'input_data', 'runtime_context'],
      outputs: ['capability_results', 'execution_traces', 'performance_metrics'],
      transformations: new Map([
        ['execution_pipeline', 'capability_activation'],
        ['capability_activation', 'parallel_execution'],
        ['parallel_execution', 'result_aggregation'],
      ]),
      conditions: {
        success: ['all_capabilities_successful', 'quality_threshold_met'],
        failure: ['capability_failure', 'quality_below_threshold'],
        timeout: ['execution_timeout'],
      },
      metadata: { latency: 2000, reliability: 0.85, resourceCost: 0.6 },
    });

    this.dataFlowNodes.set('response-synthesis', {
      id: 'response-synthesis',
      type: 'output',
      name: 'Response Synthesis',
      description: 'Synthesizes capability outputs into final response',
      inputs: ['capability_results', 'quality_requirements', 'user_preferences'],
      outputs: ['final_response', 'confidence_score', 'source_attribution'],
      transformations: new Map([
        ['capability_results', 'result_integration'],
        ['result_integration', 'quality_validation'],
        ['quality_validation', 'response_formatting'],
      ]),
      metadata: { latency: 200, reliability: 0.92, resourceCost: 0.3 },
    });

    // Fallback Nodes
    this.dataFlowNodes.set('basic-fallback', {
      id: 'basic-fallback',
      type: 'fallback',
      name: 'Basic Response Fallback',
      description: 'Generates basic response when full pipeline fails',
      inputs: ['original_message', 'failure_context'],
      outputs: ['basic_response', 'error_explanation'],
      transformations: new Map([
        ['original_message', 'simple_processing'],
        ['simple_processing', 'basic_generation'],
      ]),
      metadata: { latency: 500, reliability: 0.98, resourceCost: 0.05 },
    });

    logger.info(`📊 Initialized ${this.dataFlowNodes.size} data flow nodes`);
  }

  private initializeDecisionTree(): void {
    // Root decision node
    this.decisionTree.set('root', {
      id: 'root',
      type: 'condition',
      description: 'Is autonomous orchestration enabled?',
      condition: 'autonomous_orchestration.enabled',
      trueNext: 'context-analysis',
      falseNext: 'legacy-processing',
      children: ['context-analysis', 'legacy-processing'],
      metadata: { priority: 10, executionTime: 5, successRate: 1.0 },
    });

    // Context analysis branch
    this.decisionTree.set('context-analysis', {
      id: 'context-analysis',
      type: 'action',
      description: 'Analyze message context and requirements',
      action: {
        type: 'activate',
        target: 'input-analysis',
        parameters: new Map([['trace_enabled', true]]),
      },
      children: ['complexity-check'],
      parent: 'root',
      metadata: { priority: 9, executionTime: 50, successRate: 0.95 },
    });

    this.decisionTree.set('complexity-check', {
      id: 'complexity-check',
      type: 'condition',
      description: 'Is message complexity above threshold?',
      condition: 'complexity_score > 0.7',
      trueNext: 'enhanced-processing',
      falseNext: 'standard-processing',
      children: ['enhanced-processing', 'standard-processing'],
      parent: 'context-analysis',
      metadata: { priority: 8, executionTime: 10, successRate: 0.92 },
    });

    // Enhanced processing branch
    this.decisionTree.set('enhanced-processing', {
      id: 'enhanced-processing',
      type: 'capability',
      description: 'Activate full capability suite for complex queries',
      action: {
        type: 'activate',
        target: 'autonomous-orchestration',
        parameters: new Map([
          ['quality_mode', 'high'],
          ['enable_advanced_reasoning', 'true'],
          ['enable_web_search', 'true'],
        ]),
      },
      children: ['quality-validation'],
      parent: 'complexity-check',
      metadata: { priority: 7, executionTime: 2000, successRate: 0.82 },
    });

    // Standard processing branch
    this.decisionTree.set('standard-processing', {
      id: 'standard-processing',
      type: 'capability',
      description: 'Use core intelligence with selective enhancement',
      action: {
        type: 'activate',
        target: 'selective-orchestration',
        parameters: new Map([
          ['quality_mode', 'balanced'],
          ['enable_caching', 'true'],
        ]),
      },
      children: ['response-check'],
      parent: 'complexity-check',
      metadata: { priority: 7, executionTime: 1000, successRate: 0.88 },
    });

    // Quality validation
    this.decisionTree.set('quality-validation', {
      id: 'quality-validation',
      type: 'condition',
      description: 'Does response meet quality requirements?',
      condition: 'quality_score >= quality_threshold',
      trueNext: 'response-finalization',
      falseNext: 'quality-fallback',
      children: ['response-finalization', 'quality-fallback'],
      parent: 'enhanced-processing',
      metadata: { priority: 6, executionTime: 50, successRate: 0.9 },
    });

    // Response check for standard processing
    this.decisionTree.set('response-check', {
      id: 'response-check',
      type: 'condition',
      description: 'Is response adequate for user needs?',
      condition: 'confidence_score >= minimum_confidence',
      trueNext: 'response-finalization',
      falseNext: 'enhancement-upgrade',
      children: ['response-finalization', 'enhancement-upgrade'],
      parent: 'standard-processing',
      metadata: { priority: 6, executionTime: 25, successRate: 0.85 },
    });

    // Fallback strategies
    this.decisionTree.set('quality-fallback', {
      id: 'quality-fallback',
      type: 'fallback',
      description: 'Fallback to basic response generation',
      action: {
        type: 'fallback',
        target: 'basic-fallback',
      },
      children: ['error-handling'],
      parent: 'quality-validation',
      metadata: { priority: 5, executionTime: 500, successRate: 0.98 },
    });

    this.decisionTree.set('enhancement-upgrade', {
      id: 'enhancement-upgrade',
      type: 'action',
      description: 'Upgrade to enhanced processing for better quality',
      action: {
        type: 'configure',
        target: 'autonomous-orchestration',
        parameters: new Map([['upgrade_quality', true]]),
      },
      children: ['quality-validation'],
      parent: 'response-check',
      metadata: { priority: 5, executionTime: 1500, successRate: 0.75 },
    });

    // Final nodes
    this.decisionTree.set('response-finalization', {
      id: 'response-finalization',
      type: 'action',
      description: 'Finalize and format response',
      action: {
        type: 'activate',
        target: 'response-synthesis',
      },
      children: [],
      metadata: { priority: 1, executionTime: 200, successRate: 0.95 },
    });

    this.decisionTree.set('legacy-processing', {
      id: 'legacy-processing',
      type: 'action',
      description: 'Use legacy processing pipeline',
      action: {
        type: 'activate',
        target: 'legacy-intelligence-service',
      },
      children: [],
      parent: 'root',
      metadata: { priority: 4, executionTime: 1500, successRate: 0.88 },
    });

    logger.info(`🌳 Initialized decision tree with ${this.decisionTree.size} nodes`);
  }

  /**
   * Main wiring method - connects incoming request to orchestration pipeline
   */
  async wireOrchestration(messageId: string, rawInput: any, context: any): Promise<any> {
    if (!this.config.enabled) {
      logger.info(`🔗 Orchestration wiring disabled, using legacy processing for ${messageId}`);
      return this.executeLegacyProcessing(messageId, rawInput, context);
    }

    const startTime = Date.now();
    logger.info(`🔗 Starting orchestration wiring for message ${messageId}`);

    try {
      // Initialize tracing
      this.wiringTraces.set(messageId, []);

      // Start at root of decision tree
      const result = await this.executeDecisionTree(messageId, 'root', {
        rawInput,
        context,
        messageId,
      });

      const duration = Date.now() - startTime;
      logger.info(`✅ Orchestration wiring completed in ${duration}ms for message ${messageId}`);

      return result;
    } catch (error) {
      logger.error(`❌ Orchestration wiring failed for message ${messageId}:`, error);

      // Execute fallback strategy
      return this.executeFallbackStrategy(messageId, rawInput, context, error);
    }
  }

  private async executeDecisionTree(messageId: string, nodeId: string, data: any): Promise<any> {
    const node = this.decisionTree.get(nodeId);
    if (!node) {
      throw new Error(`Decision tree node not found: ${nodeId}`);
    }

    const traceStart = Date.now();
    logger.info(`🌳 Executing decision node: ${nodeId} - ${node.description}`);

    try {
      let result: any;
      let nextNodeId: string | undefined;

      switch (node.type) {
        case 'condition':
          const conditionResult = this.evaluateCondition(node.condition!, data);
          nextNodeId = conditionResult ? node.trueNext : node.falseNext;

          this.addWiringTrace(messageId, {
            timestamp: new Date(),
            messageId,
            nodeId,
            nodeType: node.type,
            action: 'evaluate_condition',
            dataIn: [data],
            dataOut: [conditionResult],
            decision: {
              condition: node.condition!,
              result: conditionResult,
              reasoning: `Condition evaluated to ${conditionResult}`,
            },
            performance: {
              startTime: traceStart,
              endTime: Date.now(),
              latency: Date.now() - traceStart,
              resourceUsage: 0.01,
            },
            nextNodes: nextNodeId ? [nextNodeId] : [],
          });

          if (nextNodeId) {
            result = await this.executeDecisionTree(messageId, nextNodeId, data);
          }
          break;

        case 'action':
          result = await this.executeAction(messageId, node, data);

          // Execute children if any
          for (const childId of node.children) {
            const childResult = await this.executeDecisionTree(messageId, childId, {
              ...data,
              previousResult: result,
            });
            result = childResult || result;
          }
          break;

        case 'capability':
          result = await this.executeCapabilityActivation(messageId, node, data);

          // Execute children with capability results
          for (const childId of node.children) {
            const childResult = await this.executeDecisionTree(messageId, childId, {
              ...data,
              capabilityResult: result,
            });
            result = childResult || result;
          }
          break;

        case 'fallback':
          result = await this.executeFallbackNode(messageId, node, data);
          break;
      }

      return result;
    } catch (error) {
      logger.error(`❌ Error executing decision node ${nodeId}:`, error);

      this.addWiringTrace(messageId, {
        timestamp: new Date(),
        messageId,
        nodeId,
        nodeType: node.type,
        action: 'error',
        dataIn: [data],
        dataOut: [],
        performance: {
          startTime: traceStart,
          endTime: Date.now(),
          latency: Date.now() - traceStart,
          resourceUsage: 0.01,
        },
        errors: [error.message],
        nextNodes: [],
      });

      throw error;
    }
  }

  private evaluateCondition(condition: string, data: any): boolean {
    try {
      // Simple condition evaluation (would use proper expression parser in production)
      switch (condition) {
        case 'autonomous_orchestration.enabled':
          return true; // Enable autonomous orchestration by default

        case 'complexity_score > 0.7':
          return data.complexityScore > 0.7;

        case 'quality_score >= quality_threshold':
          return data.qualityScore >= (data.qualityThreshold || 0.8);

        case 'confidence_score >= minimum_confidence':
          return data.confidenceScore >= (data.minimumConfidence || 0.6);

        default:
          logger.warn(`Unknown condition: ${condition}, defaulting to false`);
          return false;
      }
    } catch (error) {
      logger.error(`Error evaluating condition '${condition}':`, error);
      return false;
    }
  }

  private async executeAction(messageId: string, node: DecisionTreeNode, data: any): Promise<any> {
    if (!node.action) return data;

    const action = node.action;
    const dataFlowNode = this.dataFlowNodes.get(action.target);

    if (dataFlowNode) {
      return await this.executeDataFlowNode(messageId, dataFlowNode, data);
    }

    logger.warn(`Action target not found: ${action.target}`);
    return data;
  }

  private async executeCapabilityActivation(
    messageId: string,
    node: DecisionTreeNode,
    data: any,
  ): Promise<any> {
    if (!node.action || !node.action.parameters) return data;

    // Create orchestration context
    const orchestrationContext: OrchestrationContext = {
      messageId,
      userId: data.context?.userId || 'unknown',
      guildId: data.context?.guildId,
      channelId: data.context?.channelId || 'unknown',
      messageContent: data.rawInput?.content || '',
      messageType: data.context?.messageType || 'dm',
      conversationHistory: data.context?.conversationHistory || [],
      userIntent: data.analyzedIntent || [],
      currentCapabilities: [],
      systemLoad: 0.5,
      availableResources: {
        memory: 0.7,
        cpu: 0.6,
        network: true,
      },
      qualityRequirements: {
        accuracy: 'medium',
        freshness: 'any',
        depth: 'moderate',
      },
      performanceConstraints: {
        maxLatency: 10000,
        maxMemory: '500MB',
        priority: 'interactive',
      },
    };

    // Use autonomous orchestration
    const decision = await autonomousOrchestration.orchestrateCapabilities(orchestrationContext);

    this.addWiringTrace(messageId, {
      timestamp: new Date(),
      messageId,
      nodeId: node.id,
      nodeType: node.type,
      action: 'capability_activation',
      dataIn: [orchestrationContext],
      dataOut: [decision],
      performance: {
        startTime: Date.now() - 100,
        endTime: Date.now(),
        latency: 100,
        resourceUsage: 0.3,
      },
      nextNodes: node.children,
    });

    return decision;
  }

  private async executeFallbackNode(
    messageId: string,
    node: DecisionTreeNode,
    data: any,
  ): Promise<any> {
    if (!node.action) return data;

    const fallbackNode = this.dataFlowNodes.get(node.action.target);
    if (fallbackNode) {
      return await this.executeDataFlowNode(messageId, fallbackNode, data);
    }

    // Basic fallback
    return {
      response:
        'I apologize, but I encountered an issue processing your request. Please try again.',
      fallback: true,
      messageId,
    };
  }

  private async executeDataFlowNode(
    messageId: string,
    node: DataFlowNode,
    data: any,
  ): Promise<any> {
    const startTime = Date.now();
    logger.info(`📊 Executing data flow node: ${node.id} - ${node.name}`);

    try {
      // Validate inputs if enabled
      if (this.config.dataFlowValidation) {
        this.validateDataFlowInputs(node, data);
      }

      // Simulate node execution (would be replaced with actual implementation)
      await new Promise((resolve) => setTimeout(resolve, node.metadata.latency));

      // Create mock output based on node configuration
      const output = this.generateNodeOutput(node, data);

      this.addWiringTrace(messageId, {
        timestamp: new Date(),
        messageId,
        nodeId: node.id,
        nodeType: node.type,
        action: 'execute',
        dataIn: [data],
        dataOut: [output],
        performance: {
          startTime,
          endTime: Date.now(),
          latency: Date.now() - startTime,
          resourceUsage: node.metadata.resourceCost,
        },
        nextNodes: [],
      });

      return output;
    } catch (error) {
      logger.error(`❌ Error executing data flow node ${node.id}:`, error);
      throw error;
    }
  }

  private validateDataFlowInputs(node: DataFlowNode, data: any): void {
    // Basic validation - ensure required inputs are present
    for (const requiredInput of node.inputs) {
      if (!(requiredInput in data)) {
        logger.warn(`Missing required input '${requiredInput}' for node ${node.id}`);
      }
    }
  }

  private generateNodeOutput(node: DataFlowNode, data: any): any {
    // Generate appropriate output based on node type and configuration
    const output: any = { ...data };

    for (const outputField of node.outputs) {
      switch (outputField) {
        case 'analyzed_message':
          output.analyzedMessage = { ...data.rawInput, analyzed: true };
          break;
        case 'intent_vector':
          output.intentVector = [0.8, 0.6, 0.3];
          break;
        case 'complexity_score':
          output.complexityScore = Math.random() * 0.4 + 0.6;
          break;
        case 'enriched_context':
          output.enrichedContext = { ...data.context, enriched: true };
          break;
        case 'activation_plan':
          output.activationPlan = ['core-intelligence', 'semantic-cache'];
          break;
        case 'final_response':
          output.finalResponse = 'Generated response based on autonomous orchestration';
          break;
        default:
          output[outputField] = `Generated ${outputField}`;
      }
    }

    return output;
  }

  private async executeLegacyProcessing(
    messageId: string,
    rawInput: any,
    context: any,
  ): Promise<any> {
    logger.info(`🔄 Using legacy processing for message ${messageId}`);

    return {
      response: 'Response from legacy processing system',
      messageId,
      legacy: true,
      timestamp: new Date(),
    };
  }

  private async executeFallbackStrategy(
    messageId: string,
    rawInput: any,
    context: any,
    error: any,
  ): Promise<any> {
    logger.error(`🚨 Executing fallback strategy for message ${messageId} due to error:`, error);

    switch (this.config.fallbackStrategy) {
      case 'graceful':
        return await this.executeLegacyProcessing(messageId, rawInput, context);

      case 'strict':
        throw error;

      case 'hybrid':
        try {
          return await this.executeLegacyProcessing(messageId, rawInput, context);
        } catch (fallbackError) {
          return {
            response: 'I apologize, but I encountered an issue processing your request.',
            error: true,
            messageId,
            timestamp: new Date(),
          };
        }

      default:
        throw error;
    }
  }

  private addWiringTrace(messageId: string, trace: WiringTrace): void {
    const traces = this.wiringTraces.get(messageId) || [];
    traces.push(trace);
    this.wiringTraces.set(messageId, traces);

    if (this.config.performanceMonitoring) {
      logger.info(`🔍 Trace: ${trace.nodeId} completed in ${trace.performance.latency}ms`);
    }
  }

  /**
   * Get wiring traces for a message
   */
  getWiringTraces(messageId: string): WiringTrace[] {
    return this.wiringTraces.get(messageId) || [];
  }

  /**
   * Get complete traceability data for a message
   */
  getCompleteTraceability(messageId: string): {
    wiringTraces: WiringTrace[];
    orchestrationDecision: any;
    capabilityTraces: CapabilityActivationTrace[];
  } {
    return {
      wiringTraces: this.getWiringTraces(messageId),
      orchestrationDecision: autonomousOrchestration.getOrchestrationDecision(messageId),
      capabilityTraces: autonomousOrchestration.getCapabilityTraces(messageId),
    };
  }

  /**
   * Update configuration
   */
  updateConfiguration(newConfig: Partial<WiringConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('🔧 Updated orchestration wiring configuration');
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): object {
    return {
      config: this.config,
      dataFlowNodes: this.dataFlowNodes.size,
      decisionTreeNodes: this.decisionTree.size,
      activeTraces: this.wiringTraces.size,
      activeFlows: this.activeFlows.size,
    };
  }

  /**
   * Clean up old traces
   */
  cleanup(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    for (const [messageId, traces] of this.wiringTraces) {
      const firstTrace = traces[0];
      if (firstTrace && firstTrace.timestamp < cutoffTime) {
        this.wiringTraces.delete(messageId);
      }
    }

    for (const [flowId, flow] of this.activeFlows) {
      if (flow.startTime < cutoffTime) {
        this.activeFlows.delete(flowId);
      }
    }

    logger.info(`🧹 Cleaned up old wiring traces. Active traces: ${this.wiringTraces.size}`);
  }
}

// Global orchestration wiring instance
export const orchestrationWiring = new OrchestrationWiring();
