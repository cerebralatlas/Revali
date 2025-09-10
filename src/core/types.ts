// -----------------------------
// Revali: Core Types
// -----------------------------

export type Fetcher<T> = () => Promise<T>;
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
}

export interface CacheEntry<T> {
  data: T | undefined;
  timestamp: number;
  error?: Error;
  fetcher: Fetcher<T>;
  options: RevaliOptions;
}

export interface RevaliState<T> {
  data?: T;
  error?: Error;
  isLoading: boolean;
  isValidating: boolean;
}

// default options
export const DEFAULT_OPTIONS: Required<RevaliOptions> = {
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
};
