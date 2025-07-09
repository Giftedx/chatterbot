/**
 * Smart Context Orchestrator Service
 * 
 * Advanced MCP-powered context builder that intelligently combines multiple data sources
 * to create the most comprehensive context possible for "super smart" AI responses.
 * This service goes beyond simple MCP tool execution to intelligent context synthesis.
 */

import { Message } from 'discord.js';
import { MCPManager } from '../mcp-manager.service.js';
import { UnifiedMessageAnalysis } from '../core/message-analysis.service.js';
import { UserCapabilities } from '../intelligence/permission.service.js';
import { logger } from '../../utils/logger.js';
import { DirectMCPExecutor, directMCPExecutor } from './direct-mcp-executor.service.js';
import { PersonalizationEngine, personalizationEngine } from './personalization-engine.service.js';
import { mcpManager } from '../mcp-manager.service.js';

export interface SmartContextResult {
  enhancedPrompt: string;
  contextSources: string[];
  confidence: number;
  realTimeData: boolean;
  personalizedInsights: boolean;
  knowledgeDepth: 'surface' | 'detailed' | 'comprehensive' | 'expert';
  contextMetadata: {
    memoryEntries: number;
    webSources: number;
    documentSources: number;
    personalizationFactors: number;
    processingTimeMs: number;
  };
}

export interface ContextOrchestrationStrategy {
  prioritizeRealTime: boolean;
  includePersonalHistory: boolean;
  deepWebResearch: boolean;
  crossReferenceMemory: boolean;
  synthesizeMultipleSources: boolean;
  adaptToUserExpertise: boolean;
  timeoutMs: number;
}

/**
 * Smart Context Orchestrator - The Brain Behind Super Smart Responses
 * 
 * This service intelligently orchestrates multiple MCP tools and data sources
 * to build the most comprehensive context possible for AI responses.
 */
export class SmartContextOrchestratorService {
  private mcpManager?: MCPManager;
  private personalizationEngine: PersonalizationEngine;
  private directExecutor: DirectMCPExecutor;

  constructor(
    mcpManager?: MCPManager,
    personalizationEngine?: PersonalizationEngine,
    directExecutor?: DirectMCPExecutor
    ) {
    this.mcpManager = mcpManager;
    this.personalizationEngine = personalizationEngine || new PersonalizationEngine(mcpManager);
    this.directExecutor = directExecutor || new DirectMCPExecutor();
  }

