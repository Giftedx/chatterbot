/**
 * File Intelligence Service - Main Orchestrator
 * Coordinates all file intelligence modules and provides unified interface
 */

import {
  MediaFile,
  FileProcessingOptions,
  FileIntelligenceResult,
  MultimodalAnalysisResult,
  ProcessingStatus,
  IntelligentSearchOptions,
  IntelligentSearchResult,
  SearchMatchType,
  CrossModalInsight
} from './types.js';
import { FileAnalysisService } from './analysis.service.js';
import { CrossModalService } from './cross-modal.service.js';
import { prisma } from '../../db/prisma.js';
import { logger } from '../../utils/logger.js';

/**
 * Main file intelligence service that coordinates all processing modules
 */
export class FileIntelligenceService {
  private readonly analysisService: FileAnalysisService;
  private readonly crossModalService: CrossModalService;
  
  constructor() {
    this.analysisService = new FileAnalysisService();
    this.crossModalService = new CrossModalService();
  }

  /**
   * Process any file type and provide comprehensive intelligence
   */
  public async processFile(
    mediaFile: MediaFile,
    options: FileProcessingOptions = {}
  ): Promise<FileIntelligenceResult | null> {
    try {
      const startTime = Date.now();

      logger.info('Starting file intelligence processing', {
        operation: 'file-intelligence',
        userId: mediaFile.userId,
        metadata: {
          fileId: mediaFile.id,
          fileType: mediaFile.fileType,
          mimeType: mediaFile.mimeType,
          fileName: mediaFile.originalName
        }
      });

      // Update processing status
      await this.updateProcessingStatus(mediaFile.id, 'processing');

      const result: FileIntelligenceResult = {
        fileId: mediaFile.id,
        fileType: mediaFile.fileType,
        processingStatus: 'processing',
        startedAt: new Date(startTime),
        analysis: {}
      };

      // Perform multimodal analysis
      const analysis = await this.analysisService.analyzeFile(mediaFile as any, options);
      result.analysis = analysis;

      // Generate cross-modal insights if multiple types are analyzed
      if (this.crossModalService.hasMultipleAnalysisTypes(analysis)) {
        result.crossModalInsights = await this.crossModalService.generateCrossModalInsights(analysis);
      }

      // Generate comprehensive metadata and recommendations
      result.intelligenceMetadata = await this.generateIntelligenceMetadata(mediaFile, result);
      result.recommendations = await this.generateRecommendations(mediaFile, result);

      // Finalize processing
      const processingTime = Date.now() - startTime;
      result.completedAt = new Date();
      result.processingTimeMs = processingTime;
      result.processingStatus = result.analysis ? 'completed' : 'failed';

      // Store intelligence results
      await this.storeIntelligenceResults(mediaFile.id, result);

      logger.info('File intelligence processing completed', {
        operation: 'file-intelligence',
        userId: mediaFile.userId,
        metadata: {
          fileId: mediaFile.id,
          processingTime,
          status: result.processingStatus,
          hasVision: !!result.analysis.vision,
          hasAudio: !!result.analysis.audio,
          hasDocument: !!result.analysis.document,
          hasCrossModal: !!result.crossModalInsights
        }
      });

      return result;

    } catch (error) {
      logger.error('Failed to process file intelligence', {
        operation: 'file-intelligence',
        metadata: {
          fileId: mediaFile.id,
          error: String(error)
        }
      });

      await this.updateProcessingStatus(mediaFile.id, 'failed', String(error));
      
      return {
        fileId: mediaFile.id,
        fileType: mediaFile.fileType,
        processingStatus: 'failed',
        startedAt: new Date(),
        error: String(error),
        analysis: {}
      };
    }
  }

