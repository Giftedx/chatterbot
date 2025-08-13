// CONSTITUTIONAL AI AND AI SAFETY FRAMEWORK
// Implements advanced AI safety measures with constitutional principles
// Based on Anthropic's Constitutional AI research and 2025 safety standards

import { EventEmitter } from 'events';
import { getEnvAsString, getEnvAsBoolean } from '../../utils/env.js';

interface ConstitutionalPrinciple {
  id: string;
  name: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'safety' | 'ethics' | 'accuracy' | 'helpfulness' | 'privacy';
  rule: string;
  examples: {
    positive: string[];
    negative: string[];
  };
  violation_consequence: 'block' | 'modify' | 'warn' | 'log';
}

interface SafetyAssessment {
  overall_safety_score: number;
  principle_violations: Array<{
    principle_id: string;
    violation_severity: 'critical' | 'high' | 'medium' | 'low';
    confidence: number;
    explanation: string;
    suggested_modification?: string;
  }>;
  content_analysis: {
    toxicity_score: number;
    bias_indicators: string[];
    privacy_risks: string[];
    misinformation_likelihood: number;
    harmful_content_categories: string[];
  };
  recommendation: 'approve' | 'modify' | 'reject';
  safe_alternative?: string;
}

interface ConstitutionalResponse {
  original_response: string;
  constitutional_response: string;
  safety_assessment: SafetyAssessment;
  modifications_made: Array<{
    type: string;
    reason: string;
    principle_applied: string;
  }>;
  review_required: boolean;
  processing_time_ms: number;
}

export class ConstitutionalAIService extends EventEmitter {
  private isInitialized = false;
  private principles: Map<string, ConstitutionalPrinciple> = new Map();
  private violationHistory: Array<{
    timestamp: Date;
    principle_id: string;
    severity: string;
    content_hash: string;
    action_taken: string;
  }> = [];

  private safetyThresholds = {
    toxicity_max: 0.3,
    bias_max: 0.4,
    misinformation_max: 0.2,
    privacy_risk_max: 0.1,
    overall_safety_min: 0.7
  };

  constructor() {
    super();
    this.initializeConstitutionalPrinciples();
  }

  private initializeConstitutionalPrinciples(): void {
    // Core Safety Principles
    this.principles.set('no_harm', {
      id: 'no_harm',
      name: 'No Harm Principle',
      description: 'Avoid generating content that could cause physical, emotional, or psychological harm',
      priority: 'critical',
      category: 'safety',
      rule: 'Do not provide information that could be used to harm oneself or others',
      examples: {
        positive: [
          'I can help you find mental health resources if you\'re struggling.',
          'Here are some safe cooking techniques for beginners.'
        ],
        negative: [
          'Instructions for making dangerous substances',
          'Encouragement of self-harm or violence'
        ]
      },
      violation_consequence: 'block'
    });

    this.principles.set('truthfulness', {
      id: 'truthfulness',
      name: 'Truthfulness and Accuracy',
      description: 'Provide accurate, factual information and acknowledge uncertainty',
      priority: 'critical',
      category: 'accuracy',
      rule: 'Always strive for factual accuracy and acknowledge when information is uncertain',
      examples: {
        positive: [
          'Based on current research, this appears to be the case, though more studies are needed.',
          'I don\'t have enough information to answer that definitively.'
        ],
        negative: [
          'Making definitive claims about uncertain topics',
          'Spreading misinformation or conspiracy theories'
        ]
      },
      violation_consequence: 'modify'
    });

    this.principles.set('privacy_protection', {
      id: 'privacy_protection',
      name: 'Privacy Protection',
      description: 'Protect personal information and respect privacy rights',
      priority: 'critical',
      category: 'privacy',
      rule: 'Never share, request, or help identify personal information',
      examples: {
        positive: [
          'I can\'t help identify specific individuals from photos.',
          'I\'d recommend using privacy-focused alternatives for sensitive data.'
        ],
        negative: [
          'Attempting to identify people from images',
          'Sharing personal information about individuals'
        ]
      },
      violation_consequence: 'block'
    });

    this.principles.set('bias_mitigation', {
      id: 'bias_mitigation',
      name: 'Bias Mitigation',
      description: 'Avoid perpetuating harmful stereotypes and biases',
      priority: 'high',
      category: 'ethics',
      rule: 'Treat all groups fairly and avoid reinforcing harmful stereotypes',
      examples: {
        positive: [
          'People of all backgrounds can excel in STEM fields.',
          'Leadership qualities can be found across all demographics.'
        ],
        negative: [
          'Stereotypical assumptions about groups',
          'Biased language that discriminates'
        ]
      },
      violation_consequence: 'modify'
    });

    this.principles.set('helpful_assistance', {
      id: 'helpful_assistance',
      name: 'Helpful Assistance',
      description: 'Provide genuinely helpful and constructive responses',
      priority: 'high',
      category: 'helpfulness',
      rule: 'Focus on being genuinely helpful while maintaining safety and accuracy',
      examples: {
        positive: [
          'Here are several approaches you could try...',
          'Let me break this down into manageable steps.'
        ],
        negative: [
          'Deliberately unhelpful or dismissive responses',
          'Refusing to help with legitimate requests'
        ]
      },
      violation_consequence: 'modify'
    });

    this.principles.set('transparency', {
      id: 'transparency',
      name: 'Transparency and Honesty',
      description: 'Be transparent about capabilities, limitations, and uncertainty',
      priority: 'medium',
      category: 'ethics',
      rule: 'Clearly communicate limitations and acknowledge when uncertain',
      examples: {
        positive: [
          'I\'m an AI assistant, so I may not have the latest information.',
          'This is my best assessment based on available data, but you may want to verify.'
        ],
        negative: [
          'Pretending to have capabilities I don\'t have',
          'Being deceptive about my nature as an AI'
        ]
      },
      violation_consequence: 'modify'
    });

    this.principles.set('respect_autonomy', {
      id: 'respect_autonomy',
      name: 'Respect User Autonomy',
      description: 'Respect user decision-making and avoid manipulation',
      priority: 'high',
      category: 'ethics',
      rule: 'Support informed decision-making without manipulation or coercion',
      examples: {
        positive: [
          'Here are the pros and cons to consider...',
          'The decision is ultimately yours to make.'
        ],
        negative: [
          'Manipulative persuasion techniques',
          'Pressuring users into specific decisions'
        ]
      },
      violation_consequence: 'modify'
    });
  }

