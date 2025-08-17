/**
 * Autonomous Capability Registry
 * Machine-readable registry of all system capabilities with metadata,
 * dependencies, and activation policies for autonomous feature management
 */

import { logger } from '../utils/logger.js';

export interface CapabilityMetadata {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'intelligence' | 'storage' | 'orchestration' | 'communication' | 'analysis';
  priority: 'critical' | 'high' | 'medium' | 'low';

  // Functionality specification
  purpose: string;
  inputs: string[];
  outputs: string[];

  // Dependencies and requirements
  dependencies: string[];
  softDependencies: string[];
  preconditions: string[];
  resourceRequirements: {
    memory?: string;
    cpu?: string;
    network?: boolean;
    storage?: string;
  };

  // Activation policies
  activationPolicy: {
    automatic: boolean;
    contextual: boolean;
    conditions: string[];
    triggers: string[];
    cooldownMs?: number;
  };

  // Usage contexts
  contexts: {
    suitable: string[];
    inappropriate: string[];
    performance_impact: 'none' | 'low' | 'medium' | 'high';
    reliability: 'stable' | 'experimental' | 'beta';
  };

  // Health and monitoring
  healthCheck?: () => Promise<boolean>;
  fallbackCapabilities?: string[];

  // Feature flags and environment
  featureFlag?: string;
  environmentRequirements?: string[];
}

export interface CapabilityState {
  id: string;
  status: 'active' | 'inactive' | 'failed' | 'degraded' | 'initializing';
  lastActivated?: Date;
  lastDeactivated?: Date;
  activationCount: number;
  failureCount: number;
  healthScore: number; // 0-1
  currentContext?: string[];
  performanceMetrics?: {
    avgResponseTime: number;
    successRate: number;
    resourceUsage: number;
  };
}

export class AutonomousCapabilityRegistry {
  private capabilities = new Map<string, CapabilityMetadata>();
  private states = new Map<string, CapabilityState>();
  private activationHistory: Array<{
    capabilityId: string;
    action: 'activate' | 'deactivate';
    timestamp: Date;
    context: string[];
    reason: string;
  }> = [];

  constructor() {
    this.initializeCapabilityDefinitions();
    logger.info('Autonomous Capability Registry initialized');
  }

