/**
 * Feature flag configuration system
 * Centralized management of feature toggles based on environment variables
 */

import { getEnvAsBoolean } from '../utils/env.js';

export interface FeatureFlags {
  temporal: boolean;
  vercelAI: boolean;
  pgvector: boolean;
}

export const features: FeatureFlags = {
  temporal: getEnvAsBoolean('FEATURE_TEMPORAL', false),
  vercelAI: getEnvAsBoolean('FEATURE_VERCEL_AI', false),
  pgvector: getEnvAsBoolean('FEATURE_PGVECTOR', false),
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