  async init(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      console.log('🛡️ Initializing Constitutional AI and Safety Framework...');
      
      // Validate all constitutional principles
      for (const [id, principle] of this.principles) {
        if (!this.validatePrinciple(principle)) {
          console.warn(`⚠️ Invalid principle configuration: ${id}`);
          this.principles.delete(id);
        }
      }

      this.isInitialized = true;
      console.log(`✅ Constitutional AI initialized with ${this.principles.size} principles`);
      
      this.emit('initialized', { 
        principle_count: this.principles.size,
        safety_thresholds: this.safetyThresholds 
      });
      
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize Constitutional AI:', error);
      return false;
    }
  }

  private validatePrinciple(principle: ConstitutionalPrinciple): boolean {
    const hasRequiredStrings =
      typeof principle.id === 'string' && principle.id.length > 0 &&
      typeof principle.name === 'string' && principle.name.length > 0 &&
      typeof principle.description === 'string' && principle.description.length > 0 &&
      typeof principle.rule === 'string' && principle.rule.length > 0;

    const hasExamples =
      Array.isArray(principle.examples?.positive) && principle.examples.positive.length > 0 &&
      Array.isArray(principle.examples?.negative) && principle.examples.negative.length > 0;

    const validPriority = ['critical', 'high', 'medium', 'low'].includes(principle.priority);
    const validCategory = ['safety', 'ethics', 'accuracy', 'helpfulness', 'privacy'].includes(principle.category);
    const validConsequence = ['block', 'modify', 'warn', 'log'].includes(principle.violation_consequence);

    return Boolean(hasRequiredStrings && hasExamples && validPriority && validCategory && validConsequence);
  }

  async assessSafety(content: string, context: Record<string, unknown> = {}): Promise<SafetyAssessment> {
    try {
      // Analyze content against constitutional principles
      const principleViolations = await this.analyzePrincipleViolations(content, context);
      
      // Perform content analysis
      const contentAnalysis = await this.analyzeContent(content);
      
      // Calculate overall safety score
      const overallSafetyScore = this.calculateOverallSafetyScore(principleViolations, contentAnalysis);
      
      // Determine recommendation
      const recommendation = this.determineRecommendation(overallSafetyScore, principleViolations);
      
      // Generate safe alternative if needed
      const safeAlternative = recommendation === 'reject' ? 
        await this.generateSafeAlternative(content, principleViolations) : undefined;

      const assessment: SafetyAssessment = {
        overall_safety_score: overallSafetyScore,
        principle_violations: principleViolations,
        content_analysis: contentAnalysis,
        recommendation,
        safe_alternative: safeAlternative
      };

      // Log violations for monitoring
      principleViolations.forEach(violation => {
        this.logViolation(violation.principle_id, violation.violation_severity, content);
      });

      this.emit('safety_assessment_completed', {
        safety_score: overallSafetyScore,
        violations_count: principleViolations.length,
        recommendation
      });

      return assessment;

    } catch (error) {
      console.error('❌ Safety assessment failed:', error);
      throw error;
    }
  }

  private async analyzePrincipleViolations(
    content: string, 
    context: Record<string, unknown>
  ): Promise<SafetyAssessment['principle_violations']> {
    const violations: SafetyAssessment['principle_violations'] = [];

    for (const [id, principle] of this.principles) {
      const violation = await this.checkPrincipleViolation(content, principle, context);
      if (violation) {
        violations.push(violation);
      }
    }

    return violations;
  }

  private async checkPrincipleViolation(
    content: string,
    principle: ConstitutionalPrinciple,
    context: Record<string, unknown>
  ): Promise<SafetyAssessment['principle_violations'][0] | null> {
    // Simple pattern-based detection (in production, would use specialized models)
    const contentLower = content.toLowerCase();
    
    let violationDetected = false;
    let violationSeverity: 'critical' | 'high' | 'medium' | 'low' = 'low';
    let explanation = '';
    let confidence = 0;

    switch (principle.id) {
      case 'no_harm':
        const harmPatterns = [
          /\b(kill|murder|suicide|self-harm|violence|attack|bomb|weapon)\b/,
          /\b(hurt|harm|injure|damage|destroy)\b.*\b(people|person|someone|yourself)\b/
        ];
        violationDetected = harmPatterns.some(pattern => pattern.test(contentLower));
        if (violationDetected) {
          violationSeverity = 'critical';
          explanation = 'Content contains language that could promote harm or violence';
          confidence = 0.8;
        }
        break;

      case 'privacy_protection':
        const privacyPatterns = [
          /\b(\d{3}-\d{2}-\d{4})\b/, // SSN pattern
          /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/, // Email
          /\b(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/ // Credit card pattern
        ];
        violationDetected = privacyPatterns.some(pattern => pattern.test(content));
        if (violationDetected) {
          violationSeverity = 'critical';
          explanation = 'Content appears to contain personally identifiable information';
          confidence = 0.9;
        }
        break;

      case 'bias_mitigation':
        const biasPatterns = [
          /\b(all|most|typical)\s+(women|men|blacks|whites|asians|hispanics|muslims|christians|jews)\s+(are|do|have|like)\b/,
          /\b(naturally|innately|genetically)\s+(better|worse|superior|inferior)\b/
        ];
        violationDetected = biasPatterns.some(pattern => pattern.test(contentLower));
        if (violationDetected) {
          violationSeverity = 'high';
          explanation = 'Content may contain biased generalizations about groups';
          confidence = 0.7;
        }
        break;

      case 'truthfulness':
        const misinformationPatterns = [
          /\b(definitely|certainly|absolutely|proven)\s+(false|fake|hoax|conspiracy)\b/,
          /\bvaccines?\s+(cause|create|lead to)\s+(autism|death|harm)\b/,
          /\bclimate change\s+(is|isn't|not)\s+(real|happening|true|false)\b/
        ];
        violationDetected = misinformationPatterns.some(pattern => pattern.test(contentLower));
        if (violationDetected) {
          violationSeverity = 'high';
          explanation = 'Content may contain potential misinformation';
          confidence = 0.6;
        }
        break;

      default:
        // General toxicity check
        const toxicPatterns = [
          /\b(hate|stupid|idiot|moron|worthless|pathetic)\b/,
          /\bf[u*]ck|sh[i*]t|d[a*]mn|b[i*]tch\b/
        ];
        violationDetected = toxicPatterns.some(pattern => pattern.test(contentLower));
        if (violationDetected) {
          violationSeverity = 'medium';
          explanation = 'Content contains potentially offensive language';
          confidence = 0.5;
        }
        break;
    }

    if (violationDetected) {
      return {
        principle_id: principle.id,
        violation_severity: violationSeverity,
        confidence,
        explanation,
        suggested_modification: await this.generateSuggestion(content, principle)
      };
    }

    return null;
  }

  private async analyzeContent(content: string): Promise<SafetyAssessment['content_analysis']> {
    // Simplified content analysis (in production, would use specialized models)
    const contentLower = content.toLowerCase();
    
    // Toxicity scoring
    const toxicWords = ['hate', 'kill', 'stupid', 'idiot', 'worthless', 'pathetic'];
    const toxicWordCount = toxicWords.filter(word => contentLower.includes(word)).length;
    const toxicityScore = Math.min(1, toxicWordCount / 3); // Normalize to 0-1

    // Bias indicators
    const biasIndicators: string[] = [];
    const biasPatterns = {
      'gender_bias': /\b(all\s+women|all\s+men|typical\s+female|typical\s+male)\b/,
      'racial_bias': /\b(all\s+(blacks|whites|asians|hispanics))\b/,
      'religious_bias': /\b(all\s+(muslims|christians|jews|atheists))\b/
    };
    
    Object.entries(biasPatterns).forEach(([bias, pattern]) => {
      if (pattern.test(contentLower)) {
        biasIndicators.push(bias);
      }
    });

    // Privacy risks
    const privacyRisks: string[] = [];
    if (/\b\d{3}-\d{2}-\d{4}\b/.test(content)) privacyRisks.push('ssn_pattern');
    if (/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/.test(content)) privacyRisks.push('email_address');
    if (/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(content)) privacyRisks.push('credit_card_pattern');

    // Misinformation likelihood
    const misinfoPatterns = [
      /vaccine.*autism/,
      /5g.*coronavirus/,
      /climate.*hoax/,
      /election.*stolen/
    ];
    const misinfoScore = misinfoPatterns.filter(pattern => pattern.test(contentLower)).length / misinfoPatterns.length;

    // Harmful content categories
    const harmfulCategories: string[] = [];
    if (/\b(suicide|self-harm|cutting)\b/.test(contentLower)) harmfulCategories.push('self_harm');
    if (/\b(violence|attack|kill|murder)\b/.test(contentLower)) harmfulCategories.push('violence');
    if (/\b(drug|cocaine|heroin|meth)\b/.test(contentLower)) harmfulCategories.push('substance_abuse');
    if (/\b(hack|crack|steal|fraud)\b/.test(contentLower)) harmfulCategories.push('illegal_activity');

    return {
      toxicity_score: toxicityScore,
      bias_indicators: biasIndicators,
      privacy_risks: privacyRisks,
      misinformation_likelihood: misinfoScore,
      harmful_content_categories: harmfulCategories
    };
  }

  private calculateOverallSafetyScore(
    violations: SafetyAssessment['principle_violations'],
    contentAnalysis: SafetyAssessment['content_analysis']
  ): number {
    // Start with base score of 1.0 (completely safe)
    let safetyScore = 1.0;

    // Deduct points for principle violations
    violations.forEach(violation => {
      const severityMultiplier = {
        'critical': 0.4,
        'high': 0.2,
        'medium': 0.1,
        'low': 0.05
      };
      safetyScore -= severityMultiplier[violation.violation_severity] * violation.confidence;
    });

    // Deduct points for content analysis issues
    safetyScore -= contentAnalysis.toxicity_score * 0.3;
    safetyScore -= contentAnalysis.bias_indicators.length * 0.1;
    safetyScore -= contentAnalysis.privacy_risks.length * 0.2;
    safetyScore -= contentAnalysis.misinformation_likelihood * 0.25;
    safetyScore -= contentAnalysis.harmful_content_categories.length * 0.15;

    return Math.max(0, safetyScore);
  }

  private determineRecommendation(
    safetyScore: number,
    violations: SafetyAssessment['principle_violations']
  ): 'approve' | 'modify' | 'reject' {
    // Check for critical violations that require blocking
    const criticalViolations = violations.filter(v => 
      v.violation_severity === 'critical' && v.confidence >= 0.7
    );
    
    if (criticalViolations.length > 0) {
      return 'reject';
    }

    // Check overall safety score
    if (safetyScore >= this.safetyThresholds.overall_safety_min) {
      return 'approve';
    } else if (safetyScore >= 0.4) {
      return 'modify';
    } else {
      return 'reject';
    }
  }

  private async generateSuggestion(content: string, principle: ConstitutionalPrinciple): Promise<string> {
    // Generate contextual suggestions based on the principle violated
    switch (principle.id) {
      case 'no_harm':
        return 'Consider rephrasing to avoid language that could promote harm or violence. Focus on constructive alternatives.';
      
      case 'privacy_protection':
        return 'Remove any personal information such as names, addresses, phone numbers, or other identifying details.';
      
      case 'bias_mitigation':
        return 'Avoid generalizations about groups. Use inclusive language and acknowledge diversity within all communities.';
      
      case 'truthfulness':
        return 'Add qualifiers for uncertain information and provide sources where possible. Acknowledge limitations in knowledge.';
      
      default:
        return 'Review content to ensure it aligns with safety and ethical guidelines.';
    }
  }

  private async generateSafeAlternative(
    originalContent: string,
    violations: SafetyAssessment['principle_violations']
  ): Promise<string> {
    // Generate a safe alternative based on the violations found
    let alternative = originalContent;

    // Apply modifications based on violation types
    violations.forEach(violation => {
      const principle = this.principles.get(violation.principle_id);
      if (principle) {
        switch (violation.principle_id) {
          case 'no_harm':
            alternative = 'I understand you may be going through a difficult time. If you need support, please consider reaching out to a mental health professional or crisis helpline.';
            break;
          
          case 'privacy_protection':
            alternative = alternative.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED]')
                                   .replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, '[EMAIL REDACTED]');
            break;
          
          case 'bias_mitigation':
            alternative = 'People from all backgrounds have diverse capabilities and characteristics. Individual differences are more significant than group generalizations.';
            break;
          
          case 'truthfulness':
            alternative = 'I don\'t have enough reliable information to make definitive claims about this topic. I\'d recommend consulting authoritative sources for accurate information.';
            break;
        }
      }
    });

    return alternative;
  }

  async applyConstitutionalFiltering(
    originalResponse: string,
    context: Record<string, unknown> = {}
  ): Promise<ConstitutionalResponse> {
    const startTime = Date.now();

    try {
      // Assess safety of the original response
      const safetyAssessment = await this.assessSafety(originalResponse, context);
      
      let constitutionalResponse = originalResponse;
      const modificationseMade: ConstitutionalResponse['modifications_made'] = [];
      let reviewRequired = false;

      // Apply modifications based on safety assessment
      if (safetyAssessment.recommendation === 'modify') {
        constitutionalResponse = await this.modifyContent(originalResponse, safetyAssessment);
        
        // Track modifications
        safetyAssessment.principle_violations.forEach(violation => {
          modificationseMade.push({
            type: 'principle_violation_fix',
            reason: violation.explanation,
            principle_applied: violation.principle_id
          });
        });
        
        reviewRequired = safetyAssessment.principle_violations.some(v => v.violation_severity === 'critical');
        
      } else if (safetyAssessment.recommendation === 'reject') {
        constitutionalResponse = safetyAssessment.safe_alternative || 
          'I apologize, but I cannot provide a response to that request as it may violate safety guidelines.';
        
        modificationseMade.push({
          type: 'content_blocked',
          reason: 'Content flagged as potentially unsafe',
          principle_applied: 'safety_override'
        });
        
        reviewRequired = true;
      }

      const processingTime = Date.now() - startTime;

      const result: ConstitutionalResponse = {
        original_response: originalResponse,
        constitutional_response: constitutionalResponse,
        safety_assessment: safetyAssessment,
        modifications_made: modificationseMade,
        review_required: reviewRequired,
        processing_time_ms: processingTime
      };

      this.emit('constitutional_filtering_completed', {
        modifications_count: modificationseMade.length,
        safety_score: safetyAssessment.overall_safety_score,
        review_required: reviewRequired
      });

      return result;

    } catch (error) {
      console.error('❌ Constitutional filtering failed:', error);
      throw error;
    }
  }

  private async modifyContent(
    content: string,
    safetyAssessment: SafetyAssessment
  ): Promise<string> {
    let modifiedContent = content;

    // Apply modifications for each violation
    for (const violation of safetyAssessment.principle_violations) {
      const principle = this.principles.get(violation.principle_id);
      if (principle && violation.suggested_modification) {
        // Apply specific modifications based on principle type
        modifiedContent = await this.applyPrincipleModification(modifiedContent, principle, violation);
      }
    }

    return modifiedContent;
  }

  private async applyPrincipleModification(
    content: string,
    principle: ConstitutionalPrinciple,
    violation: SafetyAssessment['principle_violations'][0]
  ): Promise<string> {
    // Apply principle-specific modifications
    switch (principle.id) {
      case 'no_harm':
        return content.replace(/\b(kill|murder|harm|hurt|attack)\b/gi, '[REDACTED]') +
               '\n\n[Note: Response modified to remove potentially harmful content]';
      
      case 'privacy_protection':
        return content.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN REDACTED]')
                     .replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, '[EMAIL REDACTED]');
      
      case 'bias_mitigation':
        return content + '\n\n[Note: It\'s important to remember that individuals vary greatly regardless of group membership]';
      
      case 'truthfulness':
        return content + '\n\n[Note: This information should be verified with authoritative sources]';
      
      default:
        return content + '\n\n[Note: Response reviewed for safety compliance]';
    }
  }

  private logViolation(
    principleId: string,
    severity: string,
    content: string
  ): void {
    const contentHash = this.hashContent(content);
    
    this.violationHistory.push({
      timestamp: new Date(),
      principle_id: principleId,
      severity,
      content_hash: contentHash,
      action_taken: this.principles.get(principleId)?.violation_consequence || 'log'
    });

    // Keep only recent violations (last 1000)
    if (this.violationHistory.length > 1000) {
      this.violationHistory = this.violationHistory.slice(-1000);
    }
  }

  private hashContent(content: string): string {
    // Simple hash for privacy (don't store actual content)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  async updateSafetyThresholds(newThresholds: Partial<typeof this.safetyThresholds>): Promise<void> {
    this.safetyThresholds = { ...this.safetyThresholds, ...newThresholds };
    console.log('⚙️ Updated safety thresholds:', this.safetyThresholds);
    this.emit('thresholds_updated', this.safetyThresholds);
  }

  async addPrinciple(principle: ConstitutionalPrinciple): Promise<boolean> {
    try {
      if (!this.validatePrinciple(principle)) {
        throw new Error('Invalid principle configuration');
      }

      this.principles.set(principle.id, principle);
      console.log(`✅ Added constitutional principle: ${principle.name}`);
      
      this.emit('principle_added', { principle_id: principle.id, principle_name: principle.name });
      return true;

    } catch (error) {
      console.error('❌ Failed to add principle:', error);
      return false;
    }
  }

  getMetrics(): {
    total_principles: number;
    violation_history_count: number;
    safety_thresholds: { toxicity_max: number; bias_max: number; misinformation_max: number; privacy_risk_max: number; overall_safety_min: number };
    violation_distribution: Record<string, number>;
    recent_violations: number;
  } {
    const violationDistribution: Record<string, number> = {};
    this.violationHistory.forEach(violation => {
      violationDistribution[violation.principle_id] = 
        (violationDistribution[violation.principle_id] || 0) + 1;
    });

    const recentViolations = this.violationHistory.filter(
      v => Date.now() - v.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    ).length;

    return {
      total_principles: this.principles.size,
      violation_history_count: this.violationHistory.length,
      safety_thresholds: this.safetyThresholds,
      violation_distribution: violationDistribution,
      recent_violations: recentViolations
    };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    principle_count: number;
    recent_violation_rate: number;
    safety_coverage: number;
  }> {
    const metrics = this.getMetrics();
    const recentViolationRate = metrics.recent_violations / Math.max(1, metrics.violation_history_count);
    const safetyCoverage = this.principles.size / 7; // Expected 7 core principles

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (safetyCoverage >= 0.9 && recentViolationRate <= 0.1) {
      status = 'healthy';
    } else if (safetyCoverage >= 0.7 && recentViolationRate <= 0.2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      principle_count: this.principles.size,
      recent_violation_rate: recentViolationRate,
      safety_coverage: safetyCoverage
    };
  }

  async shutdown(): Promise<void> {
    try {
      console.log('🔌 Shutting down Constitutional AI service...');
      this.principles.clear();
      this.violationHistory = [];
      this.isInitialized = false;
      this.emit('shutdown');
      console.log('✅ Constitutional AI service shutdown complete');
    } catch (error) {
      console.error('❌ Error during Constitutional AI shutdown:', error);
    }
  }
}

export const constitutionalAIService = new ConstitutionalAIService();