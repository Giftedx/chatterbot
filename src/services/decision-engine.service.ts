import type { Message } from 'discord.js';

export type ResponseStrategy = 'quick-reply' | 'deep-reason' | 'defer' | 'ignore';

export interface DecisionContext {
  optedIn: boolean;
  isDM: boolean;
  isPersonalThread: boolean;
  mentionedBot: boolean;
  repliedToBot: boolean;
  lastBotReplyAt?: number;
  recentUserBurstCount?: number;
  channelRecentBurstCount?: number;
  // C1: Enhanced personality-aware context
  personality?: {
    userInteractionPattern?: UserInteractionPattern;
    activePersona?: ConversationPersona;
    relationshipStrength?: number; // 0-1 based on interaction history
    userMood?: 'neutral' | 'frustrated' | 'excited' | 'serious' | 'playful';
    personalityCompatibility?: number; // 0-1 how well user/bot personalities align
  };
}

// C1: Import personality types for decision context
export interface UserInteractionPattern {
  userId: string;
  guildId?: string;
  toolUsageFrequency: Map<string, number>;
  responsePreferences: {
    preferredLength: 'short' | 'medium' | 'detailed';
    communicationStyle: 'formal' | 'casual' | 'technical';
    includeExamples: boolean;
    topicInterests: string[];
  };
  behaviorMetrics: {
    averageSessionLength: number;
    mostActiveTimeOfDay: number; // hour of day (0-23)
    commonQuestionTypes: string[];
    successfulInteractionTypes: string[];
    feedbackScores: number[];
  };
  learningProgress: {
    improvementAreas: string[];
    masteredTopics: string[];
    recommendedNextSteps: string[];
  };
  adaptationHistory: Array<{
    timestamp: Date;
    adaptationType: string;
    reason: string;
    effectivenessScore: number;
  }>;
}

// C1: Simplified ConversationPersona for decision context (extracted from ultra-intelligence)
export interface ConversationPersona {
  id: string;
  name: string;
  personality: {
    formality: number; // 0-1 (casual to formal)
    enthusiasm: number; // 0-1 (reserved to energetic)
    humor: number; // 0-1 (serious to funny)
    supportiveness: number; // 0-1 (neutral to encouraging)
    curiosity: number; // 0-1 (passive to inquisitive)
    directness: number; // 0-1 (diplomatic to blunt)
    empathy: number; // 0-1 (logical to emotional)
    playfulness: number; // 0-1 (serious to playful)
  };
  communicationStyle: {
    messageLength: 'short' | 'medium' | 'long' | 'adaptive';
    useEmojis: number; // 0-1 probability
    useSlang: number; // 0-1 probability
    askQuestions: number; // 0-1 probability
    sharePersonalExperiences: number; // 0-1 probability
    useTypingPhrases: number; // 0-1 probability (like "hmm", "oh", "actually")
    reactionTiming: 'immediate' | 'natural' | 'delayed';
  };
}

export interface DecisionResult {
  shouldRespond: boolean;
  reason: string;
  confidence: number;
  tokenEstimate: number;
  strategy: ResponseStrategy;
}

export interface DecisionEngineOptions {
  cooldownMs?: number;
  maxMentionsAllowed?: number;
  defaultModelTokenLimit?: number;
  ambientThreshold?: number; // minimum score to respond in ambient channels
  shortMessageMinLen?: number; // min characters considered not "too short"
  burstCountThreshold?: number; // number of recent messages to trigger burst penalty
  /** Optional custom token estimator; when provided, overrides internal heuristic */
  tokenEstimator?: (message: Message) => number;
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
  private readonly ambientThreshold: number;
  private readonly shortMessageMinLen: number;
  private readonly burstCountThreshold: number;
  private readonly customTokenEstimator?: (message: Message) => number;

  constructor(opts: DecisionEngineOptions = {}) {
    this.cooldownMs = opts.cooldownMs ?? 8000;
    this.maxMentionsAllowed = opts.maxMentionsAllowed ?? 6;
    this.defaultModelTokenLimit = opts.defaultModelTokenLimit ?? 8000;
    this.ambientThreshold = opts.ambientThreshold ?? 25;
    this.shortMessageMinLen = opts.shortMessageMinLen ?? 3;
    this.burstCountThreshold = opts.burstCountThreshold ?? 3;
    this.customTokenEstimator = opts.tokenEstimator;
  }

