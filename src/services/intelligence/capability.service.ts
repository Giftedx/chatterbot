/**
 * Intelligence Capability Execution Service
 * 
 * Handles execution of detected capabilities including MCP tools,
 * persona switching, memory operations, and conversation management.
 */

import { Message } from 'discord.js';
import { IntelligenceAnalysis, AttachmentAnalysis } from './analysis.service.js';
import { setActivePersona } from '../persona-manager.js';
import { UserMemoryService } from '../../memory/user-memory.service.js';
import { ConversationSummaryService } from '../../conversation/conversation-summary.service.js';
import { logger } from '../../utils/logger.js';

// MCP Tool Result Types
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

interface MemoryRetrievalResult {
  userContext: { contextPrompt?: string } | null;
  relevantMemories: string[];
  contextualInfo: string;
  metadata: {
    timestamp: string;
    toolUsed: string;
  };
}

interface OSRSDataResult {
  query: string;
  data: string;
  metadata: {
    timestamp: string;
    toolUsed: string;
  };
}

type MCPResultValue = WebSearchResult | ContentExtractionResult | MemoryRetrievalResult | OSRSDataResult | { error: string };

export interface CapabilityExecutionResult {
  mcpResults?: Map<string, MCPResultValue>;
  personaSwitched?: boolean;
  adminDataGenerated?: boolean;
  multimodalProcessed?: boolean;
  conversationManaged?: boolean;
  memoryUpdated?: boolean;
}

export class IntelligenceCapabilityService {
  private readonly userMemoryService: UserMemoryService;
  private readonly summaryService: ConversationSummaryService;
  
  // Store MCP results temporarily for each interaction  
  private readonly mcpResultsCache = new Map<string, Map<string, MCPResultValue>>();

  constructor() {
    this.userMemoryService = new UserMemoryService();
    this.summaryService = new ConversationSummaryService();
  }

  /**
   * Execute all detected capabilities based on analysis
   */
  public async executeCapabilities(analysis: IntelligenceAnalysis, message: Message): Promise<CapabilityExecutionResult> {
    const result: CapabilityExecutionResult = {};

    try {
      // Execute MCP tools first (they provide context for other operations)
      if (analysis.needsMCPTools) {
        result.mcpResults = await this.executeMCPTools(analysis, message);
      }

      // Auto-switch persona if needed
      if (analysis.needsPersonaSwitch && analysis.suggestedPersona) {
        result.personaSwitched = await this.executePersonaSwitch(message, analysis.suggestedPersona);
      }

      // Process multimodal content if present
      if (analysis.needsMultimodal && analysis.attachmentAnalysis.length > 0) {
        result.multimodalProcessed = await this.executeMultimodalProcessing(analysis.attachmentAnalysis);
      }

      // Handle conversation management if needed
      if (analysis.needsConversationManagement) {
        result.conversationManaged = await this.executeConversationManagement(analysis.conversationActions, message);
      }

      // Process memory operations if needed
      if (analysis.needsMemoryOperation) {
        result.memoryUpdated = await this.executeMemoryOperations(analysis.memoryActions, message);
      }

      logger.info('Capability execution complete', {
        operation: 'capability-execution',
        metadata: {
          mcpTools: !!result.mcpResults,
          persona: result.personaSwitched,
          multimodal: result.multimodalProcessed,
          conversation: result.conversationManaged,
          memory: result.memoryUpdated
        }
      });

      return result;

    } catch (error) {
      logger.error('Capability execution failed', {
        operation: 'capability-execution',
        metadata: { error: String(error) }
      });

      return result;
    }
  }

  /**
   * Execute MCP tools based on requirements
   */
  private async executeMCPTools(analysis: IntelligenceAnalysis, message: Message): Promise<Map<string, MCPResultValue>> {
    const results = new Map<string, MCPResultValue>();

    try {
      // Execute web search if needed
      if (analysis.mcpRequirements.includes('webSearch')) {
        await this.executeWebSearch(this.extractSearchQuery(message.content), results);
      }

      // Execute content extraction if needed
      if (analysis.mcpRequirements.includes('firecrawl')) {
        const urls = this.extractUrls(message.content);
        if (urls.length > 0) {
          await this.executeContentExtraction(urls, results);
        }
      }

      // Execute OSRS data lookup if needed
      if (analysis.mcpRequirements.includes('osrsData')) {
        await this.executeOSRSLookup(this.extractOSRSQuery(message.content), results);
      }

      logger.info('MCP tools executed', {
        operation: 'mcp-execution',
        metadata: { 
          toolCount: results.size,
          tools: analysis.mcpRequirements 
        }
      });

    } catch (error) {
      logger.warn('MCP tool execution failed', {
        operation: 'mcp-execution',
        metadata: { error: String(error) }
      });

      results.set('error', { error: 'MCP tool execution failed' });
    }

    return results;
  }

  /**
   * Execute persona switch
   */
  private async executePersonaSwitch(message: Message, suggestedPersona: string): Promise<boolean> {
    try {
      setActivePersona(message.guildId || 'default', suggestedPersona);
      
      logger.info('Auto-switched persona', {
        operation: 'auto-persona-switch',
        metadata: { 
          userId: message.author.id,
          persona: suggestedPersona 
        }
      });

      return true;
    } catch (error) {
      logger.warn('Auto persona switch failed', {
        operation: 'auto-persona-switch',
        metadata: { error: String(error) }
      });
      return false;
    }
  }

