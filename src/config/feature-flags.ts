/**
 * Feature flag configuration system
 * Centralized management of feature toggles based on environment variables
 */

export const features = {
  // Vercel AI provider integration
  vercelAI: process.env.FEATURE_VERCEL_AI === 'true',
  
  // Other existing feature flags can be added here
  enhancedIntelligence: process.env.ENABLE_ENHANCED_INTELLIGENCE === 'true',
  agenticIntelligence: process.env.ENABLE_AGENTIC_INTELLIGENCE !== 'false', // Default true
  mcpIntegration: process.env.ENABLE_MCP_INTEGRATION === 'true',
  analytics: process.env.ENABLE_ANALYTICS === 'true',
  moderation: process.env.ENABLE_MODERATION === 'true',
};

/**
 * Get feature flag status by name
 */
export function getFeatureFlag(featureName: string): boolean {
  return (features as any)[featureName] ?? false;
}

/**
 * Check if any of the provided features are enabled
 */
export function anyFeatureEnabled(featureNames: string[]): boolean {
  return featureNames.some(name => (features as any)[name]);
}

/**
 * Check if all of the provided features are enabled
 */
export function allFeaturesEnabled(featureNames: string[]): boolean {
  return featureNames.every(name => (features as any)[name]);
}