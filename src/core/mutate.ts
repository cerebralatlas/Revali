// -----------------------------
// Revali: Cache Mutation
// -----------------------------

import { DEFAULT_OPTIONS } from './types.js';
import { getCacheEntry, setCacheEntry } from './cache.js';
import { notify } from './subscription.js';
import { fetchWithDedup } from './fetcher.js';

/**
 * manually update cache data
 */
export function mutate<T>(
  key: string,
  data: T | ((prev: T | undefined) => T),
  shouldRevalidate = true,
): T {
  const entry = getCacheEntry(key);
  const prevData = entry?.data;

  const newData = typeof data === 'function' ? (data as Function)(prevData) : data;

  if (entry) {
    // update existing entry
    entry.data = newData;
    entry.timestamp = Date.now();
    delete entry.error; // clear previous error
  } else {
    // create new entry (using default options)
    setCacheEntry(key, {
      data: newData,
      timestamp: Date.now(),
      fetcher: () => Promise.resolve(newData),
      options: DEFAULT_OPTIONS,
    });
  }

  notify(key);

  // optionally trigger revalidation
  if (shouldRevalidate && entry?.fetcher) {
    setTimeout(() => {
      fetchWithDedup(key, entry.fetcher, entry.options).catch(() => {
        // silently handle revalidation error
      });
    }, 0);
  }

  return newData;
}
