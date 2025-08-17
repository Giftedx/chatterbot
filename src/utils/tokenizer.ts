/**
 * Tokenizer utilities
 * Uses gpt-tokenizer for precise token counting when available; falls back heuristically.
 */
import { createRequire } from 'module';
const requireCjs = createRequire(import.meta.url);

/**
 * Count tokens for a given text using the specified encoding.
 * Defaults to cl100k_base which matches many OpenAI chat models.
 */
export function countTokens(text: string, encoding: string = process.env.TOKENIZER_ENCODING || 'cl100k_base'): number {
  try {
    if (!text) return 0;
    try {
      // Attempt dynamic require to avoid hard dependency at compile time
      const tok = requireCjs('gpt-tokenizer');
      const enc = (tok && (tok.encode || tok.default?.encode)) as (t: string, e?: string) => number[];
      if (typeof enc === 'function') {
        const tokens = enc(text, encoding as any);
        return Array.isArray(tokens) ? tokens.length : 0;
      }
    } catch {}
    // Fallback
    return Math.ceil((text || '').length / 4);
  } catch {
    // Fallback: rough heuristic ~4 chars per token
    return Math.ceil((text || '').length / 4);
  }
}

/**
 * Approximate tokens for arrays of messages by concatenating with simple role markers.
 */
export function countTokensForMessages(messages: Array<{ role: string; content: string }>, encoding?: string): number {
  try {
    const text = messages
      .map((m) => `[${m.role}] ${m.content}`)
      .join('\n');
    return countTokens(text, encoding);
  } catch {
    return Math.ceil(messages.map((m) => m.content || '').join(' ').length / 4);
  }
}
