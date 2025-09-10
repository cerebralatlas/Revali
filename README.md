<p align="center">
  <img src="./docs/revali-logo.svg" alt="Revali Logo" width="80" />
</p>
<h1 align="center">Revali</h1>

<p align="center">
  <a href="https://github.com/cerebralatlas/revali/actions/workflows/ci.yml">
    <img src="https://github.com/cerebralatlas/revali/actions/workflows/ci.yml/badge.svg" alt="CI Status" />
  </a>
  <a href="https://www.npmjs.com/package/revali">
    <img src="https://img.shields.io/npm/v/revali.svg" alt="NPM Version" />
  </a>
  <a href="https://www.npmjs.com/package/revali">
    <img src="https://img.shields.io/npm/dm/revali.svg" alt="NPM Downloads" />
  </a>
  <a href="https://github.com/cerebralatlas/revali/tree/main/tests">
    <img src="https://img.shields.io/badge/tests-108%20passing-brightgreen.svg" alt="Tests Passing" />
  </a>
  <a href="https://github.com/cerebralatlas/revali/search?l=typescript">
    <img src="https://img.shields.io/badge/TypeScript-100%25-blue.svg" alt="TypeScript" />
  </a>
  <a href="https://github.com/cerebralatlas/revali/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
  </a>
  <a href="https://bundlephobia.com/package/revali">
    <img src="https://img.shields.io/bundlephobia/minzip/revali" alt="Bundle Size" />
  </a>
  <a href="https://github.com/cerebralatlas/revali">
    <img src="https://img.shields.io/github/stars/cerebralatlas/revali?style=social" alt="GitHub Stars" />
  </a>
</p>

<p align="center">
  <strong>Framework-agnostic stale-while-revalidate (SWR) data fetching library</strong><br>
  A powerful yet lightweight caching library for JavaScript/TypeScript. Works seamlessly with <strong>React, Vue, Svelte</strong>, or vanilla JS projects.
</p>

---

## Features

- **Stale-While-Revalidate**: Return cached data instantly, then refresh in the background
- **Smart caching** with TTL, LRU eviction, and configurable cache size limits
- **Auto re-render** when cache updates (via pub/sub pattern)
- **Request deduplication**: Prevent duplicate network requests automatically
- ️ **Advanced error handling** with exponential backoff retry strategy
- ️ **Optimistic updates**: Manual cache mutation with optional revalidation
- **Auto revalidation** on window focus and network reconnection (configurable)
- **Polling / interval revalidation**: Automatic data refresh at specified intervals
- **Memory management**: Automatic cleanup and cache size limits
- **Cache introspection**: Built-in cache management and debugging APIs
- ️ **TypeScript-first**: Full type safety with zero `any` types
- **Framework-agnostic**: Use directly or wrap in React/Vue/Svelte hooks
- **Lightweight**: ~1.8KB gzipped (~6KB raw), zero dependencies

---

## Installation

```bash
npm install revali
```

```bash
yarn add revali
```

```bash
pnpm add revali
```

## Quick Start

```typescript
import { revaliFetch, subscribe, mutate } from 'revali';

// Fetch data with caching and SWR behavior
const userData = await revaliFetch(
  'user/1',
  () => fetch('https://api.example.com/users/1').then((r) => r.json()),
  {
    ttl: 5 * 60 * 1000, // 5 minutes cache
    retries: 3, // Retry failed requests 3 times
    revalidateOnFocus: true, // Refresh when window regains focus
    refreshInterval: 30 * 1000, // Poll every 30 seconds
  },
);

// Subscribe to cache updates (with error handling)
const unsubscribe = subscribe('user/1', (data, error) => {
  if (error) {
    console.error('Fetch error:', error);
  } else {
    console.log('Updated data:', data);
  }
});

// Optimistic updates with automatic revalidation
mutate(
  'user/1',
  (prev) => ({
    ...prev,
    name: 'Updated Name',
  }),
  true,
); // Will revalidate after mutation

// Cache management
import { clearCache, getCacheInfo, cleanup } from 'revali';

clearCache('user/1'); // Clear specific cache
clearCache(); // Clear all cache
console.log(getCacheInfo()); // { size: 5, keys: ["user/1", ...] }

// Manual revalidation control
import { triggerRevalidation } from 'revali';

triggerRevalidation(); // Manually trigger revalidation for all eligible entries

// Clean up everything
cleanup(); // Clear all cache and remove all subscribers
unsubscribe(); // Or just unsubscribe from specific key
```

## Framework Integration

### React Hook