  private initializeCapabilityDefinitions(): void {
    // Core System Capabilities
    this.registerCapability({
      id: 'core-intelligence',
      name: 'Core Intelligence Service',
      description: 'Primary AI reasoning and decision-making engine',
      category: 'core',
      priority: 'critical',
      purpose: 'Process messages, make decisions, orchestrate responses',
      inputs: ['user_messages', 'context', 'history'],
      outputs: ['responses', 'actions', 'decisions'],
      dependencies: [],
      softDependencies: ['semantic-cache', 'tokenization'],
      preconditions: ['discord_connected', 'models_available'],
      resourceRequirements: { memory: '512MB', cpu: 'medium', network: true },
      activationPolicy: {
        automatic: true,
        contextual: false,
        conditions: ['always'],
        triggers: ['system_start'],
      },
      contexts: {
        suitable: ['all'],
        inappropriate: [],
        performance_impact: 'medium',
        reliability: 'stable',
      },
    });

    // Intelligence Enhancement Capabilities
    this.registerCapability({
      id: 'web-search',
      name: 'Real-time Web Search',
      description: 'Brave Search API integration for current information',
      category: 'intelligence',
      priority: 'high',
      purpose: 'Retrieve current, factual information from the web',
      inputs: ['search_query', 'context'],
      outputs: ['search_results', 'factual_data'],
      dependencies: ['brave-search-api'],
      softDependencies: [],
      preconditions: ['api_key_available', 'network_connected'],
      resourceRequirements: { network: true },
      activationPolicy: {
        automatic: false,
        contextual: true,
        conditions: ['question_requires_current_info', 'factual_query_detected'],
        triggers: ['current_events_query', 'unknown_information'],
        cooldownMs: 5000,
      },
      contexts: {
        suitable: ['factual_questions', 'current_events', 'research_tasks'],
        inappropriate: ['creative_writing', 'personal_advice'],
        performance_impact: 'low',
        reliability: 'stable',
      },
      healthCheck: () => this.checkBraveSearchHealth(),
    });

    this.registerCapability({
      id: 'content-extraction',
      name: 'Web Content Extraction',
      description: 'Extract and analyze content from URLs',
      category: 'intelligence',
      priority: 'medium',
      purpose: 'Parse and extract meaningful content from web pages',
      inputs: ['urls', 'extraction_params'],
      outputs: ['extracted_content', 'structured_data'],
      dependencies: ['firecrawl-api'],
      softDependencies: ['crawl4ai'],
      preconditions: ['api_key_available'],
      resourceRequirements: { network: true, cpu: 'low' },
      activationPolicy: {
        automatic: false,
        contextual: true,
        conditions: ['urls_in_message', 'content_analysis_needed'],
        triggers: ['url_detected', 'document_analysis_request'],
      },
      contexts: {
        suitable: ['url_analysis', 'research', 'content_summarization'],
        inappropriate: ['private_content', 'authentication_required'],
        performance_impact: 'medium',
        reliability: 'stable',
      },
      fallbackCapabilities: ['crawl4ai-fallback'],
    });

    this.registerCapability({
      id: 'vector-storage',
      name: 'Vector Database (Qdrant)',
      description: 'High-performance vector storage and similarity search',
      category: 'storage',
      priority: 'medium',
      purpose: 'Store and retrieve semantic embeddings for context and memory',
      inputs: ['embeddings', 'metadata', 'search_vectors'],
      outputs: ['similar_vectors', 'stored_embeddings'],
      dependencies: ['qdrant-server'],
      softDependencies: [],
      preconditions: ['qdrant_running', 'collections_initialized'],
      resourceRequirements: { memory: '256MB', storage: '1GB', network: true },
      activationPolicy: {
        automatic: false,
        contextual: true,
        conditions: ['semantic_search_needed', 'memory_retrieval_required'],
        triggers: ['similar_content_search', 'context_expansion'],
      },
      contexts: {
        suitable: ['semantic_search', 'memory_systems', 'context_retrieval'],
        inappropriate: ['simple_keyword_search', 'exact_matches'],
        performance_impact: 'medium',
        reliability: 'beta',
      },
      healthCheck: () => this.checkQdrantHealth(),
      fallbackCapabilities: ['in-memory-vector-search'],
    });

    this.registerCapability({
      id: 'knowledge-graph',
      name: 'Knowledge Graph (Neo4j)',
      description: 'Graph database for entity relationships and knowledge mapping',
      category: 'storage',
      priority: 'medium',
      purpose: 'Store and query complex entity relationships and knowledge structures',
      inputs: ['entities', 'relationships', 'graph_queries'],
      outputs: ['entity_data', 'relationship_paths', 'knowledge_insights'],
      dependencies: ['neo4j-server'],
      softDependencies: [],
      preconditions: ['neo4j_running', 'schema_initialized'],
      resourceRequirements: { memory: '512MB', storage: '2GB', network: true },
      activationPolicy: {
        automatic: false,
        contextual: true,
        conditions: ['entity_analysis_needed', 'relationship_queries'],
        triggers: ['entity_mentioned', 'knowledge_exploration'],
      },
      contexts: {
        suitable: ['entity_analysis', 'knowledge_exploration', 'relationship_queries'],
        inappropriate: ['simple_data_storage', 'temporary_data'],
        performance_impact: 'medium',
        reliability: 'beta',
      },
      healthCheck: () => this.checkNeo4jHealth(),
      fallbackCapabilities: ['entity-memory-store'],
    });

    this.registerCapability({
      id: 'temporal-orchestration',
      name: 'Temporal Workflow Engine',
      description: 'Durable workflow orchestration for complex multi-step processes',
      category: 'orchestration',
      priority: 'low',
      purpose: 'Execute long-running, fault-tolerant workflows with state persistence',
      inputs: ['workflow_definitions', 'workflow_inputs'],
      outputs: ['workflow_results', 'execution_state'],
      dependencies: ['temporal-server'],
      softDependencies: [],
      preconditions: ['temporal_server_running', 'worker_registered'],
      resourceRequirements: { memory: '256MB', cpu: 'low', network: true },
      activationPolicy: {
        automatic: false,
        contextual: true,
        conditions: ['complex_multi_step_task', 'long_running_process'],
        triggers: ['workflow_request', 'background_processing'],
      },
      contexts: {
        suitable: ['complex_workflows', 'background_tasks', 'multi_step_processes'],
        inappropriate: ['simple_requests', 'real_time_responses'],
        performance_impact: 'low',
        reliability: 'experimental',
      },
      healthCheck: () => this.checkTemporalHealth(),
      fallbackCapabilities: ['simple-task-queue'],
    });

    this.registerCapability({
      id: 'semantic-cache',
      name: 'Enhanced Semantic Cache',
      description: 'Intelligent caching with semantic similarity matching',
      category: 'intelligence',
      priority: 'high',
      purpose: 'Cache responses with semantic similarity for performance optimization',
      inputs: ['query_embeddings', 'response_data', 'cache_policies'],
      outputs: ['cached_responses', 'similarity_matches'],
      dependencies: ['embedding-service'],
      softDependencies: ['vector-storage'],
      preconditions: ['embedding_model_available'],
      resourceRequirements: { memory: '128MB', cpu: 'low' },
      activationPolicy: {
        automatic: true,
        contextual: true,
        conditions: ['performance_optimization_enabled'],
        triggers: ['repeated_queries', 'similar_requests'],
      },
      contexts: {
        suitable: ['all_queries', 'performance_critical'],
        inappropriate: ['unique_queries', 'real_time_data'],
        performance_impact: 'none',
        reliability: 'stable',
      },
    });

    this.registerCapability({
      id: 'multimodal-analysis',
      name: 'Multimodal Content Analysis',
      description: 'QwenVL-based image and document analysis',
      category: 'intelligence',
      priority: 'medium',
      purpose: 'Analyze images, documents, and multimedia content',
      inputs: ['images', 'documents', 'analysis_requests'],
      outputs: ['content_analysis', 'extracted_text', 'visual_descriptions'],
      dependencies: ['qwen-vl-model'],
      softDependencies: ['ocr-service'],
      preconditions: ['model_loaded', 'gpu_available'],
      resourceRequirements: { memory: '1GB', cpu: 'high' },
      activationPolicy: {
        automatic: false,
        contextual: true,
        conditions: ['media_content_detected', 'visual_analysis_needed'],
        triggers: ['image_upload', 'document_analysis_request'],
        cooldownMs: 10000,
      },
      contexts: {
        suitable: ['image_analysis', 'document_processing', 'ocr_tasks'],
        inappropriate: ['text_only_content'],
        performance_impact: 'high',
        reliability: 'stable',
      },
    });

    this.registerCapability({
      id: 'advanced-reasoning',
      name: 'Sequential Thinking Engine',
      description: 'Multi-step reasoning and chain-of-thought processing',
      category: 'intelligence',
      priority: 'high',
      purpose: 'Execute complex reasoning chains and multi-step problem solving',
      inputs: ['complex_queries', 'reasoning_context'],
      outputs: ['reasoning_chains', 'step_by_step_solutions'],
      dependencies: ['reasoning-model'],
      softDependencies: ['mcp-sequential-thinking'],
      preconditions: ['reasoning_model_available'],
      resourceRequirements: { memory: '256MB', cpu: 'medium' },
      activationPolicy: {
        automatic: false,
        contextual: true,
        conditions: ['complex_problem_detected', 'multi_step_reasoning_needed'],
        triggers: ['analytical_question', 'problem_solving_request'],
      },
      contexts: {
        suitable: ['complex_problems', 'analytical_tasks', 'step_by_step_solutions'],
        inappropriate: ['simple_questions', 'factual_lookups'],
        performance_impact: 'medium',
        reliability: 'stable',
      },
    });

    logger.info(`Initialized ${this.capabilities.size} capability definitions`);
  }

