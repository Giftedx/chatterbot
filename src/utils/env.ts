/**
 * Environment utilities for safe environment variable access
 * Provides functions for getting optional and required environment variables
 */

/**
 * Get an optional environment variable with a default value
 */
export function getOptionalEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Get a required environment variable, throw if not set
 */
export function getRequiredEnv(key: string, errorMessage?: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(errorMessage || `Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get an environment variable as a boolean
 */
export function getEnvAsBoolean(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Get an environment variable as a number
 */
export function getEnvAsNumber(key: string, defaultValue: number = 0): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get an environment variable as a string with optional default
 */
export function getEnvAsString(key: string): string | undefined;
export function getEnvAsString(key: string, defaultValue: string): string;
export function getEnvAsString(key: string, defaultValue?: string): string | undefined {
  const value = process.env[key];
  if (defaultValue !== undefined) {
    return value ?? defaultValue;
  }
  return value;
}

/**
 * Check if environment variable is set (not empty)
 */
export function isEnvSet(key: string): boolean {
  const value = process.env[key];
  return value !== undefined && value !== '';
}