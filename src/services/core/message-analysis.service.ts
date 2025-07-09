/**
 * Unified Message Analysis Service
 * 
 * Consolidates message analysis capabilities from both intelligence and enhanced-intelligence modules.
 * Provides comprehensive analysis for all intelligence tiers with consistent interfaces.
 */

import { Message, Attachment } from 'discord.js';
import { UserCapabilities } from '../intelligence/permission.service.js';
import { logger } from '../../utils/logger.js';

export interface AttachmentAnalysis {
  type: 'image' | 'audio' | 'document' | 'video' | 'unknown';
  analysisNeeded: boolean;
  suggestedService: string;
  processingPriority: 'high' | 'medium' | 'low';
}

export interface AttachmentInfo {
  name: string;
  url: string;
  contentType?: string;
}

export interface UnifiedMessageAnalysis {
  // Core analysis (compatible with both systems)
  hasAttachments: boolean;
  hasUrls: boolean;
  attachmentTypes: string[];
  urls: string[];
  complexity: 'simple' | 'moderate' | 'complex' | 'advanced';
  intents: string[];
  requiredTools: string[];
  
  // Enhanced analysis capabilities
  needsPersonaSwitch: boolean;
  suggestedPersona?: string;
  needsAdminFeatures: boolean;
  adminCommands: string[];
  needsMultimodal: boolean;
  attachmentAnalysis: AttachmentAnalysis[];
  needsConversationManagement: boolean;
  conversationActions: string[];
  needsMemoryOperation: boolean;
  memoryActions: string[];
  needsMCPTools: boolean;
  mcpRequirements: string[];
  
  // Analysis metadata
  confidence: number;
  processingRecommendations: string[];
  
  // Additional analysis properties
  sentiment?: string;
  language?: string;
  topics?: string[];
  mentions?: string[];
}

/**
 * Unified Message Analysis Service
 * Replaces both IntelligenceAnalysisService and EnhancedMessageAnalysisService
 */
export class UnifiedMessageAnalysisService {
  
  /**
   * Comprehensive message analysis for all intelligence tiers
   */
  public async analyzeMessage(
    message: Message | string, 
    attachments: Attachment[] | AttachmentInfo[] = [],
    userCapabilities?: UserCapabilities
  ): Promise<UnifiedMessageAnalysis> {
    
    const content = typeof message === 'string' ? message : message.content;
    const messageAttachments = Array.isArray(attachments) 
      ? attachments 
      : Array.from((message as Message).attachments?.values() || []);
    
    const analysis: UnifiedMessageAnalysis = {
      // Core analysis
      hasAttachments: messageAttachments.length > 0,
      hasUrls: false,
      attachmentTypes: [],
      urls: [],
      complexity: 'simple',
      intents: [],
      requiredTools: ['memory'], // Always include memory
      
      // Enhanced analysis
      needsPersonaSwitch: false,
      needsAdminFeatures: false,
      adminCommands: [],
      needsMultimodal: false,
      attachmentAnalysis: [],
      needsConversationManagement: false,
      conversationActions: [],
      needsMemoryOperation: false,
      memoryActions: [],
      needsMCPTools: false,
      mcpRequirements: [],
      
      // Metadata
      confidence: 0.8,
      processingRecommendations: []
    };

    try {
      // Extract URLs and basic content analysis
      analysis.urls = this.extractUrls(content);
      analysis.hasUrls = analysis.urls.length > 0;
      
      // Analyze attachments
      if (messageAttachments.length > 0) {
        analysis.attachmentTypes = messageAttachments.map(att => this.getAttachmentType(att));
        analysis.attachmentAnalysis = this.analyzeAttachments(messageAttachments, content);
        analysis.needsMultimodal = userCapabilities?.hasMultimodal ?? true;
      }
      
      // Detect intents and complexity
      analysis.intents = this.detectIntents(content);
      analysis.complexity = this.calculateComplexity(content, analysis);
      
      // Map to required tools
      analysis.requiredTools = this.mapIntentsToTools(analysis.intents, analysis.attachmentTypes, analysis.urls);
      
      // Enhanced analysis (if capabilities provided)
      if (userCapabilities) {
        this.performEnhancedAnalysis(content, analysis, userCapabilities);
      }
      
      // Generate processing recommendations
      analysis.processingRecommendations = this.generateProcessingRecommendations(analysis);
      
      logger.debug('Unified message analysis complete', {
        operation: 'unified-message-analysis',
        metadata: {
          complexity: analysis.complexity,
          intents: analysis.intents,
          toolsRequired: analysis.requiredTools.length,
          hasAdvancedFeatures: analysis.needsMCPTools
        }
      });

      return analysis;

    } catch (error) {
      logger.error('Message analysis failed', {
        operation: 'unified-message-analysis',
        metadata: { error: String(error) }
      });

      // Return safe default analysis
      return analysis;
    }
  }

