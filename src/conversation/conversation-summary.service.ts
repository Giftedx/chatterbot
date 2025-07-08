/**
 * Conversation Summary Service
 * AI-powered conversation summarization and key point extraction
 */

import {
  ConversationSummary,
  DetailedSummaryResult,
  ConversationMessage,
  SummaryOptions,
  KeyPoint,
  ConversationInsights
} from './types.js';
import { ConversationThreadService } from './conversation-thread.service.js';
import { TopicDetectionService } from './topic-detection.service.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

/**
 * Service for generating conversation summaries and extracting insights
 */
export class ConversationSummaryService {
  private readonly threadService: ConversationThreadService;
  private readonly topicService: TopicDetectionService;
  
  constructor() {
    this.threadService = new ConversationThreadService();
    this.topicService = new TopicDetectionService();
  }

  /**
   * Generate a comprehensive summary of a conversation thread
   */
  public async generateThreadSummary(
    threadId: string,
    options: SummaryOptions
  ): Promise<DetailedSummaryResult | null> {
    try {
      const startTime = Date.now();

      // Get thread with messages
      const threadRaw = await prisma.conversationThread.findUnique({
        where: { id: parseInt(threadId) },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          },
          topics: {
            include: { topic: true }
          }
        }
      });

      /* eslint-disable @typescript-eslint/no-explicit-any */
      // Type assertion for Prisma include relations
      const thread = threadRaw as any;

      if (!thread || !thread.messages || thread.messages.length === 0) {
        logger.debug('Thread not found or has no messages', {
          operation: 'thread-summary',
          threadId
        });
        return null;
      }

