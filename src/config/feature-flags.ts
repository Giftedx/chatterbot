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
}

export const features: FeatureFlags = {
  // Phase 3: Core Framework Integration
  temporal: getEnvAsBoolean('FEATURE_TEMPORAL', false),
  vercelAI: getEnvAsBoolean('FEATURE_VERCEL_AI', false),
  pgvector: getEnvAsBoolean('FEATURE_PGVECTOR', false),
  
  // Phase 4: Advanced Intelligence Features  
  langgraph: getEnvAsBoolean('FEATURE_LANGGRAPH', false),
  longTermMemory: getEnvAsBoolean('FEATURE_LONG_TERM_MEMORY', false),
  gpt4oMultimodal: getEnvAsBoolean('FEATURE_GPT4O_MULTIMODAL', false),
  crewaiSpecialists: getEnvAsBoolean('FEATURE_CREWAI_SPECIALISTS', false),
  realTimeStreaming: getEnvAsBoolean('FEATURE_REAL_TIME_STREAMING', false),
  
  // Phase 5: Production & Optimization
  hardenedAudio: getEnvAsBoolean('FEATURE_HARDENED_AUDIO', false),
  mlopsLifecycle: getEnvAsBoolean('FEATURE_MLOPS_LIFECYCLE', false),
  edgeDeployment: getEnvAsBoolean('FEATURE_EDGE_DEPLOYMENT', false),
  
  // Additional capabilities
  distributedTracing: getEnvAsBoolean('FEATURE_DISTRIBUTED_TRACING', false),
  advancedAnalytics: getEnvAsBoolean('FEATURE_ADVANCED_ANALYTICS', false),
  adaptiveLearning: getEnvAsBoolean('FEATURE_ADAPTIVE_LEARNING', false),
  contextualPersonas: getEnvAsBoolean('FEATURE_CONTEXTUAL_PERSONAS', false),
  semanticCaching: getEnvAsBoolean('FEATURE_SEMANTIC_CACHING', false),
  proactiveNotifications: getEnvAsBoolean('FEATURE_PROACTIVE_NOTIFICATIONS', false),
};

export function getFeatureFlag(featureName: string): boolean {
  return (features as any)[featureName] ?? false;
}

export function anyFeatureEnabled(featureNames: string[]): boolean {
  return featureNames.some(name => (features as any)[name]);
}

export function allFeaturesEnabled(featureNames: string[]): boolean {
  return featureNames.every(name => (features as any)[name]);
}
