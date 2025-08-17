/**
 * Advanced Intent Detection System
 * 
 * Provides comprehensive intent classification for intelligent routing
 * to appropriate AI capabilities and services.
 */

import { logger } from '../utils/logger.js';

export interface IntentClassification {
  primary: string;
  secondary: string[];
  confidence: number;
  category: IntentCategory;
  subCategory?: string;
  reasoning: string[];
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  complexity: 'simple' | 'moderate' | 'complex' | 'expert';
}

export type IntentCategory = 
  | 'conversational'    // Greetings, small talk, casual interaction
  | 'informational'     // Questions, fact-finding, explanations
  | 'analytical'        // Analysis, comparison, evaluation
  | 'creative'          // Content creation, brainstorming, design
  | 'technical'         // Coding, debugging, technical problems
  | 'procedural'        // Step-by-step guides, how-to questions
  | 'administrative'    // Bot management, settings, moderation
  | 'multimodal'        // Image/file analysis, generation
  | 'memory'            // Remembering, recalling, context
  | 'meta';             // Questions about the bot itself

export interface IntentPattern {
  intent: string;
  category: IntentCategory;
  subCategory?: string;
  patterns: RegExp[];
  keywords: string[];
  contextClues: string[];
  urgencyIndicators?: string[];
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'expert';
  requiredCapabilities: string[];
  confidence: number;
}

/**
 * Advanced Intent Detection Service
 * Uses pattern matching, ML-style feature extraction, and contextual analysis
 */
export class AdvancedIntentDetectionService {
  private intentPatterns: IntentPattern[] = [];

  constructor() {
    this.initializeIntentPatterns();
    logger.info('Advanced Intent Detection Service initialized');
  }

  /**
   * Classify intent with advanced analysis
   */
  public async classifyIntent(
    message: string,
    context?: {
      hasAttachments?: boolean;
      attachmentTypes?: string[];
      hasUrls?: boolean;
      userHistory?: string[];
      channelContext?: string;
      threadContext?: string;
    }
  ): Promise<IntentClassification> {
    
    const cleanMessage = message.trim().toLowerCase();
    const words = this.tokenizeMessage(cleanMessage);
    const features = this.extractFeatures(cleanMessage, words, context);
    
    // Score all patterns
    const scores = this.intentPatterns.map(pattern => ({
      pattern,
      score: this.scorePattern(pattern, cleanMessage, words, features, context)
    }));

    // Sort by score and get top matches
    scores.sort((a, b) => b.score - a.score);
    const topMatch = scores[0];
    const secondaryMatches = scores
      .slice(1, 4)
      .filter(s => s.score > 0.3)
      .map(s => s.pattern.intent);

    // Determine urgency and complexity
    const urgency = this.assessUrgency(cleanMessage, features);
    const complexity = this.assessComplexity(cleanMessage, features, context);

    // Build reasoning
    const reasoning = this.buildReasoning(topMatch, features, context);

    return {
      primary: topMatch.pattern.intent,
      secondary: secondaryMatches,
      confidence: Math.min(topMatch.score, 1.0),
      category: topMatch.pattern.category,
      subCategory: topMatch.pattern.subCategory,
      reasoning,
      urgency,
      complexity
    };
  }

