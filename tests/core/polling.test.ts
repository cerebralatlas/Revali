// -----------------------------
// Unit Tests: Polling Module
// -----------------------------

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  startPolling, 
  stopPolling, 
  cleanupPolling, 
  getPollingInfo, 
  hasActivePolling,
  initPollingListeners,
  removePollingListeners
} from '../../src/core/polling.js';
import { setCacheEntry, getCacheEntry, clearCache } from '../../src/core/cache.js';
import { clearSubscribers } from '../../src/core/subscription.js';
import { DEFAULT_OPTIONS } from '../../src/core/types.js';
import { createSpy } from '../utils/test-helpers.js';
import type { CacheEntry } from '../../src/core/types.js';

// Mock DOM APIs for testing
const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const mockDocument = {
  hidden: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const mockNavigator = {
  onLine: true,
};

// Setup global mocks
Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
});

Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true,
});

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true,
});

describe('Polling Module', () => {
  beforeEach(() => {
    clearCache();
    clearSubscribers();
    cleanupPolling();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanupPolling();
  });

  describe('Basic Polling Operations', () => {
    it('should track polling state when refreshInterval is set', () => {
      const key = 'test-key';
      const options = { ...DEFAULT_OPTIONS, refreshInterval: 5000 };
      
      startPolling(key, options);
      
      expect(getPollingInfo().activeCount).toBe(1);
      expect(hasActivePolling(key)).toBe(true);
      expect(getPollingInfo().keys).toContain(key);
    });

    it('should not start polling when refreshInterval is 0', () => {
      const key = 'test-key';
      const options = { ...DEFAULT_OPTIONS, refreshInterval: 0 };
      
      startPolling(key, options);
      
      expect(getPollingInfo().activeCount).toBe(0);
      expect(hasActivePolling(key)).toBe(false);
    });

    it('should stop polling for a specific key', () => {
      const key = 'test-key';
      const options = { ...DEFAULT_OPTIONS, refreshInterval: 5000 };
      
      startPolling(key, options);
      expect(hasActivePolling(key)).toBe(true);
      
      stopPolling(key);
      expect(hasActivePolling(key)).toBe(false);
    });

    it('should replace existing polling when starting polling for same key', () => {
      const key = 'test-key';
      const options = { ...DEFAULT_OPTIONS, refreshInterval: 5000 };
      
      // Start first polling
      startPolling(key, options);
      expect(getPollingInfo().activeCount).toBe(1);
      
      // Start second polling for same key
      startPolling(key, options);
      expect(getPollingInfo().activeCount).toBe(1); // Still only one
    });
  });

  describe('Page Visibility and Network Status', () => {
    it('should initialize polling listeners', () => {
      initPollingListeners();
      
      expect(mockDocument.addEventListener).toHaveBeenCalledWith(
        'visibilitychange', 
        expect.any(Function)
      );
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'online', 
        expect.any(Function)
      );
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'offline', 
        expect.any(Function)
      );
    });

    it('should remove polling listeners', () => {
      removePollingListeners();
      
      expect(mockDocument.removeEventListener).toHaveBeenCalledWith(
        'visibilitychange', 
        expect.any(Function)
      );
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        'online', 
        expect.any(Function)
      );
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        'offline', 
        expect.any(Function)
      );
    });
  });

  describe('Cleanup and Information', () => {
    it('should cleanup all polling tasks', () => {
      const key1 = 'test-key-1';
      const key2 = 'test-key-2';
      const options = { ...DEFAULT_OPTIONS, refreshInterval: 1000 };
      
      startPolling(key1, options);
      startPolling(key2, options);
      
      expect(getPollingInfo().activeCount).toBe(2);
      
      cleanupPolling();
      
      expect(getPollingInfo().activeCount).toBe(0);
    });

    it('should provide correct polling information', () => {
      const key1 = 'test-key-1';
      const key2 = 'test-key-2';
      const options = { ...DEFAULT_OPTIONS, refreshInterval: 1000 };
      
      expect(getPollingInfo()).toEqual({ activeCount: 0, keys: [] });
      
      startPolling(key1, options);
      startPolling(key2, options);
      
      const info = getPollingInfo();
      expect(info.activeCount).toBe(2);
      expect(info.keys).toContain(key1);
      expect(info.keys).toContain(key2);
    });

    it('should correctly report active polling status', () => {
      const key = 'test-key';
      const options = { ...DEFAULT_OPTIONS, refreshInterval: 1000 };
      
      expect(hasActivePolling(key)).toBe(false);
      
      startPolling(key, options);
      expect(hasActivePolling(key)).toBe(true);
      
      stopPolling(key);
      expect(hasActivePolling(key)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle stopping non-existent polling gracefully', () => {
      expect(() => {
        stopPolling('non-existent-key');
      }).not.toThrow();
    });

    it('should handle negative refreshInterval', () => {
      const key = 'test-key';
      const options = { ...DEFAULT_OPTIONS, refreshInterval: -1000 };
      
      startPolling(key, options);
      
      expect(getPollingInfo().activeCount).toBe(0);
      expect(hasActivePolling(key)).toBe(false);
    });

    it('should handle undefined refreshInterval', () => {
      const key = 'test-key';
      const options = { ...DEFAULT_OPTIONS };
      delete (options as any).refreshInterval;
      
      startPolling(key, options);
      
      expect(getPollingInfo().activeCount).toBe(0);
      expect(hasActivePolling(key)).toBe(false);
    });
  });

  describe('Integration with Cache System', () => {
    it('should start polling when cache entry is set with refreshInterval', () => {
      const key = 'test-key';
      const mockFetcher = createSpy();
      const options = { ...DEFAULT_OPTIONS, refreshInterval: 1000 };
      
      // Set cache entry which should trigger polling
      const entry: CacheEntry<string> = {
        data: 'test-data',
        timestamp: Date.now(),
        fetcher: mockFetcher,
        options,
      };
      setCacheEntry(key, entry);
      
      expect(hasActivePolling(key)).toBe(true);
    });

    it('should not start polling when cache entry has no refreshInterval', () => {
      const key = 'test-key';
      const mockFetcher = createSpy();
      const options = { ...DEFAULT_OPTIONS, refreshInterval: 0 };
      
      // Set cache entry without polling
      const entry: CacheEntry<string> = {
        data: 'test-data',
        timestamp: Date.now(),
        fetcher: mockFetcher,
        options,
      };
      setCacheEntry(key, entry);
      
      expect(hasActivePolling(key)).toBe(false);
    });

    it('should stop polling when cache entry is deleted', () => {
      const key = 'test-key';
      const mockFetcher = createSpy();
      const options = { ...DEFAULT_OPTIONS, refreshInterval: 1000 };
      
      // Set cache entry with polling
      const entry: CacheEntry<string> = {
        data: 'test-data',
        timestamp: Date.now(),
        fetcher: mockFetcher,
        options,
      };
      setCacheEntry(key, entry);
      
      expect(hasActivePolling(key)).toBe(true);
      
      // Clear cache should stop polling
      clearCache(key);
      
      expect(hasActivePolling(key)).toBe(false);
    });

    it('should stop all polling when all cache is cleared', () => {
      const key1 = 'test-key-1';
      const key2 = 'test-key-2';
      const mockFetcher = createSpy();
      const options = { ...DEFAULT_OPTIONS, refreshInterval: 1000 };
      
      // Set multiple cache entries with polling
      const entry1: CacheEntry<string> = {
        data: 'test-data-1',
        timestamp: Date.now(),
        fetcher: mockFetcher,
        options,
      };
      const entry2: CacheEntry<string> = {
        data: 'test-data-2',
        timestamp: Date.now(),
        fetcher: mockFetcher,
        options,
      };
      
      setCacheEntry(key1, entry1);
      setCacheEntry(key2, entry2);
      
      expect(getPollingInfo().activeCount).toBe(2);
      
      // Clear all cache should stop all polling
      clearCache();
      
      expect(getPollingInfo().activeCount).toBe(0);
    });
  });
});