/**
 * Smart Context Management System
 * 
 * Intelligently determines optimal context strategy based on message analysis,
 * user intent, and conversation patterns. Builds on existing ContextManager
 * with advanced context selection and management capabilities.
 */

import { Part } from '@google/generative-ai';
import { logger } from '../utils/logger.js';
import { ContextManager } from './context-manager.js';
import type { ChatMessage } from './context-manager.js';
import type { UnifiedMessageAnalysis } from './core/message-analysis.service.js';
import type { IntentClassification } from './advanced-intent-detection.service.js';

export interface ContextStrategy {
  strategy: 'full' | 'selective' | 'minimal' | 'fresh' | 'focused';
  maxMessages: number;
  includeMultimodal: boolean;
  prioritizeRecent: boolean;
  requiresMemory: boolean;
  contextWeight: number;
  reasoning: string[];
}

export interface ContextSelectionCriteria {
  messageAnalysis: UnifiedMessageAnalysis;
  intentClassification?: IntentClassification;
  conversationLength: number;
  hasMultimodalHistory: boolean;
  userExpertise: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  taskComplexity: 'simple' | 'moderate' | 'complex' | 'advanced';
  conversationContinuity: boolean;
}

export interface SmartContextResult {
  strategy: ContextStrategy;
  contextMessages: ChatMessage[];
  totalTokensEstimate: number;
  effectiveness: number;
  metadata: {
    originalLength: number;
    selectedLength: number;
    reductionRatio: number;
    strategyConfidence: number;
  };
}

/**
 * Smart Context Manager Service
 * Provides intelligent context selection and management
 */
export class SmartContextManagerService {
  private readonly contextManager: ContextManager;
  private readonly strategyCache: Map<string, ContextStrategy> = new Map();
  private readonly performanceMetrics: Map<string, number> = new Map();

  // Context strategy parameters
  private readonly MAX_TOKENS_BUDGET = 8000; // Reserve tokens for response
  private readonly AVERAGE_TOKENS_PER_MESSAGE = 100;
  private readonly MULTIMODAL_TOKEN_MULTIPLIER = 3;

  constructor(contextManager?: ContextManager) {
    this.contextManager = contextManager || new ContextManager();
    logger.info('Smart Context Manager initialized');
  }

  /**
   * Intelligently select optimal context strategy and content
   */
  public async selectSmartContext(
    channelId: string,
    criteria: ContextSelectionCriteria
  ): Promise<SmartContextResult> {
    try {
      // Get full conversation history
      const fullHistory = await this.contextManager.getHistory(channelId);
      
      // Determine optimal context strategy
      const strategy = this.determineOptimalStrategy(criteria, fullHistory.length);
      
      // Apply strategy to select context messages
      const selectedMessages = this.applyContextStrategy(fullHistory, strategy, criteria);
      
      // Calculate effectiveness metrics
      const result = this.buildContextResult(strategy, selectedMessages, fullHistory);
      
      // Cache strategy for similar future requests
      this.cacheStrategy(criteria, strategy);
      
      logger.debug('Smart context selection completed', {
        operation: 'smart-context-selection',
        metadata: {
          channelId,
          strategy: strategy.strategy,
          originalMessages: fullHistory.length,
          selectedMessages: selectedMessages.length,
          effectiveness: result.effectiveness
        }
      });

      return result;

    } catch (error) {
      logger.error('Smart context selection failed', {
        operation: 'smart-context-selection',
        metadata: { channelId, error: String(error) }
      });

      // Fallback to basic context
      return this.getFallbackContext(channelId);
    }
  }

