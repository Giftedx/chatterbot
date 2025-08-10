/**
 * Smart Recommendation Service
 * Provides intelligent, personalized recommendations for tools, actions,
 * and learning paths based on user behavior and preferences
 */

import { UserBehaviorAnalyticsService, UserBehaviorSummary } from './behavior-analytics.service.js';
import { PersonalizedRecommendation } from './personalization-engine.service.js';
import { logger } from '../../utils/logger.js';
import { PerformanceMonitor } from '../../utils/resilience.js';

export interface RecommendationContext {
  userId: string;
  guildId?: string;
  currentMessage?: string;
  conversationHistory?: string[];
  activeTools?: string[];
  userExpertise?: string;
  timeOfDay?: number;
  sessionLength?: number;
}

export interface SmartRecommendation extends PersonalizedRecommendation {
  relevanceScore: number;
  timeSensitive: boolean;
  prerequisites?: string[];
  estimatedTime: string;
  successLikelihood: number;
  learningValue: number;
}

export interface RecommendationEngine {
  name: string;
  description: string;
  weight: number;
  generateRecommendations(
    context: RecommendationContext, 
    behaviorSummary?: UserBehaviorSummary
  ): Promise<SmartRecommendation[]>;
}

/**
 * Intelligent recommendation system that provides personalized suggestions
 * for tools, workflows, and learning paths
 */
export class SmartRecommendationService {
  private behaviorAnalytics: UserBehaviorAnalyticsService;
  private recommendationEngines: RecommendationEngine[];
  private recommendationHistory = new Map<string, SmartRecommendation[]>();
  private readonly maxHistoryPerUser = 100;

  constructor() {
    this.behaviorAnalytics = new UserBehaviorAnalyticsService();
    this.recommendationEngines = this.initializeRecommendationEngines();
  }

  /**
   * Generate comprehensive smart recommendations for a user
   */
  async generateSmartRecommendations(
    context: RecommendationContext,
    maxRecommendations: number = 10
  ): Promise<SmartRecommendation[]> {
    try {
      return await PerformanceMonitor.monitor('smart-recommendations-generate', async () => {
        // Get user behavior summary for personalization
        const behaviorSummary = await this.behaviorAnalytics.generateBehaviorSummary(
          context.userId, 
          context.guildId
        );

        const allRecommendations: SmartRecommendation[] = [];

        // Generate recommendations from all engines
        for (const engine of this.recommendationEngines) {
          try {
            const engineRecommendations = await engine.generateRecommendations(context, behaviorSummary || undefined);
            
            // Apply engine weight to recommendations
            const weightedRecommendations = engineRecommendations.map(rec => ({
              ...rec,
              relevanceScore: rec.relevanceScore * engine.weight
            }));

            allRecommendations.push(...weightedRecommendations);

          } catch (error) {
            logger.warn('Recommendation engine failed', {
              operation: 'smart-recommendations-engine',
              metadata: { 
                engine: engine.name, 
                userId: context.userId,
                error: String(error) 
              }
            });
          }
        }

        // Sort and filter recommendations
        const filteredRecommendations = this.filterAndRankRecommendations(
          allRecommendations, 
          context,
          maxRecommendations
        );

        // Store in history for learning
        this.storeRecommendationHistory(context.userId, filteredRecommendations);

        logger.info('Smart recommendations generated', {
          operation: 'smart-recommendations-generate',
          metadata: {
            userId: context.userId,
            recommendationCount: filteredRecommendations.length,
            engines: this.recommendationEngines.length
          }
        });

        return filteredRecommendations;

      }, { userId: context.userId, engines: this.recommendationEngines.length });

    } catch (error) {
      logger.error('Failed to generate smart recommendations', {
        operation: 'smart-recommendations-generate',
        metadata: { userId: context.userId, error: String(error) }
      });
      return [];
    }
  }

  /**
   * Get contextual tool recommendations based on current conversation
   */
  async getContextualToolRecommendations(
    context: RecommendationContext
  ): Promise<SmartRecommendation[]> {
    try {
      const toolEngine = this.recommendationEngines.find(e => e.name === 'contextual-tools');
      if (!toolEngine) return [];

      const behaviorSummary = await this.behaviorAnalytics.generateBehaviorSummary(
        context.userId, 
        context.guildId
      );

      return await toolEngine.generateRecommendations(context, behaviorSummary || undefined);

    } catch (error) {
      logger.error('Failed to get contextual tool recommendations', {
        operation: 'smart-recommendations-contextual',
        metadata: { userId: context.userId, error: String(error) }
      });
      return [];
    }
  }

