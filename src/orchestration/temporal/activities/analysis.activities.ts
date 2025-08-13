/**
 * Analysis Activities for Temporal Workflows
 * Provides comprehensive analysis capabilities for AI workflow orchestration
 */

import { DocumentContentAnalysisService } from '../../../multimodal/document-processing/content-analysis.service.js';

export interface AnalysisRequest {
  type: 'sentiment' | 'toxicity' | 'intent' | 'entity' | 'topic' | 'complexity' | 'quality' | 'bias';
  content: string;
  context?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export interface AnalysisResult {
  analysisType: string;
  score: number;
  confidence: number;
  details: Record<string, unknown>;
  recommendations?: string[];
  metadata: Record<string, unknown>;
}

/**
 * Perform comprehensive content analysis
 */
export async function analyzeContent(request: AnalysisRequest): Promise<AnalysisResult> {
  const { type, content, context: _context = {}, options: _options = {} } = request;
  const startTime = Date.now();
  const docAnalysis = new DocumentContentAnalysisService();

  try {
    let analysisResult: AnalysisResult;

    switch (type) {
      case 'sentiment': {
        const sentimentScore = docAnalysis['analyzeSentiment'](content as any) as number;
        analysisResult = {
          analysisType: 'sentiment',
          score: sentimentScore,
          confidence: 0.8,
          details: {
            sentiment: sentimentScore > 0.6 ? 'positive' : sentimentScore < 0.4 ? 'negative' : 'neutral',
            emotions: [],
            intensity: Math.abs(sentimentScore - 0.5) * 2
          },
          recommendations: sentimentScore < 0.3 ? ['Consider more positive framing', 'Add empathetic language'] : [],
          metadata: { processingTime: Date.now() - startTime }
        };
        break;
      }
      case 'toxicity': {
        const toxicWords = ['hate', 'idiot', 'stupid', 'dumb'];
        const lower = content.toLowerCase();
        const matches = toxicWords.filter(w => lower.includes(w));
        const tox = Math.min(1, matches.length / 5);
        analysisResult = {
          analysisType: 'toxicity',
          score: tox,
          confidence: 0.9,
          details: {
            categories: matches.length ? ['abusive_language'] : [],
            severity: tox > 0.7 ? 'high' : tox > 0.3 ? 'medium' : 'low',
            problematicPhrases: matches
          },
          recommendations: tox > 0.7 ? ['Content review required', 'Consider content moderation'] : [],
          metadata: { processingTime: Date.now() - startTime }
        };
        break;
      }
      case 'intent': {
        const intents = ['question', 'request', 'search', 'analysis', 'creation', 'help'] as const;
        const detected = intents.find(i => content.toLowerCase().includes(i)) || 'general';
        const entities = docAnalysis.extractKeyInformation({ fullText: content, wordCount: content.length, characterCount: content.length, paragraphCount: 1 } as any)
          .then(res => res?.entities ?? [])
          .catch(() => []);
        const ent = await entities as Array<{ text: string; type: string; confidence: number }>;
        analysisResult = {
          analysisType: 'intent',
          score: 0.7,
          confidence: 0.7,
          details: {
            primaryIntent: detected,
            secondaryIntents: intents.filter(i => i !== detected).slice(0, 2),
            entities: ent,
            urgency: 'normal'
          },
          recommendations: [],
          metadata: { processingTime: Date.now() - startTime }
        };
        break;
      }
      case 'entity': {
        const entities = docAnalysis['extractEntities'](content);
        analysisResult = {
          analysisType: 'entity',
          score: entities.length > 0 ? 1 : 0,
          confidence: 0.85,
          details: {
            entities,
            entityTypes: [...new Set(entities.map((e: { type: string }) => e.type))],
            keyEntities: entities.filter((e: { confidence: number }) => e.confidence > 0.8) || []
          },
          recommendations: entities.length === 0 ? ['Content lacks specific entities', 'Consider adding more concrete details'] : [],
          metadata: { processingTime: Date.now() - startTime, entityCount: entities.length }
        };
        break;
      }
      case 'topic': {
        const topics = docAnalysis['extractTopics'](content);
        analysisResult = {
          analysisType: 'topic',
          score: topics.length > 0 ? 1 : 0,
          confidence: 0.8,
          details: {
            primaryTopics: topics.slice(0, 3) || [],
            allTopics: topics || [],
            topicDiversity: topics.length,
            coherence: calculateTopicCoherence(topics as any, content)
          },
          recommendations: topics.length === 0 ? ['Content lacks clear topics', 'Consider more focused discussion'] : [],
          metadata: { processingTime: Date.now() - startTime, topicCount: topics.length }
        };
        break;
      }
      case 'complexity': {
        const complexity = analyzeComplexity(content);
        analysisResult = {
          analysisType: 'complexity',
          score: complexity.score,
          confidence: 0.9,
          details: {
            readabilityScore: complexity.readability,
            vocabularyComplexity: complexity.vocabulary,
            sentenceComplexity: complexity.sentences,
            conceptualComplexity: complexity.concepts,
            suggestions: complexity.suggestions
          },
          recommendations: complexity.score > 0.8 ? ['Consider simplifying language', 'Break down complex concepts'] : [],
          metadata: { processingTime: Date.now() - startTime }
        };
        break;
      }
      case 'quality': {
        const quality = analyzeQuality(content);
        analysisResult = {
          analysisType: 'quality',
          score: quality.score,
          confidence: 0.85,
          details: {
            grammarScore: quality.grammar,
            clarityScore: quality.clarity,
            completenessScore: quality.completeness,
            relevanceScore: quality.relevance,
            issues: quality.issues
          },
          recommendations: quality.recommendations || [],
          metadata: { processingTime: Date.now() - startTime }
        };
        break;
      }
      case 'bias': {
        const bias = analyzeBias(content);
        analysisResult = {
          analysisType: 'bias',
          score: bias.score,
          confidence: 0.75,
          details: {
            biasTypes: bias.types || [],
            problematicLanguage: bias.language || [],
            inclusivityScore: bias.inclusivity || 0.8,
            fairnessScore: bias.fairness || 0.8
          },
          recommendations: bias.score > 0.5 ? ['Review for potential bias', 'Consider inclusive language'] : [],
          metadata: { processingTime: Date.now() - startTime }
        };
        break;
      }
      default: {
        analysisResult = {
          analysisType: type,
          score: 0,
          confidence: 0.5,
          details: {},
          recommendations: [],
          metadata: { processingTime: Date.now() - startTime }
        };
      }
    }

    return analysisResult;
  } catch (error) {
    return {
      analysisType: type,
      score: 0,
      confidence: 0.5,
      details: {},
      recommendations: [],
      metadata: { processingTime: Date.now() - startTime, error: String(error) }
    };
  }
}

/**
 * Batch analysis for multiple content pieces
 */
export async function batchAnalyze(request: {
  contents: string[];
  analysisTypes: string[];
  options?: Record<string, unknown>;
}): Promise<AnalysisResult[][]> {
  const { contents, analysisTypes, options = {} } = request;
  
  const results: AnalysisResult[][] = [];
  
  for (const content of contents) {
    const contentResults: AnalysisResult[] = [];
    
    for (const analysisType of analysisTypes) {
      const result = await analyzeContent({
        type: analysisType as any,
        content,
        options
      });
      contentResults.push(result);
    }
    
    results.push(contentResults);
  }
  
  return results;
}

// Helper functions for analysis

function getIntentRecommendations(intent: string): string[] {
  const recommendations: Record<string, string[]> = {
    question: ['Provide comprehensive answer', 'Include examples if helpful'],
    request: ['Acknowledge the request', 'Provide clear next steps'],
    complaint: ['Show empathy', 'Offer solutions or escalation'],
    compliment: ['Express gratitude', 'Continue positive engagement'],
    information: ['Verify accuracy', 'Provide additional context'],
    support: ['Offer assistance', 'Provide relevant resources']
  };
  
  return recommendations[intent] || ['Respond appropriately to user intent'];
}

function calculateTopicDiversity(topics: any[]): number {
  if (topics.length === 0) return 0;
  const uniqueCategories = new Set(topics.map(t => t.category || t.type));
  return uniqueCategories.size / topics.length;
}

function calculateTopicCoherence(topics: any[], content: string): number {
  // Simple coherence calculation based on topic relevance
  if (topics.length === 0) return 0;
  const contentWords = content.toLowerCase().split(/\s+/);
  let relevantWords = 0;
  
  for (const topic of topics) {
    const topicWords = (topic.keywords || []).filter((word: string) => 
      contentWords.includes(word.toLowerCase())
    );
    relevantWords += topicWords.length;
  }
  
  return Math.min(relevantWords / contentWords.length, 1);
}

function analyzeComplexity(content: string): {
  score: number;
  readability: number;
  vocabulary: number;
  sentences: number;
  concepts: number;
  suggestions: string[];
} {
  const words = content.split(/\s+/);
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Simple complexity metrics
  const avgWordsPerSentence = words.length / sentences.length;
  const longWords = words.filter(w => w.length > 6).length;
  const vocabularyComplexity = longWords / words.length;
  const sentenceComplexity = Math.min(avgWordsPerSentence / 20, 1);
  
  const overallScore = (vocabularyComplexity + sentenceComplexity) / 2;
  
  return {
    score: overallScore,
    readability: 1 - overallScore,
    vocabulary: vocabularyComplexity,
    sentences: sentenceComplexity,
    concepts: 0.5, // Mock conceptual complexity
    suggestions: overallScore > 0.7 ? ['Use simpler words', 'Shorten sentences'] : []
  };
}

function analyzeQuality(content: string): {
  score: number;
  grammar: number;
  clarity: number;
  completeness: number;
  relevance: number;
  issues: string[];
  recommendations: string[];
} {
  // Simple quality metrics
  const hasGoodLength = content.length > 20 && content.length < 2000;
  const hasProperPunctuation = /[.!?]$/.test(content.trim());
  const hasCapitalization = /^[A-Z]/.test(content.trim());
  
  const grammar = (hasProperPunctuation ? 0.5 : 0) + (hasCapitalization ? 0.5 : 0);
  const clarity = hasGoodLength ? 0.8 : 0.4;
  const completeness = content.length > 50 ? 0.9 : 0.5;
  const relevance = 0.8; // Mock relevance score
  
  const overallScore = (grammar + clarity + completeness + relevance) / 4;
  
  const issues = [];
  const recommendations = [];
  
  if (!hasProperPunctuation) {
    issues.push('Missing proper punctuation');
    recommendations.push('Add appropriate punctuation marks');
  }
  
  if (!hasCapitalization) {
    issues.push('Missing capitalization');
    recommendations.push('Capitalize the first letter');
  }
  
  if (content.length < 20) {
    issues.push('Content too short');
    recommendations.push('Provide more detailed response');
  }
  
  return {
    score: overallScore,
    grammar,
    clarity,
    completeness,
    relevance,
    issues,
    recommendations
  };
}

function analyzeBias(content: string): {
  score: number;
  types: string[];
  language: string[];
  inclusivity: number;
  fairness: number;
} {
  // Simple bias detection
  const biasWords = ['always', 'never', 'all', 'none', 'obviously', 'clearly'];
  const foundBiasWords = biasWords.filter(word => 
    content.toLowerCase().includes(word)
  );
  
  const biasScore = foundBiasWords.length / content.split(/\s+/).length;
  
  return {
    score: biasScore,
    types: foundBiasWords.length > 0 ? ['linguistic'] : [],
    language: foundBiasWords,
    inclusivity: 1 - biasScore,
    fairness: 1 - biasScore
  };
}