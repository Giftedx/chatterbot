/**
 * Enhanced Semantic Caching Service
 * Provides embeddings-based similarity matching for intelligent caching
 * Supports multiple embedding models and advanced cache strategies
 */

import { createHash } from 'crypto';
import { features } from '../config/feature-flags.js';
import { logger } from '../utils/logger.js';

interface CacheEntry {
  id: string;
  key: string;
  content: any;
  embedding: number[];
  metadata: {
    createdAt: Date;
    accessCount: number;
    lastAccessed: Date;
    ttl: number;
    tags: string[];
    similarity?: number;
  };
}

interface SemanticCacheConfig {
  similarityThreshold: number;
  maxEntries: number;
  defaultTtl: number;
  embeddingModel: string;
  persistToDisk: boolean;
  compressionEnabled: boolean;
}

interface SemanticSearchResult {
  entry: CacheEntry;
  similarity: number;
  isExactMatch: boolean;
}

export class EnhancedSemanticCacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private embeddingCache: Map<string, number[]> = new Map();
  private isEnabled: boolean;
  private config: SemanticCacheConfig;
  private redisClient: any = null; // Will be initialized if Redis is available

  constructor() {
    this.isEnabled = features.semanticCacheEnhanced;
    this.config = this.initializeConfig();
    
    if (this.isEnabled) {
      this.initializeRedis();
      this.startCleanupJob();
      logger.info('Enhanced semantic cache service initialized');
    }
  }

  private initializeConfig(): SemanticCacheConfig {
    return {
      similarityThreshold: parseFloat(process.env.SEMANTIC_CACHE_SIMILARITY_THRESHOLD || '0.85'),
      maxEntries: parseInt(process.env.SEMANTIC_CACHE_MAX_ENTRIES || '500'),
      defaultTtl: parseInt(process.env.SEMANTIC_CACHE_TTL_MS || '3600000'), // 1 hour
      embeddingModel: process.env.SEMANTIC_CACHE_EMBEDDING_MODEL || 'text-embedding-3-small',
      persistToDisk: process.env.SEMANTIC_CACHE_PERSIST === 'true',
      compressionEnabled: process.env.SEMANTIC_CACHE_COMPRESSION === 'true'
    };
  }

  private async initializeRedis(): Promise<void> {
    if (!process.env.REDIS_URL) return;

    try {
      const { createClient } = await import('redis');
      this.redisClient = createClient({ url: process.env.REDIS_URL });
      await this.redisClient.connect();
      logger.info('Semantic cache connected to Redis');
    } catch (error) {
      logger.warn('Failed to connect to Redis for semantic cache:', error);
    }
  }

  /**
   * Generate embeddings for text using multiple strategies
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = createHash('md5').update(text).digest('hex');
    
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    try {
      // Strategy 1: Use OpenAI embeddings if available
      if (process.env.OPENAI_API_KEY) {
        const embedding = await this.generateOpenAIEmbedding(text);
        this.embeddingCache.set(cacheKey, embedding);
        return embedding;
      }

      // Strategy 2: Use local sentence transformers (if available)
      if (process.env.FEATURE_LOCAL_EMBEDDINGS === 'true') {
        const embedding = await this.generateLocalEmbedding(text);
        this.embeddingCache.set(cacheKey, embedding);
        return embedding;
      }

      // Strategy 3: Simple hash-based embedding (fallback)
      const embedding = this.generateHashEmbedding(text);
      this.embeddingCache.set(cacheKey, embedding);
      return embedding;

    } catch (error) {
      logger.error('Failed to generate embedding:', error);
      // Fallback to hash-based embedding
      const embedding = this.generateHashEmbedding(text);
      this.embeddingCache.set(cacheKey, embedding);
      return embedding;
    }
  }

  private async generateOpenAIEmbedding(text: string): Promise<number[]> {
    try {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.embeddings.create({
        model: this.config.embeddingModel,
        input: text,
        encoding_format: 'float'
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('OpenAI embedding generation failed:', error);
      throw error;
    }
  }

  private async generateLocalEmbedding(text: string): Promise<number[]> {
    // This would use a local model like sentence-transformers
    // For now, return a placeholder implementation
    logger.debug('Local embedding generation not implemented, using hash fallback');
    return this.generateHashEmbedding(text);
  }

  private generateHashEmbedding(text: string): number[] {
    // Simple hash-based embedding for fallback
    const hash = createHash('sha256').update(text).digest();
    const embedding: number[] = [];
    
    for (let i = 0; i < 128; i++) { // 128-dimensional embedding
      embedding.push((hash[i % hash.length] - 128) / 128);
    }
    
    return embedding;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Store content in semantic cache
   */
  async set(params: {
    key: string;
    content: any;
    ttl?: number;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const embedding = await this.generateEmbedding(params.key);
      const id = createHash('md5').update(params.key + Date.now()).digest('hex');

      const entry: CacheEntry = {
        id,
        key: params.key,
        content: params.content,
        embedding,
        metadata: {
          createdAt: new Date(),
          accessCount: 0,
          lastAccessed: new Date(),
          ttl: params.ttl || this.config.defaultTtl,
          tags: params.tags || [],
          ...params.metadata
        }
      };

      // Store in memory cache
      this.cache.set(id, entry);

      // Store in Redis if available
      if (this.redisClient) {
        await this.redisClient.setEx(
          `semantic:${id}`,
          Math.floor(entry.metadata.ttl / 1000),
          JSON.stringify(entry)
        );
      }

      // Enforce max entries limit
      if (this.cache.size > this.config.maxEntries) {
        await this.evictOldEntries();
      }

    } catch (error) {
      logger.error('Failed to set semantic cache entry:', error);
    }
  }

  /**
   * Retrieve content from semantic cache using similarity search
   */
  async get(key: string): Promise<SemanticSearchResult | null> {
    if (!this.isEnabled) return null;

    try {
      const queryEmbedding = await this.generateEmbedding(key);
      let bestMatch: SemanticSearchResult | null = null;
      let bestSimilarity = 0;

      // Check exact key match first
      for (const entry of this.cache.values()) {
        if (entry.key === key && this.isEntryValid(entry)) {
          entry.metadata.accessCount++;
          entry.metadata.lastAccessed = new Date();
          return {
            entry,
            similarity: 1.0,
            isExactMatch: true
          };
        }
      }

      // Perform similarity search
      for (const entry of this.cache.values()) {
        if (!this.isEntryValid(entry)) {
          this.cache.delete(entry.id);
          continue;
        }

        const similarity = this.calculateSimilarity(queryEmbedding, entry.embedding);
        
        if (similarity >= this.config.similarityThreshold && similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = {
            entry,
            similarity,
            isExactMatch: false
          };
        }
      }

      if (bestMatch) {
        bestMatch.entry.metadata.accessCount++;
        bestMatch.entry.metadata.lastAccessed = new Date();
        bestMatch.entry.metadata.similarity = bestMatch.similarity;
      }

      return bestMatch;

    } catch (error) {
      logger.error('Failed to get from semantic cache:', error);
      return null;
    }
  }

  /**
   * Search cache entries by tags
   */
  async searchByTags(tags: string[]): Promise<CacheEntry[]> {
    if (!this.isEnabled) return [];

    const results: CacheEntry[] = [];
    
    for (const entry of this.cache.values()) {
      if (!this.isEntryValid(entry)) {
        this.cache.delete(entry.id);
        continue;
      }

      const hasMatchingTag = tags.some(tag => entry.metadata.tags.includes(tag));
      if (hasMatchingTag) {
        results.push(entry);
      }
    }

    return results.sort((a, b) => b.metadata.accessCount - a.metadata.accessCount);
  }

  /**
   * Find similar entries to a given text
   */
  async findSimilar(text: string, limit: number = 5): Promise<SemanticSearchResult[]> {
    if (!this.isEnabled) return [];

    try {
      const queryEmbedding = await this.generateEmbedding(text);
      const results: SemanticSearchResult[] = [];

      for (const entry of this.cache.values()) {
        if (!this.isEntryValid(entry)) {
          this.cache.delete(entry.id);
          continue;
        }

        const similarity = this.calculateSimilarity(queryEmbedding, entry.embedding);
        
        if (similarity >= this.config.similarityThreshold) {
          results.push({
            entry,
            similarity,
            isExactMatch: similarity === 1.0
          });
        }
      }

      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    } catch (error) {
      logger.error('Failed to find similar entries:', error);
      return [];
    }
  }

  /**
   * Invalidate cache entries by pattern or tags
   */
  async invalidate(pattern?: {
    keyPattern?: string;
    tags?: string[];
    olderThan?: Date;
  }): Promise<number> {
    if (!this.isEnabled) return 0;

    let invalidatedCount = 0;
    const toDelete: string[] = [];

    for (const [id, entry] of this.cache.entries()) {
      let shouldInvalidate = false;

      if (pattern?.keyPattern && entry.key.includes(pattern.keyPattern)) {
        shouldInvalidate = true;
      }

      if (pattern?.tags && pattern.tags.some(tag => entry.metadata.tags.includes(tag))) {
        shouldInvalidate = true;
      }

      if (pattern?.olderThan && entry.metadata.createdAt < pattern.olderThan) {
        shouldInvalidate = true;
      }

      if (shouldInvalidate) {
        toDelete.push(id);
        invalidatedCount++;
      }
    }

    for (const id of toDelete) {
      this.cache.delete(id);
      if (this.redisClient) {
        await this.redisClient.del(`semantic:${id}`);
      }
    }

    logger.info(`Invalidated ${invalidatedCount} cache entries`);
    return invalidatedCount;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    hitRate: number;
    averageAccessCount: number;
    memoryUsage: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    if (!this.isEnabled) {
      return {
        totalEntries: 0,
        hitRate: 0,
        averageAccessCount: 0,
        memoryUsage: 0
      };
    }

    const entries = Array.from(this.cache.values());
    const totalAccesses = entries.reduce((sum, entry) => sum + entry.metadata.accessCount, 0);
    
    let oldestEntry: Date | undefined;
    let newestEntry: Date | undefined;
    
    for (const entry of entries) {
      if (!oldestEntry || entry.metadata.createdAt < oldestEntry) {
        oldestEntry = entry.metadata.createdAt;
      }
      if (!newestEntry || entry.metadata.createdAt > newestEntry) {
        newestEntry = entry.metadata.createdAt;
      }
    }

    return {
      totalEntries: this.cache.size,
      hitRate: entries.length > 0 ? totalAccesses / entries.length : 0,
      averageAccessCount: entries.length > 0 ? totalAccesses / entries.length : 0,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry,
      newestEntry
    };
  }

  private isEntryValid(entry: CacheEntry): boolean {
    const now = Date.now();
    const entryAge = now - entry.metadata.createdAt.getTime();
    return entryAge < entry.metadata.ttl;
  }

  private async evictOldEntries(): Promise<void> {
    const entries = Array.from(this.cache.entries());
    
    // Sort by access count (ascending) and age (descending)
    entries.sort(([, a], [, b]) => {
      if (a.metadata.accessCount !== b.metadata.accessCount) {
        return a.metadata.accessCount - b.metadata.accessCount;
      }
      return b.metadata.createdAt.getTime() - a.metadata.createdAt.getTime();
    });

    // Remove 10% of entries
    const toRemove = Math.floor(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      const [id] = entries[i];
      this.cache.delete(id);
      
      if (this.redisClient) {
        await this.redisClient.del(`semantic:${id}`);
      }
    }
  }

  private startCleanupJob(): void {
    // Clean up expired entries every 5 minutes
    setInterval(async () => {
      const now = new Date();
      await this.invalidate({ olderThan: new Date(now.getTime() - this.config.defaultTtl) });
      
      // Clean up embedding cache periodically
      if (this.embeddingCache.size > 1000) {
        this.embeddingCache.clear();
      }
    }, 5 * 60 * 1000);
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      totalSize += JSON.stringify(entry).length;
      totalSize += entry.embedding.length * 8; // 8 bytes per float64
    }
    
    return totalSize;
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    enabled: boolean;
    cacheSize: number;
    redisConnected: boolean;
    embeddingCacheSize: number;
    memoryUsage: number;
  } {
    return {
      enabled: this.isEnabled,
      cacheSize: this.cache.size,
      redisConnected: this.redisClient !== null,
      embeddingCacheSize: this.embeddingCache.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }
}

// Singleton instance
export const enhancedSemanticCache = new EnhancedSemanticCacheService();