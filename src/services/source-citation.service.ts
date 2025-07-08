/**
 * Source Citation Service
 * Provides transparency by citing sources of information
 */

import { knowledgeBaseService } from './knowledge-base.service.js';
import { logger } from '../utils/logger.js';

export interface Citation {
  id: string;
  source: string;
  sourceId: string;
  sourceUrl?: string;
  content: string;
  confidence: number;
  relevance: number;
  timestamp: Date;
}

export interface CitationResult {
  citations: Citation[];
  hasCitations: boolean;
  primarySource?: Citation;
  confidence: number;
}

export interface ResponseWithCitations {
  response: string;
  citations: Citation[];
  confidence: number;
  sourceSummary: string;
}

export class SourceCitationService {
  private static instance: SourceCitationService;

  private constructor() {}

  static getInstance(): SourceCitationService {
    if (!SourceCitationService.instance) {
      SourceCitationService.instance = new SourceCitationService();
    }
    return SourceCitationService.instance;
  }

  /**
   * Generate citations for a response based on knowledge base
   */
  async generateCitations(
    query: string,
    response: string,
    channelId?: string
  ): Promise<CitationResult> {
    try {
      // Search knowledge base for relevant information
      const knowledgeEntries = await knowledgeBaseService.search({
        query,
        channelId,
        minConfidence: 0.5,
        limit: 5
      });

      if (knowledgeEntries.length === 0) {
        return {
          citations: [],
          hasCitations: false,
          confidence: 0
        };
      }

      // Convert knowledge entries to citations
      const citations: Citation[] = knowledgeEntries.map(entry => ({
        id: entry.id,
        source: this.formatSource(entry.source),
        sourceId: entry.sourceId,
        sourceUrl: entry.sourceUrl === null ? undefined : entry.sourceUrl,
        content: this.extractRelevantContent(entry.content, query),
        confidence: entry.confidence,
        relevance: this.calculateRelevance(query, entry.content),
        timestamp: entry.updatedAt
      }));

      // Sort by relevance and confidence
      citations.sort((a, b) => {
        const scoreA = (a.relevance * 0.6) + (a.confidence * 0.4);
        const scoreB = (b.relevance * 0.6) + (b.confidence * 0.4);
        return scoreB - scoreA;
      });

      const primarySource = citations[0];
      const averageConfidence = citations.reduce((sum, c) => sum + c.confidence, 0) / citations.length;

      return {
        citations,
        hasCitations: true,
        primarySource,
        confidence: averageConfidence
      };
    } catch (error) {
      logger.error('Failed to generate citations', error);
      return {
        citations: [],
        hasCitations: false,
        confidence: 0
      };
    }
  }

  /**
   * Format response with citations
   */
  async formatResponseWithCitations(
    response: string,
    citations: Citation[],
    includeInline: boolean = true
  ): Promise<ResponseWithCitations> {
    try {
      let formattedResponse = response;
      let sourceSummary = '';

      if (citations.length > 0) {
        if (includeInline) {
          // Add inline citations
          formattedResponse = this.addInlineCitations(response, citations);
        }

        // Add source summary
        sourceSummary = this.generateSourceSummary(citations);
      }

      const confidence = citations.length > 0 
        ? citations.reduce((sum, c) => sum + c.confidence, 0) / citations.length
        : 0;

      return {
        response: formattedResponse,
        citations,
        confidence,
        sourceSummary
      };
    } catch (error) {
      logger.error('Failed to format response with citations', error);
      return {
        response,
        citations: [],
        confidence: 0,
        sourceSummary: ''
      };
    }
  }

  /**
   * Add inline citations to response
   */
  private addInlineCitations(response: string, citations: Citation[]): string {
    let formattedResponse = response;

    // Simple approach: add citation markers at the end
    if (citations.length > 0) {
      formattedResponse += '\n\n**Sources:**\n';
      
      citations.forEach((citation, index) => {
        const sourceText = this.formatSourceText(citation);
        formattedResponse += `${index + 1}. ${sourceText}\n`;
      });
    }

    return formattedResponse;
  }

