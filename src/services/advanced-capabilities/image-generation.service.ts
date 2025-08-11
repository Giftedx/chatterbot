/**
 * Image Generation Service
 * 
 * Integrates with multiple image generation APIs to create images from text descriptions.
 * Provides fallback options and caching for reliable image generation.
 */

import { Attachment } from 'discord.js';
import { logger } from '../../utils/logger.js';
import axios from 'axios';

export interface ImageGenerationRequest {
  prompt: string;
  style: string;
  size: string;
  quality?: 'standard' | 'hd';
  model?: string;
  userId: string;
  safetyFilter?: boolean;
}

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  imageBuffer?: Buffer;
  metadata: {
    prompt: string;
    style: string;
    model: string;
    generationTime: number;
    cost?: number;
  };
  error?: string;
}

export interface ImageProvider {
  name: string;
  available: boolean;
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
}

export class ImageGenerationService {
  private providers: ImageProvider[] = [];
  private cache = new Map<string, ImageGenerationResult>();
  private rateLimits = new Map<string, { count: number; resetTime: number }>();

  constructor() {
    this.initializeProviders();
    logger.info('Image Generation Service initialized with providers:', { 
      providers: this.providers.filter(p => p.available).map(p => p.name)
    });
  }

  private initializeProviders(): void {
    // Initialize OpenAI DALL-E provider
    if (process.env.OPENAI_API_KEY) {
      this.providers.push(new OpenAIImageProvider());
    }

    // Initialize Stable Diffusion provider (placeholder for now)
    if (process.env.STABILITY_API_KEY || process.env.ENABLE_LOCAL_SD) {
      this.providers.push(new StableDiffusionProvider());
    }

    // Initialize fallback free provider
    this.providers.push(new FallbackImageProvider());
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(request);
      if (this.cache.has(cacheKey)) {
        logger.debug('Image generation cache hit', { userId: request.userId, prompt: request.prompt });
        return this.cache.get(cacheKey)!;
      }

      // Check rate limits
      if (this.isRateLimited(request.userId)) {
        return {
          success: false,
          metadata: {
            prompt: request.prompt,
            style: request.style,
            model: 'none',
            generationTime: Date.now() - startTime
          },
          error: 'Rate limit exceeded. Please try again later.'
        };
      }

      // Try providers in order of preference
      for (const provider of this.providers.filter(p => p.available)) {
        try {
          logger.debug(`Attempting image generation with ${provider.name}`, {
            userId: request.userId,
            prompt: request.prompt.substring(0, 50)
          });

          const result = await provider.generateImage(request);
          
          if (result.success) {
            // Cache successful result
            this.cache.set(cacheKey, result);
            this.updateRateLimit(request.userId);
            
            logger.info('Image generation successful', {
              provider: provider.name,
              userId: request.userId,
              generationTime: result.metadata.generationTime
            });

            return result;
          }
        } catch (error) {
          logger.warn(`Image generation failed with ${provider.name}`, {
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
          prompt: request.prompt,
          style: request.style,
          model: 'none',
          generationTime: Date.now() - startTime
        },
        error: 'Image generation temporarily unavailable. Please try again later.'
      };

    } catch (error) {
      logger.error('Image generation service error', {
        error: String(error),
        userId: request.userId,
        prompt: request.prompt
      });

      return {
        success: false,
        metadata: {
          prompt: request.prompt,
          style: request.style,
          model: 'error',
          generationTime: Date.now() - startTime
        },
        error: 'An unexpected error occurred during image generation.'
      };
    }
  }

  private getCacheKey(request: ImageGenerationRequest): string {
    return `img_${request.prompt}_${request.style}_${request.size}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  private isRateLimited(userId: string): boolean {
    const limit = this.rateLimits.get(userId);
    if (!limit) return false;
    
    if (Date.now() > limit.resetTime) {
      this.rateLimits.delete(userId);
      return false;
    }
    
    return limit.count >= 10; // 10 images per hour
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

  /**
   * Enhances user prompts with style and quality improvements
   */
  enhancePrompt(prompt: string, style: string): string {
    let enhanced = prompt;

    // Add style-specific enhancements
    switch (style) {
      case 'realistic':
        enhanced += ', photorealistic, high quality, detailed, 8k resolution';
        break;
      case 'artistic':
        enhanced += ', artistic masterpiece, beautiful composition, vibrant colors';
        break;
      case 'cartoon':
        enhanced += ', cartoon style, colorful, fun, animated look';
        break;
      case 'digital':
        enhanced += ', digital art, futuristic, clean lines, modern';
        break;
    }

    // Add quality enhancers
    enhanced += ', professional quality, well-composed';

    return enhanced;
  }

  /**
   * Validates and sanitizes image generation prompts
   */
  validatePrompt(prompt: string): { valid: boolean; sanitized: string; issues?: string[] } {
    const issues: string[] = [];
    let sanitized = prompt.trim();

    // Check length
    if (sanitized.length === 0) {
      return { valid: false, sanitized, issues: ['Prompt cannot be empty'] };
    }

    if (sanitized.length > 1000) {
      sanitized = sanitized.substring(0, 1000);
      issues.push('Prompt truncated to 1000 characters');
    }

    // Basic content filtering
    const inappropriateKeywords = [
      'nsfw', 'explicit', 'nude', 'sexual', 'violent', 'gore', 'disturbing'
    ];

    for (const keyword of inappropriateKeywords) {
      if (sanitized.toLowerCase().includes(keyword)) {
        issues.push(`Inappropriate content detected: ${keyword}`);
        return { valid: false, sanitized, issues };
      }
    }

    return { valid: true, sanitized, issues: issues.length > 0 ? issues : undefined };
  }
}

// OpenAI DALL-E Provider
class OpenAIImageProvider implements ImageProvider {
  name = 'OpenAI DALL-E';
  available = !!process.env.OPENAI_API_KEY;

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          prompt: request.prompt,
          n: 1,
          size: request.size || '1024x1024',
          quality: request.quality || 'standard',
          model: request.model || 'dall-e-3'
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 second timeout
        }
      );

      const imageUrl = response.data.data[0].url;

      return {
        success: true,
        imageUrl,
        metadata: {
          prompt: request.prompt,
          style: request.style,
          model: 'dall-e-3',
          generationTime: Date.now() - startTime,
          cost: 0.04 // Approximate cost per image
        }
      };
    } catch (error: any) {
      throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

// Stable Diffusion Provider (placeholder)
class StableDiffusionProvider implements ImageProvider {
  name = 'Stable Diffusion';
  available = !!process.env.STABILITY_API_KEY || !!process.env.ENABLE_LOCAL_SD;

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    // This is a placeholder implementation
    // In a real implementation, you would integrate with:
    // - Stability AI API
    // - Local Stable Diffusion installation
    // - Hugging Face Inference API
    
    if (process.env.STABILITY_API_KEY) {
      // Implement Stability AI API integration
      throw new Error('Stability AI integration not yet implemented');
    }

    if (process.env.ENABLE_LOCAL_SD) {
      // Implement local Stable Diffusion integration
      throw new Error('Local Stable Diffusion integration not yet implemented');
    }

    throw new Error('No Stable Diffusion provider configured');
  }
}

// Fallback Provider (uses placeholder images for development)
class FallbackImageProvider implements ImageProvider {
  name = 'Fallback Generator';
  available = true;

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      // Generate a placeholder image URL based on the prompt
      const width = 1024;
      const height = 1024;
      const text = encodeURIComponent(request.prompt.substring(0, 50));
      
      // Use a placeholder service or generate a simple colored image
      const imageUrl = `https://via.placeholder.com/${width}x${height}/4a90e2/ffffff?text=${text}`;

      return {
        success: true,
        imageUrl,
        metadata: {
          prompt: request.prompt,
          style: request.style,
          model: 'fallback',
          generationTime: Date.now() - startTime,
          cost: 0
        }
      };
    } catch (error) {
      throw new Error(`Fallback provider error: ${String(error)}`);
    }
  }
}