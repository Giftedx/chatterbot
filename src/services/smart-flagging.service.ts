/**
 * Smart Flagging Service
 * Detects responses that need human review or might be hallucinating
 */

import { knowledgeBaseService } from './knowledge-base.service.js';
import { logger } from '../utils/logger.js';

export interface FlaggingResult {
  shouldFlag: boolean;
  confidence: number;
  reasons: string[];
  riskLevel: 'low' | 'medium' | 'high';
  suggestedAction: 'allow' | 'review' | 'escalate' | 'block';
}

export interface ResponseAnalysis {
  query: string;
  response: string;
  channelId?: string;
  userId?: string;
  context?: {
    previousMessages?: string[];
    userRole?: string;
    channelType?: string;
  };
}

export class SmartFlaggingService {
  private static instance: SmartFlaggingService;

  private constructor() {}

  static getInstance(): SmartFlaggingService {
    if (!SmartFlaggingService.instance) {
      SmartFlaggingService.instance = new SmartFlaggingService();
    }
    return SmartFlaggingService.instance;
  }

  /**
   * Analyze a response and determine if it should be flagged
   */
  async analyzeResponse(analysis: ResponseAnalysis): Promise<FlaggingResult> {
    const reasons: string[] = [];
    let confidence = 0;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Check 1: Knowledge grounding
    const hasGroundedKnowledge = await knowledgeBaseService.hasGroundedKnowledge(
      analysis.query,
      0.6
    );

    if (!hasGroundedKnowledge) {
      reasons.push('No grounded knowledge found for query');
      confidence += 0.3;
      riskLevel = 'medium';
    }

    // Check 2: Response confidence indicators
    const confidenceIndicators = this.analyzeConfidenceIndicators(analysis.response);
    if (confidenceIndicators.lowConfidence) {
      reasons.push('Response contains low confidence indicators');
      confidence += 0.2;
    }

    if (confidenceIndicators.uncertainty) {
      reasons.push('Response expresses uncertainty');
      confidence += 0.15;
    }

    // Check 3: Content safety
    const safetyCheck = this.checkContentSafety(analysis.response);
    if (safetyCheck.unsafe) {
      reasons.push('Response contains potentially unsafe content');
      confidence += 0.4;
      riskLevel = 'high';
    }

    // Check 4: Response quality
    const qualityCheck = this.checkResponseQuality(analysis.response);
    if (qualityCheck.poorQuality) {
      reasons.push('Response quality is poor');
      confidence += 0.25;
    }

    // Check 5: Context appropriateness
    const contextCheck = this.checkContextAppropriateness(analysis);
    if (!contextCheck.appropriate) {
      reasons.push('Response may not be appropriate for context');
      confidence += 0.2;
    }

    // Determine suggested action
    const suggestedAction = this.determineAction(confidence, riskLevel, reasons);

    // Normalize confidence to 0-1 range
    confidence = Math.min(1, confidence);

    return {
      shouldFlag: confidence > 0.3,
      confidence,
      reasons,
      riskLevel,
      suggestedAction
    };
  }

  /**
   * Analyze confidence indicators in response
   */
  private analyzeConfidenceIndicators(response: string): {
    lowConfidence: boolean;
    uncertainty: boolean;
  } {
    const lowConfidencePhrases = [
      'i think',
      'i believe',
      'maybe',
      'possibly',
      'perhaps',
      'i\'m not sure',
      'i don\'t know',
      'i can\'t say for certain',
      'it might be',
      'it could be'
    ];

    const uncertaintyPhrases = [
      'i\'m not entirely sure',
      'i don\'t have enough information',
      'i can\'t provide a definitive answer',
      'this is beyond my knowledge',
      'i would need more context'
    ];

    const responseLower = response.toLowerCase();
    
    const lowConfidence = lowConfidencePhrases.some(phrase => 
      responseLower.includes(phrase)
    );

    const uncertainty = uncertaintyPhrases.some(phrase => 
      responseLower.includes(phrase)
    );

    return { lowConfidence, uncertainty };
  }

