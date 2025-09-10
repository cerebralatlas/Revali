// -----------------------------
// Revali: Core Types
// -----------------------------

export type Fetcher<T> = (signal?: AbortSignal) => Promise<T>;
export type Subscriber<T> = (data: T | undefined, error?: Error) => void;

export interface RevaliOptions {
  retries?: number; // max retries count
  retryDelay?: number; // retry initial delay(ms)
  ttl?: number; // cache expiration time(ms), 0 means never expire
  maxCacheSize?: number; // max cache entries count
  revalidateOnFocus?: boolean; // revalidate on focus
  revalidateOnReconnect?: boolean; // revalidate on reconnect
  refreshInterval?: number; // polling interval in ms, 0 means no polling
  refreshWhenHidden?: boolean; // continue polling when page is hidden
  refreshWhenOffline?: boolean; // continue polling when offline
  dedupingInterval?: number; // deduping interval in ms to avoid too frequent requests
  abortOnRevalidate?: boolean; // cancel previous request when revalidating
  abortTimeout?: number; // request timeout in ms, 0 means no timeout
  signal?: AbortSignal; // external abort signal
}

export interface CacheEntry<T> {
  data: T | undefined;
  timestamp: number;
  error?: Error;
  fetcher: Fetcher<T>;
  options: RevaliOptions;
  abortController?: AbortController; // current request's abort controller
}

export interface RevaliState<T> {
  data?: T;
  error?: Error;
  isLoading: boolean;
  isValidating: boolean;
}

// Cancellation error class
export class CancellationError extends Error {
  name = 'CancellationError';
  constructor(message: string) {
    super(message);
  }
}

// default options
export const DEFAULT_OPTIONS: Required<Omit<RevaliOptions, 'signal'>> & { signal?: AbortSignal } = {
  retries: 2,
  retryDelay: 300,
  ttl: 5 * 60 * 1000, // 5 minutes default TTL
  maxCacheSize: 100,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  refreshInterval: 0, // no polling by default
  refreshWhenHidden: false, // pause polling when page is hidden
  refreshWhenOffline: false, // pause polling when offline
  dedupingInterval: 2000, // 2 seconds deduping interval
  abortOnRevalidate: false, // don't cancel by default for backward compatibility
  abortTimeout: 0, // no timeout by default
};
