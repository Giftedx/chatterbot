/**
 * Multimodal Integration Service
 * Unified service for processing mixed content and providing holistic analysis
 */

import {
  MediaFile,
  FileProcessingOptions,
  BatchProcessingResult,
  ConversationContext,
  CrossModalInsight,
  MediaSearchQuery,
  FileIntelligenceResult
} from './types.js';
import { FileIntelligenceService } from './file-intelligence.service.js';
import { ImageAnalysisService } from './image-analysis/index.js';
import { AudioAnalysisService } from './audio-analysis/index.js';
import { DocumentProcessingService } from './document-processing.service.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

/**
 * Comprehensive multimodal integration service for unified processing and analysis
 */
export class MultimodalIntegrationService {
  private readonly fileIntelligenceService: FileIntelligenceService;
  private readonly imageService: ImageAnalysisService;
  private readonly audioService: AudioAnalysisService;
  private readonly documentService: DocumentProcessingService;
  
  constructor() {
    this.fileIntelligenceService = new FileIntelligenceService();
    this.imageService = new ImageAnalysisService();
    this.audioService = new AudioAnalysisService();
    this.documentService = new DocumentProcessingService();
  }

  /**
   * Process multiple files in batch with intelligent relationship detection
   */
  public async processBatch(
    mediaFiles: MediaFile[],
    options: FileProcessingOptions = {}
  ): Promise<BatchProcessingResult> {
    try {
      const startTime = Date.now();

      logger.info('Starting batch multimodal processing', {
        operation: 'batch-processing',
        metadata: {
          fileCount: mediaFiles.length,
          fileTypes: [...new Set(mediaFiles.map(f => f.fileType))],
          userId: mediaFiles[0]?.userId
        }
      });

      const batchResult: BatchProcessingResult = {
        batchId: `batch_${Date.now()}`,
        totalFiles: mediaFiles.length,
        processedFiles: 0,
        failedFiles: 0,
        startedAt: new Date(startTime),
        fileResults: [],
        crossModalInsights: [],
        unifiedAnalysis: {},
        batchMetadata: {},
        totalInsights: 0
      };

      // Process files in parallel with concurrency limit
      const concurrencyLimit = 3;
      const chunks = this.chunkArray(mediaFiles, concurrencyLimit);
      
      for (const chunk of chunks) {
        const chunkPromises = chunk.map(async (file) => {
          try {
            const result = await this.fileIntelligenceService.processFile(file, options);
            if (result) {
              batchResult.fileResults.push(result);
              batchResult.processedFiles++;
            } else {
              batchResult.failedFiles++;
            }
            return result;
          } catch (error) {
            logger.error('File processing failed in batch', {
              operation: 'batch-file-processing',
              metadata: {
                fileId: file.id,
                fileName: file.originalName,
                error: String(error)
              }
            });
            batchResult.failedFiles++;
            return null;
          }
        });

        await Promise.all(chunkPromises);
      }

      // Generate batch-level insights
      batchResult.crossModalInsights = await this.generateBatchInsights(batchResult.fileResults);
      batchResult.unifiedAnalysis = await this.generateUnifiedAnalysis(batchResult.fileResults);
      batchResult.batchMetadata = await this.generateBatchMetadata(batchResult);

      // Finalize batch processing
      const processingTime = Date.now() - startTime;
      batchResult.completedAt = new Date();
      batchResult.processingTimeMs = processingTime;
      batchResult.status = batchResult.processedFiles > 0 ? 'completed' : 'failed';

      // Store batch results
      await this.storeBatchResults(batchResult);

      logger.info('Batch multimodal processing completed', {
        operation: 'batch-processing',
        metadata: {
          batchId: batchResult.batchId,
          processedFiles: batchResult.processedFiles,
          failedFiles: batchResult.failedFiles,
          processingTime,
          crossModalInsightCount: batchResult.crossModalInsights.length
        }
      });

      return batchResult;

    } catch (error) {
      logger.error('Batch processing failed', {
        operation: 'batch-processing',
        metadata: {
          fileCount: mediaFiles.length,
          error: String(error)
        }
      });

      return {
        batchId: `batch_error_${Date.now()}`,
        totalFiles: mediaFiles.length,
        processedFiles: 0,
        failedFiles: mediaFiles.length,
        startedAt: new Date(),
        status: 'failed',
        error: String(error),
        fileResults: [],
        crossModalInsights: [],
        unifiedAnalysis: {},
        batchMetadata: {},
        totalInsights: 0
      };
    }
  }

