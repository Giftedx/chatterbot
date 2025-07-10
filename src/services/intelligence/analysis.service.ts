/**
 * Intelligence Analysis Service
 * 
 * Provides message analysis capabilities for the intelligence module.
 * This is a focused analysis service that works with the modular intelligence system.
 */

import { Message, Attachment } from 'discord.js';
import { UserCapabilities } from './permission.service.js';
import { logger } from '../../utils/logger.js';

export interface AttachmentAnalysis {
  type: 'image' | 'audio' | 'document' | 'video' | 'unknown';
  analysisNeeded: boolean;
  suggestedService: string;
  processingPriority: 'high' | 'medium' | 'low';
  contentType?: string;
  size?: number;
}

export interface IntelligenceAnalysis {
  // Core message analysis
  hasAttachments: boolean;
  hasUrls: boolean;
  attachmentTypes: string[];
  urls: string[];
  complexity: 'simple' | 'moderate' | 'complex' | 'advanced';
  intents: string[];
  requiredTools: string[];
  
  // Intelligence-specific analysis
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
  sentiment?: string;
  language?: string;
  topics?: string[];
  mentions?: string[];
}

/**
 * Intelligence Analysis Service
 * Focused on modular intelligence system analysis needs
 */
export class IntelligenceAnalysisService {
  
  /**
   * Analyze message for intelligence system processing
   */
  public async analyzeMessage(
    message: Message | string, 
    attachments: Attachment[] = [],
    userCapabilities?: UserCapabilities
  ): Promise<IntelligenceAnalysis> {
    
    const content = typeof message === 'string' ? message : message.content;
    const messageAttachments = attachments.length > 0 
      ? attachments 
      : Array.from((message as Message).attachments?.values() || []);
    
    const analysis: IntelligenceAnalysis = {
      // Core analysis
      hasAttachments: messageAttachments.length > 0,
      hasUrls: false,
      attachmentTypes: [],
      urls: [],
      complexity: 'simple',
      intents: [],
      requiredTools: ['memory'], // Always include memory
      
      // Intelligence-specific analysis
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
      
      logger.debug('Intelligence analysis complete', {
        operation: 'intelligence-analysis',
        metadata: {
          complexity: analysis.complexity,
          intents: analysis.intents,
          toolsRequired: analysis.requiredTools.length,
          hasAdvancedFeatures: analysis.needsMCPTools
        }
      });

      return analysis;

    } catch (error) {
      logger.error('Intelligence analysis failed', {
        operation: 'intelligence-analysis',
        metadata: { error: String(error) }
      });

      // Return minimal analysis on error
      return {
        ...analysis,
        confidence: 0.3,
        processingRecommendations: ['fallback_processing']
      };
    }
  }

  /**
   * Extract URLs from message content
   */
  private extractUrls(content: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return content.match(urlRegex) || [];
  }

  /**
   * Get attachment type from attachment object
   */
  private getAttachmentType(attachment: Attachment): string {
    if (!attachment.contentType) return 'unknown';
    
    const mainType = attachment.contentType.split('/')[0];
    return mainType || 'unknown';
  }

  /**
   * Analyze attachments for processing requirements
   */
  private analyzeAttachments(attachments: Attachment[], content: string): AttachmentAnalysis[] {
    return attachments.map(attachment => {
      const type = this.getContentTypeCategory(attachment.contentType ?? undefined);
      
      return {
        type,
        analysisNeeded: true,
        suggestedService: this.getSuggestedService(type),
        processingPriority: this.getProcessingPriority(type, content),
        contentType: attachment.contentType || undefined,
        size: attachment.size
      };
    });
  }

  /**
   * Get content type category
   */
  private getContentTypeCategory(contentType?: string): AttachmentAnalysis['type'] {
    if (!contentType) return 'unknown';
    
    if (contentType.startsWith('image/')) return 'image';
    if (contentType.startsWith('audio/')) return 'audio';
    if (contentType.startsWith('video/')) return 'video';
    if (contentType.includes('pdf') || contentType.includes('document') || contentType.includes('text')) return 'document';
    
    return 'unknown';
  }

  /**
   * Get suggested service for content type
   */
  private getSuggestedService(type: AttachmentAnalysis['type']): string {
    switch (type) {
      case 'image': return 'image-analysis';
      case 'audio': return 'audio-analysis';
      case 'document': return 'document-processing';
      case 'video': return 'video-analysis';
      default: return 'file-intelligence';
    }
  }

  /**
   * Get processing priority based on type and content
   */
  private getProcessingPriority(type: AttachmentAnalysis['type'], content: string): AttachmentAnalysis['processingPriority'] {
    // Urgent keywords increase priority
    const urgentKeywords = ['urgent', 'emergency', 'asap', 'immediately'];
    const hasUrgentContent = urgentKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
    
    if (hasUrgentContent) return 'high';
    if (type === 'image' || type === 'document') return 'medium';
    return 'low';
  }

