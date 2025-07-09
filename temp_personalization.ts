/**
 * Personalization Intelligence Engine
 * Advanced learning system that adapts to user preferences and behavior patterns
 * across conversations to provide truly personalized AI experiences.
 */

import { UserMemoryService } from '../../memory/user-memory.service.js';
import { logger } from '../../utils/logger.js';
import { PerformanceMonitor } from '../../utils/resilience.js';
import type { MCPManager } from '../mcp-manager.service.js';

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

export interface PersonalizedRecommendation {
  type: 'tool' | 'workflow' | 'content' | 'learning';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionableSteps: string[];
  expectedBenefit: string;
  confidenceScore: number;
  basedOn: string[]; // What patterns led to this recommendation
}

export interface AdaptiveResponse {
  originalResponse: string;
  personalizedResponse: string;
  adaptations: Array<{
    type: 'style' | 'length' | 'examples' | 'format';
    reason: string;
    basedOnPattern: string;
  }>;
  confidenceScore: number;
}

export interface LearningInsight {
  userId: string;
  insight: string;
  confidence: number;
  category: 'preference' | 'behavior' | 'expertise' | 'goal';
  evidenceCount: number;
  firstObserved: Date;
  lastReinforced: Date;
}

/**
 * Core Personalization Intelligence Engine
 * Orchestrates learning, adaptation, and personalization across all user interactions
 */
export class PersonalizationEngine {
  private userMemoryService: UserMemoryService;
  private mcpManager?: MCPManager;
  private userPatterns = new Map<string, UserInteractionPattern>();
  private learningInsights = new Map<string, LearningInsight[]>();
  private readonly maxPatternHistory = 1000;
  private readonly learningThreshold = 0.7;

  constructor(mcpManager?: MCPManager) {
    this.userMemoryService = new UserMemoryService();
    this.mcpManager = mcpManager;
    this.startPeriodicLearning();
  }

  /**
   * Record user interaction for behavioral analysis and learning
   */
  async recordInteraction(interaction: {
    userId: string;
    guildId?: string;
    messageType: string;
    toolsUsed: string[];
    responseTime: number;
    userSatisfaction?: number; // 1-5 scale
    conversationContext: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      await PerformanceMonitor.monitor('personalization-record-interaction', async () => {
        const pattern = await this.getUserPattern(interaction.userId, interaction.guildId);
        
        // Update tool usage frequency
        for (const tool of interaction.toolsUsed) {
          const currentCount = pattern.toolUsageFrequency.get(tool) || 0;
          pattern.toolUsageFrequency.set(tool, currentCount + 1);
        }

        // Update behavior metrics
        pattern.behaviorMetrics.commonQuestionTypes.push(interaction.messageType);
        if (interaction.userSatisfaction && interaction.userSatisfaction >= 4) {
          pattern.behaviorMetrics.successfulInteractionTypes.push(interaction.messageType);
        }
        
        // Extract topic interests from conversation context
        this.extractTopicInterests(interaction.conversationContext, pattern);
        
        if (interaction.userSatisfaction) {
          pattern.behaviorMetrics.feedbackScores.push(interaction.userSatisfaction);
          // Keep only recent feedback scores
          if (pattern.behaviorMetrics.feedbackScores.length > 50) {
            pattern.behaviorMetrics.feedbackScores.shift();
          }
        }

        // Update session length (simple approximation)
        pattern.behaviorMetrics.averageSessionLength = Math.max(
          pattern.behaviorMetrics.averageSessionLength,
          pattern.behaviorMetrics.commonQuestionTypes.length
        );

        // Update time patterns
        const hour = interaction.timestamp.getHours();
        pattern.behaviorMetrics.mostActiveTimeOfDay = this.calculateMostActiveHour(pattern, hour);

        // Store updated pattern
        this.userPatterns.set(`${interaction.userId}_${interaction.guildId || ''}`, pattern);

        // Generate learning insights
        await this.generateLearningInsights(interaction.userId, pattern);

      }, { userId: interaction.userId, toolsUsed: interaction.toolsUsed });

      logger.info('User interaction recorded for personalization', {
        operation: 'personalization-record',
        metadata: {
          userId: interaction.userId,
          toolsUsed: interaction.toolsUsed,
          satisfaction: interaction.userSatisfaction
        }
      });

    } catch (error) {
      logger.error('Failed to record interaction for personalization', {
        operation: 'personalization-record',
        metadata: { userId: interaction.userId, error: String(error) }
      });
    }
  }

