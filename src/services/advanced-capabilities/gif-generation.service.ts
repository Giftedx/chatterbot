/**
 * GIF Generation Service
 * 
 * Creates animated GIFs from text descriptions, reactions, and emotions.
 * Supports multiple generation methods including animated sequences and reaction GIFs.
 */

import { logger } from '../../utils/logger.js';
import axios from 'axios';

export interface GifGenerationRequest {
  emotion: string;
  style: 'reaction' | 'animated' | 'custom';
  duration: number;
  prompt?: string;
  userId: string;
  tags?: string[];
}

export interface GifGenerationResult {
  success: boolean;
  gifUrl?: string;
  gifBuffer?: Buffer;
  metadata: {
    emotion: string;
    style: string;
    duration: number;
    generationTime: number;
    source: string;
  };
  error?: string;
}

export interface GifProvider {
  name: string;
  available: boolean;
  generateGif(request: GifGenerationRequest): Promise<GifGenerationResult>;
}

export class GifGenerationService {
  private providers: GifProvider[] = [];
  private cache = new Map<string, GifGenerationResult>();
  private rateLimits = new Map<string, { count: number; resetTime: number }>();

  // Emotion to search term mapping for reaction GIFs
  private emotionKeywords = {
    'happy': ['happy', 'joy', 'smile', 'cheerful', 'excited'],
    'sad': ['sad', 'cry', 'disappointed', 'upset', 'down'],
    'angry': ['angry', 'mad', 'rage', 'frustrated', 'annoyed'],
    'surprised': ['surprised', 'shock', 'wow', 'amazed', 'gasps'],
    'confused': ['confused', 'puzzled', 'thinking', 'wondering', 'lost'],
    'love': ['love', 'heart', 'romantic', 'affection', 'adore'],
    'laugh': ['laugh', 'lol', 'funny', 'hilarious', 'giggle'],
    'dance': ['dance', 'dancing', 'party', 'celebration', 'groove'],
    'thumbs_up': ['thumbs up', 'good job', 'approve', 'yes', 'like'],
    'facepalm': ['facepalm', 'no', 'disapprove', 'embarrassed', 'mistake'],
    'neutral': ['neutral', 'calm', 'peaceful', 'relaxed', 'chill']
  };

  constructor() {
    this.initializeProviders();
    logger.info('GIF Generation Service initialized with providers:', { 
      providers: this.providers.filter(p => p.available).map(p => p.name)
    });
  }

  private initializeProviders(): void {
    // Initialize GIPHY provider
    if (process.env.GIPHY_API_KEY) {
      this.providers.push(new GiphyProvider());
    }

    // Initialize Tenor provider
    if (process.env.TENOR_API_KEY) {
      this.providers.push(new TenorProvider());
    }

    // Initialize custom GIF generator (placeholder)
    if (process.env.ENABLE_CUSTOM_GIF_GENERATION) {
      this.providers.push(new CustomGifProvider());
    }

    // Initialize fallback provider
    this.providers.push(new FallbackGifProvider());
  }

  async generateGif(request: GifGenerationRequest): Promise<GifGenerationResult> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(request);
      if (this.cache.has(cacheKey)) {
        logger.debug('GIF generation cache hit', { userId: request.userId, emotion: request.emotion });
        return this.cache.get(cacheKey)!;
      }

      // Check rate limits
      if (this.isRateLimited(request.userId)) {
        return {
          success: false,
          metadata: {
            emotion: request.emotion,
            style: request.style,
            duration: request.duration,
            generationTime: Date.now() - startTime,
            source: 'rate_limited'
          },
          error: 'Rate limit exceeded. Please try again later.'
        };
      }

      // Enhance request with better search terms
      const enhancedRequest = this.enhanceRequest(request);

