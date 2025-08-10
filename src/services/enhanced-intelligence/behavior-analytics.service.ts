/**
 * User Behavior Analytics Service
 * Analyzes user interaction patterns, tool usage, and preferences
 * to provide insights for personalization and learning
 */

import { logger } from '../../utils/logger.js';
import { PerformanceMonitor } from '../../utils/resilience.js';

export interface BehaviorMetric {
  userId: string;
  guildId?: string;
  timestamp: Date;
  metricType: 'tool_usage' | 'response_time' | 'satisfaction' | 'question_type' | 'session_length';
  value: number | string;
  context?: Record<string, unknown>;
}

export interface UserBehaviorSummary {
  userId: string;
  guildId?: string;
  analysisDate: Date;
  
  toolPreferences: {
    mostUsedTools: Array<{ tool: string; usage: number; effectiveness: number }>;
    toolSuccessRates: Map<string, number>;
    preferredToolCombinations: string[][];
  };
  
  communicationPatterns: {
    averageResponseTime: number;
    preferredQuestionTypes: string[];
    communicationStyle: 'formal' | 'casual' | 'technical';
    responseLength: 'short' | 'medium' | 'detailed';
  };
  
  learningPatterns: {
    topicProgression: Array<{ topic: string; proficiency: number; trend: 'improving' | 'stable' | 'declining' }>;
    learningVelocity: number; // How quickly user learns new concepts
    preferredLearningMethods: string[];
  };
  
  engagementMetrics: {
    averageSessionLength: number;
    questionsPerSession: number;
    returnFrequency: number; // Days between sessions
    satisfactionTrend: number[]; // Recent satisfaction scores
  };
  
  predictiveInsights: {
    likelyNextQuestions: string[];
    recommendedTools: string[];
    optimalResponseTiming: number; // Best time to respond
    churnRisk: 'low' | 'medium' | 'high';
  };
}

export interface BehaviorAnalysisResult {
  patterns: string[];
  insights: string[];
  recommendations: string[];
  confidence: number;
  dataQuality: 'high' | 'medium' | 'low';
}

/**
 * Analyzes user behavior patterns to enable intelligent personalization
 */
export class UserBehaviorAnalyticsService {
  private behaviorData = new Map<string, BehaviorMetric[]>();
  private behaviorSummaries = new Map<string, UserBehaviorSummary>();
  private readonly maxMetricsPerUser = 1000;
  private readonly analysisWindowDays = 30;

  /**
   * Record a behavior metric for analysis
   */
  async recordBehaviorMetric(metric: BehaviorMetric): Promise<void> {
    try {
      await PerformanceMonitor.monitor('behavior-analytics-record', async () => {
        const userKey = `${metric.userId}_${metric.guildId || ''}`;
        const userMetrics = this.behaviorData.get(userKey) || [];
        
        userMetrics.push(metric);
        
        // Keep only recent metrics
        if (userMetrics.length > this.maxMetricsPerUser) {
          userMetrics.shift();
        }
        
        this.behaviorData.set(userKey, userMetrics);
        
        // Trigger incremental analysis for real-time insights
        await this.updateIncrementalAnalysis(metric.userId, metric.guildId);
      
      }, { userId: metric.userId, metricType: metric.metricType });

      logger.debug('Behavior metric recorded', {
        operation: 'behavior-analytics-record',
        metadata: {
          userId: metric.userId,
          metricType: metric.metricType,
          value: metric.value
        }
      });

    } catch (error) {
      logger.error('Failed to record behavior metric', {
        operation: 'behavior-analytics-record',
        metadata: { userId: metric.userId, error: String(error) }
      });
    }
  }

