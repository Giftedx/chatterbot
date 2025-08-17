/**
 * Feature flag configuration system
 * Centralized management of feature toggles based on environment variables
 */

import { getEnvAsBoolean } from '../utils/env.js';

export interface FeatureFlags {
  // Phase 3: Core Framework Integration (Completed)
  temporal: boolean;
  vercelAI: boolean;
  pgvector: boolean;

  // Phase 4: Advanced Intelligence Features
  langgraph: boolean;
  longTermMemory: boolean;
  gpt4oMultimodal: boolean;
  crewaiSpecialists: boolean;
  realTimeStreaming: boolean;

  // Phase 5: Production & Optimization
  hardenedAudio: boolean;
  mlopsLifecycle: boolean;
  edgeDeployment: boolean;

  // Additional capabilities
  distributedTracing: boolean;
  advancedAnalytics: boolean;
  adaptiveLearning: boolean;
  contextualPersonas: boolean;
  semanticCaching: boolean;
  proactiveNotifications: boolean;

  // Enhanced Research Features - Phase 1: Core Infrastructure
  enhancedLangfuse: boolean;
  multiProviderTokenization: boolean;
  semanticCacheEnhanced: boolean;
  langGraphWorkflows: boolean;

  // Enhanced Research Features - Phase 2: Vector & Database
  qdrantVectorDB: boolean;
  vectorMigrationUtils: boolean;
  advancedFiltering: boolean;

  // Enhanced Research Features - Phase 3: Web & Accessibility
  crawl4aiWebAccess: boolean;
  webContentExtraction: boolean;
  urlProcessingService: boolean;

  // Enhanced Research Features - Phase 4: Multimodal
  qwen25vlMultimodal: boolean;
  imageAnalysisService: boolean;
  visualReasoning: boolean;
  multimodalContext: boolean;

  // Enhanced Research Features - Phase 5: Knowledge Graphs
  knowledgeGraphs: boolean;
  graphBasedReasoning: boolean;
  entityRelationshipTracking: boolean;
  graphQueryCapabilities: boolean;

  // Enhanced Research Features - Phase 6: DSPy RAG Optimization
  dspyRagOptimization: boolean;
  automaticPromptTuning: boolean;
  fewShotOptimization: boolean;
  optimizedRetrieval: boolean;

  // Enhanced Research Features - Phase 7: Advanced AI Features
  autonomousToolGeneration: boolean;
  causalReasoningEngine: boolean;
  contextAwareResponses: boolean;
  performanceOptimization: boolean;
}

