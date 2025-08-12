/**
 * Environment utilities for safe environment variable access
 * Provides functions for getting optional and required environment variables
 */

/**
 * Get an optional environment variable with a default value
 * @param {string} key - Environment variable key
 * @param {string} defaultValue - Default value if environment variable is not set
 * @returns {string} Environment variable value or default
 */
export function getOptionalEnv(key, defaultValue = '') {
  return process.env[key] ?? defaultValue;
}

/**
 * Get a required environment variable, throw if not set
 * @param {string} key - Environment variable key
 * @param {string} errorMessage - Custom error message
 * @returns {string} Environment variable value
 * @throws {Error} If environment variable is not set
 */
export function getRequiredEnv(key, errorMessage) {
  const value = process.env[key];
  if (!value) {
    throw new Error(errorMessage || `Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get an environment variable as a boolean
 * @param {string} key - Environment variable key
 * @param {boolean} defaultValue - Default value if environment variable is not set
 * @returns {boolean} Boolean value
 */
export function getEnvAsBoolean(key, defaultValue = false) {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Get an environment variable as a number
 * @param {string} key - Environment variable key
 * @param {number} defaultValue - Default value if environment variable is not set or invalid
 * @returns {number} Number value
 */
export function getEnvAsNumber(key, defaultValue = 0) {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Check if environment variable is set (not empty)
 * @param {string} key - Environment variable key
 * @returns {boolean} True if set and not empty
 */
export function isEnvSet(key) {
  const value = process.env[key];
  return value !== undefined && value !== '';
}