  /**
   * Analyze user behavior patterns comprehensively
   */
  async analyzeBehaviorPatterns(userId: string, guildId?: string): Promise<BehaviorAnalysisResult> {
    try {
      return await PerformanceMonitor.monitor('behavior-analytics-analyze', async () => {
        const userKey = `${userId}_${guildId || ''}`;
        const metrics = this.behaviorData.get(userKey) || [];
        
        if (metrics.length < 5) {
          return {
            patterns: ['Insufficient data for pattern analysis'],
            insights: ['User is new - collecting behavioral data'],
            recommendations: ['Continue using the bot to enable personalization'],
            confidence: 0.1,
            dataQuality: 'low'
          };
        }

        const patterns = this.identifyBehaviorPatterns(metrics);
        const insights = this.generateBehaviorInsights(metrics);
        const recommendations = this.generateBehaviorRecommendations(patterns, insights);
        const confidence = this.calculateAnalysisConfidence(metrics);
        const dataQuality = this.assessDataQuality(metrics);

        return {
          patterns,
          insights,
          recommendations,
          confidence,
          dataQuality
        };

      }, { userId, metricsCount: this.behaviorData.get(`${userId}_${guildId || ''}`)?.length || 0 });

    } catch (error) {
      logger.error('Failed to analyze behavior patterns', {
        operation: 'behavior-analytics-analyze',
        metadata: { userId, error: String(error) }
      });

      return {
        patterns: [],
        insights: [],
        recommendations: [],
        confidence: 0,
        dataQuality: 'low'
      };
    }
  }

  /**
   * Generate comprehensive user behavior summary
   */
  async generateBehaviorSummary(userId: string, guildId?: string): Promise<UserBehaviorSummary | null> {
    try {
      const userKey = `${userId}_${guildId || ''}`;
      const metrics = this.behaviorData.get(userKey) || [];
      
      return await PerformanceMonitor.monitor('behavior-analytics-summary', async () => {
        
        if (metrics.length < 2) {
          return null; // Insufficient data for comprehensive summary
        }

        const toolPreferences = this.analyzeToolPreferences(metrics);
        const communicationPatterns = this.analyzeCommunicationPatterns(metrics);
        const learningPatterns = this.analyzeLearningPatterns();
        const engagementMetrics = this.analyzeEngagementMetrics(metrics);
        const predictiveInsights = this.generatePredictiveInsights();

        const summary: UserBehaviorSummary = {
          userId,
          guildId,
          analysisDate: new Date(),
          toolPreferences,
          communicationPatterns,
          learningPatterns,
          engagementMetrics,
          predictiveInsights
        };

        this.behaviorSummaries.set(userKey, summary);
        return summary;

      }, { userId, metricsCount: metrics.length });

    } catch (error) {
      logger.error('Failed to generate behavior summary', {
        operation: 'behavior-analytics-summary',
        metadata: { userId, error: String(error) }
      });
      return null;
    }
  }

  /**
   * Get behavior trend analysis over time
   */
  async getBehaviorTrends(userId: string, guildId?: string, days: number = 30): Promise<{
    periodStart: Date;
    periodEnd: Date;
    toolUsageTrend: Array<{ date: Date; tool: string; count: number }>;
    satisfactionTrend: Array<{ date: Date; score: number }>;
    engagementTrend: Array<{ date: Date; questions: number; sessionLength: number }>;
    learningTrend: Array<{ date: Date; newTopics: string[]; proficiency: number }>;
  }> {
    try {
      // const userKey = `${userId}_${guildId || ''}`; // Not used in current implementation
      // const metrics = this.behaviorData.get(userKey) || []; // Not used in current implementation
      const periodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const periodEnd = new Date();
      // const recentMetrics = metrics.filter(m => m.timestamp >= periodStart); // Not used in return

      return {
        periodStart,
        periodEnd,
        toolUsageTrend: this.calculateToolUsageTrend(),
        satisfactionTrend: this.calculateSatisfactionTrend(),
        engagementTrend: this.calculateEngagementTrend(),
        learningTrend: this.calculateLearningTrend()
      };

    } catch (error) {
      logger.error('Failed to get behavior trends', {
        operation: 'behavior-analytics-trends',
        metadata: { userId, error: String(error) }
      });

      return {
        periodStart: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        periodEnd: new Date(),
        toolUsageTrend: [],
        satisfactionTrend: [],
        engagementTrend: [],
        learningTrend: []
      };
    }
  }