  /**
   * Build super smart context by intelligently combining multiple sources
   */
  public async buildSuperSmartContext(
    message: Message,
    analysis: UnifiedMessageAnalysis,
    capabilities: UserCapabilities,
    strategy: ContextOrchestrationStrategy = this.getDefaultStrategy()
  ): Promise<SmartContextResult> {
    const startTime = Date.now();
    const contextSources: string[] = [];
    let enhancedPrompt = message.content;
    let confidence = 0.5;
    let realTimeData = false;
    let personalizedInsights = false;
    
    const contextMetadata = {
      memoryEntries: 0,
      webSources: 0,
      documentSources: 0,
      personalizationFactors: 0,
      processingTimeMs: 0
    };

    try {
      // Phase 1: Memory and Personalization Context
      const personalContext = await this.buildPersonalizedContext(
        message
      );
      if (personalContext) {
        enhancedPrompt = personalContext.prompt;
        contextSources.push(...personalContext.sources);
        contextMetadata.memoryEntries = personalContext.memoryEntries;
        contextMetadata.personalizationFactors = personalContext.personalizationFactors;
        personalizedInsights = true;
        confidence += 0.2;
      }

      // Phase 2: Real-Time Information Context
      if (strategy.prioritizeRealTime && this.needsRealTimeInfo(message.content)) {
        const realTimeContext = await this.buildRealTimeContext(
          message.content
        );
        if (realTimeContext) {
          enhancedPrompt += `\n\n[REAL-TIME INFORMATION]\n${realTimeContext.content}`;
          contextSources.push(...realTimeContext.sources);
          contextMetadata.webSources = realTimeContext.sourceCount;
          realTimeData = true;
          confidence += 0.25;
        }
      }

      // Phase 3: Deep Knowledge Context
      if (strategy.deepWebResearch && this.needsDeepResearch(message.content, analysis)) {
        const knowledgeContext = await this.buildDeepKnowledgeContext(
          message.content
        );
        if (knowledgeContext) {
          enhancedPrompt += `\n\n[RESEARCH CONTEXT]\n${knowledgeContext.content}`;
          contextSources.push(...knowledgeContext.sources);
          contextMetadata.documentSources = knowledgeContext.sourceCount;
          confidence += 0.2;
        }
      }

      // Phase 3.5: Complexity-Based Context Enhancement
      if (analysis.complexity === 'complex' && contextSources.length < 3) {
        const complexityContext = await this.buildComplexityBasedContext(
          message.content, analysis
        );
        if (complexityContext) {
          enhancedPrompt += `\n\n[COMPLEXITY ANALYSIS]\n${complexityContext.content}`;
          contextSources.push(...complexityContext.sources);
          confidence += 0.15;
        }
      }

      // Phase 4: Cross-Reference and Synthesis
      if (strategy.crossReferenceMemory && contextSources.length > 1) {
        const synthesizedContext = await this.synthesizeContext(
          enhancedPrompt, contextSources
        );
        if (synthesizedContext) {
          enhancedPrompt = synthesizedContext.enhancedPrompt;
          confidence += 0.1;
        }
      }

      // Phase 5: User Expertise Adaptation
      if (strategy.adaptToUserExpertise) {
        const adaptedContext = await this.adaptContextToUserExpertise(
          enhancedPrompt, message.author.id
        );
        if (adaptedContext) {
          enhancedPrompt = adaptedContext.prompt;
          confidence = Math.min(confidence + 0.05, 1.0);
        }
      }

      contextMetadata.processingTimeMs = Date.now() - startTime;

      return {
        enhancedPrompt,
        contextSources,
        confidence: Math.min(confidence, 1.0),
        realTimeData,
        personalizedInsights,
        knowledgeDepth: this.determineKnowledgeDepth(contextSources.length, confidence),
        contextMetadata
      };

    } catch (error) {
      logger.error('Smart context orchestration failed', {
        operation: 'smart-context-orchestration',
        metadata: { error: String(error), userId: message.author.id }
      });

      // Fallback to basic context
      return {
        enhancedPrompt: message.content,
        contextSources: ['fallback'],
        confidence: 0.3,
        realTimeData: false,
        personalizedInsights: false,
        knowledgeDepth: 'surface',
        contextMetadata: {
          ...contextMetadata,
          processingTimeMs: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Build personalized context using memory and user patterns
   */
  private async buildPersonalizedContext(
    message: Message
  ): Promise<{ prompt: string; sources: string[]; memoryEntries: number; personalizationFactors: number } | null> {
    try {
      const sources: string[] = [];
      let prompt = message.content;
      let memoryEntries = 0;
      let personalizationFactors = 0;

      // Get user memory context
      if (this.mcpManager) {
        const memoryResult = await this.mcpManager.searchMemory(
          `user:${message.author.id} context:${message.content.slice(0, 100)}`
        );
        
        if (memoryResult && typeof memoryResult === 'object') {
          const memories = (memoryResult as { memories?: unknown[] }).memories || [];
          if (memories.length > 0) {
            const memoryContext = memories.slice(0, 3).map((m: unknown) => 
              typeof m === 'string' ? m : JSON.stringify(m)
            ).join('\n');
            
            prompt = `[USER MEMORY CONTEXT]\n${memoryContext}\n\nCurrent message: ${message.content}`;
            sources.push('user-memory');
            memoryEntries = memories.length;
            personalizationFactors++;
          }
        }
      }

      // Get personalization insights
      const personalizationResult = await this.personalizationEngine.adaptResponse(
        message.author.id,
        message.content,
        message.guildId || undefined
      );

      if (personalizationResult.personalizedResponse !== message.content) {
        prompt += `\n\n[PERSONALIZATION INSIGHTS]\n${personalizationResult.personalizedResponse}`;
        sources.push('personalization-engine');
        personalizationFactors += personalizationResult.adaptations.length;
      }

      return sources.length > 0 ? { prompt, sources, memoryEntries, personalizationFactors } : null;

    } catch (error) {
      logger.warn('Personalized context building failed', {
        operation: 'personalized-context',
        metadata: { error: String(error) }
      });
      return null;
    }
  }

  /**
   * Build real-time context using web search and current information
   */
  private async buildRealTimeContext(
    content: string
  ): Promise<{ content: string; sources: string[]; sourceCount: number } | null> {
    try {
      // Extract search queries from content
      const searchQueries = this.extractSearchQueries(content);
      if (searchQueries.length === 0) return null;

      const sources: string[] = [];
      let contextContent = '';
      let sourceCount = 0;

      // Execute web searches
      for (const query of searchQueries.slice(0, 3)) { // Limit to 3 queries
        const searchResult = await this.directExecutor.executeWebSearch(query, 5);
        
        if (searchResult.success && searchResult.data) {
          const results = (searchResult.data as { results?: { title: string; snippet?: string; description?: string }[] }).results || [];
          if (results.length > 0) {
            const searchSummary = results.slice(0, 3).map((r: { title: string; snippet?: string; description?: string }) => 
              `• ${r.title}: ${r.snippet || r.description || 'No description'}`
            ).join('\n');
            
            contextContent += `Search: "${query}"\n${searchSummary}\n\n`;
            sources.push(`web-search:${query}`);
            sourceCount += results.length;
          }
        }
      }

      return contextContent ? { content: contextContent.trim(), sources, sourceCount } : null;

    } catch (error) {
      logger.warn('Real-time context building failed', {
        operation: 'real-time-context',
        metadata: { error: String(error) }
      });
      return null;
    }
  }

  /**
   * Build deep knowledge context using content extraction and research
   */
  private async buildDeepKnowledgeContext(
    content: string
  ): Promise<{ content: string; sources: string[]; sourceCount: number } | null> {
    try {
      const urls = this.extractUrls(content);
      if (urls.length === 0) return null;

      const sources: string[] = [];
      let contextContent = '';
      let sourceCount = 0;

      // Extract content from URLs
      for (const url of urls.slice(0, 3)) { // Limit to 3 URLs
        const extractionResult = await this.directExecutor.executeContentExtraction([url]);
        
        if (extractionResult.success && extractionResult.data) {
          const results = (extractionResult.data as { results?: { content?: string; text?: string }[] }).results || [];
          if (results.length > 0) {
            const content = results[0].content || results[0].text || '';
            if (content) {
              contextContent += `Source: ${url}\nContent: ${content.slice(0, 500)}...\n\n`;
              sources.push(`content-extraction:${url}`);
              sourceCount++;
            }
          }
        }
      }

      return contextContent ? { content: contextContent.trim(), sources, sourceCount } : null;

    } catch (error) {
      logger.warn('Deep knowledge context building failed', {
        operation: 'deep-knowledge-context',
        metadata: { error: String(error) }
      });
      return null;
    }
  }

  /**
   * Build complexity-based context for complex messages
   */
  private async buildComplexityBasedContext(
    content: string,
    analysis: UnifiedMessageAnalysis
  ): Promise<{ content: string; sources: string[]; sourceCount: number } | null> {
    try {
      const sources: string[] = [];
      let contextContent = '';

      // Add complexity analysis context
      if (analysis.complexity === 'complex') {
        const topics = analysis.topics || [];
        contextContent += `This message requires advanced analysis due to: ${topics.join(', ')}\n`;
        sources.push('complexity-analysis');

        // Add topic-specific context for complex topics
        if (topics.some(topic => ['quantum', 'computing', 'physics', 'science'].includes(topic.toLowerCase()))) {
          contextContent += 'Scientific/technical topic detected - using advanced reasoning patterns.\n';
          sources.push('scientific-reasoning');
        }

        // Add MCP tools context if needed
        if (analysis.needsMCPTools) {
          contextContent += `MCP tools recommended: ${analysis.mcpRequirements.join(', ')}\n`;
          sources.push('mcp-analysis');
        }
      }

      return contextContent ? { content: contextContent.trim(), sources, sourceCount: sources.length } : null;

    } catch (error) {
      logger.warn('Complexity-based context building failed', {
        operation: 'complexity-context',
        metadata: { error: String(error) }
      });
      return null;
    }
  }

  /**
   * Synthesize multiple context sources for coherent understanding
   */
  private async synthesizeContext(
    prompt: string,
    sources: string[]
  ): Promise<{ enhancedPrompt: string } | null> {
    try {
      // Use sequential thinking to synthesize context if available
      const synthesisQuery = `Analyze and synthesize information from these sources: ${sources.join(', ')} 
        to better understand this user query: ${prompt.slice(0, 200)}`;
      
      const thinkingResult = await this.directExecutor.executeSequentialThinking(synthesisQuery);
      
      if (thinkingResult.success && thinkingResult.data) {
        const synthesis = (thinkingResult.data as { finalAnswer?: string }).finalAnswer || '';
        if (synthesis) {
          return {
            enhancedPrompt: `${prompt}\n\n[SYNTHESIZED CONTEXT]\n${synthesis}`
          };
        }
      }

      return null;

    } catch (error) {
      logger.warn('Context synthesis failed', {
        operation: 'context-synthesis',
        metadata: { error: String(error) }
      });
      return null;
    }
  }

  /**
   * Adapt context to user's expertise level
   */
  private async adaptContextToUserExpertise(
    prompt: string,
    userId: string
  ): Promise<{ prompt: string } | null> {
    try {
      // Get user expertise level from personalization engine
      const userInsights = await this.personalizationEngine.adaptResponse(
        userId,
        'expertise level assessment'
      );

      if (userInsights.adaptations.length > 0) {
        const expertiseLevel = this.inferExpertiseLevel(userInsights.adaptations);
        const adaptedPrompt = `${prompt}\n\n[USER EXPERTISE CONTEXT]\nUser expertise level: ${expertiseLevel}. Adapt response complexity accordingly.`;
        
        return { prompt: adaptedPrompt };
      }

      return null;

    } catch (error) {
      logger.warn('Expertise adaptation failed', {
        operation: 'expertise-adaptation',
        metadata: { error: String(error) }
      });
      return null;
    }
  }

  /**
   * Helper methods
   */
  private getDefaultStrategy(): ContextOrchestrationStrategy {
    return {
      prioritizeRealTime: true,
      includePersonalHistory: true,
      deepWebResearch: true,
      crossReferenceMemory: true,
      synthesizeMultipleSources: true,
      adaptToUserExpertise: true,
      timeoutMs: 15000 // 15 seconds
    };
  }

  private needsRealTimeInfo(content: string): boolean {
    const realTimeKeywords = [
      'current', 'latest', 'recent', 'today', 'now', 'breaking', 'news',
      'update', 'what\'s happening', 'status', 'live', 'real-time'
    ];
    
    return realTimeKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
  }

  private needsDeepResearch(content: string, analysis: UnifiedMessageAnalysis): boolean {
    return analysis.complexity === 'complex' || 
           analysis.needsMemoryOperation ||
           this.extractUrls(content).length > 0;
  }

  private extractSearchQueries(content: string): string[] {
    // Smart query extraction based on content analysis
    const queries: string[] = [];
    
    // If content contains questions, extract them as queries
    const questionPattern = /([^.!?]*\?)/g;
    const questions = content.match(questionPattern);
    if (questions) {
      queries.push(...questions.map(q => q.trim().replace(/\?$/, '')));
    }
    
    // Extract key topics
    const words = content.toLowerCase().split(/\s+/);
    const importantWords = words.filter(word => 
      word.length > 4 && 
      !['what', 'when', 'where', 'why', 'how', 'does', 'will', 'can'].includes(word)
    );
    
    if (importantWords.length > 0) {
      queries.push(importantWords.slice(0, 3).join(' '));
    }
    
    return queries.filter(q => q.length > 3);
  }

  private extractUrls(content: string): string[] {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return content.match(urlPattern) || [];
  }

  private determineKnowledgeDepth(sourceCount: number, confidence: number): SmartContextResult['knowledgeDepth'] {
    if (sourceCount >= 4 && confidence >= 0.8) return 'expert';
    if (sourceCount >= 3 && confidence >= 0.7) return 'comprehensive';
    if (sourceCount >= 2 && confidence >= 0.6) return 'detailed';
    return 'surface';
  }

  private inferExpertiseLevel(adaptations: { type: string; reason: string; basedOnPattern: string }[]): string {
    // Simple expertise inference based on adaptation patterns
    const technicalAdaptations = adaptations.filter(a => 
      a.basedOnPattern.includes('technical') || a.basedOnPattern.includes('expert')
    ).length;
    
    if (technicalAdaptations >= 3) return 'expert';
    if (technicalAdaptations >= 2) return 'intermediate';
    return 'beginner';
  }
}

// Export singleton instance
export const smartContextOrchestrator = new SmartContextOrchestratorService(
  mcpManager,
  personalizationEngine,
  directMCPExecutor
);
