/**
 * Classification Service
 * Handles document type and content classification
 */

import { MediaFile, DocumentClassification, ContentType, TextExtractionResult } from './types.js';
import { logger } from '../../utils/logger.js';

export class DocumentClassificationService {

  /**
   * Classify document type and content
   */
  async classifyDocument(
    mediaFile: MediaFile,
    textContent?: TextExtractionResult
  ): Promise<DocumentClassification> {
    try {
      const format = this.getDocumentFormat(mediaFile.mimeType);
      const documentType = this.determineDocumentType(mediaFile, textContent);
      const contentType = this.determineContentType(textContent);
      const categories = this.generateContentCategories(documentType, contentType, textContent);
      const confidence = this.calculateClassificationConfidence(
        mediaFile,
        textContent,
        documentType,
        contentType
      );

      const classification: DocumentClassification = {
        documentType,
        contentType,
        categories,
        confidence,
        format
      };

      logger.info('Document classification completed', {
        operation: 'document-classification',
        metadata: {
          fileId: mediaFile.id,
          documentType,
          contentType,
          categories: categories.length,
          confidence
        }
      });

      return classification;

    } catch (error) {
      logger.error('Failed to classify document', {
        operation: 'document-classification',
        metadata: {
          fileId: mediaFile.id,
          error: String(error)
        }
      });

      // Return default classification on error
      return {
        documentType: 'unknown',
        contentType: 'text',
        categories: ['unknown'],
        confidence: 0.1,
        format: this.getDocumentFormat(mediaFile.mimeType)
      };
    }
  }

  /**
   * Classify content type based on text analysis
   */
  classifyContentType(text: string): {
    primaryType: ContentType;
    secondaryTypes: ContentType[];
    confidence: number;
    indicators: Record<ContentType, string[]>;
  } {
    try {
      const indicators: Record<ContentType, string[]> = {
        text: [],
        technical: [],
        legal: [],
        academic: [],
        financial: [],
        creative: [],
        code: [],
        data: [],
        presentation: [],
        manual: [],
        report: [],
        other: []
      };

      const lowerText = text.toLowerCase();

      // Financial indicators
      const financialTerms = [
        'financial', 'budget', 'revenue', 'profit', 'expense', 'cost',
        'investment', 'asset', 'liability', 'cash flow', 'balance sheet',
        'income statement', 'roi', 'financial analysis', 'quarterly report'
      ];
      financialTerms.forEach(term => {
        if (lowerText.includes(term)) {
          indicators.financial.push(term);
        }
      });

      // Legal indicators
      const legalTerms = [
        'legal', 'contract', 'agreement', 'clause', 'liability', 'compliance',
        'regulation', 'law', 'statute', 'jurisdiction', 'plaintiff', 'defendant',
        'litigation', 'settlement', 'terms and conditions', 'legal advice'
      ];
      legalTerms.forEach(term => {
        if (lowerText.includes(term)) {
          indicators.legal.push(term);
        }
      });

      // Technical indicators
      const technicalTerms = [
        'technical', 'specification', 'documentation', 'api', 'algorithm',
        'software', 'hardware', 'system', 'architecture', 'implementation',
        'protocol', 'framework', 'library', 'database', 'configuration'
      ];
      technicalTerms.forEach(term => {
        if (lowerText.includes(term)) {
          indicators.technical.push(term);
        }
      });

      // Academic indicators
      const academicTerms = [
        'academic', 'research', 'study', 'analysis', 'methodology', 'hypothesis',
        'conclusion', 'abstract', 'literature review', 'bibliography',
        'thesis', 'dissertation', 'journal', 'peer review', 'scholarly'
      ];
      academicTerms.forEach(term => {
        if (lowerText.includes(term)) {
          indicators.academic.push(term);
        }
      });

      // Business indicators
      const businessTerms = [
        'business', 'strategy', 'management', 'marketing', 'sales', 'customer',
        'market', 'competitive', 'stakeholder', 'organization', 'corporate',
        'executive', 'operations', 'planning', 'objectives'
      ];
      businessTerms.forEach(term => {
        if (lowerText.includes(term)) {
          indicators.financial.push(term);
        }
      });

      // Calculate scores
      const scores: Record<ContentType, number> = {
        text: indicators.text.length,
        technical: indicators.technical.length,
        legal: indicators.legal.length,
        academic: indicators.academic.length,
        financial: indicators.financial.length,
        creative: indicators.creative.length,
        code: indicators.code.length,
        data: indicators.data.length,
        presentation: indicators.presentation.length,
        manual: indicators.manual.length,
        report: indicators.report.length,
        other: indicators.other.length + 1 // Base score for general content
      };

      // Find primary and secondary types
      const sortedTypes = Object.entries(scores)
        .sort(([, a], [, b]) => b - a)
        .map(([type]) => type as ContentType);

      const primaryType = sortedTypes[0];
      const secondaryTypes = sortedTypes.slice(1, 3).filter(type => scores[type] > 0);

      // Calculate confidence based on indicator strength
      const maxScore = Math.max(...Object.values(scores));
      const confidence = maxScore > 1 ? Math.min(maxScore / 10, 1) : 0.3;

      return {
        primaryType,
        secondaryTypes,
        confidence,
        indicators
      };

    } catch (error) {
      logger.error('Failed to classify content type', {
        operation: 'content-type-classification',
        error: String(error)
      });

      return {
        primaryType: 'other',
        secondaryTypes: [],
        confidence: 0.1,
        indicators: {
          text: [], technical: [], legal: [], academic: [], financial: [], 
          creative: [], code: [], data: [], presentation: [], manual: [], report: [], other: []
        }
      };
    }
  }