  /**
   * Extract URLs from content
   */
  private extractUrls(content: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.match(urlRegex) || [];
  }

  /**
   * Determine attachment type
   */
  private getAttachmentType(attachment: Attachment | AttachmentInfo): string {
    // Both interfaces should have 'name', but handle both cases safely
    const name = attachment.name;
    const contentType = 'contentType' in attachment 
      ? attachment.contentType 
      : (attachment as any).contentType;
    
    const ext = name?.split('.').pop()?.toLowerCase();
    const type = contentType?.toLowerCase() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '') || type.startsWith('image/')) return 'image';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '') || type.startsWith('audio/')) return 'audio';
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '') || type.includes('document') || type.includes('text')) return 'document';
    if (type.startsWith('video/')) return 'video';
    
    return 'unknown';
  }

  /**
   * Analyze attachments for processing requirements
   */
  private analyzeAttachments(attachments: (Attachment | AttachmentInfo)[], content: string): AttachmentAnalysis[] {
    return attachments.map(attachment => {
      const type = this.getAttachmentType(attachment) as AttachmentAnalysis['type'];
      return {
        type,
        analysisNeeded: true,
        suggestedService: this.suggestAnalysisService(type),
        processingPriority: content.includes('analyze') || content.includes('detailed') ? 'high' : 'medium'
      };
    });
  }

  /**
   * Suggest analysis service for attachment type
   */
  private suggestAnalysisService(type: string): string {
    switch (type) {
      case 'image': return 'imageAnalysis';
      case 'audio': return 'audioAnalysis';
      case 'document': return 'documentProcessing';
      case 'video': return 'multimodal';
      default: return 'fileIntelligence';
    }
  }

  /**
   * Detect user intents from content
   */
  private detectIntents(content: string): string[] {
    const intents = [];
    const lower = content.toLowerCase();
    
    // Search intents
    if (lower.includes('search') || lower.includes('find') || lower.includes('look up')) {
      intents.push('search');
    }
    
    // Analysis intents
    if (lower.includes('analyze') || lower.includes('explain') || lower.includes('understand')) {
      intents.push('analysis');
    }
    
    // Memory intents
    if (lower.includes('remember') || lower.includes('recall') || lower.includes('mentioned')) {
      intents.push('memory');
    }
    
    // Comparison intents
    if (lower.includes('compare') || lower.includes('difference') || lower.includes('vs')) {
      intents.push('comparison');
    }
    
    // Problem-solving intents
    if (lower.includes('solve') || lower.includes('calculate') || lower.includes('problem')) {
      intents.push('problem-solving');
    }
    
    // Conversation management
    if (lower.includes('summary') || lower.includes('summarize') || lower.includes('thread')) {
      intents.push('conversation-management');
    }
    
    return intents;
  }

  /**
   * Calculate complexity based on multiple factors
   */
  private calculateComplexity(content: string, analysis: Partial<UnifiedMessageAnalysis>): UnifiedMessageAnalysis['complexity'] {
    const complexityIndicators = [
      // Content-based indicators
      this.containsComplexKeywords(content),
      content.length > 500,
      
      // Attachment indicators
      (analysis.attachmentTypes?.length || 0) > 1,
      analysis.hasUrls,
      
      // Intent indicators
      (analysis.intents?.length || 0) > 2,
      analysis.intents?.some(intent => ['comparison', 'problem-solving'].includes(intent))
    ].filter(Boolean).length;

    if (complexityIndicators >= 4) return 'advanced';
    if (complexityIndicators >= 3) return 'complex';
    if (complexityIndicators >= 1) return 'moderate';
    return 'simple';
  }

  /**
   * Check for complex processing keywords
   */
  private containsComplexKeywords(content: string): boolean {
    const complexKeywords = [
      'analyze', 'compare', 'research', 'explain', 'calculate', 'solve',
      'pros and cons', 'advantages', 'disadvantages', 'step by step',
      'how to', 'what if', 'why', 'because', 'therefore', 'however'
    ];
    return complexKeywords.some(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Map intents to required processing tools
   */
  private mapIntentsToTools(intents: string[], attachmentTypes: string[], urls: string[]): string[] {
    const tools = new Set<string>(['memory']); // Always include memory
    
    // Intent-based tools
    if (intents.includes('search')) tools.add('web-search');
    if (intents.includes('analysis') || intents.includes('comparison')) tools.add('complex-reasoning');
    if (intents.includes('problem-solving')) tools.add('complex-reasoning');
    if (intents.includes('conversation-management')) tools.add('conversation-thread');
    
    // Content-based tools
    if (attachmentTypes.length > 0) tools.add('multimodal');
    if (urls.length > 0) tools.add('url-processing');
    
    // Advanced tools for complex scenarios
    if (intents.includes('search') && intents.includes('analysis')) {
      tools.add('browser-automation');
    }
    
    return Array.from(tools);
  }

  /**
   * Perform enhanced analysis for advanced capabilities
   */
  private performEnhancedAnalysis(
    content: string, 
    analysis: UnifiedMessageAnalysis, 
    capabilities: UserCapabilities
  ): void {
    const lower = content.toLowerCase();
    
    // Persona analysis
    analysis.needsPersonaSwitch = this.analyzePersonaNeeds(lower);
    if (analysis.needsPersonaSwitch) {
      analysis.suggestedPersona = this.suggestPersona(lower);
    }
    
    // Admin features (permission-gated)
    if (capabilities.hasAnalytics || capabilities.hasAdminCommands) {
      const adminAnalysis = this.analyzeAdminNeeds(lower, capabilities);
      analysis.needsAdminFeatures = adminAnalysis.needed;
      analysis.adminCommands = adminAnalysis.commands;
    }
    
    // Conversation management
    analysis.needsConversationManagement = this.analyzeConversationNeeds(lower);
    if (analysis.needsConversationManagement) {
      analysis.conversationActions = this.identifyConversationActions(lower);
    }
    
    // Memory operations
    const memoryAnalysis = this.analyzeMemoryNeeds(lower);
    analysis.needsMemoryOperation = memoryAnalysis.needed;
    analysis.memoryActions = memoryAnalysis.actions;
    
    // MCP tool requirements (permission-gated)
    if (capabilities.hasAdvancedAI) {
      const mcpAnalysis = this.analyzeMCPNeeds(lower);
      analysis.needsMCPTools = mcpAnalysis.needed;
      analysis.mcpRequirements = mcpAnalysis.requirements;
    }
  }

  /**
   * Analyze persona switching needs
   */
  private analyzePersonaNeeds(content: string): boolean {
    const personaKeywords = [
      'technical', 'code', 'programming', 'api', 'development',
      'professional', 'business', 'formal', 'enterprise',
      'funny', 'joke', 'sarcastic', 'humor', 'comedy'
    ];
    return personaKeywords.some(keyword => content.includes(keyword));
  }

  /**
   * Suggest appropriate persona
   */
  private suggestPersona(content: string): string {
    if (content.includes('technical') || content.includes('code') || content.includes('programming')) {
      return 'technical';
    } else if (content.includes('professional') || content.includes('business')) {
      return 'professional';
    } else if (content.includes('funny') || content.includes('humor')) {
      return 'sarcastic';
    }
    return 'friendly';
  }

  /**
   * Analyze admin feature requirements
   */
  private analyzeAdminNeeds(content: string, capabilities: UserCapabilities): { needed: boolean; commands: string[] } {
    const commands: string[] = [];

    if (capabilities.hasAnalytics && (content.includes('stats') || content.includes('analytics'))) {
      commands.push('stats');
    }
    if (capabilities.hasAdminCommands && content.includes('persona')) {
      commands.push('persona');
    }

    return { needed: commands.length > 0, commands };
  }

  /**
   * Analyze conversation management needs
   */
  private analyzeConversationNeeds(content: string): boolean {
    const conversationKeywords = ['summary', 'summarize', 'thread', 'topic', 'context'];
    return conversationKeywords.some(keyword => content.includes(keyword));
  }

  /**
   * Identify conversation actions
   */
  private identifyConversationActions(content: string): string[] {
    const actions: string[] = [];
    if (content.includes('summary') || content.includes('summarize')) actions.push('summary');
    if (content.includes('thread') || content.includes('topic')) actions.push('thread');
    return actions;
  }

  /**
   * Analyze memory operation needs
   */
  private analyzeMemoryNeeds(content: string): { needed: boolean; actions: string[] } {
    const actions: string[] = [];

    if (content.includes('remember') || content.includes('forget') || content.includes('preferences')) {
      actions.push('update');
    }
    if (content.includes('what do you know about me') || content.includes('my information')) {
      actions.push('recall');
    }

    return { needed: actions.length > 0, actions };
  }

  /**
   * Analyze MCP tool requirements
   */
  private analyzeMCPNeeds(content: string): { needed: boolean; requirements: string[] } {
    const requirements: string[] = [];

    if (content.includes('search') || content.includes('look up') || content.includes('find information')) {
      requirements.push('webSearch');
    }
    if (content.includes('scrape') || content.includes('website') || content.includes('webpage')) {
      requirements.push('firecrawl');
    }
    if (content.includes('osrs') || content.includes('old school runescape')) {
      requirements.push('osrsData');
    }

    return { needed: requirements.length > 0, requirements };
  }

  /**
   * Generate processing recommendations based on analysis
   */
  private generateProcessingRecommendations(analysis: UnifiedMessageAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.complexity === 'advanced') {
      recommendations.push('Use parallel processing for multiple tools');
    }
    if (analysis.hasAttachments && analysis.hasUrls) {
      recommendations.push('Process attachments and URLs concurrently');
    }
    if (analysis.needsMCPTools && analysis.mcpRequirements.length > 2) {
      recommendations.push('Implement progressive tool execution with fallbacks');
    }
    if (analysis.confidence < 0.7) {
      recommendations.push('Request clarification from user');
    }

    return recommendations;
  }

  /**
   * Optimize search query with context
   */
  public optimizeSearchQuery(query: string, context: { results: Map<string, unknown> }): string {
    let optimized = query;
    
    const memoryResult = context.results.get('memory') as { success: boolean; data?: unknown } | undefined;
    if (memoryResult?.success && memoryResult.data && 
        typeof memoryResult.data === 'object' && 
        'userPreferences' in memoryResult.data) {
      // Add user context to search
      const data = memoryResult.data as { userPreferences: unknown };
      optimized += ` context:${JSON.stringify(data.userPreferences)}`;
    }
    
    return optimized;
  }
}

// Export singleton instance
export const unifiedMessageAnalysisService = new UnifiedMessageAnalysisService();
