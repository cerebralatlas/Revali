// -----------------------------
// Revali: Cache Management
// -----------------------------

import type { CacheEntry } from './types.js';

// ---------- global cache state ----------
const cache = new Map<string, CacheEntry<any>>();

// ---------- cache operations ----------

export function getCacheEntry<T>(key: string): CacheEntry<T> | undefined {
  return cache.get(key);
}

export function setCacheEntry<T>(key: string, entry: CacheEntry<T>): void {
  cache.set(key, entry);
}

export function deleteCacheEntry(key: string): boolean {
  return cache.delete(key);
}

export function hasCacheEntry(key: string): boolean {
  return cache.has(key);
}

export function getAllCacheEntries(): Map<string, CacheEntry<any>> {
  return new Map(cache);
}

// ---------- cache management ----------

export function isExpired(entry: CacheEntry<any>): boolean {
  if (entry.options.ttl === 0) return false; // never expire
  return Date.now() - entry.timestamp > entry.options.ttl!;
}

export function evictOldestEntry(): void {
  let oldestKey: string | null = null;
  let oldestTimestamp = Date.now();

  for (const [key, entry] of cache.entries()) {
    if (entry.timestamp < oldestTimestamp) {
      oldestTimestamp = entry.timestamp;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    cache.delete(oldestKey);
  }
}

export function ensureCacheSize(maxSize: number): void {
  while (cache.size > maxSize) {
    evictOldestEntry();
  }
}

// ---------- cache cleanup and information ----------

export function clearCache(key?: string): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

export function getCacheInfo(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
