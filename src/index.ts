// -----------------------------
// Revali: Framework-agnostic SWR library
// Main entry point - exports only
// -----------------------------

// ---------- Type Exports ----------
export type { Fetcher, Subscriber, RevaliOptions, CacheEntry, RevaliState } from './core/types.js';

export { DEFAULT_OPTIONS } from './core/types.js';

// ---------- Core API Exports ----------
export { revaliFetch } from './core/fetcher.js';
export { subscribe } from './core/subscription.js';
export { clearCache, getCacheInfo } from './core/cache.js';
export { mutate } from './core/mutate.js';
export { cleanup } from './core/cleanup.js';

// ---------- Utility Exports ----------
export { initAutoRevalidation, triggerRevalidation } from './core/revalidation.js';

// ---------- Auto-initialization ----------
import { initAutoRevalidation } from './core/revalidation.js';

// automatically initialize revalidation listener
initAutoRevalidation();