  /**
   * Execute multimodal processing
   */
  private async executeMultimodalProcessing(attachmentAnalysis: AttachmentAnalysis[]): Promise<boolean> {
    try {
      for (const analysis of attachmentAnalysis) {
        // The actual multimodal processing will be handled by the response generation
        // This is where we could pre-process files if needed
        logger.debug('Multimodal content detected', {
          operation: 'auto-multimodal',
          metadata: { 
            type: analysis.type,
            priority: analysis.processingPriority 
          }
        });
      }

      return true;
    } catch (error) {
      logger.warn('Auto multimodal processing failed', {
        operation: 'auto-multimodal',
        metadata: { error: String(error) }
      });
      return false;
    }
  }

  /**
   * Execute conversation management
   */
  private async executeConversationManagement(actions: string[], message: Message): Promise<boolean> {
    try {
      for (const action of actions) {
        if (action === 'summary') {
          // Generate conversation summary if requested
          await this.summaryService.generateQuickSummary(message.channel.id, 'detailed');
          logger.info('Auto-generated conversation summary', {
            operation: 'auto-conversation-summary',
            metadata: { channelId: message.channel.id }
          });
        }
      }

      return true;
    } catch (error) {
      logger.warn('Auto conversation management failed', {
        operation: 'auto-conversation-mgmt',
        metadata: { error: String(error) }
      });
      return false;
    }
  }

  /**
   * Execute memory operations
   */
  private async executeMemoryOperations(actions: string[], message: Message): Promise<boolean> {
    try {
      for (const action of actions) {
        if (action === 'update') {
          await this.userMemoryService.updateUserMemory(
            message.author.id,
            { lastUserMessage: message.content },
            {},
            message.guildId || undefined
          );
        }
      }

      return true;
    } catch (error) {
      logger.warn('Auto memory operation failed', {
        operation: 'auto-memory-operation',
        metadata: { error: String(error) }
      });
      return false;
    }
  }

  /**
   * Helper methods for MCP tool execution
   */
  private async executeWebSearch(query: string, results: Map<string, MCPResultValue>): Promise<void> {
    try {
      // Placeholder for web search implementation
      // In a real implementation, this would call the brave search MCP tool
      const searchResult: WebSearchResult = {
        query,
        results: [
          {
            title: 'Example Result',
            description: 'This is a placeholder search result',
            url: 'https://example.com',
            snippet: 'Placeholder snippet'
          }
        ],
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'brave-search',
          toolUsed: 'webSearch'
        }
      };

      results.set('webSearch', searchResult);
    } catch (error) {
      logger.error('Web search execution failed', {
        operation: 'web-search',
        metadata: { query, error: String(error) }
      });
      results.set('webSearchError', { error: String(error) });
    }
  }

  private async executeContentExtraction(urls: string[], results: Map<string, MCPResultValue>): Promise<void> {
    try {
      // Placeholder for content extraction implementation
      // In a real implementation, this would call the firecrawl MCP tool
      const extractionResult: ContentExtractionResult = {
        urls: urls.map(url => ({
          url,
          title: 'Example Page',
          content: 'This is placeholder extracted content',
          metadata: {
            extractedAt: new Date().toISOString(),
            toolUsed: 'firecrawl'
          }
        }))
      };

      results.set('contentExtraction', extractionResult);
    } catch (error) {
      logger.error('Content extraction failed', {
        operation: 'content-extraction',
        metadata: { urls, error: String(error) }
      });
      results.set('extractionError', { error: String(error) });
    }
  }

  private async executeOSRSLookup(query: string, results: Map<string, MCPResultValue>): Promise<void> {
    try {
      // Placeholder for OSRS data lookup implementation
      // In a real implementation, this would call the OSRS MCP tool
      const osrsResult: OSRSDataResult = {
        query,
        data: 'Placeholder OSRS data',
        metadata: {
          timestamp: new Date().toISOString(),
          toolUsed: 'osrsData'
        }
      };

      results.set('osrsData', osrsResult);
    } catch (error) {
      logger.error('OSRS lookup failed', {
        operation: 'osrs-lookup',
        metadata: { query, error: String(error) }
      });
      results.set('osrsError', { error: String(error) });
    }
  }

  /**
   * Helper methods for content extraction
   */
  private extractSearchQuery(content: string): string {
    // Simple extraction - could be enhanced with NLP
    const searchMatch = content.match(/(?:search|look up|find) (?:for |about )?(.+)/i);
    return searchMatch ? searchMatch[1] : content;
  }

  private extractUrls(content: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return content.match(urlRegex) || [];
  }

  private extractOSRSQuery(content: string): string {
    const osrsMatch = content.match(/osrs\s+(.+)/i);
    return osrsMatch ? osrsMatch[1] : 'general';
  }

  /**
   * Store MCP results for later retrieval
   */
  public storeMCPResults(key: string, results: Map<string, MCPResultValue>): void {
    this.mcpResultsCache.set(key, results);
  }

  /**
   * Retrieve and cleanup MCP results
   */
  public retrieveMCPResults(key: string): Map<string, MCPResultValue> | undefined {
    const results = this.mcpResultsCache.get(key);
    if (results) {
      this.mcpResultsCache.delete(key); // Cleanup after retrieval
    }
    return results;
  }
}

// Export singleton instance
export const intelligenceCapabilityService = new IntelligenceCapabilityService();