      // Transform to internal format
      const messages: ConversationMessage[] = thread.messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as 'user' | 'assistant',
        timestamp: msg.timestamp || msg.createdAt,
        createdAt: msg.createdAt,
        importance: msg.importance || 0.5,
        contextRelevant: msg.contextRelevant !== false,
        tokens: msg.tokens || 0,
        topicTags: msg.topicTags || []
      }));

      // Generate different types of summaries based on options
      const summaryText = await this.generateSummaryText(messages, options);
      const keyPoints = await this.extractKeyPoints(messages, options);
      const actionItems = await this.extractActionItems(messages);
      const decisions = await this.extractDecisions(messages);
      const questions = await this.extractQuestions(messages);

      // Calculate metrics
      const messageCount = messages.length;
      const userMessages = messages.filter(m => m.role === 'user').length;
      const assistantMessages = messages.filter(m => m.role === 'assistant').length;
      const averageImportance = messages.reduce((sum, m) => sum + m.importance, 0) / messageCount;

      // Extract topics
      const topics = thread.topics ? thread.topics.map((t: any) => t.topic?.name || 'Unknown Topic') : [];

      // Calculate time span
      const timeSpan = {
        start: messages[0].createdAt,
        end: messages[messages.length - 1].createdAt
      };

      const summary: DetailedSummaryResult = {
        threadId: thread.id,
        summaryText,
        keyPoints,
        actionItems,
        decisions,
        questions,
        topics,
        messageCount,
        userMessages,
        assistantMessages,
        averageImportance,
        timeSpan,
        generatedAt: new Date(),
        summaryType: options.summaryType || 'comprehensive'
      };

      const processingTime = Date.now() - startTime;

      logger.info('Thread summary generated', {
        operation: 'thread-summary',
        threadId,
        userId: thread.userId,
        metadata: {
          messageCount,
          keyPoints: keyPoints.length,
          actionItems: actionItems.length,
          decisions: decisions.length,
          questions: questions.length,
          topics: topics.length,
          processingTime
        }
      });

      return summary;

    } catch (error) {
      logger.error('Failed to generate thread summary', {
        operation: 'thread-summary',
        threadId,
        error: String(error)
      });
      return null;
    }
  }

  /**
   * Generate a quick summary of recent activity
   */
  public async generateQuickSummary(
    channelId: string,
    userId: string,
    messageLimit: number = 20
  ): Promise<string> {
    try {
      // Get recent messages from active thread
      const activeThread = await this.threadService.getActiveThread(channelId, userId);
      
      if (!activeThread || !activeThread.messages) {
        return 'No recent conversation found.';
      }

      // Get last N messages
      const recentMessages = activeThread.messages
        .slice(-messageLimit)
        .filter(msg => msg.contextRelevant);

      if (recentMessages.length === 0) {
        return 'No significant recent activity.';
      }

      // Extract key topics from recent messages
      const topicTags = new Set<string>();
      for (const message of recentMessages) {
        if (message.topicTags) {
          message.topicTags.forEach(tag => topicTags.add(tag));
        }
      }

      // Generate quick summary
      const userMessageCount = recentMessages.filter(m => m.role === 'user').length;
      const assistantMessageCount = recentMessages.filter(m => m.role === 'assistant').length;
      const avgImportance = recentMessages.reduce((sum, m) => sum + m.importance, 0) / recentMessages.length;

      let summary = `Recent activity: ${recentMessages.length} messages (${userMessageCount} from user, ${assistantMessageCount} responses)`;
      
      if (topicTags.size > 0) {
        summary += `. Topics discussed: ${Array.from(topicTags).slice(0, 5).join(', ')}`;
      }

      if (avgImportance > 0.7) {
        summary += '. High-importance conversation detected.';
      }

      return summary;

    } catch (error) {
      logger.error('Failed to generate quick summary', {
        operation: 'quick-summary',
        channelId,
        userId,
        error: String(error)
      });
      return 'Unable to generate summary.';
    }
  }

  /**
   * Get conversation insights for analytics
   */
  public async getConversationInsights(
    threadId: string
  ): Promise<ConversationInsights | null> {
    try {
      // Generate full summary first
      const summary = await this.generateThreadSummary(threadId, {
        summaryType: 'comprehensive',
        includeActionItems: true,
        includeDecisions: true,
        includeQuestions: true
      });

      if (!summary) return null;

      // Calculate additional insights
      const thread = await prisma.conversationThread.findUnique({
        where: { id: parseInt(threadId) },
        include: {
          messages: true,
          topics: { include: { topic: true } }
        }
      });

      if (!thread) return null;

      // Calculate engagement metrics - use lastActivity as endedAt substitute
      const threadWithDates = thread as any;
      const duration = threadWithDates.endedAt || threadWithDates.lastActivity
        ? (threadWithDates.endedAt || threadWithDates.lastActivity).getTime() - threadWithDates.createdAt.getTime()
        : Date.now() - threadWithDates.createdAt.getTime();
      
      const durationHours = duration / (1000 * 60 * 60);
      const messagesPerHour = summary.messageCount / Math.max(durationHours, 0.1);

      // Topic evolution analysis - convert to proper format
      const topicEvolutionStrings = await this.analyzeTopicEvolution(threadWithDates.messages || []);
      const topicEvolution = topicEvolutionStrings.map((topic, index) => ({
        topic,
        timeFirst: new Date(Date.now() - (topicEvolutionStrings.length - index) * 60000),
        timeLast: new Date(Date.now() - (topicEvolutionStrings.length - index - 1) * 60000),
        frequency: 1
      }));

      // Quality metrics - create a basic ConversationSummary for the calculation
      const basicSummary: ConversationSummary = {
        threadId: parseInt(threadId),
        messageCount: summary.messageCount,
        summary: summary.summaryText,
        participants: [threadWithDates.userId],
        topics: summary.topics,
        keyPoints: summary.keyPoints.map(kp => kp.content),
        decisions: summary.decisions || [],
        actionItems: summary.actionItems || [],
        timeSpan: summary.timeSpan,
        importance: threadWithDates.importance || 0.5,
        status: threadWithDates.status || 'active',
        createdAt: threadWithDates.createdAt,
        updatedAt: threadWithDates.lastActivity || new Date(),
        userMessages: summary.userMessages || 0,
        assistantMessages: summary.assistantMessages || 0,
        averageImportance: summary.averageImportance || 0.5
      };
      
      const qualityScore = this.calculateQualityScore(threadWithDates.messages || [], basicSummary);

      // Engagement patterns
      const engagementPattern = this.analyzeEngagementPattern(threadWithDates.messages || []);

      const insights: ConversationInsights = {
        threadId: parseInt(threadId),
        totalMessages: summary.messageCount,
        userMessages: summary.userMessages || 0,
        assistantMessages: summary.assistantMessages || 0,
        averageImportance: summary.averageImportance || 0.5,
        topicCount: summary.topics.length,
        keyPointCount: summary.keyPoints.length,
        actionItemCount: summary.actionItems?.length || 0,
        decisionCount: summary.decisions?.length || 0,
        questionCount: summary.questions?.length || 0,
        durationHours,
        messagesPerHour,
        qualityScore,
        engagementPattern,
        topicEvolution,
        participationPattern: {
          userMessageCount: summary.userMessages || 0,
          assistantMessageCount: summary.assistantMessages || 0,
          averageUserMessageLength: 100, // Default placeholder
          averageResponseTime: 2000 // Default placeholder
        },
        engagementMetrics: {
          sessionDuration: durationHours,
          messageFrequency: messagesPerHour,
          topicSwitches: topicEvolution.length,
          complexityScore: qualityScore / 100
        },
        qualityMetrics: {
          coherenceScore: qualityScore / 100,
          relevanceScore: qualityScore / 100,
          satisfactionIndicators: ['positive-interaction']
        },
        generatedAt: new Date()
      };

      logger.debug('Conversation insights generated', {
        operation: 'conversation-insights',
        threadId,
        metadata: {
          qualityScore,
          engagementPattern,
          topicCount: insights.topicCount,
          durationHours: Math.round(durationHours * 100) / 100
        }
      });

      return insights;

    } catch (error) {
      logger.error('Failed to generate conversation insights', {
        operation: 'conversation-insights',
        threadId,
        error: String(error)
      });
      return null;
    }
  }

  /**
   * Generate summary text using AI-like analysis
   */
  private async generateSummaryText(
    messages: ConversationMessage[],
    options: SummaryOptions
  ): Promise<string> {
    if (messages.length === 0) return 'No messages to summarize.';

    // Extract high-importance messages
    const importantMessages = messages.filter(msg => msg.importance > 0.6);
    const keyMessages = importantMessages.length > 0 ? importantMessages : messages.slice(-5);

    // Identify main topics
    const topicSet = new Set<string>();
    keyMessages.forEach(msg => {
      if (msg.topicTags) {
        msg.topicTags.forEach(tag => topicSet.add(tag));
      }
    });

    // Analyze conversation flow
    const userQuestions = messages.filter(msg => 
      msg.role === 'user' && msg.content.includes('?')
    ).length;

    const codeDiscussion = messages.some(msg => 
      msg.content.includes('```') || msg.topicTags?.some(tag => 
        tag.includes('programming') || tag.includes('code')
      )
    );

    const problemSolving = messages.some(msg =>
      msg.topicTags?.includes('problem-solving') ||
      msg.content.toLowerCase().includes('error') ||
      msg.content.toLowerCase().includes('issue')
    );

    // Generate contextual summary
    let summary = '';

    if (options.summaryType === 'brief') {
      summary = `Conversation with ${messages.length} messages`;
      if (topicSet.size > 0) {
        summary += ` covering ${Array.from(topicSet).slice(0, 3).join(', ')}`;
      }
    } else {
      summary = `Detailed conversation spanning ${messages.length} messages`;
      
      if (codeDiscussion) {
        summary += ' involving programming and technical discussion';
      }
      
      if (problemSolving) {
        summary += ', focused on problem-solving and troubleshooting';
      }
      
      if (userQuestions > 0) {
        summary += `, including ${userQuestions} user questions`;
      }
      
      if (topicSet.size > 0) {
        summary += `. Main topics: ${Array.from(topicSet).join(', ')}.`;
      }

      // Add key message excerpts
      if (options.includeExcerpts && importantMessages.length > 0) {
        const excerpts = importantMessages
          .slice(0, 3)
          .map(msg => msg.content.substring(0, 100) + '...')
          .join(' | ');
        summary += ` Key excerpts: ${excerpts}`;
      }
    }

    return summary;
  }

  /**
   * Extract key points from conversation
   */
  private async extractKeyPoints(
    messages: ConversationMessage[],
    options: SummaryOptions
  ): Promise<KeyPoint[]> {
    const keyPoints: KeyPoint[] = [];

    // Find messages with high importance or specific patterns
    const importantMessages = messages.filter(msg => 
      msg.importance > 0.7 || 
      msg.content.toLowerCase().includes('important') ||
      msg.content.toLowerCase().includes('key') ||
      msg.content.toLowerCase().includes('note')
    );

    for (const message of importantMessages.slice(0, options.maxKeyPoints || 10)) {
      // Extract key sentences (simplified approach)
      const sentences = message.content.split(/[.!?]+/).filter(s => s.trim().length > 20);
      
      for (const sentence of sentences.slice(0, 2)) {
        if (sentence.trim().length > 10) {
          keyPoints.push({
            content: sentence.trim(),
            importance: message.importance,
            timestamp: message.createdAt,
            category: this.categorizeKeyPoint(sentence),
            tags: message.topicTags || []
          });
        }
      }
    }

    // Sort by importance and deduplicate
    return keyPoints
      .sort((a, b) => b.importance - a.importance)
      .slice(0, options.maxKeyPoints || 10);
  }

  /**
   * Extract action items from conversation
   */
  private async extractActionItems(messages: ConversationMessage[]): Promise<string[]> {
    const actionPatterns = [
      /(?:need to|should|must|have to|going to)\s+([^.!?]+)/gi,
      /(?:todo|to-do|action|task):\s*([^.!?]+)/gi,
      /(?:will|shall)\s+([^.!?]+)/gi
    ];

    const actionItems: string[] = [];

    for (const message of messages) {
      for (const pattern of actionPatterns) {
        const matches = message.content.matchAll(pattern);
        for (const match of matches) {
          if (match[1] && match[1].trim().length > 5) {
            actionItems.push(match[1].trim());
          }
        }
      }
    }

    return [...new Set(actionItems)].slice(0, 10);
  }

  /**
   * Extract decisions made in conversation
   */
  private async extractDecisions(messages: ConversationMessage[]): Promise<string[]> {
    const decisionPatterns = [
      /(?:decided|decided to|decision|chose|selected)\s+([^.!?]+)/gi,
      /(?:we'll|we will|let's|let us)\s+([^.!?]+)/gi,
      /(?:final|conclusion|result):\s*([^.!?]+)/gi
    ];

    const decisions: string[] = [];

    for (const message of messages) {
      for (const pattern of decisionPatterns) {
        const matches = message.content.matchAll(pattern);
        for (const match of matches) {
          if (match[1] && match[1].trim().length > 5) {
            decisions.push(match[1].trim());
          }
        }
      }
    }

    return [...new Set(decisions)].slice(0, 10);
  }

  /**
   * Extract questions from conversation
   */
  private async extractQuestions(messages: ConversationMessage[]): Promise<string[]> {
    const questions: string[] = [];

    for (const message of messages) {
      const messageQuestions = message.content
        .split(/[.!]+/)
        .filter(sentence => sentence.includes('?'))
        .map(q => q.trim())
        .filter(q => q.length > 10 && q.length < 200);

      questions.push(...messageQuestions);
    }

    return [...new Set(questions)].slice(0, 10);
  }

  /**
   * Categorize key points
   */
  private categorizeKeyPoint(content: string): string {
    const lower = content.toLowerCase();
    
    if (lower.includes('error') || lower.includes('issue') || lower.includes('problem')) {
      return 'issue';
    } else if (lower.includes('solution') || lower.includes('fix') || lower.includes('resolve')) {
      return 'solution';
    } else if (lower.includes('learn') || lower.includes('understand') || lower.includes('explain')) {
      return 'learning';
    } else if (lower.includes('todo') || lower.includes('action') || lower.includes('need')) {
      return 'action';
    } else if (lower.includes('decision') || lower.includes('choose') || lower.includes('select')) {
      return 'decision';
    } else {
      return 'general';
    }
  }

  /**
   * Calculate conversation quality score
   */
  private calculateQualityScore(
    messages: any[],
    summary: ConversationSummary
  ): number {
    let score = 0;

    // Base score from average importance
    score += (summary.averageImportance || 0.5) * 40;

    // Message balance (30%)
    const userMsgs = summary.userMessages || 0;
    const assistantMsgs = summary.assistantMessages || 0;
    const balance = Math.min(userMsgs, assistantMsgs) / 
                   Math.max(userMsgs, assistantMsgs);
    score += balance * 30;

    // Content richness (20%)
    const actionItemCount = summary.actionItems?.length || 0;
    const decisionCount = summary.decisions?.length || 0;
    const richness = (summary.keyPoints.length + actionItemCount + decisionCount) / summary.messageCount;
    score += Math.min(richness, 1) * 20;

    // Topic diversity (10%)
    const topicDiversity = Math.min(summary.topics.length / 5, 1);
    score += topicDiversity * 10;

    return Math.min(score, 100);
  }

  /**
   * Analyze engagement pattern
   */
  private analyzeEngagementPattern(messages: any[]): string {
    if (messages.length < 3) return 'minimal';

    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;
    const ratio = userMessages / assistantMessages;

    if (ratio > 1.5) return 'user-driven';
    if (ratio < 0.7) return 'assistant-guided';
    return 'balanced';
  }

  /**
   * Analyze topic evolution throughout conversation
   */
  private analyzeTopicEvolution(messages: any[]): string[] {
    const timeSlices = 3;
    const sliceSize = Math.ceil(messages.length / timeSlices);
    const evolution: string[] = [];

    for (let i = 0; i < timeSlices; i++) {
      const start = i * sliceSize;
      const end = Math.min(start + sliceSize, messages.length);
      const sliceMessages = messages.slice(start, end);

      const topics = new Set<string>();
      sliceMessages.forEach((msg: any) => {
        if (msg.topicTags) {
          msg.topicTags.forEach((tag: string) => topics.add(tag));
        }
      });

      evolution.push(Array.from(topics).join(', ') || 'general');
    }

    return evolution;
  }
}
