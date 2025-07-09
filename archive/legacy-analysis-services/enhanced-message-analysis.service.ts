/**
 * Enhanced Message Analysis Service
 * Analyzes messages to determine processing requirements and capabilities needed
 */

import { MessageAnalysis, AttachmentInfo } from './types.js';

export class EnhancedMessageAnalysisService {
  
  /**
   * Analyzes message content to determine processing requirements
   */
  analyzeMessage(content: string, attachments: AttachmentInfo[]): MessageAnalysis {
    const urls = this.extractUrls(content);
    const attachmentTypes = attachments.map(att => this.getAttachmentType(att.name));
    
    // Determine complexity based on content
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (urls.length > 0 || attachments.length > 0) complexity = 'moderate';
    if (this.containsComplexKeywords(content)) complexity = 'complex';

    // Determine required intents
    const intents = this.detectIntents(content);
    
    // Map intents to required tools
    const requiredTools = this.mapIntentsToTools(intents, attachmentTypes, urls);

    return {
      hasAttachments: attachments.length > 0,
      hasUrls: urls.length > 0,
      attachmentTypes,
      urls,
      complexity,
      intents,
      requiredTools
    };
  }

  /**
   * Extract URLs from message content
   */
  private extractUrls(content: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.match(urlRegex) || [];
  }

  /**
   * Determine attachment type based on filename
   */
  private getAttachmentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) return 'audio';
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return 'document';
    return 'unknown';
  }

  /**
   * Check if content contains complex processing keywords
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
   * Detect user intents from message content
   */
  private detectIntents(content: string): string[] {
    const intents = [];
    const lower = content.toLowerCase();
    
    if (lower.includes('search') || lower.includes('find') || lower.includes('look up')) {
      intents.push('search');
    }
    if (lower.includes('analyze') || lower.includes('explain') || lower.includes('understand')) {
      intents.push('analysis');
    }
    if (lower.includes('remember') || lower.includes('recall') || lower.includes('mentioned')) {
      intents.push('memory');
    }
    if (lower.includes('compare') || lower.includes('difference') || lower.includes('vs')) {
      intents.push('comparison');
    }
    if (lower.includes('solve') || lower.includes('calculate') || lower.includes('problem')) {
      intents.push('problem-solving');
    }
    
    return intents;
  }

  /**
   * Map detected intents to required processing tools
   */
  private mapIntentsToTools(intents: string[], attachmentTypes: string[], urls: string[]): string[] {
    const tools = new Set<string>();
    
    // Always include memory for context
    tools.add('memory');
    
    // Map intents to tools
    if (intents.includes('search')) tools.add('web-search');
    if (intents.includes('analysis') || intents.includes('comparison')) tools.add('complex-reasoning');
    if (intents.includes('problem-solving')) tools.add('complex-reasoning');
    
    // Add tools based on content
    if (attachmentTypes.length > 0) tools.add('multimodal');
    if (urls.length > 0) tools.add('url-processing');
    
    // Add browser automation for complex research
    if (intents.includes('search') && intents.includes('analysis')) {
      tools.add('browser-automation');
    }
    
    return Array.from(tools);
  }

  /**
   * Optimize search query with context and preferences
   */
  optimizeSearchQuery(query: string, context: { results: Map<string, unknown> }): string {
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
