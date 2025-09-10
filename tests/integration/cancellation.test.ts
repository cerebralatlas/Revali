// -----------------------------
// Integration Tests: Cancellation Features
// -----------------------------

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  revaliFetch,
  cancel,
  cancelAll,
  isCancelled,
  getCancellationInfo,
  isCancellationError,
  CancellationError,
  clearCache,
  subscribe,
  type Subscriber,
} from '../../src/index.js';
import { sleep } from '../utils/test-helpers.js';

describe('Integration Tests: Cancellation', () => {
  beforeEach(() => {
    clearCache();
    cancelAll();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cancelAll();
  });

  describe('Basic Cancellation Flow', () => {
    it('should cancel requests and handle errors properly', async () => {
      const key = 'integration-cancel-test';
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve({ data: 'test' }), 100);
          
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      const promise = revaliFetch(key, fetcher);
      
      // Cancel after 10ms
      setTimeout(() => {
        const cancelled = cancel(key);
        expect(cancelled).toBe(true);
      }, 10);

      await expect(promise).rejects.toThrow(CancellationError);
      expect(fetcher).toHaveBeenCalledWith(expect.any(AbortSignal));
    });

    it('should handle timeout cancellation in real scenarios', async () => {
      const key = 'timeout-integration-test';
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve({ data: 'slow response' }), 200);
          
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      const promise = revaliFetch(key, fetcher, { 
        abortTimeout: 50 
      });

      await expect(promise).rejects.toThrow(CancellationError);
    });

    it('should cancel multiple requests simultaneously', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve('data'), 100);
          
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      const promises = keys.map(key => revaliFetch(key, fetcher));
      
      setTimeout(() => {
        const cancelledCount = cancelAll();
        expect(cancelledCount).toBe(3);
      }, 10);

      const results = await Promise.allSettled(promises);
      
      results.forEach(result => {
        expect(result.status).toBe('rejected');
        if (result.status === 'rejected') {
          expect(isCancellationError(result.reason)).toBe(true);
        }
      });
    });
  });

  describe('Cancellation with Subscriptions', () => {
    it('should not notify subscribers when request is cancelled', async () => {
      const key = 'subscription-cancel-test';
      const subscriber = vi.fn();
      
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve('data'), 100);
          
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      const unsubscribe = subscribe(key, subscriber);
      
      const promise = revaliFetch(key, fetcher);
      
      setTimeout(() => cancel(key), 10);
      
      await expect(promise).rejects.toThrow();
      
      // Subscriber should not be called for cancelled requests
      expect(subscriber).not.toHaveBeenCalled();
      
      unsubscribe();
    });

    it('should handle error notifications for cancelled requests properly', async () => {
      const key = 'error-notification-cancel-test';
      const errorSubscriber = vi.fn();
      
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve('data'), 100);
          
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      const unsubscribe = subscribe(key, errorSubscriber);
      
      const promise = revaliFetch(key, fetcher);
      cancel(key);
      
      await expect(promise).rejects.toThrow();
      
      // Error subscriber should not be called for cancellation errors
      expect(errorSubscriber).not.toHaveBeenCalled();
      
      unsubscribe();
    });
  });

  describe('Cancellation with Cache Management', () => {
    it('should not cache cancelled requests', async () => {
      const key = 'no-cache-integration-test';
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve('data'), 100);
          
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      const promise = revaliFetch(key, fetcher);
      cancel(key);
      
      await expect(promise).rejects.toThrow();
      
      // Try to fetch again - should make a new request
      const fetcher2 = vi.fn(async () => 'new data');
      const result = await revaliFetch(key, fetcher2);
      
      expect(result).toBe('new data');
      expect(fetcher2).toHaveBeenCalled();
    });

    it('should handle cache clearing with active requests', async () => {
      const keys = ['cache-clear-1', 'cache-clear-2'];
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve('data'), 100);
          
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      const promises = keys.map(key => revaliFetch(key, fetcher));
      
      // Clear cache should cancel active requests
      setTimeout(() => clearCache(), 10);
      
      const results = await Promise.allSettled(promises);
      
      results.forEach(result => {
        expect(result.status).toBe('rejected');
      });
    });
  });

  describe('Advanced Cancellation Scenarios', () => {
    it('should handle cancellation on revalidate', async () => {
      const key = 'revalidate-cancel-integration';
      let requestCount = 0;
      
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        requestCount++;
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve(`data-${requestCount}`), 100);
          
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      // First request
      const promise1 = revaliFetch(key, fetcher, { abortOnRevalidate: true });
      
      // Second request should cancel first
      setTimeout(() => {
        revaliFetch(key, fetcher, { abortOnRevalidate: true }).catch(() => {});
      }, 10);
      
      await expect(promise1).rejects.toThrow();
      expect(requestCount).toBe(2);
    });

    it('should handle external AbortController', async () => {
      const key = 'external-controller-test';
      const externalController = new AbortController();
      
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve('data'), 100);
          
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      const promise = revaliFetch(key, fetcher, { 
        signal: externalController.signal 
      });
      
      setTimeout(() => externalController.abort(), 10);
      
      await expect(promise).rejects.toThrow();
    });

    it('should combine timeout and external signals', async () => {
      const key = 'combined-signals-test';
      const externalController = new AbortController();
      
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve('data'), 200);
          
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      const promise = revaliFetch(key, fetcher, { 
        signal: externalController.signal,
        abortTimeout: 150
      });
      
      // External signal should trigger first
      setTimeout(() => externalController.abort(), 50);
      
      await expect(promise).rejects.toThrow();
    });
  });

  describe('Cancellation Info and Status', () => {
    it('should provide accurate cancellation information', async () => {
      const keys = ['info-test-1', 'info-test-2'];
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        await sleep(100);
        return 'data';
      });

      // Start requests
      const promises = keys.map(key => revaliFetch(key, fetcher));
      
      await sleep(10);
      
      const info = getCancellationInfo();
      expect(info.activeCount).toBe(2);
      expect(info.keys).toEqual(expect.arrayContaining(keys));
      
      // Cancel one
      cancel(keys[0]!);
      expect(isCancelled(keys[0]!)).toBe(true);
      expect(isCancelled(keys[1]!)).toBe(false);
      
      // Cancel all
      const cancelledCount = cancelAll();
      expect(cancelledCount).toBe(1); // Only one remaining
      
      keys.forEach(key => {
        expect(isCancelled(key)).toBe(true);
      });
      
      await Promise.allSettled(promises);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle fetcher that throws immediately', async () => {
      const key = 'immediate-error-test';
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        if (signal?.aborted) {
          throw new DOMException('Already aborted', 'AbortError');
        }
        throw new Error('Immediate error');
      });

      const promise = revaliFetch(key, fetcher);
      
      // Cancel immediately
      cancel(key);
      
      await expect(promise).rejects.toThrow();
    });

    it('should handle rapid cancel/recreate cycles', async () => {
      const key = 'rapid-cycle-test';
      const fetcher = vi.fn(async (signal?: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve('data'), 50);
          
          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      });

      for (let i = 0; i < 10; i++) {
        const promise = revaliFetch(key, fetcher);
        cancel(key);
        
        await expect(promise).rejects.toThrow();
        await sleep(1);
      }
      
      // Final request should succeed
      const finalResult = await revaliFetch(key, fetcher);
      expect(finalResult).toBe('data');
    });
  });
});