  /**
   * Initialize comprehensive intent patterns
   */
  private initializeIntentPatterns(): void {
    this.intentPatterns = [
      // Conversational Intents
      {
        intent: 'greeting',
        category: 'conversational',
        patterns: [
          /^(hi|hello|hey|greetings|good (morning|afternoon|evening))/,
          /^(what's up|how are you|how's it going)/,
          /hello there/i
        ],
        keywords: ['hello', 'hi', 'hey', 'greetings', 'good', 'morning', 'afternoon', 'evening'],
        contextClues: [],
        complexityLevel: 'simple',
        requiredCapabilities: ['conversation'],
        confidence: 0.95
      },

      {
        intent: 'farewell',
        category: 'conversational',
        patterns: [
          /(bye|goodbye|see you|talk to you later|good night)/,
          /(thanks|thank you).*(bye|goodbye)/,
          /thanks.*help.*goodbye/i
        ],
        keywords: ['bye', 'goodbye', 'see', 'you', 'later', 'good', 'night', 'thanks', 'thank'],
        contextClues: [],
        complexityLevel: 'simple',
        requiredCapabilities: ['conversation'],
        confidence: 0.95
      },

      // Informational Intents
      {
        intent: 'question',
        category: 'informational',
        patterns: [
          /^(what|when|where|who|why|how)\b/,
          /\bwhat is\b|\bwho is\b|\bwhen is\b/,
          /\?$/,
          /can you.*\?/,
          /what.*\?/
        ],
        keywords: ['what', 'when', 'where', 'who', 'why', 'how', 'explain', 'can', 'you'],
        contextClues: ['?'],
        complexityLevel: 'moderate',
        requiredCapabilities: ['knowledge', 'reasoning'],
        confidence: 0.85
      },

      {
        intent: 'definition',
        category: 'informational',
        subCategory: 'explanation',
        patterns: [
          /what is (a |an |the )?(.+)/,
          /define (.+)/,
          /explain (.+)/,
          /tell me about (.+)/
        ],
        keywords: ['define', 'definition', 'explain', 'what', 'is', 'tell', 'me', 'about'],
        contextClues: [],
        complexityLevel: 'moderate',
        requiredCapabilities: ['knowledge', 'explanation'],
        confidence: 0.90
      },

      // Technical Intents
      {
        intent: 'coding_help',
        category: 'technical',
        subCategory: 'programming',
        patterns: [
          /(help|debug|fix).*(code|program|script|function)/,
          /(error|bug|issue|problem).*(code|programming)/,
          /how to (code|program|implement|write)/,
          /help.*debug.*function/i,
          /debug.*function.*error/i
        ],
        keywords: ['help', 'debug', 'fix', 'code', 'program', 'error', 'bug', 'function', 'script'],
        contextClues: ['```', 'function', 'class', 'var', 'let', 'const'],
        complexityLevel: 'complex',
        requiredCapabilities: ['coding', 'debugging', 'reasoning'],
        confidence: 0.95
      },

      {
        intent: 'code_review',
        category: 'technical',
        subCategory: 'analysis',
        patterns: [
          /(review|analyze|check).*(code|script|implementation)/,
          /is this (code|implementation) (good|correct|right)/,
          /improve.*(code|implementation)/,
          /review.*code.*implementation/i
        ],
        keywords: ['review', 'analyze', 'improve', 'optimize', 'best', 'practice', 'code', 'implementation'],
        contextClues: ['```', 'function', 'class'],
        complexityLevel: 'expert',
        requiredCapabilities: ['coding', 'analysis', 'best_practices'],
        confidence: 0.90
      },

      // Creative Intents
      {
        intent: 'content_creation',
        category: 'creative',
        patterns: [
          /(write|create|generate|make).*(story|article|content|post)/,
          /(help me|can you) write/,
          /brainstorm.*(ideas|concepts)/
        ],
        keywords: ['write', 'create', 'generate', 'story', 'article', 'brainstorm'],
        contextClues: [],
        complexityLevel: 'complex',
        requiredCapabilities: ['creativity', 'writing', 'reasoning'],
        confidence: 0.8
      },

      // Analytical Intents
      {
        intent: 'analysis',
        category: 'analytical',
        patterns: [
          /(analyze|examine|evaluate|assess)/,
          /compare.*(with|to|vs)/,
          /(pros and cons|advantages and disadvantages)/,
          /analyze.*pros.*cons/i
        ],
        keywords: ['analyze', 'compare', 'evaluate', 'assess', 'pros', 'cons', 'advantages', 'disadvantages'],
        contextClues: ['vs', 'versus', 'compared', 'to'],
        complexityLevel: 'complex',
        requiredCapabilities: ['analysis', 'reasoning', 'comparison'],
        confidence: 0.90
      },

      // Multimodal Intents
      {
        intent: 'image_analysis',
        category: 'multimodal',
        subCategory: 'visual',
        patterns: [
          /(analyze|describe|explain).*(image|picture|photo)/,
          /what (is|does).*(image|picture) show/,
          /tell me about.*(image|picture)/,
          /analyze.*image/i
        ],
        keywords: ['image', 'picture', 'photo', 'analyze', 'describe'],
        contextClues: [],
        complexityLevel: 'complex',
        requiredCapabilities: ['multimodal', 'vision', 'analysis'],
        confidence: 0.95
      },

      {
        intent: 'image_generation',
        category: 'multimodal',
        subCategory: 'creation',
        patterns: [
          /(create|generate|make|draw).*(image|picture|art|logo)/,
          /image of/,
          /(design|create) (a |an )?(.+)/
        ],
        keywords: ['create', 'generate', 'draw', 'image', 'picture', 'design'],
        contextClues: ['image', 'of', 'picture', 'of'],
        complexityLevel: 'complex',
        requiredCapabilities: ['image_generation', 'creativity'],
        confidence: 0.85
      },

      // Administrative Intents
      {
        intent: 'bot_management',
        category: 'administrative',
        patterns: [
          /(configure|setup|settings)/,
          /(enable|disable|turn on|turn off)/,
          /bot (help|commands|features)/
        ],
        keywords: ['configure', 'settings', 'enable', 'disable', 'commands'],
        contextClues: [],
        urgencyIndicators: ['urgent', 'asap', 'immediately'],
        complexityLevel: 'moderate',
        requiredCapabilities: ['admin', 'configuration'],
        confidence: 0.8
      },

      // Memory Intents
      {
        intent: 'memory_recall',
        category: 'memory',
        patterns: [
          /(remember|recall|mentioned|said)/,
          /what (did|have) (i|we|you) (say|mention)/,
          /(earlier|before|previously)/,
          /what.*mentioned.*earlier/i,
          /mention.*earlier.*project/i
        ],
        keywords: ['remember', 'recall', 'mentioned', 'earlier', 'before', 'said', 'previously'],
        contextClues: [],
        complexityLevel: 'moderate',
        requiredCapabilities: ['memory', 'context'],
        confidence: 0.90
      },

      // Meta Intents
      {
        intent: 'capability_inquiry',
        category: 'meta',
        patterns: [
          /what can you (do|help)/,
          /(can you|are you able)/,
          /your (capabilities|features|abilities)/,
          /what.*can.*help.*with/i
        ],
        keywords: ['capabilities', 'features', 'can', 'you', 'help', 'able', 'to', 'what'],
        contextClues: [],
        complexityLevel: 'simple',
        requiredCapabilities: ['meta', 'explanation'],
        confidence: 0.90
      }
    ];

    logger.debug(`Initialized ${this.intentPatterns.length} intent patterns`);
  }

