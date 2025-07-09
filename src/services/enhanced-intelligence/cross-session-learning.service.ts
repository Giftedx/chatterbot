/**
 * Cross-Session Learning Engine
 * Orchestrates learning across user sessions, maintaining and evolving
 * user understanding over time for truly adaptive AI experiences
 */

import { PersonalizationEngine, AdaptiveResponse } from './personalization-engine.service.js';
import { UserBehaviorAnalyticsService } from './behavior-analytics.service.js';
import { SmartRecommendationService, RecommendationContext, SmartRecommendation } from './smart-recommendation.service.js';
// import { UserMemoryService } from '../user-memory.service.js';
import { logger } from '../../utils/logger.js';
import { PerformanceMonitor } from '../../utils/resilience.js';

export interface InteractionData {
  message: string;
  response: string;
  toolsUsed: string[];
  topics: string[];
  userFeedback?: {
    helpful: boolean;
    rating: number;
    comments?: string;
  };
}

export interface SessionSummary {
  userSatisfaction: number;
  goalsAchieved: string[];
  challenges: string[];
}

export interface UserMemoryInterface {
  extractAndStoreMemory(userId: string, content: string, guildId?: string): Promise<void>;
}

export interface SessionContext {
  sessionId: string;
  userId: string;
  guildId?: string;
  startTime: Date;
  endTime?: Date;
  messageCount: number;
  toolsUsed: string[];
  topicsDiscussed: string[];
  userSatisfaction?: number;
  learningGoals?: string[];
  achievements?: string[];
}

export interface CrossSessionInsight {
  type: 'pattern' | 'preference' | 'skill' | 'goal' | 'challenge';
  category: string;
  insight: string;
  confidence: number;
  evidenceCount: number;
  firstObserved: Date;
  lastUpdated: Date;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
}

export interface LearningEvolution {
  userId: string;
  skillAreas: Record<string, number>; // skill -> proficiency (0-1)
  interests: Record<string, number>; // topic -> interest level (0-1)
  communicationStyle: {
    preferredLength: 'brief' | 'detailed' | 'adaptive';
    technicalLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    learningStyle: 'visual' | 'textual' | 'interactive' | 'mixed';
    feedbackPreference: 'immediate' | 'summary' | 'minimal';
  };
  goals: {
    shortTerm: string[];
    longTerm: string[];
    completed: string[];
  };
  progressMetrics: {
    totalSessions: number;
    avgSessionLength: number;
    toolMastery: Record<string, number>;
    topicExploration: number; // diversity metric
    learningVelocity: number;
  };
}

/**
 * Advanced cross-session learning system that creates persistent,
 * evolving understanding of users across all interactions
 */
export class CrossSessionLearningEngine {
  private personalizationEngine: PersonalizationEngine;
  private behaviorAnalytics: UserBehaviorAnalyticsService;
  private recommendationService: SmartRecommendationService;
  private userMemoryService: UserMemoryInterface;
  
  private activeSessions = new Map<string, SessionContext>();
  private userEvolutions = new Map<string, LearningEvolution>();
  private crossSessionInsights = new Map<string, CrossSessionInsight[]>();
  
  private readonly maxInsightsPerUser = 50;
  private readonly insightConfidenceThreshold = 0.7;

  constructor(userMemoryService: UserMemoryInterface) {
    this.personalizationEngine = new PersonalizationEngine();
    this.behaviorAnalytics = new UserBehaviorAnalyticsService();
    this.recommendationService = new SmartRecommendationService();
    this.userMemoryService = userMemoryService;
  }

  /**
   * Initialize a new learning session
   */
  async startLearningSession(
    userId: string, 
    guildId?: string,
    initialContext?: Partial<SessionContext>
  ): Promise<string> {
    try {
      return await PerformanceMonitor.monitor('cross-session-start', async () => {
        const sessionId = `session_${userId}_${Date.now()}`;
        
        const sessionContext: SessionContext = {
          sessionId,
          userId,
          guildId,
          startTime: new Date(),
          messageCount: 0,
          toolsUsed: [],
          topicsDiscussed: [],
          ...initialContext
        };

        this.activeSessions.set(sessionId, sessionContext);

        // Initialize user evolution if first time
        if (!this.userEvolutions.has(userId)) {
          await this.initializeUserEvolution(userId);
        }

        logger.info('Learning session started', {
          operation: 'cross-session-start',
          metadata: { sessionId, userId, guildId }
        });

        return sessionId;

      }, { userId, guildId });

    } catch (error) {
      logger.error('Failed to start learning session', {
        operation: 'cross-session-start',
        metadata: { userId, error: String(error) }
      });
      throw error;
    }
  }

