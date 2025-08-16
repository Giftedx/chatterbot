import type { Message } from 'discord.js';

export type ResponseStrategy = 'quick-reply' | 'deep-reason' | 'defer' | 'ignore';

export interface DecisionContext {
  optedIn: boolean;
  isDM: boolean;
  isPersonalThread: boolean;
  mentionedBot: boolean;
  repliedToBot: boolean;
  lastBotReplyAt?: number; // epoch ms
  recentUserBurstCount?: number; // number of recent messages by same user in a short window
}

export interface DecisionResult {
  shouldRespond: boolean;
  reason: string;
  confidence: number; // 0..1
  tokenEstimate: number; // approx tokens in user content
  strategy: ResponseStrategy;
}

export interface DecisionEngineOptions {
  cooldownMs?: number;
  maxMentionsAllowed?: number;
  defaultModelTokenLimit?: number;
}

/**
 * Token-aware, self-directed decision engine to decide if the bot should respond.
 * - Prioritizes mentions and direct replies to the bot
 * - Handles DMs and personal threads
 * - Applies heuristics for questions, code, and urgency
 * - Applies exceptions for spammy/overly busy messages
 */
export class DecisionEngine {
  private readonly cooldownMs: number;
  private readonly maxMentionsAllowed: number;
  private readonly defaultModelTokenLimit: number;

  constructor(opts: DecisionEngineOptions = {}) {
    this.cooldownMs = opts.cooldownMs ?? 8000;
    this.maxMentionsAllowed = opts.maxMentionsAllowed ?? 6;
    this.defaultModelTokenLimit = opts.defaultModelTokenLimit ?? 8000;
  }

  analyze(message: Message, ctx: DecisionContext): DecisionResult {
    // If not opted-in, never respond
    if (!ctx.optedIn) {
      return { shouldRespond: false, reason: 'User not opted-in', confidence: 1, tokenEstimate: this.estimateTokens(message), strategy: 'ignore' };
    }

    const tokenEstimate = this.estimateTokens(message);
    const content = message.content || '';

    // Base score
    let score = 0;
    const reasons: string[] = [];

    // Hard exceptions
    if (message.mentions.everyone) {
      score -= 40; reasons.push('mentions-everyone');
    }
    if ((message.mentions.users?.size || 0) > this.maxMentionsAllowed) {
      score -= 25; reasons.push('too-many-mentions');
    }

    // Priority defaults
    if (ctx.isDM) { score += 100; reasons.push('dm'); }
    if (ctx.mentionedBot) { score += 95; reasons.push('mention-bot'); }
    if (ctx.repliedToBot) { score += 90; reasons.push('reply-to-bot'); }
    if (ctx.isPersonalThread) { score += 50; reasons.push('personal-thread'); }

    // Heuristics for channel-wide evaluation
    if (/[?¿]+/.test(content)) { score += 25; reasons.push('question'); }
    if (/```|\basync\b|\bclass\b|\bfunction\b|\berror\b|\btraceback\b|\bts\b|\bjs\b/.test(content)) {
      score += 15; reasons.push('code-mention');
    }
    if (/urgent|asap|now|quick/i.test(content)) { score += 10; reasons.push('urgency'); }

    // Light penalty for very short interjections unless directly addressed
    if (content.trim().length < 3 && !(ctx.mentionedBot || ctx.repliedToBot || ctx.isDM)) {
      score -= 20; reasons.push('too-short');
    }

    // Cooldown/anti-spam
    if (typeof ctx.lastBotReplyAt === 'number') {
      const since = Date.now() - ctx.lastBotReplyAt;
      if (since < this.cooldownMs) { score -= 30; reasons.push('cooldown'); }
    }
    if ((ctx.recentUserBurstCount || 0) >= 3) { score -= 15; reasons.push('user-burst'); }

    // Estimate strategy based on token size
    let strategy: ResponseStrategy = 'quick-reply';
    if (tokenEstimate > Math.floor(this.defaultModelTokenLimit * 0.5)) {
      strategy = 'deep-reason';
    } else if (tokenEstimate < 100) {
      strategy = 'quick-reply';
    }
    if (tokenEstimate > this.defaultModelTokenLimit * 0.9) {
      // Likely too big; defer for safety (or we will chunk downstream)
      strategy = 'defer';
    }

    // Decision thresholding
    // High-confidence reply when mentioned, replied, or DM, with explicit exceptions
    if (ctx.isDM || ctx.mentionedBot || ctx.repliedToBot) {
      if (reasons.includes('mentions-everyone') || reasons.includes('too-many-mentions')) {
        const conf = clamp01(0.7 + (Math.abs(score) / 200));
        return { shouldRespond: false, reason: reasons.join(','), confidence: conf, tokenEstimate, strategy: 'ignore' };
      }
      const conf = clamp01(0.8 + (score / 200));
      return { shouldRespond: true, reason: reasons.join(','), confidence: conf, tokenEstimate, strategy };
    }

    // Otherwise, require score surpassing a threshold to avoid chattiness
    const threshold = 25; // tweaked to be helpful but not intrusive
    const should = score >= threshold;
    const confidence = clamp01(0.5 + (score - threshold) / 100);
    return { shouldRespond: should, reason: reasons.join(','), confidence, tokenEstimate, strategy: should ? strategy : 'ignore' };
  }

  private estimateTokens(message: Message): number {
    const text = message.content || '';
    // Basic heuristic: ~4 chars per token
    let tokens = Math.ceil(text.length / 4);
    // Add budget for attachments/embeds
    try {
      tokens += (message.attachments?.size || 0) * 256;
    } catch {}
    return tokens;
  }
}

function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }
