# Revali Examples

This directory contains example implementations showing how to use Revali in different scenarios, organized by platform and framework.

## 📁 Directory Structure

```
examples/
├── vanilla-js/          # Pure JavaScript examples
│   ├── demo.html        # Comprehensive interactive demo
│   ├── simple.html      # Basic usage patterns
│   ├── package.json     # Dependencies and scripts
│   └── README.md        # Vanilla JS documentation
├── node-js/             # Server-side Node.js examples
│   ├── basic-example.js # Comprehensive Node.js demo
│   ├── package.json     # Dependencies and scripts  
│   └── README.md        # Node.js documentation
├── frameworks/          # Framework-specific examples
│   ├── react/          # React examples (Coming Soon)
│   ├── vue/            # Vue examples (Coming Soon)
│   ├── svelte/         # Svelte examples (Coming Soon)
│   └── README.md       # Framework examples overview
└── README.md           # This file
```

## 🚀 Quick Start by Platform

### Vanilla JavaScript

**Perfect for:** Learning Revali basics, simple websites, prototypes

```bash
cd vanilla-js
npm install
npm start
# Visit http://localhost:3000
```

**Features demonstrated:**

- ✅ Basic data fetching with caching
- ✅ Real-time subscriptions and updates
- ✅ Optimistic updates with rollback
- ✅ Error handling and retry mechanisms
- ✅ Cache management and introspection
- ✅ Activity logging

### Node.js

**Perfect for:** Server-side caching, API backends, microservices

```bash
cd node-js
npm install
npm start
```

**Features demonstrated:**

- ✅ API response caching
- ✅ Database query caching
- ✅ Configuration caching
- ✅ Real-time data with subscriptions
- ✅ Error handling and retry logic
- ✅ Optimistic updates for server operations

### Frameworks

**Perfect for:** Production applications, complex UIs, team projects

```bash
cd frameworks/react    # or vue/svelte
# Coming soon - check individual README files
```

**Coming Soon:**

- 🚧 React hooks and components
- 🚧 Vue Composition API and Options API
- 🚧 Svelte stores and reactive patterns

## 📋 Choose Your Starting Point

| Platform | Best For | Complexity | Setup Time |
|----------|----------|------------|------------|
| **Vanilla JS** | Learning, prototypes, simple sites | ⭐ | < 1 min |
| **Node.js** | Server-side, APIs, microservices | ⭐⭐ | < 2 min |
| **React** | Modern React apps | ⭐⭐⭐ | 🚧 Soon |
| **Vue** | Vue 3 applications | ⭐⭐⭐ | 🚧 Soon |
| **Svelte** | Svelte/SvelteKit apps | ⭐⭐⭐ | 🚧 Soon |

## 🎯 Real Project Usage

Once Revali is published to npm, you can install and use it:

### Installation

```bash
npm install revali
# or
yarn add revali
# or
pnpm add revali
```

### Basic Implementation

```javascript
import { revaliFetch, subscribe, mutate } from 'revali';

// Fetch with caching
const users = await revaliFetch(
  'users', 
  () => fetch('/api/users').then(r => r.json()),
  { ttl: 5 * 60 * 1000 } // 5 minutes cache
);

// Subscribe to updates
const unsubscribe = subscribe('users', (data, error) => {
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Updated users:', data);
  }
});

// Optimistic updates
mutate('users', users => [...users, newUser], true);
```

## 🌐 Framework Integration Previews

### React Hook Preview

```jsx
import { useState, useEffect, useCallback } from 'react';
import { revaliFetch, subscribe, mutate } from 'revali';

function useRevali(key, fetcher, options) {
  const [data, setData] = useState();
  const [error, setError] = useState();
  const [isLoading, setIsLoading] = useState(true);

  // Full implementation in frameworks/react/
  
  return { data, error, isLoading, mutate };
}

// Usage
function UserList() {
  const { data: users, error, isLoading } = useRevali(
    'users',
    () => fetch('/api/users').then(r => r.json()),
    { ttl: 5 * 60 * 1000 }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {users?.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### Vue Composable Preview

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { revaliFetch, subscribe } from 'revali';

function useRevali(key, fetcher, options) {
  const data = ref();
  const error = ref();
  const isLoading = ref(true);

  // Full implementation in frameworks/vue/
  
  return { data, error, isLoading };
}

const { data: users, error, isLoading } = useRevali(
  'users',
  () => fetch('/api/users').then(r => r.json())
);
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <ul v-else>
    <li v-for="user in users" :key="user.id">
      {{ user.name }}
    </li>
  </ul>
</template>
```