  registerCapability(metadata: CapabilityMetadata): void {
    this.capabilities.set(metadata.id, metadata);
    this.states.set(metadata.id, {
      id: metadata.id,
      status: 'inactive',
      activationCount: 0,
      failureCount: 0,
      healthScore: 1.0,
    });
  }

  getCapability(id: string): CapabilityMetadata | undefined {
    return this.capabilities.get(id);
  }

  getCapabilityState(id: string): CapabilityState | undefined {
    return this.states.get(id);
  }

  getAllCapabilities(): CapabilityMetadata[] {
    return Array.from(this.capabilities.values());
  }

  getCapabilitiesByCategory(category: string): CapabilityMetadata[] {
    return Array.from(this.capabilities.values()).filter((cap) => cap.category === category);
  }

  getCapabilitiesForContext(context: string): CapabilityMetadata[] {
    return Array.from(this.capabilities.values())
      .filter(
        (cap) => cap.contexts.suitable.includes(context) || cap.contexts.suitable.includes('all'),
      )
      .filter((cap) => !cap.contexts.inappropriate.includes(context));
  }

  updateCapabilityState(id: string, updates: Partial<CapabilityState>): void {
    const current = this.states.get(id);
    if (current) {
      this.states.set(id, { ...current, ...updates });
    }
  }

