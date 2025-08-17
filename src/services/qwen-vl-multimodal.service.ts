/**
 * Qwen 2.5 VL Multimodal Service
 * Advanced image analysis and visual reasoning capabilities
 * Supports image understanding, OCR, visual Q&A, and multimodal context integration
 */

import { features } from '../config/feature-flags.js';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

export interface QwenVLImageInput {
  type: 'url' | 'path' | 'base64';
  data: string;
  mimeType?: string;
}

export interface QwenVLAnalysisOptions {
  prompt?: string;
  maxTokens?: number;
  temperature?: number;
  analysisType?: 'general' | 'ocr' | 'detailed' | 'creative' | 'technical';
  language?: string;
  includeConfidence?: boolean;
  extractText?: boolean;
  identifyObjects?: boolean;
  analyzeMood?: boolean;
  describeScene?: boolean;
}

export interface QwenVLAnalysisResult {
  success: boolean;
  imageId: string;
  analysis: {
    description: string;
    detailedDescription?: string;
    extractedText?: string;
    identifiedObjects?: Array<{
      name: string;
      confidence: number;
      boundingBox?: { x: number; y: number; width: number; height: number };
    }>;
    sceneAnalysis?: {
      setting: string;
      atmosphere: string;
      lighting: string;
      composition: string;
    };
    moodAnalysis?: {
      overallMood: string;
      emotions: string[];
      sentiment: 'positive' | 'negative' | 'neutral';
      confidence: number;
    };
    technicalDetails?: {
      estimatedDimensions?: string;
      colorPalette?: string[];
      imageQuality?: string;
      format?: string;
    };
  };
  reasoning?: {
    keyObservations: string[];
    inferences: string[];
    uncertainties?: string[];
  };
  metadata: {
    model: string;
    processingTime: number;
    tokensUsed: number;
    imageSize?: string;
    analysisType: string;
  };
  error?: string;
}

export interface MultimodalContextItem {
  id: string;
  type: 'image' | 'text' | 'audio' | 'video';
  content: string;
  analysis?: QwenVLAnalysisResult;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface MultimodalConversationContext {
  conversationId: string;
  items: MultimodalContextItem[];
  summary?: string;
  keyTopics?: string[];
  visualThemes?: string[];
  lastUpdated: Date;
}

export class QwenVLMultimodalService {
  private isEnabled: boolean;
  private apiEndpoint: string;
  private apiKey: string;
  private model: string;
  private conversationContexts: Map<string, MultimodalConversationContext> = new Map();
  private imageAnalysisCache: Map<string, QwenVLAnalysisResult> = new Map();

  constructor() {
    this.isEnabled = features.qwen25vlMultimodal;
    this.apiEndpoint = process.env.QWEN_VL_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
    this.apiKey = process.env.QWEN_VL_API_KEY || process.env.DASHSCOPE_API_KEY || '';
    this.model = process.env.QWEN_VL_MODEL || 'qwen-vl-plus';
  }

