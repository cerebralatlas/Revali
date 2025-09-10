---
'revali': minor
---

Add polling/interval revalidation functionality

This release introduces comprehensive polling capabilities:

- **New polling options**: `refreshInterval`, `refreshWhenHidden`, `refreshWhenOffline`, `dedupingInterval`
- **Automatic polling management**: Polls start/stop automatically with cache lifecycle
- **Page visibility awareness**: Smart polling that respects page visibility state
- **Performance optimizations**: Built-in deduplication and memory leak prevention
- **New APIs**: `getPollingInfo()`, `hasActivePolling()`, `cleanupPolling()`
- **Comprehensive examples**: Added vanilla JS polling demo

**Breaking Changes**: None - fully backward compatible

**Migration Guide**: No migration needed, all new features are opt-in via configuration options.
