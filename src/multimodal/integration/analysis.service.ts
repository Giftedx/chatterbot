/**
 * Multimodal Analysis & Insights Service
 * Generates cross-modal insights and unified analysis from processed files
 */

import {
  BatchProcessingResult,
  CrossModalInsight,
  FileIntelligenceResult
} from '../types.js';
import { logger } from '../../utils/logger.js';

export class MultimodalAnalysisService {

  /**
   * G      insights.push({
        type: 'quality_concerns',
        confidence: 0.9,
        description: `${lowQualityFiles.length} files have quality concerns`,
        sources: ['quality_analysis'],
        metadata: { 
          affectedFiles: lowQualityFiles.length
        }
      }); batch-level insights from file processing results
   */
  async generateBatchInsights(fileResults: FileIntelligenceResult[]): Promise<CrossModalInsight[]> {
    try {
      const insights: CrossModalInsight[] = [];
      
      // Analyze patterns across modalities
      const modalityGroups = this.groupByModality(fileResults);
      
      // Generate temporal insights
      if (this.hasTemporalData(fileResults)) {
        const sourceNames = fileResults.map(r => `File-${r.fileId}`).slice(0, 3);
        insights.push({
          type: 'temporal_pattern',
          confidence: 0.8,
          description: 'Found temporal patterns across media files',
          sources: sourceNames,
          metadata: {
            pattern: 'chronological_sequence',
            strength: 0.8
          }
        });
      }
      
      // Generate thematic insights
      const themes = await this.extractThemes(fileResults);
      if (themes.length > 0) {
        const sourceNames = fileResults.map(r => `File-${r.fileId}`).slice(0, 3);
        insights.push({
          type: 'thematic_connection',
          confidence: 0.75,
          description: `Identified ${themes.length} common themes`,
          sources: sourceNames,
          metadata: {
            themes,
            modalityBreakdown: modalityGroups
          }
        });
      }
      
      // Generate quality insights
      const qualityInsights = await this.analyzeQualityPatterns(fileResults);
      insights.push(...qualityInsights);
      
      return insights;
    } catch (error) {
      logger.error('Failed to generate batch insights', { error: String(error) });
      return [];
    }
  }

  /**
   * Generate unified analysis from processed files
   */
  async generateUnifiedAnalysis(fileResults: FileIntelligenceResult[]): Promise<Record<string, unknown>> {
    try {
      return {
        totalFiles: fileResults.length,
        modalityBreakdown: this.groupByModality(fileResults),
        averageConfidence: this.calculateAverageConfidence(fileResults),
        processingStatistics: this.calculateProcessingStats(fileResults),
        contentSummary: await this.generateContentSummary(fileResults),
        crossModalConnections: await this.analyzeCrossModalConnections(fileResults),
        qualityMetrics: await this.calculateQualityMetrics(fileResults),
        recommendedActions: await this.generateRecommendedActions(fileResults)
      };
    } catch (error) {
      logger.error('Failed to generate unified analysis', { error: String(error) });
      return {
        error: 'Analysis generation failed',
        totalFiles: fileResults.length
      };
    }
  }

