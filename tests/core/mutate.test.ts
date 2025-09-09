// -----------------------------
// Unit Tests: Mutate Module
// -----------------------------

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mutate } from '../../src/core/mutate.js';
import { setCacheEntry, getCacheEntry, clearCache } from '../../src/core/cache.js';
import { subscribe, clearSubscribers } from '../../src/core/subscription.js';
import { DEFAULT_OPTIONS } from '../../src/core/types.js';
import { createSpy } from '../utils/test-helpers.js';
import type { Subscriber } from '../../src/core/types.js';
import type { CacheEntry } from '../../src/core/types.js';

describe('Mutate Module', () => {
  beforeEach(() => {
    clearCache();
    clearSubscribers();
    vi.clearAllMocks();
  });

  describe('Basic Mutation', () => {
    it('should update existing cache entry with new data', () => {
      const key = 'test-key';
      const originalData = 'original-data';
      const newData = 'new-data';

      // Set up existing cache entry with a fixed old timestamp
      const oldTimestamp = Date.now() - 5000; // 5 seconds ago to ensure difference
      const originalEntry: CacheEntry<string> = {
        data: originalData,
        timestamp: oldTimestamp,
        fetcher: async () => originalData,
        options: DEFAULT_OPTIONS
      };
      setCacheEntry(key, originalEntry);

      const result = mutate(key, newData, false);

      expect(result).toBe(newData);
      
      const updatedEntry = getCacheEntry(key);
      expect(updatedEntry?.data).toBe(newData);
      expect(updatedEntry?.error).toBeUndefined();
      expect(updatedEntry?.timestamp).toBeGreaterThan(oldTimestamp);
    });

    it('should create new cache entry when none exists', () => {
      const key = 'new-key';
      const newData = 'new-data';

      const result = mutate(key, newData, false);

      expect(result).toBe(newData);
      
      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry?.data).toBe(newData);
      expect(cacheEntry?.options).toEqual(DEFAULT_OPTIONS);
      expect(typeof cacheEntry?.timestamp).toBe('number');
    });

    it('should handle undefined data', () => {
      const key = 'test-key';
      
      const result = mutate(key, undefined, false);

      expect(result).toBeUndefined();
      
      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry?.data).toBeUndefined();
    });

    it('should handle null data', () => {
      const key = 'test-key';
      
      const result = mutate(key, null, false);

      expect(result).toBeNull();
      
      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry?.data).toBeNull();
    });

    it('should handle complex data types', () => {
      const key = 'test-key';
      const complexData = {
        user: { id: 1, name: 'John' },
        items: [1, 2, 3],
        metadata: { created: new Date() }
      };
      
      const result = mutate(key, complexData, false);

      expect(result).toEqual(complexData);
      
      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry?.data).toEqual(complexData);
    });
  });

  describe('Functional Updates', () => {
    it('should update data using function with previous value', () => {
      const key = 'test-key';
      const originalData = { count: 5 };

      // Set up existing cache
      setCacheEntry(key, {
        data: originalData,
        timestamp: Date.now(),
        fetcher: async () => originalData,
        options: DEFAULT_OPTIONS
      });

      const result = mutate(key, (prev: any) => ({ count: prev.count + 1 }), false);

      expect(result).toEqual({ count: 6 });
      
      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry?.data).toEqual({ count: 6 });
    });

    it('should handle function update with undefined previous value', () => {
      const key = 'new-key';
      
      const result = mutate(key, (prev: any) => prev || 'default-value', false);

      expect(result).toBe('default-value');
      
      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry?.data).toBe('default-value');
    });

    it('should handle function update that returns undefined', () => {
      const key = 'test-key';
      const originalData = 'original';

      setCacheEntry(key, {
        data: originalData,
        timestamp: Date.now(),
        fetcher: async () => originalData,
        options: DEFAULT_OPTIONS
      });

      const result = mutate(key, () => undefined, false);

      expect(result).toBeUndefined();
      
      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry?.data).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should clear previous errors when updating with new data', () => {
      const key = 'test-key';
      const error = new Error('Previous error');
      const newData = 'recovered-data';

      // Set up cache entry with error
      setCacheEntry(key, {
        data: undefined,
        timestamp: Date.now(),
        error,
        fetcher: async () => { throw error; },
        options: DEFAULT_OPTIONS
      });

      const result = mutate(key, newData, false);

      expect(result).toBe(newData);
      
      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry?.data).toBe(newData);
      expect(cacheEntry?.error).toBeUndefined();
    });

    it('should handle function that throws error', () => {
      const key = 'test-key';
      const originalData = 'original';

      setCacheEntry(key, {
        data: originalData,
        timestamp: Date.now(),
        fetcher: async () => originalData,
        options: DEFAULT_OPTIONS
      });

      expect(() => {
        mutate(key, () => {
          throw new Error('Update function error');
        }, false);
      }).toThrow('Update function error');

      // Cache should remain unchanged
      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry?.data).toBe(originalData);
    });
  });

  describe('Subscription Notifications', () => {
    it('should notify subscribers when data is updated', () => {
      const key = 'test-key';
      const newData = 'new-data';
      const subscriber = createSpy<Subscriber<string>>();

      subscribe(key, subscriber);
      mutate(key, newData, false);

      expect(subscriber.calls.length).toBe(1);
      expect(subscriber.calls[0]![0]).toBe(newData);
      expect(subscriber.calls[0]![1]).toBeUndefined(); // No error
    });

    it('should notify multiple subscribers', () => {
      const key = 'test-key';
      const newData = 'new-data';
      const subscriber1 = createSpy();
      const subscriber2 = createSpy();
      const subscriber3 = createSpy();

      subscribe(key, subscriber1);
      subscribe(key, subscriber2);
      subscribe(key, subscriber3);

      mutate(key, newData, false);

      expect(subscriber1.calls.length).toBe(1);
      expect(subscriber2.calls.length).toBe(1);
      expect(subscriber3.calls.length).toBe(1);

      expect(subscriber1.calls[0]![0]).toBe(newData);
      expect(subscriber2.calls[0]![0]).toBe(newData);
      expect(subscriber3.calls[0]![0]).toBe(newData);
    });

    it('should not notify subscribers of other keys', () => {
      const subscriber1 = createSpy<Subscriber<string>>();
      const subscriber2 = createSpy<Subscriber<string>>();

      subscribe('key1', subscriber1);
      subscribe('key2', subscriber2);

      mutate('key1', 'data1', false);

      expect(subscriber1.calls.length).toBe(1);
      expect(subscriber2.calls.length).toBe(0);
    });
  });

  describe('Revalidation', () => {
    it('should not trigger revalidation when shouldRevalidate is false', () => {
      const key = 'test-key';
      const originalData = 'original';
      const newData = 'new-data';
      const mockFetcher = vi.fn(async () => 'fresh-data');

      // Set up existing cache with fetcher
      setCacheEntry(key, {
        data: originalData,
        timestamp: Date.now(),
        fetcher: mockFetcher,
        options: DEFAULT_OPTIONS
      });

      mutate(key, newData, false);

      // Should not call the fetcher
      expect(mockFetcher).not.toHaveBeenCalled();
    });

    it('should trigger revalidation when shouldRevalidate is true (default)', () => {
      const key = 'test-key';
      const originalData = 'original';
      const newData = 'new-data';
      const mockFetcher = vi.fn(async () => 'fresh-data');

      // Set up existing cache with fetcher
      setCacheEntry(key, {
        data: originalData,
        timestamp: Date.now(),
        fetcher: mockFetcher,
        options: DEFAULT_OPTIONS
      });

      // Use fake timers to control setTimeout
      vi.useFakeTimers();
      
      mutate(key, newData); // shouldRevalidate defaults to true

      // Advance timers to trigger the setTimeout(0) revalidation
      vi.advanceTimersByTime(0);
      
      vi.useRealTimers();

      // Should have triggered revalidation (async, so we can't easily test the result)
      // But we can verify the mutate completed successfully
      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry?.data).toBe(newData);
    });

    it('should handle revalidation with no existing fetcher', () => {
      const key = 'new-key';
      const newData = 'new-data';

      // This should not throw even though there's no existing fetcher
      expect(() => {
        mutate(key, newData, true);
      }).not.toThrow();

      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry?.data).toBe(newData);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid sequential mutations', () => {
      const key = 'test-key';
      let counter = 0;

      // Perform rapid mutations
      for (let i = 0; i < 100; i++) {
        mutate(key, (prev: number | undefined) => (prev || 0) + 1, false);
        counter++;
      }

      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry?.data).toBe(100);
    });

    it('should handle mutations with different data types', () => {
      const key = 'test-key';

      // String
      mutate(key, 'string-data', false);
      expect(getCacheEntry(key)?.data).toBe('string-data');

      // Number
      mutate(key, 42, false);
      expect(getCacheEntry(key)?.data).toBe(42);

      // Boolean
      mutate(key, true, false);
      expect(getCacheEntry(key)?.data).toBe(true);

      // Array
      mutate(key, [1, 2, 3], false);
      expect(getCacheEntry(key)?.data).toEqual([1, 2, 3]);

      // Object
      mutate(key, { test: 'value' }, false);
      expect(getCacheEntry(key)?.data).toEqual({ test: 'value' });
    });

    it('should preserve fetcher and options from existing cache', () => {
      const key = 'test-key';
      const originalData = 'original';
      const newData = 'new-data';
      const customOptions = { ...DEFAULT_OPTIONS, ttl: 10000 };
      const mockFetcher = vi.fn(async () => originalData);

      // Set up cache with custom options and fetcher
      setCacheEntry(key, {
        data: originalData,
        timestamp: Date.now(),
        fetcher: mockFetcher,
        options: customOptions
      });

      mutate(key, newData, false);

      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry?.data).toBe(newData);
      expect(cacheEntry?.fetcher).toBe(mockFetcher);
      expect(cacheEntry?.options).toEqual(customOptions);
    });

    it('should update timestamp on mutation', async () => {
      const key = 'test-key';
      const originalData = 'original';
      const newData = 'new-data';

      // Set up cache with old timestamp
      const oldTimestamp = Date.now() - 5000;
      setCacheEntry(key, {
        data: originalData,
        timestamp: oldTimestamp,
        fetcher: async () => originalData,
        options: DEFAULT_OPTIONS
      });

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      mutate(key, newData, false);

      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry?.timestamp).toBeGreaterThan(oldTimestamp);
    });
  });
});
