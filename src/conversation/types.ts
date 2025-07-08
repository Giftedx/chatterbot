/**
 * Advanced Conversation Management Types
 * Comprehensive type definitions for conversation threading, topic detection, and context management
 */

// Core conversation entities
export interface ConversationThread {
  id?: number;
  channelId: string;
  userId: string;
  guildId?: string;
  threadTitle?: string;
  currentTopic?: string;
  status: ThreadStatus;
  summary?: string;
  importance: number; // 0-1 score
  messageCount: number;
  tokenCount: number;
  createdAt: Date;
  lastActivity: Date;
  messages?: ConversationMessage[];
  topics?: ConversationThreadTopic[];
}

export type ThreadStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface ConversationMessage {
  id?: number;
  threadId?: number;
  channelId: string;
  userId: string;
  content: string;
  role: 'user' | 'assistant';
  tokens: number;
  topicTags?: string[]; // Detected topics for this message
  importance: number; // 0-1 relevance score
  contextRelevant: boolean; // Whether to include in context windows
  hasAttachments: boolean;
  attachmentData?: AttachmentMetadata;
  createdAt: Date;
  thread?: ConversationThread;
}

export interface AttachmentMetadata {
  type: 'image' | 'file' | 'audio';
  url: string;
  filename?: string;
  contentType?: string;
  size?: number;
  description?: string;
}

export interface ConversationTopic {
  id?: number;
  name: string; // Slug format: "python-programming"
  displayName: string; // Human readable: "Python Programming"
  description?: string;
  category?: string;
  firstMentioned: Date;
  lastMentioned: Date;
  frequency: number;
  importance: number; // 0-1 score
  threadTopics?: ConversationThreadTopic[];
}

export interface ConversationThreadTopic {
  id?: number;
  threadId: number;
  topicId: number;
  relevance: number; // 0-1 how relevant this topic is to the thread
  firstSeen: Date;
  lastSeen: Date;
  thread?: ConversationThread;
  topic?: ConversationTopic;
}

// Service interfaces
export interface TopicDetectionResult {
  topics: DetectedTopic[];
  confidence: number;
  primaryTopic?: string;
  secondaryTopics: string[];
}

export interface DetectedTopic {
  name: string;
  displayName: string;
  confidence: number;
  category?: string;
  keywords: string[];
}

export interface ContextWindow {
  messages: ConversationMessage[];
  totalTokens: number;
  relevanceScore: number;
  timeSpan: {
    start: Date;
    end: Date;
  };
  topics: string[];
  summary?: string;
}

