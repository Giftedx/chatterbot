/**
 * Content Analysis Service
 * Handles content quality, keywords, entities, and summarization
 */

import { TextExtractionResult, KeyInformation, QualityMetrics } from './types.js';
import { logger } from '../../utils/logger.js';

export class DocumentContentAnalysisService {

  /**
   * Extract key information from text content
   */
  async extractKeyInformation(textContent: TextExtractionResult): Promise<KeyInformation | null> {
    try {
      if (!textContent.fullText) {
        logger.warn('No text content available for key information extraction');
        return null;
      }

      const keywords = this.extractKeywords(textContent.fullText);
      const entities = this.extractEntities(textContent.fullText);
      const topics = this.extractTopics(textContent.fullText);
      const summary = this.generateQuickSummary(textContent.fullText);

      const keyInfo: KeyInformation = {
        keywords,
        entities,
        topics,
        summary
      };

      logger.info('Key information extraction completed', {
        operation: 'key-information-extraction',
        metadata: {
          keywordCount: keywords.length,
          entityCount: entities.length,
          topicCount: topics.length,
          hasSummary: !!summary
        }
      });

      return keyInfo;

    } catch (error) {
      logger.error('Failed to extract key information', {
        operation: 'key-information-extraction',
        error: String(error)
      });
      return null;
    }
  }

  /**
   * Assess content quality and readability
   */
  async assessContentQuality(textContent: TextExtractionResult): Promise<QualityMetrics> {
    try {
      const text = textContent.fullText;
      
      const readabilityScore = this.calculateReadabilityScore(text);
      const sentimentScore = this.analyzeSentiment(text);
      const grammarScore = this.assessGrammarQuality(text);
      const coherenceScore = this.assessCoherence(text);
      const completenessScore = this.assessCompleteness(text, textContent);
      
      const overallQuality = this.determineOverallQuality([
        readabilityScore,
        sentimentScore,
        grammarScore,
        coherenceScore,
        completenessScore
      ]);

      const metrics: QualityMetrics = {
        readabilityScore,
        sentimentScore,
        grammarScore,
        coherenceScore,
        completenessScore,
        overallQuality
      };

      logger.info('Content quality assessment completed', {
        operation: 'quality-assessment',
        metadata: {
          readabilityScore,
          sentimentScore,
          grammarScore,
          coherenceScore,
          completenessScore,
          overallQuality
        }
      });

      return metrics;

    } catch (error) {
      logger.error('Failed to assess content quality', {
        operation: 'quality-assessment',
        error: String(error)
      });

      // Return default metrics on error
      return {
        readabilityScore: 0.5,
        sentimentScore: 0.5,
        grammarScore: 0.5,
        coherenceScore: 0.5,
        completenessScore: 0.5,
        overallQuality: 'fair'
      };
    }
  }

  /**
   * Generate document summary
   */
  async generateDocumentSummary(
    textContent: TextExtractionResult,
    options: { maxLength?: number; style?: 'brief' | 'detailed' } = {}
  ): Promise<string | null> {
    try {
      const { maxLength = 300, style = 'brief' } = options;
      
      if (!textContent.fullText) {
        logger.warn('No text content available for summarization');
        return null;
      }

      const text = textContent.fullText;
      
      // Extract key sentences for summarization
      const sentences = this.extractSentences(text);
      const scoredSentences = this.scoreSentences(sentences, text);
      
      // Select top sentences based on style
      const sentenceCount = style === 'brief' ? 
        Math.min(3, Math.ceil(sentences.length * 0.1)) : 
        Math.min(5, Math.ceil(sentences.length * 0.2));
      
      const topSentences = scoredSentences
        .sort((a, b) => b.score - a.score)
        .slice(0, sentenceCount)
        .sort((a, b) => a.position - b.position)
        .map(s => s.text);

      let summary = topSentences.join(' ');

      // Truncate if too long
      if (summary.length > maxLength) {
        summary = summary.substring(0, maxLength - 3) + '...';
      }

      logger.info('Document summary generated', {
        operation: 'summarization',
        metadata: {
          originalLength: text.length,
          summaryLength: summary.length,
          sentenceCount: topSentences.length,
          style
        }
      });

      return summary;

    } catch (error) {
      logger.error('Failed to generate document summary', {
        operation: 'summarization',
        error: String(error)
      });
      return null;
    }
  }