  /**
   * Detect document categories and tags
   */
  detectCategories(
    mediaFile: MediaFile,
    textContent?: TextExtractionResult,
    classification?: DocumentClassification
  ): {
    categories: string[];
    tags: string[];
    topicDistribution: Record<string, number>;
  } {
    try {
      const categories = new Set<string>();
      const tags = new Set<string>();
      const topicDistribution: Record<string, number> = {};

      // Add basic categories from classification
      if (classification) {
        categories.add(classification.documentType);
        categories.add(classification.contentType);
        classification.categories.forEach(cat => categories.add(cat));
      }

      // Add filename-based categories
      const filename = mediaFile.originalName.toLowerCase();
      this.extractFilenameCategories(filename).forEach(cat => categories.add(cat));

      // Add content-based categories and tags
      if (textContent?.fullText) {
        const contentAnalysis = this.analyzeContentForCategories(textContent.fullText);
        contentAnalysis.categories.forEach(cat => categories.add(cat));
        contentAnalysis.tags.forEach(tag => tags.add(tag));
        Object.assign(topicDistribution, contentAnalysis.topicDistribution);
      }

      // Add format-based categories
      const format = this.getDocumentFormat(mediaFile.mimeType);
      categories.add(format.toLowerCase());

      // Add size-based categories
      if (mediaFile.fileSize > 5 * 1024 * 1024) { // > 5MB
        categories.add('large_document');
      } else if (mediaFile.fileSize < 100 * 1024) { // < 100KB
        categories.add('small_document');
      }

      return {
        categories: Array.from(categories),
        tags: Array.from(tags),
        topicDistribution
      };

    } catch (error) {
      logger.error('Failed to detect categories', {
        operation: 'category-detection',
        metadata: { fileId: mediaFile.id, error: String(error) }
      });

      return {
        categories: ['unknown'],
        tags: [],
        topicDistribution: {}
      };
    }
  }

  /**
   * Calculate semantic similarity between documents
   */
  calculateSimilarity(
    classification1: DocumentClassification,
    classification2: DocumentClassification
  ): {
    overall: number;
    typeMatch: number;
    contentMatch: number;
    categoryOverlap: number;
  } {
    try {
      // Type similarity
      const typeMatch = classification1.documentType === classification2.documentType ? 1 : 0;
      
      // Content type similarity
      const contentMatch = classification1.contentType === classification2.contentType ? 1 : 0;
      
      // Category overlap
      const categories1 = new Set(classification1.categories);
      const categories2 = new Set(classification2.categories);
      const intersection = new Set([...categories1].filter(x => categories2.has(x)));
      const union = new Set([...categories1, ...categories2]);
      const categoryOverlap = union.size > 0 ? intersection.size / union.size : 0;
      
      // Overall similarity (weighted average)
      const overall = (typeMatch * 0.3 + contentMatch * 0.4 + categoryOverlap * 0.3);

      return {
        overall,
        typeMatch,
        contentMatch,
        categoryOverlap
      };

    } catch (error) {
      logger.error('Failed to calculate similarity', {
        operation: 'similarity-calculation',
        error: String(error)
      });

      return { overall: 0, typeMatch: 0, contentMatch: 0, categoryOverlap: 0 };
    }
  }

  // Private helper methods

  private getDocumentFormat(mimeType: string): string {
    const formatMap: Record<string, string> = {
      'application/pdf': 'PDF',
      'application/msword': 'Word',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
      'application/vnd.ms-excel': 'Excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
      'application/vnd.ms-powerpoint': 'PowerPoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
      'text/plain': 'Text',
      'text/markdown': 'Markdown',
      'text/csv': 'CSV',
      'application/json': 'JSON',
      'application/rtf': 'RTF'
    };

    return formatMap[mimeType] || 'Unknown';
  }

