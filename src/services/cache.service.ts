/**
 * Intelligent Response Caching Service
 * Provides high-performance caching with LRU eviction, TTL management, and metrics tracking
 */

import { Logger } from '../utils/logger.js';
import { ErrorHandler, SystemError } from '../utils/errors.js';

export interface CacheEntry<T = unknown> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Memory size estimate in bytes
}

export interface CacheOptions {
  maxSize: number; // Maximum number of entries
  maxMemory: number; // Maximum memory usage in bytes
  defaultTtl: number; // Default TTL in milliseconds
  enableMetrics: boolean;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  totalRequests: number;
  avgResponseTime: number;
  memoryUsage: number;
  hitRate: number;
}

export interface CacheableContent {
  type: 'text' | 'multimodal';
  text: string;
  images?: string[]; // Base64 encoded images
  metadata?: Record<string, unknown>;
}

/**
 * High-performance LRU cache with TTL support and intelligent memory management
 */
export class CacheService {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = []; // For LRU tracking
  private metrics: CacheMetrics;
  private logger: Logger;

  constructor(private options: CacheOptions) {
    this.logger = Logger.getInstance();
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      avgResponseTime: 0,
      memoryUsage: 0,
      hitRate: 0
    };

    this.logger.info('Cache service initialized', {
      operation: 'cache-init',
      metadata: {
        maxSize: options.maxSize,
        maxMemory: options.maxMemory,
        defaultTtl: options.defaultTtl
      }
    });
  }

  /**
   * Get cached value if it exists and is not expired
   */
  async get<T = CacheableContent>(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      this.metrics.totalRequests++;
      
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.metrics.misses++;
        this.updateMetrics();
        this.logger.debug('Cache miss', { 
          operation: 'cache-get', 
          metadata: { key: this.sanitizeKey(key) }
        });
        return null;
      }

      // Check TTL expiration
      const now = Date.now();
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        this.metrics.misses++;
        this.updateMetrics();
        this.logger.debug('Cache expired', { 
          operation: 'cache-get', 
          metadata: {
            key: this.sanitizeKey(key),
            age: now - entry.timestamp,
            ttl: entry.ttl
          }
        });
        return null;
      }

      // Update access tracking
      entry.accessCount++;
      entry.lastAccessed = now;
      this.updateAccessOrder(key);
      
      this.metrics.hits++;
      this.updateMetrics();
      
      this.logger.debug('Cache hit', { 
        operation: 'cache-get', 
        metadata: {
          key: this.sanitizeKey(key),
          accessCount: entry.accessCount
        }
      });

      return entry.value as T;
    } catch (error) {
      const normalizedError = ErrorHandler.normalize(error);
      this.logger.error('Cache get operation failed', {
        operation: 'cache-get',
        metadata: { error: normalizedError.message }
      });
      
      // Return null on error to allow fallback
      return null;
    } finally {
      const duration = Date.now() - startTime;
      this.metrics.avgResponseTime = this.updateAvgResponseTime(duration);
    }
  }

  /**
   * Set cached value with optional TTL override
   */
  async set<T = CacheableContent>(
    key: string, 
    value: T, 
    ttl?: number
  ): Promise<void> {
    try {
      const now = Date.now();
      const entryTtl = ttl ?? this.options.defaultTtl;
      const size = this.estimateSize(value);
      
      const entry: CacheEntry<T> = {
        value,
        timestamp: now,
        ttl: entryTtl,
        accessCount: 1,
        lastAccessed: now,
        size
      };

      // Check if we need to make space
      await this.ensureCapacity(size);
      
      // Update existing entry or add new one
      if (this.cache.has(key)) {
        const oldEntry = this.cache.get(key)!;
        this.metrics.memoryUsage -= oldEntry.size;
      }
      
      this.cache.set(key, entry);
      this.metrics.memoryUsage += size;
      this.updateAccessOrder(key);
      
      this.logger.debug('Cache set', { 
        operation: 'cache-set', 
        metadata: {
          key: this.sanitizeKey(key),
          size,
          ttl: entryTtl,
          cacheSize: this.cache.size
        }
      });
    } catch (error) {
      const normalizedError = ErrorHandler.normalize(error);
      this.logger.error('Cache set operation failed', {
        operation: 'cache-set',
        metadata: { error: normalizedError.message }
      });
      throw new SystemError('Cache set operation failed', 'medium');
    }
  }

  /**
   * Delete cached entry
   */
  async delete(key: string): Promise<boolean> {
    try {
      const entry = this.cache.get(key);
      if (entry) {
        this.metrics.memoryUsage -= entry.size;
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        
        this.logger.debug('Cache delete', { 
          operation: 'cache-delete', 
          metadata: { key: this.sanitizeKey(key) }
        });
        return true;
      }
      return false;
    } catch (error) {
      const normalizedError = ErrorHandler.normalize(error);
      this.logger.error('Cache delete operation failed', {
        operation: 'cache-delete',
        metadata: { error: normalizedError.message }
      });
      throw new SystemError('Cache delete operation failed', 'medium');
    }
  }

  /**
   * Clear all cached entries
   */
  async clear(): Promise<void> {
    try {
      this.cache.clear();
      this.accessOrder = [];
      this.metrics.memoryUsage = 0;
      
      this.logger.info('Cache cleared', { operation: 'cache-clear' });
    } catch (error) {
      const normalizedError = ErrorHandler.normalize(error);
      this.logger.error('Cache clear operation failed', {
        operation: 'cache-clear',
        metadata: { error: normalizedError.message }
      });
      throw new SystemError('Cache clear operation failed', 'medium');
    }
  }

  /**
   * Get current cache metrics
   */
  getMetrics(): CacheMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get cache status information
   */
  getStatus(): {
    size: number;
    memoryUsage: number;
    memoryUtilization: number;
    sizeUtilization: number;
  } {
    return {
      size: this.cache.size,
      memoryUsage: this.metrics.memoryUsage,
      memoryUtilization: this.metrics.memoryUsage / this.options.maxMemory,
      sizeUtilization: this.cache.size / this.options.maxSize
    };
  }

  /**
   * Ensure cache has capacity for new entry
   */
  private async ensureCapacity(requiredSize: number): Promise<void> {
    // Check memory limit
    while (this.metrics.memoryUsage + requiredSize > this.options.maxMemory && this.cache.size > 0) {
      await this.evictLRU();
    }
    
    // Check size limit
    while (this.cache.size >= this.options.maxSize && this.cache.size > 0) {
      await this.evictLRU();
    }
  }

  /**
   * Evict least recently used entry
   */
  private async evictLRU(): Promise<void> {
    if (this.accessOrder.length === 0) return;
    
    const lruKey = this.accessOrder[0];
    const entry = this.cache.get(lruKey);
    
    if (entry) {
      this.metrics.memoryUsage -= entry.size;
      this.metrics.evictions++;
    }
    
    this.cache.delete(lruKey);
    this.accessOrder.shift();
    
    this.logger.debug('LRU eviction', { 
      operation: 'cache-evict', 
      metadata: {
        key: this.sanitizeKey(lruKey),
        cacheSize: this.cache.size
      }
    });
  }

  /**
   * Update access order for LRU tracking
   */
  private updateAccessOrder(key: string): void {
    // Remove from current position
    this.removeFromAccessOrder(key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order tracking
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Estimate memory size of cached value
   */
  private estimateSize(value: unknown): number {
    try {
      // Rough estimate based on JSON serialization
      const jsonString = JSON.stringify(value);
      return jsonString.length * 2; // Approximate UTF-16 encoding
    } catch {
      // Fallback for non-serializable objects
      return 1024; // 1KB default
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    if (this.metrics.totalRequests > 0) {
      this.metrics.hitRate = this.metrics.hits / this.metrics.totalRequests;
    }
  }

  /**
   * Update average response time
   */
  private updateAvgResponseTime(newTime: number): number {
    const totalTime = (this.metrics.avgResponseTime * (this.metrics.totalRequests - 1)) + newTime;
    return totalTime / this.metrics.totalRequests;
  }

  /**
   * Sanitize cache key for logging (remove sensitive data)
   */
  private sanitizeKey(key: string): string {
    // Show only first 20 characters for privacy
    return key.length > 20 ? `${key.substring(0, 20)}...` : key;
  }
}
