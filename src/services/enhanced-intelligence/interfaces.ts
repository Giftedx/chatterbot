/**
 * Interfaces for Enhanced Intelligence Service Dependencies
 * Enables dependency injection and testing
 */

import { ChatInputCommandInteraction } from 'discord.js';
import { ProcessingContext, MemoryEntry } from './types.js';
import { PersonalizedRecommendation, AdaptiveResponse } from './personalization-engine.service.js';
import { BehaviorMetric } from './behavior-analytics.service.js';
import { SmartRecommendation } from './smart-recommendation.service.js';
import { MemoryContext } from '../../memory/types.js';

export interface IMCPToolsService {
  processWithAllTools(
    content: string,
    attachments: { name: string; url: string; contentType?: string }[],
    context: ProcessingContext
  ): Promise<void>;
  
  getToolRecommendations(
    content: string,
    options: { userId: string; priority: 'low' | 'medium' | 'high' | 'critical' }
  ): { id: string; name: string; confidence: number; reasoning: string }[];
  
  initialize(): Promise<void>;
}

export interface IMemoryService {
  storeConversationMemory(
    context: ProcessingContext,
    prompt: string,
    response: string
  ): Promise<void>;
  
  getUserMemories(userId: string): MemoryEntry[];
  cleanupOldMemories(): void;
}

export interface IUIService {
  initializeStreamingResponse(
    interaction: ChatInputCommandInteraction,
    context: ProcessingContext
  ): Promise<void>;
  
  finalizeStreamingResponse(
    interaction: ChatInputCommandInteraction,
    response: string,
    context: ProcessingContext,
    originalPrompt: string
  ): Promise<void>;
  
  getLastPrompt(userId: string): string | undefined;
}

export interface IResponseService {
  generateEnhancedResponse(
    originalPrompt: string,
    context: ProcessingContext
  ): Promise<string>;
  
  generateRegeneratedResponse(
    userId: string,
    channelId: string,
    guildId: string | null,
    enhancedPrompt: string
  ): Promise<string>;
  
  generateProcessingExplanation(
    toolsUsed: string[],
    complexity: string
  ): string;
}

export interface ICacheService {
  getCachedResponse(content: string, userId: string): string | null;
  cacheResponse(content: string, userId: string, response: string, ttl: number): void;
  clear(): void;
  getStats(): { size: number; hitRate: number; totalEntries: number };
}

export interface IUserMemoryService {
  processConversation(context: MemoryContext): Promise<boolean>;
}

export interface IPersonalizationEngine {
  recordInteraction(interaction: {
    userId: string;
    guildId?: string;
    messageType: string;
    toolsUsed: string[];
    responseTime: number;
    userSatisfaction?: number;
    conversationContext: string;
    timestamp: Date;
  }): Promise<void>;
  
  generatePersonalizedRecommendations(
    userId: string,
    guildId?: string
  ): Promise<PersonalizedRecommendation[]>;
  
  adaptResponse(
    userId: string,
    originalResponse: string,
    guildId?: string
  ): Promise<AdaptiveResponse>;
  
  getPersonalizationMetrics(): {
    totalUsers: number;
    totalInteractions: number;
    averageInteractionsPerUser: number;
    recommendationAccuracy: number;
    averageConfidence: number;
  };
}

export interface IBehaviorAnalyticsService {
  recordBehaviorMetric(metric: BehaviorMetric): Promise<void>;
  
  analyzeBehaviorPatterns(
    userId: string,
    guildId?: string
  ): Promise<{ patterns: unknown[] }>;
  
  generateBehaviorSummary(
    userId: string,
    guildId?: string
  ): Promise<{
    userId: string;
    engagementMetrics: { averageSessionLength: number };
    toolPreferences: unknown;
    learningPatterns: unknown;
  } | null>;
}

export interface ISmartRecommendationService {
  generateSmartRecommendations(
    context: {
      userId: string;
      guildId?: string;
      currentMessage?: string;
      conversationHistory?: string[];
      activeTools?: string[];
      userExpertise?: string;
    },
    maxRecommendations?: number
  ): Promise<SmartRecommendation[]>;
  
  getContextualToolRecommendations(context: {
    userId: string;
    guildId?: string;
    currentMessage?: string;
    activeTools?: string[];
  }): Promise<SmartRecommendation[]>;
  
  getLearningPathRecommendations(context: {
    userId: string;
    guildId?: string;
    userExpertise?: string;
  }): Promise<SmartRecommendation[]>;
  
  recordRecommendationFeedback(
    userId: string,
    recommendationId: string,
    feedback: {
      followed: boolean;
      helpful: boolean;
      rating: number;
      comments?: string;
    }
  ): Promise<void>;
  
  getRecommendationMetrics(): {
    totalEngines: number;
    engineWeights: unknown;
  };
}

export interface IEnhancedIntelligenceServiceDependencies {
  mcpToolsService: IMCPToolsService;
  memoryService: IMemoryService;
  uiService: IUIService;
  responseService: IResponseService;
  cacheService: ICacheService;
  userMemoryService: IUserMemoryService;
  personalizationEngine?: IPersonalizationEngine;
  behaviorAnalytics?: IBehaviorAnalyticsService;
  smartRecommendations?: ISmartRecommendationService;
}