  /**
   * Get personalized learning path recommendations
   */
  async getLearningPathRecommendations(
    context: RecommendationContext
  ): Promise<SmartRecommendation[]> {
    try {
      const learningEngine = this.recommendationEngines.find(e => e.name === 'learning-path');
      if (!learningEngine) return [];

      const behaviorSummary = await this.behaviorAnalytics.generateBehaviorSummary(
        context.userId, 
        context.guildId
      );

      return await learningEngine.generateRecommendations(context, behaviorSummary || undefined);

    } catch (error) {
      logger.error('Failed to get learning path recommendations', {
        operation: 'smart-recommendations-learning',
        metadata: { userId: context.userId, error: String(error) }
      });
      return [];
    }
  }

  /**
   * Record recommendation feedback for learning
   */
  async recordRecommendationFeedback(
    userId: string,
    recommendationId: string,
    feedback: {
      followed: boolean;
      helpful: boolean;
      rating: number; // 1-5 scale
      comments?: string;
    }
  ): Promise<void> {
    try {
      await PerformanceMonitor.monitor('smart-recommendations-feedback', async () => {
        // Store feedback for recommendation improvement
        logger.info('Recommendation feedback recorded', {
          operation: 'smart-recommendations-feedback',
          metadata: {
            userId,
            recommendationId,
            followed: feedback.followed,
            helpful: feedback.helpful,
            rating: feedback.rating
          }
        });

        // Update recommendation engine weights based on feedback
        await this.updateRecommendationEngineWeights(feedback);

      }, { userId, rating: feedback.rating });

    } catch (error) {
      logger.error('Failed to record recommendation feedback', {
        operation: 'smart-recommendations-feedback',
        metadata: { userId, error: String(error) }
      });
    }
  }

  /**
   * Initialize recommendation engines
   */
  private initializeRecommendationEngines(): RecommendationEngine[] {
    return [
      {
        name: 'contextual-tools',
        description: 'Recommends tools based on conversation context',
        weight: 1.0,
        generateRecommendations: this.generateContextualToolRecommendations.bind(this)
      },
      {
        name: 'behavioral-patterns',
        description: 'Recommends based on user behavior patterns',
        weight: 0.8,
        generateRecommendations: async (context: RecommendationContext, behaviorSummary?: UserBehaviorSummary) => {
          return await this.generateBehavioralRecommendations(behaviorSummary);
        }
      },
      {
        name: 'learning-path',
        description: 'Recommends learning progression steps',
        weight: 0.9,
        generateRecommendations: this.generateLearningRecommendations.bind(this)
      },
      {
        name: 'efficiency-optimizer',
        description: 'Recommends workflow optimizations',
        weight: 0.7,
        generateRecommendations: this.generateEfficiencyRecommendations.bind(this)
      },
      {
        name: 'discovery-engine',
        description: 'Recommends new features and capabilities',
        weight: 0.6,
        generateRecommendations: this.generateDiscoveryRecommendations.bind(this)
      }
    ];
  }