  /**
   * Determine optimal context strategy based on criteria
   */
  private determineOptimalStrategy(
    criteria: ContextSelectionCriteria,
    historyLength: number
  ): ContextStrategy {
    
    const { messageAnalysis, intentClassification, taskComplexity, userExpertise } = criteria;
    const reasoning: string[] = [];

    // Start with base strategy
    let strategy: ContextStrategy['strategy'] = 'selective';
    let maxMessages = 10;
    let includeMultimodal = true;
    let prioritizeRecent = true;
    let requiresMemory = false;
    let contextWeight = 0.7;

    // Intent-based strategy selection
    if (intentClassification) {
      switch (intentClassification.category) {
        case 'conversational':
          strategy = 'minimal';
          maxMessages = 3;
          prioritizeRecent = true;
          contextWeight = 0.3;
          reasoning.push('Conversational intent requires minimal context');
          break;

        case 'technical':
          strategy = 'focused';
          maxMessages = 15;
          includeMultimodal = true;
          requiresMemory = true;
          contextWeight = 0.9;
          reasoning.push('Technical intent requires focused context with code history');
          break;

        case 'analytical':
          strategy = 'full';
          maxMessages = 20;
          includeMultimodal = true;
          requiresMemory = true;
          contextWeight = 1.0;
          reasoning.push('Analytical tasks need comprehensive context');
          break;

        case 'creative':
          strategy = 'selective';
          maxMessages = 8;
          includeMultimodal = true;
          prioritizeRecent = true;
          contextWeight = 0.6;
          reasoning.push('Creative tasks benefit from selective context');
          break;

        case 'multimodal':
          strategy = 'focused';
          maxMessages = 12;
          includeMultimodal = true;
          prioritizeRecent = true;
          contextWeight = 0.8;
          reasoning.push('Multimodal tasks require visual context focus');
          break;

        case 'memory':
          strategy = 'full';
          maxMessages = 25;
          includeMultimodal = true;
          requiresMemory = true;
          contextWeight = 1.0;
          reasoning.push('Memory tasks require extensive conversation history');
          break;

        case 'administrative':
          strategy = 'minimal';
          maxMessages = 2;
          prioritizeRecent = true;
          contextWeight = 0.2;
          reasoning.push('Admin commands need minimal context');
          break;

        default:
          reasoning.push('Using default selective strategy');
      }
    }

    // Complexity adjustments
    switch (taskComplexity) {
      case 'simple':
        maxMessages = Math.min(maxMessages, 5);
        contextWeight *= 0.7;
        reasoning.push('Simple task - reduced context');
        break;
      
      case 'complex':
        maxMessages = Math.max(maxMessages, 15);
        contextWeight = Math.min(contextWeight * 1.2, 1.0);
        reasoning.push('Complex task - expanded context');
        break;
      
      case 'advanced':
        maxMessages = Math.max(maxMessages, 20);
        strategy = 'full';
        contextWeight = 1.0;
        reasoning.push('Advanced task - full context required');
        break;
    }

    // User expertise adjustments
    switch (userExpertise) {
      case 'beginner':
        maxMessages = Math.max(maxMessages, 8);
        requiresMemory = true;
        reasoning.push('Beginner user - need more context for guidance');
        break;
      
      case 'expert':
        maxMessages = Math.min(maxMessages, 6);
        prioritizeRecent = true;
        reasoning.push('Expert user - focused recent context');
        break;
    }

    // Message analysis adjustments
    if (messageAnalysis.complexity === 'advanced') {
      strategy = 'full';
      maxMessages = Math.max(maxMessages, 18);
      contextWeight = 1.0;
      reasoning.push('Advanced message complexity requires full context');
    }

    if (messageAnalysis.hasAttachments) {
      includeMultimodal = true;
      maxMessages = Math.max(maxMessages, 10);
      reasoning.push('Message has attachments - include multimodal context');
    }

    if (messageAnalysis.intents.includes('comparison')) {
      strategy = 'full';
      maxMessages = Math.max(maxMessages, 15);
      reasoning.push('Comparison intent requires comprehensive context');
    }

    // Context continuity adjustments
    if (criteria.conversationContinuity) {
      maxMessages = Math.max(maxMessages, 12);
      contextWeight = Math.min(contextWeight * 1.1, 1.0);
      reasoning.push('Conversation continuity requires expanded context');
    }

    // Fresh context detection
    if (this.shouldUseFreshContext(messageAnalysis, intentClassification)) {
      strategy = 'fresh';
      maxMessages = 1;
      includeMultimodal = false;
      contextWeight = 0.1;
      reasoning.push('Fresh context needed for new topic/task');
    }

    return {
      strategy,
      maxMessages: Math.min(maxMessages, 30), // Hard limit
      includeMultimodal,
      prioritizeRecent,
      requiresMemory,
      contextWeight,
      reasoning
    };
  }

  /**
   * Apply context strategy to select optimal messages
   */
  private applyContextStrategy(
    fullHistory: ChatMessage[],
    strategy: ContextStrategy,
    criteria: ContextSelectionCriteria
  ): ChatMessage[] {
    
    if (strategy.strategy === 'fresh') {
      return [];
    }

    let selectedMessages = [...fullHistory];

    // Apply strategy-specific filtering
    switch (strategy.strategy) {
      case 'minimal':
        selectedMessages = this.selectMinimalContext(selectedMessages, strategy);
        break;
      
      case 'selective':
        selectedMessages = this.selectSelectiveContext(selectedMessages, strategy, criteria);
        break;
      
      case 'focused':
        selectedMessages = this.selectFocusedContext(selectedMessages, strategy, criteria);
        break;
      
      case 'full':
        selectedMessages = this.selectFullContext(selectedMessages, strategy);
        break;
    }

    // Apply multimodal filtering
    if (!strategy.includeMultimodal) {
      selectedMessages = selectedMessages.filter(msg => 
        !msg.parts.some(part => 'inlineData' in part || 'fileData' in part)
      );
    }

    // Apply message count limit
    if (selectedMessages.length > strategy.maxMessages) {
      if (strategy.prioritizeRecent) {
        selectedMessages = selectedMessages.slice(-strategy.maxMessages);
      } else {
        selectedMessages = selectedMessages.slice(0, strategy.maxMessages);
      }
    }

    // Ensure we have pairs (user + assistant)
    return this.ensureMessagePairs(selectedMessages);
  }