  /**
   * Check content safety
   */
  private checkContentSafety(response: string): {
    unsafe: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const responseLower = response.toLowerCase();

    // Check for potentially harmful content
    const harmfulPatterns = [
      /personal information|private data|password|credit card/gi,
      /illegal|unlawful|criminal/gi,
      /harmful|dangerous|unsafe/gi,
      /discriminatory|racist|sexist/gi
    ];

    harmfulPatterns.forEach(pattern => {
      if (pattern.test(response)) {
        issues.push('Potentially harmful content detected');
      }
    });

    return {
      unsafe: issues.length > 0,
      issues
    };
  }

  /**
   * Check response quality
   */
  private checkResponseQuality(response: string): {
    poorQuality: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check for very short responses
    if (response.length < 10) {
      issues.push('Response too short');
    }

    // Check for repetitive content
    const words = response.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;
    
    if (repetitionRatio < 0.3) {
      issues.push('Response contains repetitive content');
    }

    // Check for nonsensical patterns
    const nonsensicalPatterns = [
      /[A-Z]{5,}/, // All caps words
      /[!]{3,}/,   // Multiple exclamation marks
      /[?]{3,}/    // Multiple question marks
    ];

    nonsensicalPatterns.forEach(pattern => {
      if (pattern.test(response)) {
        issues.push('Response contains nonsensical patterns');
      }
    });

    return {
      poorQuality: issues.length > 0,
      issues
    };
  }

  /**
   * Check if response is appropriate for context
   */
  private checkContextAppropriateness(analysis: ResponseAnalysis): {
    appropriate: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check channel type appropriateness
    if (analysis.context?.channelType === 'moderation' && 
        analysis.response.toLowerCase().includes('funny') || 
        analysis.response.toLowerCase().includes('joke')) {
      issues.push('Inappropriate tone for moderation channel');
    }

    // Check user role appropriateness
    if (analysis.context?.userRole === 'admin' && 
        analysis.response.toLowerCase().includes('i can\'t help')) {
      issues.push('Inappropriate response for admin user');
    }

    return {
      appropriate: issues.length === 0,
      issues
    };
  }

  /**
   * Determine suggested action based on analysis
   */
  private determineAction(
    confidence: number, 
    riskLevel: 'low' | 'medium' | 'high',
    reasons: string[]
  ): 'allow' | 'review' | 'escalate' | 'block' {
    
    if (riskLevel === 'high') {
      return 'block';
    }

    if (confidence > 0.7) {
      return 'escalate';
    }

    if (confidence > 0.4) {
      return 'review';
    }

    return 'allow';
  }

  /**
   * Log flagging decision for analytics
   */
  async logFlaggingDecision(
    analysis: ResponseAnalysis,
    result: FlaggingResult
  ): Promise<void> {
    try {
      logger.info('Smart flagging decision', {
        query: analysis.query.substring(0, 100),
        channelId: analysis.channelId,
        userId: analysis.userId,
        shouldFlag: result.shouldFlag,
        confidence: result.confidence,
        riskLevel: result.riskLevel,
        suggestedAction: result.suggestedAction,
        reasons: result.reasons
      });
    } catch (error) {
      logger.error('Failed to log flagging decision', error);
    }
  }

  /**
   * Get flagging statistics
   */
  async getFlaggingStats(): Promise<{
    totalAnalyzed: number;
    flaggedCount: number;
    flagRate: number;
    byRiskLevel: Record<string, number>;
    byAction: Record<string, number>;
  }> {
    // This would typically query a database
    // For now, return mock data
    return {
      totalAnalyzed: 0,
      flaggedCount: 0,
      flagRate: 0,
      byRiskLevel: {},
      byAction: {}
    };
  }
}

// Export singleton instance
export const smartFlaggingService = SmartFlaggingService.getInstance(); 