  /**
   * Generate contextual tool recommendations
   */
  private async generateContextualToolRecommendations(
    context: RecommendationContext
  ): Promise<SmartRecommendation[]> {
    const recommendations: SmartRecommendation[] = [];
    const message = context.currentMessage?.toLowerCase() || '';

    // Analyze message content for tool recommendations
    if (message.includes('search') || message.includes('find')) {
      recommendations.push({
        type: 'tool',
        priority: 'high',
        title: 'Use Web Search Tool',
        description: 'Get real-time information from the web',
        actionableSteps: ['Ask me to search the web for current information'],
        expectedBenefit: 'Access to up-to-date information',
        confidenceScore: 0.9,
        basedOn: ['Message content analysis'],
        relevanceScore: 0.95,
        timeSensitive: true,
        estimatedTime: '30 seconds',
        successLikelihood: 0.9,
        learningValue: 0.7
      });
    }

    if (message.includes('code') || message.includes('programming')) {
      recommendations.push({
        type: 'tool',
        priority: 'high',
        title: 'Code Analysis Tools',
        description: 'Get detailed code analysis and suggestions',
        actionableSteps: ['Share your code for detailed analysis'],
        expectedBenefit: 'Improved code quality and debugging',
        confidenceScore: 0.85,
        basedOn: ['Programming context detected'],
        relevanceScore: 0.9,
        timeSensitive: false,
        estimatedTime: '2 minutes',
        successLikelihood: 0.85,
        learningValue: 0.9
      });
    }

    if (message.includes('remember') || message.includes('save')) {
      recommendations.push({
        type: 'tool',
        priority: 'medium',
        title: 'Memory System',
        description: 'Store information for future conversations',
        actionableSteps: ['Ask me to remember important information'],
        expectedBenefit: 'Persistent knowledge across sessions',
        confidenceScore: 0.8,
        basedOn: ['Memory keywords detected'],
        relevanceScore: 0.8,
        timeSensitive: false,
        estimatedTime: '1 minute',
        successLikelihood: 0.8,
        learningValue: 0.6
      });
    }

    return recommendations;
  }

  /**
   * Generate behavioral pattern recommendations
   */
  private async generateBehavioralRecommendations(
    behaviorSummary?: UserBehaviorSummary
  ): Promise<SmartRecommendation[]> {
    const recommendations: SmartRecommendation[] = [];

    if (!behaviorSummary) return recommendations;

    // Recommend underused but potentially valuable tools
    const mostUsedTools = behaviorSummary.toolPreferences.mostUsedTools.map(t => t.tool);
    const allTools = ['search', 'memory', 'reasoning', 'file-analysis', 'web-search'];
    const underusedTools = allTools.filter(tool => !mostUsedTools.includes(tool));

    if (underusedTools.length > 0) {
      recommendations.push({
        type: 'tool',
        priority: 'medium',
        title: 'Explore New Tools',
        description: `Try ${underusedTools[0]} for enhanced capabilities`,
        actionableSteps: [`Ask me to use ${underusedTools[0]} on your next question`],
        expectedBenefit: 'Discover new ways to solve problems',
        confidenceScore: 0.7,
        basedOn: ['Tool usage pattern analysis'],
        relevanceScore: 0.7,
        timeSensitive: false,
        estimatedTime: '1 minute',
        successLikelihood: 0.75,
        learningValue: 0.8
      });
    }

    return recommendations;
  }

  /**
   * Generate learning path recommendations
   */
  private async generateLearningRecommendations(
    context: RecommendationContext,
    behaviorSummary?: UserBehaviorSummary
  ): Promise<SmartRecommendation[]> {
    const recommendations: SmartRecommendation[] = [];

    if (!behaviorSummary) return recommendations;

    // Recommend based on learning patterns
    const learningPatterns = behaviorSummary.learningPatterns;
    
    if (learningPatterns.learningVelocity > 0.7) {
      recommendations.push({
        type: 'learning',
        priority: 'high',
        title: 'Advanced Learning Path',
        description: 'You\'re learning quickly! Try advanced concepts',
        actionableSteps: [
          'Ask for advanced topics in your areas of interest',
          'Request practical challenges and exercises'
        ],
        expectedBenefit: 'Accelerated skill development',
        confidenceScore: 0.85,
        basedOn: ['High learning velocity detected'],
        relevanceScore: 0.9,
        timeSensitive: false,
        estimatedTime: '5-10 minutes',
        successLikelihood: 0.8,
        learningValue: 0.95
      });
    }

    return recommendations;
  }

