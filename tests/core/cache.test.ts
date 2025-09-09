// -----------------------------
// Unit Tests: Cache Module
// -----------------------------

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCacheEntry,
  setCacheEntry,
  deleteCacheEntry,
  hasCacheEntry,
  getAllCacheEntries,
  isExpired,
  evictOldestEntry,
  ensureCacheSize,
  clearCache,
  getCacheInfo
} from '../../src/core/cache.js';
import { DEFAULT_OPTIONS } from '../../src/core/types.js';
import type { CacheEntry } from '../../src/core/types.js';

describe('Cache Module', () => {
  beforeEach(() => {
    // Clear all cache before each test
    clearCache();
    vi.clearAllTimers();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get cache entries', () => {
      const key = 'test-key';
      const entry: CacheEntry<string> = {
        data: 'test-data',
        timestamp: Date.now(),
        fetcher: async () => 'test-data',
        options: DEFAULT_OPTIONS
      };

      setCacheEntry(key, entry);
      const retrieved = getCacheEntry(key);

      expect(retrieved).toEqual(entry);
      expect(retrieved?.data).toBe('test-data');
    });

    it('should return undefined for non-existent cache entries', () => {
      const result = getCacheEntry('non-existent-key');
      expect(result).toBeUndefined();
    });

    it('should check if cache entry exists', () => {
      const key = 'test-key';
      expect(hasCacheEntry(key)).toBe(false);

      setCacheEntry(key, {
        data: 'test',
        timestamp: Date.now(),
        fetcher: async () => 'test',
        options: DEFAULT_OPTIONS
      });

      expect(hasCacheEntry(key)).toBe(true);
    });

    it('should delete cache entries', () => {
      const key = 'test-key';
      setCacheEntry(key, {
        data: 'test',
        timestamp: Date.now(),
        fetcher: async () => 'test',
        options: DEFAULT_OPTIONS
      });

      expect(hasCacheEntry(key)).toBe(true);
      const deleted = deleteCacheEntry(key);
      expect(deleted).toBe(true);
      expect(hasCacheEntry(key)).toBe(false);
    });

    it('should return false when deleting non-existent entries', () => {
      const deleted = deleteCacheEntry('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('Cache Information', () => {
    it('should get all cache entries', () => {
      const entries = {
        'key1': {
          data: 'data1',
          timestamp: Date.now(),
          fetcher: async () => 'data1',
          options: DEFAULT_OPTIONS
        },
        'key2': {
          data: 'data2',
          timestamp: Date.now(),
          fetcher: async () => 'data2',
          options: DEFAULT_OPTIONS
        }
      };

      Object.entries(entries).forEach(([key, entry]) => {
        setCacheEntry(key, entry);
      });

      const allEntries = getAllCacheEntries();
      expect(allEntries.size).toBe(2);
      expect(allEntries.get('key1')?.data).toBe('data1');
      expect(allEntries.get('key2')?.data).toBe('data2');
    });

    it('should get cache info', () => {
      setCacheEntry('key1', {
        data: 'data1',
        timestamp: Date.now(),
        fetcher: async () => 'data1',
        options: DEFAULT_OPTIONS
      });
      setCacheEntry('key2', {
        data: 'data2',
        timestamp: Date.now(),
        fetcher: async () => 'data2',
        options: DEFAULT_OPTIONS
      });

      const info = getCacheInfo();
      expect(info.size).toBe(2);
      expect(info.keys).toEqual(expect.arrayContaining(['key1', 'key2']));
    });
  });

  describe('Cache Expiration', () => {
    it('should detect expired entries', () => {
      const pastTime = Date.now() - 10000; // 10 seconds ago
      const entry: CacheEntry<string> = {
        data: 'test',
        timestamp: pastTime,
        fetcher: async () => 'test',
        options: { ...DEFAULT_OPTIONS, ttl: 5000 } // 5 seconds TTL
      };

      expect(isExpired(entry)).toBe(true);
    });

    it('should detect non-expired entries', () => {
      const recentTime = Date.now() - 1000; // 1 second ago
      const entry: CacheEntry<string> = {
        data: 'test',
        timestamp: recentTime,
        fetcher: async () => 'test',
        options: { ...DEFAULT_OPTIONS, ttl: 5000 } // 5 seconds TTL
      };

      expect(isExpired(entry)).toBe(false);
    });

    it('should never expire entries with TTL = 0', () => {
      const veryOldTime = Date.now() - 1000000; // Very old
      const entry: CacheEntry<string> = {
        data: 'test',
        timestamp: veryOldTime,
        fetcher: async () => 'test',
        options: { ...DEFAULT_OPTIONS, ttl: 0 } // Never expire
      };

      expect(isExpired(entry)).toBe(false);
    });
  });

  describe('Cache Eviction (LRU)', () => {
    it('should evict the oldest entry', () => {
      const baseTime = Date.now();
      
      // Add entries with different timestamps
      setCacheEntry('oldest', {
        data: 'oldest-data',
        timestamp: baseTime - 3000,
        fetcher: async () => 'oldest-data',
        options: DEFAULT_OPTIONS
      });
      
      setCacheEntry('middle', {
        data: 'middle-data',
        timestamp: baseTime - 2000,
        fetcher: async () => 'middle-data',
        options: DEFAULT_OPTIONS
      });
      
      setCacheEntry('newest', {
        data: 'newest-data',
        timestamp: baseTime - 1000,
        fetcher: async () => 'newest-data',
        options: DEFAULT_OPTIONS
      });

      expect(getCacheInfo().size).toBe(3);
      
      evictOldestEntry();
      
      expect(getCacheInfo().size).toBe(2);
      expect(hasCacheEntry('oldest')).toBe(false);
      expect(hasCacheEntry('middle')).toBe(true);
      expect(hasCacheEntry('newest')).toBe(true);
    });

    it('should handle eviction with no entries', () => {
      expect(() => evictOldestEntry()).not.toThrow();
      expect(getCacheInfo().size).toBe(0);
    });

    it('should ensure cache size limit', () => {
      const maxSize = 3;
      
      // Add entries exceeding the limit
      for (let i = 1; i <= 5; i++) {
        setCacheEntry(`key${i}`, {
          data: `data${i}`,
          timestamp: Date.now() + i, // Newer entries have higher timestamps
          fetcher: async () => `data${i}`,
          options: DEFAULT_OPTIONS
        });
        
        ensureCacheSize(maxSize);
        
        // Cache should never exceed maxSize
        expect(getCacheInfo().size).toBeLessThanOrEqual(maxSize);
      }
      
      // Should keep the newest entries
      expect(getCacheInfo().size).toBe(maxSize);
      expect(hasCacheEntry('key3')).toBe(true);
      expect(hasCacheEntry('key4')).toBe(true);
      expect(hasCacheEntry('key5')).toBe(true);
    });
  });

  describe('Cache Clearing', () => {
    beforeEach(() => {
      // Setup some cache entries
      setCacheEntry('key1', {
        data: 'data1',
        timestamp: Date.now(),
        fetcher: async () => 'data1',
        options: DEFAULT_OPTIONS
      });
      setCacheEntry('key2', {
        data: 'data2',
        timestamp: Date.now(),
        fetcher: async () => 'data2',
        options: DEFAULT_OPTIONS
      });
    });

    it('should clear specific cache entry', () => {
      expect(hasCacheEntry('key1')).toBe(true);
      expect(hasCacheEntry('key2')).toBe(true);
      
      clearCache('key1');
      
      expect(hasCacheEntry('key1')).toBe(false);
      expect(hasCacheEntry('key2')).toBe(true);
    });

    it('should clear all cache entries', () => {
      expect(getCacheInfo().size).toBe(2);
      
      clearCache();
      
      expect(getCacheInfo().size).toBe(0);
      expect(hasCacheEntry('key1')).toBe(false);
      expect(hasCacheEntry('key2')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined data in cache entries', () => {
      const entry: CacheEntry<undefined> = {
        data: undefined,
        timestamp: Date.now(),
        fetcher: async () => undefined,
        options: DEFAULT_OPTIONS
      };

      setCacheEntry('undefined-key', entry);
      const retrieved = getCacheEntry('undefined-key');
      
      expect(retrieved?.data).toBeUndefined();
      expect(hasCacheEntry('undefined-key')).toBe(true);
    });

    it('should handle cache entries with errors', () => {
      const error = new Error('Test error');
      const entry: CacheEntry<string> = {
        data: undefined,
        timestamp: Date.now(),
        error,
        fetcher: async () => { throw error; },
        options: DEFAULT_OPTIONS
      };

      setCacheEntry('error-key', entry);
      const retrieved = getCacheEntry('error-key');
      
      expect(retrieved?.error).toBe(error);
      expect(retrieved?.data).toBeUndefined();
    });

    it('should handle multiple rapid cache operations', () => {
      const operations = 100;
      
      // Rapid set operations
      for (let i = 0; i < operations; i++) {
        setCacheEntry(`rapid-${i}`, {
          data: `data-${i}`,
          timestamp: Date.now() + i,
          fetcher: async () => `data-${i}`,
          options: DEFAULT_OPTIONS
        });
      }
      
      expect(getCacheInfo().size).toBe(operations);
      
      // Rapid get operations
      for (let i = 0; i < operations; i++) {
        const entry = getCacheEntry(`rapid-${i}`);
        expect(entry?.data).toBe(`data-${i}`);
      }
      
      // Rapid delete operations
      for (let i = 0; i < operations; i += 2) {
        deleteCacheEntry(`rapid-${i}`);
      }
      
      expect(getCacheInfo().size).toBe(operations / 2);
    });
  });
});
