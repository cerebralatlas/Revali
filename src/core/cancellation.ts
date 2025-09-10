// -----------------------------
// Revali: Request Cancellation Management
// -----------------------------

import { CancellationError } from './types.js';

// ---------- AbortController Management ----------

class CancellationManager {
  private controllers = new Map<string, AbortController>();
  private cancelledKeys = new Set<string>();

  /**
   * Create a new AbortController for a key
   */
  create(key: string): AbortController {
    // Cancel existing controller if any
    this.cancel(key);
    // Remove from cancelled keys when creating new controller
    this.cancelledKeys.delete(key);

    const controller = new AbortController();
    this.controllers.set(key, controller);
    return controller;
  }

  /**
   * Cancel request for a specific key
   */
  cancel(key: string): boolean {
    const controller = this.controllers.get(key);
    if (controller && !controller.signal.aborted) {
      controller.abort();
      this.cancelledKeys.add(key);
      this.controllers.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Cancel all active requests
   */
  cancelAll(): number {
    let cancelledCount = 0;
    for (const [key, controller] of this.controllers.entries()) {
      if (!controller.signal.aborted) {
        controller.abort();
        this.cancelledKeys.add(key);
        cancelledCount++;
      }
    }
    this.controllers.clear();
    return cancelledCount;
  }

  /**
   * Clean up controller for a key (without cancelling)
   */
  cleanup(key: string): void {
    this.controllers.delete(key);
  }

  /**
   * Check if a key has an active controller
   */
  hasController(key: string): boolean {
    const controller = this.controllers.get(key);
    return controller !== undefined && !controller.signal.aborted;
  }

  /**
   * Get controller for a key
   */
  getController(key: string): AbortController | undefined {
    return this.controllers.get(key);
  }

  /**
   * Get count of active controllers
   */
  getActiveCount(): number {
    let count = 0;
    for (const controller of this.controllers.values()) {
      if (!controller.signal.aborted) {
        count++;
      }
    }
    return count;
  }

  /**
   * Create a timeout signal
   */
  createTimeoutSignal(timeout: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    }, timeout);
    return controller.signal;
  }

  /**
   * Combine multiple AbortSignals into one
   */
  combineSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
    const controller = new AbortController();
    const validSignals = signals.filter((signal): signal is AbortSignal => signal !== undefined);

    // If any signal is already aborted, abort immediately
    for (const signal of validSignals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
    }

    // Listen for abort events on all signals
    const abortHandler = () => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    };

    for (const signal of validSignals) {
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    return controller.signal;
  }
}

// ---------- Global Instance ----------

export const cancellationManager = new CancellationManager();

// ---------- Public API ----------

/**
 * Cancel request for a specific key
 */
export function cancel(key: string): boolean {
  return cancellationManager.cancel(key);
}

/**
 * Cancel all active requests
 */
export function cancelAll(): number {
  return cancellationManager.cancelAll();
}

/**
 * Check if a key has been cancelled
 */
export function isCancelled(key: string): boolean {
  // Check if key is in cancelled keys set
  return cancellationManager['cancelledKeys'].has(key);
}

/**
 * Get information about active cancellation controllers
 */
export function getCancellationInfo(): { activeCount: number; keys: string[] } {
  const keys: string[] = [];
  for (const [key, controller] of cancellationManager['controllers'].entries()) {
    if (!controller.signal.aborted) {
      keys.push(key);
    }
  }
  return {
    activeCount: keys.length,
    keys,
  };
}

/**
 * Check if an error is a cancellation error
 */
export function isCancellationError(error: unknown): error is CancellationError | DOMException {
  if (error instanceof CancellationError) {
    return true;
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  return false;
}

/**
 * Create a cancellation error from an abort error
 */
export function createCancellationError(key: string, originalError?: Error): CancellationError {
  return new CancellationError(
    `Request for "${key}" was cancelled${originalError ? `: ${originalError.message}` : ''}`,
  );
}