  /**
   * Identify behavior patterns from metrics
   */
  private identifyBehaviorPatterns(metrics: BehaviorMetric[]): string[] {
    const patterns: string[] = [];

    // Tool usage patterns
    const toolUsage = this.getToolUsageFrequency(metrics);
    const mostUsedTool = Array.from(toolUsage.entries()).sort(([,a], [,b]) => b - a)[0];
    if (mostUsedTool && mostUsedTool[1] > 3) {
      patterns.push(`Heavy user of ${mostUsedTool[0]} tool (${mostUsedTool[1]} uses)`);
    }

    // Question timing patterns
    const hourDistribution = this.getHourDistribution(metrics);
    const peakHour = Array.from(hourDistribution.entries()).sort(([,a], [,b]) => b - a)[0];
    if (peakHour && peakHour[1] > 2) {
      patterns.push(`Most active at ${peakHour[0]}:00 (${peakHour[1]} interactions)`);
    }

    // Session length patterns
    const sessionLengths = metrics
      .filter(m => m.metricType === 'session_length')
      .map(m => Number(m.value));
    
    if (sessionLengths.length > 0) {
      const avgLength = sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length;
      if (avgLength > 300) { // 5 minutes
        patterns.push(`Prefers long conversation sessions (avg ${Math.round(avgLength/60)} minutes)`);
      } else if (avgLength < 60) { // 1 minute
        patterns.push(`Prefers quick, focused interactions (avg ${Math.round(avgLength)} seconds)`);
      }
    }

    return patterns;
  }

  /**
   * Generate insights from patterns
   */
  private generateBehaviorInsights(metrics: BehaviorMetric[]): string[] {
    const insights: string[] = [];

    // Satisfaction analysis
    const satisfactionScores = metrics
      .filter(m => m.metricType === 'satisfaction')
      .map(m => Number(m.value));

    if (satisfactionScores.length > 0) {
      const avgSatisfaction = satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length;
      if (avgSatisfaction >= 4) {
        insights.push('User is highly satisfied with AI interactions');
      } else if (avgSatisfaction < 3) {
        insights.push('User satisfaction could be improved - may benefit from different approach');
      }
    }

    // Learning velocity insights
    const questionTypes = metrics
      .filter(m => m.metricType === 'question_type')
      .map(m => String(m.value));

    const uniqueTypes = new Set(questionTypes);
    if (uniqueTypes.size > 5) {
      insights.push('User explores diverse topics - indicates strong learning curiosity');
    } else if (uniqueTypes.size > 0) {
      insights.push(`User focuses on specific areas: ${Array.from(uniqueTypes).slice(0, 3).join(', ')}`);
    }

    return insights;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateBehaviorRecommendations(patterns: string[], insights: string[]): string[] {
    const recommendations: string[] = [];

    // Tool recommendations based on patterns
    if (patterns.some(p => p.includes('Heavy user'))) {
      recommendations.push('Try combining your favorite tools with others for enhanced results');
    }

    // Timing recommendations
    if (patterns.some(p => p.includes('Most active'))) {
      recommendations.push('Consider scheduling complex tasks during your peak activity hours');
    }

    // Learning recommendations
    if (insights.some(i => i.includes('diverse topics'))) {
      recommendations.push('Focus on connecting concepts across topics for deeper understanding');
    } else if (insights.some(i => i.includes('specific areas'))) {
      recommendations.push('Consider exploring related topics to broaden your knowledge base');
    }

    return recommendations;
  }

  /**
   * Update incremental analysis for real-time insights
   */
  private async updateIncrementalAnalysis(userId: string, guildId?: string): Promise<void> {
    // This would update real-time analytics dashboards and triggers
    // For now, we'll just log the update
    logger.debug('Incremental behavior analysis updated', {
      operation: 'behavior-analytics-incremental',
      userId,
      guildId
    });
  }

  /**
   * Calculate analysis confidence based on data volume and quality
   */
  private calculateAnalysisConfidence(metrics: BehaviorMetric[]): number {
    const dataVolume = Math.min(metrics.length / 50, 1); // Max confidence at 50+ metrics
    const recentData = metrics.filter(m => 
      m.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;
    const recency = Math.min(recentData / 10, 1); // Max confidence at 10+ recent metrics

    return (dataVolume * 0.7 + recency * 0.3);
  }

  /**
   * Assess data quality for analysis
   */
  private assessDataQuality(metrics: BehaviorMetric[]): 'high' | 'medium' | 'low' {
    if (metrics.length >= 50) return 'high';
    if (metrics.length >= 20) return 'medium';
    return 'low';
  }

  /**
   * Analyze tool preferences from metrics
   */
  private analyzeToolPreferences(metrics: BehaviorMetric[]): UserBehaviorSummary['toolPreferences'] {
    const toolUsage = this.getToolUsageFrequency(metrics);
    const mostUsedTools = Array.from(toolUsage.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tool, usage]) => ({ tool, usage, effectiveness: 0.8 })); // Mock effectiveness

    return {
      mostUsedTools,
      toolSuccessRates: new Map(),
      preferredToolCombinations: []
    };
  }