  /**
   * Process conversation with multimodal context awareness
   */
  public async processConversationContext(
    conversationId: string,
    mediaFiles: MediaFile[],
    conversationText?: string,
    options: FileProcessingOptions = {}
  ): Promise<ConversationContext> {
    try {
      logger.info('Processing conversation context', {
        operation: 'conversation-context',
        metadata: {
          conversationId,
          fileCount: mediaFiles.length,
          hasText: !!conversationText
        }
      });

      // Process all media files
      const batchResult = await this.processBatch(mediaFiles, options);

      // Create conversation context
      const context: ConversationContext = {
        conversationId,
        processedAt: new Date(),
        mediaFiles: mediaFiles.map(file => ({
          id: file.id,
          type: file.fileType,
          name: file.originalName,
          mimeType: file.mimeType
        })),
        textContent: conversationText,
        multimodalAnalysis: batchResult.unifiedAnalysis,
        crossModalInsights: batchResult.crossModalInsights,
        conversationSummary: await this.generateConversationSummary(batchResult, conversationText),
        topicDetection: await this.detectConversationTopics(batchResult, conversationText),
        entityMentions: await this.extractConversationEntities(batchResult),
        sentimentAnalysis: await this.analyzeConversationSentiment(batchResult),
        actionableItems: await this.extractActionableItems(batchResult, conversationText),
        confidenceScores: this.calculateContextConfidence(batchResult)
      };

      // Store conversation context
      await this.storeConversationContext(context);

      return context;

    } catch (error) {
      logger.error('Conversation context processing failed', {
        operation: 'conversation-context',
        metadata: {
          conversationId,
          error: String(error)
        }
      });

      return {
        conversationId,
        processedAt: new Date(),
        mediaFiles: [],
        multimodalAnalysis: {},
        crossModalInsights: [],
        error: String(error),
        confidenceScores: { overall: 0 }
      };
    }
  }

