/**
 * Intelligent Cache Key Generator
 * Generates optimized cache keys with content normalization and conflict prevention
 */

import { createHash } from 'crypto';
import { Logger } from './logger.js';
import { ValidationError } from './errors.js';

export interface CacheableContent {
  type: 'text' | 'multimodal';
  text: string;
  images?: string[]; // Base64 encoded images
  metadata?: Record<string, unknown>;
}

export interface CacheKeyOptions {
  includeMetadata: boolean;
  maxKeyLength: number;
  sensitiveFields: string[];
}

/**
 * Generates intelligent cache keys with content normalization
 */
export class CacheKeyGenerator {
  private static readonly DEFAULT_OPTIONS: CacheKeyOptions = {
    includeMetadata: true,
    maxKeyLength: 250, // Safe for most systems
    sensitiveFields: ['userId', 'token', 'sessionId']
  };

  private logger: Logger;

  constructor(private options: CacheKeyOptions = CacheKeyGenerator.DEFAULT_OPTIONS) {
    this.logger = Logger.getInstance();
  }

  /**
   * Generate cache key for content
   */
  generateKey(
    content: CacheableContent,
    context?: Record<string, unknown>
  ): string {
    try {
      const components: string[] = [];
      
      // Add content type
      components.push(content.type);
      
      // Add normalized text content
      const normalizedText = this.normalizeText(content.text);
      components.push(this.hashContent(normalizedText));
      
      // Add image content if present
      if (content.images && content.images.length > 0) {
        const imageHash = this.hashImages(content.images);
        components.push(imageHash);
      }
      
      // Add metadata if enabled and present
      if (this.options.includeMetadata && content.metadata) {
        const metadataHash = this.hashMetadata(content.metadata);
        components.push(metadataHash);
      }
      
      // Add context if provided
      if (context) {
        const contextHash = this.hashContext(context);
        components.push(contextHash);
      }
      
      // Combine components
      const rawKey = components.join(':');
      const finalKey = this.enforceKeyLength(rawKey);
      
      this.logger.debug('Generated cache key', {
        operation: 'cache-key-generation',
        metadata: {
          contentType: content.type,
          hasImages: !!content.images?.length,
          hasMetadata: !!content.metadata,
          hasContext: !!context,
          keyLength: finalKey.length
        }
      });
      
      return finalKey;
    } catch (error) {
      this.logger.error('Cache key generation failed', {
        operation: 'cache-key-generation',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      throw new ValidationError('Failed to generate cache key');
    }
  }

  /**
   * Generate key specifically for text content
   */
  generateTextKey(
    text: string,
    context?: Record<string, unknown>
  ): string {
    const content: CacheableContent = {
      type: 'text',
      text
    };
    
    return this.generateKey(content, context);
  }

  /**
   * Generate key for multimodal content
   */
  generateMultimodalKey(
    text: string,
    images: string[],
    metadata?: Record<string, unknown>,
    context?: Record<string, unknown>
  ): string {
    const content: CacheableContent = {
      type: 'multimodal',
      text,
      images,
      metadata
    };
    
    return this.generateKey(content, context);
  }

  /**
   * Normalize text content for consistent caching
   */
  private normalizeText(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s]/g, '') // Remove special characters for key generation
      .substring(0, 1000); // Limit length for hashing
  }

  /**
   * Hash text content for key generation
   */
  private hashContent(content: string): string {
    return createHash('md5')
      .update(content, 'utf8')
      .digest('hex')
      .substring(0, 16); // Use first 16 characters
  }

  /**
   * Hash image content for key generation
   */
  private hashImages(images: string[]): string {
    const imageHashes = images.map(image => {
      // Hash first 1000 characters of base64 data
      const imageData = image.substring(0, 1000);
      return createHash('md5')
        .update(imageData, 'utf8')
        .digest('hex')
        .substring(0, 8);
    });
    
    return `img:${imageHashes.join('+')}`;
  }

  /**
   * Hash metadata for key generation (excluding sensitive fields)
   */
  private hashMetadata(metadata: Record<string, unknown>): string {
    const filteredMetadata = this.filterSensitiveFields(metadata);
    const metadataString = JSON.stringify(filteredMetadata, Object.keys(filteredMetadata).sort());
    
    return createHash('md5')
      .update(metadataString, 'utf8')
      .digest('hex')
      .substring(0, 12);
  }

  /**
   * Hash context information for key generation
   */
  private hashContext(context: Record<string, unknown>): string {
    const filteredContext = this.filterSensitiveFields(context);
    const contextString = JSON.stringify(filteredContext, Object.keys(filteredContext).sort());
    
    return createHash('md5')
      .update(contextString, 'utf8')
      .digest('hex')
      .substring(0, 10);
  }

  /**
   * Remove sensitive fields from object before hashing
   */
  private filterSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
    const filtered: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (!this.options.sensitiveFields.includes(key)) {
        // Recursively filter nested objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          filtered[key] = this.filterSensitiveFields(value as Record<string, unknown>);
        } else {
          filtered[key] = value;
        }
      }
    }
    
    return filtered;
  }

  /**
   * Enforce maximum key length
   */
  private enforceKeyLength(key: string): string {
    if (key.length <= this.options.maxKeyLength) {
      return key;
    }
    
    // If key is too long, hash the entire key
    const hash = createHash('sha256')
      .update(key, 'utf8')
      .digest('hex');
    
    // Use first part of original key + hash suffix
    const prefixLength = Math.max(0, this.options.maxKeyLength - 65); // 64 chars for hash + 1 for separator
    const prefix = key.substring(0, prefixLength);
    
    return `${prefix}:${hash}`;
  }

  /**
   * Validate cache key format
   */
  static validateKey(key: string): boolean {
    // Check basic format requirements
    if (!key || key.length === 0 || key.length > 500) {
      return false;
    }
    
    // Check for invalid characters that might cause issues
    const invalidChars = /[<>:"/\\|?*]/;
    const hasControlChars = Array.from(key).some(char => {
      const code = char.charCodeAt(0);
      return code >= 0 && code <= 31;
    });
    
    if (invalidChars.test(key) || hasControlChars) {
      return false;
    }
    
    return true;
  }

  /**
   * Extract content type from cache key
   */
  static extractContentType(key: string): 'text' | 'multimodal' | null {
    const parts = key.split(':');
    if (parts.length > 0) {
      const type = parts[0];
      if (type === 'text' || type === 'multimodal') {
        return type;
      }
    }
    return null;
  }
}

// Default export
export default CacheKeyGenerator;