```tsx
import { useState, useEffect, useCallback } from 'react';
import { revaliFetch, subscribe, mutate, type RevaliOptions } from 'revali';

interface UseRevaliResult<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isValidating: boolean;
  mutate: (data: T | ((prev: T | undefined) => T), shouldRevalidate?: boolean) => T;
}

export function useRevali<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: RevaliOptions,
): UseRevaliResult<T> {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!mounted) return;

      setIsLoading(true);
      setIsValidating(true);

      try {
        const result = await revaliFetch(key, fetcher, options);
        if (mounted) {
          setData(result);
          setError(undefined);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
          setIsValidating(false);
        }
      }
    };

    loadData();

    // Subscribe to cache updates
    const unsubscribe = subscribe(key, (newData, newError) => {
      if (!mounted) return;

      setData(newData);
      setError(newError);
      setIsValidating(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [key]);

  const mutateFn = useCallback(
    (data: T | ((prev: T | undefined) => T), shouldRevalidate = true) => {
      return mutate(key, data, shouldRevalidate);
    },
    [key],
  );

  return { data, error, isLoading, isValidating, mutate: mutateFn };
}

// Usage
function UserProfile({ userId }: { userId: string }) {
  const { data, error, isLoading, mutate } = useRevali(
    `user/${userId}`,
    () => fetch(`/api/users/${userId}`).then((r) => r.json()),
    { ttl: 5 * 60 * 1000 },
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{data?.name}</h1>
      <button onClick={() => mutate((prev) => ({ ...prev, name: 'New Name' }))}>Update Name</button>
    </div>
  );
}
```

### Vue Composition API

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { revaliFetch, subscribe, type RevaliOptions } from 'revali';

interface UseRevaliResult<T> {
  data: Ref<T | undefined>;
  error: Ref<Error | undefined>;
  isLoading: Ref<boolean>;
}

function useRevali<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: RevaliOptions,
): UseRevaliResult<T> {
  const data = ref<T>();
  const error = ref<Error>();
  const isLoading = ref(true);

  let unsubscribe: (() => void) | null = null;

  const load = async () => {
    isLoading.value = true;
    try {
      data.value = await revaliFetch(key, fetcher, options);
      error.value = undefined;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      isLoading.value = false;
    }
  };

  onMounted(async () => {
    await load();

    unsubscribe = subscribe(key, (newData, newError) => {
      data.value = newData;
      error.value = newError;
    });
  });

  onUnmounted(() => {
    unsubscribe?.();
  });

  return { data, error, isLoading };
}

// Usage
const {
  data: user,
  error,
  isLoading,
} = useRevali('user/1', () => fetch('/api/user/1').then((r) => r.json()));
</script>
```

## API Reference

### Core Functions

#### `revaliFetch<T>(key, fetcher, options?): Promise<T>`

The main function for fetching and caching data.

```typescript
const data = await revaliFetch('posts/1', () => fetch('/api/posts/1').then((r) => r.json()), {
  ttl: 5 * 60 * 1000, // Cache for 5 minutes
  retries: 3, // Retry 3 times on failure
  retryDelay: 1000, // Initial retry delay
  maxCacheSize: 50, // Max cache entries
  revalidateOnFocus: true, // Revalidate on window focus
  revalidateOnReconnect: true, // Revalidate on network reconnect
});
```

#### `subscribe<T>(key, callback): () => void`

Subscribe to cache updates for a specific key.

```typescript
const unsubscribe = subscribe('user/1', (data, error) => {
  if (error) console.error('Error:', error);
  else console.log('Data updated:', data);
});
```

#### `mutate<T>(key, data, shouldRevalidate?): T`

Manually update cache and optionally trigger revalidation.

```typescript
// Update with new data
mutate('user/1', { id: 1, name: 'John Doe' });

// Update with function
mutate('user/1', (prev) => ({ ...prev, name: 'Jane Doe' }));

// Update without revalidation
mutate('user/1', newData, false);
```

#### `clearCache(key?): void`

Clear cache entries.

```typescript
clearCache('user/1'); // Clear specific key
clearCache(); // Clear all cache
```

#### `getCacheInfo(): { size: number; keys: string[] }`

Get information about the current cache state.

```typescript
const { size, keys } = getCacheInfo();
console.log(`Cache has ${size} entries:`, keys);
```

#### `cleanup(): void`

Clean up all cache entries and remove all subscribers. Useful for complete cleanup.

```typescript
import { cleanup } from 'revali';

// Clear everything - cache and subscribers
cleanup();
```

#### `triggerRevalidation(): void`

Manually trigger revalidation for all eligible cache entries.

```typescript
import { triggerRevalidation } from 'revali';

