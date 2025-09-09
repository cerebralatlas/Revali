/**
 * Node.js Server-side Revali Example
 * 
 * This example shows how to use Revali in a Node.js environment
 * for caching API responses, database queries, and external service calls.
 * 
 * To run this example:
 * 1. Install dependencies: npm install revali node-fetch
 * 2. Run: node examples/node-example.js
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

// In a real project, import from 'revali'
// import { revaliFetch, subscribe, mutate, clearCache, getCacheInfo } from 'revali';

// For this example, we'll simulate the imports (replace with real imports)
// Mock implementation for demonstration
class NodeRevali {
  constructor() {
    this.cache = new Map();
    this.subscribers = new Map();
  }

  async revaliFetch(key, fetcher, options = {}) {
    const { ttl = 300000, retries = 2, retryDelay: initialRetryDelay = 1000 } = options;
    let retryDelay = initialRetryDelay;
    
    // Check cache first
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      if (Date.now() - entry.timestamp < ttl) {
        console.log(`[CACHE HIT] ${key}`);
        return entry.data;
      }
    }

    // Fetch with retry logic
    let attempt = 0;
    while (attempt <= retries) {
      try {
        console.log(`[FETCH] ${key} (attempt ${attempt + 1}/${retries + 1})`);
        const data = await fetcher();
        
        // Cache the result
        this.cache.set(key, {
          data,
          timestamp: Date.now()
        });

        // Notify subscribers
        if (this.subscribers.has(key)) {
          this.subscribers.get(key).forEach(callback => {
            try {
              callback(data, null);
            } catch (error) {
              console.error(`[SUBSCRIBER ERROR] ${error.message}`);
            }
          });
        }

        console.log(`[SUCCESS] ${key}`);
        return data;
      } catch (error) {
        attempt++;
        if (attempt > retries) {
          console.error(`[FAILED] ${key}: ${error.message}`);
          throw error;
        } else {
          console.log(`[RETRY] ${key} in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 1.5; // Exponential backoff
        }
      }
    }
  }

  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);

    return () => {
      if (this.subscribers.has(key)) {
        this.subscribers.get(key).delete(callback);
        if (this.subscribers.get(key).size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  mutate(key, updater) {
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      const newData = typeof updater === 'function' ? updater(entry.data) : updater;
      
      entry.data = newData;
      entry.timestamp = Date.now();

      if (this.subscribers.has(key)) {
        this.subscribers.get(key).forEach(callback => {
          try {
            callback(newData, null);
          } catch (error) {
            console.error(`[SUBSCRIBER ERROR] ${error.message}`);
          }
        });
      }

      return newData;
    }
  }

  clearCache(key) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  getCacheInfo() {
    const keys = Array.from(this.cache.keys());
    return {
      size: this.cache.size,
      keys: keys,
      entries: keys.map(key => ({
        key,
        age: Date.now() - this.cache.get(key).timestamp,
        hasData: !!this.cache.get(key).data
      }))
    };
  }
}

// Initialize Revali
const revali = new NodeRevali();

// Bind methods to maintain context
const revaliFetch = revali.revaliFetch.bind(revali);
const subscribe = revali.subscribe.bind(revali);
const mutate = revali.mutate.bind(revali);
const clearCache = revali.clearCache.bind(revali);
const getCacheInfo = revali.getCacheInfo.bind(revali);

// Mock external API calls (in real usage, these would be actual HTTP requests)
const mockApiCall = async (endpoint, delay = 1000) => {
  console.log(`[API CALL] ${endpoint}`);
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Simulate different responses based on endpoint
  switch (endpoint) {
    case '/api/users':
      return [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
        { id: 3, name: 'Charlie', email: 'charlie@example.com' }
      ];
    
    case '/api/config':
      return {
        app_name: 'My App',
        version: '1.0.0',
        features: ['auth', 'notifications', 'analytics']
      };
    
    case '/api/stats':
      return {
        users: Math.floor(Math.random() * 1000) + 100,
        requests: Math.floor(Math.random() * 10000) + 1000,
        uptime: Date.now() - (Math.random() * 86400000) // Random uptime
      };
    
    default:
      throw new Error(`Unknown endpoint: ${endpoint}`);
  }
};

// Database query simulation
const mockDatabaseQuery = async (query, delay = 500) => {
  console.log(`[DB QUERY] ${query}`);
  await new Promise(resolve => setTimeout(resolve, delay));
  
  if (query.includes('users')) {
    return [
      { id: 1, name: 'Database User 1', created_at: '2023-01-01' },
      { id: 2, name: 'Database User 2', created_at: '2023-01-02' }
    ];
  }
  
  return { result: 'success', rows: Math.floor(Math.random() * 100) };
};

// Example 1: API Response Caching
async function example1_ApiCaching() {
  console.log('\n=== Example 1: API Response Caching ===');
  
  try {
    // First call - will fetch from API
    const users1 = await revaliFetch(
      'api-users',
      () => mockApiCall('/api/users'),
      { ttl: 30000 } // Cache for 30 seconds
    );
    console.log('Users (first call):', users1.length, 'users');
    
    // Second call - will use cache
    const users2 = await revaliFetch(
      'api-users',
      () => mockApiCall('/api/users'),
      { ttl: 30000 }
    );
    console.log('Users (second call):', users2.length, 'users');
    
  } catch (error) {
    console.error('API caching failed:', error.message);
  }
}

// Example 2: Database Query Caching
async function example2_DatabaseCaching() {
  console.log('\n=== Example 2: Database Query Caching ===');
  
  try {
    // Cache expensive database queries
    const dbUsers = await revaliFetch(
      'db-users',
      () => mockDatabaseQuery('SELECT * FROM users WHERE active = 1'),
      { ttl: 60000, retries: 3 } // Cache for 1 minute, retry on failure
    );
    console.log('DB Users:', dbUsers.length, 'users');
    
    // This will use the cached result
    const cachedUsers = await revaliFetch(
      'db-users',
      () => mockDatabaseQuery('SELECT * FROM users WHERE active = 1'),
      { ttl: 60000 }
    );
    console.log('Cached DB Users:', cachedUsers.length, 'users');
    
  } catch (error) {
    console.error('Database caching failed:', error.message);
  }
}

// Example 3: Configuration Caching
async function example3_ConfigCaching() {
  console.log('\n=== Example 3: Configuration Caching ===');
  
  try {
    // Cache application configuration
    const config = await revaliFetch(
      'app-config',
      () => mockApiCall('/api/config', 200),
      { ttl: 300000 } // Cache for 5 minutes
    );
    console.log('App Config:', config.app_name, 'v' + config.version);
    console.log('Features:', config.features.join(', '));
    
  } catch (error) {
    console.error('Config caching failed:', error.message);
  }
}

// Example 4: Real-time Data with Subscriptions
async function example4_RealtimeData() {
  console.log('\n=== Example 4: Real-time Data with Subscriptions ===');
  
  // Subscribe to stats updates
  const unsubscribe = subscribe('live-stats', (data, error) => {
    if (error) {
      console.error('Stats subscription error:', error.message);
    } else {
      console.log(`[LIVE UPDATE] Users: ${data.users}, Requests: ${data.requests}`);
    }
  });
  
  // Fetch stats multiple times to simulate real-time updates
  for (let i = 0; i < 3; i++) {
    try {
      await revaliFetch(
        'live-stats',
        () => mockApiCall('/api/stats', 300),
        { ttl: 5000 } // Short cache for real-time feel
      );
      
      // Wait a bit before next update
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error('Stats fetch failed:', error.message);
    }
  }
  
  unsubscribe();
}

// Example 5: Cache Management
async function example5_CacheManagement() {
  console.log('\n=== Example 5: Cache Management ===');
  
  // Show current cache state
  console.log('Cache info:', getCacheInfo());
  
  // Clear specific cache entry
  clearCache('api-users');
  console.log('Cleared api-users cache');
  
  // Show cache info after clearing
  console.log('Cache info after clearing:', getCacheInfo());
}

// Example 6: Error Handling and Retries
async function example6_ErrorHandling() {
  console.log('\n=== Example 6: Error Handling and Retries ===');
  
  let attemptCount = 0;
  
  try {
    await revaliFetch(
      'error-test',
      async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Simulated error (attempt ${attemptCount})`);
        }
        return { success: true, attempts: attemptCount };
      },
      { 
        retries: 3,
        retryDelay: 500
      }
    );
    
    console.log('Error handling test passed after', attemptCount, 'attempts');
    
  } catch (error) {
    console.error('Error handling test failed:', error.message);
  }
}

// Example 7: Optimistic Updates for Server Operations
async function example7_OptimisticUpdates() {
  console.log('\n=== Example 7: Optimistic Updates ===');
  
  try {
    // First, get current users
    const users = await revaliFetch(
      'server-users',
      () => mockApiCall('/api/users'),
      { ttl: 60000 }
    );
    
    console.log('Current users:', users.length);
    
    // Optimistically add a new user
    const newUser = { id: 999, name: 'New User', email: 'new@example.com' };
    mutate('server-users', currentUsers => [...currentUsers, newUser]);
    
    console.log('After optimistic update:', getCacheInfo().entries.find(e => e.key === 'server-users'));
    
    // Simulate server operation success/failure
    const serverSuccess = Math.random() > 0.3; // 70% success rate
    
    if (!serverSuccess) {
      // Rollback on server failure
      mutate('server-users', currentUsers => 
        currentUsers.filter(u => u.id !== 999)
      );
      console.log('Server operation failed - rolled back optimistic update');
    } else {
      console.log('Server operation succeeded - optimistic update confirmed');
    }
    
  } catch (error) {
    console.error('Optimistic update failed:', error.message);
  }
}

// Main execution
async function runExamples() {
  console.log('🚀 Revali Node.js Examples');
  console.log('==========================');
  
  try {
    await example1_ApiCaching();
    await example2_DatabaseCaching();
    await example3_ConfigCaching();
    await example4_RealtimeData();
    await example5_CacheManagement();
    await example6_ErrorHandling();
    await example7_OptimisticUpdates();
    
  } catch (error) {
    console.error('Example execution failed:', error.message);
  }
  
  console.log('\n✅ All examples completed!');
  console.log('\nFinal cache state:', getCacheInfo());
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🧹 Cleaning up...');
  clearCache(); // Clear all caches
  console.log('Cache cleared. Goodbye!');
  process.exit(0);
});

// Check if this file is being run directly (ES module equivalent of require.main === module)
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

// Run examples if this file is executed directly
if (isMainModule) {
  runExamples().catch(console.error);
}

// Export for use as a module (ES module exports)
export {
  runExamples
};

// Create exports object for compatibility
export const revaliExports = {
  revaliFetch: revaliFetch.bind(revali),
  subscribe: subscribe.bind(revali),
  mutate: mutate.bind(revali),
  clearCache: clearCache.bind(revali),
  getCacheInfo: getCacheInfo.bind(revali),
  runExamples
};