  /**
   * Tokenize message into meaningful units
   */
  private tokenizeMessage(message: string): string[] {
    return message
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  /**
   * Extract advanced features from message
   */
  private extractFeatures(
    message: string,
    words: string[],
    context?: any
  ): any {
    return {
      length: message.length,
      wordCount: words.length,
      hasQuestionMark: message.includes('?'),
      hasExclamation: message.includes('!'),
      hasCodeBlock: message.includes('```'),
      hasUrl: /https?:\/\//.test(message),
      hasNumbers: /\d/.test(message),
      hasCapitals: /[A-Z]/.test(message),
      startsWithQuestion: /^(what|when|where|who|why|how)\b/i.test(message),
      hasUrgencyWords: /(urgent|asap|quickly|immediately|now)/i.test(message),
      hasPoliteWords: /(please|thank|thanks)/i.test(message),
      hasAttachments: context?.hasAttachments || false,
      attachmentTypes: context?.attachmentTypes || [],
      hasImages: context?.attachmentTypes?.some((t: string) => t.startsWith('image/')) || false
    };
  }

  /**
   * Score pattern match against message
   */
  private scorePattern(
    pattern: IntentPattern,
    message: string,
    words: string[],
    features: any,
    context?: any
  ): number {
    let score = 0;

    // Pattern matching (50% of score) - most important
    let patternScore = 0;
    for (const regex of pattern.patterns) {
      if (regex.test(message)) {
        patternScore = 1.0; // Full match if any pattern matches
        break;
      }
    }
    score += 0.5 * patternScore;

    // Keyword matching (30% of score)
    const keywordMatches = pattern.keywords.filter(k => 
      words.includes(k.toLowerCase()) || message.toLowerCase().includes(k.toLowerCase())
    ).length;
    if (pattern.keywords.length > 0) {
      score += 0.3 * Math.min(keywordMatches / pattern.keywords.length * 2, 1); // Double weight, but cap at 1
    }

    // Context clues (10% of score)
    if (pattern.contextClues.length > 0) {
      const contextMatches = pattern.contextClues.filter(c => message.includes(c)).length;
      if (contextMatches > 0) {
        score += 0.1 * (contextMatches / pattern.contextClues.length);
      }
    }

    // Feature alignment bonus (10% of score)
    let featureBonus = 0;
    if (pattern.intent === 'image_analysis' && (features.hasImages || features.hasAttachments)) featureBonus += 0.1;
    if (pattern.intent === 'coding_help' && features.hasCodeBlock) featureBonus += 0.1;
    if (pattern.category === 'informational' && features.hasQuestionMark) featureBonus += 0.05;
    if (pattern.category === 'conversational' && message.length < 50) featureBonus += 0.05;
    if (pattern.category === 'technical' && (features.hasCodeBlock || /\b(function|class|method|code|debug)\b/i.test(message))) featureBonus += 0.1;
    
    score += Math.min(featureBonus, 0.1);

    // Apply pattern confidence multiplier
    return Math.min(score * pattern.confidence, 1.0);
  }

  /**
   * Assess message urgency
   */
  private assessUrgency(message: string, features: any): IntentClassification['urgency'] {
    if (features.hasUrgencyWords) return 'urgent';
    if (features.hasExclamation) return 'high';
    if (features.hasQuestionMark) return 'normal';
    return 'low';
  }

  /**
   * Assess message complexity
   */
  private assessComplexity(
    message: string,
    features: any,
    context?: any
  ): IntentClassification['complexity'] {
    let complexityScore = 0;
    
    // Length indicators
    if (features.length > 500) complexityScore += 2;
    else if (features.length > 200) complexityScore += 1;
    
    // Content indicators
    if (features.hasCodeBlock) complexityScore += 2;
    if (features.hasAttachments) complexityScore += 1;
    if (features.hasUrl) complexityScore += 1;
    if (features.wordCount > 100) complexityScore += 1;
    
    // Pattern indicators
    if (/(analyze|compare|evaluate|complex|advanced|detailed)/i.test(message)) complexityScore += 2;
    if (/(step by step|how to|explain|because|therefore)/i.test(message)) complexityScore += 1;
    
    if (complexityScore >= 6) return 'expert';
    if (complexityScore >= 4) return 'complex';
    if (complexityScore >= 2) return 'moderate';
    return 'simple';
  }

  /**
   * Build reasoning for classification
   */
  private buildReasoning(
    topMatch: { pattern: IntentPattern; score: number },
    features: any,
    context?: any
  ): string[] {
    const reasoning = [];
    
    reasoning.push(`Primary intent: ${topMatch.pattern.intent} (confidence: ${topMatch.score.toFixed(2)})`);
    reasoning.push(`Category: ${topMatch.pattern.category}`);
    
    if (features.hasQuestionMark) reasoning.push('Contains question indicator');
    if (features.hasCodeBlock) reasoning.push('Contains code block');
    if (features.hasAttachments) reasoning.push('Has file attachments');
    if (features.hasUrgencyWords) reasoning.push('Contains urgency indicators');
    
    return reasoning;
  }

  /**
   * Get intent statistics
   */
  public getStats(): {
    totalPatterns: number;
    categoryCounts: Record<IntentCategory, number>;
    complexityDistribution: Record<string, number>;
  } {
    const categoryCounts = {} as Record<IntentCategory, number>;
    const complexityDistribution = {} as Record<string, number>;

    this.intentPatterns.forEach(pattern => {
      categoryCounts[pattern.category] = (categoryCounts[pattern.category] || 0) + 1;
      complexityDistribution[pattern.complexityLevel] = 
        (complexityDistribution[pattern.complexityLevel] || 0) + 1;
    });

    return {
      totalPatterns: this.intentPatterns.length,
      categoryCounts,
      complexityDistribution
    };
  }
}

// Export singleton instance
export const advancedIntentDetectionService = new AdvancedIntentDetectionService();