### Svelte Store Preview

```svelte
<script>
  import { writable } from 'svelte/store';
  import { revaliFetch, subscribe } from 'revali';

  function createRevaliStore(key, fetcher, options) {
    // Full implementation in frameworks/svelte/
    return writable();
  }

  const users = createRevaliStore(
    'users',
    () => fetch('/api/users').then(r => r.json())
  );
</script>

{#if $users.isLoading}
  <div>Loading...</div>
{:else if $users.error}
  <div>Error: {$users.error.message}</div>
{:else}
  <ul>
    {#each $users.data as user (user.id)}
      <li>{user.name}</li>
    {/each}
  </ul>
{/if}
```

## 🏗️ Advanced Patterns

### Error Boundaries & Retry

```javascript
const userData = await revaliFetch(
  'user/123',
  () => fetch('/api/user/123').then(r => r.json()),
  {
    ttl: 5 * 60 * 1000,      // 5 minutes cache
    retries: 3,               // Retry 3 times
    retryDelay: 1000,         // Start with 1s delay
    revalidateOnFocus: true,  // Refresh on window focus
    revalidateOnReconnect: true // Refresh on network reconnect
  }
);
```

### Optimistic Updates with Rollback

```javascript
async function updateUser(userId, updates) {
  try {
    // Optimistic update
    const oldUser = mutate(`user/${userId}`, user => ({ ...user, ...updates }), false);
    
    // Server request
    const response = await fetch(`/api/user/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) throw new Error('Update failed');
    
    const updatedUser = await response.json();
    mutate(`user/${userId}`, updatedUser, true); // Revalidate
    
  } catch (error) {
    // Rollback on error
    mutate(`user/${userId}`, oldUser, false);
    throw error;
  }
}
```

### Cache Management

```javascript
import { clearCache, getCacheInfo, cleanup } from 'revali';

// Clear specific cache
clearCache('users');

// Clear all cache
clearCache();

// Get cache information
const info = getCacheInfo();
console.log(`Cache has ${info.size} entries:`, info.keys);

// Complete cleanup (cache + subscribers)
cleanup();
```

## 🤝 Contributing Examples

Found an issue or want to add a new example?

1. Fork the repository
2. Choose the appropriate folder (vanilla-js, node-js, frameworks/*)
3. Create your example with proper documentation
4. Update relevant README files
5. Submit a pull request

### Example Structure Guidelines

```
your-example/
├── package.json      # Dependencies and scripts
├── README.md         # Setup and usage instructions  
├── src/             # Source code
└── docs/            # Additional documentation
```

## 🎯 Examples We'd Love to See

### Vanilla JavaScript

- Progressive Web App (PWA) integration
- Service Worker caching strategies
- WebSocket real-time examples
- Performance benchmarks

### Node.js

- Express.js middleware
- Fastify plugin
- GraphQL resolvers
- Database ORM integration

### Framework Examples

- TypeScript implementations
- State management integration
- SSR/SSG patterns
- Testing strategies

## 📚 Resources

- [Main Documentation](../README.md) - Complete API documentation
- [Contributing Guide](../CONTRIBUTING.md) - Development setup
- [Release Guide](../RELEASE.md) - Publishing information

## 💡 Tips

- **Start Simple**: Begin with vanilla-js examples to understand core concepts
- **Check Prerequisites**: Each folder has its own requirements and setup
- **Read the Docs**: Each subfolder has detailed README files
- **Ask for Help**: Use GitHub issues for questions and suggestions

---

**Happy coding with Revali!** 🚀