      // Try providers in order of preference
      for (const provider of this.providers.filter(p => p.available)) {
        try {
          logger.debug(`Attempting GIF generation with ${provider.name}`, {
            userId: request.userId,
            emotion: request.emotion,
            style: request.style
          });

          const result = await provider.generateGif(enhancedRequest);
          
          if (result.success) {
            // Cache successful result
            this.cache.set(cacheKey, result);
            this.updateRateLimit(request.userId);
            
            logger.info('GIF generation successful', {
              provider: provider.name,
              userId: request.userId,
              emotion: request.emotion,
              generationTime: result.metadata.generationTime
            });

            return result;
          }
        } catch (error) {
          logger.warn(`GIF generation failed with ${provider.name}`, {
            error: String(error),
            userId: request.userId
          });
          continue;
        }
      }

      // All providers failed
      return {
        success: false,
        metadata: {
          emotion: request.emotion,
          style: request.style,
          duration: request.duration,
          generationTime: Date.now() - startTime,
          source: 'failed'
        },
        error: 'GIF generation temporarily unavailable. Please try again later.'
      };

    } catch (error) {
      logger.error('GIF generation service error', {
        error: String(error),
        userId: request.userId,
        emotion: request.emotion
      });

      return {
        success: false,
        metadata: {
          emotion: request.emotion,
          style: request.style,
          duration: request.duration,
          generationTime: Date.now() - startTime,
          source: 'error'
        },
        error: 'An unexpected error occurred during GIF generation.'
      };
    }
  }

  private getCacheKey(request: GifGenerationRequest): string {
    return `gif_${request.emotion}_${request.style}_${request.prompt || 'none'}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  private isRateLimited(userId: string): boolean {
    const limit = this.rateLimits.get(userId);
    if (!limit) return false;
    
    if (Date.now() > limit.resetTime) {
      this.rateLimits.delete(userId);
      return false;
    }
    
    return limit.count >= 15; // 15 GIFs per hour
  }

  private updateRateLimit(userId: string): void {
    const now = Date.now();
    const hourFromNow = now + (60 * 60 * 1000);
    
    const current = this.rateLimits.get(userId);
    if (!current || now > current.resetTime) {
      this.rateLimits.set(userId, { count: 1, resetTime: hourFromNow });
    } else {
      this.rateLimits.set(userId, { count: current.count + 1, resetTime: current.resetTime });
    }
  }

  private enhanceRequest(request: GifGenerationRequest): GifGenerationRequest {
    const enhanced = { ...request };

    // Add relevant keywords for the emotion
    const keywords = this.emotionKeywords[request.emotion as keyof typeof this.emotionKeywords] || [request.emotion];
    enhanced.tags = [...(request.tags || []), ...keywords];

    return enhanced;
  }

  /**
   * Gets appropriate search terms for an emotion
   */
  getEmotionSearchTerms(emotion: string): string[] {
    return this.emotionKeywords[emotion as keyof typeof this.emotionKeywords] || [emotion];
  }

  /**
   * Validates GIF generation requests
   */
  validateRequest(request: GifGenerationRequest): { valid: boolean; issues?: string[] } {
    const issues: string[] = [];

    if (!request.emotion || request.emotion.trim().length === 0) {
      issues.push('Emotion is required');
    }

    if (request.duration && (request.duration < 1 || request.duration > 10)) {
      issues.push('Duration must be between 1 and 10 seconds');
    }

    if (request.prompt && request.prompt.length > 100) {
      issues.push('Prompt must be less than 100 characters');
    }

    return { valid: issues.length === 0, issues: issues.length > 0 ? issues : undefined };
  }
}

// GIPHY Provider
class GiphyProvider implements GifProvider {
  name = 'GIPHY';
  available = !!process.env.GIPHY_API_KEY;

  async generateGif(request: GifGenerationRequest): Promise<GifGenerationResult> {
    const startTime = Date.now();

    try {
      const searchTerms = request.tags?.slice(0, 3).join(' ') || request.emotion;
      const response = await axios.get('https://api.giphy.com/v1/gifs/search', {
        params: {
          api_key: process.env.GIPHY_API_KEY,
          q: searchTerms,
          limit: 10,
          rating: 'pg-13',
          lang: 'en'
        },
        timeout: 10000
      });

      if (response.data.data && response.data.data.length > 0) {
        // Select a random GIF from the results
        const randomIndex = Math.floor(Math.random() * Math.min(5, response.data.data.length));
        const gif = response.data.data[randomIndex];

        return {
          success: true,
          gifUrl: gif.images.original.url,
          metadata: {
            emotion: request.emotion,
            style: request.style,
            duration: request.duration,
            generationTime: Date.now() - startTime,
            source: 'giphy'
          }
        };
      }

      throw new Error('No GIFs found for the requested emotion');
    } catch (error: any) {
      throw new Error(`GIPHY API error: ${error.response?.data?.message || error.message}`);
    }
  }
}

// Tenor Provider
class TenorProvider implements GifProvider {
  name = 'Tenor';
  available = !!process.env.TENOR_API_KEY;

  async generateGif(request: GifGenerationRequest): Promise<GifGenerationResult> {
    const startTime = Date.now();

    try {
      const searchTerms = request.tags?.slice(0, 3).join(' ') || request.emotion;
      const response = await axios.get('https://api.tenor.com/v1/search', {
        params: {
          key: process.env.TENOR_API_KEY,
          q: searchTerms,
          limit: 10,
          contentfilter: 'medium',
          media_filter: 'minimal'
        },
        timeout: 10000
      });

      if (response.data.results && response.data.results.length > 0) {
        // Select a random GIF from the results
        const randomIndex = Math.floor(Math.random() * Math.min(5, response.data.results.length));
        const gif = response.data.results[randomIndex];

        return {
          success: true,
          gifUrl: gif.media[0].gif.url,
          metadata: {
            emotion: request.emotion,
            style: request.style,
            duration: request.duration,
            generationTime: Date.now() - startTime,
            source: 'tenor'
          }
        };
      }

      throw new Error('No GIFs found for the requested emotion');
    } catch (error: any) {
      throw new Error(`Tenor API error: ${error.response?.data?.error || error.message}`);
    }
  }
}

// Custom GIF Provider (placeholder for future implementation)
class CustomGifProvider implements GifProvider {
  name = 'Custom Generator';
  available = !!process.env.ENABLE_CUSTOM_GIF_GENERATION;

  async generateGif(request: GifGenerationRequest): Promise<GifGenerationResult> {
    const startTime = Date.now();

    // This is a placeholder for custom GIF generation
    // Could integrate with:
    // - FFmpeg for video to GIF conversion
    // - Canvas/WebGL for programmatic GIF creation
    // - AI-based animation services
    
    throw new Error('Custom GIF generation not yet implemented');
  }
}

// Fallback Provider
class FallbackGifProvider implements GifProvider {
  name = 'Fallback';
  available = true;

  // Simple emotion to emoji mapping for fallback
  private emotionEmojis = {
    'happy': '😊',
    'sad': '😢',
    'angry': '😠',
    'surprised': '😲',
    'confused': '🤔',
    'love': '❤️',
    'laugh': '😂',
    'dance': '💃',
    'thumbs_up': '👍',
    'facepalm': '🤦',
    'neutral': '😐'
  };

  async generateGif(request: GifGenerationRequest): Promise<GifGenerationResult> {
    const startTime = Date.now();

    try {
      // Create a simple static image with emoji representation
      const emoji = this.emotionEmojis[request.emotion as keyof typeof this.emotionEmojis] || '🤖';
      const text = `${emoji} ${request.emotion}`;
      
      // Use a placeholder service to create a simple "GIF" (static image)
      const gifUrl = `https://via.placeholder.com/400x300/ff9800/ffffff?text=${encodeURIComponent(text)}`;

      return {
        success: true,
        gifUrl,
        metadata: {
          emotion: request.emotion,
          style: request.style,
          duration: request.duration,
          generationTime: Date.now() - startTime,
          source: 'fallback'
        }
      };
    } catch (error) {
      throw new Error(`Fallback GIF provider error: ${String(error)}`);
    }
  }
}