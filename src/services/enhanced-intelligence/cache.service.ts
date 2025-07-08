/**
 * Enhanced Intelligence Cache Service
 * Provides intelligent caching for MCP tool results and AI responses
 */

import { MCPToolResult } from './types.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  hitCount: number;
}

export class EnhancedCacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minute
  private cleanupTimer!: NodeJS.Timeout

  constructor() {
    // Start cleanup interval
    this.cleanupTimer = setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
    this.cleanupTimer.unref();
  }

  /**
   * Generate cache key for MCP tool results
   */
  private generateMCPKey(tool: string, params: Record<string, unknown>): string {
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    return `mcp:${tool}:${this.hashString(paramString)}`;
  }

  /**
   * Generate cache key for AI responses
   */
  private generateResponseKey(content: string, userId: string): string {
    const normalized = content.toLowerCase().trim();
    return `response:${userId}:${this.hashString(normalized)}`;
  }

  /**
   * Simple string hash function
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
   * Cache MCP tool result
   */
  cacheMCPResult(tool: string, params: Record<string, unknown>, result: MCPToolResult, ttl?: number): void {
    const key = this.generateMCPKey(tool, params);
    this.set(key, result, ttl);
  }

  /**
   * Get cached MCP tool result
   */
  getCachedMCPResult(tool: string, params: Record<string, unknown>): MCPToolResult | null {
    const key = this.generateMCPKey(tool, params);
    return this.get(key) as MCPToolResult | null;
  }

  /**
   * Cache AI response
   */
  cacheResponse(content: string, userId: string, response: string, ttl?: number): void {
    const key = this.generateResponseKey(content, userId);
    this.set(key, response, ttl);
  }

  /**
   * Get cached AI response
   */
  getCachedResponse(content: string, userId: string): string | null {
    const key = this.generateResponseKey(content, userId);
    return this.get(key) as string | null;
  }

  /**
   * Generic cache set
   */
  private set<T>(key: string, data: T, ttl?: number): void {
    // Enforce cache size limit
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
      hitCount: 0
    });
  }

  /**
   * Generic cache get
   */
  private get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Increment hit count
    entry.hitCount++;
    return entry.data as T;
  }

  /**
   * Evict least recently used entries
   */
  private evictLeastUsed(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].hitCount - b[1].hitCount);
    
    // Remove oldest 20% of entries
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; hitRate: number; totalEntries: number } {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0);
    const totalRequests = entries.length;

    return {
      size: this.cache.size,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      totalEntries: totalRequests
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }
}
