// -----------------------------
// Unit Tests: Fetcher Module
// -----------------------------

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchWithDedup,
  revaliFetch,
  hasInflightRequest,
  getInflightRequestCount,
  clearInflightRequests
} from '../../src/core/fetcher.js';
import { setCacheEntry, getCacheEntry, clearCache } from '../../src/core/cache.js';
import { subscribe, clearSubscribers } from '../../src/core/subscription.js';
import { DEFAULT_OPTIONS } from '../../src/core/types.js';
import { createSpy, expectThrowsAsync } from '../utils/test-helpers.js';
import type { CacheEntry, Subscriber } from '../../src/core/types.js';

describe('Fetcher Module', () => {
  beforeEach(() => {
    clearCache();
    clearSubscribers();
    clearInflightRequests();
    vi.clearAllMocks();
  });

  describe('Basic Fetching', () => {
    it('should fetch data successfully', async () => {
      const key = 'test-key';
      const testData = 'test-data';
      const fetcher = vi.fn(async () => testData);

      const result = await fetchWithDedup(key, fetcher, DEFAULT_OPTIONS);

      expect(result).toBe(testData);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch errors', async () => {
      const key = 'test-key';
      const errorMessage = 'Fetch failed';
      const fetcher = vi.fn(async () => {
        throw new Error(errorMessage);
      });

      await expectThrowsAsync(() => fetchWithDedup(key, fetcher, DEFAULT_OPTIONS), errorMessage);
      expect(fetcher).toHaveBeenCalledTimes(3); // 1 original + 2 retries
    });

    it('should update cache on success', async () => {
      const key = 'test-key';
      const testData = 'test-data';
      const fetcher = vi.fn(async () => testData);

      await fetchWithDedup(key, fetcher, DEFAULT_OPTIONS);

      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry?.data).toBe(testData);
      expect(cacheEntry?.error).toBeUndefined();
    });

    it('should update cache with error on failure', async () => {
      const key = 'test-key';
      const errorMessage = 'Fetch failed';
      const fetcher = vi.fn(async () => {
        throw new Error(errorMessage);
      });

      await expectThrowsAsync(() => fetchWithDedup(key, fetcher, DEFAULT_OPTIONS));

      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry?.data).toBeUndefined();
      expect(cacheEntry?.error?.message).toBe(errorMessage);
    });
  });

  describe('Request Deduplication', () => {
    it('should deduplicate concurrent requests', async () => {
      const key = 'test-key';
      const testData = 'test-data';
      let callCount = 0;
      const fetcher = vi.fn(async () => {
        callCount++;
        return `${testData}-${callCount}`;
      });

      // Start multiple concurrent requests
      const promises = [
        fetchWithDedup(key, fetcher, DEFAULT_OPTIONS),
        fetchWithDedup(key, fetcher, DEFAULT_OPTIONS),
        fetchWithDedup(key, fetcher, DEFAULT_OPTIONS)
      ];

      expect(hasInflightRequest(key)).toBe(true);
      expect(getInflightRequestCount()).toBe(1);

      const results = await Promise.all(promises);

      // All should return the same result (deduplication worked)
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
      expect(fetcher).toHaveBeenCalledTimes(1); // Only one actual request due to deduplication
      expect(hasInflightRequest(key)).toBe(false);
    });

    it('should allow separate requests for different keys', async () => {
      const fetcher1 = vi.fn(async () => 'data1');
      const fetcher2 = vi.fn(async () => 'data2');

      const [result1, result2] = await Promise.all([
        fetchWithDedup('key1', fetcher1, DEFAULT_OPTIONS),
        fetchWithDedup('key2', fetcher2, DEFAULT_OPTIONS)
      ]);

      expect(result1).toBe('data1');
      expect(result2).toBe('data2');
      expect(fetcher1).toHaveBeenCalled();
      expect(fetcher2).toHaveBeenCalled();
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed requests', async () => {
      const key = 'test-key';
      let attempts = 0;
      const fetcher = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return 'success';
      });

      const result = await fetchWithDedup(key, fetcher, { ...DEFAULT_OPTIONS, retries: 2 });

      expect(result).toBe('success');
      expect(fetcher).toHaveBeenCalledTimes(3);
    });

    it('should respect retry count', async () => {
      const key = 'test-key';
      const fetcher = vi.fn(async () => {
        throw new Error('Always fails');
      });

      await expectThrowsAsync(() => 
        fetchWithDedup(key, fetcher, { ...DEFAULT_OPTIONS, retries: 1 })
      );

      expect(fetcher).toHaveBeenCalledTimes(2); // 1 original + 1 retry
    });

    it('should handle zero retries', async () => {
      const key = 'test-key';
      const fetcher = vi.fn(async () => {
        throw new Error('Immediate failure');
      });

      await expectThrowsAsync(() => 
        fetchWithDedup(key, fetcher, { ...DEFAULT_OPTIONS, retries: 0 })
      );

      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('Subscription Notifications', () => {
    it('should notify subscribers on success', async () => {
      const key = 'test-key';
      const testData = 'test-data';
      const fetcher = vi.fn(async () => testData);
      const subscriber = createSpy<Subscriber<string>>();

      subscribe(key, subscriber);
      await fetchWithDedup(key, fetcher, DEFAULT_OPTIONS);

      expect(subscriber.calls.length).toBe(1);
      expect(subscriber.calls[0]![0]).toBe(testData);
      expect(subscriber.calls[0]![1]).toBeUndefined();
    });

    it('should notify subscribers on error', async () => {
      const key = 'test-key';
      const errorMessage = 'Fetch error';
      const fetcher = vi.fn(async () => {
        throw new Error(errorMessage);
      });
      const subscriber = createSpy<Subscriber<string>>();

      subscribe(key, subscriber);
      await expectThrowsAsync(() => fetchWithDedup(key, fetcher, DEFAULT_OPTIONS));

      expect(subscriber.calls.length).toBe(1);
      expect(subscriber.calls[0]![0]).toBeUndefined();
      expect((subscriber.calls[0]![1] as unknown as Error)?.message).toBe(errorMessage);
    });
  });

  describe('revaliFetch SWR Logic', () => {
    it('should fetch when no cache exists', async () => {
      const key = 'test-key';
      const testData = 'test-data';
      const fetcher = vi.fn(async () => testData);

      const result = await revaliFetch(key, fetcher, DEFAULT_OPTIONS);

      expect(result).toBe(testData);
      expect(fetcher).toHaveBeenCalled();
    });

    it('should fetch when cache is expired', async () => {
      const key = 'test-key';
      const oldData = 'old-data';
      const newData = 'new-data';

      // Set expired cache
      const expiredEntry: CacheEntry<string> = {
        data: oldData,
        timestamp: Date.now() - 10000,
        fetcher: async () => oldData,
        options: { ...DEFAULT_OPTIONS, ttl: 5000 }
      };
      setCacheEntry(key, expiredEntry);

      const fetcher = vi.fn(async () => newData);
      const result = await revaliFetch(key, fetcher, DEFAULT_OPTIONS);

      expect(result).toBe(newData);
      expect(fetcher).toHaveBeenCalled();
    });

    it('should return cached data immediately when valid', async () => {
      const key = 'test-key';
      const cachedData = 'cached-data';

      // Set valid cache
      const validEntry: CacheEntry<string> = {
        data: cachedData,
        timestamp: Date.now() - 1000,
        fetcher: async () => cachedData,
        options: { ...DEFAULT_OPTIONS, ttl: 5000 }
      };
      setCacheEntry(key, validEntry);

      const fetcher = vi.fn(async () => 'fresh-data');
      const result = await revaliFetch(key, fetcher, DEFAULT_OPTIONS);

      // Should return cached data immediately
      expect(result).toBe(cachedData);
    });

    it('should fetch when cache has only error', async () => {
      const key = 'test-key';
      const newData = 'recovered-data';

      // Set error cache
      const errorEntry: CacheEntry<string> = {
        data: undefined,
        timestamp: Date.now(),
        error: new Error('Previous error'),
        fetcher: async () => { throw new Error('Previous error'); },
        options: DEFAULT_OPTIONS
      };
      setCacheEntry(key, errorEntry);

      const fetcher = vi.fn(async () => newData);
      const result = await revaliFetch(key, fetcher, DEFAULT_OPTIONS);

      expect(result).toBe(newData);
      expect(fetcher).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined return value', async () => {
      const key = 'test-key';
      const fetcher = vi.fn(async () => undefined);

      const result = await fetchWithDedup(key, fetcher, DEFAULT_OPTIONS);
      expect(result).toBeUndefined();

      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry?.data).toBeUndefined();
      expect(cacheEntry?.error).toBeUndefined();
    });

    it('should handle null return value', async () => {
      const key = 'test-key';
      const fetcher = vi.fn(async () => null);

      const result = await fetchWithDedup(key, fetcher, DEFAULT_OPTIONS);
      expect(result).toBeNull();

      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry?.data).toBeNull();
    });

    it('should handle non-Error exceptions', async () => {
      const key = 'test-key';
      const fetcher = vi.fn(async () => {
        throw 'String error';
      });

      await expectThrowsAsync(() => fetchWithDedup(key, fetcher, DEFAULT_OPTIONS));

      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry?.error?.message).toBe('String error');
    });

    it('should handle complex data types', async () => {
      const key = 'test-key';
      const complexData = {
        user: { id: 1, name: 'John' },
        items: [1, 2, 3],
        date: new Date()
      };
      const fetcher = vi.fn(async () => complexData);

      const result = await fetchWithDedup(key, fetcher, DEFAULT_OPTIONS);
      expect(result).toEqual(complexData);

      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry?.data).toEqual(complexData);
    });
  });

  describe('Request Cancellation', () => {
    it('should cancel requests using AbortSignal', async () => {
      const key = 'cancel-test';
      const controller = new AbortController();
      
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve('data'), 100);
          
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      const promise = fetchWithDedup(key, fetcher, { signal: controller.signal });
      
      // Cancel after 10ms
      setTimeout(() => controller.abort(), 10);

      await expect(promise).rejects.toThrow('Request for "cancel-test" was cancelled');
      expect(fetcher).toHaveBeenCalledWith(expect.any(AbortSignal));
    });

    it('should handle timeout cancellation', async () => {
      const key = 'timeout-test';
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve('data'), 200);
          
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      const promise = fetchWithDedup(key, fetcher, { abortTimeout: 50 });

      await expect(promise).rejects.toThrow('Request for "timeout-test" was cancelled');
    });

    it('should cancel on revalidate when abortOnRevalidate is true', async () => {
      const key = 'revalidate-cancel-test';
      let callCount = 0;
      
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        callCount++;
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve(`data-${callCount}`), 100);
          
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      // Start first request
      const promise1 = fetchWithDedup(key, fetcher, { abortOnRevalidate: true });
      
      // Start second request (should cancel first)
      setTimeout(() => {
        fetchWithDedup(key, fetcher, { abortOnRevalidate: true }).catch(() => {});
      }, 10);

      await expect(promise1).rejects.toThrow();
      expect(callCount).toBe(2);
    });

    it('should not retry cancelled requests', async () => {
      const key = 'no-retry-cancel-test';
      const controller = new AbortController();
      
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        throw new Error('Network error');
      });

      const promise = fetchWithDedup(key, fetcher, { 
        signal: controller.signal,
        retries: 3
      });
      
      controller.abort();

      await expect(promise).rejects.toThrow('Request for "no-retry-cancel-test" was cancelled');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should not cache cancellation errors', async () => {
      const key = 'no-cache-cancel-test';
      const controller = new AbortController();
      
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve('data'), 100);
          
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      controller.abort();

      await expect(fetchWithDedup(key, fetcher, { signal: controller.signal }))
        .rejects.toThrow();

      const cacheEntry = getCacheEntry(key);
      expect(cacheEntry).toBeUndefined();
    });

    it('should combine multiple abort signals', async () => {
      const key = 'multi-signal-test';
      const controller1 = new AbortController();
      const controller2 = new AbortController();
      
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve('data'), 100);
          
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      const promise = fetchWithDedup(key, fetcher, { 
        signal: controller1.signal,
        abortTimeout: 200
      });
      
      // Abort external signal
      setTimeout(() => controller2.abort(), 10);

      // Should not be cancelled yet since controller1 is not aborted
      setTimeout(() => controller1.abort(), 20);

      await expect(promise).rejects.toThrow();
    });
  });

  describe('Cancellation API', () => {
    it('should cancel specific requests', async () => {
      const { cancelRequest } = await import('../../src/core/fetcher.js');
      
      const key = 'api-cancel-test';
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve('data'), 100);
          
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      const promise = fetchWithDedup(key, fetcher, DEFAULT_OPTIONS);
      
      setTimeout(() => {
        const cancelled = cancelRequest(key);
        expect(cancelled).toBe(true);
      }, 10);

      await expect(promise).rejects.toThrow();
    });

    it('should cancel all requests', async () => {
      const { cancelAllRequests } = await import('../../src/core/fetcher.js');
      
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve('data'), 100);
          
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      const promises = [
        fetchWithDedup('key1', fetcher, DEFAULT_OPTIONS),
        fetchWithDedup('key2', fetcher, DEFAULT_OPTIONS),
        fetchWithDedup('key3', fetcher, DEFAULT_OPTIONS)
      ];
      
      setTimeout(() => {
        const cancelledCount = cancelAllRequests();
        expect(cancelledCount).toBe(3);
      }, 10);

      await Promise.allSettled(promises);
      
      for (const promise of promises) {
        await expect(promise).rejects.toThrow();
      }
    });

    it('should check if request is cancelled', async () => {
      const { isRequestCancelled, cancelRequest } = await import('../../src/core/fetcher.js');
      
      const key = 'check-cancel-test';
      const fetcher = vi.fn(async () => 'data');

      expect(isRequestCancelled(key)).toBe(false);

      const promise = fetchWithDedup(key, fetcher, DEFAULT_OPTIONS);
      
      setTimeout(() => {
        cancelRequest(key);
        expect(isRequestCancelled(key)).toBe(true);
      }, 10);

      await promise.catch(() => {});
    });
  });
});