  /**
   * Process and learn from user interaction
   */
  async processInteraction(
    sessionId: string,
    interaction: InteractionData
  ): Promise<AdaptiveResponse> {
    try {
      return await PerformanceMonitor.monitor('cross-session-process', async () => {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
          throw new Error(`Session ${sessionId} not found`);
        }

        // Update session context
        session.messageCount++;
        session.toolsUsed.push(...interaction.toolsUsed);
        session.topicsDiscussed.push(...interaction.topics);

        // Record interaction for personalization
        const interactionData = {
          userId: session.userId,
          guildId: session.guildId,
          messageType: 'chat',
          toolsUsed: interaction.toolsUsed,
          responseTime: 1000, // Default response time
          userSatisfaction: interaction.userFeedback?.rating,
          conversationContext: interaction.message,
          timestamp: new Date()
        };

        await this.personalizationEngine.recordInteraction(interactionData);

        // Generate adaptive response
        const adaptiveResponse = await this.personalizationEngine.adaptResponse(
          session.userId,
          interaction.response,
          session.guildId
        );

        // Extract and store cross-session insights
        await this.extractCrossSessionInsights(session, interaction);

        // Update user evolution
        await this.updateUserEvolution(session, interaction);

        logger.info('Interaction processed for learning', {
          operation: 'cross-session-process',
          metadata: {
            sessionId,
            userId: session.userId,
            messageCount: session.messageCount,
            toolsUsed: interaction.toolsUsed.length
          }
        });

        return adaptiveResponse;

      }, { sessionId, toolCount: interaction.toolsUsed.length });

    } catch (error) {
      logger.error('Failed to process interaction for learning', {
        operation: 'cross-session-process',
        metadata: { sessionId, error: String(error) }
      });
      throw error;
    }
  }

  /**
   * Get intelligent recommendations based on cross-session learning
   */
  async getIntelligentRecommendations(
    sessionId: string,
    currentMessage?: string,
    maxRecommendations: number = 5
  ): Promise<SmartRecommendation[]> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) return [];

      const context: RecommendationContext = {
        userId: session.userId,
        guildId: session.guildId,
        currentMessage,
        conversationHistory: [], // Could be populated from session
        activeTools: session.toolsUsed,
        sessionLength: Date.now() - session.startTime.getTime()
      };

      // Get evolution-aware recommendations
      const evolution = this.userEvolutions.get(session.userId);
      if (evolution) {
        context.userExpertise = evolution.communicationStyle.technicalLevel;
      }

      return await this.recommendationService.generateSmartRecommendations(
        context,
        maxRecommendations
      );

    } catch (error) {
      logger.error('Failed to get intelligent recommendations', {
        operation: 'cross-session-recommendations',
        metadata: { sessionId, error: String(error) }
      });
      return [];
    }
  }

  /**
   * End learning session and consolidate insights
   */
  async endLearningSession(
    sessionId: string,
    sessionSummary?: {
      userSatisfaction: number;
      goalsAchieved: string[];
      challenges: string[];
    }
  ): Promise<void> {
    try {
      await PerformanceMonitor.monitor('cross-session-end', async () => {
        const session = this.activeSessions.get(sessionId);
        if (!session) return;

        session.endTime = new Date();
        if (sessionSummary) {
          session.userSatisfaction = sessionSummary.userSatisfaction;
          session.achievements = sessionSummary.goalsAchieved;
        }

        // Final learning consolidation
        await this.consolidateSessionLearning(session, sessionSummary);

        // Store session insights in memory
        await this.storeSessionInsights(session);

        this.activeSessions.delete(sessionId);

        logger.info('Learning session ended', {
          operation: 'cross-session-end',
          metadata: {
            sessionId,
            userId: session.userId,
            duration: session.endTime.getTime() - session.startTime.getTime(),
            messageCount: session.messageCount,
            satisfaction: session.userSatisfaction
          }
        });

      }, { sessionId });

    } catch (error) {
      logger.error('Failed to end learning session', {
        operation: 'cross-session-end',
        metadata: { sessionId, error: String(error) }
      });
    }
  }

  /**
   * Get user's learning evolution
   */
  getUserEvolution(userId: string): LearningEvolution | null {
    return this.userEvolutions.get(userId) || null;
  }

  /**
   * Get cross-session insights for a user
   */
  getCrossSessionInsights(userId: string): CrossSessionInsight[] {
    return this.crossSessionInsights.get(userId) || [];
  }

  /**
   * Initialize user evolution profile
   */
  private async initializeUserEvolution(userId: string): Promise<void> {
    const evolution: LearningEvolution = {
      userId,
      skillAreas: {},
      interests: {},
      communicationStyle: {
        preferredLength: 'adaptive',
        technicalLevel: 'intermediate',
        learningStyle: 'mixed',
        feedbackPreference: 'immediate'
      },
      goals: {
        shortTerm: [],
        longTerm: [],
        completed: []
      },
      progressMetrics: {
        totalSessions: 0,
        avgSessionLength: 0,
        toolMastery: {},
        topicExploration: 0,
        learningVelocity: 0.5
      }
    };

    this.userEvolutions.set(userId, evolution);
  }

  /**
   * Extract insights from current session
   */
  private async extractCrossSessionInsights(
    session: SessionContext,
    interaction: InteractionData
  ): Promise<void> {
    const insights: CrossSessionInsight[] = [];

    // Tool usage patterns
    if (interaction.toolsUsed.length > 0) {
      const toolInsight: CrossSessionInsight = {
        type: 'pattern',
        category: 'tool-usage',
        insight: `Frequently uses ${interaction.toolsUsed.join(', ')} tools`,
        confidence: 0.8,
        evidenceCount: 1,
        firstObserved: new Date(),
        lastUpdated: new Date(),
        impact: 'medium',
        actionable: true
      };
      insights.push(toolInsight);
    }

    // Topic interests
    if (interaction.topics.length > 0) {
      for (const topic of interaction.topics) {
        const topicInsight: CrossSessionInsight = {
          type: 'preference',
          category: 'topic-interest',
          insight: `Shows interest in ${topic}`,
          confidence: 0.7,
          evidenceCount: 1,
          firstObserved: new Date(),
          lastUpdated: new Date(),
          impact: 'medium',
          actionable: true
        };
        insights.push(topicInsight);
      }
    }

    // Store insights
    const userInsights = this.crossSessionInsights.get(session.userId) || [];
    userInsights.push(...insights);
    
    // Keep only recent insights
    if (userInsights.length > this.maxInsightsPerUser) {
      userInsights.splice(0, userInsights.length - this.maxInsightsPerUser);
    }
    
    this.crossSessionInsights.set(session.userId, userInsights);
  }

  /**
   * Update user evolution based on session data
   */
  private async updateUserEvolution(
    session: SessionContext,
    interaction: InteractionData
  ): Promise<void> {
    const evolution = this.userEvolutions.get(session.userId);
    if (!evolution) return;

    // Update tool mastery
    for (const tool of interaction.toolsUsed) {
      evolution.progressMetrics.toolMastery[tool] = 
        (evolution.progressMetrics.toolMastery[tool] || 0) + 0.1;
    }

    // Update interests
    for (const topic of interaction.topics) {
      evolution.interests[topic] = 
        (evolution.interests[topic] || 0) + 0.1;
    }

    // Update session metrics
    evolution.progressMetrics.totalSessions++;
    const sessionLength = Date.now() - session.startTime.getTime();
    evolution.progressMetrics.avgSessionLength = 
      (evolution.progressMetrics.avgSessionLength + sessionLength) / 2;

    // Update learning velocity based on feedback
    if (interaction.userFeedback?.helpful) {
      evolution.progressMetrics.learningVelocity = 
        Math.min(evolution.progressMetrics.learningVelocity * 1.05, 1.0);
    }

    this.userEvolutions.set(session.userId, evolution);
  }

  /**
   * Consolidate learning from completed session
   */
  private async consolidateSessionLearning(
    session: SessionContext,
    _summary?: SessionSummary
  ): Promise<void> {
    const behaviorSummary = await this.behaviorAnalytics.generateBehaviorSummary(
      session.userId,
      session.guildId
    );

    if (behaviorSummary) {
      // Use behavior summary to enhance evolution
      const evolution = this.userEvolutions.get(session.userId);
      if (evolution) {
        // Update communication style based on patterns
        if (behaviorSummary.communicationPatterns.responseLength === 'detailed') {
          evolution.communicationStyle.preferredLength = 'detailed';
        } else if (behaviorSummary.communicationPatterns.responseLength === 'short') {
          evolution.communicationStyle.preferredLength = 'brief';
        }

        this.userEvolutions.set(session.userId, evolution);
      }
    }
  }

  /**
   * Store session insights in user memory
   */
  private async storeSessionInsights(session: SessionContext): Promise<void> {
    const insights = this.crossSessionInsights.get(session.userId) || [];
    const highConfidenceInsights = insights.filter(
      insight => insight.confidence >= this.insightConfidenceThreshold
    );

    if (highConfidenceInsights.length > 0) {
      const insightSummary = highConfidenceInsights
        .map(insight => `${insight.category}: ${insight.insight}`)
        .join('; ');

      await this.userMemoryService.extractAndStoreMemory(
        session.userId,
        `Session insights: ${insightSummary}`,
        session.guildId
      );
    }
  }

  /**
   * Get cross-session learning metrics
   */
  getLearningMetrics(): {
    activeSessions: number;
    totalUsers: number;
    averageSessionLength: number;
    totalInsights: number;
    averageInsightsPerUser: number;
  } {
    const totalInsights = Array.from(this.crossSessionInsights.values())
      .reduce((sum, insights) => sum + insights.length, 0);

    const avgSessionLength = Array.from(this.activeSessions.values())
      .reduce((sum, session) => {
        const length = session.endTime 
          ? session.endTime.getTime() - session.startTime.getTime()
          : Date.now() - session.startTime.getTime();
        return sum + length;
      }, 0) / Math.max(this.activeSessions.size, 1);

    return {
      activeSessions: this.activeSessions.size,
      totalUsers: this.userEvolutions.size,
      averageSessionLength: avgSessionLength,
      totalInsights,
      averageInsightsPerUser: this.crossSessionInsights.size > 0 
        ? totalInsights / this.crossSessionInsights.size 
        : 0
    };
  }
}
