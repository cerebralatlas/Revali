// -----------------------------
// Revali: Framework-agnostic SWR library
// Main entry point - exports only
// -----------------------------

// ---------- Type Exports ----------
export type { Fetcher, Subscriber, RevaliOptions, CacheEntry, RevaliState } from './core/types.js';

export { DEFAULT_OPTIONS, CancellationError } from './core/types.js';

// ---------- Core API Exports ----------
export { revaliFetch } from './core/fetcher.js';
export { subscribe } from './core/subscription.js';
export { clearCache, getCacheInfo } from './core/cache.js';
export { mutate } from './core/mutate.js';
export { cleanup } from './core/cleanup.js';

// ---------- Utility Exports ----------
export { initAutoRevalidation, triggerRevalidation } from './core/revalidation.js';

// ---------- Polling Exports ----------
export { getPollingInfo, hasActivePolling, cleanupPolling } from './core/polling.js';

// ---------- Cancellation Exports ----------
export { 
  cancel, 
  cancelAll, 
  isCancelled, 
  getCancellationInfo, 
  isCancellationError 
} from './core/cancellation.js';
export { 
  cancelRequest, 
  cancelAllRequests, 
  isRequestCancelled 
} from './core/fetcher.js';

// ---------- Auto-initialization ----------
import { initAutoRevalidation } from './core/revalidation.js';

// automatically initialize revalidation listener
initAutoRevalidation();
