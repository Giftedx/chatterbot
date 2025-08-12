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
 * @param {string} featureName - Name of the feature flag
 * @returns {boolean} Feature flag status
 */
export function getFeatureFlag(featureName) {
  return features[featureName] ?? false;
}

/**
 * Check if any of the provided features are enabled
 * @param {string[]} featureNames - Array of feature names to check
 * @returns {boolean} True if any feature is enabled
 */
export function anyFeatureEnabled(featureNames) {
  return featureNames.some(name => features[name]);
}

/**
 * Check if all of the provided features are enabled
 * @param {string[]} featureNames - Array of feature names to check  
 * @returns {boolean} True if all features are enabled
 */
export function allFeaturesEnabled(featureNames) {
  return featureNames.every(name => features[name]);
}