  logActivation(
    capabilityId: string,
    action: 'activate' | 'deactivate',
    context: string[],
    reason: string,
  ): void {
    this.activationHistory.push({
      capabilityId,
      action,
      timestamp: new Date(),
      context,
      reason,
    });

    // Keep only last 1000 entries
    if (this.activationHistory.length > 1000) {
      this.activationHistory = this.activationHistory.slice(-1000);
    }
  }

  getActivationHistory(capabilityId?: string): typeof this.activationHistory {
    if (capabilityId) {
      return this.activationHistory.filter((entry) => entry.capabilityId === capabilityId);
    }
    return this.activationHistory;
  }

  // Health check methods
  private async checkBraveSearchHealth(): Promise<boolean> {
    try {
      // Simple check - this would be implemented based on actual API
      return process.env.BRAVE_API_KEY !== undefined;
    } catch {
      return false;
    }
  }

  private async checkQdrantHealth(): Promise<boolean> {
    try {
      // This would check actual Qdrant connection
      return false; // Currently failing based on logs
    } catch {
      return false;
    }
  }

  private async checkNeo4jHealth(): Promise<boolean> {
    try {
      // This would check actual Neo4j connection
      return false; // Currently failing based on logs
    } catch {
      return false;
    }
  }

  private async checkTemporalHealth(): Promise<boolean> {
    try {
      // This would check actual Temporal connection
      return false; // Currently failing based on logs
    } catch {
      return false;
    }
  }

  async runHealthChecks(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [id, capability] of this.capabilities) {
      if (capability.healthCheck) {
        try {
          const isHealthy = await capability.healthCheck();
          results.set(id, isHealthy);

          const state = this.getCapabilityState(id);
          if (state) {
            state.healthScore = isHealthy ? 1.0 : 0.0;
            if (!isHealthy && state.status === 'active') {
              state.status = 'degraded';
            }
          }
        } catch (error) {
          results.set(id, false);
          logger.error(`Health check failed for capability ${id}:`, error);
        }
      } else {
        results.set(id, true); // No health check = assume healthy
      }
    }

    return results;
  }

  exportRegistry(): object {
    return {
      capabilities: Object.fromEntries(this.capabilities),
      states: Object.fromEntries(this.states),
      activationHistory: this.activationHistory.slice(-100), // Last 100 entries
    };
  }
}

// Global registry instance
export const capabilityRegistry = new AutonomousCapabilityRegistry();