  /**
   * Select minimal context (most recent exchanges only)
   */
  private selectMinimalContext(
    messages: ChatMessage[],
    strategy: ContextStrategy
  ): ChatMessage[] {
    return messages.slice(-strategy.maxMessages);
  }

  /**
   * Select selective context based on relevance scoring
   */
  private selectSelectiveContext(
    messages: ChatMessage[],
    strategy: ContextStrategy,
    criteria: ContextSelectionCriteria
  ): ChatMessage[] {
    // Score messages based on relevance to current intent
    const scoredMessages = messages.map((msg, index) => ({
      message: msg,
      score: this.calculateMessageRelevance(msg, criteria, index, messages.length),
      index
    }));

    // Sort by relevance score (descending)
    scoredMessages.sort((a, b) => b.score - a.score);

    // Take top messages up to limit
    const selectedScored = scoredMessages.slice(0, strategy.maxMessages);

    // Sort back by original order to maintain conversation flow
    selectedScored.sort((a, b) => a.index - b.index);

    return selectedScored.map(item => item.message);
  }

  /**
   * Select focused context (recent + relevant to specific intent)
   */
  private selectFocusedContext(
    messages: ChatMessage[],
    strategy: ContextStrategy,
    criteria: ContextSelectionCriteria
  ): ChatMessage[] {
    const recentCount = Math.floor(strategy.maxMessages * 0.7); // 70% recent
    const relevantCount = strategy.maxMessages - recentCount;

    // Get recent messages
    const recent = messages.slice(-recentCount);

    // Get relevant messages from earlier in conversation
    const earlier = messages.slice(0, -recentCount);
    const relevantEarlier = this.selectSelectiveContext(earlier, {
      ...strategy,
      maxMessages: relevantCount
    }, criteria);

    return [...relevantEarlier, ...recent];
  }

  /**
   * Select full context with smart pruning
   */
  private selectFullContext(
    messages: ChatMessage[],
    strategy: ContextStrategy
  ): ChatMessage[] {
    if (messages.length <= strategy.maxMessages) {
      return messages;
    }

    // For full context, prioritize keeping conversation structure
    // Remove middle messages while preserving start and end
    const keepStart = Math.floor(strategy.maxMessages * 0.2);
    const keepEnd = Math.floor(strategy.maxMessages * 0.8);

    const start = messages.slice(0, keepStart);
    const end = messages.slice(-keepEnd);

    return [...start, ...end];
  }

  /**
   * Calculate message relevance score for selective context
   */
  private calculateMessageRelevance(
    message: ChatMessage,
    criteria: ContextSelectionCriteria,
    index: number,
    totalMessages: number
  ): number {
    let score = 0;

    // Recency score (more recent = higher score)
    const recencyScore = index / totalMessages;
    score += recencyScore * 0.3;

    // Intent relevance
    if (criteria.intentClassification) {
      const messageText = message.parts
        .map(part => 'text' in part ? part.text : '')
        .join(' ')
        .toLowerCase();

      // Check for relevant keywords based on intent
      const intentKeywords = this.getIntentKeywords(criteria.intentClassification);
      const keywordMatches = intentKeywords.filter(keyword => 
        messageText.includes(keyword.toLowerCase())
      ).length;
      
      score += (keywordMatches / Math.max(intentKeywords.length, 1)) * 0.4;
    }

    // Multimodal content bonus
    if (message.parts.some(part => 'inlineData' in part || 'fileData' in part)) {
      score += 0.2;
    }

    // Length penalty for very long messages (might be noise)
    const messageLength = message.parts.reduce((len, part) => 
      len + ('text' in part ? part.text?.length || 0 : 0), 0
    );
    if (messageLength > 1000) {
      score -= 0.1;
    }

    return score;
  }

  /**
   * Get relevant keywords for intent classification
   */
  private getIntentKeywords(classification: IntentClassification): string[] {
    const keywordMap: Record<string, string[]> = {
      'coding_help': ['function', 'error', 'debug', 'code', 'bug', 'syntax'],
      'analysis': ['analyze', 'compare', 'evaluate', 'pros', 'cons', 'differences'],
      'definition': ['what is', 'define', 'explain', 'meaning', 'definition'],
      'image_analysis': ['image', 'picture', 'visual', 'analyze', 'describe'],
      'memory_recall': ['remember', 'earlier', 'mentioned', 'before', 'previously']
    };

    return keywordMap[classification.primary] || [];
  }

