/**
 * Intelligence Analysis Service
 * 
 * Analyzes user messages to determine required capabilities,
 * complexity level, and appropriate response strategies.
 */

import { Message, Attachment } from 'discord.js';
import { UserCapabilities } from './permission.service.js';
import { logger } from '../../utils/logger.js';

export interface AttachmentAnalysis {
  type: 'image' | 'audio' | 'document' | 'video' | 'unknown';
  analysisNeeded: boolean;
  suggestedService: string;
  processingPriority: 'high' | 'medium' | 'low';
}

export interface IntelligenceAnalysis {
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
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'advanced';
  confidence: number;
}

export class IntelligenceAnalysisService {
  /**
   * Analyze a message to determine required capabilities
   */
  public async analyzeMessage(message: Message, userCapabilities: UserCapabilities): Promise<IntelligenceAnalysis> {
    const content = message.content.toLowerCase();
    
    const analysis: IntelligenceAnalysis = {
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
      complexityLevel: 'simple',
      confidence: 0.8
    };

    try {
      // Analyze for persona switching needs
      analysis.needsPersonaSwitch = this.analyzePersonaNeeds(content);
      if (analysis.needsPersonaSwitch) {
        analysis.suggestedPersona = this.suggestPersona(content);
      }

      // Analyze for admin features (permission-gated)
      if (userCapabilities.hasAnalytics || userCapabilities.hasAdminCommands) {
        const adminAnalysis = this.analyzeAdminNeeds(content, userCapabilities);
        analysis.needsAdminFeatures = adminAnalysis.needed;
        analysis.adminCommands = adminAnalysis.commands;
      }

      // Analyze attachments for multimodal processing
      if (message.attachments.size > 0 && userCapabilities.hasMultimodal) {
        analysis.needsMultimodal = true;
        analysis.attachmentAnalysis = this.analyzeAttachments(Array.from(message.attachments.values()), content);
      }

      // Analyze for conversation management
      analysis.needsConversationManagement = this.analyzeConversationNeeds(content);
      if (analysis.needsConversationManagement) {
        analysis.conversationActions = this.identifyConversationActions(content);
      }

      // Analyze for memory operations
      const memoryAnalysis = this.analyzeMemoryNeeds(content);
      analysis.needsMemoryOperation = memoryAnalysis.needed;
      analysis.memoryActions = memoryAnalysis.actions;

      // Analyze for MCP tool needs (permission-gated)
      if (userCapabilities.hasAdvancedAI) {
        const mcpAnalysis = this.analyzeMCPNeeds(content);
        analysis.needsMCPTools = mcpAnalysis.needed;
        analysis.mcpRequirements = mcpAnalysis.requirements;
      }

      // Determine complexity level
      analysis.complexityLevel = this.calculateComplexity(analysis);

      logger.debug('Message analysis complete', {
        operation: 'message-analysis',
        metadata: {
          complexity: analysis.complexityLevel,
          capabilities: {
            persona: analysis.needsPersonaSwitch,
            admin: analysis.needsAdminFeatures,
            multimodal: analysis.needsMultimodal,
            conversation: analysis.needsConversationManagement,
            memory: analysis.needsMemoryOperation,
            mcp: analysis.needsMCPTools
          }
        }
      });

      return analysis;

    } catch (error) {
      logger.error('Message analysis failed', {
        operation: 'message-analysis',
        metadata: { error: String(error) }
      });

      // Return basic analysis on error
      return analysis;
    }
  }

  /**
   * Analyze if persona switching is needed
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
   * Suggest appropriate persona based on content
   */
  private suggestPersona(content: string): string {
    if (content.includes('technical') || content.includes('code') || content.includes('programming') || content.includes('api')) {
      return 'technical';
    } else if (content.includes('professional') || content.includes('business') || content.includes('formal')) {
      return 'professional';
    } else if (content.includes('funny') || content.includes('joke') || content.includes('sarcastic') || content.includes('humor')) {
      return 'sarcastic';
    }
    return 'friendly'; // Default
  }

  /**
   * Analyze admin feature needs
   */
  private analyzeAdminNeeds(content: string, capabilities: UserCapabilities): { needed: boolean; commands: string[] } {
    const commands: string[] = [];

    if (capabilities.hasAnalytics && (content.includes('stats') || content.includes('analytics') || content.includes('usage'))) {
      commands.push('stats');
    }

    if (capabilities.hasAdminCommands && content.includes('persona') && (content.includes('create') || content.includes('set') || content.includes('list'))) {
      commands.push('persona');
    }

    return {
      needed: commands.length > 0,
      commands
    };
  }

  /**
   * Analyze attachments for processing needs
   */
  private analyzeAttachments(attachments: Attachment[], content: string): AttachmentAnalysis[] {
    return attachments.map(attachment => ({
      type: this.detectAttachmentType(attachment),
      analysisNeeded: true,
      suggestedService: this.suggestAnalysisService(attachment),
      processingPriority: content.includes('analyze') || content.includes('detailed') ? 'high' : 'medium'
    }));
  }

  /**
   * Detect attachment type
   */
  private detectAttachmentType(attachment: Attachment): AttachmentAnalysis['type'] {
    const contentType = attachment.contentType?.toLowerCase() || '';
    
    if (contentType.startsWith('image/')) return 'image';
    if (contentType.startsWith('audio/')) return 'audio';
    if (contentType.startsWith('video/')) return 'video';
    if (contentType.includes('pdf') || contentType.includes('document') || contentType.includes('text')) return 'document';
    
    return 'unknown';
  }

  /**
   * Suggest analysis service for attachment
   */
  private suggestAnalysisService(attachment: Attachment): string {
    const type = this.detectAttachmentType(attachment);
    
    switch (type) {
      case 'image': return 'imageAnalysis';
      case 'audio': return 'audioAnalysis';
      case 'document': return 'documentProcessing';
      case 'video': return 'multimodal';
      default: return 'fileIntelligence';
    }
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

    if (content.includes('summary') || content.includes('summarize')) {
      actions.push('summary');
    }
    if (content.includes('thread') || content.includes('topic')) {
      actions.push('thread');
    }

    return actions;
  }

  /**
   * Analyze memory operation needs
   */
  private analyzeMemoryNeeds(content: string): { needed: boolean; actions: string[] } {
    const actions: string[] = [];

    if (content.includes('remember') || content.includes('forget') || content.includes('my preferences')) {
      actions.push('update');
    }
    if (content.includes('what do you know about me') || content.includes('my information')) {
      actions.push('recall');
    }

    return {
      needed: actions.length > 0,
      actions
    };
  }

  /**
   * Analyze MCP tool needs
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

    return {
      needed: requirements.length > 0,
      requirements
    };
  }

  /**
   * Calculate complexity level based on analysis
   */
  private calculateComplexity(analysis: IntelligenceAnalysis): IntelligenceAnalysis['complexityLevel'] {
    const complexityIndicators = [
      analysis.needsMultimodal,
      analysis.needsConversationManagement,
      analysis.needsMCPTools,
      analysis.attachmentAnalysis.length > 1,
      analysis.mcpRequirements.length > 1
    ].filter(Boolean).length;

    if (complexityIndicators >= 3) {
      return 'advanced';
    } else if (complexityIndicators >= 2) {
      return 'complex';
    } else if (complexityIndicators >= 1) {
      return 'moderate';
    }

    return 'simple';
  }
}

// Export singleton instance
export const intelligenceAnalysisService = new IntelligenceAnalysisService();
