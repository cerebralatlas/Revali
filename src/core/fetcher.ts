// -----------------------------
// Revali: Request Handling & Deduplication
// -----------------------------

import type { Fetcher, RevaliOptions, CacheEntry } from './types.js';
import { DEFAULT_OPTIONS, CancellationError } from './types.js';
import { getCacheEntry, setCacheEntry, ensureCacheSize, isExpired } from './cache.js';
import { notify } from './subscription.js';
import {
  cancellationManager,
  isCancellationError,
  createCancellationError,
} from './cancellation.js';

// ---------- in-flight requests ----------
const inflightRequests = new Map<string, Promise<any>>();

// ---------- request deduplication + error retry ----------

export async function fetchWithDedup<T>(
  key: string,
  fetcher: Fetcher<T>,
  options: RevaliOptions,
): Promise<T> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Handle cancellation on revalidate
  if (mergedOptions.abortOnRevalidate && inflightRequests.has(key)) {
    cancellationManager.cancel(key);
    // Remove from inflight requests to allow new request
    inflightRequests.delete(key);
  }

  // if there is an in-flight request, return the Promise
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key)!;
  }

  const { retries, retryDelay, maxCacheSize, abortTimeout, signal } = mergedOptions;

  // Create AbortController for this request
  const controller = cancellationManager.create(key);

  // Combine signals: controller + timeout + external signal
  const signals: AbortSignal[] = [controller.signal];
  if (abortTimeout && abortTimeout > 0) {
    signals.push(cancellationManager.createTimeoutSignal(abortTimeout));
  }
  if (signal) {
    signals.push(signal);
  }

  const combinedSignal = cancellationManager.combineSignals(...signals);

  const promise = (async (): Promise<T> => {
    let attempt = 0;
    let lastError: Error;

    while (attempt <= retries) {
      try {
        // Check if already cancelled before making request
        if (combinedSignal.aborted) {
          throw createCancellationError(key);
        }

        const result = await fetcher(combinedSignal);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        // Handle cancellation errors - don't retry
        if (isCancellationError(error)) {
          throw createCancellationError(key, error);
        }

        lastError = error;

        if (attempt >= retries) {
          throw lastError;
        }

        attempt++;
        // exponential backoff strategy
        const delay = retryDelay * Math.pow(2, attempt - 1);

        // Use abortable delay
        await new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(resolve, delay);

          const abortHandler = () => {
            clearTimeout(timeoutId);
            reject(createCancellationError(key));
          };

          if (combinedSignal.aborted) {
            clearTimeout(timeoutId);
            reject(createCancellationError(key));
            return;
          }

          combinedSignal.addEventListener('abort', abortHandler, { once: true });
        });
      }
    }

    throw lastError!;
  })();

  inflightRequests.set(key, promise);

  try {
    const result = await promise;

    // ensure cache size is not exceeded
    ensureCacheSize(maxCacheSize);

    // update cache
    const entry: CacheEntry<T> = {
      data: result,
      timestamp: Date.now(),
      fetcher,
      options,
      abortController: controller,
    };

    setCacheEntry(key, entry);
    notify(key);

    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    // Don't cache cancellation errors
    if (!isCancellationError(err)) {
      // even if failed, update cache entry to record error
      const existingEntry = getCacheEntry(key);
      if (existingEntry) {
        existingEntry.error = err;
        existingEntry.timestamp = Date.now();
      } else {
        ensureCacheSize(maxCacheSize);
        setCacheEntry(key, {
          data: undefined,
          timestamp: Date.now(),
          error: err,
          fetcher,
          options,
        });
      }

      notify(key, err);
    }

    throw err;
  } finally {
    inflightRequests.delete(key);
    cancellationManager.cleanup(key);
  }
}

// ---------- core fetch function ----------

export async function revaliFetch<T>(
  key: string,
  fetcher: Fetcher<T>,
  options: RevaliOptions = {},
): Promise<T> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const entry = getCacheEntry(key);

  // if there is no cache or cache is expired, fetch directly
  if (!entry || isExpired(entry)) {
    return fetchWithDedup(key, fetcher, mergedOptions);
  }

  // if there is cache and not expired, return cache data and refresh in background
  if (entry.data !== undefined) {
    // async refresh (stale-while-revalidate)
    setTimeout(() => {
      fetchWithDedup(key, fetcher, mergedOptions).catch(() => {
        // silently handle background refresh error
      });
    }, 0);

    return entry.data as T;
  }

  // if there is only error in cache, fetch again
  return fetchWithDedup(key, fetcher, mergedOptions);
}

// ---------- in-flight requests management ----------

export function hasInflightRequest(key: string): boolean {
  return inflightRequests.has(key);
}

export function getInflightRequestCount(): number {
  return inflightRequests.size;
}

export function clearInflightRequests(): void {
  inflightRequests.clear();
}

// ---------- cancellation management ----------

/**
 * Cancel request for a specific key
 */
export function cancelRequest(key: string): boolean {
  return cancellationManager.cancel(key);
}

/**
 * Cancel all active requests
 */
export function cancelAllRequests(): number {
  return cancellationManager.cancelAll();
}

/**
 * Check if a request is cancelled
 */
export function isRequestCancelled(key: string): boolean {
  const controller = cancellationManager.getController(key);
  return controller?.signal.aborted ?? false;
}
