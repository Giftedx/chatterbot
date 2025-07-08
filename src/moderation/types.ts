/**
 * Advanced Moderation System Types
 * Comprehensive type definitions for the moderation system
 */

export interface SafetyVerdict {
  safe: boolean;
  reason?: string;
  confidence?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  categories?: string[];
}

export interface ModerationConfig {
  guildId: string;
  strictnessLevel: 'low' | 'medium' | 'high';
  enabledFeatures: ('text' | 'image' | 'attachment')[];
  logChannelId?: string;
  autoDeleteUnsafe: boolean;
  customKeywords?: string[];
}

export interface ModerationIncident {
  id?: number;
  guildId: string;
  userId: string;
  type: 'text' | 'image' | 'attachment';
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'blocked' | 'warned' | 'logged';
  reason?: string;
  contentHash?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

export interface TextModerationOptions {
  useMLAPI?: boolean;
  customKeywords?: string[];
  strictnessLevel?: 'low' | 'medium' | 'high';
}

export interface ImageModerationOptions {
  useCloudVision?: boolean;
  safeSearchLevel?: 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  checkNSFW?: boolean;
}

export interface ModerationResult {
  verdict: SafetyVerdict;
  incident?: ModerationIncident;
  action: 'allow' | 'warn' | 'block';
}

export interface MLTextModerationResponse {
  results: Array<{
    categories: Record<string, boolean>;
    category_scores: Record<string, number>;
    flagged: boolean;
  }>;
}

export interface CloudVisionSafeSearchResponse {
  safeSearchAnnotation: {
    adult: string;
    spoof: string;
    medical: string;
    violence: string;
    racy: string;
  };
}

export const SEVERITY_THRESHOLDS = {
  low: { text: 0.3, image: 0.2 },
  medium: { text: 0.5, image: 0.4 },
  high: { text: 0.7, image: 0.6 }
} as const;

export const DEFAULT_MODERATION_CONFIG: Omit<ModerationConfig, 'guildId'> = {
  strictnessLevel: 'medium',
  enabledFeatures: ['text', 'image'],
  autoDeleteUnsafe: true,
  customKeywords: []
};
