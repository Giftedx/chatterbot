// Central feature flags. Defaults are OFF for safety.
import { isTruthy } from '../utils/env.js';

export interface FeatureFlags {
  temporal: boolean;
  vercelAI: boolean;
  pgvector: boolean;
}

export const features: FeatureFlags = {
  temporal: isTruthy(process.env.FEATURE_TEMPORAL),
  vercelAI: isTruthy(process.env.FEATURE_VERCEL_AI),
  pgvector: isTruthy(process.env.FEATURE_PGVECTOR),
};