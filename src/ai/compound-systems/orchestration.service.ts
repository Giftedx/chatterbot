// COMPOUND AI SYSTEMS ARCHITECTURE
// Implements advanced compound AI system coordination with multi-component orchestration
// Based on 2025 research in distributed AI system architecture

import { EventEmitter } from 'events';
import { getEnvAsString, getEnvAsBoolean } from '../../utils/env.js';

interface AIComponent {
  id: string;
  name: string;
  type: 'model' | 'retriever' | 'reasoner' | 'validator' | 'aggregator' | 'filter';
  capabilities: string[];
  input_types: string[];
  output_types: string[];
  reliability_score: number;
  latency_ms: number;
  cost_per_call: number;
  last_health_check: Date;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  dependencies: string[];
  configuration: Record<string, unknown>;
}

interface WorkflowStep {
  id: string;
  component_id: string;
  input_mapping: Record<string, string>;
  output_mapping: Record<string, string>;
  conditions?: {
    required_confidence?: number;
    fallback_component?: string;
    timeout_ms?: number;
    retry_count?: number;
  };
  parallel_with?: string[];
}

interface CompoundWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  input_schema: Record<string, string>;
  output_schema: Record<string, string>;
  error_handling: {
    fallback_workflow?: string;
    partial_failure_handling: 'continue' | 'abort' | 'fallback';
    timeout_ms: number;
  };
  optimization_strategy: 'speed' | 'accuracy' | 'cost' | 'balanced';
}

interface ExecutionResult {
  workflow_id: string;
  execution_id: string;
  status: 'success' | 'partial_success' | 'failure';
  outputs: Record<string, unknown>;
  execution_trace: Array<{
    step_id: string;
    component_id: string;
    start_time: Date;
    end_time: Date;
    status: 'success' | 'failure' | 'skipped';
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    confidence?: number;
    cost_usd?: number;
    error_message?: string;
  }>;
  total_execution_time_ms: number;
  total_cost_usd: number;
  overall_confidence: number;
  quality_metrics: {
    accuracy: number;
    completeness: number;
    consistency: number;
    efficiency: number;
  };
}

export class CompoundAISystemsService extends EventEmitter {
  private isInitialized = false;
  private components: Map<string, AIComponent> = new Map();
  private workflows: Map<string, CompoundWorkflow> = new Map();
  private executionHistory: Map<string, ExecutionResult> = new Map();
  private activeExecutions: Map<string, { workflow_id: string; start_time: Date }> = new Map();

  constructor() {
    super();
    this.initializeBuiltInComponents();
    this.initializeDefaultWorkflows();
  }