  /**
   * Determine if fresh context should be used
   */
  private shouldUseFreshContext(
    analysis: UnifiedMessageAnalysis,
    classification?: IntentClassification
  ): boolean {
    // Use fresh context for new topic introductions
    if (analysis.intents.includes('greeting')) return true;
    
    // Use fresh context for explicit topic changes
    const freshIndicators = [
      'new topic', 'different question', 'change subject',
      'let\'s talk about', 'moving on to', 'now about'
    ];
    
    // This would need the actual message content - for now return false
    return false;
  }

  /**
   * Ensure messages come in user/assistant pairs
   */
  private ensureMessagePairs(messages: ChatMessage[]): ChatMessage[] {
    const pairs: ChatMessage[] = [];
    
    for (let i = 0; i < messages.length - 1; i += 2) {
      if (messages[i] && messages[i + 1]) {
        pairs.push(messages[i], messages[i + 1]);
      }
    }
    
    return pairs;
  }

  /**
   * Build complete context result with metrics
   */
  private buildContextResult(
    strategy: ContextStrategy,
    selectedMessages: ChatMessage[],
    fullHistory: ChatMessage[]
  ): SmartContextResult {
    
    // Estimate token usage
    const totalTokensEstimate = selectedMessages.reduce((total, msg) => {
      let msgTokens = this.AVERAGE_TOKENS_PER_MESSAGE;
      
      // Adjust for multimodal content
      if (msg.parts.some(part => 'inlineData' in part || 'fileData' in part)) {
        msgTokens *= this.MULTIMODAL_TOKEN_MULTIPLIER;
      }
      
      return total + msgTokens;
    }, 0);

    // Calculate effectiveness based on context coverage and efficiency
    const reductionRatio = selectedMessages.length / Math.max(fullHistory.length, 1);
    const tokenEfficiency = 1 - (totalTokensEstimate / this.MAX_TOKENS_BUDGET);
    const effectiveness = (strategy.contextWeight * reductionRatio + tokenEfficiency) / 2;

    return {
      strategy,
      contextMessages: selectedMessages,
      totalTokensEstimate,
      effectiveness: Math.max(0, Math.min(1, effectiveness)),
      metadata: {
        originalLength: fullHistory.length,
        selectedLength: selectedMessages.length,
        reductionRatio,
        strategyConfidence: strategy.contextWeight
      }
    };
  }

  /**
   * Cache strategy for similar future requests
   */
  private cacheStrategy(criteria: ContextSelectionCriteria, strategy: ContextStrategy): void {
    // Create cache key based on criteria characteristics
    const cacheKey = [
      criteria.messageAnalysis.complexity,
      criteria.taskComplexity,
      criteria.userExpertise,
      criteria.intentClassification?.category || 'unknown'
    ].join('-');

    this.strategyCache.set(cacheKey, strategy);

    // Limit cache size
    if (this.strategyCache.size > 100) {
      const firstKey = this.strategyCache.keys().next().value;
      if (firstKey) {
        this.strategyCache.delete(firstKey);
      }
    }
  }

  /**
   * Fallback context when smart selection fails
   */
  private async getFallbackContext(channelId: string): Promise<SmartContextResult> {
    const fallbackMessages = await this.contextManager.getHistory(channelId);
    const recentMessages = fallbackMessages.slice(-10); // Last 10 messages

    return {
      strategy: {
        strategy: 'selective',
        maxMessages: 10,
        includeMultimodal: true,
        prioritizeRecent: true,
        requiresMemory: false,
        contextWeight: 0.5,
        reasoning: ['Fallback strategy due to smart selection failure']
      },
      contextMessages: recentMessages,
      totalTokensEstimate: recentMessages.length * this.AVERAGE_TOKENS_PER_MESSAGE,
      effectiveness: 0.5,
      metadata: {
        originalLength: fallbackMessages.length,
        selectedLength: recentMessages.length,
        reductionRatio: recentMessages.length / Math.max(fallbackMessages.length, 1),
        strategyConfidence: 0.5
      }
    };
  }

  /**
   * Get context management analytics
   */
  public getAnalytics(): {
    strategiesUsed: Record<string, number>;
    averageEffectiveness: number;
    averageReduction: number;
    contextCacheHitRate: number;
  } {
    const stats = {
      strategiesUsed: {} as Record<string, number>,
      averageEffectiveness: 0,
      averageReduction: 0,
      contextCacheHitRate: 0
    };

    // This would be populated with actual usage metrics
    return stats;
  }

  /**
   * Clear strategy cache
   */
  public clearCache(): void {
    this.strategyCache.clear();
    this.performanceMetrics.clear();
    logger.debug('Smart context manager cache cleared');
  }
}

// Export singleton instance
export const smartContextManagerService = new SmartContextManagerService();