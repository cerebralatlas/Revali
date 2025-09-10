// -----------------------------
// Revali: Auto Revalidation
// -----------------------------

import { getAllCacheEntries } from './cache.js';
import { fetchWithDedup } from './fetcher.js';
import { initPollingListeners } from './polling.js';

/**
 * revalidate all eligible cache entries
 */
function revalidateAll() {
  const currentTime = Date.now();

  // get all cache entries for revalidation
  const allEntries = getAllCacheEntries();

  allEntries.forEach((entry, key) => {
    // only revalidate entries with the corresponding options
    const shouldRevalidate = entry.options.revalidateOnFocus || entry.options.revalidateOnReconnect;

    if (shouldRevalidate && entry.fetcher) {
      // avoid too frequent revalidation (at least 1 second interval)
      if (currentTime - entry.timestamp > 1000) {
        fetchWithDedup(key, entry.fetcher, entry.options).catch(() => {
          // silently handle revalidation error
        });
      }
    }
  });
}

// debounce variable
let lastFocusTime = 0;
let lastOnlineTime = 0;

/**
 * initialize auto revalidation listener
 */
export function initAutoRevalidation(): void {
  if (typeof window === 'undefined') return;

  // revalidate when window is focused
  window.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      const now = Date.now();
      // avoid too frequent revalidation
      if (now - lastFocusTime > 5000) {
        lastFocusTime = now;
        revalidateAll();
      }
    }
  });

  // revalidate when network is reconnected
  window.addEventListener('online', () => {
    const now = Date.now();
    // avoid too frequent revalidation
    if (now - lastOnlineTime > 5000) {
      lastOnlineTime = now;
      revalidateAll();
    }
  });

  // initialize polling listeners for page visibility and network status
  initPollingListeners();
}

/**
 * manually trigger revalidation
 */
export function triggerRevalidation(): void {
  revalidateAll();
}
