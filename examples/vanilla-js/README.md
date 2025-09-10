# Vanilla JavaScript Examples

This folder contains examples of using Revali with vanilla JavaScript and HTML.

## Files

### `demo.html`

**Comprehensive Interactive Demo**

A full-featured demonstration showcasing all Revali capabilities:

- ✅ Basic data fetching with caching
- ✅ Real-time subscriptions and updates
- ✅ Optimistic updates with rollback
- ✅ Error handling and retry mechanisms
- ✅ Cache management and introspection
- ✅ Activity logging

### `simple.html`

**Basic Usage Example**

A minimal example showing common Revali usage patterns:

- Basic data fetching
- Caching with TTL
- Optimistic updates
- Simple error handling

### `polling-demo.html`

**🔄 Polling & Interval Revalidation Demo**

Interactive demonstration of the new polling features:

- ⏱️ Configurable polling intervals (2s, 5s, 10s, 30s)
- 📊 Real-time metrics and activity monitoring
- 🎛️ Interactive controls for polling configuration
- 📈 Multiple data sources with different intervals
- 🔍 Cache hit/miss tracking
- 📱 Page visibility awareness
- 📝 Comprehensive activity logging

## How to Run

### Option 1: Direct Browser Access

```bash
# Open files directly in your browser
open demo.html
open simple.html
open polling-demo.html
```

### Option 2: Local Server (Recommended)

```bash
# Install dependencies
npm install

# Start local server
npm start
# Then visit http://localhost:3000
```

### Option 3: Using any static server

```bash
# Using Python
python -m http.server 8000

# Using Node.js serve
npx serve . -p 3000

# Using PHP
php -S localhost:8000
```

## Real Project Usage

Once Revali is published to npm, replace the mock implementation with:

```html
<!-- Via CDN -->
<script type="module">
import { revaliFetch, subscribe, mutate } from 'https://unpkg.com/revali@latest/dist/index.js';

// Your code here
</script>
```

Or in a bundled project:

```bash
npm install revali
```

```javascript
import { revaliFetch, subscribe, mutate } from 'revali';

// Fetch with caching
const data = await revaliFetch(
  'api-key',
  () => fetch('/api/data').then(r => r.json()),
  { ttl: 300000 } // 5 minutes
);
```

## Features Demonstrated

- **SWR Pattern**: Stale-while-revalidate data fetching
- **Intelligent Caching**: TTL-based cache with LRU eviction
- **Request Deduplication**: Prevents duplicate network requests
- **Error Handling**: Exponential backoff retry strategy
- **Optimistic Updates**: Immediate UI updates with rollback on failure
- **Real-time Updates**: Subscription-based data synchronization
- **Cache Management**: Manual cache control and introspection
- **Memory Management**: Automatic cleanup and size limits
- **🔄 Polling/Interval Revalidation**: Automatic data refresh at specified intervals
- **📊 Performance Metrics**: Real-time monitoring of cache hits, API calls, and polling activity
- **🎛️ Interactive Configuration**: Dynamic polling interval and cache TTL adjustment

## Browser Compatibility

- Modern browsers with ES6+ support
- Chrome 61+
- Firefox 60+
- Safari 12+
- Edge 79+

For older browsers, consider using a transpiled version with Babel.