export const features: FeatureFlags = {
  // Phase 3: Core Framework Integration
  temporal: getEnvAsBoolean('FEATURE_TEMPORAL', true),
  vercelAI: getEnvAsBoolean('FEATURE_VERCEL_AI', true),
  pgvector: getEnvAsBoolean('FEATURE_PGVECTOR', true),

  // Phase 4: Advanced Intelligence Features
  langgraph: getEnvAsBoolean('FEATURE_LANGGRAPH', true),
  longTermMemory: getEnvAsBoolean('FEATURE_LONG_TERM_MEMORY', true),
  gpt4oMultimodal: getEnvAsBoolean('FEATURE_GPT4O_MULTIMODAL', true),
  crewaiSpecialists: getEnvAsBoolean('FEATURE_CREWAI_SPECIALISTS', true),
  realTimeStreaming: getEnvAsBoolean('FEATURE_REAL_TIME_STREAMING', true),

  // Phase 5: Production & Optimization
  hardenedAudio: getEnvAsBoolean('FEATURE_HARDENED_AUDIO', true),
  mlopsLifecycle: getEnvAsBoolean('FEATURE_MLOPS_LIFECYCLE', true),
  edgeDeployment: getEnvAsBoolean('FEATURE_EDGE_DEPLOYMENT', true),

  // Additional capabilities
  distributedTracing: getEnvAsBoolean('FEATURE_DISTRIBUTED_TRACING', true),
  advancedAnalytics: getEnvAsBoolean('FEATURE_ADVANCED_ANALYTICS', true),
  adaptiveLearning: getEnvAsBoolean('FEATURE_ADAPTIVE_LEARNING', true),
  contextualPersonas: getEnvAsBoolean('FEATURE_CONTEXTUAL_PERSONAS', true),
  semanticCaching: getEnvAsBoolean('FEATURE_SEMANTIC_CACHING', true),
  proactiveNotifications: getEnvAsBoolean('FEATURE_PROACTIVE_NOTIFICATIONS', true),

  // Enhanced Research Features - Phase 1: Core Infrastructure
  enhancedLangfuse: getEnvAsBoolean('FEATURE_ENHANCED_LANGFUSE', true),
  multiProviderTokenization: getEnvAsBoolean('FEATURE_MULTI_PROVIDER_TOKENIZATION', true),
  semanticCacheEnhanced: getEnvAsBoolean('FEATURE_SEMANTIC_CACHE_ENHANCED', true),
  langGraphWorkflows: getEnvAsBoolean('FEATURE_LANGGRAPH_WORKFLOWS', true),

  // Enhanced Research Features - Phase 2: Vector & Database
  qdrantVectorDB: getEnvAsBoolean('FEATURE_QDRANT_VECTOR_DB', true),
  vectorMigrationUtils: getEnvAsBoolean('FEATURE_VECTOR_MIGRATION_UTILS', true),
  advancedFiltering: getEnvAsBoolean('FEATURE_ADVANCED_FILTERING', true),

  // Enhanced Research Features - Phase 3: Web & Accessibility
  crawl4aiWebAccess: getEnvAsBoolean('FEATURE_CRAWL4AI_WEB_ACCESS', true),
  webContentExtraction: getEnvAsBoolean('FEATURE_WEB_CONTENT_EXTRACTION', true),
  urlProcessingService: getEnvAsBoolean('FEATURE_URL_PROCESSING_SERVICE', true),

  // Enhanced Research Features - Phase 4: Multimodal
  qwen25vlMultimodal: getEnvAsBoolean('FEATURE_QWEN25VL_MULTIMODAL', true),
  imageAnalysisService: getEnvAsBoolean('FEATURE_IMAGE_ANALYSIS_SERVICE', true),
  visualReasoning: getEnvAsBoolean('FEATURE_VISUAL_REASONING', true),
  multimodalContext: getEnvAsBoolean('FEATURE_MULTIMODAL_CONTEXT', true),

  // Enhanced Research Features - Phase 5: Knowledge Graphs
  knowledgeGraphs: getEnvAsBoolean('FEATURE_KNOWLEDGE_GRAPHS', true),
  graphBasedReasoning: getEnvAsBoolean('FEATURE_GRAPH_BASED_REASONING', true),
  entityRelationshipTracking: getEnvAsBoolean('FEATURE_ENTITY_RELATIONSHIP_TRACKING', true),
  graphQueryCapabilities: getEnvAsBoolean('FEATURE_GRAPH_QUERY_CAPABILITIES', true),

  // Enhanced Research Features - Phase 6: DSPy RAG Optimization
  dspyRagOptimization: getEnvAsBoolean('FEATURE_DSPY_RAG_OPTIMIZATION', true),
  automaticPromptTuning: getEnvAsBoolean('FEATURE_AUTOMATIC_PROMPT_TUNING', true),
  fewShotOptimization: getEnvAsBoolean('FEATURE_FEW_SHOT_OPTIMIZATION', true),
  optimizedRetrieval: getEnvAsBoolean('FEATURE_OPTIMIZED_RETRIEVAL', true),

  // Enhanced Research Features - Phase 7: Advanced AI Features
  autonomousToolGeneration: getEnvAsBoolean('FEATURE_AUTONOMOUS_TOOL_GENERATION', true),
  causalReasoningEngine: getEnvAsBoolean('FEATURE_CAUSAL_REASONING_ENGINE', true),
  contextAwareResponses: getEnvAsBoolean('FEATURE_CONTEXT_AWARE_RESPONSES', true),
  performanceOptimization: getEnvAsBoolean('FEATURE_PERFORMANCE_OPTIMIZATION', true),
};

export function getFeatureFlag(featureName: string): boolean {
  return (features as any)[featureName] ?? false;
}

export function anyFeatureEnabled(featureNames: string[]): boolean {
  return featureNames.some((name) => (features as any)[name]);
}

export function allFeaturesEnabled(featureNames: string[]): boolean {
  return featureNames.every((name) => (features as any)[name]);
}

// Alias for backward compatibility
export const featureFlags = features;