// Manually revalidate all entries that have revalidateOnFocus or revalidateOnReconnect enabled
triggerRevalidation();
```

#### `initAutoRevalidation(): void`

Manually initialize automatic revalidation listeners. This is called automatically when importing Revali, but can be called manually if needed.

```typescript
import { initAutoRevalidation } from 'revali';

// Manually set up window focus and network reconnect listeners
// (This is done automatically when importing Revali)
initAutoRevalidation();
```

#### `getPollingInfo(): { activeCount: number; keys: string[] }`

Get information about active polling tasks.

```typescript
import { getPollingInfo } from 'revali';

const pollingInfo = getPollingInfo();
console.log(`Active polling tasks: ${pollingInfo.activeCount}`);
console.log('Polling keys:', pollingInfo.keys);
```

#### `hasActivePolling(key: string): boolean`

Check if a specific key has active polling.

```typescript
import { hasActivePolling } from 'revali';

if (hasActivePolling('user/1')) {
  console.log('User data is being polled');
}
```

#### `cleanupPolling(): void`

Clean up all active polling tasks. Useful for cleanup when your application is shutting down.

```typescript
import { cleanupPolling } from 'revali';

// Stop all polling tasks
cleanupPolling();
```

### TypeScript Types

```typescript
export type Fetcher<T> = () => Promise<T>;
export type Subscriber<T> = (data: T | undefined, error?: Error) => void;

