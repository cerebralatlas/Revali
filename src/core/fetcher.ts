// -----------------------------
// Revali: Request Handling & Deduplication
// -----------------------------

import type { Fetcher, RevaliOptions, CacheEntry } from './types.js';
import { DEFAULT_OPTIONS } from './types.js';
import { getCacheEntry, setCacheEntry, ensureCacheSize, isExpired } from './cache.js';
import { notify } from './subscription.js';

// ---------- in-flight requests ----------
const inflightRequests = new Map<string, Promise<any>>();

// ---------- request deduplication + error retry ----------

export async function fetchWithDedup<T>(
  key: string,
  fetcher: Fetcher<T>,
  options: RevaliOptions,
): Promise<T> {
  // if there is an in-flight request, return the Promise
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key)!;
  }

  const { retries, retryDelay, maxCacheSize } = { ...DEFAULT_OPTIONS, ...options };

  const promise = (async (): Promise<T> => {
    let attempt = 0;
    let lastError: Error;

    while (attempt <= retries) {
      try {
        const result = await fetcher();
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt >= retries) {
          throw lastError;
        }

        attempt++;
        // exponential backoff strategy
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
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
    };

    setCacheEntry(key, entry);
    notify(key);

    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

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
    throw err;
  } finally {
    inflightRequests.delete(key);
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
