import { useState, useEffect, useCallback, useRef } from 'react';
import { revaliFetch, subscribe, mutate, type RevaliOptions } from '../../index.js';

export interface UseRevaliResult<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isValidating: boolean;
  mutate: (data: T | ((prev: T | undefined) => T), shouldRevalidate?: boolean) => T;
}

/**
 * React hook for Revali data fetching with stale-while-revalidate pattern
 *
 * @param key - Unique cache key for the data
 * @param fetcher - Function that returns a Promise with the data
 * @param options - Revali options (TTL, retries, polling, etc.)
 * @returns Object with data, error, loading states, and mutate function
 */
export function useRevali<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: RevaliOptions,
): UseRevaliResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(true);

  // Use ref to track mounted state to prevent state updates after unmount
  const mountedRef = useRef(true);

  // Reset state when key changes
  useEffect(() => {
    setData(undefined);
    setError(undefined);
    setIsLoading(true);
    setIsValidating(false);
  }, [key]);

  // Main data fetching effect
  useEffect(() => {
    // Reset mounted state
    mountedRef.current = true;

    const loadData = async () => {
      if (!mountedRef.current) return;

      setIsLoading(true);
      setIsValidating(true);

      try {
        const result = await revaliFetch(key, fetcher, options);
        if (mountedRef.current) {
          setData(result);
          setError(undefined);
          setIsLoading(false);
          setIsValidating(false);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setData(undefined);
          setIsLoading(false);
          setIsValidating(false);
        }
      }
    };

    loadData();

    // Subscribe to cache updates
    const unsubscribe = subscribe<T>(key, (newData, newError) => {
      if (!mountedRef.current) return;

      setData(newData);
      setError(newError);
      // When we get data from subscription, we're no longer validating
      setIsValidating(false);
    });

    // Cleanup function
    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [key, fetcher, options]);

  // Stable mutate function
  const mutateFn = useCallback(
    (newData: T | ((prev: T | undefined) => T), shouldRevalidate = true) => {
      return mutate(key, newData, shouldRevalidate);
    },
    [key],
  );

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate: mutateFn,
  };
}