  /**
   * Generate efficiency optimization recommendations
   */
  private async generateEfficiencyRecommendations(
    context: RecommendationContext,
    behaviorSummary?: UserBehaviorSummary
  ): Promise<SmartRecommendation[]> {
    const recommendations: SmartRecommendation[] = [];

    if (!behaviorSummary) return recommendations;

    // Recommend workflow optimizations based on session patterns
    if (behaviorSummary.engagementMetrics.averageSessionLength > 300) { // 5+ minutes
      recommendations.push({
        type: 'workflow',
        priority: 'medium',
        title: 'Optimize Long Sessions',
        description: 'Break complex tasks into smaller steps for better results',
        actionableSteps: [
          'Ask one specific question at a time',
          'Use step-by-step approach for complex problems'
        ],
        expectedBenefit: 'More focused and effective interactions',
        confidenceScore: 0.75,
        basedOn: ['Long session pattern detected'],
        relevanceScore: 0.8,
        timeSensitive: false,
        estimatedTime: 'Immediate',
        successLikelihood: 0.85,
        learningValue: 0.7
      });
    }

    return recommendations;
  }

  /**
   * Generate discovery recommendations
   */
  private async generateDiscoveryRecommendations(): Promise<SmartRecommendation[]> {
    const recommendations: SmartRecommendation[] = [];

    // Recommend new features based on time and usage
    recommendations.push({
      type: 'content',
      priority: 'low',
      title: 'Discover AI Capabilities',
      description: 'Explore advanced AI features you haven\'t tried yet',
      actionableSteps: [
        'Ask about multimodal capabilities',
        'Try combination tool approaches'
      ],
      expectedBenefit: 'Unlock the full potential of AI assistance',
      confidenceScore: 0.6,
      basedOn: ['Feature discovery engine'],
      relevanceScore: 0.6,
      timeSensitive: false,
      estimatedTime: '2-3 minutes',
      successLikelihood: 0.7,
      learningValue: 0.8
    });

    return recommendations;
  }

  /**
   * Filter and rank recommendations by relevance and quality
   */
  private filterAndRankRecommendations(
    recommendations: SmartRecommendation[],
    context: RecommendationContext,
    maxCount: number
  ): SmartRecommendation[] {
    // Remove duplicates
    const uniqueRecommendations = recommendations.filter((rec, index, arr) => 
      arr.findIndex(r => r.title === rec.title) === index
    );

    // Apply contextual filtering
    const filteredRecommendations = uniqueRecommendations.filter(rec => {
      // Filter out recommendations for tools already in use
      if (rec.type === 'tool' && context.activeTools?.includes(rec.title.toLowerCase())) {
        return false;
      }
      
      // Minimum confidence threshold
      if (rec.confidenceScore < 0.5) {
        return false;
      }

      return true;
    });

    // Sort by combined score (relevance + confidence + success likelihood)
    const rankedRecommendations = filteredRecommendations
      .sort((a, b) => {
        const scoreA = (a.relevanceScore * 0.4) + (a.confidenceScore * 0.3) + (a.successLikelihood * 0.3);
        const scoreB = (b.relevanceScore * 0.4) + (b.confidenceScore * 0.3) + (b.successLikelihood * 0.3);
        return scoreB - scoreA;
      });

    // Add fallback recommendations if we don't have enough
    if (rankedRecommendations.length < maxCount) {
      const fallbackRecommendations = this.generateFallbackRecommendations(
        maxCount - rankedRecommendations.length,
        rankedRecommendations.map(r => r.title) // exclude existing titles
      );
      rankedRecommendations.push(...fallbackRecommendations);
    }

    return rankedRecommendations.slice(0, maxCount);
  }

  /**
   * Store recommendation history for learning
   */
  private storeRecommendationHistory(userId: string, recommendations: SmartRecommendation[]): void {
    const userHistory = this.recommendationHistory.get(userId) || [];
    userHistory.push(...recommendations);
    
    // Keep only recent recommendations
    if (userHistory.length > this.maxHistoryPerUser) {
      userHistory.splice(0, userHistory.length - this.maxHistoryPerUser);
    }
    
    this.recommendationHistory.set(userId, userHistory);
  }

  /**
   * Update recommendation engine weights based on feedback
   */
  private async updateRecommendationEngineWeights(feedback: {
    helpful: boolean;
    rating: number;
  }): Promise<void> {
    // Simple feedback-based weight adjustment
    if (feedback.helpful && feedback.rating >= 4) {
      // Slightly increase weights of all engines (collective learning)
      this.recommendationEngines.forEach(engine => {
        engine.weight = Math.min(engine.weight * 1.01, 1.5); // Cap at 1.5x
      });
    } else if (!feedback.helpful || feedback.rating <= 2) {
      // Slightly decrease weights
      this.recommendationEngines.forEach(engine => {
        engine.weight = Math.max(engine.weight * 0.99, 0.3); // Floor at 0.3x
      });
    }
  }