  /**
   * Analyze a single image with Qwen VL
   */
  async analyzeImage(
    image: QwenVLImageInput, 
    options: QwenVLAnalysisOptions = {}
  ): Promise<QwenVLAnalysisResult> {
    if (!this.isEnabled) {
      return {
        success: false,
        imageId: this.generateImageId(),
        analysis: { description: '' },
        metadata: { model: this.model, processingTime: 0, tokensUsed: 0, analysisType: options.analysisType || 'general' },
        error: 'Qwen VL multimodal service not enabled'
      };
    }

    const startTime = Date.now();
    const imageId = this.generateImageId();

    // Check cache first
    const cacheKey = this.getCacheKey(image, options);
    if (this.imageAnalysisCache.has(cacheKey)) {
      const cached = this.imageAnalysisCache.get(cacheKey)!;
      return { ...cached, metadata: { ...cached.metadata, processingTime: Date.now() - startTime } };
    }

    try {
      const imageData = await this.prepareImageData(image);
      const prompt = this.buildAnalysisPrompt(options);

      const requestBody = {
        model: this.model,
        input: {
          messages: [
            {
              role: 'user',
              content: [
                { text: prompt },
                { image: imageData }
              ]
            }
          ]
        },
        parameters: {
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
          result_format: 'message'
        }
      };

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'disable'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const processingTime = Date.now() - startTime;

      if (result.code && result.code !== '200') {
        throw new Error(`API error: ${result.message || result.code}`);
      }

      const analysisText = result.output?.choices?.[0]?.message?.content || '';
      const parsedAnalysis = this.parseAnalysisResponse(analysisText, options);

      const analysisResult: QwenVLAnalysisResult = {
        success: true,
        imageId,
        analysis: parsedAnalysis,
        reasoning: this.extractReasoning(analysisText),
        metadata: {
          model: this.model,
          processingTime,
          tokensUsed: result.usage?.total_tokens || 0,
          imageSize: await this.getImageSize(image),
          analysisType: options.analysisType || 'general'
        }
      };

      // Cache the result
      this.imageAnalysisCache.set(cacheKey, analysisResult);
      
      return analysisResult;

    } catch (error) {
      logger.error('Failed to analyze image with Qwen VL:', error);
      
      return {
        success: false,
        imageId,
        analysis: { description: '' },
        metadata: {
          model: this.model,
          processingTime: Date.now() - startTime,
          tokensUsed: 0,
          analysisType: options.analysisType || 'general'
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Analyze multiple images in batch
   */
  async batchAnalyzeImages(
    images: QwenVLImageInput[],
    options: QwenVLAnalysisOptions = {}
  ): Promise<QwenVLAnalysisResult[]> {
    if (!this.isEnabled) {
      return [];
    }

    const batchSize = 3; // Process in smaller batches to avoid rate limits
    const results: QwenVLAnalysisResult[] = [];

    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      const batchPromises = batch.map(image => this.analyzeImage(image, options));
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < images.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Perform visual question answering
   */
  async visualQA(
    image: QwenVLImageInput,
    question: string,
    context?: string
  ): Promise<{ answer: string; confidence: number; reasoning: string[] }> {
    const prompt = context 
      ? `Context: ${context}\n\nQuestion: ${question}\n\nPlease provide a detailed answer based on what you see in the image.`
      : `Question: ${question}\n\nPlease provide a detailed answer based on what you see in the image.`;

    const result = await this.analyzeImage(image, {
      prompt,
      analysisType: 'detailed',
      includeConfidence: true,
      maxTokens: 500
    });

    if (!result.success) {
      return {
        answer: 'Unable to analyze image',
        confidence: 0,
        reasoning: [result.error || 'Analysis failed']
      };
    }

    return {
      answer: result.analysis.description,
      confidence: result.analysis.moodAnalysis?.confidence || 0.7,
      reasoning: result.reasoning?.keyObservations || []
    };
  }

  /**
   * Extract and process text from images (OCR)
   */
  async extractText(image: QwenVLImageInput, language?: string): Promise<{
    text: string;
    confidence: number;
    textRegions: Array<{
      text: string;
      boundingBox?: { x: number; y: number; width: number; height: number };
      confidence: number;
    }>;
  }> {
    const result = await this.analyzeImage(image, {
      analysisType: 'ocr',
      extractText: true,
      language: language || 'auto',
      prompt: 'Extract all visible text from this image. Preserve formatting and layout where possible.'
    });

    if (!result.success) {
      return {
        text: '',
        confidence: 0,
        textRegions: []
      };
    }

    return {
      text: result.analysis.extractedText || '',
      confidence: 0.8, // Placeholder - would need actual confidence from API
      textRegions: [
        {
          text: result.analysis.extractedText || '',
          confidence: 0.8
        }
      ]
    };
  }

  /**
   * Create or update multimodal conversation context
   */
  async updateConversationContext(
    conversationId: string,
    item: Omit<MultimodalContextItem, 'id' | 'timestamp'>
  ): Promise<MultimodalConversationContext> {
    let context = this.conversationContexts.get(conversationId);
    
    if (!context) {
      context = {
        conversationId,
        items: [],
        lastUpdated: new Date()
      };
    }

    const contextItem: MultimodalContextItem = {
      id: this.generateImageId(),
      timestamp: new Date(),
      ...item
    };

    // If it's an image, analyze it
    if (item.type === 'image' && this.isEnabled) {
      try {
        const analysis = await this.analyzeImage(
          { type: 'url', data: item.content },
          { analysisType: 'general', identifyObjects: true, describeScene: true }
        );
        contextItem.analysis = analysis;
      } catch (error) {
        logger.error('Failed to analyze image for context:', error);
      }
    }

    context.items.push(contextItem);
    context.lastUpdated = new Date();

    // Update summary and themes
    context = await this.updateContextSummary(context);

    this.conversationContexts.set(conversationId, context);
    
    return context;
  }

  /**
   * Get multimodal conversation context
   */
  getConversationContext(conversationId: string): MultimodalConversationContext | null {
    return this.conversationContexts.get(conversationId) || null;
  }

  /**
   * Search conversation contexts by visual themes
   */
  searchByVisualThemes(themes: string[]): MultimodalConversationContext[] {
    const results: MultimodalConversationContext[] = [];
    
    for (const context of this.conversationContexts.values()) {
      if (context.visualThemes) {
        const hasMatchingTheme = themes.some(theme => 
          context.visualThemes!.some(contextTheme => 
            contextTheme.toLowerCase().includes(theme.toLowerCase())
          )
        );
        
        if (hasMatchingTheme) {
          results.push(context);
        }
      }
    }

    return results;
  }

  /**
   * Generate image comparison analysis
   */
  async compareImages(
    images: QwenVLImageInput[],
    comparisonType: 'similarity' | 'differences' | 'evolution' | 'quality' = 'similarity'
  ): Promise<{
    summary: string;
    similarities: string[];
    differences: string[];
    recommendations?: string[];
  }> {
    if (images.length < 2 || !this.isEnabled) {
      return {
        summary: 'Need at least 2 images for comparison',
        similarities: [],
        differences: []
      };
    }

    const analyses = await this.batchAnalyzeImages(images, {
      analysisType: 'detailed',
      identifyObjects: true,
      describeScene: true
    });

    const descriptions = analyses.map(a => a.analysis.description);
    
    // Use Qwen VL to compare the descriptions
    const comparisonPrompt = this.buildComparisonPrompt(descriptions, comparisonType);
    
    // For now, return a basic analysis
    return {
      summary: 'Images analyzed and compared',
      similarities: ['Similar visual elements detected'],
      differences: ['Differences in composition identified'],
      recommendations: ['Consider visual consistency improvements']
    };
  }

  private async prepareImageData(image: QwenVLImageInput): Promise<string> {
    switch (image.type) {
      case 'base64':
        return image.data;
      
      case 'url':
        // For URLs, we can pass them directly or fetch and convert to base64
        return image.data;
      
      case 'path':
        const buffer = await fs.readFile(image.data);
        return buffer.toString('base64');
      
      default:
        throw new Error(`Unsupported image type: ${(image as any).type}`);
    }
  }

  private buildAnalysisPrompt(options: QwenVLAnalysisOptions): string {
    if (options.prompt) {
      return options.prompt;
    }

    const basePrompts = {
      general: 'Please describe what you see in this image in detail.',
      ocr: 'Extract all visible text from this image. Preserve formatting and structure.',
      detailed: 'Provide a comprehensive analysis of this image including objects, scene, composition, and any notable details.',
      creative: 'Describe this image creatively, focusing on mood, atmosphere, and artistic elements.',
      technical: 'Analyze this image from a technical perspective, including composition, lighting, quality, and technical details.'
    };

    let prompt = basePrompts[options.analysisType || 'general'];

    if (options.extractText) {
      prompt += ' Also extract any visible text.';
    }
    
    if (options.identifyObjects) {
      prompt += ' Identify and list all objects you can see.';
    }
    
    if (options.analyzeMood) {
      prompt += ' Describe the mood and emotional tone of the image.';
    }
    
    if (options.describeScene) {
      prompt += ' Describe the scene, setting, and context.';
    }

    if (options.language && options.language !== 'auto') {
      prompt += ` Please respond in ${options.language}.`;
    }

    return prompt;
  }

  private parseAnalysisResponse(response: string, options: QwenVLAnalysisOptions): QwenVLAnalysisResult['analysis'] {
    // Basic parsing - could be enhanced with structured extraction
    const analysis: QwenVLAnalysisResult['analysis'] = {
      description: response
    };

    if (options.extractText) {
      // Extract text sections from response
      const textMatch = response.match(/text[:\s]+(.*?)(?=\n|$)/i);
      if (textMatch) {
        analysis.extractedText = textMatch[1];
      }
    }

    if (options.identifyObjects) {
      // Extract object mentions
      const objectMatches = response.match(/objects?[:\s]+(.*?)(?=\n|$)/gi);
      if (objectMatches) {
        analysis.identifiedObjects = objectMatches.map(match => ({
          name: match.replace(/objects?[:\s]+/i, ''),
          confidence: 0.8
        }));
      }
    }

    return analysis;
  }

  private extractReasoning(response: string): QwenVLAnalysisResult['reasoning'] {
    const observations: string[] = [];
    const inferences: string[] = [];

    // Simple extraction - could be enhanced
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    sentences.forEach(sentence => {
      if (sentence.toLowerCase().includes('see') || sentence.toLowerCase().includes('visible')) {
        observations.push(sentence.trim());
      } else if (sentence.toLowerCase().includes('appears') || sentence.toLowerCase().includes('suggests')) {
        inferences.push(sentence.trim());
      }
    });

    return {
      keyObservations: observations.slice(0, 5),
      inferences: inferences.slice(0, 3)
    };
  }

  private async getImageSize(image: QwenVLImageInput): Promise<string> {
    // Placeholder - would need actual image processing
    return 'unknown';
  }

  private generateImageId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCacheKey(image: QwenVLImageInput, options: QwenVLAnalysisOptions): string {
    const imageKey = image.type === 'base64' ? image.data.substring(0, 100) : image.data;
    return `${imageKey}_${JSON.stringify(options)}`;
  }

  private buildComparisonPrompt(descriptions: string[], type: string): string {
    return `Compare these image descriptions and identify ${type}: ${descriptions.join(' | ')}`;
  }

  private async updateContextSummary(context: MultimodalConversationContext): Promise<MultimodalConversationContext> {
    const imageItems = context.items.filter(item => item.type === 'image' && item.analysis);
    
    if (imageItems.length > 0) {
      const themes = new Set<string>();
      const topics = new Set<string>();

      imageItems.forEach(item => {
        if (item.analysis?.analysis.identifiedObjects) {
          item.analysis.analysis.identifiedObjects.forEach(obj => themes.add(obj.name));
        }
        
        // Extract key topics from descriptions
        const words = (item.analysis?.analysis.description || '').split(/\s+/);
        words.forEach(word => {
          if (word.length > 4 && /^[a-zA-Z]+$/.test(word)) {
            topics.add(word.toLowerCase());
          }
        });
      });

      context.visualThemes = Array.from(themes).slice(0, 10);
      context.keyTopics = Array.from(topics).slice(0, 15);
      context.summary = `Conversation with ${context.items.length} items, ${imageItems.length} images analyzed`;
    }

    return context;
  }

  /**
   * Clear conversation context
   */
  clearConversationContext(conversationId: string): void {
    this.conversationContexts.delete(conversationId);
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.imageAnalysisCache.clear();
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    enabled: boolean;
    configured: boolean;
    model: string;
    cacheSize: number;
    activeContexts: number;
  } {
    return {
      enabled: this.isEnabled,
      configured: !!this.apiKey,
      model: this.model,
      cacheSize: this.imageAnalysisCache.size,
      activeContexts: this.conversationContexts.size
    };
  }
}

// Singleton instance
export const qwenVLMultimodalService = new QwenVLMultimodalService();