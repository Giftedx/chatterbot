/**
 * Legacy text moderation filter for backward compatibility.
 * For new implementations, use AdvancedTextModeration instead.
 */

export interface SafetyVerdict {
  safe: boolean;
  reason?: string;
}

const bannedWords = [
  /\b(?:hate|kill|terror)\b/i,
  /\b(?:nazi|racist)\b/i,
];

export function checkTextSafety(text: string): SafetyVerdict {
  for (const pattern of bannedWords) {
    if (pattern.test(text)) {
      return { safe: false, reason: 'Detected unsafe content' };
    }
  }
  return { safe: true };
}

// Re-export the advanced moderation for new usage
export { checkTextSafety as checkTextSafetyAdvanced } from './advanced-text-moderation.js';
