# Node.js Examples

This folder contains examples of using Revali in Node.js server-side environments.

## Files

### `basic-example.js`

**Comprehensive Server-side Demo**

Demonstrates Revali usage in Node.js for:

- ✅ API response caching
- ✅ Database query caching
- ✅ Configuration caching
- ✅ Real-time data with subscriptions
- ✅ Error handling and retry logic
- ✅ Optimistic updates for server operations
- ✅ Cache management and cleanup

## How to Run

### Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn package manager

### Installation & Execution

```bash
# Install dependencies
npm install

# Run the example
npm start

# Or run with file watching (Node 18+)
npm run dev

# Or run directly
node basic-example.js
```

## Use Cases Covered

### 1. API Response Caching

Cache external API responses to reduce network calls and improve performance:

```javascript
const userData = await revaliFetch(
  'user-data',
  () => fetch('https://api.example.com/user').then(r => r.json()),
  { ttl: 300000 } // Cache for 5 minutes
);
```

### 2. Database Query Caching

Cache expensive database queries:

```javascript
const users = await revaliFetch(
  'active-users',
  () => db.query('SELECT * FROM users WHERE active = 1'),
  { ttl: 60000, retries: 3 } // 1 minute cache, retry on failure
);
```

### 3. Configuration Caching

Cache application configuration that rarely changes:

```javascript
const config = await revaliFetch(
  'app-config',
  () => loadConfigFromFile(),
  { ttl: 3600000 } // Cache for 1 hour
);
```

### 4. Microservice Communication

Cache responses from other microservices:

```javascript
const serviceData = await revaliFetch(
  'service-auth-check',
  () => authService.validateToken(token),
  { ttl: 30000 } // Short cache for security
);
```

## Benefits in Server Environments

- **Reduced Database Load**: Cache frequent queries
- **API Rate Limiting**: Avoid hitting external API limits
- **Improved Response Times**: Serve cached data instantly
- **Error Resilience**: Retry failed requests automatically
- **Memory Management**: Automatic cache cleanup and size limits
- **Real-time Updates**: Subscribe to cache changes across your application

## Production Considerations

### Memory Management

```javascript
import { getCacheInfo, clearCache } from 'revali';

// Monitor cache size
setInterval(() => {
  const info = getCacheInfo();
  if (info.size > 1000) {
    console.warn('Cache getting large:', info.size, 'entries');
  }
}, 60000);

// Periodic cleanup
setInterval(() => {
  clearCache(); // Or implement selective cleanup
}, 3600000); // Clear every hour
```

### Error Handling

```javascript
try {
  const data = await revaliFetch(
    'critical-data',
    fetchCriticalData,
    { 
      retries: 5,
      retryDelay: 1000,
      ttl: 60000
    }
  );
} catch (error) {
  // Log error and use fallback
  logger.error('Critical data fetch failed:', error);
  return fallbackData;
}
```

### Graceful Shutdown

```javascript
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  cleanup(); // Clear all cache and subscribers
  process.exit(0);
});
```

## Environment Variables

Consider using environment variables for configuration:

```javascript
const CACHE_TTL = process.env.CACHE_TTL || 300000; // 5 minutes default
const MAX_RETRIES = process.env.MAX_RETRIES || 3;

const data = await revaliFetch(
  key,
  fetcher,
  { ttl: CACHE_TTL, retries: MAX_RETRIES }
);
```

## Integration with Popular Libraries

### Express.js Middleware

```javascript
import express from 'express';
import { revaliFetch } from 'revali';

const app = express();

app.get('/api/users', async (req, res) => {
  try {
    const users = await revaliFetch(
      'all-users',
      () => db.users.findAll(),
      { ttl: 60000 }
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### With Prisma ORM

```javascript
import { PrismaClient } from '@prisma/client';
import { revaliFetch } from 'revali';

const prisma = new PrismaClient();

const getUsers = async () => {
  return revaliFetch(
    'prisma-users',
    () => prisma.user.findMany({ where: { active: true } }),
    { ttl: 120000 } // 2 minutes
  );
};
```

### With Redis Fallback

```javascript
import Redis from 'ioredis';
import { revaliFetch } from 'revali';

const redis = new Redis();

const getCachedData = async (key, fetcher, options) => {
  try {
    // Use Revali for in-memory caching
    return await revaliFetch(key, fetcher, options);
  } catch (error) {
    // Fallback to Redis
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
    throw error;
  }
};
```

## Performance Tips

1. **Choose Appropriate TTL**: Balance freshness vs performance
2. **Monitor Cache Hit Ratios**: Use `getCacheInfo()` to track effectiveness
3. **Implement Cache Warming**: Pre-populate cache for critical data
4. **Use Request Deduplication**: Revali automatically prevents duplicate requests
5. **Set Reasonable Retry Policies**: Don't overwhelm failing services

## Debugging

Enable debug logging:

```javascript
// Custom logging
const originalRevaliFetch = revaliFetch;
const revaliFetch = (key, fetcher, options) => {
  console.log(`[CACHE] Requesting: ${key}`);
  return originalRevaliFetch(key, fetcher, options);
};
```