  private initializeBuiltInComponents(): void {
    // Language Model Component
    this.components.set('llm_gpt4o', {
      id: 'llm_gpt4o',
      name: 'GPT-4o Language Model',
      type: 'model',
      capabilities: ['text_generation', 'reasoning', 'conversation', 'code_generation'],
      input_types: ['text', 'multimodal'],
      output_types: ['text'],
      reliability_score: 0.95,
      latency_ms: 1200,
      cost_per_call: 0.01,
      last_health_check: new Date(),
      status: 'healthy',
      dependencies: [],
      configuration: {
        model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 2000
      }
    });

    // Retrieval Component
    this.components.set('vector_retriever', {
      id: 'vector_retriever',
      name: 'Vector Database Retriever',
      type: 'retriever',
      capabilities: ['semantic_search', 'document_retrieval', 'context_gathering'],
      input_types: ['text'],
      output_types: ['documents', 'embeddings'],
      reliability_score: 0.92,
      latency_ms: 300,
      cost_per_call: 0.001,
      last_health_check: new Date(),
      status: 'healthy',
      dependencies: [],
      configuration: {
        similarity_threshold: 0.7,
        max_results: 10
      }
    });

    // Reasoning Component
    this.components.set('symbolic_reasoner', {
      id: 'symbolic_reasoner',
      name: 'Symbolic Logic Reasoner',
      type: 'reasoner',
      capabilities: ['logical_inference', 'rule_application', 'causal_reasoning'],
      input_types: ['text', 'structured_data'],
      output_types: ['conclusions', 'explanations'],
      reliability_score: 0.88,
      latency_ms: 500,
      cost_per_call: 0.002,
      last_health_check: new Date(),
      status: 'healthy',
      dependencies: [],
      configuration: {
        inference_engine: 'prolog_based',
        confidence_threshold: 0.8
      }
    });

    // Validation Component
    this.components.set('fact_validator', {
      id: 'fact_validator',
      name: 'Fact Validation System',
      type: 'validator',
      capabilities: ['fact_checking', 'source_verification', 'consistency_analysis'],
      input_types: ['text', 'claims'],
      output_types: ['validation_results', 'confidence_scores'],
      reliability_score: 0.90,
      latency_ms: 800,
      cost_per_call: 0.003,
      last_health_check: new Date(),
      status: 'healthy',
      dependencies: ['vector_retriever'],
      configuration: {
        verification_sources: ['knowledge_base', 'web_search'],
        confidence_threshold: 0.75
      }
    });

    // Aggregation Component
    this.components.set('ensemble_aggregator', {
      id: 'ensemble_aggregator',
      name: 'Ensemble Response Aggregator',
      type: 'aggregator',
      capabilities: ['response_fusion', 'confidence_weighting', 'consensus_building'],
      input_types: ['multiple_responses'],
      output_types: ['aggregated_response'],
      reliability_score: 0.93,
      latency_ms: 200,
      cost_per_call: 0.0005,
      last_health_check: new Date(),
      status: 'healthy',
      dependencies: [],
      configuration: {
        aggregation_method: 'weighted_voting',
        consensus_threshold: 0.6
      }
    });

    // Safety Filter Component
    this.components.set('safety_filter', {
      id: 'safety_filter',
      name: 'AI Safety Filter',
      type: 'filter',
      capabilities: ['content_moderation', 'bias_detection', 'harm_prevention'],
      input_types: ['text', 'multimodal'],
      output_types: ['filtered_content', 'safety_scores'],
      reliability_score: 0.96,
      latency_ms: 150,
      cost_per_call: 0.0002,
      last_health_check: new Date(),
      status: 'healthy',
      dependencies: [],
      configuration: {
        safety_threshold: 0.8,
        filtering_strictness: 'moderate'
      }
    });
  }