export interface ConversationSummary {
  threadId: number;
  summary: string;
  keyPoints: string[];
  topics: string[];
  participants: string[];
  decisions?: string[];
  actionItems?: string[];
  timeSpan: {
    start: Date;
    end: Date;
  };
  messageCount: number;
  userMessages?: number;
  assistantMessages?: number;
  averageImportance?: number;
  importance: number;
  status: 'draft' | 'final';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ThreadSearchResult {
  thread: ConversationThread;
  relevanceScore: number;
  matchingMessages: ConversationMessage[];
  highlightedContent: string[];
  topicMatches: string[];
}

export interface ContextSearchQuery {
  query: string;
  userId: string;
  channelId?: string;
  guildId?: string;
  timeRange?: {
    start?: Date;
    end?: Date;
  };
  topics?: string[];
  minImportance?: number;
  maxResults?: number;
}

export interface ContextSearchResult {
  messages: ConversationMessage[];
  threads: ConversationThread[];
  relevanceScore: number;
  totalResults: number;
  searchMetadata: {
    query: string;
    searchTime: number;
    resultsFiltered: number;
    topicMatches: string[];
  };
}

// Context management interfaces
export interface SmartContextOptions {
  maxTokens: number;
  maxMessages?: number;
  includeTopics?: boolean;
  includeUserMemory?: boolean;
  prioritizeRecent?: boolean;
  topicRelevanceThreshold?: number;
  importanceThreshold?: number;
}

export interface ContextSelectionStrategy {
  name: string;
  description: string;
  selectMessages: (
    messages: ConversationMessage[],
    currentMessage: string,
    options: SmartContextOptions
  ) => ConversationMessage[];
}

// Thread management interfaces
export interface ThreadCreationOptions {
  title?: string;
  initialTopic?: string;
  importance?: number;
  autoDetectTopics?: boolean;
}

export interface ThreadUpdateOptions {
  title?: string;
  status?: ThreadStatus;
  importance?: number;
  summary?: string;
  currentTopic?: string;
}

export interface ThreadArchiveOptions {
  generateSummary?: boolean;
  preserveImportantMessages?: boolean;
  minImportanceThreshold?: number;
}

// Topic detection interfaces
export interface TopicDetectionOptions {
  confidenceThreshold?: number;
  maxTopics?: number;
  includeSecondaryTopics?: boolean;
  useExistingTopics?: boolean;
  categoryFilter?: string[];
}

export interface TopicClassificationPattern {
  category: string;
  patterns: RegExp[];
  keywords: string[];
  confidence: number;
  priority: number;
}

// Analytics and insights
export interface ConversationInsights {
  threadId: number;
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  averageImportance: number;
  topicCount: number;
  keyPointCount: number;
  actionItemCount: number;
  decisionCount: number;
  questionCount: number;
  durationHours: number;
  messagesPerHour: number;
  qualityScore: number;
  engagementPattern: string;
  topicEvolution: {
    topic: string;
    timeFirst: Date;
    timeLast: Date;
    frequency: number;
  }[];
  generatedAt: Date;
  participationPattern: {
    userMessageCount: number;
    assistantMessageCount: number;
    averageUserMessageLength: number;
    averageResponseTime: number;
  };
  engagementMetrics: {
    sessionDuration: number;
    messageFrequency: number;
    topicSwitches: number;
    complexityScore: number;
  };
  qualityMetrics: {
    coherenceScore: number;
    relevanceScore: number;
    satisfactionIndicators: string[];
  };
}

// Configuration interfaces
export interface ConversationManagementConfig {
  threading: {
    autoCreateThreads: boolean;
    threadInactivityTimeout: number; // minutes
    maxMessagesPerThread: number;
    autoArchiveOldThreads: boolean;
  };
  topicDetection: {
    enabled: boolean;
    confidenceThreshold: number;
    maxTopicsPerMessage: number;
    autoCreateTopics: boolean;
  };
  contextManagement: {
    defaultMaxTokens: number;
    defaultMaxMessages: number;
    smartContextEnabled: boolean;
    useImportanceScoring: boolean;
  };
  summarization: {
    autoSummarizeThreads: boolean;
    summarizationTrigger: 'message_count' | 'time_elapsed' | 'topic_change';
    triggerThreshold: number;
  };
  retention: {
    threadRetentionDays: number;
    messageRetentionDays: number;
    archiveInactiveThreads: boolean;
    cleanupArchivedThreads: boolean;
  };
}

// Event interfaces for system integration
export interface ConversationEvent {
  type: ConversationEventType;
  timestamp: Date;
  userId: string;
  channelId: string;
  threadId?: number;
  data: Record<string, unknown>;
}

export type ConversationEventType = 
  | 'thread_created'
  | 'thread_updated'
  | 'thread_archived'
  | 'message_added'
  | 'topic_detected'
  | 'topic_changed'
  | 'summary_generated'
  | 'context_window_created';

/**
 * Conversation Summary Options
 */
export interface SummaryOptions {
  summaryType: 'brief' | 'detailed' | 'comprehensive';
  maxKeyPoints?: number;
  includeActionItems?: boolean;
  includeDecisions?: boolean;
  includeQuestions?: boolean;
  includeExcerpts?: boolean;
}

/**
 * Key Point from Conversation
 */
export interface KeyPoint {
  content: string;
  importance: number;
  timestamp: Date;
  category: string;
  tags: string[];
}

/**
 * Detailed Summary Result
 */
export interface DetailedSummaryResult {
  threadId: number;
  summaryText: string;
  keyPoints: KeyPoint[];
  actionItems: string[];
  decisions: string[];
  questions: string[];
  topics: string[];
  messageCount: number;
  userMessages: number;
  assistantMessages: number;
  averageImportance: number;
  timeSpan: {
    start: Date;
    end: Date;
  };
  generatedAt: Date;
  summaryType: string;
}
