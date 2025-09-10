# revali

## 0.3.0

### Minor Changes

- 37230f0: Add polling/interval revalidation functionality

  This release introduces comprehensive polling capabilities:
  - **New polling options**: `refreshInterval`, `refreshWhenHidden`, `refreshWhenOffline`, `dedupingInterval`
  - **Automatic polling management**: Polls start/stop automatically with cache lifecycle
  - **Page visibility awareness**: Smart polling that respects page visibility state
  - **Performance optimizations**: Built-in deduplication and memory leak prevention
  - **New APIs**: `getPollingInfo()`, `hasActivePolling()`, `cleanupPolling()`
  - **Comprehensive examples**: Added vanilla JS polling demo

  **Breaking Changes**: None - fully backward compatible

  **Migration Guide**: No migration needed, all new features are opt-in via configuration options.

- Add request cancellation functionality with AbortController support

  This release introduces comprehensive request cancellation capabilities:
  - **AbortController integration**: Full support for native AbortController API
  - **Multiple cancellation strategies**: Timeout, manual cancellation, revalidation cancellation
  - **Enhanced fetcher interface**: Fetchers now receive AbortSignal parameter
  - **Cancellation management APIs**: `cancel()`, `cancelAll()`, `isCancelled()`, `getCancellationInfo()`
  - **Smart cancellation options**: `abortOnRevalidate`, `abortTimeout`, external signal support
  - **Error handling**: Proper CancellationError with graceful error handling
  - **Memory management**: Automatic cleanup to prevent memory leaks
  - **Comprehensive examples**: Added interactive cancellation demo

  **Breaking Changes**:
  - Fetcher function signature now optionally accepts AbortSignal as parameter
  - Existing fetchers without AbortSignal parameter continue to work (backward compatible)

  **Migration Guide**:
  - Update your fetchers to handle AbortSignal for cancellation support:

    ```typescript
    // Before
    const fetcher = async () => fetch('/api/data').then((r) => r.json());

    // After (recommended)
    const fetcher = async (signal?: AbortSignal) =>
      fetch('/api/data', { signal }).then((r) => r.json());
    ```

## 0.2.0

### Minor Changes

- 6069f44: Initial release of Revali - Framework-agnostic SWR library
