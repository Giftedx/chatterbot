/**
 * Unified Cache Service
 * 
 * Consolidates caching functionality from multiple services into a single,
 * comprehensive caching solution with intelligent expiration, size management,
 * and performance optimization.
 */

import { logger } from '../../utils/logger.js';

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number;
  accessCount: number;
  lastAccessed: Date;
  size?: number;
}

export interface CacheOptions {
  ttl?: number;
  maxSize?: number;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  memoryUsage: string;
  oldestEntry: Date | null;
  mostAccessed: string | null;
  categoryCounts: Record<string, number>;
}

/**
 * Unified Cache Service
 * 
 * Replaces:
 * - CacheService (basic caching)
 * - EnhancedCacheService (advanced caching)
 * - Various individual cache implementations
 */
export class UnifiedCacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minute
  private cleanupTimer!: NodeJS.Timeout;
  
  // Performance metrics
  private hits = 0;
  private misses = 0;
  private totalSize = 0;

  constructor() {
    // Start cleanup interval
    this.cleanupTimer = setInterval(() => this.performCleanup(), this.CLEANUP_INTERVAL);
    this.cleanupTimer.unref();
    
    logger.info('Unified Cache Service initialized', {
      operation: 'cache-init',
      metadata: {
        defaultTtl: this.DEFAULT_TTL,
        maxSize: this.MAX_CACHE_SIZE,
        cleanupInterval: this.CLEANUP_INTERVAL
      }
    });
  }

  /**
   * Store data in cache with intelligent key generation and options
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.DEFAULT_TTL;
    const size = this.estimateSize(data);
    
    // Check cache size limits
    if (this.cache.size >= (options.maxSize || this.MAX_CACHE_SIZE)) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: new Date(),
      ttl,
      accessCount: 0,
      lastAccessed: new Date(),
      size
    };

    this.cache.set(key, entry as CacheEntry<unknown>);
    this.totalSize += size;

    logger.debug('Cache entry stored', {
      operation: 'cache-set',
      metadata: {
        key: this.sanitizeKey(key),
        size,
        ttl,
        category: options.category,
        totalEntries: this.cache.size
      }
    });
  }

  /**
   * Retrieve data from cache with automatic TTL validation
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check TTL
    const now = Date.now();
    const age = now - entry.timestamp.getTime();
    
    if (age > entry.ttl) {
      this.delete(key);
      this.misses++;
      return null;
    }

    // Update access metrics
    entry.accessCount++;
    entry.lastAccessed = new Date();
    this.hits++;

    logger.debug('Cache entry retrieved', {
      operation: 'cache-get',
      metadata: {
        key: this.sanitizeKey(key),
        age,
        accessCount: entry.accessCount,
        hitRate: this.getHitRate()
      }
    });

    return entry.data;
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp.getTime();
    if (age > entry.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.totalSize -= entry.size || 0;
      this.cache.delete(key);
      
      logger.debug('Cache entry deleted', {
        operation: 'cache-delete',
        metadata: {
          key: this.sanitizeKey(key),
          remainingEntries: this.cache.size
        }
      });
      
      return true;
    }
    return false;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const entryCount = this.cache.size;
    this.cache.clear();
    this.totalSize = 0;
    this.hits = 0;
    this.misses = 0;

    logger.info('Cache cleared', {
      operation: 'cache-clear',
      metadata: { entriesCleared: entryCount }
    });
  }

  /**
   * Generate cache key for MCP tool results
   */
  generateMCPKey(tool: string, params: Record<string, unknown>): string {
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    return `mcp:${tool}:${this.hashString(paramString)}`;
  }

  /**
   * Generate cache key for AI responses
   */
  generateResponseKey(content: string, userId: string, context?: Record<string, unknown>): string {
    const contextString = context ? JSON.stringify(context, Object.keys(context).sort()) : '';
    const combined = `${content}:${userId}:${contextString}`;
    return `response:${this.hashString(combined)}`;
  }

  /**
   * Generate cache key for user data
   */
  generateUserKey(userId: string, dataType: string): string {
    return `user:${userId}:${dataType}`;
  }

  /**
   * Generate cache key for conversation context
   */
  generateConversationKey(channelId: string, messageCount: number = 10): string {
    return `conversation:${channelId}:${messageCount}`;
  }

  /**
   * Cache MCP tool results with intelligent TTL based on tool type
   */
  cacheMCPResult(tool: string, params: Record<string, unknown>, result: unknown): void {
    const key = this.generateMCPKey(tool, params);
    const ttl = this.getMCPToolTTL(tool);
    
    this.set(key, result, {
      ttl,
      category: 'mcp',
      priority: this.getMCPToolPriority(tool)
    });
  }

  /**
   * Cache AI response with user-specific TTL
   */
  cacheResponse(content: string, userId: string, response: string, context?: Record<string, unknown>): void {
    const key = this.generateResponseKey(content, userId, context);
    
    this.set(key, response, {
      ttl: this.getResponseTTL(content),
      category: 'response',
      priority: 'medium'
    });
  }

  /**
   * Cache user data with long TTL
   */
  cacheUserData(userId: string, dataType: string, data: unknown): void {
    const key = this.generateUserKey(userId, dataType);
    
    this.set(key, data, {
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      category: 'user',
      priority: 'high'
    });
  }

  /**
   * Get cached MCP result
   */
  getCachedMCPResult<T>(tool: string, params: Record<string, unknown>): T | null {
    const key = this.generateMCPKey(tool, params);
    return this.get<T>(key);
  }

  /**
   * Get cached response
   */
  getCachedResponse(content: string, userId: string, context?: Record<string, unknown>): string | null {
    const key = this.generateResponseKey(content, userId, context);
    return this.get<string>(key);
  }

  /**
   * Get cached user data
   */
  getCachedUserData<T>(userId: string, dataType: string): T | null {
    const key = this.generateUserKey(userId, dataType);
    return this.get<T>(key);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.entries());
    const categoryCounts: Record<string, number> = {};
    let oldestEntry: Date | null = null;
    let mostAccessed: string | null = null;
    let maxAccessCount = 0;

    for (const [key, entry] of entries) {
      // Track categories
      const category = this.extractCategory(key);
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      
      // Find oldest entry
      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      
      // Find most accessed
      if (entry.accessCount > maxAccessCount) {
        maxAccessCount = entry.accessCount;
        mostAccessed = this.sanitizeKey(key);
      }
    }

    return {
      totalEntries: this.cache.size,
      totalSize: this.totalSize,
      hitRate: this.getHitRate(),
      memoryUsage: this.formatBytes(this.totalSize),
      oldestEntry,
      mostAccessed,
      categoryCounts
    };
  }

  /**
   * Perform cleanup of expired and least-used entries
   */
  private performCleanup(): void {
    const now = Date.now();
    let expiredCount = 0;
    const entriesToDelete: string[] = [];

    // Find expired entries
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp.getTime();
      if (age > entry.ttl) {
        entriesToDelete.push(key);
      }
    }

    // Delete expired entries
    for (const key of entriesToDelete) {
      this.delete(key);
      expiredCount++;
    }

    // If still over size limit, evict least recently used
    while (this.cache.size > this.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    if (expiredCount > 0) {
      logger.debug('Cache cleanup performed', {
        operation: 'cache-cleanup',
        metadata: {
          expiredEntries: expiredCount,
          remainingEntries: this.cache.size,
          totalSize: this.totalSize
        }
      });
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLeastRecentlyUsed(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed.getTime() < lruTime) {
        lruTime = entry.lastAccessed.getTime();
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
    }
  }

  /**
   * Estimate size of data for cache management
   */
  private estimateSize(data: unknown): number {
    try {
      if (typeof data === 'string') {
        return data.length;
      } else if (typeof data === 'number') {
        return 8; // Approximate size of a number in bytes
      } else if (Array.isArray(data)) {
        return data.length * 10; // Estimate 10 bytes per element
      } else if (typeof data === 'object' && data !== null) {
        return Object.keys(data).length * 20; // Estimate 20 bytes per key-value pair
      } else {
        return 100; // Default estimate for other types
      }
    } catch {
      return 1000; // Default estimate for non-serializable data
    }
  }

  /**
   * Generate hash for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get TTL for MCP tools based on tool type
   */
  private getMCPToolTTL(tool: string): number {
    const toolTTLs: Record<string, number> = {
      'memory-search': 10 * 60 * 1000, // 10 minutes
      'web-search': 5 * 60 * 1000,     // 5 minutes
      'content-extraction': 30 * 60 * 1000, // 30 minutes
      'sequential-thinking': 60 * 60 * 1000, // 1 hour
      'browser-automation': 15 * 60 * 1000,  // 15 minutes
    };
    
    return toolTTLs[tool] || this.DEFAULT_TTL;
  }

  /**
   * Get priority for MCP tools
   */
  private getMCPToolPriority(tool: string): CacheOptions['priority'] {
    const toolPriorities: Record<string, CacheOptions['priority']> = {
      'memory-search': 'high',
      'web-search': 'medium',
      'content-extraction': 'medium',
      'sequential-thinking': 'low',
      'browser-automation': 'low',
    };
    
    return toolPriorities[tool] || 'medium';
  }

  /**
   * Get TTL for responses based on content type
   */
  private getResponseTTL(content: string): number {
    const lower = content.toLowerCase();
    
    // Real-time queries need shorter TTL
    if (lower.includes('current') || lower.includes('now') || lower.includes('today')) {
      return 2 * 60 * 1000; // 2 minutes
    }
    
    // Factual queries can be cached longer
    if (lower.includes('what is') || lower.includes('how to') || lower.includes('explain')) {
      return 30 * 60 * 1000; // 30 minutes
    }
    
    return this.DEFAULT_TTL;
  }

  /**
   * Extract category from cache key
   */
  private extractCategory(key: string): string {
    const parts = key.split(':');
    return parts[0] || 'unknown';
  }

  /**
   * Sanitize key for logging (remove sensitive data)
   */
  private sanitizeKey(key: string): string {
    // Replace user IDs and other potentially sensitive data with placeholders
    return key.replace(/user:[^:]+/g, 'user:***')
              .replace(/[a-f0-9]{24,}/g, '***'); // Replace long hex strings (likely IDs)
  }

  /**
   * Calculate hit rate
   */
  private getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  /**
   * Format bytes for human-readable display
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Cleanup method for graceful shutdown
   */
  cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    logger.info('Unified Cache Service cleaned up', {
      operation: 'cache-cleanup',
      metadata: {
        finalStats: this.getStats()
      }
    });
  }
}

// Export singleton instance
export const unifiedCacheService = new UnifiedCacheService();