  /**
   * Get recommendation service metrics
   */
  getRecommendationMetrics(): {
    totalEngines: number;
    engineWeights: Record<string, number>;
    totalRecommendationsGenerated: number;
    averageRecommendationsPerUser: number;
  } {
    const totalRecommendations = Array.from(this.recommendationHistory.values())
      .reduce((sum, recs) => sum + recs.length, 0);
    
    const engineWeights = Object.fromEntries(
      this.recommendationEngines.map(engine => [engine.name, engine.weight])
    );

    return {
      totalEngines: this.recommendationEngines.length,
      engineWeights,
      totalRecommendationsGenerated: totalRecommendations,
      averageRecommendationsPerUser: this.recommendationHistory.size > 0 
        ? totalRecommendations / this.recommendationHistory.size 
        : 0
    };
  }

  /**
   * Generate fallback recommendations when there aren't enough from engines
   */
  private generateFallbackRecommendations(count: number, excludeTitles: string[]): SmartRecommendation[] {
    const fallbacks: SmartRecommendation[] = [
      {
        type: 'tool',
        priority: 'medium',
        title: 'Ask Detailed Questions',
        description: 'Get more comprehensive answers by asking detailed questions',
        actionableSteps: ['Include specific context in your questions', 'Ask follow-up questions'],
        expectedBenefit: 'More accurate and helpful responses',
        confidenceScore: 0.7,
        basedOn: ['General best practices'],
        relevanceScore: 0.5,
        timeSensitive: false,
        estimatedTime: '1 minute',
        successLikelihood: 0.8,
        learningValue: 0.6
      },
      {
        type: 'workflow',
        priority: 'medium',
        title: 'Try Alternative Approaches',
        description: 'Explore different ways to accomplish your goals',
        actionableSteps: ['Break complex problems into smaller parts', 'Ask for step-by-step guidance'],
        expectedBenefit: 'More effective problem-solving',
        confidenceScore: 0.6,
        basedOn: ['Problem-solving patterns'],
        relevanceScore: 0.4,
        timeSensitive: false,
        estimatedTime: '2-3 minutes',
        successLikelihood: 0.7,
        learningValue: 0.7
      },
      {
        type: 'learning',
        priority: 'low',
        title: 'Explore Related Topics',
        description: 'Discover connected concepts and expand your understanding',
        actionableSteps: ['Ask about related concepts', 'Request examples and comparisons'],
        expectedBenefit: 'Broader knowledge and better understanding',
        confidenceScore: 0.5,
        basedOn: ['Learning optimization'],
        relevanceScore: 0.3,
        timeSensitive: false,
        estimatedTime: '3-5 minutes',
        successLikelihood: 0.6,
        learningValue: 0.9
      },
      {
        type: 'workflow',
        priority: 'medium',
        title: 'Use Structured Requests',
        description: 'Format your requests for optimal AI assistance',
        actionableSteps: ['Clearly state your goal', 'Provide relevant context', 'Specify output format'],
        expectedBenefit: 'Faster and more accurate responses',
        confidenceScore: 0.6,
        basedOn: ['Efficiency patterns'],
        relevanceScore: 0.4,
        timeSensitive: false,
        estimatedTime: '1-2 minutes',
        successLikelihood: 0.8,
        learningValue: 0.5
      },
      {
        type: 'content',
        priority: 'low',
        title: 'Experiment with AI Features',
        description: 'Try different AI capabilities to find what works best',
        actionableSteps: ['Ask about AI capabilities', 'Try multimodal inputs', 'Experiment with different question styles'],
        expectedBenefit: 'Discover new ways to leverage AI assistance',
        confidenceScore: 0.5,
        basedOn: ['Feature discovery'],
        relevanceScore: 0.3,
        timeSensitive: false,
        estimatedTime: '5+ minutes',
        successLikelihood: 0.6,
        learningValue: 0.8
      }
    ];

    return fallbacks
      .filter(rec => !excludeTitles.includes(rec.title))
      .slice(0, count);
  }
}
