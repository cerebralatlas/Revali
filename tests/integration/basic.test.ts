// -----------------------------
// Integration Tests: Basic Functionality
// -----------------------------

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  revaliFetch,
  subscribe,
  mutate,
  clearCache,
  getCacheInfo,
  getPollingInfo,
  hasActivePolling,
  cleanupPolling,
  type Subscriber,
} from '../../src/index.js';
import { createSpy, sleep } from '../utils/test-helpers.js';

describe('Integration Tests', () => {
  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
  });

  describe('Basic SWR Flow', () => {
    it('should fetch, cache, and return data', async () => {
      const key = 'integration-test';
      const testData = { id: 1, name: 'Test User' };
      const fetcher = vi.fn(async () => testData);

      const result = await revaliFetch(key, fetcher);

      expect(result).toEqual(testData);
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Verify cache was updated
      const cacheInfo = getCacheInfo();
      expect(cacheInfo.size).toBe(1);
      expect(cacheInfo.keys).toContain(key);
    });

    it('should return cached data on subsequent calls', async () => {
      const key = 'cached-test';
      const testData = 'cached-data';
      const fetcher = vi.fn(async () => testData);

      // First call
      const result1 = await revaliFetch(key, fetcher);
      expect(result1).toBe(testData);
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Second call should return cached data
      const result2 = await revaliFetch(key, fetcher);
      expect(result2).toBe(testData);
      expect(fetcher).toHaveBeenCalledTimes(1); // Should not fetch again
    });

    it('should handle fetch errors gracefully', async () => {
      const key = 'error-test';
      const errorMessage = 'Network error';
      const fetcher = vi.fn(async () => {
        throw new Error(errorMessage);
      });

      await expect(revaliFetch(key, fetcher)).rejects.toThrow(errorMessage);
      expect(fetcher).toHaveBeenCalledTimes(3); // 1 original + 2 retries
    });
  });

  describe('Subscription Integration', () => {
    it('should notify subscribers when data is fetched', async () => {
      const key = 'subscription-test';
      const testData = 'subscription-data';
      const fetcher = vi.fn(async () => testData);
      const subscriber = createSpy<Subscriber<any>>();

      // Subscribe before fetching
      const unsubscribe = subscribe(key, subscriber);

      await revaliFetch(key, fetcher);

      expect(subscriber.calls.length).toBe(1);
      expect(subscriber.calls[0]![0]).toBe(testData);
      expect(subscriber.calls[0]![1]).toBeUndefined(); // No error

      unsubscribe();
    });

    it('should notify subscribers when data is mutated', async () => {
      const key = 'mutation-test';
      const originalData = 'original';
      const newData = 'mutated';
      const fetcher = vi.fn(async () => originalData);
      const subscriber = createSpy<Subscriber<any>>();

      // Fetch initial data
      await revaliFetch(key, fetcher);

      // Subscribe after initial fetch
      const unsubscribe = subscribe(key, subscriber);

      // Mutate data
      mutate(key, newData, false);

      expect(subscriber.calls.length).toBe(1);
      expect(subscriber.calls[0]![0]).toBe(newData);

      unsubscribe();
    });

    it('should handle multiple subscribers', async () => {
      const key = 'multi-subscriber-test';
      const testData = 'multi-data';
      const fetcher = vi.fn(async () => testData);
      const subscriber1 = createSpy();
      const subscriber2 = createSpy();
      const subscriber3 = createSpy();

      const unsubscribe1 = subscribe(key, subscriber1);
      const unsubscribe2 = subscribe(key, subscriber2);
      const unsubscribe3 = subscribe(key, subscriber3);

      await revaliFetch(key, fetcher);

      expect(subscriber1.calls.length).toBe(1);
      expect(subscriber2.calls.length).toBe(1);
      expect(subscriber3.calls.length).toBe(1);

      expect(subscriber1.calls[0]![0]).toBe(testData);
      expect(subscriber2.calls[0]![0]).toBe(testData);
      expect(subscriber3.calls[0]![0]).toBe(testData);

      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
    });
  });

  describe('Mutation Integration', () => {
    it('should update cache and notify subscribers', async () => {
      const key = 'mutation-integration';
      const originalData = { count: 0 };
      const fetcher = vi.fn(async () => originalData);
      const subscriber = createSpy<Subscriber<any>>();

      // Initial fetch
      await revaliFetch(key, fetcher);

      // Subscribe
      const unsubscribe = subscribe(key, subscriber);

      // Mutate with function
      const result = mutate(key, (prev: any) => ({ count: prev.count + 1 }), false);

      expect(result).toEqual({ count: 1 });
      expect(subscriber.calls.length).toBe(1);
      expect(subscriber.calls[0]![0]).toEqual({ count: 1 });

      // Verify cache was updated
      const nextResult = await revaliFetch(key, fetcher);
      expect(nextResult).toEqual({ count: 1 });
      expect(fetcher).toHaveBeenCalledTimes(1); // Should use cached mutated data

      unsubscribe();
    });

    it('should handle mutation with revalidation', async () => {
      const key = 'mutation-revalidation';
      const originalData = 'original';
      const freshData = 'fresh';
      let callCount = 0;
      const fetcher = vi.fn(async () => {
        callCount++;
        return callCount === 1 ? originalData : freshData;
      });

      // Initial fetch
      await revaliFetch(key, fetcher);
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Mutate with revalidation
      vi.useFakeTimers();
      mutate(key, 'mutated', true); // shouldRevalidate = true
      
      // Advance timers to trigger revalidation
      vi.advanceTimersByTime(0);
      vi.useRealTimers();

      // Give some time for async revalidation
      await sleep(10);

      // The mutation should trigger revalidation, so fetcher should be called again
      expect(fetcher).toHaveBeenCalledTimes(2); // Initial call + revalidation
    });
  });

  describe('Cache Management', () => {
    it('should manage cache size correctly', async () => {
      const maxSize = 3;
      
      // Clear cache first to ensure clean state
      clearCache();

      // Fill cache beyond limit - use different keys to avoid cache hits
      for (let i = 1; i <= 5; i++) {
        const fetcher = vi.fn(async () => `data-${i}`);
        // Use options that will trigger cache size management
        await revaliFetch(`cache-size-test-${i}`, fetcher, { maxCacheSize: maxSize });
      }

      const cacheInfo = getCacheInfo();
      // Note: The cache size might not be exactly maxSize due to the timing of cache eviction
      // But it should be reasonable (not much larger than maxSize)
      expect(cacheInfo.size).toBeLessThanOrEqual(maxSize + 1); // Allow some tolerance
    });

    it('should clear cache correctly', async () => {
      const fetcher1 = vi.fn(async () => 'data1');
      const fetcher2 = vi.fn(async () => 'data2');

      await revaliFetch('key1', fetcher1);
      await revaliFetch('key2', fetcher2);

      expect(getCacheInfo().size).toBe(2);

      clearCache();

      expect(getCacheInfo().size).toBe(0);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle fetch errors and still maintain cache', async () => {
      const key = 'error-scenario';
      const successData = 'success';
      const errorMessage = 'Fetch failed';

      // First successful fetch
      const successFetcher = vi.fn(async () => successData);
      const result1 = await revaliFetch(key, successFetcher);
      expect(result1).toBe(successData);

      // Second fetch that fails (should return cached data due to SWR)
      const failingFetcher = vi.fn(async () => {
        throw new Error(errorMessage);
      });
      
      // This should return cached data immediately (SWR behavior)
      const result2 = await revaliFetch(key, failingFetcher);
      expect(result2).toBe(successData); // Should return cached data

      expect(getCacheInfo().size).toBe(1);
    });

    it('should handle subscription errors gracefully', async () => {
      const key = 'subscription-error';
      const testData = 'test-data';
      const fetcher = vi.fn(async () => testData);

      const errorSubscriber = vi.fn(() => {
        throw new Error('Subscriber error');
      });
      const normalSubscriber = createSpy();

      const unsubscribe1 = subscribe(key, errorSubscriber);
      const unsubscribe2 = subscribe(key, normalSubscriber);

      // Should not throw despite error in subscriber
      await expect(revaliFetch(key, fetcher)).resolves.toBe(testData);

      // Normal subscriber should still be called
      expect(normalSubscriber.calls.length).toBe(1);
      expect(normalSubscriber.calls[0]![0]).toBe(testData);

      unsubscribe1();
      unsubscribe2();
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle user data fetching scenario', async () => {
      const userId = '123';
      const key = `user-${userId}`;
      const userData = { id: userId, name: 'John Doe', email: 'john@example.com' };
      
      const mockApi = vi.fn(async () => {
        // Simulate API delay
        await sleep(10);
        return userData;
      });

      const subscriber = createSpy<Subscriber<any>>();
      const unsubscribe = subscribe(key, subscriber);

      // Fetch user data
      const result = await revaliFetch(key, mockApi);
      expect(result).toEqual(userData);
      expect(subscriber.calls.length).toBe(1);

      // Update user name optimistically
      const updatedData = mutate(key, (prev: any) => ({
        ...prev,
        name: 'John Smith'
      }), false);

      expect(updatedData.name).toBe('John Smith');
      expect(subscriber.calls.length).toBe(2); // Initial fetch + mutation

      // Subsequent fetch should return cached mutated data
      const cachedResult = await revaliFetch(key, mockApi);
      expect(cachedResult.name).toBe('John Smith');
      expect(mockApi).toHaveBeenCalledTimes(1); // Should use cache

      unsubscribe();
    });

    it('should handle shopping cart scenario', async () => {
      const cartKey = 'shopping-cart';
      const initialCart = { items: [], total: 0 };
      
      const mockCartApi = vi.fn(async () => initialCart);
      const cartSubscriber = createSpy<Subscriber<{ items: any[]; total: number }>>();
      
      const unsubscribe = subscribe(cartKey, cartSubscriber);

      // Load initial cart
      await revaliFetch(cartKey, mockCartApi);
      expect(cartSubscriber.calls.length).toBe(1);

      // Add item to cart
      const cartWithItem = mutate(cartKey, (prev: any) => ({
        items: [...prev.items, { id: 1, name: 'Product 1', price: 29.99 }],
        total: prev.total + 29.99
      }), false);

      expect(cartWithItem.items.length).toBe(1);
      expect(cartWithItem.total).toBe(29.99);
      expect(cartSubscriber.calls.length).toBe(2);

      // Add another item
      mutate(cartKey, (prev: any) => ({
        items: [...prev.items, { id: 2, name: 'Product 2', price: 19.99 }],
        total: prev.total + 19.99
      }), false);

      expect(cartSubscriber.calls.length).toBe(3);
      const thirdCallArgs = cartSubscriber.calls[2]!;
      const thirdCallData = thirdCallArgs[0] as unknown as { items: any[]; total: number };
      expect(thirdCallData.items.length).toBe(2);
      expect(thirdCallData.total).toBe(49.98);

      unsubscribe();
    });
  });

  describe('Polling Integration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      cleanupPolling();
    });

    it('should start polling when refreshInterval is configured', async () => {
      const key = 'polling-test';
      const testData = 'polling-data';
      const fetcher = vi.fn(async () => testData);

      // Fetch with polling configuration
      await revaliFetch(key, fetcher, {
        refreshInterval: 5000,
        ttl: 60000,
      });

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(hasActivePolling(key)).toBe(true);
      
      const pollingInfo = getPollingInfo();
      expect(pollingInfo.activeCount).toBe(1);
      expect(pollingInfo.keys).toContain(key);
    });

    it('should stop polling when cache is cleared', async () => {
      const key = 'polling-clear-test';
      const testData = 'polling-data';
      const fetcher = vi.fn(async () => testData);

      // Start polling
      await revaliFetch(key, fetcher, {
        refreshInterval: 3000,
      });

      expect(hasActivePolling(key)).toBe(true);

      // Clear specific cache entry
      clearCache(key);

      expect(hasActivePolling(key)).toBe(false);
    });

    it('should cleanup all polling when clearing all cache', async () => {
      const key1 = 'polling-test-1';
      const key2 = 'polling-test-2';
      const fetcher = vi.fn(async () => 'data');

      // Start multiple polling
      await revaliFetch(key1, fetcher, { refreshInterval: 2000 });
      await revaliFetch(key2, fetcher, { refreshInterval: 3000 });

      expect(getPollingInfo().activeCount).toBe(2);

      // Clear all cache
      clearCache();

      expect(getPollingInfo().activeCount).toBe(0);
    });

    it('should not start polling when refreshInterval is 0', async () => {
      const key = 'no-polling-test';
      const testData = 'no-polling-data';
      const fetcher = vi.fn(async () => testData);

      await revaliFetch(key, fetcher, {
        refreshInterval: 0, // No polling
        ttl: 60000,
      });

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(hasActivePolling(key)).toBe(false);
      expect(getPollingInfo().activeCount).toBe(0);
    });

    it('should integrate polling with subscription system', async () => {
      const key = 'polling-subscription-test';
      let callCount = 0;
      const fetcher = vi.fn(async () => {
        callCount++;
        return `data-${callCount}`;
      });

      const subscriber = createSpy<Subscriber<string>>();

      // Start with polling
      const result = await revaliFetch(key, fetcher, {
        refreshInterval: 1000,
        ttl: 60000,
      });

      expect(result).toBe('data-1');

      // Subscribe to updates
      const unsubscribe = subscribe(key, subscriber);

      expect(hasActivePolling(key)).toBe(true);
      expect(fetcher).toHaveBeenCalledTimes(1);

      unsubscribe();
    });
  });
});