  /**
   * Advanced semantic search across all modalities
   */
  public async semanticSearch(
    query: MediaSearchQuery,
    userId: string
  ): Promise<Array<{
    file: MediaFile;
    relevanceScore: number;
    matchDetails: {
      type: string;
      confidence: number;
      context: string;
    };
    crossModalConnections: Array<{
      connectedFileId: number;
      connectionType: string;
      strength: number;
    }>;
  }>> {
    try {
      logger.info('Performing semantic search', {
        operation: 'semantic-search',
        metadata: {
          userId,
          queryText: query.text,
          queryType: query.type || 'general',
          timeRange: query.timeRange,
          includeModalities: query.includeModalities
        }
      });

      // First, get basic search results
      const basicResults = await this.fileIntelligenceService.intelligentSearch(
        query.text,
        userId,
        {
          fileTypes: query.includeModalities,
          limit: query.limit || 50,
          includeInsights: true
        }
      );

      // Enhance with semantic analysis
      const enhancedResults = await Promise.all(
        basicResults.map(async (result) => {
          const matchDetails = await this.analyzeSemanticMatch(result, query);
          const crossModalConnections = await this.findCrossModalConnections(result, userId);

          return {
            file: result,
            relevanceScore: result.relevanceScore + matchDetails.confidence * 0.5,
            matchDetails,
            crossModalConnections
          };
        })
      );

      // Sort by enhanced relevance
      const sortedResults = enhancedResults
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, query.limit || 20);

      logger.debug('Semantic search completed', {
        operation: 'semantic-search',
        metadata: {
          userId,
          resultCount: sortedResults.length,
          avgRelevance: sortedResults.reduce((sum, r) => sum + r.relevanceScore, 0) / sortedResults.length
        }
      });

      return sortedResults as unknown as Array<{
        file: MediaFile;
        relevanceScore: number;
        matchDetails: {
          type: string;
          confidence: number;
          context: string;
        };
        crossModalConnections: Array<{
          connectedFileId: number;
          connectionType: string;
          strength: number;
        }>;
      }>;

    } catch (error) {
      logger.error('Semantic search failed', {
        operation: 'semantic-search',
        metadata: {
          userId,
          queryText: query.text,
          error: String(error)
        }
      });
      return [];
    }
  }

  /**
   * Generate intelligent content recommendations
   */
  public async generateContentRecommendations(
    userId: string,
    context?: {
      recentFiles?: MediaFile[];
      conversationHistory?: string[];
      userPreferences?: Record<string, unknown>;
    }
  ): Promise<Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    suggestedFiles?: MediaFile[];
    actionableSteps?: string[];
    confidenceScore: number;
  }>> {
    try {
      logger.info('Generating content recommendations', {
        operation: 'content-recommendations',
        metadata: {
          userId,
          hasRecentFiles: !!context?.recentFiles,
          hasConversationHistory: !!context?.conversationHistory,
          hasPreferences: !!context?.userPreferences
        }
      });

      const recommendations = [];

      // Analyze user's recent activity
      const recentFiles = context?.recentFiles || await this.getUserRecentFiles(userId, 10);
      
      // Content organization recommendations
      const organizationRec = await this.analyzeContentOrganization(recentFiles);
      if (organizationRec) {
        recommendations.push(organizationRec);
      }

      // Missing modality recommendations
      const modalityRec = await this.suggestMissingModalities(recentFiles);
      if (modalityRec) {
        recommendations.push(modalityRec);
      }

      // Quality improvement recommendations
      const qualityRecs = await this.suggestQualityImprovements();
      recommendations.push(...qualityRecs);

      // Workflow optimization recommendations
      const workflowRecs = await this.suggestWorkflowOptimizations();
      recommendations.push(...workflowRecs);

      // Related content recommendations
      const relatedRecs = await this.suggestRelatedContent(recentFiles);
      recommendations.push(...relatedRecs);

      // Sort by priority and confidence
      return recommendations
        .sort((a, b) => {
          const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return b.confidenceScore - a.confidenceScore;
        })
        .slice(0, 10); // Return top 10 recommendations

    } catch (error) {
      logger.error('Content recommendations generation failed', {
        operation: 'content-recommendations',
        metadata: {
          userId,
          error: String(error)
        }
      });
      return [];
    }
  }

  // Helper methods

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async generateBatchInsights(fileResults: FileIntelligenceResult[]): Promise<CrossModalInsight[]> {
    try {
      const insights: CrossModalInsight[] = [];

      // Find patterns across multiple files
      const fileTypes = [...new Set(fileResults.map(r => r.fileType))];
      
      if (fileTypes.length > 1) {
        insights.push({
          type: 'multimodal_batch',
          confidence: 0.9,
          description: `Batch contains ${fileTypes.length} different content types: ${fileTypes.join(', ')}`,
          sources: fileTypes,
          metadata: {
            fileCount: fileResults.length,
            diversity: fileTypes.length / 4 // Normalize by max possible types
          }
        });
      }

      // Detect common themes across files
      const allDescriptions = fileResults
        .filter(r => {
          const visionAnalysis = r.analysis?.vision as { description?: string } | undefined;
          const documentAnalysis = r.analysis?.document as { summary?: string } | undefined;
          return visionAnalysis?.description || documentAnalysis?.summary;
        })
        .map(r => {
          const visionAnalysis = r.analysis?.vision as { description?: string } | undefined;
          const documentAnalysis = r.analysis?.document as { summary?: string } | undefined;
          return visionAnalysis?.description || documentAnalysis?.summary;
        })
        .join(' ');

      if (allDescriptions.length > 0) {
        const commonWords = this.extractCommonWords(allDescriptions);
        if (commonWords.length > 0) {
          insights.push({
            type: 'thematic_consistency',
            confidence: 0.8,
            description: `Common themes detected across files: ${commonWords.slice(0, 3).join(', ')}`,
            sources: ['vision', 'document'],
            metadata: {
              themes: commonWords,
              coverage: commonWords.length / fileResults.length
            }
          });
        }
      }

      return insights;

    } catch (error) {
      logger.error('Failed to generate batch insights', {
        operation: 'batch-insights',
        metadata: {
          fileCount: fileResults.length,
          error: String(error)
        }
      });
      return [];
    }
  }

  private async generateUnifiedAnalysis(fileResults: FileIntelligenceResult[]): Promise<Record<string, unknown>> {
    try {
      const analysis: Record<string, unknown> = {
        summary: {
          totalFiles: fileResults.length,
          fileTypes: [...new Set(fileResults.map(r => r.fileType))],
          processingSuccess: fileResults.filter(r => r.processingStatus === 'completed').length,
          avgProcessingTime: fileResults.reduce((sum, r) => sum + (r.processingTimeMs || 0), 0) / fileResults.length
        },
        contentAnalysis: {
          hasVisualContent: fileResults.some(r => r.analysis?.vision),
          hasAudioContent: fileResults.some(r => r.analysis?.audio),
          hasTextContent: fileResults.some(r => r.analysis?.document),
          totalWordCount: this.calculateTotalWordCount(fileResults),
          detectedLanguages: this.extractDetectedLanguages(fileResults),
          contentComplexity: this.assessBatchComplexity(fileResults)
        },
        qualityMetrics: {
          avgConfidence: this.calculateAverageConfidence(fileResults),
          qualityDistribution: this.analyzeQualityDistribution(fileResults),
          recommendationsCount: fileResults.reduce((sum, r) => sum + (r.recommendations?.length || 0), 0)
        }
      };

      return analysis;

    } catch (error) {
      logger.error('Failed to generate unified analysis', {
        operation: 'unified-analysis',
        metadata: {
          error: String(error)
        }
      });
      return {};
    }
  }

  private async generateBatchMetadata(batchResult: BatchProcessingResult): Promise<Record<string, unknown>> {
    return {
      processingVersion: '1.0.0',
      processingDate: new Date().toISOString(),
      successRate: batchResult.processedFiles / batchResult.totalFiles,
      avgFileSize: 0, // Would calculate from actual file sizes
      totalProcessingTime: batchResult.processingTimeMs,
      servicesUsed: ['file_intelligence', 'image_analysis', 'audio_analysis', 'document_processing']
    };
  }

  private extractCommonWords(text: string): string[] {
    const words = text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'were', 'said'].includes(word));

    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    return Object.entries(wordCount)
      .filter(([, count]) => count > 1)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private calculateTotalWordCount(fileResults: FileIntelligenceResult[]): number {
    return fileResults.reduce((total, result) => {
      const documentAnalysis = result.analysis?.document as { textContent?: { wordCount?: number } } | undefined;
      if (documentAnalysis?.textContent?.wordCount) {
        return total + documentAnalysis.textContent.wordCount;
      }
      const audioAnalysis = result.analysis?.audio as { transcription?: { text?: string } } | undefined;
      if (audioAnalysis?.transcription?.text) {
        return total + audioAnalysis.transcription.text.split(' ').length;
      }
      return total;
    }, 0);
  }  private extractDetectedLanguages(fileResults: FileIntelligenceResult[]): string[] {
    const languages = new Set<string>();
    
    fileResults.forEach(result => {
      const audioAnalysis = result.analysis?.audio as { transcription?: { language?: string } } | undefined;
      if (audioAnalysis?.transcription?.language) {
        languages.add(audioAnalysis.transcription.language);
      }
      const documentAnalysis = result.analysis?.document as { metadata?: { language?: string } } | undefined;
      if (documentAnalysis?.metadata?.language) {
        languages.add(documentAnalysis.metadata.language);
      }
    });
    
    return Array.from(languages);
  }

  private assessBatchComplexity(fileResults: FileIntelligenceResult[]): string {
    const complexityScores = fileResults.map(result => {
      if (result.intelligenceMetadata?.contentComplexity) {
        const complexity = result.intelligenceMetadata.contentComplexity;
        switch (complexity) {
          case 'simple': return 1;
          case 'moderate': return 2;
          case 'complex': return 3;
          case 'very_complex': return 4;
          default: return 2;
        }
      }
      return 2;
    });

    const avgComplexity = complexityScores.reduce((sum, score) => sum + score, 0) / complexityScores.length;
    
    if (avgComplexity < 1.5) return 'simple';
    if (avgComplexity < 2.5) return 'moderate';
    if (avgComplexity < 3.5) return 'complex';
    return 'very_complex';
  }

  private calculateAverageConfidence(fileResults: FileIntelligenceResult[]): number {
    const confidenceScores = fileResults
      .map(result => {
        const metadata = result.intelligenceMetadata as { confidenceScores?: { overall?: number } } | undefined;
        return metadata?.confidenceScores?.overall;
      })
      .filter(score => typeof score === 'number') as number[];

    return confidenceScores.length > 0 
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length 
      : 0;
  }

  private analyzeQualityDistribution(fileResults: FileIntelligenceResult[]): Record<string, number> {
    const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
    
    fileResults.forEach(result => {
      const metadata = result.intelligenceMetadata as { confidenceScores?: { overall?: number } } | undefined;
      const confidence = metadata?.confidenceScores?.overall || 0;
      if (confidence > 0.9) distribution.excellent++;
      else if (confidence > 0.7) distribution.good++;
      else if (confidence > 0.5) distribution.fair++;
      else distribution.poor++;
    });

    return distribution;
  }

  private async storeBatchResults(batchResult: BatchProcessingResult): Promise<void> {
    try {
      // In a production system, would store batch results in database
      logger.debug('Batch results stored', {
        operation: 'store-batch',
        metadata: {
          batchId: batchResult.batchId,
          fileCount: batchResult.totalFiles
        }
      });
    } catch (error) {
      logger.error('Failed to store batch results', {
        operation: 'store-batch',
        metadata: {
          batchId: batchResult.batchId,
          error: String(error)
        }
      });
    }
  }

  private async generateConversationSummary(batchResult: BatchProcessingResult, conversationText?: string): Promise<string> {
    try {
      const elements = [];
      
      if (conversationText) {
        elements.push(`Text conversation with ${conversationText.split(' ').length} words`);
      }
      
      const fileTypes = [...new Set(batchResult.fileResults.map(r => r.fileType))];
      if (fileTypes.length > 0) {
        elements.push(`${batchResult.fileResults.length} files (${fileTypes.join(', ')})`);
      }

      if (batchResult.crossModalInsights.length > 0) {
        elements.push(`${batchResult.crossModalInsights.length} cross-modal insights detected`);
      }

      return `Conversation includes: ${elements.join(', ')}`;
    } catch {
      return 'Multimodal conversation processed';
    }
  }

  private async detectConversationTopics(batchResult: BatchProcessingResult, conversationText?: string): Promise<string[]> {
    try {
      const topics = new Set<string>();

      // Extract topics from document analysis
      batchResult.fileResults.forEach(result => {
        const documentAnalysis = result.analysis?.document as { keyInformation?: { topics?: string[] } } | undefined;
        if (documentAnalysis?.keyInformation?.topics) {
          documentAnalysis.keyInformation.topics.forEach((topic: string) => topics.add(topic));
        }
      });

      // Simple topic extraction from conversation text
      if (conversationText) {
        const commonTopics = ['meeting', 'project', 'update', 'plan', 'review', 'discussion', 'presentation'];
        const lowerText = conversationText.toLowerCase();
        commonTopics.forEach(topic => {
          if (lowerText.includes(topic)) topics.add(topic);
        });
      }

      return Array.from(topics).slice(0, 10);
    } catch {
      return [];
    }
  }

  private async extractConversationEntities(batchResult: BatchProcessingResult): Promise<Array<{ entity: string; type: string; confidence: number }>> {
    try {
      const entities: Array<{ entity: string; type: string; confidence: number }> = [];

      // Extract entities from document analysis
      batchResult.fileResults.forEach(result => {
        const documentAnalysis = result.analysis?.document as { keyInformation?: { entities?: Array<{ text?: string; type?: string; confidence?: number }> } } | undefined;
        if (documentAnalysis?.keyInformation?.entities) {
          documentAnalysis.keyInformation.entities.forEach((entity) => {
            entities.push({
              entity: entity.text || String(entity),
              type: entity.type || 'unknown',
              confidence: entity.confidence || 0.8
            });
          });
        }
      });

      return entities.slice(0, 20);
    } catch {
      return [];
    }
  }

  private async analyzeConversationSentiment(batchResult: BatchProcessingResult): Promise<{ overall: string; confidence: number; details?: Record<string, unknown> }> {
    try {
      // Get sentiment from audio analysis if available
      const audioSentiments = batchResult.fileResults
        .filter(r => {
          const audioAnalysis = r.analysis?.audio as { sentiment?: { score?: number } } | undefined;
          return audioAnalysis?.sentiment;
        })
        .map(r => {
          const audioAnalysis = r.analysis?.audio as { sentiment?: { score?: number } } | undefined;
          return audioAnalysis?.sentiment;
        })
        .filter(Boolean);

      if (audioSentiments.length > 0) {
        // Average audio sentiments
        const avgSentiment = audioSentiments.reduce((sum: number, s) => {
          const score = s?.score || 0;
          return sum + score;
        }, 0) / audioSentiments.length;
        const overallSentiment = avgSentiment > 0.1 ? 'positive' : avgSentiment < -0.1 ? 'negative' : 'neutral';
        
        return {
          overall: overallSentiment,
          confidence: 0.8,
          details: {
            audioSentiments: audioSentiments.length,
            averageScore: avgSentiment
          }
        };
      }

      return {
        overall: 'neutral',
        confidence: 0.5,
        details: { source: 'default' }
      };

    } catch {
      return {
        overall: 'neutral',
        confidence: 0,
        details: { error: 'analysis_failed' }
      };
    }
  }

  private async extractActionableItems(batchResult: BatchProcessingResult, conversationText?: string): Promise<string[]> {
    try {
      const actionItems = new Set<string>();

      // Extract from document analysis
      batchResult.fileResults.forEach(result => {
        const documentAnalysis = result.analysis?.document as any;
        if (documentAnalysis?.keyInformation?.actionItems) {
          documentAnalysis.keyInformation.actionItems.forEach((item: string) => actionItems.add(item));
        }
      });

      // Simple action item detection from conversation text
      if (conversationText) {
        const actionPatterns = [
          /(?:need to|should|must|will|todo:)\s+([^.!?]+)/gi,
          /(?:action item|task|follow up):\s*([^.!?]+)/gi
        ];
        
        actionPatterns.forEach(pattern => {
          const matches = conversationText.matchAll(pattern);
          for (const match of matches) {
            if (match[1]?.trim()) {
              actionItems.add(match[1].trim());
            }
          }
        });
      }

      return Array.from(actionItems).slice(0, 10);
    } catch {
      return [];
    }
  }

  private calculateContextConfidence(batchResult: BatchProcessingResult): Record<string, number> {
    const scores = {
      processing: batchResult.processedFiles / batchResult.totalFiles,
      analysis: this.calculateAverageConfidence(batchResult.fileResults),
      insights: Math.min(1, batchResult.crossModalInsights.length / 3),
      overall: 0
    };

    scores.overall = (scores.processing + scores.analysis + scores.insights) / 3;
    return scores;
  }

  private async storeConversationContext(context: ConversationContext): Promise<void> {
    try {
      // Store in MultimodalConversation table
      await prisma.multimodalConversation.create({
        data: {
          conversationThreadId: 1, // Default thread ID since this is backup service
          multimodalSummary: context.conversationSummary || '',
          keyVisualElements: JSON.stringify(context.topicDetection || []),
          extractedEntities: JSON.stringify(context.actionableItems || []),
          mediaReferences: JSON.stringify(context.mediaFiles.map(f => f.id))
        }
      });

      logger.debug('Conversation context stored', {
        operation: 'store-context',
        metadata: {
          conversationId: context.conversationId,
          fileCount: context.mediaFiles.length
        }
      });

    } catch (error) {
      logger.error('Failed to store conversation context', {
        operation: 'store-context',
        metadata: {
          conversationId: context.conversationId,
          error: String(error)
        }
      });
    }
  }

  private async getUserIdFromFile(fileId: number): Promise<string> {
    try {
      const file = await prisma.mediaFile.findUnique({
        where: { id: fileId },
        select: { userId: true }
      });
      return file?.userId || '';
    } catch {
      return '';
    }
  }

  private async analyzeSemanticMatch(result: any, query: MediaSearchQuery): Promise<{ type: string; confidence: number; context: string }> {
    // Enhanced semantic matching logic
    const queryLower = query.text.toLowerCase();
    
    // Check for semantic relevance in different content types
    if (result.extractedText?.toLowerCase().includes(queryLower)) {
      return {
        type: 'exact_text_match',
        confidence: 0.95,
        context: result.extractedText.substring(0, 100) + '...'
      };
    }
    
    if (result.description?.toLowerCase().includes(queryLower)) {
      return {
        type: 'description_match',
        confidence: 0.8,
        context: result.description
      };
    }

    return {
      type: 'basic_match',
      confidence: 0.5,
      context: result.matchType
    };
  }

  private async findCrossModalConnections(file: unknown, userId: string): Promise<Array<{ connectedFileId: number; connectionType: string; strength: number }>> {
    try {
      // Find related files through various connection types
      const connections: Array<{ connectedFileId: number; connectionType: string; strength: number }> = [];
      
      const fileData = file as any;
      
      // Find files with similar timestamps (within 1 hour)
      const timeThreshold = 60 * 60 * 1000; // 1 hour in milliseconds
      const similarTimeFiles = await prisma.mediaFile.findMany({
        where: {
          userId,
          id: { not: fileData.id },
          createdAt: {
            gte: new Date(new Date(fileData.createdAt).getTime() - timeThreshold),
            lte: new Date(new Date(fileData.createdAt).getTime() + timeThreshold)
          }
        },
        select: { id: true }
      });

      similarTimeFiles.forEach((f: any) => {
        connections.push({
          connectedFileId: f.id,
          connectionType: 'temporal_proximity',
          strength: 0.6
        });
      });

      return connections.slice(0, 5); // Limit to top 5 connections

    } catch (error) {
      logger.error('Failed to find cross-modal connections', {
        operation: 'cross-modal-connections',
        metadata: {
          fileId: (file as any)?.id,
          error: String(error)
        }
      });
      return [];
    }
  }

  private async getUserRecentFiles(userId: string, limit: number): Promise<MediaFile[]> {
    try {
      return await prisma.mediaFile.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit
      }) as unknown as MediaFile[];
    } catch {
      return [];
    }
  }

  private async analyzeContentOrganization(files: MediaFile[]): Promise<any> {
    // Analyze if user's content could benefit from organization
    const fileTypes = [...new Set(files.map(f => f.fileType))];
    
    if (files.length > 10 && fileTypes.length > 2) {
      return {
        type: 'organization',
        priority: 'medium' as const,
        title: 'Content Organization Opportunity',
        description: `You have ${files.length} files across ${fileTypes.length} types. Consider organizing them by project or topic.`,
        confidenceScore: 0.8
      };
    }
    
    return null;
  }

  private async suggestMissingModalities(files: MediaFile[]): Promise<any> {
    const hasImages = files.some(f => f.fileType === 'image');
    const hasAudio = files.some(f => f.fileType === 'audio');
    const hasDocs = files.some(f => f.fileType === 'document');

    if (hasImages && hasDocs && !hasAudio) {
      return {
        type: 'modality_suggestion',
        priority: 'low' as const,
        title: 'Audio Content Opportunity',
        description: 'Consider adding voice notes or audio explanations to complement your visual and written content.',
        confidenceScore: 0.6
      };
    }

    return null;
  }

  private async suggestQualityImprovements(): Promise<any[]> {
    // Mock quality improvement suggestions
    return [
      {
        type: 'quality_improvement',
        priority: 'medium' as const,
        title: 'Image Quality Enhancement',
        description: 'Some images could benefit from better lighting or resolution.',
        confidenceScore: 0.7
      }
    ];
  }

  private async suggestWorkflowOptimizations(): Promise<any[]> {
    return [
      {
        type: 'workflow_optimization',
        priority: 'low' as const,
        title: 'Batch Processing Opportunity',
        description: 'Process similar files together for better insights.',
        confidenceScore: 0.6
      }
    ];
  }

  private async suggestRelatedContent(files: MediaFile[]): Promise<any[]> {
    return [
      {
        type: 'related_content',
        priority: 'low' as const,
        title: 'Related Files Found',
        description: 'Found files with similar content themes.',
        suggestedFiles: files.slice(0, 3),
        confidenceScore: 0.7
      }
    ];
  }
}