  /**
   * Generate personalized recommendations based on user patterns
   */
  async generatePersonalizedRecommendations(
    userId: string, 
    guildId?: string,
    context?: string
  ): Promise<PersonalizedRecommendation[]> {
    try {
      return await PerformanceMonitor.monitor('personalization-recommendations', async () => {
        const pattern = await this.getUserPattern(userId, guildId);
        const insights = this.learningInsights.get(userId) || [];
        const recommendations: PersonalizedRecommendation[] = [];

        // Tool recommendations based on usage patterns
        const toolRecommendations = await this.generateToolRecommendations(pattern, insights);
        recommendations.push(...toolRecommendations);

        // Learning path recommendations
        const learningRecommendations = this.generateLearningRecommendations(pattern, insights);
        recommendations.push(...learningRecommendations);

        // Workflow optimization recommendations
        const workflowRecommendations = this.generateWorkflowRecommendations(pattern, insights);
        recommendations.push(...workflowRecommendations);

        // Context-specific recommendations
        if (context) {
          const contextualRecommendations = this.generateContextualRecommendations(pattern, insights, context);
          recommendations.push(...contextualRecommendations);
        }

        // Sort by priority and confidence
        return recommendations
          .sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return (priorityOrder[b.priority] - priorityOrder[a.priority]) || 
                   (b.confidenceScore - a.confidenceScore);
          })
          .slice(0, 10); // Limit to top 10 recommendations

      }, { userId, context });

    } catch (error) {
      logger.error('Failed to generate personalized recommendations', {
        operation: 'personalization-recommendations',
        metadata: { userId, error: String(error) }
      });
      
      // Return fallback recommendations even when there are errors
      return [{
        type: 'tool',
        priority: 'medium',
        title: 'Explore AI Features',
        description: 'Discover basic AI capabilities for enhanced productivity',
        actionableSteps: ['Ask about available features', 'Try different types of questions'],
        expectedBenefit: 'Better understanding of AI assistance capabilities',
        confidenceScore: 0.4,
        basedOn: ['Fallback recommendation due to system error']
      }];
    }
  }

  /**
   * Adapt response based on user preferences and patterns
   */
  async adaptResponse(
    userId: string,
    originalResponse: string,
    guildId?: string
  ): Promise<AdaptiveResponse> {
    try {
      return await PerformanceMonitor.monitor('personalization-adapt-response', async () => {
        const pattern = await this.getUserPattern(userId, guildId);
        const adaptations: AdaptiveResponse['adaptations'] = [];
        let personalizedResponse = originalResponse;

        // Adapt communication style
        if (pattern.responsePreferences.communicationStyle === 'casual') {
          personalizedResponse = this.makeCasual(personalizedResponse);
          adaptations.push({
            type: 'style',
            reason: 'User prefers casual communication',
            basedOnPattern: 'Communication style preference'
          });
        } else if (pattern.responsePreferences.communicationStyle === 'technical') {
          personalizedResponse = this.makeTechnical(personalizedResponse);
          adaptations.push({
            type: 'style',
            reason: 'User prefers technical explanations',
            basedOnPattern: 'Communication style preference'
          });
        }

        // Adapt response length
        if (pattern.responsePreferences.preferredLength === 'short') {
          personalizedResponse = this.shortenResponse(personalizedResponse);
          adaptations.push({
            type: 'length',
            reason: 'User prefers concise responses',
            basedOnPattern: 'Response length preference'
          });
        } else if (pattern.responsePreferences.preferredLength === 'detailed') {
          personalizedResponse = this.expandResponse(personalizedResponse);
          adaptations.push({
            type: 'length',
            reason: 'User prefers detailed explanations',
            basedOnPattern: 'Response length preference'
          });
        }

        // Add examples if preferred
        if (pattern.responsePreferences.includeExamples) {
          personalizedResponse = this.addExamples(personalizedResponse);
          adaptations.push({
            type: 'examples',
            reason: 'User learns better with examples',
            basedOnPattern: 'Example preference'
          });
        }

        const confidenceScore = this.calculateAdaptationConfidence(pattern, adaptations);

        return {
          originalResponse,
          personalizedResponse,
          adaptations,
          confidenceScore
        };

      }, { userId, responseLength: originalResponse.length });

    } catch (error) {
      logger.error('Failed to adapt response', {
        operation: 'personalization-adapt-response',
        metadata: { userId, error: String(error) }
      });

      return {
        originalResponse,
        personalizedResponse: originalResponse,
        adaptations: [],
        confidenceScore: 0
      };
    }
  }

  /**
   * Get or create user interaction pattern
   */
  private async getUserPattern(userId: string, guildId?: string): Promise<UserInteractionPattern> {
    const key = `${userId}_${guildId || ''}`;
    let pattern = this.userPatterns.get(key);

    if (!pattern) {
      // Try to load from memory service
      const memory = await this.userMemoryService.getUserMemory(userId, guildId);
      
      pattern = {
        userId,
        guildId,
        toolUsageFrequency: new Map(),
        responsePreferences: {
          preferredLength: memory?.preferences?.responseLength || 'medium',
          communicationStyle: memory?.preferences?.communicationStyle || 'casual',
          includeExamples: memory?.preferences?.includeExamples || false,
          topicInterests: memory?.preferences?.topics || []
        },
        behaviorMetrics: {
          averageSessionLength: 0,
          mostActiveTimeOfDay: 12, // Default to noon
          commonQuestionTypes: [],
          successfulInteractionTypes: [],
          feedbackScores: []
        },
        learningProgress: {
          improvementAreas: [],
          masteredTopics: [],
          recommendedNextSteps: []
        },
        adaptationHistory: []
      };

      this.userPatterns.set(key, pattern);
    }

    return pattern;
  }

  /**
   * Generate learning insights from user patterns
   */
  private async generateLearningInsights(userId: string, pattern: UserInteractionPattern): Promise<void> {
    const insights: LearningInsight[] = [];

    // Analyze tool usage patterns
    const mostUsedTools = Array.from(pattern.toolUsageFrequency.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([tool]) => tool);

    if (mostUsedTools.length > 0) {
      insights.push({
        userId,
        insight: `Frequently uses ${mostUsedTools.join(', ')} tools`,
        confidence: 0.8,
        category: 'behavior',
        evidenceCount: mostUsedTools.length,
        firstObserved: new Date(),
        lastReinforced: new Date()
      });
    }

    // Analyze satisfaction patterns
    const avgSatisfaction = pattern.behaviorMetrics.feedbackScores.length > 0 
      ? pattern.behaviorMetrics.feedbackScores.reduce((a, b) => a + b, 0) / pattern.behaviorMetrics.feedbackScores.length
      : 3;

    if (avgSatisfaction >= 4) {
      insights.push({
        userId,
        insight: 'Generally satisfied with AI responses',
        confidence: 0.9,
        category: 'preference',
        evidenceCount: pattern.behaviorMetrics.feedbackScores.length,
        firstObserved: new Date(),
        lastReinforced: new Date()
      });
    }

    this.learningInsights.set(userId, insights);
  }

  /**
   * Generate tool recommendations based on patterns
   */
  private async generateToolRecommendations(
    pattern: UserInteractionPattern, 
    _insights: LearningInsight[]
  ): Promise<PersonalizedRecommendation[]> {
    const recommendations: PersonalizedRecommendation[] = [];

    // Enhanced tool recommendations with MCP integration
    const allTools = ['memory', 'web-search', 'content-extraction', 'sequential-thinking', 'file-analysis'];
    const mcpTools = this.mcpManager ? await this.getAvailableMCPTools() : [];
    const availableTools = [...allTools, ...mcpTools];
    
    const unusedTools = availableTools.filter(tool => !pattern.toolUsageFrequency.has(tool));

    if (unusedTools.length > 0) {
      const toolBenefits = this.getToolBenefits(unusedTools.slice(0, 3));
      
      recommendations.push({
        type: 'tool',
        priority: 'medium',
        title: 'Discover Enhanced MCP Capabilities',
        description: `Try these powerful AI tools: ${unusedTools.slice(0, 2).join(', ')}`,
        actionableSteps: [
          `Ask me to use ${unusedTools[0]} for your next question`,
          'Combine multiple tools for comprehensive analysis',
          'Explore real-time web search and content analysis'
        ],
        expectedBenefit: toolBenefits,
        confidenceScore: this.mcpManager ? 0.8 : 0.6,
        basedOn: ['MCP tool availability analysis', 'Tool usage patterns']
      });
    }

    // MCP-specific intelligent recommendations
    if (this.mcpManager) {
      const mcpRecommendations = await this.generateMCPSpecificRecommendations(pattern);
      recommendations.push(...mcpRecommendations);
    }

    // Always add a fallback tool recommendation to ensure we have enough
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'tool',
        priority: 'medium',
        title: 'Explore AI Features',
        description: 'Discover advanced AI capabilities for enhanced productivity',
        actionableSteps: ['Ask about multimodal capabilities', 'Try combination tool approaches'],
        expectedBenefit: 'Unlock the full potential of AI assistance',
        confidenceScore: 0.5,
