/**
 * Example Multimodal Service
 * Demonstrates comprehensive usage of the multimodal AI system
 */

import {
  MultimodalIntegrationService,
  FileIntelligenceService,
  MediaFile,
  FileProcessingOptions,
  BatchProcessingResult,
  ConversationContext,
  MediaSearchQuery,
  FileType
} from './index.js';
import { logger } from '../utils/logger.js';

/**
 * Example service showing how to use the com      case 'comprehensive':
        return {
          enableTranscription: true,
          enableSentimentAnalysis: true
        }; AI suite
 */
export class ExampleMultimodalService {
  private readonly integrationService: MultimodalIntegrationService;
  private readonly fileIntelligenceService: FileIntelligenceService;

  constructor() {
    this.integrationService = new MultimodalIntegrationService();
    this.fileIntelligenceService = new FileIntelligenceService();
  }

  /**
   * Example: Process a mixed-media conversation
   */
  public async processConversationExample(
    conversationId: string,
    mediaFiles: MediaFile[],
    conversationText: string
  ): Promise<ConversationContext> {
    try {
      logger.info('Processing example conversation', {
        operation: 'conversation-example',
        metadata: {
          conversationId,
          fileCount: mediaFiles.length,
          hasText: !!conversationText
        }
      });

      // Process the conversation with comprehensive analysis
      const context = await this.integrationService.processConversationContext(
        conversationId,
        mediaFiles,
        conversationText,
        {
          enableTranscription: true,
          enableSentimentAnalysis: true
        }
      );

      // Log insights
      logger.info('Conversation processing completed', {
        operation: 'conversation-example',
        metadata: {
          conversationId,
          summary: context.conversationSummary,
          topicCount: context.topicDetection?.length || 0,
          sentiment: context.sentimentAnalysis?.overall,
          actionItemCount: context.actionableItems?.length || 0,
          confidenceScore: context.confidenceScores.overall
        }
      });

      return context;

    } catch (error) {
      logger.error('Conversation processing failed', {
        operation: 'conversation-example',
        metadata: {
          conversationId,
          error: String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Example: Batch process a collection of related files
   */
  public async processBatchExample(
    mediaFiles: MediaFile[],
    description: string
  ): Promise<BatchProcessingResult> {
    try {
      logger.info('Processing batch example', {
        operation: 'batch-example',
        metadata: {
          fileCount: mediaFiles.length,
          fileTypes: [...new Set(mediaFiles.map(f => f.fileType))],
          description
        }
      });

      // Process batch with comprehensive options
      const batchResult = await this.integrationService.processBatch(mediaFiles, {
        enableTranscription: true
      });

      // Generate insights report
      const insights = this.generateBatchInsightsReport(batchResult);
      logger.info('Batch processing completed', {
        operation: 'batch-example',
        metadata: {
          batchId: batchResult.batchId,
          successRate: (batchResult.processedFiles / batchResult.totalFiles) * 100,
          processingTime: batchResult.processingTimeMs,
          insights
        }
      });

      return batchResult;

    } catch (error) {
      logger.error('Batch processing failed', {
        operation: 'batch-example',
        metadata: {
          fileCount: mediaFiles.length,
          error: String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Example: Intelligent content search across all modalities
   */
  public async searchContentExample(
    query: string,
    userId: string,
    searchType: 'general' | 'semantic' | 'specific' = 'semantic'
  ): Promise<Array<{
    file: MediaFile;
    relevanceScore: number;
    explanation: string;
    relatedFiles: MediaFile[];
  }>> {
    try {
      logger.info('Performing content search example', {
        operation: 'search-example',
        metadata: {
          userId,
          query,
          searchType
        }
      });

      const searchQuery: MediaSearchQuery = {
        text: query,
        type: searchType === 'specific' ? 'content' : searchType,
        includeModalities: ['image', 'audio', 'document', 'video'] as FileType[],
        limit: 20,
        filters: {
          userId,
          hasText: true
        }
      };

      // Perform semantic search
      const results = await this.integrationService.semanticSearch(searchQuery, userId);

      // Enhance results with explanations
      const enhancedResults = results.map(result => ({
        file: result.file,
        relevanceScore: result.relevanceScore,
        explanation: this.generateSearchExplanation(result),
        relatedFiles: result.crossModalConnections
          .slice(0, 3)
          .map(conn => ({ id: conn.connectedFileId } as MediaFile))
      }));

      logger.info('Content search completed', {
        operation: 'search-example',
        metadata: {
          userId,
          query,
          resultCount: enhancedResults.length,
          avgRelevance: enhancedResults.reduce((sum, r) => sum + r.relevanceScore, 0) / enhancedResults.length
        }
      });

      return enhancedResults;

    } catch (error) {
      logger.error('Content search failed', {
        operation: 'search-example',
        metadata: {
          userId,
          query,
          error: String(error)
        }
      });
      return [];
    }
  }

  /**
   * Example: Process a single file with detailed analysis
   */
  public async processFileExample(
    mediaFile: MediaFile,
    analysisDepth: 'basic' | 'detailed' | 'comprehensive' = 'comprehensive'
  ): Promise<{
    analysis: any;
    insights: string[];
    recommendations: string[];
    summary: string;
  }> {
    try {
      logger.info('Processing file example', {
        operation: 'file-example',
        metadata: {
          fileId: mediaFile.id,
          fileName: mediaFile.originalName,
          fileType: mediaFile.fileType,
          analysisDepth
        }
      });

      // Configure processing options based on depth
      const options: FileProcessingOptions = this.getProcessingOptionsForDepth(analysisDepth);

      // Process the file
      const result = await this.fileIntelligenceService.processFile(mediaFile, options);

      if (!result) {
        throw new Error('File processing failed');
      }

      // Generate insights and recommendations
      const insights = this.extractInsights(result);
      const recommendations = this.generateRecommendations(result);
      const summary = this.generateFileSummary(result);

      logger.info('File processing completed', {
        operation: 'file-example',
        metadata: {
          fileId: mediaFile.id,
          processingStatus: result.processingStatus,
          processingTime: result.processingTimeMs,
          insightCount: insights.length,
          recommendationCount: recommendations.length,
          hasError: !!result.error
        }
      });

      return {
        analysis: result.analysis,
        insights,
        recommendations,
        summary
      };

    } catch (error) {
      logger.error('File processing failed', {
        operation: 'file-example',
        metadata: {
          fileId: mediaFile.id,
          fileName: mediaFile.originalName,
          error: String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Example: Get content recommendations for a user
   */
  public async getRecommendationsExample(
    userId: string,
    context?: {
      recentActivity?: string[];
      preferences?: Record<string, unknown>;
      currentProject?: string;
    }
  ): Promise<Array<{
    title: string;
    description: string;
    actionSteps: string[];
    priority: 'high' | 'medium' | 'low';
    category: string;
  }>> {
    try {
      logger.info('Generating recommendations example', {
        operation: 'recommendations-example',
        metadata: {
          userId,
          hasContext: !!context,
          hasActivity: !!context?.recentActivity,
          hasPreferences: !!context?.preferences
        }
      });

      // Get intelligent recommendations
      const recommendations = await this.integrationService.generateContentRecommendations(
        userId,
        10 // limit
      );

      // Format for presentation
      const formattedRecommendations = recommendations.map(rec => ({
        title: rec.title,
        description: rec.description,
        actionSteps: rec.suggestedActions || [],
        priority: rec.priority === 1 ? 'high' : rec.priority === 2 ? 'medium' : 'low' as 'high' | 'medium' | 'low',
        category: rec.type
      }));

      logger.info('Recommendations generated', {
        operation: 'recommendations-example',
        metadata: {
          userId,
          recommendationCount: formattedRecommendations.length,
          highPriority: formattedRecommendations.filter(r => r.priority === 'high').length,
          categories: [...new Set(formattedRecommendations.map(r => r.category))]
        }
      });

      return formattedRecommendations;

    } catch (error) {
      logger.error('Recommendations generation failed', {
        operation: 'recommendations-example',
        metadata: {
          userId,
          error: String(error)
        }
      });
      return [];
    }
  }

  // Helper methods

  private generateBatchInsightsReport(batchResult: BatchProcessingResult): Record<string, unknown> {
    return {
      summary: {
        successRate: (batchResult.processedFiles / batchResult.totalFiles) * 100,
        avgProcessingTime: batchResult.processingTimeMs,
        fileTypeDistribution: this.analyzeFileTypeDistribution(batchResult.fileResults)
      },
      insights: {
        crossModalInsightCount: batchResult.crossModalInsights.length,
        commonThemes: this.extractCommonThemes(batchResult),
        contentComplexity: this.assessOverallComplexity(batchResult)
      },
      quality: {
        avgConfidence: this.calculateAverageConfidence(batchResult.fileResults),
        qualityDistribution: this.analyzeQualityDistribution(batchResult.fileResults)
      }
    };
  }

  private generateSearchExplanation(
    result: any
  ): string {
    const matchType = result.matchDetails.type;
    const confidence = Math.round(result.matchDetails.confidence * 100);
    
    switch (matchType) {
      case 'exact_text_match':
        return `Exact text match found with ${confidence}% confidence in document content.`;
      case 'description_match':
        return `Query matches file description with ${confidence}% confidence.`;
      case 'semantic_match':
        return `Semantic similarity detected with ${confidence}% confidence.`;
      default:
        return `Content relevance: ${confidence}% confidence based on ${matchType}.`;
    }
  }

  private getProcessingOptionsForDepth(depth: 'basic' | 'detailed' | 'comprehensive'): FileProcessingOptions {
    switch (depth) {
      case 'basic':
        return {
          enableTranscription: false
        };
      case 'detailed':
        return {
          enableTranscription: true,
          enableSentimentAnalysis: true
        };
      case 'comprehensive':
        return {
          enableTranscription: true,
          enableSentimentAnalysis: true
        };
    }
  }

  private extractInsights(result: any): string[] {
    const insights = [];

    // Extract insights from cross-modal analysis
    if (result.crossModalInsights) {
      insights.push(...result.crossModalInsights.map((insight: any) => insight.description));
    }

    // Extract insights from analysis results
    if (result.analysis.vision?.description) {
      insights.push(`Visual content: ${result.analysis.vision.description}`);
    }

    if (result.analysis.audio?.transcription?.text) {
      insights.push(`Audio content: ${result.analysis.audio.transcription.text.substring(0, 100)}...`);
    }

    if (result.analysis.document?.summary) {
      insights.push(`Document summary: ${result.analysis.document.summary}`);
    }

    return insights.slice(0, 5); // Return top 5 insights
  }

  private generateRecommendations(result: any): string[] {
    const recommendations = [];

    // Extract from built-in recommendations
    if (result.recommendations) {
      recommendations.push(...result.recommendations.map((rec: any) => rec.description));
    }

    // Generate additional recommendations based on analysis
    if (result.intelligenceMetadata?.contentComplexity === 'very_complex') {
      recommendations.push('Consider breaking down complex content into smaller, more digestible parts.');
    }

    if (result.intelligenceMetadata?.confidenceScores?.overall < 0.7) {
      recommendations.push('Content quality could be improved for better analysis results.');
    }

    return recommendations.slice(0, 5); // Return top 5 recommendations
  }

  private generateFileSummary(result: any): string {
    const parts = [];
    
    parts.push(`File type: ${result.fileType}`);
    parts.push(`Processing status: ${result.processingStatus}`);
    
    if (result.processingTimeMs) {
      parts.push(`Processing time: ${result.processingTimeMs}ms`);
    }

    if (result.intelligenceMetadata?.confidenceScores?.overall) {
      const confidence = Math.round(result.intelligenceMetadata.confidenceScores.overall * 100);
      parts.push(`Analysis confidence: ${confidence}%`);
    }

    if (result.crossModalInsights?.length > 0) {
      parts.push(`Cross-modal insights: ${result.crossModalInsights.length} detected`);
    }

    return parts.join(' | ');
  }

  private analyzeFileTypeDistribution(fileResults: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    fileResults.forEach(result => {
      const type = result.fileType;
      distribution[type] = (distribution[type] || 0) + 1;
    });

    return distribution;
  }

  private extractCommonThemes(batchResult: BatchProcessingResult): string[] {
    // Extract themes from cross-modal insights
    const themes = new Set<string>();
    
    batchResult.crossModalInsights.forEach(insight => {
      if (insight.metadata?.themes) {
        (insight.metadata.themes as string[]).forEach(theme => themes.add(theme));
      }
    });

    return Array.from(themes).slice(0, 5);
  }

  private assessOverallComplexity(batchResult: BatchProcessingResult): string {
    const complexityScores = batchResult.fileResults
      .map(result => {
        const complexity = result.intelligenceMetadata?.contentComplexity;
        switch (complexity) {
          case 'simple': return 1;
          case 'moderate': return 2;
          case 'complex': return 3;
          case 'very_complex': return 4;
          default: return 2;
        }
      });

    const avgComplexity = complexityScores.reduce((sum, score) => sum + score, 0) / complexityScores.length;
    
    if (avgComplexity < 1.5) return 'simple';
    if (avgComplexity < 2.5) return 'moderate';
    if (avgComplexity < 3.5) return 'complex';
    return 'very_complex';
  }

  private calculateAverageConfidence(fileResults: any[]): number {
    const confidenceScores = fileResults
      .map(result => result.intelligenceMetadata?.confidenceScores?.overall)
      .filter(score => typeof score === 'number');

    return confidenceScores.length > 0 
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length 
      : 0;
  }

  private analyzeQualityDistribution(fileResults: any[]): Record<string, number> {
    const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
    
    fileResults.forEach(result => {
      const confidence = result.intelligenceMetadata?.confidenceScores?.overall || 0;
      if (confidence > 0.9) distribution.excellent++;
      else if (confidence > 0.7) distribution.good++;
      else if (confidence > 0.5) distribution.fair++;
      else distribution.poor++;
    });

    return distribution;
  }
}