  /**
   * Advanced text analytics
   */
  performAdvancedAnalytics(text: string): {
    complexity: number;
    formality: number;
    density: number;
    uniqueness: number;
    structure: 'poor' | 'basic' | 'good' | 'excellent';
  } {
    try {
      const complexity = this.calculateTextComplexity(text);
      const formality = this.assessFormality(text);
      const density = this.calculateInformationDensity(text);
      const uniqueness = this.assessContentUniqueness(text);
      const structure = this.evaluateTextStructure(text);

      return {
        complexity,
        formality,
        density,
        uniqueness,
        structure
      };

    } catch (error) {
      logger.error('Failed to perform advanced analytics', {
        operation: 'advanced-analytics',
        error: String(error)
      });

      return {
        complexity: 0.5,
        formality: 0.5,
        density: 0.5,
        uniqueness: 0.5,
        structure: 'basic'
      };
    }
  }

  /**
   * Extract semantic concepts from text
   */
  extractSemanticConcepts(text: string): {
    concepts: Array<{ concept: string; relevance: number; context: string[] }>;
    relationships: Array<{ from: string; to: string; type: string; strength: number }>;
    themes: Array<{ theme: string; weight: number; examples: string[] }>;
  } {
    try {
      const concepts = this.identifyConcepts(text);
      const relationships = this.findConceptRelationships(concepts, text);
      const themes = this.extractThemes(text);

      return { concepts, relationships, themes };

    } catch (error) {
      logger.error('Failed to extract semantic concepts', {
        operation: 'semantic-extraction',
        error: String(error)
      });

      return { concepts: [], relationships: [], themes: [] };
    }
  }

  // Private helper methods

  private extractKeywords(text: string): Array<{ term: string; frequency: number; relevance: number }> {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Calculate TF-IDF-like relevance
    const totalWords = words.length;
    const keywords = Object.entries(wordFreq)
      .map(([term, frequency]) => ({
        term,
        frequency,
        relevance: (frequency / totalWords) * Math.log(totalWords / frequency)
      }))
      .filter(kw => kw.frequency > 1)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 20);

