/**
 * Topic Detection Service
 * AI-powered topic identification and classification for conversations
 */

import { 
  TopicDetectionResult, 
  DetectedTopic, 
  TopicDetectionOptions,
  TopicClassificationPattern,
  ConversationTopic 
} from './types.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

/**
 * Service for detecting and managing conversation topics
 */
export class TopicDetectionService {
  private readonly classificationPatterns: TopicClassificationPattern[];
  private readonly defaultOptions: TopicDetectionOptions;

  constructor() {
    this.classificationPatterns = this.initializeClassificationPatterns();
    this.defaultOptions = {
      confidenceThreshold: 0.3,
      maxTopics: 5,
      includeSecondaryTopics: true,
      useExistingTopics: true,
      categoryFilter: []
    };
  }

  /**
   * Detect topics in a message or conversation content
   */
  public async detectTopics(
    content: string, 
    options: TopicDetectionOptions = {}
  ): Promise<TopicDetectionResult> {
    const opts = { ...this.defaultOptions, ...options };
    const detectedTopics: DetectedTopic[] = [];
    
    try {
      // Run pattern-based detection
      const patternTopics = this.detectTopicsWithPatterns(content, opts);
      detectedTopics.push(...patternTopics);

      // Get existing topics from database for matching
      if (opts.useExistingTopics) {
        const existingMatches = await this.matchExistingTopics(content, opts);
        detectedTopics.push(...existingMatches);
      }

      // Sort by confidence and filter
      const filteredTopics = detectedTopics
        .filter(topic => topic.confidence >= opts.confidenceThreshold!)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, opts.maxTopics);

      // Determine primary and secondary topics
      const primaryTopic = filteredTopics.length > 0 ? filteredTopics[0].name : undefined;
      const secondaryTopics = opts.includeSecondaryTopics 
        ? filteredTopics.slice(1).map(t => t.name)
        : [];

      const averageConfidence = filteredTopics.length > 0 
        ? filteredTopics.reduce((sum, t) => sum + t.confidence, 0) / filteredTopics.length
        : 0;

      logger.debug('Topic detection completed', {
        operation: 'topic-detection',
        metadata: {
          contentLength: content.length,
          topicsDetected: filteredTopics.length,
          primaryTopic,
          averageConfidence
        }
      });

      return {
        topics: filteredTopics,
        confidence: averageConfidence,
        primaryTopic,
        secondaryTopics
      };

    } catch (error) {
      logger.error('Topic detection failed', {
        operation: 'topic-detection',
        error: String(error),
        metadata: { contentLength: content.length }
      });

      return {
        topics: [],
        confidence: 0,
        secondaryTopics: []
      };
    }
  }

  /**
   * Create or update a topic in the database
   */
  public async createOrUpdateTopic(topicData: {
    name: string;
    displayName: string;
    description?: string;
    category?: string;
  }): Promise<ConversationTopic | null> {
    try {
      const topic = await prisma.conversationTopic.upsert({
        where: { name: topicData.name },
        update: {
          displayName: topicData.displayName,
          description: topicData.description,
          category: topicData.category,
          lastMentioned: new Date(),
          frequency: { increment: 1 }
        },
        create: {
          name: topicData.name,
          displayName: topicData.displayName,
          description: topicData.description,
          category: topicData.category,
          frequency: 1,
          importance: 0.5
        }
      });

      return {
        id: topic.id,
        name: topic.name,
        displayName: topic.displayName,
        description: topic.description || undefined,
        category: topic.category || undefined,
        firstMentioned: topic.firstMentioned,
        lastMentioned: topic.lastMentioned,
        frequency: topic.frequency,
        importance: topic.importance
      };

    } catch (error) {
      logger.error('Failed to create/update topic', {
        operation: 'topic-management',
        error: String(error),
        metadata: { topicName: topicData.name }
      });
      return null;
    }
  }

  /**
   * Get popular topics by category or overall
   */
  public async getPopularTopics(
    category?: string, 
    limit: number = 20
  ): Promise<ConversationTopic[]> {
    try {
      const topics = await prisma.conversationTopic.findMany({
        where: category ? { category } : undefined,
        orderBy: [
          { frequency: 'desc' },
          { importance: 'desc' },
          { lastMentioned: 'desc' }
        ],
        take: limit
      });

      return topics.map((topic: any) => ({
        id: topic.id,
        name: topic.name,
        displayName: topic.displayName,
        description: topic.description || undefined,
        category: topic.category || undefined,
        firstMentioned: topic.firstMentioned,
        lastMentioned: topic.lastMentioned,
        frequency: topic.frequency,
        importance: topic.importance
      }));

    } catch (error) {
      logger.error('Failed to get popular topics', {
        operation: 'topic-retrieval',
        error: String(error),
        metadata: { category, limit }
      });
      return [];
    }
  }

  /**
   * Search topics by name or description
   */
  public async searchTopics(
    query: string, 
    limit: number = 10
  ): Promise<ConversationTopic[]> {
    try {
      const topics = await prisma.conversationTopic.findMany({
        where: {
          OR: [
            { name: { contains: query.toLowerCase() } },
            { displayName: { contains: query } },
            { description: { contains: query } }
          ]
        },
        orderBy: [
          { frequency: 'desc' },
          { importance: 'desc' }
        ],
        take: limit
      });

      return topics.map((topic: any) => ({
        id: topic.id,
        name: topic.name,
        displayName: topic.displayName,
        description: topic.description || undefined,
        category: topic.category || undefined,
        firstMentioned: topic.firstMentioned,
        lastMentioned: topic.lastMentioned,
        frequency: topic.frequency,
        importance: topic.importance
      }));

    } catch (error) {
      logger.error('Failed to search topics', {
        operation: 'topic-search',
        error: String(error),
        metadata: { query, limit }
      });
      return [];
    }
  }

  /**
   * Pattern-based topic detection using regex patterns
   */
  private detectTopicsWithPatterns(
    content: string, 
    options: TopicDetectionOptions
  ): DetectedTopic[] {
    const detected: DetectedTopic[] = [];
    const normalizedContent = content.toLowerCase();

    for (const pattern of this.classificationPatterns) {
      // Skip if category filter is set and doesn't match
      if (options.categoryFilter && options.categoryFilter.length > 0 &&
          !options.categoryFilter.includes(pattern.category)) {
        continue;
      }

      let matchCount = 0;
      const keywordMatches: string[] = [];

      // Check regex patterns
      for (const regex of pattern.patterns) {
        if (regex.test(normalizedContent)) {
          matchCount++;
        }
      }

      // Check keyword matches
      for (const keyword of pattern.keywords) {
        if (normalizedContent.includes(keyword.toLowerCase())) {
          matchCount++;
          keywordMatches.push(keyword);
        }
      }

      // Calculate confidence based on matches
      if (matchCount > 0) {
        const totalPatterns = pattern.patterns.length + pattern.keywords.length;
        const confidence = Math.min(
          (matchCount / totalPatterns) * pattern.confidence * pattern.priority,
          1.0
        );

        if (confidence >= options.confidenceThreshold!) {
          detected.push({
            name: this.generateTopicSlug(pattern.category),
            displayName: this.formatDisplayName(pattern.category),
            confidence,
            category: pattern.category,
            keywords: keywordMatches
          });
        }
      }
    }

    return detected;
  }

  /**
   * Match against existing topics in the database
   */
  private async matchExistingTopics(
    content: string, 
    options: TopicDetectionOptions
  ): Promise<DetectedTopic[]> {
    try {
      const normalizedContent = content.toLowerCase();
      const existingTopics = await prisma.conversationTopic.findMany({
        where: options.categoryFilter && options.categoryFilter.length > 0 
          ? { category: { in: options.categoryFilter } }
          : undefined,
        orderBy: { frequency: 'desc' },
        take: 100 // Limit for performance
      });

      const matches: DetectedTopic[] = [];

      for (const topic of existingTopics) {
        let confidence = 0;
        const keywords: string[] = [];

        // Check if topic name appears in content
        if (normalizedContent.includes(topic.name.replace('-', ' '))) {
          confidence += 0.8;
          keywords.push(topic.name);
        }

        // Check display name
        if (normalizedContent.includes(topic.displayName.toLowerCase())) {
          confidence += 0.9;
          keywords.push(topic.displayName);
        }

        // Check description words if available
        if (topic.description) {
          const descWords = topic.description.toLowerCase().split(/\s+/);
          for (const word of descWords) {
            if (word.length > 3 && normalizedContent.includes(word)) {
              confidence += 0.1;
              keywords.push(word);
            }
          }
        }

        // Boost confidence based on topic popularity
        confidence *= (1 + Math.log(topic.frequency) / 10);
        confidence = Math.min(confidence, 1.0);

        if (confidence >= options.confidenceThreshold!) {
          matches.push({
            name: topic.name,
            displayName: topic.displayName,
            confidence,
            category: topic.category || undefined,
            keywords
          });
        }
      }

      return matches;

    } catch (error) {
      logger.warn('Failed to match existing topics', {
        operation: 'topic-matching',
        error: String(error)
      });
      return [];
    }
  }

  /**
   * Initialize classification patterns for topic detection
   */
  private initializeClassificationPatterns(): TopicClassificationPattern[] {
    return [
      // Programming Languages
      {
        category: 'python-programming',
        patterns: [
          /\b(python|py|pip|django|flask|pandas|numpy)\b/i,
          /\b(def |class |import |from .+ import)\b/i
        ],
        keywords: ['python', 'django', 'flask', 'pip', 'pandas', 'numpy', 'scikit-learn'],
        confidence: 0.9,
        priority: 1.2
      },
      {
        category: 'javascript-programming',
        patterns: [
          /\b(javascript|js|node\.?js|npm|yarn|react|vue|angular)\b/i,
          /\b(function|const|let|var|async|await)\b/i
        ],
        keywords: ['javascript', 'nodejs', 'react', 'vue', 'angular', 'npm', 'typescript'],
        confidence: 0.9,
        priority: 1.2
      },
      {
        category: 'web-development',
        patterns: [
          /\b(html|css|frontend|backend|fullstack|api|rest|graphql)\b/i,
          /\b(website|web app|responsive|bootstrap|tailwind)\b/i
        ],
        keywords: ['html', 'css', 'frontend', 'backend', 'api', 'rest', 'graphql'],
        confidence: 0.8,
        priority: 1.1
      },
      
      // Technologies and Frameworks
      {
        category: 'database',
        patterns: [
          /\b(sql|mysql|postgresql|mongodb|redis|database|db)\b/i,
          /\b(select|insert|update|delete|join|where)\b/i
        ],
        keywords: ['sql', 'mysql', 'postgresql', 'mongodb', 'database', 'nosql'],
        confidence: 0.8,
        priority: 1.1
      },
      {
        category: 'machine-learning',
        patterns: [
          /\b(machine learning|ml|ai|artificial intelligence|neural network)\b/i,
          /\b(tensorflow|pytorch|scikit|keras|model|training)\b/i
        ],
        keywords: ['machine learning', 'ai', 'tensorflow', 'pytorch', 'model', 'neural'],
        confidence: 0.9,
        priority: 1.3
      },
      
      // Development Tools
      {
        category: 'git-version-control',
        patterns: [
          /\b(git|github|gitlab|version control|commit|push|pull|merge)\b/i,
          /\b(branch|checkout|clone|repository|repo)\b/i
        ],
        keywords: ['git', 'github', 'commit', 'push', 'pull', 'merge', 'branch'],
        confidence: 0.8,
        priority: 1.0
      },
      {
        category: 'devops-deployment',
        patterns: [
          /\b(docker|kubernetes|aws|cloud|deployment|ci\/cd|jenkins)\b/i,
          /\b(container|orchestration|microservices|infrastructure)\b/i
        ],
        keywords: ['docker', 'kubernetes', 'aws', 'deployment', 'cloud', 'container'],
        confidence: 0.8,
        priority: 1.1
      },
      
      // Problem Solving
      {
        category: 'debugging',
        patterns: [
          /\b(debug|error|bug|fix|issue|problem|troubleshoot)\b/i,
          /\b(exception|trace|stack trace|crash|fail)\b/i
        ],
        keywords: ['debug', 'error', 'bug', 'fix', 'troubleshoot', 'exception'],
        confidence: 0.7,
        priority: 1.2
      },
      {
        category: 'code-review',
        patterns: [
          /\b(code review|refactor|optimize|improve|clean code)\b/i,
          /\b(best practice|performance|maintainable|readable)\b/i
        ],
        keywords: ['code review', 'refactor', 'optimize', 'best practice', 'performance'],
        confidence: 0.7,
        priority: 1.0
      },
      
      // Learning and Support
      {
        category: 'learning',
        patterns: [
          /\b(learn|tutorial|guide|how to|beginner|course|study)\b/i,
          /\b(documentation|docs|example|practice|exercise)\b/i
        ],
        keywords: ['learn', 'tutorial', 'guide', 'beginner', 'course', 'documentation'],
        confidence: 0.6,
        priority: 0.9
      },
      {
        category: 'general-help',
        patterns: [
          /\b(help|support|question|ask|explain|clarify)\b/i,
          /\b(what is|how does|why|when|where)\b/i
        ],
        keywords: ['help', 'support', 'question', 'explain', 'what is', 'how does'],
        confidence: 0.5,
        priority: 0.8
      }
    ];
  }

  /**
   * Generate URL-friendly topic slug
   */
  private generateTopicSlug(category: string): string {
    return category.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Format display name for topics
   */
  private formatDisplayName(category: string): string {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
