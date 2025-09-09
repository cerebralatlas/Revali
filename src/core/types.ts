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
};