    return keywords;
  }

  private extractEntities(text: string): Array<{ text: string; type: string; confidence: number }> {
    const entities: Array<{ text: string; type: string; confidence: number }> = [];
    
    // Email pattern
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailPattern) || [];
    emails.forEach(email => {
      entities.push({ text: email, type: 'email', confidence: 0.95 });
    });

    // Phone pattern
    const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    const phones = text.match(phonePattern) || [];
    phones.forEach(phone => {
      entities.push({ text: phone, type: 'phone', confidence: 0.9 });
    });

    // Date pattern
    const datePattern = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/g;
    const dates = text.match(datePattern) || [];
    dates.forEach(date => {
      entities.push({ text: date, type: 'date', confidence: 0.85 });
    });

    // URL pattern
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlPattern) || [];
    urls.forEach(url => {
      entities.push({ text: url, type: 'url', confidence: 0.9 });
    });

    // Capitalized words (potential names/places)
    const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const names = text.match(namePattern) || [];
    names.slice(0, 10).forEach(name => {
      entities.push({ text: name, type: 'name', confidence: 0.6 });
    });

    return entities;
  }

  private extractTopics(text: string): Array<{ topic: string; weight: number }> {
    // Simple topic extraction based on keyword clustering
    const keywords = this.extractKeywords(text);
    const topics: Record<string, number> = {};

    // Group related keywords into topics
    keywords.forEach(keyword => {
      const topic = this.assignToTopic(keyword.term);
      topics[topic] = (topics[topic] || 0) + keyword.relevance;
    });

    return Object.entries(topics)
      .map(([topic, weight]) => ({ topic, weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);
  }

  private generateQuickSummary(text: string): string {
    const sentences = this.extractSentences(text);
    if (sentences.length === 0) return '';

    // Take first sentence and a high-scoring middle sentence
    const firstSentence = sentences[0];
    const middleIndex = Math.floor(sentences.length / 2);
    const middleSentence = sentences[middleIndex];

    return sentences.length > 1 ? 
      `${firstSentence} ${middleSentence}` : 
      firstSentence;
  }

  private calculateReadabilityScore(text: string): number {
    // Simplified Flesch reading ease calculation
    const sentences = this.extractSentences(text);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);

    if (sentences.length === 0 || words.length === 0) return 0.5;

    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Simplified Flesch formula
    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    
    // Normalize to 0-1 scale
    return Math.max(0, Math.min(1, score / 100));
  }

  private analyzeSentiment(text: string): number {
    // Simple sentiment analysis based on word lists
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
      'positive', 'beneficial', 'successful', 'effective', 'improved'
    ];
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'negative', 'problematic',
      'failed', 'unsuccessful', 'ineffective', 'poor', 'disappointing'
    ];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });

    const totalSentimentWords = positiveCount + negativeCount;
    if (totalSentimentWords === 0) return 0.5; // Neutral

    return positiveCount / totalSentimentWords;
  }

  private assessGrammarQuality(text: string): number {
    // Simple grammar assessment based on heuristics
    let score = 1.0;
    
    // Check for repeated words
    const words = text.toLowerCase().split(/\s+/);
    const wordSet = new Set(words);
    if (words.length > wordSet.size) {
      score -= (words.length - wordSet.size) / words.length * 0.2;
    }

    // Check sentence structure
    const sentences = this.extractSentences(text);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;
    
    if (avgSentenceLength < 5 || avgSentenceLength > 30) {
      score -= 0.1; // Penalize very short or very long sentences
    }

    return Math.max(0, Math.min(1, score));
  }

  private assessCoherence(text: string): number {
    // Simple coherence assessment
    const sentences = this.extractSentences(text);
    if (sentences.length < 2) return 1;

    let coherenceScore = 0;
    
    for (let i = 1; i < sentences.length; i++) {
      const prev = sentences[i - 1].toLowerCase();
      const curr = sentences[i].toLowerCase();
      
      // Check for connecting words
      const connectingWords = ['however', 'therefore', 'furthermore', 'moreover', 'additionally', 'consequently'];
      const hasConnector = connectingWords.some(word => curr.includes(word));
      
      if (hasConnector) coherenceScore += 1;
      
      // Check for word overlap between adjacent sentences
      const prevWords = new Set(prev.split(/\s+/));
      const currWords = new Set(curr.split(/\s+/));
      const overlap = [...prevWords].filter(word => currWords.has(word) && word.length > 3);
      
      if (overlap.length > 0) coherenceScore += 0.5;
    }

    return Math.min(1, coherenceScore / (sentences.length - 1));
  }

  private assessCompleteness(text: string, textContent: TextExtractionResult): number {
    // Assess if document seems complete
    let score = 0.5; // Base score

    // Check for conclusion indicators
    const conclusionWords = ['conclusion', 'summary', 'finally', 'in summary', 'to conclude'];
    const hasConclusion = conclusionWords.some(word => text.toLowerCase().includes(word));
    if (hasConclusion) score += 0.2;

    // Check for introduction indicators
    const introWords = ['introduction', 'overview', 'background', 'purpose'];
    const hasIntroduction = introWords.some(word => text.toLowerCase().includes(word));
    if (hasIntroduction) score += 0.2;

    // Check length appropriateness
    if (textContent.wordCount > 100) score += 0.1;
    if (textContent.wordCount > 500) score += 0.1;

    return Math.min(1, score);
  }

  private determineOverallQuality(scores: number[]): 'poor' | 'fair' | 'good' | 'excellent' {
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    if (avgScore >= 0.8) return 'excellent';
    if (avgScore >= 0.6) return 'good';
    if (avgScore >= 0.4) return 'fair';
    return 'poor';
  }

  private extractSentences(text: string): string[] {
    return text.split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);
  }

  private scoreSentences(sentences: string[], fullText: string): Array<{ text: string; score: number; position: number }> {
    return sentences.map((sentence, index) => {
      let score = 0;
      
      // Position scoring (first and last sentences get higher scores)
      if (index === 0 || index === sentences.length - 1) score += 0.3;
      
      // Length scoring (medium length sentences preferred)
      const words = sentence.split(/\s+/).length;
      if (words >= 10 && words <= 25) score += 0.2;
      
      // Keyword density scoring
      const keywords = this.extractKeywords(fullText);
      const sentenceWords = sentence.toLowerCase().split(/\s+/);
      const keywordMatches = keywords.filter(kw => 
        sentenceWords.includes(kw.term)
      ).length;
      score += keywordMatches * 0.1;
      
      return { text: sentence, score, position: index };
    });
  }

  private countSyllables(word: string): number {
    // Simple syllable counting
    const vowels = word.match(/[aeiouy]+/gi);
    return vowels ? vowels.length : 1;
  }

  private assignToTopic(term: string): string {
    // Simple topic assignment based on term characteristics
    if (term.length < 4) return 'general';
    
    const firstChar = term.charAt(0);
    if (firstChar >= 'a' && firstChar <= 'h') return 'category_a';
    if (firstChar >= 'i' && firstChar <= 'p') return 'category_b';
    if (firstChar >= 'q' && firstChar <= 'z') return 'category_c';
    
    return 'general';
  }

  private calculateTextComplexity(text: string): number {
    const words = text.split(/\s+/);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const sentences = this.extractSentences(text);
    const avgSentenceLength = words.length / sentences.length;
    
    // Complexity based on word and sentence length
    const complexity = (avgWordLength / 10) * 0.5 + (avgSentenceLength / 30) * 0.5;
    return Math.min(1, complexity);
  }

  private assessFormality(text: string): number {
    const formalIndicators = ['therefore', 'however', 'furthermore', 'consequently', 'nevertheless'];
    const informalIndicators = ['basically', 'really', 'pretty', 'kinda', 'gonna'];
    
    const words = text.toLowerCase().split(/\s+/);
    const formalCount = words.filter(word => formalIndicators.includes(word)).length;
    const informalCount = words.filter(word => informalIndicators.includes(word)).length;
    
    const totalIndicators = formalCount + informalCount;
    return totalIndicators > 0 ? formalCount / totalIndicators : 0.5;
  }

  private calculateInformationDensity(text: string): number {
    const words = text.split(/\s+/);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    return uniqueWords.size / words.length;
  }

  private assessContentUniqueness(text: string): number {
    // Simple uniqueness assessment based on vocabulary diversity
    const words = text.split(/\s+/).filter(w => w.length > 3);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    return Math.min(1, uniqueWords.size / Math.max(1, words.length * 0.7));
  }

  private evaluateTextStructure(text: string): 'poor' | 'basic' | 'good' | 'excellent' {
    const sentences = this.extractSentences(text);
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    const avgSentencesPerParagraph = sentences.length / Math.max(1, paragraphs.length);
    
    if (avgSentencesPerParagraph >= 3 && avgSentencesPerParagraph <= 6 && paragraphs.length > 1) {
      return 'excellent';
    } else if (avgSentencesPerParagraph >= 2 && paragraphs.length > 0) {
      return 'good';
    } else if (sentences.length > 1) {
      return 'basic';
    }
    return 'poor';
  }

  private identifyConcepts(text: string): Array<{ concept: string; relevance: number; context: string[] }> {
    const keywords = this.extractKeywords(text);
    return keywords.slice(0, 10).map(kw => ({
      concept: kw.term,
      relevance: kw.relevance,
      context: this.findWordContext(kw.term, text)
    }));
  }

  private findConceptRelationships(
    concepts: Array<{ concept: string; relevance: number; context: string[] }>,
    text: string
  ): Array<{ from: string; to: string; type: string; strength: number }> {
    const relationships: Array<{ from: string; to: string; type: string; strength: number }> = [];
    
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const strength = this.calculateRelationshipStrength(concepts[i].concept, concepts[j].concept, text);
        if (strength > 0.3) {
          relationships.push({
            from: concepts[i].concept,
            to: concepts[j].concept,
            type: 'related',
            strength
          });
        }
      }
    }
    
    return relationships;
  }

  private extractThemes(text: string): Array<{ theme: string; weight: number; examples: string[] }> {
    const topics = this.extractTopics(text);
    return topics.map(topic => ({
      theme: topic.topic,
      weight: topic.weight,
      examples: this.findWordContext(topic.topic, text).slice(0, 3)
    }));
  }

  private findWordContext(word: string, text: string): string[] {
    const sentences = this.extractSentences(text);
    return sentences
      .filter(sentence => sentence.toLowerCase().includes(word.toLowerCase()))
      .slice(0, 3);
  }

  private calculateRelationshipStrength(word1: string, word2: string, text: string): number {
    const sentences = this.extractSentences(text);
    const coOccurrences = sentences.filter(sentence => {
      const lower = sentence.toLowerCase();
      return lower.includes(word1.toLowerCase()) && lower.includes(word2.toLowerCase());
    }).length;
    
    return Math.min(1, coOccurrences / Math.max(1, sentences.length * 0.1));
  }
}