  /**
   * Detect user intents from message content
   */
  private detectIntents(content: string): string[] {
    const intents: string[] = [];
    const lowerContent = content.toLowerCase();

    // Question detection
    if (lowerContent.includes('?') || lowerContent.startsWith('what') || 
        lowerContent.startsWith('how') || lowerContent.startsWith('why') ||
        lowerContent.startsWith('when') || lowerContent.startsWith('where')) {
      intents.push('question');
    }

    // Request detection
    if (lowerContent.includes('please') || lowerContent.includes('can you') ||
        lowerContent.includes('could you') || lowerContent.includes('would you')) {
      intents.push('request');
    }

    // Search intent
    if (lowerContent.includes('search') || lowerContent.includes('find') ||
        lowerContent.includes('lookup') || lowerContent.includes('what is')) {
      intents.push('search');
    }

    // Analysis intent
    if (lowerContent.includes('analyze') || lowerContent.includes('explain') ||
        lowerContent.includes('summarize') || lowerContent.includes('review')) {
      intents.push('analysis');
    }

    // Creation intent
    if (lowerContent.includes('create') || lowerContent.includes('generate') ||
        lowerContent.includes('make') || lowerContent.includes('build')) {
      intents.push('creation');
    }

    // Help intent
    if (lowerContent.includes('help') || lowerContent.includes('assist') ||
        lowerContent.includes('support')) {
      intents.push('help');
    }

    return intents.length > 0 ? intents : ['general'];
  }

  /**
   * Calculate message complexity
   */
  private calculateComplexity(content: string, analysis: IntelligenceAnalysis): IntelligenceAnalysis['complexity'] {
    let score = 0;

    // Length factor
    if (content.length > 200) score += 1;
    if (content.length > 500) score += 1;

    // Attachment factor
    if (analysis.hasAttachments) score += 1;
    if (analysis.attachmentTypes.length > 1) score += 1;

    // URL factor
    if (analysis.hasUrls) score += 1;

    // Intent complexity
    if (analysis.intents.length > 2) score += 1;
    if (analysis.intents.includes('analysis')) score += 1;

    // Technical keywords
    const technicalKeywords = ['api', 'database', 'server', 'code', 'function', 'algorithm'];
    if (technicalKeywords.some(keyword => content.toLowerCase().includes(keyword))) {
      score += 1;
    }

    if (score >= 4) return 'advanced';
    if (score >= 2) return 'complex';
    if (score >= 1) return 'moderate';
    return 'simple';
  }

  /**
   * Map intents to required tools
   */
  private mapIntentsToTools(intents: string[], attachmentTypes: string[], urls: string[]): string[] {
    const tools = new Set(['memory']); // Always include memory

    for (const intent of intents) {
      switch (intent) {
        case 'search':
          tools.add('web-search');
          break;
        case 'analysis':
          tools.add('analysis');
          if (attachmentTypes.length > 0) tools.add('multimodal');
          break;
        case 'creation':
          tools.add('generation');
          break;
        case 'help':
          tools.add('knowledge-base');
          break;
      }
    }

    // Add tools based on content type
    if (attachmentTypes.includes('image')) tools.add('image-analysis');
    if (attachmentTypes.includes('document')) tools.add('document-processing');
    if (urls.length > 0) tools.add('content-extraction');

    return Array.from(tools);
  }

  /**
   * Perform enhanced analysis based on user capabilities
   */
  private performEnhancedAnalysis(
    content: string, 
    analysis: IntelligenceAnalysis, 
    capabilities: UserCapabilities
  ): void {
    const lowerContent = content.toLowerCase();

    // Check for persona switching needs
    if (lowerContent.includes('technical') || lowerContent.includes('code') || 
        lowerContent.includes('programming')) {
      analysis.needsPersonaSwitch = true;
      analysis.suggestedPersona = 'technical';
    } else if (lowerContent.includes('professional') || lowerContent.includes('business')) {
      analysis.needsPersonaSwitch = true;
      analysis.suggestedPersona = 'professional';
    }

    // Check for admin features (if user has admin capabilities)
    if (capabilities.hasAdmin) {
      const adminCommands = ['stats', 'users', 'config', 'moderate', 'ban', 'manage'];
      analysis.adminCommands = adminCommands.filter(cmd => 
        lowerContent.includes(cmd)
      );
      analysis.needsAdminFeatures = analysis.adminCommands.length > 0;
    }

    // Check for memory operations
    if (lowerContent.includes('remember') || lowerContent.includes('forget') ||
        lowerContent.includes('recall') || lowerContent.includes('context')) {
      analysis.needsMemoryOperation = true;
      analysis.memoryActions = ['update', 'retrieve'];
    }

    // Check for conversation management
    if (lowerContent.includes('summary') || lowerContent.includes('recap') ||
        lowerContent.includes('history')) {
      analysis.needsConversationManagement = true;
      analysis.conversationActions = ['summarize', 'retrieve_history'];
    }

    // Check for MCP tool requirements
    if (capabilities.hasMCPTools) {
      if (analysis.intents.includes('search') || lowerContent.includes('current') ||
          lowerContent.includes('latest') || lowerContent.includes('recent')) {
        analysis.needsMCPTools = true;
        analysis.mcpRequirements.push('web-search');
      }
      
      if (analysis.hasUrls) {
        analysis.needsMCPTools = true;
        analysis.mcpRequirements.push('content-extraction');
      }
      
      if (analysis.hasAttachments) {
        analysis.needsMCPTools = true;
        analysis.mcpRequirements.push('file-processing');
      }
    }
  }

  /**
   * Generate processing recommendations
   */
  private generateProcessingRecommendations(analysis: IntelligenceAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.complexity === 'advanced') {
      recommendations.push('use_streaming_response');
      recommendations.push('enable_progress_updates');
    }

    if (analysis.needsMCPTools) {
      recommendations.push('verify_mcp_availability');
      recommendations.push('request_user_consent');
    }

    if (analysis.hasAttachments) {
      recommendations.push('process_attachments_first');
    }

    if (analysis.needsMemoryOperation) {
      recommendations.push('update_user_context');
    }

    if (analysis.needsPersonaSwitch) {
      recommendations.push('switch_persona_before_response');
    }

    return recommendations;
  }
}

// Export singleton instance
export const intelligenceAnalysisService = new IntelligenceAnalysisService();