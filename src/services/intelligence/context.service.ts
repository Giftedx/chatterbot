/**
 * Intelligence Context Builder Service
 * 
 * Builds comprehensive context for AI responses by integrating
 * memory, permissions, attachments, and conversation history.
 */

import { Message, Attachment } from 'discord.js';
import { getHistory } from '../context-manager.js';
import { getActivePersona } from '../persona-manager.js';
import { UserMemoryService } from '../../memory/user-memory.service.js';
import { UserCapabilities } from './permission.service.js';
import { IntelligenceAnalysis } from './analysis.service.js';
import { intelligenceAdminService } from './admin.service.js';
import { logger } from '../../utils/logger.js';

// Import MCP result types
interface WebSearchResult {
  query: string;
  results: Array<{
    title: string;
    description: string;
    url: string;
    snippet: string;
  }>;
  metadata: {
    timestamp: string;
    source: string;
    toolUsed: string;
  };
}

interface ContentExtractionResult {
  urls: Array<{
    url: string;
    title: string;
    content: string;
    metadata: {
      extractedAt: string;
      toolUsed: string;
    };
  }>;
}

interface OSRSDataResult {
  query: string;
  data: string;
  metadata: {
    timestamp: string;
    toolUsed: string;
  };
}

type MCPResultValue = WebSearchResult | ContentExtractionResult | OSRSDataResult | { error: string };

export interface EnhancedContext {
  prompt: string;
  systemPrompt: string;
  hasAttachments: boolean;
  complexity: string;
}

export class IntelligenceContextService {
  private readonly userMemoryService: UserMemoryService;

  constructor() {
    this.userMemoryService = new UserMemoryService();
  }

  /**
   * Build comprehensive context for AI response generation
   */
  public async buildEnhancedContext(
    message: Message,
    analysis: IntelligenceAnalysis,
    capabilities: UserCapabilities,
    mcpResults?: Map<string, MCPResultValue>
  ): Promise<EnhancedContext> {
    try {
      let enhancedPrompt = message.content;

      // Add user permission context for AI understanding
      const permissionContext = this.buildPermissionContext(capabilities);
      if (permissionContext) {
        enhancedPrompt += `\n\n[USER CAPABILITIES]\n${permissionContext}`;
      }

      // Add memory context
      const memoryContext = await this.buildMemoryContext(message.author.id, message.guildId || undefined);
      if (memoryContext) {
        enhancedPrompt = `${memoryContext}\n\nUser's current message: ${message.content}`;
      }

      // Add MCP results context if available
      if (mcpResults && mcpResults.size > 0) {
        const mcpContext = this.buildMCPContext(mcpResults);
        if (mcpContext) {
          enhancedPrompt += `\n\n[RESEARCH RESULTS]\n${mcpContext}`;
        }
      }

      // Add attachment context
      if (message.attachments.size > 0) {
        const attachmentContext = this.buildAttachmentContext(Array.from(message.attachments.values()));
        enhancedPrompt += `\n\n[SHARED CONTENT]\n${attachmentContext}`;
      }

      // Add admin context if applicable
      const adminContext = await intelligenceAdminService.getAdminContext(capabilities);
      if (adminContext) {
        enhancedPrompt += `\n\n${adminContext}`;
      }

      // Add conversation history context
      const conversationContext = await this.buildConversationContext(message.channel.id);
      if (conversationContext) {
        enhancedPrompt += `\n\n[CONVERSATION CONTEXT]\n${conversationContext}`;
      }

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(analysis, capabilities);

      return {
        prompt: enhancedPrompt,
        systemPrompt,
        hasAttachments: message.attachments.size > 0,
        complexity: analysis.complexityLevel
      };

    } catch (error) {
      logger.warn('Enhanced context building failed, using basic content', {
        operation: 'build-context',
        metadata: { error: String(error) }
      });

      return {
        prompt: message.content,
        systemPrompt: this.buildBasicSystemPrompt(),
        hasAttachments: message.attachments.size > 0,
        complexity: 'simple'
      };
    }
  }

  /**
   * Build permission context for AI understanding
   */
  private buildPermissionContext(capabilities: UserCapabilities): string | null {
    const enabledFeatures = [];

    if (capabilities.hasMultimodal) enabledFeatures.push('multimodal analysis');
    if (capabilities.hasAdvancedAI) enabledFeatures.push('advanced AI tools and web search');
    if (capabilities.hasAnalytics) enabledFeatures.push('analytics viewing');
    if (capabilities.hasAdminCommands) enabledFeatures.push('administrative commands');

    if (enabledFeatures.length > 0) {
      return `User has access to: ${enabledFeatures.join(', ')}. You can use these capabilities naturally in your response.`;
    }
    
    return 'User has basic AI access only. Avoid mentioning advanced features they cannot access.';
  }