  private initializeDefaultWorkflows(): void {
    // Research and Analysis Workflow
    this.workflows.set('research_analysis', {
      id: 'research_analysis',
      name: 'Research and Analysis Pipeline',
      description: 'Comprehensive research workflow with fact validation and reasoning',
      steps: [
        {
          id: 'step_1_retrieve',
          component_id: 'vector_retriever',
          input_mapping: { query: 'user_query' },
          output_mapping: { documents: 'retrieved_docs' },
          conditions: {
            required_confidence: 0.6,
            timeout_ms: 5000,
            retry_count: 2
          }
        },
        {
          id: 'step_2_reason',
          component_id: 'symbolic_reasoner',
          input_mapping: { context: 'retrieved_docs', query: 'user_query' },
          output_mapping: { conclusions: 'reasoning_results' },
          conditions: {
            required_confidence: 0.7,
            timeout_ms: 8000,
            fallback_component: 'llm_gpt4o'
          }
        },
        {
          id: 'step_3_validate',
          component_id: 'fact_validator',
          input_mapping: { claims: 'reasoning_results' },
          output_mapping: { validation: 'fact_check_results' },
          conditions: {
            timeout_ms: 10000,
            retry_count: 1
          }
        },
        {
          id: 'step_4_generate',
          component_id: 'llm_gpt4o',
          input_mapping: { 
            context: 'retrieved_docs', 
            reasoning: 'reasoning_results',
            validation: 'fact_check_results',
            query: 'user_query'
          },
          output_mapping: { response: 'generated_response' },
          conditions: {
            timeout_ms: 15000,
            retry_count: 2
          }
        },
        {
          id: 'step_5_filter',
          component_id: 'safety_filter',
          input_mapping: { content: 'generated_response' },
          output_mapping: { safe_content: 'final_response' },
          conditions: {
            required_confidence: 0.8,
            timeout_ms: 3000
          }
        }
      ],
      input_schema: {
        user_query: 'string'
      },
      output_schema: {
        final_response: 'string',
        reasoning_results: 'object',
        fact_check_results: 'object'
      },
      error_handling: {
        partial_failure_handling: 'continue',
        timeout_ms: 45000
      },
      optimization_strategy: 'balanced'
    });

    // Creative Generation Workflow
    this.workflows.set('creative_generation', {
      id: 'creative_generation',
      name: 'Creative Content Generation Pipeline',
      description: 'Multi-step creative content generation with safety filtering',
      steps: [
        {
          id: 'step_1_initial_gen',
          component_id: 'llm_gpt4o',
          input_mapping: { prompt: 'creative_prompt' },
          output_mapping: { content: 'initial_content' },
          conditions: {
            timeout_ms: 12000,
            retry_count: 2
          }
        },
        {
          id: 'step_2_enhance',
          component_id: 'llm_gpt4o',
          input_mapping: { 
            content: 'initial_content',
            instruction: 'enhance_instruction'
          },
          output_mapping: { enhanced: 'enhanced_content' },
          conditions: {
            timeout_ms: 12000,
            retry_count: 1
          },
          parallel_with: ['step_3_validate_initial']
        },
        {
          id: 'step_3_validate_initial',
          component_id: 'safety_filter',
          input_mapping: { content: 'initial_content' },
          output_mapping: { safety_score: 'initial_safety' },
          conditions: {
            required_confidence: 0.7,
            timeout_ms: 3000
          }
        },
        {
          id: 'step_4_final_filter',
          component_id: 'safety_filter',
          input_mapping: { content: 'enhanced_content' },
          output_mapping: { safe_content: 'final_creative_output' },
          conditions: {
            required_confidence: 0.8,
            timeout_ms: 3000
          }
        }
      ],
      input_schema: {
        creative_prompt: 'string',
        enhance_instruction: 'string'
      },
      output_schema: {
        final_creative_output: 'string',
        initial_safety: 'object'
      },
      error_handling: {
        partial_failure_handling: 'fallback',
        timeout_ms: 35000,
        fallback_workflow: 'simple_generation'
      },
      optimization_strategy: 'speed'
    });

    // Code Generation and Validation Workflow
    this.workflows.set('code_generation', {
      id: 'code_generation',
      name: 'Code Generation and Validation Pipeline',
      description: 'Generate, validate, and optimize code with safety checks',
      steps: [
        {
          id: 'step_1_code_gen',
          component_id: 'llm_gpt4o',
          input_mapping: { specification: 'code_requirements' },
          output_mapping: { code: 'generated_code' },
          conditions: {
            timeout_ms: 15000,
            retry_count: 2
          }
        },
        {
          id: 'step_2_security_check',
          component_id: 'safety_filter',
          input_mapping: { content: 'generated_code' },
          output_mapping: { security_assessment: 'security_results' },
          conditions: {
            required_confidence: 0.9,
            timeout_ms: 5000
          }
        },
        {
          id: 'step_3_optimize',
          component_id: 'llm_gpt4o',
          input_mapping: { 
            code: 'generated_code',
            security_feedback: 'security_results'
          },
          output_mapping: { optimized_code: 'final_code' },
          conditions: {
            timeout_ms: 12000,
            retry_count: 1
          }
        }
      ],
      input_schema: {
        code_requirements: 'string'
      },
      output_schema: {
        final_code: 'string',
        security_results: 'object'
      },
      error_handling: {
        partial_failure_handling: 'continue',
        timeout_ms: 40000
      },
      optimization_strategy: 'accuracy'
    });
  }