  analyze(message: Message, ctx: DecisionContext): DecisionResult {
    // If not opted-in, never respond
    if (!ctx.optedIn) {
      return { shouldRespond: false, reason: 'User not opted-in', confidence: 1, tokenEstimate: this.estimateTokens(message), strategy: 'ignore' };
    }

    const tokenEstimate = this.customTokenEstimator
      ? safeEstimate(this.customTokenEstimator, message, () => this.estimateTokens(message))
      : this.estimateTokens(message);
    const content = message.content || '';

    // Base score
    let score = 0;
    const reasons: string[] = [];

    // Hard exceptions
    if ((message as any)?.mentions?.everyone) {
      score -= 40; reasons.push('mentions-everyone');
    }
    try {
      const userMentions = message.mentions?.users?.size || 0;
      // Include roles and channels to capture mass-mention patterns beyond users
      const roleMentions = (message as any).mentions?.roles?.size || 0;
      const channelMentions = (message as any).mentions?.channels?.size || 0;
      const totalMentions = userMentions + roleMentions + channelMentions;

      if (totalMentions > this.maxMentionsAllowed) {
        score -= 25; reasons.push('too-many-mentions');
      }
    } catch {
      // If mention structures are unavailable, skip without failing
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

    // C1: Personality-aware decision factors
    if (ctx.personality) {
      const personality = ctx.personality;
      
      // Relationship strength influences ambient response threshold
      if (personality.relationshipStrength !== undefined) {
        const relationshipBonus = personality.relationshipStrength * 20; // 0-20 point bonus
        score += relationshipBonus;
        if (relationshipBonus > 10) reasons.push('strong-relationship');
        else if (relationshipBonus > 5) reasons.push('good-relationship');
      }
      
      // User mood affects response probability
      if (personality.userMood) {
        switch (personality.userMood) {
          case 'frustrated':
            score += 15; reasons.push('user-frustrated'); // More likely to help
            break;
          case 'excited':
            score += 10; reasons.push('user-excited'); // Share enthusiasm
            break;
          case 'serious':
            if (ctx.isDM || ctx.mentionedBot || ctx.repliedToBot) {
              score += 5; reasons.push('user-serious'); // Respect serious tone
            } else {
              score -= 5; reasons.push('avoid-serious-ambient'); // Less ambient chatter
            }
            break;
          case 'playful':
            score += 8; reasons.push('user-playful'); // Match playful energy
            break;
        }
      }
      
      // Personality compatibility affects ambient threshold
      if (personality.personalityCompatibility !== undefined) {
        const compatibilityBonus = personality.personalityCompatibility * 15; // 0-15 point bonus
        score += compatibilityBonus;
        if (compatibilityBonus > 10) reasons.push('high-compatibility');
        else if (compatibilityBonus > 5) reasons.push('good-compatibility');
      }
      
      // Active persona influences decision style
      if (personality.activePersona) {
        const persona = personality.activePersona;
        
        // High curiosity personas are more likely to engage with questions
        if (/[?¿]+/.test(content) && persona.personality.curiosity > 0.7) {
          score += 10; reasons.push('curious-persona');
        }
        
        // High supportiveness personas respond more to emotional content
        if (persona.personality.supportiveness > 0.7) {
          if (/help|stuck|problem|issue|confused|lost/i.test(content)) {
            score += 12; reasons.push('supportive-persona');
          }
        }
        
        // High playfulness personas engage with casual/fun content
        if (persona.personality.playfulness > 0.7) {
          if (/lol|haha|funny|joke|meme|😄|😆|🎮|🎉/i.test(content)) {
            score += 8; reasons.push('playful-persona');
          }
        }
        
        // Adjust ambient threshold based on persona directness
        // More direct personas have higher thresholds (less ambient chatter)
        if (!(ctx.isDM || ctx.mentionedBot || ctx.repliedToBot)) {
          const directnessAdjustment = (persona.personality.directness - 0.5) * 10; // -5 to +5
          score -= directnessAdjustment; // More direct = higher threshold
          if (Math.abs(directnessAdjustment) > 3) {
            reasons.push(directnessAdjustment > 0 ? 'direct-persona-threshold' : 'diplomatic-persona-bonus');
          }
        }
      }
      
      // User interaction patterns influence decision
      if (personality.userInteractionPattern) {
        const pattern = personality.userInteractionPattern;
        
        // Users who prefer short responses get priority for concise help
        if (pattern.responsePreferences.preferredLength === 'short' && content.length < 100) {
          score += 5; reasons.push('prefers-short-responses');
        }
        
        // Users with technical communication style get priority for code/technical content
        if (pattern.responsePreferences.communicationStyle === 'technical' && 
            /```|\bcode\b|\bapi\b|\bfunction\b|\berror\b|\bbug\b|\bdebug\b/i.test(content)) {
          score += 8; reasons.push('technical-user');
        }
        
        // High feedback scores indicate good interaction history
        if (pattern.behaviorMetrics.feedbackScores.length > 0) {
          const avgFeedback = pattern.behaviorMetrics.feedbackScores.reduce((a, b) => a + b, 0) / 
                             pattern.behaviorMetrics.feedbackScores.length;
          if (avgFeedback >= 4.0) {
            score += 5; reasons.push('positive-feedback-history');
          } else if (avgFeedback <= 2.0) {
            score -= 5; reasons.push('negative-feedback-history');
          }
        }
      }
    }

    // Light penalty for very short interjections unless directly addressed
    if (content.trim().length < this.shortMessageMinLen && !(ctx.mentionedBot || ctx.repliedToBot || ctx.isDM)) {
      score -= 20; reasons.push('too-short');
    }

    // Cooldown/anti-spam
    if (typeof ctx.lastBotReplyAt === 'number') {
      const since = Date.now() - ctx.lastBotReplyAt;
      if (since < this.cooldownMs) { score -= 30; reasons.push('cooldown'); }
    }
    if ((ctx.recentUserBurstCount || 0) >= this.burstCountThreshold) { score -= 15; reasons.push('user-burst'); }
    // Channel-level busyness penalty to avoid being overly chatty in active channels
    // Don't penalize when directly addressed or in DMs/personal threads
    if (!(ctx.isDM || ctx.mentionedBot || ctx.repliedToBot || ctx.isPersonalThread)) {
      if ((ctx.channelRecentBurstCount || 0) >= this.burstCountThreshold * 2) {
        score -= 20; reasons.push('channel-busy');
      } else if ((ctx.channelRecentBurstCount || 0) >= this.burstCountThreshold) {
        score -= 10; reasons.push('channel-active');
      }
    }

    // Estimate strategy based on token size and personality
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

    // C1: Personality-aware strategy refinement
    if (ctx.personality) {
      const personality = ctx.personality;
      
      // User preferences influence strategy selection
      if (personality.userInteractionPattern) {
        const pattern = personality.userInteractionPattern;
        
        // Users who prefer detailed responses might benefit from deep-reason even for smaller tokens
        if (pattern.responsePreferences.preferredLength === 'detailed' && 
            tokenEstimate > 200 && strategy === 'quick-reply') {
          strategy = 'deep-reason';
          reasons.push('detailed-preference');
        }
        
        // Users who prefer short responses should get quick-reply unless content is very complex
        if (pattern.responsePreferences.preferredLength === 'short' && 
            strategy === 'deep-reason' && tokenEstimate < this.defaultModelTokenLimit * 0.3) {
          strategy = 'quick-reply';
          reasons.push('short-preference');
        }
        
        // Technical users might benefit from deep reasoning for complex technical content
        if (pattern.responsePreferences.communicationStyle === 'technical' &&
            /\b(algorithm|architecture|implementation|optimization|performance|debug|error|exception|trace)\b/i.test(content) &&
            strategy === 'quick-reply') {
          strategy = 'deep-reason';
          reasons.push('technical-complexity');
        }
      }
      
      // Active persona influences strategy selection
      if (personality.activePersona) {
        const persona = personality.activePersona;
        
        // Curious personas lean toward deep-reason for questions
        if (persona.personality.curiosity > 0.7 && /[?¿]+/.test(content) && strategy === 'quick-reply') {
          strategy = 'deep-reason';
          reasons.push('curious-deep-dive');
        }
        
        // Direct personas prefer quick-reply unless complexity demands otherwise
        if (persona.personality.directness > 0.8 && strategy === 'deep-reason' && tokenEstimate < 1000) {
          strategy = 'quick-reply';
          reasons.push('direct-efficiency');
        }
        
        // Supportive personas use deep-reason for help requests
        if (persona.personality.supportiveness > 0.7 && 
            /\b(help|stuck|problem|issue|confused|lost|how\s+to|tutorial|guide)\b/i.test(content) &&
            strategy === 'quick-reply') {
          strategy = 'deep-reason';
          reasons.push('supportive-thorough');
        }
      }
      
      // Relationship strength can influence strategy complexity
      if (personality.relationshipStrength !== undefined && personality.relationshipStrength > 0.8) {
        // Strong relationships might warrant more thoughtful responses
        if (strategy === 'quick-reply' && tokenEstimate > 150 && !content.match(/^(hi|hello|hey|thanks|thx)$/i)) {
          strategy = 'deep-reason';
          reasons.push('relationship-investment');
        }
      }
    }

    // Decision thresholding with personality awareness
    // High-confidence reply when mentioned, replied, or DM, with explicit exceptions
    if (ctx.isDM || ctx.mentionedBot || ctx.repliedToBot) {
      if (reasons.includes('mentions-everyone') || reasons.includes('too-many-mentions')) {
        const conf = clamp01(0.7 + (Math.abs(score) / 200));
        return { shouldRespond: false, reason: reasons.join(','), confidence: conf, tokenEstimate, strategy: 'ignore' };
      }
      
      // C1: Personality-aware confidence adjustment for direct interactions
      let baseConfidence = 0.8;
      if (ctx.personality) {
        // Strong relationships increase confidence
        if (ctx.personality.relationshipStrength && ctx.personality.relationshipStrength > 0.7) {
          baseConfidence += 0.1;
        }
        
        // High compatibility increases confidence
        if (ctx.personality.personalityCompatibility && ctx.personality.personalityCompatibility > 0.7) {
          baseConfidence += 0.05;
        }
        
        // Positive feedback history increases confidence
        if (ctx.personality.userInteractionPattern) {
          const pattern = ctx.personality.userInteractionPattern;
          if (pattern.behaviorMetrics.feedbackScores.length > 0) {
            const avgFeedback = pattern.behaviorMetrics.feedbackScores.reduce((a, b) => a + b, 0) / 
                               pattern.behaviorMetrics.feedbackScores.length;
            if (avgFeedback >= 4.0) {
              baseConfidence += 0.05;
            }
          }
        }
      }
      
      const conf = clamp01(baseConfidence + (score / 200));
      return { shouldRespond: true, reason: reasons.join(','), confidence: conf, tokenEstimate, strategy };
    }

    // C1: Personality-aware ambient threshold adjustment
    let threshold = this.ambientThreshold;
    
    if (ctx.personality) {
      // Strong relationships lower the threshold (more likely to respond)
      if (ctx.personality.relationshipStrength) {
        threshold -= ctx.personality.relationshipStrength * 15; // Up to 15 point reduction
      }
      
      // High compatibility lowers threshold
      if (ctx.personality.personalityCompatibility) {
        threshold -= ctx.personality.personalityCompatibility * 10; // Up to 10 point reduction
      }
      
      // Active persona adjustments
      if (ctx.personality.activePersona) {
        const persona = ctx.personality.activePersona;
        
        // More curious personas have lower thresholds
        threshold -= (persona.personality.curiosity - 0.5) * 10; // -5 to +5 adjustment
        
        // More supportive personas have lower thresholds
        threshold -= (persona.personality.supportiveness - 0.5) * 8; // -4 to +4 adjustment
        
        // More direct personas have higher thresholds (less ambient chatter)
        threshold += (persona.personality.directness - 0.5) * 12; // -6 to +6 adjustment
      }
      
      // User mood affects threshold
      if (ctx.personality.userMood) {
        switch (ctx.personality.userMood) {
          case 'frustrated':
            threshold -= 8; // More likely to help frustrated users
            break;
          case 'excited':
            threshold -= 5; // Share in user excitement
            break;
          case 'serious':
            threshold += 5; // Respect serious mood with less chatter
            break;
          case 'playful':
            threshold -= 3; // Engage with playful users
            break;
        }
      }
    }
    
    // Ensure threshold doesn't go below a minimum to prevent spam
    threshold = Math.max(threshold, 5);
    
    // Otherwise, require score surpassing the personality-adjusted threshold
    const should = score >= threshold;
    let confidence = clamp01(0.5 + (score - threshold) / 100);
    
    // C1: Personality-aware confidence boost for ambient responses
    if (should && ctx.personality) {
      // High relationship or compatibility gives confidence boost
      if ((ctx.personality.relationshipStrength || 0) > 0.6 || 
          (ctx.personality.personalityCompatibility || 0) > 0.6) {
        confidence = Math.min(1.0, confidence + 0.1);
      }
    }
    
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

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function safeEstimate(
  fn: (message: Message) => number,
  message: Message,
  fallback: () => number,
): number {
  try {
    return fn(message);
  } catch {
    return fallback();
  }
}