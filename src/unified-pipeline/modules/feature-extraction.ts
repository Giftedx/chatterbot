import { UnifiedPipelineContext } from '../core/context.js';
import { BaseModule, DecisionContext } from './base-module.js';

export class FeatureExtractionModule extends BaseModule {
  // B2: React to decision context for strategy-aware feature extraction
  protected onDecisionContextSet(context: DecisionContext): void {
    console.log('B2: FeatureExtractionModule received decision context', {
      strategy: context.strategy,
      confidence: context.confidence
    });
  }

  async execute(context: UnifiedPipelineContext): Promise<UnifiedPipelineContext> {
    console.log('B2: Executing Feature Extraction Module with strategy awareness');

    // B2: Extract basic features from the prompt
    const prompt = context.data.prompt || '';
    
    const features = {
      length: prompt.length,
      wordCount: prompt.split(/\s+/).length,
      hasQuestion: /\?/.test(prompt),
      hasCode: /```|`/.test(prompt),
      hasUrls: /https?:\/\//.test(prompt),
      hasMentions: /@/.test(prompt),
      sentiment: this.extractSentiment(prompt),
      complexity: this.assessComplexity(prompt),
      urgency: this.assessUrgency(prompt)
    };

    // B2: Strategy-aware feature processing
    if (this.isLightweightMode()) {
      console.log('B2: Using lightweight feature extraction');
      // Only extract essential features for quick processing
      context.data.features = {
        ...features,
        processingMode: 'lightweight',
        extractedFeatures: ['length', 'wordCount', 'hasQuestion']
      };
    } else if (this.isDeepProcessingMode()) {
      console.log('B2: Using comprehensive feature extraction');
      // Extract all features for deep analysis
      context.data.features = {
        ...features,
        processingMode: 'comprehensive',
        extractedFeatures: Object.keys(features),
        // Additional deep features
        languageComplexity: this.assessLanguageComplexity(prompt),
        topicalCategories: this.classifyTopics(prompt),
        cognitiveLoad: this.estimateCognitiveLoad(prompt)
      };
    } else {
      console.log('B2: Using standard feature extraction');
      // Standard feature set
      context.data.features = {
        ...features,
        processingMode: 'standard',
        extractedFeatures: ['length', 'wordCount', 'hasQuestion', 'hasCode', 'complexity', 'urgency']
      };
    }

    return context;
  }

  // B2: Helper methods for feature extraction
  private extractSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['good', 'great', 'excellent', 'awesome', 'love', 'like'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'problem'];
    
    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private assessComplexity(text: string): 'low' | 'medium' | 'high' {
    const wordCount = text.split(/\s+/).length;
    const avgWordLength = text.replace(/\s+/g, '').length / Math.max(wordCount, 1);
    
    if (wordCount < 10 && avgWordLength < 5) return 'low';
    if (wordCount > 50 || avgWordLength > 7) return 'high';
    return 'medium';
  }

  private assessUrgency(text: string): 'low' | 'medium' | 'high' {
    const urgentWords = ['urgent', 'asap', 'quickly', 'immediately', 'emergency', 'help'];
    const words = text.toLowerCase().split(/\s+/);
    const urgentCount = words.filter(word => urgentWords.some(urgent => word.includes(urgent))).length;
    
    if (urgentCount >= 2) return 'high';
    if (urgentCount >= 1) return 'medium';
    return 'low';
  }

  private assessLanguageComplexity(text: string): number {
    // Simple heuristic for language complexity
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    const avgWordsPerSentence = words / Math.max(sentences, 1);
    return Math.min(avgWordsPerSentence / 10, 1); // Normalize to 0-1
  }

  private classifyTopics(text: string): string[] {
    const topics: string[] = [];
    const lowerText = text.toLowerCase();
    
    if (/code|program|function|variable|class|method|debug/.test(lowerText)) topics.push('programming');
    if (/help|question|how|what|why|when/.test(lowerText)) topics.push('help-seeking');
    if (/error|problem|issue|bug|wrong/.test(lowerText)) topics.push('troubleshooting');
    if (/learn|tutorial|guide|explain|understand/.test(lowerText)) topics.push('learning');
    
    return topics.length > 0 ? topics : ['general'];
  }

  private estimateCognitiveLoad(text: string): 'low' | 'medium' | 'high' {
    const features = {
      length: text.length,
      complexity: this.assessComplexity(text),
      hasCode: /```|`/.test(text),
      hasMultipleQuestions: (text.match(/\?/g) || []).length > 1,
      hasNestedConcepts: /\([^)]*\([^)]*\)[^)]*\)/.test(text)
    };
    
    let score = 0;
    if (features.length > 500) score += 2;
    if (features.complexity === 'high') score += 2;
    if (features.hasCode) score += 1;
    if (features.hasMultipleQuestions) score += 1;
    if (features.hasNestedConcepts) score += 1;
    
    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }
}
