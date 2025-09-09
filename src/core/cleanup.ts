// -----------------------------
// Revali: Cleanup Utilities
// -----------------------------

import { clearCache } from './cache.js';
import { clearSubscribers } from './subscription.js';

/**
 * clean up all cache and subscribers
 */
export function cleanup(): void {
  clearCache();
  clearSubscribers();
}
