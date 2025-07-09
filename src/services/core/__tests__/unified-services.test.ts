/**
 * Tests for the newly created unified core services
 * Validates consolidation of overlapping functionalities
 */

import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import { UnifiedCacheService } from '../cache.service.js';

describe('Unified Core Services', () => {
  let cacheService: UnifiedCacheService;

  beforeEach(() => {
    cacheService = new UnifiedCacheService();
    jest.clearAllMocks();
  });

  describe('UnifiedCacheService', () => {
    test('should store and retrieve data', () => {
      const key = 'test-key';
      const value = { test: 'data' };

      cacheService.set(key, value);
      const retrieved = cacheService.get(key);

      expect(retrieved).toEqual(value);
    });

    test('should handle TTL expiration', async () => {
      const key = 'expiring-key';
      const value = 'expiring value';
      const shortTTL = 10; // 10ms

      cacheService.set(key, value, { ttl: shortTTL });
      
      // Should exist immediately
      expect(cacheService.get(key)).toBe(value);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 15));
      
      // Should be expired
      expect(cacheService.get(key)).toBeNull();
    });

    test('should respect cache size limits', () => {
      // Fill cache beyond default limit
      for (let i = 0; i < 1200; i++) {
        cacheService.set(`key-${i}`, `value-${i}`);
      }

      // Cache should have evicted oldest entries
      const stats = cacheService.getStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(1000); // Default max size
    });

    test('should clear cache successfully', () => {
      cacheService.set('test-key', 'test-value');
      cacheService.set('test-key-2', 'test-value-2');
      
      expect(cacheService.getStats().totalEntries).toBeGreaterThan(0);
      
      cacheService.clear();
      
      expect(cacheService.getStats().totalEntries).toBe(0);
    });

    test('should provide cache statistics', () => {
      cacheService.set('test1', 'value1');
      cacheService.set('test2', 'value2');
      
      const stats = cacheService.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.totalEntries).toBe(2);
      expect(typeof stats.hitRate).toBe('number');
      expect(typeof stats.memoryUsage).toBe('string');
    });

    test('should handle has() method correctly', () => {
      const key = 'existence-test';
      const value = 'test-value';

      expect(cacheService.has(key)).toBe(false);
      
      cacheService.set(key, value);
      expect(cacheService.has(key)).toBe(true);
      
      cacheService.delete(key);
      expect(cacheService.has(key)).toBe(false);
    });

    test('should delete specific entries', () => {
      cacheService.set('keep', 'keep-value');
      cacheService.set('delete', 'delete-value');
      
      expect(cacheService.has('keep')).toBe(true);
      expect(cacheService.has('delete')).toBe(true);
      
      cacheService.delete('delete');
      
      expect(cacheService.has('keep')).toBe(true);
      expect(cacheService.has('delete')).toBe(false);
    });

    test('should handle different data types', () => {
      const stringValue = 'test string';
      const numberValue = 42;
      const objectValue = { name: 'test', active: true };
      const arrayValue = [1, 2, 3];

      cacheService.set('string', stringValue);
      cacheService.set('number', numberValue);
      cacheService.set('object', objectValue);
      cacheService.set('array', arrayValue);

      expect(cacheService.get('string')).toBe(stringValue);
      expect(cacheService.get('number')).toBe(numberValue);
      expect(cacheService.get('object')).toEqual(objectValue);
      expect(cacheService.get('array')).toEqual(arrayValue);
    });
  });

  describe('Cache Performance', () => {
    test('should track hit and miss rates', () => {
      const key = 'performance-test';
      
      // Generate misses
      cacheService.get('non-existent-1');
      cacheService.get('non-existent-2');
      
      // Generate hits
      cacheService.set(key, 'value');
      cacheService.get(key);
      cacheService.get(key);
      
      const stats = cacheService.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.hitRate).toBeLessThanOrEqual(1);
    });

    test('should cleanup expired entries automatically', async () => {
      const key = 'auto-cleanup-test';
      const shortTTL = 5;
      
      cacheService.set(key, 'value', { ttl: shortTTL });
      expect(cacheService.has(key)).toBe(true);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Access should trigger cleanup
      expect(cacheService.get(key)).toBeNull();
      expect(cacheService.has(key)).toBe(false);
    });
  });
});
