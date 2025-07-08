/**
 * Advanced Text Moderation Service
 * Implements ML-based text safety checking with external API integration
 */

import { createHash } from 'crypto';
import { logger } from '../utils/logger';
import {
  SafetyVerdict,
  TextModerationOptions,
  MLTextModerationResponse,
  SEVERITY_THRESHOLDS
} from './types.js';

// Enhanced keyword patterns for different categories
const KEYWORD_PATTERNS = {
  hate: [
    /\b(?:hate|nazi|racist|kill|terror|genocide)\b/i,
    /\b(?:supremacist|extremist|radical)\b/i
  ],
  harassment: [
    /\b(?:kys|kill\s*yourself|go\s*die)\b/i,
    /\b(?:bully|harass|stalk)\b/i
  ],
  spam: [
    /(.)\1{10,}/i, // Character repetition
    /(https?:\/\/[^\s]+.*){3,}/i // Multiple URLs
  ],
  violence: [
    /\b(?:bomb|explode|murder|assassinate)\b/i,
    /\b(?:torture|massacre|slaughter)\b/i
  ]
};

/**
 * Enhanced text safety checker with ML integration
 */
export class AdvancedTextModeration {
  private readonly openaiApiKey?: string;
  private readonly useOpenAI: boolean;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.useOpenAI = Boolean(this.openaiApiKey);
    
    if (!this.useOpenAI) {
      logger.warn('OpenAI API key not found, using keyword-only text moderation');
    }
  }

  /**
   * Check text safety with comprehensive moderation
   */
  async checkTextSafety(
    text: string,
    options: TextModerationOptions = {}
  ): Promise<SafetyVerdict> {
    try {
      const {
        useMLAPI = this.useOpenAI,
        customKeywords = [],
        strictnessLevel = 'medium'
      } = options;

      // First pass: Quick keyword check
      const keywordResult = this.checkKeywords(text, customKeywords, strictnessLevel);
      if (!keywordResult.safe) {
        logger.info('Text blocked by keyword filter', {
          operation: 'text-moderation',
          metadata: { 
            reason: keywordResult.reason,
            severity: keywordResult.severity 
          }
        });
        return keywordResult;
      }

      // Second pass: ML API if enabled and available
      if (useMLAPI && this.useOpenAI) {
        const mlResult = await this.checkWithOpenAI(text, strictnessLevel);
        if (!mlResult.safe) {
          logger.info('Text blocked by ML API', {
            operation: 'text-moderation',
            metadata: { 
              reason: mlResult.reason,
              confidence: mlResult.confidence,
              severity: mlResult.severity 
            }
          });
          return mlResult;
        }
      }

      // Content appears safe
      return { safe: true, confidence: 0.95 };

    } catch (error) {
      logger.error('Text moderation error', {
        operation: 'text-moderation',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Fail open with warning for availability
      return {
        safe: true,
        reason: 'Moderation service unavailable',
        confidence: 0.5
      };
    }
  }

  /**
   * Enhanced keyword-based filtering
   */
  private checkKeywords(
    text: string,
    customKeywords: string[],
    strictnessLevel: 'low' | 'medium' | 'high'
  ): SafetyVerdict {
    // Create custom patterns
    const customPatterns = customKeywords.map(keyword => 
      new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    );

    // Check default patterns based on strictness
    const categoriesToCheck = strictnessLevel === 'low' 
      ? ['hate', 'violence']
      : strictnessLevel === 'medium'
      ? ['hate', 'violence', 'harassment']
      : Object.keys(KEYWORD_PATTERNS); // All categories for high strictness

    for (const category of categoriesToCheck) {
      const patterns = KEYWORD_PATTERNS[category as keyof typeof KEYWORD_PATTERNS];
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return {
            safe: false,
            reason: `Detected ${category} content: keyword filter match`,
            confidence: 0.9,
            severity: this.categorizeSeverity(category),
            categories: [category]
          };
        }
      }
    }

    // Check custom keywords for medium and high strictness
    if (strictnessLevel !== 'low') {
      for (const pattern of customPatterns) {
        if (pattern.test(text)) {
          return {
            safe: false,
            reason: 'Matched custom keyword filter',
            confidence: 0.8,
            severity: 'medium',
            categories: ['custom']
          };
        }
      }
    }

    return { safe: true, confidence: 0.95 };
  }

  /**
   * OpenAI Moderation API integration
   */
  private async checkWithOpenAI(
    text: string,
    strictnessLevel: 'low' | 'medium' | 'high'
  ): Promise<SafetyVerdict> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input: text })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json() as MLTextModerationResponse;
    const result = data.results[0];

    if (!result.flagged) {
      return { safe: true, confidence: 0.95 };
    }

    // Analyze flagged categories and scores
    const flaggedCategories = Object.entries(result.categories)
      .filter(([, flagged]) => flagged)
      .map(([category]) => category);

    const maxScore = Math.max(...Object.values(result.category_scores));
    const threshold = SEVERITY_THRESHOLDS[strictnessLevel].text;

    if (maxScore < threshold) {
      return { safe: true, confidence: 1 - maxScore };
    }

    return {
      safe: false,
      reason: `AI detected unsafe content: ${flaggedCategories.join(', ')}`,
      confidence: maxScore,
      severity: this.scoresToSeverity(maxScore),
      categories: flaggedCategories
    };
  }

  /**
   * Map category to severity level
   */
  private categorizeSeverity(category: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (category) {
      case 'hate':
      case 'violence':
        return 'critical';
      case 'harassment':
        return 'high';
      case 'spam':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Convert confidence scores to severity
   */
  private scoresToSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.9) return 'critical';
    if (score >= 0.7) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Generate content hash for privacy
   */
  static hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }
}

// Export singleton instance and legacy function for backward compatibility
export const advancedTextModeration = new AdvancedTextModeration();

export async function checkTextSafety(
  text: string,
  options?: TextModerationOptions
): Promise<SafetyVerdict> {
  return advancedTextModeration.checkTextSafety(text, options);
}

// Legacy export for backward compatibility
export { checkTextSafety as checkTextSafetyLegacy };