  private determineDocumentType(mediaFile: MediaFile, textContent?: TextExtractionResult): string {
    const filename = mediaFile.originalName.toLowerCase();
    const format = this.getDocumentFormat(mediaFile.mimeType);
    
    // Classify based on filename patterns
    const filenamePatterns: Record<string, string> = {
      'resume': 'resume',
      'cv': 'resume',
      'report': 'report',
      'proposal': 'proposal',
      'contract': 'contract',
      'agreement': 'contract',
      'manual': 'manual',
      'guide': 'manual',
      'invoice': 'invoice',
      'receipt': 'invoice',
      'specification': 'specification',
      'requirements': 'specification',
      'presentation': 'presentation',
      'slides': 'presentation'
    };

    for (const [pattern, type] of Object.entries(filenamePatterns)) {
      if (filename.includes(pattern)) {
        return type;
      }
    }
    
    // Classify based on format
    switch (format) {
      case 'Excel': return 'spreadsheet';
      case 'PowerPoint': return 'presentation';
      case 'PDF': return 'document';
      default: return 'text';
    }
  }

  private determineContentType(textContent?: TextExtractionResult): ContentType {
    if (!textContent?.fullText) return 'other';
    
    const text = textContent.fullText.toLowerCase();
    
    const contentPatterns: Array<[ContentType, string[]]> = [
      ['financial', ['financial', 'budget', 'revenue', 'profit', 'expense', 'investment']],
      ['legal', ['legal', 'contract', 'agreement', 'compliance', 'regulation', 'law']],
      ['technical', ['technical', 'specification', 'api', 'algorithm', 'software', 'system']],
      ['academic', ['academic', 'research', 'study', 'analysis', 'methodology', 'hypothesis']],
      ['financial', ['business', 'strategy', 'management', 'marketing', 'sales', 'customer']]
    ];

    for (const [type, patterns] of contentPatterns) {
      if (patterns.some(pattern => text.includes(pattern))) {
        return type;
      }
    }
    
    return 'other';
  }

  private generateContentCategories(
    documentType: string,
    contentType: ContentType,
    textContent?: TextExtractionResult
  ): string[] {
    const categories = new Set([documentType, contentType]);
    
    if (textContent?.fullText) {
      const text = textContent.fullText.toLowerCase();
      
      const categoryPatterns: Record<string, string[]> = {
        'analytical': ['analysis', 'analyze', 'examine', 'evaluate'],
        'planning': ['plan', 'planning', 'strategy', 'roadmap'],
        'instructional': ['instruction', 'guide', 'how to', 'steps'],
        'summary': ['summary', 'overview', 'brief', 'synopsis'],
        'detailed': ['detailed', 'comprehensive', 'thorough', 'in-depth']
      };

      for (const [category, patterns] of Object.entries(categoryPatterns)) {
        if (patterns.some(pattern => text.includes(pattern))) {
          categories.add(category);
        }
      }
    }
    
    return Array.from(categories);
  }

  private calculateClassificationConfidence(
    mediaFile: MediaFile,
    textContent?: TextExtractionResult,
    documentType?: string,
    contentType?: ContentType
  ): number {
    let confidence = 0.5; // Base confidence

    // Filename confidence boost
    const filename = mediaFile.originalName.toLowerCase();
    if (documentType && filename.includes(documentType)) {
      confidence += 0.2;
    }

    // Content length confidence
    if (textContent?.fullText) {
      const textLength = textContent.fullText.length;
      if (textLength > 1000) confidence += 0.2;
      if (textLength > 5000) confidence += 0.1;
    }

    // Format confidence
    const format = this.getDocumentFormat(mediaFile.mimeType);
    if (format !== 'Unknown') {
      confidence += 0.1;
    }

    return Math.min(confidence, 1);
  }

  private extractFilenameCategories(filename: string): string[] {
    const categories: string[] = [];
    
    const patterns: Record<string, string[]> = {
      'draft': ['draft', 'temp', 'temporary'],
      'final': ['final', 'complete', 'finished'],
      'version': ['v1', 'v2', 'version', 'revision'],
      'backup': ['backup', 'copy', 'duplicate'],
      'template': ['template', 'sample', 'example']
    };

    for (const [category, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => filename.includes(keyword))) {
        categories.push(category);
      }
    }

    return categories;
  }

  private analyzeContentForCategories(text: string): {
    categories: string[];
    tags: string[];
    topicDistribution: Record<string, number>;
  } {
    const categories: string[] = [];
    const tags: string[] = [];
    const topicDistribution: Record<string, number> = {};

    const lowerText = text.toLowerCase();

    // Simple topic detection based on word frequency
    const words = lowerText.split(/\s+/).filter(word => word.length > 3);
    const wordFreq: Record<string, number> = {};
    
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Extract high-frequency words as topics
    const sortedWords = Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    sortedWords.forEach(([word, freq]) => {
      if (freq > 2) {
        tags.push(word);
        topicDistribution[word] = freq / words.length;
      }
    });

    // Add length-based categories
    if (text.length > 10000) categories.push('long_form');
    if (text.length < 1000) categories.push('short_form');

    return { categories, tags, topicDistribution };
  }
}
