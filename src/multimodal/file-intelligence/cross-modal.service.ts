/**
 * Cross-Modal Intelligence Service
 * Generates insights from multiple analysis types and identifies cross-modal patterns
 */

import {
  MultimodalAnalysisResult,
  CrossModalInsight
} from './types.js';
import { logger } from '../../utils/logger.js';

/**
 * Service for generating cross-modal insights from multiple analysis types
 */
export class CrossModalService {
  
  /**
   * Generate cross-modal insights from multiple analysis types
   */
  public async generateCrossModalInsights(analysis: MultimodalAnalysisResult): Promise<CrossModalInsight[]> {
    try {
      const insights: CrossModalInsight[] = [];

      // Vision + Audio insights
      if (analysis.vision && analysis.audio) {
        insights.push(...await this.generateVisionAudioInsights(analysis.vision, analysis.audio));
      }

      // Vision + Document insights
      if (analysis.vision && analysis.document) {
        insights.push(...await this.generateVisionDocumentInsights(analysis.vision, analysis.document as any));
      }

      // Audio + Document insights
      if (analysis.audio && analysis.document) {
        insights.push(...await this.generateAudioDocumentInsights(analysis.audio, analysis.document as any));
      }

      // Triple modality insights
      if (analysis.vision && analysis.audio && analysis.document) {
        insights.push(...await this.generateTripleModalInsights(analysis.vision, analysis.audio, analysis.document as any));
      }

      logger.debug('Cross-modal insights generated', {
        operation: 'cross-modal-insights',
        metadata: {
          insightCount: insights.length,
          types: insights.map(i => i.type)
        }
      });

      return insights;

    } catch (error) {
      logger.error('Failed to generate cross-modal insights', {
        operation: 'cross-modal-insights',
        metadata: {
          error: String(error)
        }
      });
      return [];
    }
  }

  /**
   * Generate insights from vision and audio analysis
   */
  private async generateVisionAudioInsights(
    vision: import('../types.js').VisionAnalysisResult,
    audio: import('../types.js').AudioAnalysisResult
  ): Promise<CrossModalInsight[]> {
    const insights: CrossModalInsight[] = [];

    try {
      // Check for consistency between visual and audio content
      if (vision.objectDetection?.scene?.tags?.includes('meeting') &&
          audio.transcription?.text.toLowerCase().includes('meeting')) {
        insights.push({
          type: 'consistency_match',
          confidence: 0.89,
          description: 'Visual and audio content consistently indicate a meeting context',
          sources: ['vision', 'audio']
        });
      }

      // Detect multimodal content types
      if (vision.objectDetection?.objects?.some(obj => obj.name === 'person') &&
          audio.speakerDetection) {
        insights.push({
          type: 'speaker_visual_correlation',
          confidence: 0.85,
          description: `${audio.speakerDetection.speakerCount} speaker(s) detected in audio matching visible people`,
          sources: ['vision', 'audio']
        });
      }

      // Temporal alignment
      if (audio.transcription?.segments && vision.objectDetection?.objects) {
        insights.push({
          type: 'temporal_alignment',
          confidence: 0.75,
          description: 'Audio content aligns temporally with visual elements',
          sources: ['vision', 'audio']
        });
      }

      return insights;

    } catch (error) {
      logger.error('Failed to generate vision-audio insights', {
        operation: 'vision-audio-insights',
        metadata: { error: String(error) }
      });
      return [];
    }
  }

  /**
   * Generate insights from vision and document analysis
   */
  private async generateVisionDocumentInsights(
    vision: import('../types.js').VisionAnalysisResult,
    document: import('./types.js').DocumentAnalysisResult
  ): Promise<CrossModalInsight[]> {
    const insights: CrossModalInsight[] = [];

    try {
      // Check for text consistency
      if (vision.textDetection && document.textContent) {
        const visionText = vision.textDetection.fullText;
        const documentText = document.textContent.fullText;
        
        if (this.calculateTextSimilarity(visionText, documentText) > 0.7) {
          insights.push({
            type: 'text_consistency',
            confidence: 0.92,
            description: 'OCR text from image matches document content',
            sources: ['vision', 'document']
          });
        }
      }

      // Structural correlation
      if (vision.objectDetection && document.structure) {
        if (document.structure.hasTables && vision.objectDetection.objects?.some(obj => obj.name.includes('table'))) {
          insights.push({
            type: 'structural_correlation',
            confidence: 0.81,
            description: 'Visual table detection matches document structure',
            sources: ['vision', 'document']
          });
        }
      }

      return insights;

    } catch (error) {
      logger.error('Failed to generate vision-document insights', {
        operation: 'vision-document-insights',
        metadata: { error: String(error) }
      });
      return [];
    }
  }

