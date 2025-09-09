// -----------------------------
// Revali: Subscription Management
// -----------------------------

import type { Subscriber } from './types.js';
import { getCacheEntry } from './cache.js';

// ---------- subscriber state ----------
const subscribers = new Map<string, Set<Subscriber<any>>>();

// ---------- subscription mechanism ----------

export function subscribe<T>(key: string, fn: Subscriber<T>): () => void {
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set());
  }
  subscribers.get(key)!.add(fn);

  // return unsubscribe function
  return () => {
    const keySubscribers = subscribers.get(key);
    if (keySubscribers) {
      keySubscribers.delete(fn);
      // if there is no subscriber, clean up the subscriber set
      if (keySubscribers.size === 0) {
        subscribers.delete(key);
      }
    }
  };
}

// ---------- notify update ----------

export function notify<T>(key: string, error?: Error): void {
  const entry = getCacheEntry(key);
  const subscriberSet = subscribers.get(key);

  if (subscriberSet && subscriberSet.size > 0) {
    subscriberSet.forEach((fn) => {
      try {
        fn(entry?.data, error);
      } catch (err) {
        console.error('Error in subscriber callback:', err); // log error in subscriber callback
      }
    });
  }
}

// ---------- subscriber management ----------

export function hasSubscribers(key: string): boolean {
  const keySubscribers = subscribers.get(key);
  return keySubscribers ? keySubscribers.size > 0 : false;
}

export function getSubscriberCount(key: string): number {
  const keySubscribers = subscribers.get(key);
  return keySubscribers ? keySubscribers.size : 0;
}

export function clearSubscribers(key?: string): void {
  if (key) {
    subscribers.delete(key);
  } else {
    subscribers.clear();
  }
}

export function getAllSubscribers(): Map<string, Set<Subscriber<any>>> {
  return new Map(subscribers);
}