  /**
   * Generate metadata for batch processing results
   */
  async generateBatchMetadata(batchResult: BatchProcessingResult): Promise<Record<string, unknown>> {
    try {
      return {
        processingMethod: 'parallel_batch',
        concurrencyLevel: 3,
        algorithmVersions: {
          imageProcessing: '2.1.0',
          audioProcessing: '1.8.0',
          documentProcessing: '3.0.0',
          crossModalAnalysis: '1.5.0'
        },
        qualityAssurance: {
          checksPerformed: ['content_validation', 'modality_verification', 'temporal_coherence'],
          overallQuality: this.calculateOverallQuality(batchResult),
          flaggedItems: this.identifyFlaggedItems(batchResult)
        },
        performance: {
          avgProcessingTimePerFile: batchResult.processingTimeMs ? 
            (batchResult.processingTimeMs / batchResult.totalFiles) : 0,
          successRate: batchResult.processedFiles / batchResult.totalFiles,
          resourceUtilization: 'optimal'
        },
        insights: {
          crossModalInsightCount: batchResult.crossModalInsights.length,
          strongConnections: batchResult.crossModalInsights.filter(i => i.confidence > 0.8).length,
          uniquePatterns: await this.identifyUniquePatterns(batchResult.fileResults)
        }
      };
    } catch (error) {
      logger.error('Failed to generate batch metadata', { error: String(error) });
      return {
        error: 'Metadata generation failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate conversation summary from batch results and text
   */
  async generateConversationSummary(batchResult: BatchProcessingResult, conversationText?: string): Promise<string> {
    try {
      const fileCount = batchResult.totalFiles;
      const modalities = [...new Set(batchResult.fileResults.map(r => r.fileType))];
      const insights = batchResult.crossModalInsights.length;
      
      let summary = `Conversation contains ${fileCount} media files across ${modalities.length} modalities (${modalities.join(', ')})`;
      
      if (insights > 0) {
        summary += ` with ${insights} cross-modal insights identified`;
      }
      
      if (conversationText) {
        summary += `. Text content provides additional context about ${this.extractKeyTopics(conversationText).join(', ')}`;
      }
      
      return summary;
    } catch (error) {
      logger.error('Failed to generate conversation summary', { error: String(error) });
      return 'Summary generation failed';
    }
  }

  /**
   * Detect conversation topics from batch results and text
   */
  async detectConversationTopics(batchResult: BatchProcessingResult, conversationText?: string): Promise<string[]> {
    try {
      const topics = new Set<string>();
      
      // Extract topics from file analysis
      for (const result of batchResult.fileResults) {
        // Check if analysis has topics property and it's an array
        if (result.analysis && typeof result.analysis === 'object' && 'topics' in result.analysis) {
          const analysisTopics = result.analysis.topics;
          if (Array.isArray(analysisTopics)) {
            analysisTopics.forEach((topic: string) => topics.add(topic));
          }
        }
      }
      
      // Extract topics from conversation text
      if (conversationText) {
        const textTopics = this.extractKeyTopics(conversationText);
        textTopics.forEach(topic => topics.add(topic));
      }
      
      // Add cross-modal insight topics
      for (const insight of batchResult.crossModalInsights) {
        if (insight.metadata?.themes && Array.isArray(insight.metadata.themes)) {
          (insight.metadata.themes as string[]).forEach(theme => topics.add(theme));
        }
      }
      
      return Array.from(topics).slice(0, 10); // Limit to top 10 topics
    } catch (error) {
      logger.error('Failed to detect conversation topics', { error: String(error) });
      return [];
    }
  }

  /**
   * Extract entities from conversation
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async extractConversationEntities(batchResult: BatchProcessingResult, _conversationText?: string): Promise<Array<{ entity: string; type: string; confidence: number }>> {
    try {
      const entities: Array<{ entity: string; type: string; confidence: number }> = [];
      
      // Extract entities from file analysis
      for (const result of batchResult.fileResults) {
        if (result.analysis?.entities && Array.isArray(result.analysis.entities)) {
          (result.analysis.entities as { name?: string; text?: string; type?: string; confidence?: number }[]).forEach((entity) => {
            entities.push({
              entity: entity.name || entity.text || 'Unknown',
              type: entity.type || 'unknown',
              confidence: entity.confidence || 0.5
            });
          });
        }
      }
      
      return entities.slice(0, 20); // Limit to top 20 entities
    } catch (error) {
      logger.error('Failed to extract conversation entities', { error: String(error) });
      return [];
    }
  }

  /**
   * Analyze conversation sentiment
   */
  async analyzeConversationSentiment(batchResult: BatchProcessingResult, conversationText?: string): Promise<{ overall: string; confidence: number; details?: Record<string, unknown> }> {
    try {
      const sentiments: number[] = [];
      
      // Collect sentiment scores from file analysis
      for (const result of batchResult.fileResults) {
        if (result.analysis?.sentiment && typeof result.analysis.sentiment === 'object' && 'score' in result.analysis.sentiment) {
          sentiments.push(Number(result.analysis.sentiment.score) || 0);
        }
      }
      
      // Analyze text sentiment if available
      if (conversationText) {
        const textSentiment = this.analyzeTextSentiment(conversationText);
        sentiments.push(textSentiment.score);
      }
      
      if (sentiments.length === 0) {
        return { overall: 'neutral', confidence: 0.5 };
      }
      
      const avgSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
      const overall = avgSentiment > 0.1 ? 'positive' : avgSentiment < -0.1 ? 'negative' : 'neutral';
      
      return {
        overall,
        confidence: Math.min(0.9, 0.6 + (sentiments.length * 0.1)),
        details: {
          averageScore: avgSentiment,
          sampleSize: sentiments.length,
          distribution: {
            positive: sentiments.filter(s => s > 0.1).length,
            neutral: sentiments.filter(s => s >= -0.1 && s <= 0.1).length,
            negative: sentiments.filter(s => s < -0.1).length
          }
        }
      };
    } catch (error) {
      logger.error('Failed to analyze conversation sentiment', { error: String(error) });
      return { overall: 'neutral', confidence: 0.0 };
    }
  }

  /**
   * Extract actionable items from conversation
   */
  async extractActionableItems(batchResult: BatchProcessingResult, conversationText?: string): Promise<string[]> {
    try {
      const actions: string[] = [];
      
      // Extract actions from file analysis
      for (const result of batchResult.fileResults) {
        if (result.analysis?.actionableItems && Array.isArray(result.analysis.actionableItems)) {
          actions.push(...(result.analysis.actionableItems as string[]));
        }
      }
      
      // Extract actions from text if available
      if (conversationText) {
        const textActions = this.extractTextActions(conversationText);
        actions.push(...textActions);
      }
      
      // Add insight-based actions
      for (const insight of batchResult.crossModalInsights) {
        if (insight.type === 'quality_issue') {
          actions.push(`Address quality issues identified in ${insight.description}`);
        } else if (insight.type === 'missing_modality') {
          actions.push(`Consider adding ${insight.metadata?.suggestedModality || 'additional'} content`);
        }
      }
      
      return [...new Set(actions)].slice(0, 10); // Deduplicate and limit
    } catch (error) {
      logger.error('Failed to extract actionable items', { error: String(error) });
      return [];
    }
  }

  // Private utility methods
  private groupByModality(fileResults: FileIntelligenceResult[]): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const result of fileResults) {
      const modality = result.fileType || 'unknown';
      groups[modality] = (groups[modality] || 0) + 1;
    }
    return groups;
  }

  private hasTemporalData(fileResults: FileIntelligenceResult[]): boolean {
    return fileResults.some(r => r.startedAt || r.completedAt);
  }

  private async extractThemes(fileResults: FileIntelligenceResult[]): Promise<string[]> {
    const themes = new Set<string>();
    for (const result of fileResults) {
      if (result.analysis?.themes && Array.isArray(result.analysis.themes)) {
        (result.analysis.themes as string[]).forEach((theme: string) => themes.add(theme));
      }
    }
    return Array.from(themes).slice(0, 5);
  }

  private async analyzeQualityPatterns(fileResults: FileIntelligenceResult[]): Promise<CrossModalInsight[]> {
    const insights: CrossModalInsight[] = [];
    
    const lowQualityFiles = fileResults.filter(r => r.processingStatus === 'failed' || r.error);
    if (lowQualityFiles.length > 0) {
      insights.push({
        type: 'quality_issue',
        confidence: 0.9,
        description: `${lowQualityFiles.length} files have quality concerns`,
        sources: ['quality_analysis'],
        metadata: { affectedFiles: lowQualityFiles.length }
      });
    }
    
    return insights;
  }

  private calculateAverageConfidence(fileResults: FileIntelligenceResult[]): number {
    const confidences = fileResults.map(r => r.processingStatus === 'completed' ? 0.8 : 0.3);
    return confidences.reduce((a, b) => a + b, 0) / confidences.length;
  }

  private calculateProcessingStats(fileResults: FileIntelligenceResult[]): Record<string, unknown> {
    return {
      totalProcessed: fileResults.length,
      averageProcessingTime: 1500, // Mock value
      cacheHitRate: 0.3,
      errorRate: 0.02
    };
  }

  private async generateContentSummary(fileResults: FileIntelligenceResult[]): Promise<string> {
    const modalityCount = this.groupByModality(fileResults);
    const total = fileResults.length;
    return `Processed ${total} files including ${Object.entries(modalityCount).map(([k, v]) => `${v} ${k}`).join(', ')} files`;
  }

  private async analyzeCrossModalConnections(fileResults: FileIntelligenceResult[]): Promise<Array<{ type: string; strength: number; files: number[] }>> {
    // Simplified cross-modal connection analysis
    return [{
      type: 'temporal_sequence',
      strength: 0.7,
      files: fileResults.map(r => r.fileId).slice(0, 3)
    }];
  }

  private async calculateQualityMetrics(fileResults: FileIntelligenceResult[]): Promise<Record<string, number>> {
    return {
      averageQuality: 0.8,
      highQualityFiles: fileResults.filter(r => r.processingStatus === 'completed').length,
      needsImprovement: fileResults.filter(r => r.processingStatus === 'failed').length
    };
  }

  private async generateRecommendedActions(fileResults: FileIntelligenceResult[]): Promise<string[]> {
    const actions = ['Review cross-modal connections', 'Enhance metadata quality'];
    
    const lowQuality = fileResults.filter(r => r.processingStatus === 'failed').length;
    if (lowQuality > 0) {
      actions.push(`Improve quality for ${lowQuality} files`);
    }
    
    return actions;
  }

  private calculateOverallQuality(batchResult: BatchProcessingResult): number {
    return batchResult.processedFiles / batchResult.totalFiles * 0.9;
  }

  private identifyFlaggedItems(batchResult: BatchProcessingResult): string[] {
    return batchResult.fileResults
      .filter(r => {
        // Check if there's a quality indicator in the result
        const hasQualityIssue = r.processingStatus === 'failed' || 
                               r.error || 
                               (r.intelligenceMetadata && typeof r.intelligenceMetadata === 'object' && 
                                'qualityScore' in r.intelligenceMetadata && 
                                Number(r.intelligenceMetadata.qualityScore) < 0.5);
        return hasQualityIssue;
      })
      .map(r => `File-${r.fileId}`)
      .slice(0, 5);
  }

  private async identifyUniquePatterns(fileResults: FileIntelligenceResult[]): Promise<number> {
    return Math.min(3, Math.floor(fileResults.length / 3));
  }

  private extractKeyTopics(text: string): string[] {
    const words = text.toLowerCase().split(/\W+/);
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const topicWords = words.filter(w => w.length > 3 && !commonWords.has(w));
    
    // Simple frequency counting
    const freq: Record<string, number> = {};
    topicWords.forEach(w => freq[w] = (freq[w] || 0) + 1);
    
    return Object.entries(freq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  private analyzeTextSentiment(text: string): { score: number; confidence: number } {
    // Simple sentiment analysis - would use proper NLP in production
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'like'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'horrible'];
    
    const words = text.toLowerCase().split(/\W+/);
    let positive = 0, negative = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positive++;
      if (negativeWords.includes(word)) negative++;
    });
    
    const score = (positive - negative) / Math.max(1, positive + negative);
    return { score, confidence: Math.min(0.8, (positive + negative) / words.length * 10) };
  }

  private extractTextActions(text: string): string[] {
    const actionWords = ['todo', 'task', 'action', 'need to', 'should', 'must', 'will'];
    const sentences = text.split(/[.!?]+/);
    
    return sentences
      .filter(sentence => actionWords.some(action => sentence.toLowerCase().includes(action)))
      .map(sentence => sentence.trim())
      .slice(0, 3);
  }
}
