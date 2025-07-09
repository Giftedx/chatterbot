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
        const recommendations: PersonalizedRecommendation[] = [];

        // Tool recommendations based on usage patterns
        const toolRecommendations = await this.generateToolRecommendations(pattern);
        recommendations.push(...toolRecommendations);

        // Learning path recommendations
        const learningRecommendations = this.generateLearningRecommendations(pattern);
        recommendations.push(...learningRecommendations);

        // Workflow optimization recommendations
        const workflowRecommendations = this.generateWorkflowRecommendations(pattern);
        recommendations.push(...workflowRecommendations);

        // Context-specific recommendations
        if (context) {
          const contextualRecommendations = this.generateContextualRecommendations(pattern, context);
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
          mostActiveTimeOfDay: 12,
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
   * Generate tool recommendations based on patterns and MCP availability
   */
  private async generateToolRecommendations(
    pattern: UserInteractionPattern
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

    return recommendations;
  }

  /**
   * Get available MCP tools from connected servers with enhanced mapping
   * Based on the comprehensive MCP server configuration and phased deployment
   */
  private async getAvailableMCPTools(): Promise<string[]> {
    if (!this.mcpManager) return [];

    try {
      const status = this.mcpManager.getStatus();
      const availableTools: string[] = [];

      // Enhanced mapping based on MCP server configuration phases
      for (const [serverName, serverStatus] of Object.entries(status.serverStatus)) {
        if (serverStatus.connected) {
          switch (serverName) {
            // Phase 1: Foundation (Critical Priority)
            case 'memory':
              availableTools.push('persistent-memory', 'cross-session-learning', 'knowledge-graph', 'entity-relationships');
              break;
            case 'discord':
              availableTools.push('advanced-discord-api', 'channel-management', 'user-interaction-analytics');
              break;

            // Phase 2: Enhanced Knowledge (High Priority)
            case 'brave_search':
              availableTools.push('real-time-web-search', 'current-events', 'news-search', 'privacy-focused-search');
              break;
            case 'firecrawl':
              availableTools.push('content-extraction', 'url-analysis', 'web-scraping', 'page-analysis');
              break;
            case 'filesystem':
              availableTools.push('file-processing', 'document-analysis', 'secure-file-operations');
              break;

            // Phase 3: Specialized Data (Medium Priority)
            case 'postgres':
              availableTools.push('database-query', 'schema-inspection', 'data-analytics', 'postgres-analysis');
              break;
            case 'sqlite':
              availableTools.push('local-database', 'data-query', 'sqlite-analytics', 'local-data-ops');
              break;
            case 'github':
              availableTools.push('repo-management', 'code-analysis', 'issue-tracking', 'developer-tools');
              break;

            // Phase 4: Advanced Processing (Medium Priority)
            case 'sequential_thinking':
              availableTools.push('advanced-reasoning', 'multi-step-analysis', 'logical-reasoning', 'problem-decomposition');
              break;
            case 'playwright':
              availableTools.push('browser-automation', 'web-interaction', 'screenshot-capture', 'web-testing');
              break;

            // Phase 5: Optional Enhancement (Low Priority)
            case 'code_execution':
              availableTools.push('sandboxed-execution', 'data-processing', 'script-running', 'code-analysis');
              break;

            default:
              // Generic capability mapping for unknown servers
              availableTools.push(`${serverName}-capabilities`);
          }
        }
      }

      logger.info('MCP tools inventory completed', {
        operation: 'mcp-tools-inventory',
        metadata: { 
          availableServers: Object.keys(status.serverStatus).filter(name => status.serverStatus[name].connected),
          totalTools: availableTools.length,
          connectedServers: status.connectedServers
        }
      });

      return availableTools;
    } catch (error) {
      logger.error('Failed to get available MCP tools', { error: String(error) });
      return [];
    }
  }

  /**
   * Generate MCP-specific recommendations based on available servers and user patterns
   * Implements intelligent tool suggestions aligned with phased MCP deployment strategy
   */
  private async generateMCPSpecificRecommendations(pattern: UserInteractionPattern): Promise<PersonalizedRecommendation[]> {
    const recommendations: PersonalizedRecommendation[] = [];

    try {
      const availableTools = await this.getAvailableMCPTools();
      const interests = pattern.responsePreferences.topicInterests;
      const interactionCount = pattern.behaviorMetrics.commonQuestionTypes.length;
      const mcpStatus = this.mcpManager?.getStatus();

      // Phase-based recommendation strategy
      const phaseBasedRecommendations = this.generatePhaseBasedRecommendations(availableTools, mcpStatus);
      recommendations.push(...phaseBasedRecommendations);

      // Research and Information Gathering (leveraging Phase 2 capabilities)
      if (interests.includes('research') || interests.includes('current events') || interests.includes('science')) {
        if (availableTools.includes('real-time-web-search')) {
          recommendations.push({
            type: 'tool',
            priority: 'high',
            title: 'AI-Powered Research Assistant',
            description: 'Access live web data with privacy-focused search for up-to-date research and current events',
            actionableSteps: [
              'Ask me to search for recent developments in your field of interest',
              'Request analysis of current trends and breaking news',
              'Combine web search with content extraction for comprehensive research'
            ],
            expectedBenefit: 'Always current information beyond my training data with privacy protection',
            confidenceScore: 0.9,
            basedOn: ['Research interest detected', 'Brave Search MCP server active', 'Phase 2 capabilities']
          });
        }

        if (availableTools.includes('content-extraction')) {
          recommendations.push({
            type: 'workflow',
            priority: 'high',
            title: 'Advanced Content Analysis Pipeline',
            description: 'Deep content extraction and analysis using Firecrawl for comprehensive document processing',
            actionableSteps: [
              'Share research papers or articles for AI-powered analysis',
              'Request key insights extraction from multiple sources',
              'Get comparative analysis across websites and documents'
            ],
            expectedBenefit: 'Professional-grade content analysis in seconds',
            confidenceScore: 0.85,
            basedOn: ['Research patterns', 'Firecrawl MCP server', 'Phase 2 deployment']
          });
        }
      }

      // Developer and Technical Users (leveraging Phase 3 capabilities)
      if (interests.includes('technology') || interests.includes('programming') || interests.includes('development')) {
        if (availableTools.includes('repo-management')) {
          recommendations.push({
            type: 'tool',
            priority: 'high',
            title: 'GitHub Integration Assistant',
            description: 'Comprehensive repository management and code analysis with GitHub MCP integration',
            actionableSteps: [
              'Ask me to analyze repository structure and code quality',
              'Request automated issue tracking and management',
              'Get insights on development patterns and collaboration'
            ],
            expectedBenefit: 'Streamlined development workflow with AI-assisted code management',
            confidenceScore: 0.9,
            basedOn: ['Technical interest patterns', 'GitHub MCP server', 'Phase 3 capabilities']
          });
        }

        if (availableTools.includes('advanced-reasoning')) {
          recommendations.push({
            type: 'tool',
            priority: 'high',
            title: 'Sequential Thinking Engine',
            description: 'Multi-step logical reasoning for complex technical challenges and architectural decisions',
            actionableSteps: [
              'Present complex architectural decisions for systematic analysis',
              'Request step-by-step debugging strategies with logical reasoning',
              'Get structured approaches to algorithm optimization'
            ],
            expectedBenefit: 'Professional-grade problem-solving with transparent reasoning process',
            confidenceScore: 0.9,
            basedOn: ['Technical complexity patterns', 'Sequential Thinking MCP', 'Phase 4 capabilities']
          });
        }
      }

      // Data Analysis and Business Intelligence (leveraging Phase 3 database capabilities)
      if (interests.includes('business') || interests.includes('data') || interests.includes('analytics')) {
        if (availableTools.includes('database-query') || availableTools.includes('local-database')) {
          recommendations.push({
            type: 'tool',
            priority: 'high',
            title: 'Intelligent Database Analytics',
            description: 'Advanced data querying and analysis with PostgreSQL/SQLite MCP integration',
            actionableSteps: [
              'Ask me to analyze data patterns in your database',
              'Request automated schema inspection and optimization suggestions',
              'Get business intelligence insights from your data'
            ],
            expectedBenefit: 'Professional data analysis without complex query writing',
            confidenceScore: 0.85,
            basedOn: ['Data interest patterns', 'Database MCP servers', 'Phase 3 deployment']
          });
        }
      }

      // Enhanced Memory and Personalization (leveraging Phase 1 foundation)
      if (interactionCount >= 5) {
        if (availableTools.includes('persistent-memory') || availableTools.includes('knowledge-graph')) {
          recommendations.push({
            type: 'workflow',
            priority: 'high',
            title: 'Advanced Memory Continuity System',
            description: 'Build sophisticated context and knowledge graphs across conversations with persistent memory',
            actionableSteps: [
              'Let me remember complex project details and preferences',
              'Reference previous conversations and build on past discussions',
              'Create knowledge relationships for long-term collaboration'
            ],
            expectedBenefit: 'Seamless conversation continuity with intelligent context retention',
            confidenceScore: 0.85,
            basedOn: ['Frequent usage patterns', 'Memory MCP integration', 'Phase 1 foundation']
          });

          recommendations.push({
            type: 'tool',
            priority: 'high',
            title: 'Personalized Knowledge Graph',
            description: 'Leverage cross-session learning and entity relationships for truly personalized assistance',
            actionableSteps: [
              'Ask me to track and remember your project milestones',
              'Reference past decisions and outcomes in new contexts',
              'Build comprehensive knowledge about your work patterns'
            ],
            expectedBenefit: 'AI assistant that truly knows and adapts to your working style',
            confidenceScore: 0.9,
            basedOn: ['Frequent interactions', 'Knowledge graph capabilities', 'Phase 1 critical priority']
          });
        }
      }

      // Content Creation and Automation (leveraging Phase 4 browser capabilities)
      const hasContentCreationPattern = interests.includes('art') || interests.includes('creative') ||
        pattern.behaviorMetrics.commonQuestionTypes.some(type => 
          type.includes('generate') || type.includes('create') || type.includes('design')
        );

      if (hasContentCreationPattern) {
        if (availableTools.includes('browser-automation')) {
          recommendations.push({
            type: 'tool',
            priority: 'medium',
            title: 'Intelligent Web Automation',
            description: 'Browser automation and web interaction using Playwright for content creation workflows',
            actionableSteps: [
              'Automate repetitive web-based tasks and content gathering',
              'Create automated screenshot and web interaction workflows',
              'Generate web-based content and interaction reports'
            ],
            expectedBenefit: 'Streamlined content creation with intelligent web automation',
            confidenceScore: 0.8,
            basedOn: ['Content creation patterns', 'Playwright MCP server', 'Phase 4 automation']
          });
        }
      }

      // Security and File Processing (leveraging Phase 2 filesystem capabilities)
      if (availableTools.includes('secure-file-operations')) {
        recommendations.push({
          type: 'workflow',
          priority: 'medium',
          title: 'Secure Document Processing',
          description: 'Safe file operations and document analysis with sandboxed filesystem access',
          actionableSteps: [
            'Upload and analyze documents securely within controlled environment',
            'Process multiple file formats with automated content extraction',
            'Generate insights from uploaded documents and files'
          ],
          expectedBenefit: 'Professional document processing with enterprise-grade security',
          confidenceScore: 0.8,
          basedOn: ['File processing patterns', 'Filesystem MCP server', 'Phase 2 security']
        });
      }

    } catch (error) {
      logger.error('Failed to generate MCP-specific recommendations', { 
        error: String(error),
        operation: 'mcp-recommendations-generation'
      });
    }

    return recommendations;
  }

  /**
   * Generate phase-based recommendations based on MCP deployment status
   */
  private generatePhaseBasedRecommendations(
    availableTools: string[], 
    mcpStatus?: { connectedServers: number; totalServers: number; serverStatus: Record<string, { connected: boolean; phase: number; priority: string }> }
  ): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];

    if (!mcpStatus) return recommendations;

    const connectedServers = mcpStatus.connectedServers || 0;
    const totalServers = mcpStatus.totalServers || 0;
    const deploymentProgress = totalServers > 0 ? (connectedServers / totalServers) * 100 : 0;

    // Deployment progress recommendations
    if (deploymentProgress < 50) {
      recommendations.push({
        type: 'workflow',
        priority: 'medium',
        title: 'MCP Enhancement Opportunity',
        description: `Unlock ${totalServers - connectedServers} additional AI capabilities by completing MCP server setup`,
        actionableSteps: [
          'Check environment variables for missing API keys',
          'Review MCP server configuration for Phase 2+ capabilities',
          'Gradually enable additional servers for enhanced functionality'
        ],
        expectedBenefit: 'Significantly expanded AI capabilities and intelligence',
        confidenceScore: 0.7,
        basedOn: ['MCP deployment analysis', `${connectedServers}/${totalServers} servers active`]
      });
    } else if (deploymentProgress >= 80) {
      recommendations.push({
        type: 'workflow',
        priority: 'low',
        title: 'Advanced MCP Mastery',
        description: 'Leverage your comprehensive MCP setup for complex, multi-tool workflows',
        actionableSteps: [
          'Combine multiple MCP tools for sophisticated analysis pipelines',
          'Create automated workflows using browser + database + search integration',
          'Explore advanced use cases with your complete MCP toolkit'
        ],
        expectedBenefit: 'Expert-level AI assistance with full MCP integration benefits',
        confidenceScore: 0.9,
        basedOn: ['Advanced MCP deployment', `${connectedServers}/${totalServers} servers active`]
      });
    }

    return recommendations;
  }

  /**
   * Generate learning path recommendations
   */
  private generateLearningRecommendations(
    pattern: UserInteractionPattern
  ): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];

    // Analyze user's proficiency level
    const totalInteractions = pattern.behaviorMetrics.commonQuestionTypes.length;
    
    if (totalInteractions < 10) {
      recommendations.push({
        type: 'learning',
        priority: 'high',
        title: 'AI Collaboration Basics',
        description: 'Learn how to effectively collaborate with AI for better results',
        actionableSteps: [
          'Try asking questions in different ways',
          'Experiment with providing more context',
          'Ask for examples when learning new concepts'
        ],
        expectedBenefit: 'More effective AI interactions and better responses',
        confidenceScore: 0.8,
        basedOn: ['New user interaction patterns']
      });
    }

    return recommendations;
  }

  /**
   * Generate workflow optimization recommendations
   */
  private generateWorkflowRecommendations(
    pattern: UserInteractionPattern
  ): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];

    // Analyze repetitive patterns
    const questionTypes = pattern.behaviorMetrics.commonQuestionTypes;
    const typeFrequency = new Map<string, number>();
    
    questionTypes.forEach(type => {
      typeFrequency.set(type, (typeFrequency.get(type) || 0) + 1);
    });

    const repetitiveTypes = Array.from(typeFrequency.entries())
      .filter(([, count]) => count > 3)
      .map(([type]) => type);

    if (repetitiveTypes.length > 0) {
      recommendations.push({
        type: 'workflow',
        priority: 'medium',
        title: 'Streamline Repetitive Tasks',
        description: 'Optimize your workflow for common question patterns',
        actionableSteps: [
          'Create templates for frequently asked questions',
          'Use more comprehensive initial queries',
          'Leverage context from previous interactions'
        ],
        expectedBenefit: 'Faster results for routine tasks and improved efficiency',
        confidenceScore: 0.7,
        basedOn: ['Repetitive interaction patterns', 'Workflow analysis']
      });
    }

    return recommendations;
  }

  /**
   * Generate contextual recommendations based on current query
   */
  private generateContextualRecommendations(
    pattern: UserInteractionPattern,
    context: string
  ): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];
    const contextLower = context.toLowerCase();

    // Extract interests from current context to enhance pattern
    this.extractTopicInterests(context, pattern);

    // Research and current events context
    if (contextLower.includes('research') || contextLower.includes('current events') || 
        contextLower.includes('study') || contextLower.includes('investigation')) {
      recommendations.push({
        type: 'tool',
        priority: 'high',
        title: 'Real-Time Research Assistant',
        description: 'Access live web data for up-to-date research and current events',
        actionableSteps: [
          'Ask me to search for recent developments in your field',
          'Request analysis of current trends and news',
          'Combine web search with content extraction for deep dives'
        ],
        expectedBenefit: 'Always current information beyond my training data',
        confidenceScore: 0.9,
        basedOn: ['Research context detected', 'Real-time web search capability']
      });
    }

    // Document analysis and content context
    if (contextLower.includes('document') || contextLower.includes('analysis') || 
        contextLower.includes('content') || contextLower.includes('analyze')) {
      recommendations.push({
        type: 'tool',
        priority: 'high',
        title: 'Smart Content Analysis',
        description: 'Advanced content extraction and analysis for documents and websites',
        actionableSteps: [
          'Share documents or URLs for instant analysis',
          'Get summaries and key insights automatically',
          'Compare information across multiple sources'
        ],
        expectedBenefit: 'Deep content understanding with automated analysis',
        confidenceScore: 0.85,
        basedOn: ['Content analysis context', 'Firecrawl MCP server']
      });
    }

    // Complex reasoning and strategic context
    if (contextLower.includes('complex') || contextLower.includes('strategic') || 
        contextLower.includes('problem solving') || contextLower.includes('reasoning') ||
        contextLower.includes('planning') || contextLower.includes('decision')) {
      recommendations.push({
        type: 'tool',
        priority: 'high',
        title: 'Advanced Reasoning Engine',
        description: 'Multi-step complex reasoning for strategic problem solving',
        actionableSteps: [
          'Present complex challenges for systematic analysis',
          'Request step-by-step reasoning for difficult problems',
          'Get structured approaches to strategic decisions'
        ],
        expectedBenefit: 'Systematic approach to complex reasoning and analysis',
        confidenceScore: 0.9,
        basedOn: ['Complex reasoning context', 'Sequential thinking capability']
      });
    }

    // URL/Link detection (original functionality)
    if (contextLower.includes('url') || contextLower.includes('http') || contextLower.includes('link')) {
      recommendations.push({
        type: 'tool',
        priority: 'high',
        title: 'Enhanced Content Analysis',
        description: 'Extract and analyze content from the shared URLs',
        actionableSteps: [
          'Ask me to analyze the content of your links',
          'Request summaries or key insights',
          'Compare information across multiple sources'
        ],
        expectedBenefit: 'Deep content understanding without manual reading',
        confidenceScore: 0.9,
        basedOn: ['URL detected in context', 'Content extraction capability']
      });
    }

    return recommendations;
  }

  /**
   * Get tool benefits description
   */
  private getToolBenefits(tools: string[]): string {
    const benefits = tools.map(tool => {
      switch (tool) {
        case 'memory':
        case 'persistent-memory':
          return 'remember context across conversations';
        case 'web-search':
        case 'real-time-web-search':
          return 'access current information beyond training data';
        case 'content-extraction':
          return 'analyze web content and documents in depth';
        case 'sequential-thinking':
        case 'advanced-reasoning':
          return 'solve complex problems with structured thinking';
        case 'file-analysis':
          return 'process and analyze uploaded files';
        case 'browser-automation':
          return 'interact with web pages dynamically';
        default:
          return `leverage ${tool} capabilities`;
      }
    });

    return benefits.join(', ');
  }

  /**
   * Extract topic interests from conversation context
   */
  private extractTopicInterests(conversationContext: string, pattern: UserInteractionPattern): void {
    const context = conversationContext.toLowerCase();
    
    // Define topic keywords
    const topicKeywords = {
      'research': ['research', 'study', 'analysis', 'investigation'],
      'technology': ['technology', 'tech', 'programming', 'coding', 'development'],
      'current events': ['current', 'news', 'recent', 'latest', 'today'],
      'science': ['science', 'scientific', 'experiment', 'data'],
      'business': ['business', 'marketing', 'strategy', 'management'],
      'education': ['education', 'learning', 'teaching', 'academic'],
      'art': ['art', 'creative', 'design', 'visual'],
      'health': ['health', 'medical', 'wellness', 'fitness'],
      'entertainment': ['entertainment', 'movies', 'music', 'games']
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => context.includes(keyword))) {
        if (!pattern.responsePreferences.topicInterests.includes(topic)) {
          pattern.responsePreferences.topicInterests.push(topic);
          // Keep only recent interests
          if (pattern.responsePreferences.topicInterests.length > 10) {
            pattern.responsePreferences.topicInterests.shift();
          }
        }
      }
    }
  }

  /**
   * Calculate adaptation confidence based on available data
   */
  private calculateAdaptationConfidence(
    pattern: UserInteractionPattern,
    adaptations: AdaptiveResponse['adaptations']
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on interaction history
    const interactionCount = pattern.behaviorMetrics.commonQuestionTypes.length;
    if (interactionCount > 10) confidence += 0.2;
    if (interactionCount > 50) confidence += 0.1;

    // Increase confidence based on feedback scores
    if (pattern.behaviorMetrics.feedbackScores.length > 5) {
      const avgSatisfaction = pattern.behaviorMetrics.feedbackScores.reduce((a, b) => a + b, 0) / pattern.behaviorMetrics.feedbackScores.length;
      if (avgSatisfaction >= 4) confidence += 0.15;
    }

    // Increase confidence based on adaptation count
    confidence += Math.min(adaptations.length * 0.05, 0.15);

    // Boost confidence if MCP tools are available
    if (this.mcpManager) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate most active hour from pattern data
   */
  private calculateMostActiveHour(pattern: UserInteractionPattern, currentHour: number): number {
    // Simple implementation - could be enhanced with more sophisticated time analysis
    return currentHour;
  }

  /**
   * Make response more casual
   */
  private makeCasual(response: string): string {
    return response
      .replace(/\bHowever,/g, 'But')
      .replace(/\bTherefore,/g, 'So')
      .replace(/\bFurthermore,/g, 'Also')
      .replace(/\bI would recommend/g, "I'd suggest")
      .replace(/\bYou should consider/g, 'You might want to')
      .replace(/\bIt is important to note/g, 'Worth noting');
  }

  /**
   * Make response more technical
   */
  private makeTechnical(response: string): string {
    return response
      .replace(/\buse\b/g, 'utilize')
      .replace(/\bhelp\b/g, 'facilitate')
      .replace(/\bshow\b/g, 'demonstrate')
      .replace(/\bbetter\b/g, 'optimal')
      .replace(/\bfind\b/g, 'identify')
      .replace(/\bmake\b/g, 'implement');
  }

  /**
   * Shorten response for users who prefer brevity
   */
  private shortenResponse(response: string): string {
    const sentences = response.split('.').filter(s => s.trim().length > 0);
    if (sentences.length <= 3) return response;
    
    // Keep first 2 and last sentence
    return sentences.slice(0, 2).join('.') + '. ' + sentences[sentences.length - 1] + '.';
  }

  /**
   * Expand response with more detail
   */
  private expandResponse(response: string): string {
    // Add transition phrases and elaboration
    return response
      .replace(/\. ([A-Z])/g, '. Additionally, $1')
      .replace(/\bThis\b/g, 'This approach')
      .replace(/\bThat\b/g, 'That method');
  }

  /**
   * Add examples to response
   */
  private addExamples(response: string): string {
    // Simple implementation - could be enhanced with AI-generated examples
    if (!response.includes('example') && !response.includes('Example')) {
      return response + '\n\nFor example, you could try asking more specific questions about your particular use case.';
    }
    return response;
  }

  /**
   * Start periodic learning process
   */
  private startPeriodicLearning(): void {
    // Run learning analysis every hour
    setInterval(async () => {
      try {
        await this.performPeriodicLearning();
      } catch (error) {
        logger.error('Periodic learning failed', {
          operation: 'periodic-learning',
          metadata: { error: String(error) }
        });
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Perform periodic learning analysis
   */
  private async performPeriodicLearning(): Promise<void> {
    for (const [patternKey, pattern] of this.userPatterns.entries()) {
      try {
        // Generate insights for each user
        await this.generateLearningInsights(pattern.userId, pattern);
        
        // Clean up old adaptation history
        if (pattern.adaptationHistory.length > 100) {
          pattern.adaptationHistory.splice(0, pattern.adaptationHistory.length - 50);
        }
      } catch (error) {
        logger.error('Failed to process periodic learning for user', {
          operation: 'periodic-learning',
          metadata: { patternKey, error: String(error) }
        });
      }
    }

    logger.info('Periodic learning analysis completed', {
      operation: 'periodic-learning',
      metadata: { processedUsers: this.userPatterns.size }
    });
  }

  /**
   * Get personalization metrics for analytics
   */
  getPersonalizationMetrics(): {
    totalUsers: number;
    totalInteractions: number;
    averageInteractionsPerUser: number;
    recommendationAccuracy: number;
    averageConfidence: number;
  } {
    const totalUsers = this.userPatterns.size;
    const totalInteractions = Array.from(this.userPatterns.values())
      .reduce((sum, pattern) => sum + pattern.behaviorMetrics.commonQuestionTypes.length, 0);
    
    const averageInteractionsPerUser = totalUsers > 0 ? totalInteractions / totalUsers : 0;
    
    // Calculate average satisfaction as proxy for recommendation accuracy
    const allFeedbackScores = Array.from(this.userPatterns.values())
      .flatMap(pattern => pattern.behaviorMetrics.feedbackScores);
    
    const recommendationAccuracy = allFeedbackScores.length > 0 
      ? allFeedbackScores.reduce((sum, score) => sum + score, 0) / allFeedbackScores.length / 5 // Normalize to 0-1
      : 0.5; // Default value

    // Calculate average confidence from recent adaptations
    const allAdaptations = Array.from(this.userPatterns.values())
      .flatMap(pattern => pattern.adaptationHistory);
    
    const averageConfidence = allAdaptations.length > 0
      ? allAdaptations.reduce((sum, adaptation) => sum + adaptation.effectivenessScore, 0) / allAdaptations.length
      : 0.5; // Default value

    return {
      totalUsers,
      totalInteractions,
      averageInteractionsPerUser,
      recommendationAccuracy,
      averageConfidence
    };
  }
}

export const personalizationEngine = new PersonalizationEngine();
