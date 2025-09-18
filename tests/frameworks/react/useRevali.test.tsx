import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRevali } from '../../../src/frameworks/react/useRevali';
import * as revali from '../../../src/index';

// Mock React hooks
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useState: actual.useState,
    useEffect: actual.useEffect,
    useCallback: actual.useCallback,
    useRef: actual.useRef,
  };
});

// Mock the revali core functions
vi.mock('../../../src/index', () => ({
  revaliFetch: vi.fn(),
  subscribe: vi.fn(),
  mutate: vi.fn(),
  clearCache: vi.fn(),
  getCacheInfo: vi.fn(),
  cleanup: vi.fn(),
  initAutoRevalidation: vi.fn(),
  triggerRevalidation: vi.fn(),
  getPollingInfo: vi.fn(),
  hasActivePolling: vi.fn(),
  cleanupPolling: vi.fn(),
  cancel: vi.fn(),
  cancelAll: vi.fn(),
  isCancelled: vi.fn(),
  getCancellationInfo: vi.fn(),
  isCancellationError: vi.fn(),
  cancelRequest: vi.fn(),
  cancelAllRequests: vi.fn(),
  isRequestCancelled: vi.fn(),
}));

describe('useRevali', () => {
  const mockFetcher = vi.fn();
  const mockSubscribe = vi.fn();
  const mockRevaliFetch = vi.fn();
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockRevaliFetch.mockResolvedValue({ id: 1, name: 'Test Data' });
    mockSubscribe.mockReturnValue(vi.fn()); // Return unsubscribe function

    // Apply mocks
    vi.mocked(revali.revaliFetch).mockImplementation(mockRevaliFetch);
    vi.mocked(revali.subscribe).mockImplementation(mockSubscribe);
    vi.mocked(revali.mutate).mockImplementation(mockMutate);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Loading', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() =>
        useRevali('test-key', mockFetcher)
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isValidating).toBe(true);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeUndefined();
    });

    it('should fetch data and update state on success', async () => {
      const testData = { id: 1, name: 'Test Data' };
      mockRevaliFetch.mockResolvedValue(testData);

      const { result } = renderHook(() =>
        useRevali('test-key', mockFetcher)
      );

      // Wait for data to be loaded
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(testData);
      expect(result.current.error).toBeUndefined();
      expect(result.current.isValidating).toBe(false);
      expect(mockRevaliFetch).toHaveBeenCalledWith('test-key', expect.any(Function), undefined);
    });

    it('should handle fetch errors properly', async () => {
      const testError = new Error('Fetch failed');
      mockRevaliFetch.mockRejectedValue(testError);

      const { result } = renderHook(() =>
        useRevali('test-key', mockFetcher)
      );

      // Wait for error to be set
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(testError);
      expect(result.current.data).toBeUndefined();
      expect(result.current.isValidating).toBe(false);
    });

    it('should handle non-Error rejections', async () => {
      mockRevaliFetch.mockRejectedValue('String error');

      const { result } = renderHook(() =>
        useRevali('test-key', mockFetcher)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('String error');
    });
  });

  describe('Subscription Management', () => {
    it('should subscribe to cache updates', () => {
      const { result } = renderHook(() =>
        useRevali('test-key', mockFetcher)
      );

      expect(mockSubscribe).toHaveBeenCalledWith('test-key', expect.any(Function));
    });

    it('should unsubscribe on unmount', () => {
      const mockUnsubscribe = vi.fn();
      mockSubscribe.mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() =>
        useRevali('test-key', mockFetcher)
      );

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should update data from subscription', async () => {
      let subscriptionCallback: any;
      mockSubscribe.mockImplementation((key, callback) => {
        subscriptionCallback = callback;
        return vi.fn();
      });

      const { result } = renderHook(() =>
        useRevali('test-key', mockFetcher)
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updatedData = { id: 2, name: 'Updated Data' };

      // Simulate subscription update
      act(() => {
        subscriptionCallback(updatedData, undefined);
      });

      expect(result.current.data).toEqual(updatedData);
      expect(result.current.error).toBeUndefined();
      expect(result.current.isValidating).toBe(false);
    });

    it('should handle subscription errors', async () => {
      let subscriptionCallback: any;
      mockSubscribe.mockImplementation((key, callback) => {
        subscriptionCallback = callback;
        return vi.fn();
      });

      const { result } = renderHook(() =>
        useRevali('test-key', mockFetcher)
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const subscriptionError = new Error('Subscription error');

      // Simulate subscription error
      act(() => {
        subscriptionCallback(undefined, subscriptionError);
      });

      expect(result.current.error).toEqual(subscriptionError);
      expect(result.current.data).toBeUndefined();
      expect(result.current.isValidating).toBe(false);
    });
  });

  describe('Key Changes', () => {
    it('should reset state when key changes', async () => {
      const { result, rerender } = renderHook(
        ({ key }) => useRevali(key, mockFetcher),
        { initialProps: { key: 'key-1' } }
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialData = { id: 1, name: 'Data 1' };
      mockRevaliFetch.mockResolvedValueOnce(initialData);

      // Change key
      rerender({ key: 'key-2' });

      // Should reset to loading state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeUndefined();
    });

    it('should fetch new data when key changes', async () => {
      const { result, rerender } = renderHook(
        ({ key }) => useRevali(key, mockFetcher),
        { initialProps: { key: 'key-1' } }
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newData = { id: 2, name: 'Data 2' };
      mockRevaliFetch.mockResolvedValueOnce(newData);

      // Change key
      rerender({ key: 'key-2' });

      // Wait for new data
      await waitFor(() => {
        expect(result.current.data).toEqual(newData);
      });

      expect(mockRevaliFetch).toHaveBeenCalledTimes(2);
      expect(mockRevaliFetch).toHaveBeenLastCalledWith('key-2', expect.any(Function), undefined);
    });
  });

  describe('Options', () => {
    it('should pass options to revaliFetch', () => {
      const options = {
        ttl: 60000,
        retries: 3,
        revalidateOnFocus: false,
      };

      renderHook(() =>
        useRevali('test-key', mockFetcher, options)
      );

      expect(mockRevaliFetch).toHaveBeenCalledWith('test-key', expect.any(Function), options);
    });

    it('should handle options changes', () => {
      const { rerender } = renderHook(
        ({ options }) => useRevali('test-key', mockFetcher, options),
        { initialProps: { options: { ttl: 60000 } } }
      );

      rerender({ options: { ttl: 120000 } });

      expect(mockRevaliFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Mutate Function', () => {
    it('should provide stable mutate function', () => {
      const { result, rerender } = renderHook(() =>
        useRevali('test-key', mockFetcher)
      );

      const firstMutate = result.current.mutate;

      rerender();

      expect(result.current.mutate).toBe(firstMutate);
    });

    it('should call mutate with correct parameters', () => {
      const { result } = renderHook(() =>
        useRevali('test-key', mockFetcher)
      );

      const newData = { id: 2, name: 'Mutated Data' };
      result.current.mutate(newData);

      expect(mockMutate).toHaveBeenCalledWith('test-key', newData, true);
    });

    it('should call mutate with function updater', () => {
      const { result } = renderHook(() =>
        useRevali('test-key', mockFetcher)
      );

      const updater = (prev: any) => ({ ...prev, name: 'Updated' });
      result.current.mutate(updater);

      expect(mockMutate).toHaveBeenCalledWith('test-key', updater, true);
    });

    it('should call mutate with custom revalidate option', () => {
      const { result } = renderHook(() =>
        useRevali('test-key', mockFetcher)
      );

      const newData = { id: 2, name: 'Mutated Data' };
      result.current.mutate(newData, false);

      expect(mockMutate).toHaveBeenCalledWith('test-key', newData, false);
    });

    it('should update key reference when key changes', () => {
      const { result, rerender } = renderHook(
        ({ key }) => useRevali(key, mockFetcher),
        { initialProps: { key: 'key-1' } }
      );

      result.current.mutate({ id: 1, name: 'Data 1' });
      expect(mockMutate).toHaveBeenCalledWith('key-1', { id: 1, name: 'Data 1' }, true);

      rerender({ key: 'key-2' });

      result.current.mutate({ id: 2, name: 'Data 2' });
      expect(mockMutate).toHaveBeenLastCalledWith('key-2', { id: 2, name: 'Data 2' }, true);
    });
  });

  describe('Concurrent Updates', () => {
    it('should handle updates after unmount gracefully', async () => {
      const mockUnsubscribe = vi.fn();
      mockSubscribe.mockReturnValue(mockUnsubscribe);

      let resolveFetch: (value: any) => void;
      const fetchPromise = new Promise(resolve => {
        resolveFetch = resolve;
      });
      mockRevaliFetch.mockReturnValue(fetchPromise);

      const { result, unmount } = renderHook(() =>
        useRevali('test-key', mockFetcher)
      );

      // Unmount before fetch completes
      unmount();

      // Complete fetch after unmount
      resolveFetch!({ id: 1, name: 'Data' });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true); // Should remain loading
      });

      // No state updates should occur after unmount
      expect(result.current.data).toBeUndefined();
    });

    it('should handle subscription updates after unmount gracefully', async () => {
      let subscriptionCallback: any;
      mockSubscribe.mockImplementation((key, callback) => {
        subscriptionCallback = callback;
        return vi.fn();
      });

      const { result, unmount } = renderHook(() =>
        useRevali('test-key', mockFetcher)
      );

      unmount();

      // Try to update after unmount
      act(() => {
        subscriptionCallback({ id: 1, name: 'Data' }, undefined);
      });

      // Should not update state
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('Fetcher Function Changes', () => {
    it('should re-fetch when fetcher function changes', async () => {
      const fetcher1 = vi.fn(() => Promise.resolve({ id: 1, name: 'Data 1' }));
      const fetcher2 = vi.fn(() => Promise.resolve({ id: 2, name: 'Data 2' }));

      // Mock different return values for each call
      mockRevaliFetch.mockResolvedValueOnce({ id: 1, name: 'Data 1' });
      mockRevaliFetch.mockResolvedValueOnce({ id: 2, name: 'Data 2' });

      const { result, rerender } = renderHook(
        ({ fetcher }) => useRevali('test-key', fetcher),
        { initialProps: { fetcher: fetcher1 } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual({ id: 1, name: 'Data 1' });

      // First fetcher should have been called (via revaliFetch mock)
      expect(mockRevaliFetch).toHaveBeenCalledTimes(1);

      // Change fetcher
      rerender({ fetcher: fetcher2 });

      await waitFor(() => {
        expect(result.current.data).toEqual({ id: 2, name: 'Data 2' });
      });

      // Should have been called twice (once for each fetcher)
      expect(mockRevaliFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty key', async () => {
      const { result } = renderHook(() =>
        useRevali('', mockFetcher)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockRevaliFetch).toHaveBeenCalledWith('', expect.any(Function), undefined);
    });

    it('should handle undefined fetcher gracefully', async () => {
      // This should not crash, though it might not be a valid use case
      const { result } = renderHook(() =>
        useRevali('test-key', undefined as any)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle synchronous fetcher errors', async () => {
      const syncErrorFetcher = () => {
        throw new Error('Sync error');
      };

      // Mock revaliFetch to throw the sync error
      mockRevaliFetch.mockRejectedValueOnce(new Error('Sync error'));

      const { result } = renderHook(() =>
        useRevali('test-key', syncErrorFetcher)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Sync error');
    });

    it('should maintain stable mutate function across re-renders', () => {
      const { result, rerender } = renderHook(() =>
        useRevali('test-key', mockFetcher)
      );

      const mutateFunctions: Array<(data: any, shouldRevalidate?: boolean) => any> = [];

      // Collect mutate functions across multiple re-renders
      for (let i = 0; i < 5; i++) {
        rerender();
        mutateFunctions.push(result.current.mutate);
      }

      // All should be the same function reference
      const firstMutate = mutateFunctions[0];
      expect(mutateFunctions.every(fn => fn === firstMutate)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', async () => {
      const renderCount = { count: 0 };

      const TestComponent = () => {
        renderCount.count++;
        const { data, error, isLoading, isValidating } = useRevali('test-key', mockFetcher);
        return null;
      };

      const { rerender } = renderHook(() => TestComponent());

      const initialCount = renderCount.count;

      // Re-render without changing props
      rerender();

      // Should not cause additional re-renders beyond the initial ones
      expect(renderCount.count).toBeLessThanOrEqual(initialCount + 1);
    });
  });
});