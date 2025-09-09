// -----------------------------
// Unit Tests: Subscription Module
// -----------------------------

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  subscribe,
  notify,
  hasSubscribers,
  getSubscriberCount,
  clearSubscribers,
  getAllSubscribers
} from '../../src/core/subscription.js';
import { setCacheEntry, clearCache } from '../../src/core/cache.js';
import { DEFAULT_OPTIONS } from '../../src/core/types.js';
import { createSpy, mockConsole } from '../utils/test-helpers.js';
import type { Subscriber } from '../../src/core/types.js';

describe('Subscription Module', () => {
  beforeEach(() => {
    // Clear all subscriptions and cache before each test
    clearSubscribers();
    clearCache();
    vi.clearAllMocks();
  });

  describe('Basic Subscription Operations', () => {
    it('should subscribe to a key and return unsubscribe function', () => {
      const callback = createSpy<Subscriber<any>>();
      const key = 'test-key';

      const unsubscribe = subscribe(key, callback);

      expect(typeof unsubscribe).toBe('function');
      expect(hasSubscribers(key)).toBe(true);
      expect(getSubscriberCount(key)).toBe(1);
    });

    it('should allow multiple subscribers for the same key', () => {
      const callback1 = createSpy<Subscriber<any>>();
      const callback2 = createSpy<Subscriber<any>>();
      const callback3 = createSpy<Subscriber<any>>();
      const key = 'test-key';

      subscribe(key, callback1);
      subscribe(key, callback2);
      subscribe(key, callback3);

      expect(getSubscriberCount(key)).toBe(3);
      expect(hasSubscribers(key)).toBe(true);
    });

    it('should handle subscribers for different keys', () => {
      const callback1 = createSpy<Subscriber<any>>();
      const callback2 = createSpy<Subscriber<any>>();

      subscribe('key1', callback1);
      subscribe('key2', callback2);

      expect(getSubscriberCount('key1')).toBe(1);
      expect(getSubscriberCount('key2')).toBe(1);
      expect(hasSubscribers('key1')).toBe(true);
      expect(hasSubscribers('key2')).toBe(true);
    });

    it('should return false for keys with no subscribers', () => {
      expect(hasSubscribers('non-existent-key')).toBe(false);
      expect(getSubscriberCount('non-existent-key')).toBe(0);
    });
  });

  describe('Unsubscription', () => {
    it('should unsubscribe a single subscriber', () => {
      const callback = createSpy<Subscriber<any>>();
      const key = 'test-key';

      const unsubscribe = subscribe(key, callback);
      expect(getSubscriberCount(key)).toBe(1);

      unsubscribe();
      expect(getSubscriberCount(key)).toBe(0);
      expect(hasSubscribers(key)).toBe(false);
    });

    it('should unsubscribe specific subscriber while keeping others', () => {
      const callback1 = createSpy<Subscriber<any>>();
      const callback2 = createSpy<Subscriber<any>>();
      const callback3 = createSpy<Subscriber<any>>();
      const key = 'test-key';

      const unsubscribe1 = subscribe(key, callback1);
      const unsubscribe2 = subscribe(key, callback2);
      const unsubscribe3 = subscribe(key, callback3);

      expect(getSubscriberCount(key)).toBe(3);

      unsubscribe2();
      expect(getSubscriberCount(key)).toBe(2);

      // Verify the right subscriber was removed by notifying
      setCacheEntry(key, {
        data: 'test-data',
        timestamp: Date.now(),
        fetcher: async () => 'test-data',
        options: DEFAULT_OPTIONS
      });

      notify(key);

      expect(callback1.calls.length).toBe(1);
      expect(callback2.calls.length).toBe(0); // This one was unsubscribed
      expect(callback3.calls.length).toBe(1);
    });

    it('should clean up empty subscriber sets after unsubscription', () => {
      const callback = createSpy<Subscriber<any>>();
      const key = 'test-key';

      const unsubscribe = subscribe(key, callback);
      expect(hasSubscribers(key)).toBe(true);

      unsubscribe();
      expect(hasSubscribers(key)).toBe(false);

      // Verify the key is completely removed from internal storage
      const allSubscribers = getAllSubscribers();
      expect(allSubscribers.has(key)).toBe(false);
    });

    it('should handle multiple unsubscribe calls gracefully', () => {
      const callback = createSpy<Subscriber<any>>();
      const key = 'test-key';

      const unsubscribe = subscribe(key, callback);
      
      // Multiple calls should not throw
      expect(() => {
        unsubscribe();
        unsubscribe();
        unsubscribe();
      }).not.toThrow();

      expect(getSubscriberCount(key)).toBe(0);
    });
  });

  describe('Notification System', () => {
    it('should notify subscribers with cache data', () => {
      const callback = createSpy<Subscriber<string>>();
      const key = 'test-key';
      const testData = 'test-data';

      subscribe(key, callback);

      // Set up cache entry
      setCacheEntry(key, {
        data: testData,
        timestamp: Date.now(),
        fetcher: async () => testData,
        options: DEFAULT_OPTIONS
      });

      notify(key);

      expect(callback.calls.length).toBe(1);
      expect(callback.calls[0]![0]).toBe(testData);
      expect(callback.calls[0]![1]).toBeUndefined(); // No error
    });

    it('should notify subscribers with error', () => {
      const callback = createSpy<Subscriber<string>>();
      const key = 'test-key';
      const testError = new Error('Test error');

      subscribe(key, callback);

      // Set up cache entry with error
      setCacheEntry(key, {
        data: undefined,
        timestamp: Date.now(),
        error: testError,
        fetcher: async () => { throw testError; },
        options: DEFAULT_OPTIONS
      });

      notify(key, testError);

      expect(callback.calls.length).toBe(1);
      expect(callback.calls[0]![0]).toBeUndefined();
      expect(callback.calls[0]![1]).toBe(testError);
    });

    it('should notify all subscribers for a key', () => {
      const callback1 = createSpy<Subscriber<string>>();
      const callback2 = createSpy<Subscriber<string>>();
      const callback3 = createSpy<Subscriber<string>>();
      const key = 'test-key';
      const testData = 'test-data';

      subscribe(key, callback1);
      subscribe(key, callback2);
      subscribe(key, callback3);

      setCacheEntry(key, {
        data: testData,
        timestamp: Date.now(),
        fetcher: async () => testData,
        options: DEFAULT_OPTIONS
      });

      notify(key);

      expect(callback1.calls.length).toBe(1);
      expect(callback2.calls.length).toBe(1);
      expect(callback3.calls.length).toBe(1);

      expect(callback1.calls[0]![0]).toBe(testData);
      expect(callback2.calls[0]![0]).toBe(testData);
      expect(callback3.calls[0]![0]).toBe(testData);
    });

    it('should not notify subscribers of other keys', () => {
      const callback1 = createSpy<Subscriber<string>>();
      const callback2 = createSpy<Subscriber<string>>();

      subscribe('key1', callback1);
      subscribe('key2', callback2);

      setCacheEntry('key1', {
        data: 'data1',
        timestamp: Date.now(),
        fetcher: async () => 'data1',
        options: DEFAULT_OPTIONS
      });

      notify('key1');

      expect(callback1.calls.length).toBe(1);
      expect(callback2.calls.length).toBe(0);
    });

    it('should handle notification with no cache entry', () => {
      const callback = createSpy<Subscriber<string>>();
      const key = 'test-key';

      subscribe(key, callback);
      notify(key); // No cache entry exists

      expect(callback.calls.length).toBe(1);
      expect(callback.calls[0]![0]).toBeUndefined();
      expect(callback.calls[0]![1]).toBeUndefined();
    });

    it('should handle notification with no subscribers', () => {
      const key = 'test-key';
      
      // Should not throw when notifying a key with no subscribers
      expect(() => notify(key)).not.toThrow();
    });
  });

  describe('Error Handling in Subscribers', () => {
    it('should catch and log errors in subscriber callbacks', () => {
      const console = mockConsole();
      const errorCallback: Subscriber<string> = () => {
        throw new Error('Subscriber callback error');
      };
      const normalCallback = createSpy<Subscriber<string>>();
      const key = 'test-key';

      subscribe(key, errorCallback);
      subscribe(key, normalCallback);

      setCacheEntry(key, {
        data: 'test-data',
        timestamp: Date.now(),
        fetcher: async () => 'test-data',
        options: DEFAULT_OPTIONS
      });

      // Should not throw despite error in callback
      expect(() => notify(key)).not.toThrow();

      // Normal callback should still be called
      expect(normalCallback.calls.length).toBe(1);

      // Error should be logged
      expect(console.errors.length).toBe(1);
      expect(console.errors[0]).toContain('Error in subscriber callback');

      console.restore();
    });

    it('should continue notifying other subscribers even if one fails', () => {
      const console = mockConsole();
      const errorCallback1: Subscriber<string> = () => {
        throw new Error('First error');
      };
      const normalCallback = createSpy<Subscriber<string>>();
      const errorCallback2: Subscriber<string> = () => {
        throw new Error('Second error');
      };
      const key = 'test-key';

      subscribe(key, errorCallback1);
      subscribe(key, normalCallback);
      subscribe(key, errorCallback2);

      setCacheEntry(key, {
        data: 'test-data',
        timestamp: Date.now(),
        fetcher: async () => 'test-data',
        options: DEFAULT_OPTIONS
      });

      notify(key);

      // Normal callback should be called despite errors in others
      expect(normalCallback.calls.length).toBe(1);
      expect(normalCallback.calls[0]![0]).toBe('test-data');

      // Both errors should be logged
      expect(console.errors.length).toBe(2);

      console.restore();
    });
  });

  describe('Subscriber Management', () => {
    it('should clear all subscribers for a specific key', () => {
      const callback1 = createSpy();
      const callback2 = createSpy();

      subscribe('key1', callback1);
      subscribe('key1', callback2);
      subscribe('key2', callback1);

      expect(getSubscriberCount('key1')).toBe(2);
      expect(getSubscriberCount('key2')).toBe(1);

      clearSubscribers('key1');

      expect(getSubscriberCount('key1')).toBe(0);
      expect(getSubscriberCount('key2')).toBe(1);
      expect(hasSubscribers('key1')).toBe(false);
      expect(hasSubscribers('key2')).toBe(true);
    });

    it('should clear all subscribers for all keys', () => {
      const callback1 = createSpy();
      const callback2 = createSpy();

      subscribe('key1', callback1);
      subscribe('key1', callback2);
      subscribe('key2', callback1);
      subscribe('key3', callback2);

      expect(getAllSubscribers().size).toBe(3);

      clearSubscribers();

      expect(getAllSubscribers().size).toBe(0);
      expect(hasSubscribers('key1')).toBe(false);
      expect(hasSubscribers('key2')).toBe(false);
      expect(hasSubscribers('key3')).toBe(false);
    });

    it('should get all subscribers map', () => {
      const callback1 = createSpy();
      const callback2 = createSpy();

      subscribe('key1', callback1);
      subscribe('key1', callback2);
      subscribe('key2', callback1);

      const allSubscribers = getAllSubscribers();
      
      expect(allSubscribers.size).toBe(2);
      expect(allSubscribers.has('key1')).toBe(true);
      expect(allSubscribers.has('key2')).toBe(true);
      expect(allSubscribers.get('key1')?.size).toBe(2);
      expect(allSubscribers.get('key2')?.size).toBe(1);
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle rapid subscribe/unsubscribe operations', () => {
      const key = 'test-key';
      const callbacks: Array<ReturnType<typeof createSpy>> = [];
      const unsubscribers: Array<() => void> = [];

      // Rapid subscribe
      for (let i = 0; i < 100; i++) {
        const callback = createSpy<Subscriber<any>>();
        callbacks.push(callback);
        const unsubscribe = subscribe(key, callback);
        unsubscribers.push(unsubscribe);
      }

      expect(getSubscriberCount(key)).toBe(100);

      // Rapid unsubscribe (every other one)
      for (let i = 0; i < 100; i += 2) {
        unsubscribers[i]!();
      }

      expect(getSubscriberCount(key)).toBe(50);

      // Verify remaining subscribers work
      setCacheEntry(key, {
        data: 'test-data',
        timestamp: Date.now(),
        fetcher: async () => 'test-data',
        options: DEFAULT_OPTIONS
      });

      notify(key);

      // Check that unsubscribed callbacks weren't called
      for (let i = 0; i < 100; i += 2) {
        expect(callbacks[i]!.calls.length).toBe(0);
      }

      // Check that remaining callbacks were called
      for (let i = 1; i < 100; i += 2) {
        expect(callbacks[i]!.calls.length).toBe(1);
      }
    });

    it('should handle same callback subscribed multiple times', () => {
      const callback = createSpy<Subscriber<any>>();
      const key = 'test-key';

      const unsubscribe1 = subscribe(key, callback);
      const unsubscribe2 = subscribe(key, callback);

      // Same callback reference should only be stored once in Set
      expect(getSubscriberCount(key)).toBe(1);

      setCacheEntry(key, {
        data: 'test-data',
        timestamp: Date.now(),
        fetcher: async () => 'test-data',
        options: DEFAULT_OPTIONS
      });

      notify(key);

      // Callback should be called once (Set deduplication)
      expect(callback.calls.length).toBe(1);

      // Unsubscribe first instance should remove the callback
      unsubscribe1();
      expect(getSubscriberCount(key)).toBe(0);

      notify(key);

      // Should not be called again (total still 1)
      expect(callback.calls.length).toBe(1);

      // Second unsubscribe should be safe (no-op)
      expect(() => unsubscribe2()).not.toThrow();
      expect(getSubscriberCount(key)).toBe(0);
    });

    it('should handle notification with complex data types', () => {
      const callback = createSpy<Subscriber<any>>();
      const key = 'test-key';
      const complexData = {
        user: { id: 1, name: 'John' },
        items: [1, 2, 3],
        nested: { deep: { value: 'test' } },
        date: new Date(),
        nullValue: null,
        undefinedValue: undefined
      };

      subscribe(key, callback);

      setCacheEntry(key, {
        data: complexData,
        timestamp: Date.now(),
        fetcher: async () => complexData,
        options: DEFAULT_OPTIONS
      });

      notify(key);

      expect(callback.calls.length).toBe(1);
      expect(callback.calls[0]![0]).toEqual(complexData);
    });
  });
});
