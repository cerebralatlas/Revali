// -----------------------------
// Revali: Polling Management
// -----------------------------

import type { RevaliOptions } from './types.js';
import { getAllCacheEntries } from './cache.js';
import { fetchWithDedup } from './fetcher.js';

// ---------- polling task interface ----------

interface PollingTask {
  key: string;
  intervalId: ReturnType<typeof setInterval>;
  options: RevaliOptions;
  lastPolledTime: number;
  isPaused: boolean;
}

// ---------- global polling state ----------

const pollingTasks = new Map<string, PollingTask>();
let isPageHidden = false;
let isOffline = false;

// ---------- core polling functions ----------

/**
 * Start polling for a specific cache key
 */
export function startPolling(key: string, options: RevaliOptions): void {
  // Stop existing polling task if any
  stopPolling(key);

  const { refreshInterval, refreshWhenHidden, refreshWhenOffline, dedupingInterval } = options;

  // Skip if polling is disabled
  if (!refreshInterval || refreshInterval <= 0) {
    return;
  }

  // Create polling task
  const intervalId = setInterval(() => {
    const task = pollingTasks.get(key);
    if (!task) return;

    // Check if polling should be paused
    if (shouldPausePolling(task)) {
      return;
    }

    // Check deduping interval to avoid too frequent requests
    const now = Date.now();
    if (now - task.lastPolledTime < (dedupingInterval || 0)) {
      return;
    }

    // Get current cache entry and trigger revalidation
    const entries = getAllCacheEntries();
    const entry = entries.get(key);

    if (entry && entry.fetcher) {
      task.lastPolledTime = now;

      // Trigger background revalidation
      fetchWithDedup(key, entry.fetcher, entry.options).catch(() => {
        // Silently handle polling errors
      });
    }
  }, refreshInterval);

  // Store polling task
  const task: PollingTask = {
    key,
    intervalId,
    options,
    lastPolledTime: Date.now(),
    isPaused: false,
  };

  pollingTasks.set(key, task);
}

/**
 * Stop polling for a specific cache key
 */
export function stopPolling(key: string): void {
  const task = pollingTasks.get(key);
  if (task) {
    clearInterval(task.intervalId);
    pollingTasks.delete(key);
  }
}

/**
 * Check if polling should be paused for a task
 */
function shouldPausePolling(task: PollingTask): boolean {
  const { refreshWhenHidden, refreshWhenOffline } = task.options;

  // Pause if page is hidden and refreshWhenHidden is false
  if (isPageHidden && !refreshWhenHidden) {
    return true;
  }

  // Pause if offline and refreshWhenOffline is false
  if (isOffline && !refreshWhenOffline) {
    return true;
  }

  return false;
}

/**
 * Pause all polling tasks
 */
export function pauseAllPolling(): void {
  pollingTasks.forEach((task) => {
    task.isPaused = true;
  });
}

/**
 * Resume all polling tasks
 */
export function resumeAllPolling(): void {
  pollingTasks.forEach((task) => {
    task.isPaused = false;
  });
}

/**
 * Clean up all polling tasks
 */
export function cleanupPolling(): void {
  pollingTasks.forEach((task) => {
    clearInterval(task.intervalId);
  });
  pollingTasks.clear();
}

/**
 * Get information about active polling tasks
 */
export function getPollingInfo(): { activeCount: number; keys: string[] } {
  return {
    activeCount: pollingTasks.size,
    keys: Array.from(pollingTasks.keys()),
  };
}

/**
 * Check if a key has active polling
 */
export function hasActivePolling(key: string): boolean {
  return pollingTasks.has(key);
}

// ---------- page visibility and network status handlers ----------

/**
 * Handle page visibility changes
 */
function handleVisibilityChange(): void {
  if (typeof document === 'undefined') return;

  isPageHidden = document.hidden;

  if (!isPageHidden) {
    // Page became visible, resume polling for eligible tasks
    resumeAllPolling();
  }
}

/**
 * Handle network status changes
 */
function handleOnlineStatusChange(): void {
  isOffline = !navigator.onLine;

  if (!isOffline) {
    // Network came back online, resume polling for eligible tasks
    resumeAllPolling();
  }
}

/**
 * Initialize polling-related event listeners
 */
export function initPollingListeners(): void {
  if (typeof window === 'undefined') return;

  // Listen for page visibility changes
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  // Listen for network status changes
  window.addEventListener('online', handleOnlineStatusChange);
  window.addEventListener('offline', handleOnlineStatusChange);

  // Initialize current states
  if (typeof document !== 'undefined') {
    isPageHidden = document.hidden;
  }
  if (typeof navigator !== 'undefined') {
    isOffline = !navigator.onLine;
  }
}

/**
 * Remove polling-related event listeners
 */
export function removePollingListeners(): void {
  if (typeof window === 'undefined') return;

  if (typeof document !== 'undefined' && document.removeEventListener) {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }
  window.removeEventListener('online', handleOnlineStatusChange);
  window.removeEventListener('offline', handleOnlineStatusChange);
}