  /**
   * Generate source summary
   */
  private generateSourceSummary(citations: Citation[]): string {
    if (citations.length === 0) {
      return 'No sources available';
    }

    const sourceCounts = citations.reduce((acc, citation) => {
      acc[citation.source] = (acc[citation.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sources = Object.entries(sourceCounts)
      .map(([source, count]) => `${count} from ${source}`)
      .join(', ');

    return `Based on ${citations.length} source(s): ${sources}`;
  }

  /**
   * Format source text for display
   */
  private formatSourceText(citation: Citation): string {
    const confidenceText = citation.confidence > 0.8 ? ' (High confidence)' : 
                          citation.confidence > 0.6 ? ' (Medium confidence)' : 
                          ' (Low confidence)';

    if (citation.source === 'discord_message') {
      return `Discord message${confidenceText}`;
    } else if (citation.source === 'faq') {
      return `FAQ${confidenceText}`;
    } else if (citation.source === 'document') {
      return `Document${confidenceText}`;
    } else {
      return `${citation.source}${confidenceText}`;
    }
  }

  /**
   * Format source type for display
   */
  private formatSource(source: string): string {
    switch (source) {
      case 'discord_message':
        return 'Discord Message';
      case 'faq':
        return 'FAQ';
      case 'document':
        return 'Document';
      case 'manual':
        return 'Manual Entry';
      default:
        return source;
    }
  }

  /**
   * Extract relevant content from knowledge entry
   */
  private extractRelevantContent(content: string, query: string): string {
    // Simple extraction: return first 200 characters
    const maxLength = 200;
    if (content.length <= maxLength) {
      return content;
    }

    // Try to find the most relevant part
    const queryWords = query.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/);
    
    let bestSentence = sentences[0];
    let bestScore = 0;

    sentences.forEach(sentence => {
      const sentenceLower = sentence.toLowerCase();
      const score = queryWords.filter(word => 
        sentenceLower.includes(word)
      ).length;
      
      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence;
      }
    });

    return bestSentence.length > maxLength 
      ? bestSentence.substring(0, maxLength) + '...'
      : bestSentence;
  }

  /**
   * Calculate relevance between query and content
   */
  private calculateRelevance(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    const matches = queryWords.filter(word => 
      contentWords.some(contentWord => contentWord.includes(word))
    );
    
    return matches.length / queryWords.length;
  }

  /**
   * Create citation from Discord message
   */
  async createDiscordCitation(
    messageId: string,
    channelId: string,
    content: string,
    query: string
  ): Promise<Citation> {
    try {
      const knowledgeEntry = await knowledgeBaseService.addFromDiscordMessage(
        messageId,
        content,
        channelId,
        'system', // Will be updated with actual author
        [],
        0.8
      );

      return {
        id: knowledgeEntry.id,
        source: 'Discord Message',
        sourceId: messageId,
        sourceUrl: `https://discord.com/channels/${channelId}/${messageId}`,
        content: this.extractRelevantContent(content, query),
        confidence: knowledgeEntry.confidence,
        relevance: this.calculateRelevance(query, content),
        timestamp: knowledgeEntry.createdAt
      };
    } catch (error) {
      logger.error('Failed to create Discord citation', error);
      throw error;
    }
  }

  /**
   * Get citation statistics
   */
  async getCitationStats(): Promise<{
    totalCitations: number;
    bySource: Record<string, number>;
    averageConfidence: number;
    recentCitations: number;
  }> {
    try {
      const stats = await knowledgeBaseService.getStats();
      
      return {
        totalCitations: stats.totalEntries,
        bySource: stats.bySource,
        averageConfidence: stats.averageConfidence,
        recentCitations: stats.recentAdditions
      };
    } catch (error) {
      logger.error('Failed to get citation stats', error);
      return {
        totalCitations: 0,
        bySource: {},
        averageConfidence: 0,
        recentCitations: 0
      };
    }
  }
}

// Export singleton instance
export const sourceCitationService = SourceCitationService.getInstance(); 