  /**
   * Search across all file types with intelligent ranking
   */
  public async intelligentSearch(
    query: string,
    userId: string,
    options: IntelligentSearchOptions = {}
  ): Promise<IntelligentSearchResult[]> {
    try {
      const limit = options.limit || 20;
      const fileTypes = options.fileTypes || ['image', 'audio', 'document', 'video'];

      // Search across all media files
      const files = await prisma.mediaFile.findMany({
        where: {
          userId,
          fileType: { in: fileTypes },
          processingStatus: 'completed',
          OR: [
            { description: { contains: query } },
            { extractedText: { contains: query } },
            { tags: { contains: query } },
            { originalName: { contains: query } }
          ]
        },
        include: options.includeInsights ? {
          mediaInsights: true
        } : undefined,
        take: limit * 2 // Get more results for ranking
      });

      // Calculate relevance scores and rank results
      const rankedFiles = files.map(file => {
        const relevanceScore = this.calculateRelevanceScore(file as any, query);
        const matchType = this.determineMatchType(file as any, query);
        
        return {
          file: file as any, // Type conversion for compatibility
          relevanceScore,
          matchType
        };
      });

      // Sort by relevance and return top results
      return rankedFiles
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

    } catch (error) {
      logger.error('Intelligent search failed', {
        operation: 'intelligent-search',
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
   * Get analysis capabilities for a file type
   */
  public getAnalysisCapabilities(fileType: string) {
    return this.analysisService.getAnalysisCapabilities(fileType);
  }

  /**
   * Estimate processing complexity for a file
   */
  public estimateProcessingComplexity(mediaFile: MediaFile) {
    return this.analysisService.estimateProcessingComplexity(mediaFile as any);
  }

  /**
   * Check if file type is supported
   */
  public isFileTypeSupported(fileType: string): boolean {
    return this.analysisService.isFileTypeSupported(fileType);
  }

  /**
   * Get supported file extensions
   */
  public getSupportedExtensions() {
    return this.analysisService.getSupportedExtensions();
  }

  // Private helper methods

  /**
   * Generate comprehensive intelligence metadata
   */
  private async generateIntelligenceMetadata(mediaFile: MediaFile, result: FileIntelligenceResult) {
    try {
      const metadata = {
        processingVersion: '1.0.0',
        modelVersions: {
          vision: result.analysis.vision ? '1.0.0' : undefined,
          audio: result.analysis.audio ? '1.0.0' : undefined,
          document: result.analysis.document ? '1.0.0' : undefined
        },
        confidenceScores: this.calculateConfidenceScores(result.analysis),
        contentComplexity: this.assessContentComplexity(result.analysis),
        informationDensity: this.calculateInformationDensity(result.analysis),
        accessibilityFeatures: this.identifyAccessibilityFeatures(result.analysis),
        contentRichness: this.assessContentRichness(result.analysis)
      };

      return metadata;

    } catch (error) {
      logger.error('Failed to generate intelligence metadata', {
        operation: 'intelligence-metadata',
        metadata: {
          error: String(error)
        }
      });
      return {};
    }
  }

  /**
   * Generate actionable recommendations based on analysis
   */
  private async generateRecommendations(mediaFile: MediaFile, result: FileIntelligenceResult) {
    try {
      const recommendations = [];

      // Content optimization recommendations
      if (result.analysis.vision) {
        // Add vision-based recommendations (placeholder)
        recommendations.push({
          type: 'quality_improvement',
          category: 'visual',
          priority: 'medium',
          description: 'Consider enhancing image quality for better analysis results',
          action: 'enhance_quality'
        });
      }

      if (result.analysis.audio) {
        // Add audio-based recommendations (placeholder)
        recommendations.push({
          type: 'quality_improvement',
          category: 'audio',
          priority: 'low',
          description: 'Audio quality is acceptable for current analysis',
          action: 'maintain_quality'
        });
      }

      // Document organization recommendations
      if (result.analysis.document) {
        recommendations.push({
          type: 'organization',
          category: 'document',
          priority: 'medium',
          description: 'Document processed successfully with good structure',
          action: 'maintain_structure'
        });
      }

      return recommendations;

    } catch (error) {
      logger.error('Failed to generate recommendations', {
        operation: 'recommendations',
        metadata: {
          error: String(error)
        }
      });
      return [];
    }
  }

  /**
   * Calculate confidence scores from analysis
   */
  private calculateConfidenceScores(analysis: MultimodalAnalysisResult): Record<string, number> {
    const scores: Record<string, number> = {};
    
    if (analysis.vision?.textDetection) {
      scores.vision = analysis.vision.textDetection.confidence;
    }
    
    if (analysis.audio?.transcription) {
      scores.audio = analysis.audio.transcription.confidence;
    }
    
    if (analysis.document?.classification) {
      scores.document = analysis.document.classification.confidence;
    }
    
    const allScores = Object.values(scores);
    scores.overall = allScores.length > 0 ? allScores.reduce((a, b) => a + b) / allScores.length : 0;
    
    return scores;
  }

  /**
   * Assess content complexity
   */
  private assessContentComplexity(analysis: MultimodalAnalysisResult): string {
    let complexity = 0;
    
    // Vision complexity
    if (analysis.vision) {
      complexity += (analysis.vision.objectDetection?.objects?.length || 0) * 0.1;
      complexity += (analysis.vision.textDetection?.textBlocks?.length || 0) * 0.2;
      complexity += (analysis.vision.faceDetection?.faceCount || 0) * 0.15;
    }
    
    // Audio complexity
    if (analysis.audio) {
      complexity += (analysis.audio.speakerDetection?.speakerCount || 0) * 0.3;
      complexity += (analysis.audio.transcription?.segments?.length || 0) * 0.05;
    }
    
    // Document complexity
    if (analysis.document?.structure) {
      const structure = analysis.document.structure as any;
      complexity += (structure.sectionCount || 0) * 0.1;
      if (structure.hasTables) complexity += 0.5;
      if (structure.hasHeadings) complexity += 0.3;
    }
    
    if (complexity < 1) return 'simple';
    if (complexity < 3) return 'moderate';
    if (complexity < 6) return 'complex';
    return 'very_complex';
  }

  /**
   * Calculate information density
   */
  private calculateInformationDensity(analysis: MultimodalAnalysisResult): number {
    let density = 0;
    let factors = 0;
    
    if (analysis.vision) {
      density += (analysis.vision.objectDetection?.objects?.length || 0) * 0.1;
      density += (analysis.vision.textDetection?.textBlocks?.length || 0) * 0.2;
      factors++;
    }
    
    if (analysis.audio?.transcription) {
      density += (analysis.audio.transcription.text.split(' ').length || 0) * 0.001;
      factors++;
    }
    
    if (analysis.document?.textContent) {
      density += (analysis.document.textContent.wordCount || 0) * 0.0001;
      factors++;
    }
    
    return factors > 0 ? Math.min(1, density / factors) : 0;
  }

  /**
   * Identify accessibility features
   */
  private identifyAccessibilityFeatures(analysis: MultimodalAnalysisResult): string[] {
    const features = [];
    
    if (analysis.vision?.textDetection && analysis.vision.textDetection.textBlocks.length > 0) {
      features.push('ocr_text_available');
    }
    
    if (analysis.audio?.transcription) {
      features.push('audio_transcription_available');
    }
    
    if (analysis.vision?.faceDetection && analysis.vision.faceDetection.faceCount > 0) {
      features.push('face_detection_available');
    }
    
    if (analysis.document?.structure) {
      const structure = analysis.document.structure as any;
      if (structure.hasHeadings) {
        features.push('structured_headings');
      }
    }
    
    return features;
  }

  /**
   * Assess content richness
   */
  private assessContentRichness(analysis: MultimodalAnalysisResult): Record<string, number> {
    const richness: Record<string, number> = {
      visual: 0,
      textual: 0,
      audio: 0,
      structural: 0
    };
    
    // Visual richness
    if (analysis.vision) {
      richness.visual += (analysis.vision.objectDetection?.objects?.length || 0) * 0.1;
      richness.visual += (analysis.vision.faceDetection?.faceCount || 0) * 0.15;
      richness.visual = Math.min(1, richness.visual);
    }
    
    // Textual richness
    if (analysis.vision?.textDetection) {
      richness.textual += (analysis.vision.textDetection.textBlocks.length || 0) * 0.1;
    }
    if (analysis.document?.textContent) {
      richness.textual += Math.min(1, (analysis.document.textContent.wordCount || 0) / 1000);
    }
    richness.textual = Math.min(1, richness.textual);
    
    // Audio richness
    if (analysis.audio) {
      if (analysis.audio.transcription) richness.audio += 0.5;
      if (analysis.audio.speakerDetection) richness.audio += 0.3;
      if (analysis.audio.sentiment) richness.audio += 0.2;
      richness.audio = Math.min(1, richness.audio);
    }
    
    // Structural richness
    if (analysis.document?.structure) {
      const structure = analysis.document.structure as any;
      if (structure.hasHeadings) richness.structural += 0.3;
      if (structure.hasTables) richness.structural += 0.3;
      if (structure.hasLists) richness.structural += 0.2;
      richness.structural += Math.min(0.2, (structure.sectionCount || 0) * 0.05);
      richness.structural = Math.min(1, richness.structural);
    }
    
    return richness;
  }

  /**
   * Update media file processing status
   */
  private async updateProcessingStatus(
    fileId: number,
    status: ProcessingStatus,
    error?: string
  ): Promise<void> {
    try {
      await prisma.mediaFile.update({
        where: { id: fileId },
        data: {
          processingStatus: status,
          processingError: error,
          processedAt: status === 'completed' || status === 'failed' ? new Date() : undefined
        }
      });
    } catch (updateError) {
      logger.error('Failed to update processing status', {
        operation: 'status-update',
        metadata: {
          fileId,
          status,
          error: String(updateError)
        }
      });
    }
  }

  /**
   * Store comprehensive intelligence results
   */
  private async storeIntelligenceResults(fileId: number, result: FileIntelligenceResult): Promise<void> {
    try {
      // Store main intelligence results in MediaFile
      await prisma.mediaFile.update({
        where: { id: fileId },
        data: {
          processingStatus: result.processingStatus,
          processedAt: result.completedAt,
          processingError: result.error
        }
      });

      // Store detailed insights in MediaInsight records
      const insights = [];

      if (result.crossModalInsights) {
        insights.push(...result.crossModalInsights.map(insight => ({
          mediaFileId: fileId,
          insightType: `cross_modal_${insight.type}`,
          confidence: insight.confidence,
          content: insight,
          generatedBy: 'file_intelligence_service'
        })));
      }

      if (result.recommendations) {
        insights.push(...result.recommendations.map(rec => ({
          mediaFileId: fileId,
          insightType: `recommendation_${rec.type}`,
          confidence: 1.0,
          content: rec,
          generatedBy: 'file_intelligence_service'
        })));
      }

      if (insights.length > 0) {
        await prisma.mediaInsight.createMany({
          data: insights as any
        });
      }

      logger.debug('Intelligence results stored', {
        operation: 'store-intelligence',
        metadata: {
          fileId,
          insightCount: insights.length
        }
      });

    } catch (error) {
      logger.error('Failed to store intelligence results', {
        operation: 'store-intelligence',
        metadata: {
          fileId,
          error: String(error)
        }
      });
    }
  }

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevanceScore(file: MediaFile, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();

    // Filename match (highest weight)
    if (file.originalName?.toLowerCase().includes(queryLower)) {
      score += 10;
    }

    // Description match
    if (file.description?.toLowerCase().includes(queryLower)) {
      score += 5;
    }

    // Extracted text match
    if (file.extractedText?.toLowerCase().includes(queryLower)) {
      score += 7;
    }

    // Tags match
    if (file.tags) {
      try {
        const tags = Array.isArray(file.tags) ? file.tags : JSON.parse(file.tags as string);
        if (tags.some((tag: string) => tag.toLowerCase().includes(queryLower))) {
          score += 3;
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    // Recency bonus (newer files get slight boost)
    const daysSinceCreation = (Date.now() - new Date(file.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 2 - (daysSinceCreation / 30)); // 2 points for very recent, declining over month

    return score;
  }

  /**
   * Determine match type for search results
   */
  private determineMatchType(file: MediaFile, query: string): SearchMatchType {
    const queryLower = query.toLowerCase();

    if (file.originalName?.toLowerCase().includes(queryLower)) {
      return 'filename';
    }
    if (file.extractedText?.toLowerCase().includes(queryLower)) {
      return 'content';
    }
    if (file.description?.toLowerCase().includes(queryLower)) {
      return 'description';
    }
    if (file.tags) {
      const tags = Array.isArray(file.tags) ? file.tags : JSON.parse(file.tags as string || '[]');
      if (tags.some((tag: string) => tag.toLowerCase().includes(queryLower))) {
        return 'tags';
      }
    }
    return 'metadata';
  }
}