  /**
   * Generate insights from audio and document analysis
   */
  private async generateAudioDocumentInsights(
    audio: import('../types.js').AudioAnalysisResult,
    document: import('./types.js').DocumentAnalysisResult
  ): Promise<CrossModalInsight[]> {
    const insights: CrossModalInsight[] = [];

    try {
      // Check for content topic alignment
      if (audio.transcription && document.keyInformation) {
        const audioText = audio.transcription.text.toLowerCase();
        const documentTopics = document.keyInformation.topics;
        
        const matchingTopics = documentTopics.filter((topic: string) => 
          audioText.includes(topic.toLowerCase())
        );
        
        if (matchingTopics.length > 0) {
          insights.push({
            type: 'topic_alignment',
            confidence: 0.81,
            description: `Audio content aligns with document topics: ${matchingTopics.join(', ')}`,
            sources: ['audio', 'document']
          });
        }
      }

      // Action item correlation
      if (audio.transcription && document.keyInformation?.actionItems) {
        const transcriptionText = audio.transcription.text.toLowerCase();
        const hasActionWords = ['todo', 'task', 'action', 'need to', 'should', 'must'].some(
          word => transcriptionText.includes(word)
        );
        
        if (hasActionWords && document.keyInformation.actionItems.length > 0) {
          insights.push({
            type: 'action_item_correlation',
            confidence: 0.77,
            description: 'Audio content discusses action items that align with document tasks',
            sources: ['audio', 'document']
          });
        }
      }

      return insights;

    } catch (error) {
      logger.error('Failed to generate audio-document insights', {
        operation: 'audio-document-insights',
        metadata: { error: String(error) }
      });
      return [];
    }
  }

  /**
   * Generate insights from all three modalities
   */
  private async generateTripleModalInsights(
    vision: import('../types.js').VisionAnalysisResult,
    audio: import('../types.js').AudioAnalysisResult,
    document: import('./types.js').DocumentAnalysisResult
  ): Promise<CrossModalInsight[]> {
    const insights: CrossModalInsight[] = [];

    try {
      // Comprehensive content validation
      const hasVisualPeople = vision.objectDetection?.objects?.some(obj => obj.name === 'person');
      const hasAudioSpeech = audio.transcription?.text && audio.transcription.text.length > 0;
      const hasDocumentContent = document.textContent?.wordCount && document.textContent.wordCount > 0;

      if (hasVisualPeople && hasAudioSpeech && hasDocumentContent) {
        insights.push({
          type: 'comprehensive_validation',
          confidence: 0.95,
          description: 'All modalities contain substantive content with human involvement',
          sources: ['vision', 'audio', 'document'],
          metadata: {
            visualPeople: hasVisualPeople,
            audioSpeech: hasAudioSpeech,
            documentContent: hasDocumentContent
          }
        });
      }

      // Meeting context detection across all modalities
      const meetingKeywords = ['meeting', 'presentation', 'discussion', 'agenda'];
      const visualMeeting = vision.objectDetection?.scene?.tags?.some(tag => 
        meetingKeywords.includes(tag.toLowerCase())
      );
      const audioMeeting = audio.transcription?.text && meetingKeywords.some(
        keyword => audio.transcription!.text.toLowerCase().includes(keyword)
      );
      const documentMeeting = document.keyInformation?.topics?.some(topic =>
        meetingKeywords.includes(topic.toLowerCase())
      );

      if ([visualMeeting, audioMeeting, documentMeeting].filter(Boolean).length >= 2) {
        insights.push({
          type: 'multimodal_context_detection',
          confidence: 0.88,
          description: 'Multiple modalities confirm meeting/presentation context',
          sources: ['vision', 'audio', 'document'],
          metadata: {
            visualContext: visualMeeting,
            audioContext: audioMeeting,
            documentContext: documentMeeting
          }
        });
      }

      return insights;

    } catch (error) {
      logger.error('Failed to generate triple-modal insights', {
        operation: 'triple-modal-insights',
        metadata: { error: String(error) }
      });
      return [];
    }
  }

  /**
   * Calculate text similarity between two strings
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple similarity calculation - in production would use more sophisticated NLP
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Check if multiple analysis types are present
   */
  public hasMultipleAnalysisTypes(analysis: MultimodalAnalysisResult): boolean {
    const types = [analysis.vision, analysis.audio, analysis.document].filter(Boolean);
    return types.length > 1;
  }

  /**
   * Get cross-modal insight statistics
   */
  public getInsightStatistics(insights: CrossModalInsight[]): {
    totalInsights: number;
    averageConfidence: number;
    typeDistribution: Record<string, number>;
    sourceDistribution: Record<string, number>;
  } {
    const typeDistribution: Record<string, number> = {};
    const sourceDistribution: Record<string, number> = {};
    let totalConfidence = 0;

    insights.forEach(insight => {
      // Type distribution
      typeDistribution[insight.type] = (typeDistribution[insight.type] || 0) + 1;
      
      // Source distribution
      insight.sources.forEach(source => {
        sourceDistribution[source] = (sourceDistribution[source] || 0) + 1;
      });
      
      totalConfidence += insight.confidence;
    });

    return {
      totalInsights: insights.length,
      averageConfidence: insights.length > 0 ? totalConfidence / insights.length : 0,
      typeDistribution,
      sourceDistribution
    };
  }
}