  async init(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      console.log('🔗 Initializing Compound AI Systems Architecture...');
      
      // Health check all components
      const healthResults = await Promise.allSettled(
        Array.from(this.components.values()).map(component => 
          this.healthCheckComponent(component.id)
        )
      );

      const healthyComponents = healthResults.filter(result => 
        result.status === 'fulfilled' && result.value
      ).length;

      console.log(`✅ ${healthyComponents}/${this.components.size} components are healthy`);

      this.isInitialized = true;
      console.log(`✅ Compound AI Systems initialized with ${this.workflows.size} workflows`);
      
      this.emit('initialized', { 
        component_count: this.components.size,
        workflow_count: this.workflows.size,
        healthy_components: healthyComponents
      });
      
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize Compound AI Systems:', error);
      return false;
    }
  }

  async executeWorkflow(
    workflowId: string,
    inputs: Record<string, unknown>,
    options: {
      execution_id?: string;
      optimization_override?: 'speed' | 'accuracy' | 'cost' | 'balanced';
      timeout_override_ms?: number;
      parallel_execution?: boolean;
    } = {}
  ): Promise<ExecutionResult> {
    const executionId = options.execution_id || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      const workflow = this.workflows.get(workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      console.log(`🚀 Executing workflow: ${workflow.name} (${executionId})`);

      // Track active execution
      this.activeExecutions.set(executionId, {
        workflow_id: workflowId,
        start_time: new Date()
      });

      // Validate inputs
      this.validateInputs(inputs, workflow.input_schema);

      // Execute workflow steps
      const executionTrace: ExecutionResult['execution_trace'] = [];
      const stepOutputs = new Map<string, Record<string, unknown>>();
      let totalCost = 0;
      let overallConfidence = 1.0;

      // Initialize with input data
      stepOutputs.set('inputs', inputs);

      // Group steps for parallel execution
      const stepGroups = this.groupStepsForExecution(workflow.steps, options.parallel_execution);

      for (const stepGroup of stepGroups) {
        await Promise.all(stepGroup.map(async (step) => {
          const stepStartTime = new Date();
          
          try {
            const component = this.components.get(step.component_id);
            if (!component) {
              throw new Error(`Component not found: ${step.component_id}`);
            }

            // Check component health
            const isHealthy = await this.healthCheckComponent(component.id);
            if (!isHealthy && !step.conditions?.fallback_component) {
              throw new Error(`Component ${component.id} is unhealthy and no fallback available`);
            }

            // Prepare step inputs
            const stepInputs = this.mapInputs(step.input_mapping, stepOutputs);

            // Execute component
            const stepResult = await this.executeComponent(
              component,
              stepInputs,
              step.conditions?.timeout_ms || 30000
            );

            // Map outputs
            const mappedOutputs = this.mapOutputs(step.output_mapping, stepResult.outputs);
            stepOutputs.set(step.id, mappedOutputs);

            // Update metrics
            totalCost += stepResult.cost_usd || 0;
            overallConfidence = Math.min(overallConfidence, stepResult.confidence || 1.0);

            // Record successful execution
            executionTrace.push({
              step_id: step.id,
              component_id: step.component_id,
              start_time: stepStartTime,
              end_time: new Date(),
              status: 'success',
              inputs: stepInputs,
              outputs: mappedOutputs,
              confidence: stepResult.confidence,
              cost_usd: stepResult.cost_usd
            });

            console.log(`✅ Step ${step.id} completed successfully`);

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            // Handle fallback if available
            if (step.conditions?.fallback_component) {
              console.log(`⚠️ Step ${step.id} failed, trying fallback: ${step.conditions.fallback_component}`);
              
              try {
                const fallbackComponent = this.components.get(step.conditions.fallback_component);
                if (fallbackComponent) {
                  const stepInputs = this.mapInputs(step.input_mapping, stepOutputs);
                  const fallbackResult = await this.executeComponent(
                    fallbackComponent,
                    stepInputs,
                    step.conditions.timeout_ms || 30000
                  );
                  
                  const mappedOutputs = this.mapOutputs(step.output_mapping, fallbackResult.outputs);
                  stepOutputs.set(step.id, mappedOutputs);
                  totalCost += fallbackResult.cost_usd || 0;
                  overallConfidence = Math.min(overallConfidence, (fallbackResult.confidence || 1.0) * 0.8);

                  executionTrace.push({
                    step_id: step.id,
                    component_id: step.conditions.fallback_component,
                    start_time: stepStartTime,
                    end_time: new Date(),
                    status: 'success',
                    inputs: stepInputs,
                    outputs: mappedOutputs,
                    confidence: fallbackResult.confidence,
                    cost_usd: fallbackResult.cost_usd
                  });

                  console.log(`✅ Fallback for step ${step.id} completed successfully`);
                  return;
                }
              } catch (fallbackError) {
                console.error(`❌ Fallback also failed for step ${step.id}:`, fallbackError);
              }
            }

            // Record failed execution
            executionTrace.push({
              step_id: step.id,
              component_id: step.component_id,
              start_time: stepStartTime,
              end_time: new Date(),
              status: 'failure',
              inputs: {},
              outputs: {},
              error_message: errorMessage
            });

            // Check error handling strategy
            if (workflow.error_handling.partial_failure_handling === 'abort') {
              throw error;
            } else if (workflow.error_handling.partial_failure_handling === 'fallback' && 
                      workflow.error_handling.fallback_workflow) {
              console.log(`🔄 Switching to fallback workflow: ${workflow.error_handling.fallback_workflow}`);
              return this.executeWorkflow(workflow.error_handling.fallback_workflow, inputs, options);
            }

            console.warn(`⚠️ Step ${step.id} failed, continuing with partial failure handling`);
          }
        }));
      }

      // Extract final outputs
      const finalOutputs = this.extractFinalOutputs(workflow.output_schema, stepOutputs);

      const executionTime = Date.now() - startTime;
      const executionStatus = executionTrace.every(trace => trace.status === 'success') ? 
        'success' : 
        executionTrace.some(trace => trace.status === 'success') ? 'partial_success' : 'failure';

      // Calculate quality metrics
      const qualityMetrics = this.calculateQualityMetrics(executionTrace, overallConfidence);

      const result: ExecutionResult = {
        workflow_id: workflowId,
        execution_id: executionId,
        status: executionStatus,
        outputs: finalOutputs,
        execution_trace: executionTrace,
        total_execution_time_ms: executionTime,
        total_cost_usd: totalCost,
        overall_confidence: overallConfidence,
        quality_metrics: qualityMetrics
      };

      // Store execution result
      this.executionHistory.set(executionId, result);
      this.activeExecutions.delete(executionId);

      console.log(`🎯 Workflow execution completed: ${executionStatus} (${executionTime}ms, $${totalCost.toFixed(4)})`);
      
      this.emit('workflow_executed', {
        workflow_id: workflowId,
        execution_id: executionId,
        status: executionStatus,
        execution_time_ms: executionTime,
        cost_usd: totalCost
      });

      return result;

    } catch (error) {
      this.activeExecutions.delete(executionId);
      console.error('❌ Workflow execution failed:', error);
      throw error;
    }
  }

  private groupStepsForExecution(
    steps: WorkflowStep[], 
    enableParallel: boolean = true
  ): WorkflowStep[][] {
    if (!enableParallel) {
      return steps.map(step => [step]);
    }

    const groups: WorkflowStep[][] = [];
    const processed = new Set<string>();

    for (const step of steps) {
      if (processed.has(step.id)) continue;

      const group = [step];
      processed.add(step.id);

      // Find parallel steps
      if (step.parallel_with) {
        for (const parallelStepId of step.parallel_with) {
          const parallelStep = steps.find(s => s.id === parallelStepId);
          if (parallelStep && !processed.has(parallelStepId)) {
            group.push(parallelStep);
            processed.add(parallelStepId);
          }
        }
      }

      groups.push(group);
    }

    return groups;
  }

  private validateInputs(inputs: Record<string, unknown>, schema: Record<string, string>): void {
    for (const [key, type] of Object.entries(schema)) {
      if (!(key in inputs)) {
        throw new Error(`Missing required input: ${key}`);
      }

      const value = inputs[key];
      const actualType = typeof value;

      // Simple type checking
      if (type === 'string' && actualType !== 'string') {
        throw new Error(`Input ${key} must be a string, got ${actualType}`);
      } else if (type === 'number' && actualType !== 'number') {
        throw new Error(`Input ${key} must be a number, got ${actualType}`);
      } else if (type === 'object' && (actualType !== 'object' || value === null)) {
        throw new Error(`Input ${key} must be an object, got ${actualType}`);
      }
    }
  }

  private mapInputs(
    mapping: Record<string, string>,
    stepOutputs: Map<string, Record<string, unknown>>
  ): Record<string, unknown> {
    const mappedInputs: Record<string, unknown> = {};

    for (const [componentParam, dataSource] of Object.entries(mapping)) {
      // Find the source data
      let sourceValue: unknown = undefined;

      for (const [stepId, outputs] of stepOutputs) {
        if (dataSource in outputs) {
          sourceValue = outputs[dataSource];
          break;
        }
      }

      if (sourceValue === undefined) {
        throw new Error(`Data source not found: ${dataSource}`);
      }

      mappedInputs[componentParam] = sourceValue;
    }

    return mappedInputs;
  }

  private mapOutputs(
    mapping: Record<string, string>,
    componentOutputs: Record<string, unknown>
  ): Record<string, unknown> {
    const mappedOutputs: Record<string, unknown> = {};

    for (const [outputParam, componentParam] of Object.entries(mapping)) {
      if (componentParam in componentOutputs) {
        mappedOutputs[outputParam] = componentOutputs[componentParam];
      }
    }

    return mappedOutputs;
  }

  private async executeComponent(
    component: AIComponent,
    inputs: Record<string, unknown>,
    timeoutMs: number
  ): Promise<{
    outputs: Record<string, unknown>;
    confidence?: number;
    cost_usd?: number;
  }> {
    // Simulate component execution based on type
    const startTime = Date.now();
    
    // Simulate processing delay
    await new Promise(resolve => 
      setTimeout(resolve, Math.min(component.latency_ms, timeoutMs / 2))
    );

    const outputs: Record<string, unknown> = {};
    const confidence = component.reliability_score + (Math.random() * 0.1 - 0.05);
    const cost_usd = component.cost_per_call * (1 + Math.random() * 0.2);

    switch (component.type) {
      case 'model':
        if (component.capabilities.includes('text_generation')) {
          outputs.response = `Generated response from ${component.name} for: ${JSON.stringify(inputs)}`;
          outputs.tokens_used = Math.floor(Math.random() * 1000) + 100;
        }
        break;

      case 'retriever':
        if (component.capabilities.includes('semantic_search')) {
          outputs.documents = [
            { id: 'doc1', content: 'Sample document 1', score: 0.9 },
            { id: 'doc2', content: 'Sample document 2', score: 0.8 }
          ];
          outputs.total_results = 2;
        }
        break;

      case 'reasoner':
        if (component.capabilities.includes('logical_inference')) {
          outputs.conclusions = [
            { conclusion: 'Based on the input, conclusion A follows', confidence: 0.9 },
            { conclusion: 'Additionally, conclusion B can be inferred', confidence: 0.7 }
          ];
          outputs.reasoning_steps = ['Step 1: Analysis', 'Step 2: Inference', 'Step 3: Conclusion'];
        }
        break;

      case 'validator':
        if (component.capabilities.includes('fact_checking')) {
          outputs.validation_results = {
            overall_validity: 0.85,
            validated_claims: 3,
            flagged_claims: 1,
            verification_sources: ['source1', 'source2']
          };
        }
        break;

      case 'aggregator':
        if (component.capabilities.includes('response_fusion')) {
          outputs.aggregated_response = 'Fused response from multiple sources';
          outputs.consensus_score = 0.82;
          outputs.source_weights = { source1: 0.4, source2: 0.6 };
        }
        break;

      case 'filter':
        if (component.capabilities.includes('content_moderation')) {
          outputs.safe_content = inputs.content || 'Filtered content';
          outputs.safety_scores = {
            toxicity: 0.1,
            bias: 0.15,
            harm: 0.05,
            overall_safety: 0.9
          };
          outputs.filtered = false;
        }
        break;

      default:
        outputs.result = `Processed by ${component.name}`;
    }

    return { outputs, confidence, cost_usd };
  }

  private extractFinalOutputs(
    outputSchema: Record<string, string>,
    stepOutputs: Map<string, Record<string, unknown>>
  ): Record<string, unknown> {
    const finalOutputs: Record<string, unknown> = {};

    for (const outputKey of Object.keys(outputSchema)) {
      // Find the output in step results
      for (const [stepId, outputs] of stepOutputs) {
        if (outputKey in outputs) {
          finalOutputs[outputKey] = outputs[outputKey];
          break;
        }
      }
    }

    return finalOutputs;
  }

  private calculateQualityMetrics(
    executionTrace: ExecutionResult['execution_trace'],
    overallConfidence: number
  ): ExecutionResult['quality_metrics'] {
    const successfulSteps = executionTrace.filter(trace => trace.status === 'success').length;
    const totalSteps = executionTrace.length;
    
    const accuracy = overallConfidence;
    const completeness = successfulSteps / totalSteps;
    const consistency = executionTrace.length > 0 ? 
      executionTrace.filter(trace => (trace.confidence || 0) > 0.7).length / totalSteps : 1;
    
    const avgExecutionTime = executionTrace.length > 0 ?
      executionTrace.reduce((sum, trace) => 
        sum + (trace.end_time.getTime() - trace.start_time.getTime()), 0
      ) / executionTrace.length : 0;
    
    const efficiency = Math.max(0, 1 - (avgExecutionTime / 10000)); // Normalize to 10s baseline

    return {
      accuracy,
      completeness,
      consistency,
      efficiency
    };
  }

  async healthCheckComponent(componentId: string): Promise<boolean> {
    try {
      const component = this.components.get(componentId);
      if (!component) return false;

      // Simulate health check
      const isHealthy = Math.random() > 0.05; // 95% uptime simulation
      
      component.status = isHealthy ? 'healthy' : 'degraded';
      component.last_health_check = new Date();

      return isHealthy;

    } catch (error) {
      console.error(`❌ Health check failed for component ${componentId}:`, error);
      return false;
    }
  }

  async addComponent(component: AIComponent): Promise<boolean> {
    try {
      // Validate component
      if (!this.validateComponent(component)) {
        throw new Error('Invalid component configuration');
      }

      this.components.set(component.id, component);
      console.log(`✅ Added component: ${component.name}`);
      
      this.emit('component_added', { component_id: component.id, component_name: component.name });
      return true;

    } catch (error) {
      console.error('❌ Failed to add component:', error);
      return false;
    }
  }

  private validateComponent(component: AIComponent): boolean {
    return (
      component.id &&
      component.name &&
      component.type &&
      component.capabilities.length > 0 &&
      component.input_types.length > 0 &&
      component.output_types.length > 0 &&
      component.reliability_score >= 0 &&
      component.reliability_score <= 1 &&
      component.latency_ms > 0 &&
      component.cost_per_call >= 0
    );
  }

  async addWorkflow(workflow: CompoundWorkflow): Promise<boolean> {
    try {
      // Validate workflow
      if (!this.validateWorkflow(workflow)) {
        throw new Error('Invalid workflow configuration');
      }

      this.workflows.set(workflow.id, workflow);
      console.log(`✅ Added workflow: ${workflow.name}`);
      
      this.emit('workflow_added', { workflow_id: workflow.id, workflow_name: workflow.name });
      return true;

    } catch (error) {
      console.error('❌ Failed to add workflow:', error);
      return false;
    }
  }

  private validateWorkflow(workflow: CompoundWorkflow): boolean {
    // Check basic properties
    if (!workflow.id || !workflow.name || workflow.steps.length === 0) {
      return false;
    }

    // Check that all referenced components exist
    for (const step of workflow.steps) {
      if (!this.components.has(step.component_id)) {
        console.warn(`Component not found: ${step.component_id}`);
        return false;
      }

      // Check fallback components
      if (step.conditions?.fallback_component && 
          !this.components.has(step.conditions.fallback_component)) {
        console.warn(`Fallback component not found: ${step.conditions.fallback_component}`);
        return false;
      }
    }

    return true;
  }

  getExecutionHistory(
    workflowId?: string,
    limit: number = 10
  ): ExecutionResult[] {
    let results = Array.from(this.executionHistory.values());
    
    if (workflowId) {
      results = results.filter(result => result.workflow_id === workflowId);
    }

    return results
      .sort((a, b) => b.total_execution_time_ms - a.total_execution_time_ms)
      .slice(0, limit);
  }

  getMetrics(): {
    total_components: number;
    total_workflows: number;
    execution_history_count: number;
    active_executions: number;
    component_health: Record<string, string>;
    average_execution_time_ms: number;
    total_cost_usd: number;
    success_rate: number;
  } {
    const componentHealth: Record<string, string> = {};
    this.components.forEach((component, id) => {
      componentHealth[id] = component.status;
    });

    const executions = Array.from(this.executionHistory.values());
    const avgExecutionTime = executions.length > 0 ?
      executions.reduce((sum, exec) => sum + exec.total_execution_time_ms, 0) / executions.length : 0;
    
    const totalCost = executions.reduce((sum, exec) => sum + exec.total_cost_usd, 0);
    const successRate = executions.length > 0 ?
      executions.filter(exec => exec.status === 'success').length / executions.length : 0;

    return {
      total_components: this.components.size,
      total_workflows: this.workflows.size,
      execution_history_count: this.executionHistory.size,
      active_executions: this.activeExecutions.size,
      component_health: componentHealth,
      average_execution_time_ms: avgExecutionTime,
      total_cost_usd: totalCost,
      success_rate: successRate
    };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    component_health_rate: number;
    workflow_availability: number;
    system_performance: number;
  }> {
    const metrics = this.getMetrics();
    const healthyComponents = Object.values(metrics.component_health)
      .filter(status => status === 'healthy').length;
    const componentHealthRate = healthyComponents / this.components.size;
    
    const workflowAvailability = this.workflows.size > 0 ? 1 : 0; // Simplified
    const systemPerformance = metrics.success_rate;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (componentHealthRate >= 0.9 && systemPerformance >= 0.8) {
      status = 'healthy';
    } else if (componentHealthRate >= 0.7 && systemPerformance >= 0.6) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      component_health_rate: componentHealthRate,
      workflow_availability: workflowAvailability,
      system_performance: systemPerformance
    };
  }

  async shutdown(): Promise<void> {
    try {
      console.log('🔌 Shutting down Compound AI Systems service...');
      
      // Wait for active executions to complete or timeout
      const activeExecutionIds = Array.from(this.activeExecutions.keys());
      if (activeExecutionIds.length > 0) {
        console.log(`⏳ Waiting for ${activeExecutionIds.length} active executions to complete...`);
        
        // Wait up to 30 seconds for graceful shutdown
        const shutdownTimeout = setTimeout(() => {
          console.warn('⚠️ Forced shutdown due to timeout');
        }, 30000);

        while (this.activeExecutions.size > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        clearTimeout(shutdownTimeout);
      }

      this.components.clear();
      this.workflows.clear();
      this.executionHistory.clear();
      this.activeExecutions.clear();
      this.isInitialized = false;
      
      this.emit('shutdown');
      console.log('✅ Compound AI Systems service shutdown complete');
      
    } catch (error) {
      console.error('❌ Error during Compound AI Systems shutdown:', error);
    }
  }
}

export const compoundAISystemsService = new CompoundAISystemsService();