  /**
   * Analyze communication patterns
   */
  private analyzeCommunicationPatterns(metrics: BehaviorMetric[]): UserBehaviorSummary['communicationPatterns'] {
    const responseTimes = metrics
      .filter(m => m.metricType === 'response_time')
      .map(m => Number(m.value));
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    return {
      averageResponseTime,
      preferredQuestionTypes: [],
      communicationStyle: 'casual',
      responseLength: 'medium'
    };
  }

  /**
   * Analyze learning patterns
   */
  private analyzeLearningPatterns(): UserBehaviorSummary['learningPatterns'] {
    return {
      topicProgression: [],
      learningVelocity: 0.5,
      preferredLearningMethods: ['examples', 'step-by-step']
    };
  }

  /**
   * Analyze engagement metrics
   */
  private analyzeEngagementMetrics(metrics: BehaviorMetric[]): UserBehaviorSummary['engagementMetrics'] {
    const sessionLengths = metrics
      .filter(m => m.metricType === 'session_length')
      .map(m => Number(m.value));
    
    const averageSessionLength = sessionLengths.length > 0
      ? sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length
      : 0;

    return {
      averageSessionLength,
      questionsPerSession: 3,
      returnFrequency: 2,
      satisfactionTrend: []
    };
  }

  /**
   * Generate predictive insights
   */
  private generatePredictiveInsights(): UserBehaviorSummary['predictiveInsights'] {
    return {
      likelyNextQuestions: [],
      recommendedTools: [],
      optimalResponseTiming: 30, // seconds
      churnRisk: 'low'
    };
  }

  /**
   * Utility functions for trend calculations
   */
  private calculateToolUsageTrend(): Array<{ date: Date; tool: string; count: number }> {
    // Simplified implementation
    return [];
  }

  private calculateSatisfactionTrend(): Array<{ date: Date; score: number }> {
    return [];
  }

  private calculateEngagementTrend(): Array<{ date: Date; questions: number; sessionLength: number }> {
    return [];
  }

  private calculateLearningTrend(): Array<{ date: Date; newTopics: string[]; proficiency: number }> {
    return [];
  }

  /**
   * Get tool usage frequency from metrics
   */
  private getToolUsageFrequency(metrics: BehaviorMetric[]): Map<string, number> {
    const frequency = new Map<string, number>();
    
    metrics
      .filter(m => m.metricType === 'tool_usage')
      .forEach(m => {
        const tool = String(m.value);
        frequency.set(tool, (frequency.get(tool) || 0) + 1);
      });

    return frequency;
  }

  /**
   * Get hour distribution of interactions
   */
  private getHourDistribution(metrics: BehaviorMetric[]): Map<number, number> {
    const distribution = new Map<number, number>();
    
    metrics.forEach(m => {
      const hour = m.timestamp.getHours();
      distribution.set(hour, (distribution.get(hour) || 0) + 1);
    });

    return distribution;
  }

  /**
   * Get analytics metrics for monitoring
   */
  getAnalyticsMetrics(): {
    totalUsers: number;
    totalMetrics: number;
    averageMetricsPerUser: number;
    dataQualityDistribution: Record<string, number>;
  } {
    const totalMetrics = Array.from(this.behaviorData.values())
      .reduce((sum, metrics) => sum + metrics.length, 0);
    
    const averageMetricsPerUser = this.behaviorData.size > 0 
      ? totalMetrics / this.behaviorData.size 
      : 0;

    return {
      totalUsers: this.behaviorData.size,
      totalMetrics,
      averageMetricsPerUser,
      dataQualityDistribution: { high: 0, medium: 0, low: 0 }
    };
  }
}