  /**
   * Build memory context from user's history
   */
  private async buildMemoryContext(userId: string, guildId?: string): Promise<string | null> {
    try {
      const memoryContext = await this.userMemoryService.getMemoryContext(userId, guildId);
      return memoryContext?.contextPrompt || null;
    } catch (error) {
      logger.warn('Memory context retrieval failed', {
        operation: 'memory-context',
        metadata: { userId, error: String(error) }
      });
      return null;
    }
  }

  /**
   * Build MCP results context
   */
  private buildMCPContext(mcpResults: Map<string, MCPResultValue>): string | null {
    const contextParts = [];

    for (const [tool, result] of mcpResults.entries()) {
      if ('error' in result) {
        contextParts.push(`${tool}: Error occurred`);
        continue;
      }

      switch (tool) {
        case 'webSearch':
          if ('results' in result && result.results.length > 0) {
            const searchSummary = result.results.slice(0, 3).map(r => 
              `• ${r.title}: ${r.snippet}`
            ).join('\n');
            contextParts.push(`Web Search Results:\n${searchSummary}`);
          }
          break;

        case 'contentExtraction':
          if ('urls' in result && result.urls.length > 0) {
            const contentSummary = result.urls.slice(0, 2).map(u => 
              `• ${u.title}: ${u.content.slice(0, 200)}...`
            ).join('\n');
            contextParts.push(`Extracted Content:\n${contentSummary}`);
          }
          break;

        case 'osrsData':
          if ('data' in result) {
            contextParts.push(`OSRS Data: ${result.data}`);
          }
          break;

        default:
          if ('data' in result) {
            contextParts.push(`${tool}: ${String(result.data).slice(0, 200)}`);
          }
      }
    }

    return contextParts.length > 0 ? contextParts.join('\n\n') : null;
  }

  /**
   * Build attachment context description
   */
  private buildAttachmentContext(attachments: Attachment[]): string {
    const descriptions = [];

    for (const attachment of attachments) {
      const type = this.detectAttachmentType(attachment);
      const size = this.formatFileSize(attachment.size);
      
      descriptions.push(`${type} file "${attachment.name}" (${size})`);
    }

    return `User shared: ${descriptions.join(', ')}`;
  }

  /**
   * Build conversation context
   */
  private async buildConversationContext(channelId: string): Promise<string | null> {
    try {
      const history = await getHistory(channelId);
      if (history.length > 0) {
        return 'This is part of an ongoing conversation. Please respond naturally and reference previous context when relevant.';
      }
      return null;
    } catch (error) {
      logger.warn('Conversation context retrieval failed', {
        operation: 'conversation-context',
        metadata: { channelId, error: String(error) }
      });
      return null;
    }
  }

  /**
   * Build comprehensive system prompt
   */
  private buildSystemPrompt(analysis: IntelligenceAnalysis, capabilities: UserCapabilities): string {
    const capabilityNames = [];
    
    if (analysis.needsPersonaSwitch) capabilityNames.push('persona adaptation');
    if (analysis.needsAdminFeatures && (capabilities.hasAnalytics || capabilities.hasAdminCommands)) {
      capabilityNames.push('admin features');
    }
    if (analysis.needsMultimodal && capabilities.hasMultimodal) capabilityNames.push('multimodal analysis');
    if (analysis.needsConversationManagement) capabilityNames.push('conversation management');
    if (analysis.needsMemoryOperation) capabilityNames.push('memory operations');
    if (analysis.needsMCPTools && capabilities.hasAdvancedAI) capabilityNames.push('advanced tools');

    // Get current persona
    const persona = getActivePersona('default'); // Could be enhanced to use guild-specific persona

    let systemPrompt = persona.systemPrompt;

    if (capabilityNames.length > 0) {
      systemPrompt += `\n\n[SYSTEM] You are operating with ${analysis.complexityLevel} complexity level. Active capabilities: ${capabilityNames.join(', ')}.`;
    }

    systemPrompt += `

Respond naturally and conversationally while seamlessly integrating:
- Appropriate expertise level and tone based on detected context
- Relevant information from shared content and research results
- Personal context and memory when applicable
- Admin information if user has appropriate permissions
- Natural handling of any detected intents

Maintain engaging conversation flow while being helpful and contextually aware. Never mention the technical capabilities explicitly - just use them naturally in your response.`;

    return systemPrompt;
  }

  /**
   * Build basic system prompt for fallback
   */
  private buildBasicSystemPrompt(): string {
    const persona = getActivePersona('default');
    return `${persona.systemPrompt}

Respond naturally and helpfully to the user's message. Maintain an engaging conversation while being contextually aware.`;
  }

  /**
   * Helper methods
   */
  private detectAttachmentType(attachment: Attachment): string {
    const contentType = attachment.contentType?.toLowerCase() || '';
    
    if (contentType.startsWith('image/')) return 'Image';
    if (contentType.startsWith('audio/')) return 'Audio';
    if (contentType.startsWith('video/')) return 'Video';
    if (contentType.includes('pdf')) return 'PDF';
    if (contentType.includes('document')) return 'Document';
    if (contentType.includes('text')) return 'Text';
    
    return 'File';
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const intelligenceContextService = new IntelligenceContextService();