export interface RevaliOptions {
  retries?: number; // Max retry attempts (default: 2)
  retryDelay?: number; // Initial retry delay in ms (default: 300)
  ttl?: number; // Cache TTL in ms (default: 300000 = 5min)
  maxCacheSize?: number; // Max cache entries (default: 100)
  revalidateOnFocus?: boolean; // Revalidate on focus (default: true)
  revalidateOnReconnect?: boolean; // Revalidate on reconnect (default: true)
  refreshInterval?: number; // Polling interval in ms, 0 means no polling (default: 0)
  refreshWhenHidden?: boolean; // Continue polling when page is hidden (default: false)
  refreshWhenOffline?: boolean; // Continue polling when offline (default: false)
  dedupingInterval?: number; // Deduping interval in ms (default: 2000)
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

// Default configuration constant
export const DEFAULT_OPTIONS: Required<RevaliOptions>;
```

## Comparison with Popular Libraries

| Feature                    | SWR     | TanStack Query | Revali 🚀  |
| -------------------------- | ------- | -------------- | ---------- |
| Bundle Size                | ~6KB    | ~13KB          | **~1.8KB** |
| Framework Support          | React   | Multi          | **Any**    |
| TypeScript-first           | ✅      | ✅             | ✅         |
| Request Deduplication      | ✅      | ✅             | ✅         |
| Cache with TTL             | ✅      | ✅             | ✅         |
| Error Retry + Backoff      | ✅      | ✅             | ✅         |
| Optimistic Updates         | ✅      | ✅             | ✅         |
| Background Revalidation    | ✅      | ✅             | ✅         |
| Focus/Reconnect Revalidate | ✅      | ✅             | ✅         |
| Memory Management          | Limited | ✅             | ✅         |
| Cache Introspection        | Limited | ✅             | ✅         |
| Zero Dependencies          | ❌      | ❌             | **✅**     |

## Roadmap

### Completed (v0.2.0)

- ✅ Basic cache & subscription system
- ✅ Request deduplication
- ✅ Error retry with exponential backoff
- ✅ Revalidate on focus & network reconnect
- ✅ Manual mutate / optimistic updates
- ✅ TTL-based cache expiration
- ✅ LRU cache eviction
- ✅ Memory management & cleanup
- ✅ Full TypeScript support
- ✅ Cache introspection APIs

### Completed (v0.3.0)

- ✅ Polling / interval revalidation
- ✅ Request cancellation (AbortController)

### In Progress (v0.3.0)

- [ ] Middleware system
- [ ] Built-in React/Vue/Svelte hooks

### Future (v0.4.0)

- [ ] Pagination & infinite loading
- [ ] Offline support with persistence
- [ ] DevTools browser extension
- [ ] GraphQL integration
- [ ] SSR/SSG support

## Advanced Usage

### Auto-Initialization Behavior

Revali automatically sets up revalidation listeners when imported:

```typescript
import { revaliFetch } from 'revali';
// Automatically listens for:
// - Window focus events (revalidates when tab becomes active)
// - Network online events (revalidates when connection restored)
```

### Manual Control

You can control revalidation behavior manually:

```typescript
import { triggerRevalidation, initAutoRevalidation, DEFAULT_OPTIONS } from 'revali';

// Use default options as base for custom configuration
const customOptions = {
  ...DEFAULT_OPTIONS,
  ttl: 10 * 60 * 1000, // Override TTL to 10 minutes
  retries: 5, // Override retries to 5
};

// Manually trigger revalidation
triggerRevalidation();

// Access default configuration
console.log('Default TTL:', DEFAULT_OPTIONS.ttl);
```

### Polling / Interval Revalidation

Configure automatic data refresh at specified intervals:

```typescript
import { revaliFetch, getPollingInfo, hasActivePolling } from 'revali';

// Basic polling - refresh every 30 seconds
const liveStats = await revaliFetch(
  'live-stats',
  () => fetch('/api/stats').then(r => r.json()),
  {
    refreshInterval: 30 * 1000, // 30 seconds
    ttl: 5 * 60 * 1000, // 5 minutes cache
  }
);

// Advanced polling configuration
const criticalData = await revaliFetch(
  'critical-data',
  fetchCriticalData,
  {
    refreshInterval: 5 * 1000,   // Poll every 5 seconds
    refreshWhenHidden: true,     // Continue when tab is not active
    refreshWhenOffline: false,   // Pause when offline
    dedupingInterval: 2000,      // Prevent requests closer than 2s
    ttl: 10 * 1000,             // Short cache TTL for fresh data
  }
);

// Check polling status
console.log('Polling info:', getPollingInfo());
console.log('Is polling active:', hasActivePolling('live-stats'));

// Polling automatically stops when cache is cleared
clearCache('live-stats'); // Stops polling for this key
```

#### Polling Best Practices

1. **Choose appropriate intervals**: Balance freshness needs with server load
2. **Use `refreshWhenHidden: false`** for non-critical data to save resources
3. **Configure `dedupingInterval`** to prevent excessive requests
4. **Monitor polling with `getPollingInfo()`** for debugging

### Request Cancellation (AbortController)

Revali supports request cancellation using the standard AbortController API, providing fine-grained control over request lifecycle:

#### Basic Cancellation

```typescript
import { revaliFetch, cancel } from 'revali';

// Cancel a specific request
const key = 'user-data';
const promise = revaliFetch(key, async (signal) => {
  const response = await fetch('/api/user', { signal });
  return response.json();
});

// Cancel the request
cancel(key);

// The promise will reject with CancellationError
try {
  await promise;
} catch (error) {
  if (error.name === 'CancellationError') {
    console.log('Request was cancelled');
  }
}
```

#### External AbortController

```typescript
import { revaliFetch } from 'revali';

// Use your own AbortController
const controller = new AbortController();
const promise = revaliFetch('data', async (signal) => {
  const response = await fetch('/api/data', { signal });
  return response.json();
}, {
  signal: controller.signal
});

// Cancel using your controller
controller.abort();
```

#### Request Timeout

```typescript
import { revaliFetch } from 'revali';

// Automatically cancel after timeout
const data = await revaliFetch('slow-api', async (signal) => {
  const response = await fetch('/api/slow', { signal });
  return response.json();
}, {
  abortTimeout: 5000 // Cancel after 5 seconds
});
```

#### Cancel on Revalidate

```typescript
import { revaliFetch } from 'revali';

// Cancel previous request when starting new one
const searchResults = await revaliFetch(`search-${query}`, async (signal) => {
  const response = await fetch(`/api/search?q=${query}`, { signal });
  return response.json();
}, {
  abortOnRevalidate: true // Cancel previous search when new search starts
});
```

#### Cancellation API

```typescript
import { 
  cancel, 
  cancelAll, 
  isCancelled, 
  getCancellationInfo,
  isCancellationError 
} from 'revali';

// Cancel specific request
const cancelled = cancel('request-key');
console.log('Cancelled:', cancelled);

// Cancel all active requests
const cancelledCount = cancelAll();
console.log('Cancelled count:', cancelledCount);

// Check if request was cancelled
const wasCancelled = isCancelled('request-key');

// Get cancellation information
const info = getCancellationInfo();
console.log('Active requests:', info.activeCount);
console.log('Active keys:', info.keys);

// Check if error is cancellation error
try {
  await someRequest();
} catch (error) {
  if (isCancellationError(error)) {
    console.log('Request was cancelled');
  }
}
```

#### Best Practices for Cancellation

1. **Always handle AbortSignal in your fetchers**:

   ```typescript
   const fetcher = async (signal?: AbortSignal) => {
     const response = await fetch('/api/data', { signal });
     if (!response.ok) throw new Error('Failed');
     return response.json();
   };
   ```

2. **Use `abortOnRevalidate` for search/filter scenarios**:

   ```typescript
   const searchData = await revaliFetch(`search-${query}`, fetcher, {
     abortOnRevalidate: true // Cancel previous search
   });
   ```

3. **Set reasonable timeouts for slow operations**:

   ```typescript
   const heavyComputation = await revaliFetch('compute', fetcher, {
     abortTimeout: 30000 // 30 second timeout
   });
   ```

4. **Clean up on component unmount** (React example):

   ```typescript
   useEffect(() => {
     const controller = new AbortController();
     
     revaliFetch('component-data', fetcher, {
       signal: controller.signal
     });
     
     return () => controller.abort(); // Clean up on unmount
   }, []);
   ```

### Tree-Shaking Support

Thanks to the modular architecture, bundlers can tree-shake unused code:

```typescript
// Only imports the functions you use
import { revaliFetch, mutate } from 'revali';
// ✅ Other modules (cleanup, revalidation) won't be included in bundle
```

### Performance Best Practices

#### 1. **Optimize Cache Keys**

Use consistent, descriptive cache keys:

```typescript
// ✅ Good - consistent and descriptive
const userId = 123;
const userData = await revaliFetch(`user/${userId}`, fetchUser);
const userPosts = await revaliFetch(`user/${userId}/posts`, fetchUserPosts);

// ❌ Avoid - inconsistent or too generic
const userData = await revaliFetch(`user-${userId}`, fetchUser);
const userPosts = await revaliFetch(`posts`, fetchUserPosts);
```

#### 2. **Configure Appropriate TTL**

Set TTL based on data freshness requirements:

```typescript
// Fast-changing data - shorter TTL
const liveData = await revaliFetch('live-stats', fetchStats, {
  ttl: 30 * 1000, // 30 seconds
});

// Relatively stable data - longer TTL
const userData = await revaliFetch('user/profile', fetchProfile, {
  ttl: 5 * 60 * 1000, // 5 minutes
});

// Static data - very long TTL
const appConfig = await revaliFetch('app/config', fetchConfig, {
  ttl: 60 * 60 * 1000, // 1 hour
});
```

#### 3. **Manage Cache Size**

Configure appropriate cache limits:

```typescript
const options = {
  maxCacheSize: 50, // Limit cache entries for memory efficiency
  ttl: 5 * 60 * 1000,
};
```

#### 4. **Cleanup on Unmount**

Always cleanup subscriptions:

```typescript
useEffect(() => {
  const unsubscribe = subscribe(key, handleUpdate);
  return () => {
    unsubscribe(); // Prevent memory leaks
  };
}, [key]);
```

## Why Revali?

**Revali** (from "revalidate") was created to understand how modern data fetching libraries work under the hood, while providing a framework-agnostic solution that's both powerful and lightweight.

### Design Philosophy

- **Framework Agnostic**: Works with any UI library or vanilla JavaScript
- **TypeScript First**: Built with type safety as a priority
- **Zero Dependencies**: No external dependencies, minimal bundle size
- **Memory Conscious**: Smart caching with automatic cleanup
- **Developer Experience**: Simple API with powerful features
- **Modular Architecture**: Clean separation of concerns for better maintainability

## Contributing

We welcome contributions! Here's how you can help:

- **Report bugs** via [GitHub Issues](https://github.com/cerebralatlas/revali/issues)
- **Suggest features** or improvements
- **Improve documentation** and examples
- **Add tests** for edge cases
- **Submit PRs** for bug fixes or features

### Development Setup

```bash
git clone https://github.com/cerebralatlas/revali.git
cd revali
pnpm install

# Development
pnpm run dev

# Build
pnpm run build

# Test
pnpm run test
pnpm run test:coverage    # Run tests with coverage report
pnpm run test:ui         # Run tests with UI

# Type checking
pnpm run type-check

# Linting
pnpm run lint
pnpm run lint:fix
```

### Project Quality

- **98% Test Coverage**: Comprehensive test suite covering all core functionality
- **Modular Architecture**: Clean separation of concerns for maintainability
- **Zero Dependencies**: No external runtime dependencies

### Bundle Size Breakdown

| Format | Raw Size | Gzipped | Minified + Gzipped |
| ------ | -------- | ------- | ------------------ |
| ESM    | ~6.2KB   | ~1.8KB  | ~1.8KB             |
| CJS    | ~7.6KB   | ~2.2KB  | ~2.2KB             |

_Actual network transfer size is the gzipped size, making Revali one of the smallest SWR libraries available._

## License

MIT © [Cerebral Atlas](https://github.com/cerebralatlas)

---

**Star this repo if you find it useful!**
