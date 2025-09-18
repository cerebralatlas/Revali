# React Examples

This folder contains comprehensive React examples for using Revali with the `useRevali` hook.

## 🚀 Quick Start

The example application demonstrates:

- **🎨 User Profile with Optimistic Updates**: Basic data fetching with loading states and manual mutations
- **📋 Posts List with Key Changes**: Shows how the hook responds to key changes and different users
- **📊 Live Statistics with Polling**: Real-time data updates using polling intervals
- **🛡️ Error Boundaries**: Proper error handling patterns

## 🏃‍♂️ Running the Example

```bash
# Navigate to the React example directory
cd examples/frameworks/react

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open http://localhost:5173 in your browser
```

## 📖 Usage Examples

### Basic Usage

```tsx
import { useRevali } from 'revali/frameworks/react'

function UserProfile({ userId }: { userId: string }) {
  const { data, error, isLoading, isValidating, mutate } = useRevali(
    `user-${userId}`,
    () => fetch(`/api/users/${userId}`).then(r => r.json()),
    { ttl: 5 * 60 * 1000 } // 5 minutes cache
  )

  if (isLoading) return <div>Loading...⏳</div>
  if (error) return <div>Error: {error.message}❌</div>

  return (
    <div>
      <h1>{data?.name}</h1>
      <p>{data?.email}</p>

      {isValidating && <p>Updating...⏳</p>}

      <button onClick={() => mutate({ ...data, name: 'New Name' })}>
        Update Name
      </button>
    </div>
  )
}
```

### With Polling

```tsx
const { data, error, isLoading } = useRevali(
  'live-stats',
  () => fetch('/api/stats').then(r => r.json()),
  {
    refreshInterval: 5000, // Poll every 5 seconds
    refreshWhenHidden: false, // Pause when tab is not active
    ttl: 30 * 1000 // 30 seconds cache
  }
)
```

### Optimistic Updates

```tsx
const handleUpdate = (newData) => {
  // Update UI immediately, then revalidate
  mutate(newData, true)
}

const handleOptimisticUpdate = (newData) => {
  // Update UI immediately with function, then revalidate
  mutate(
    (prevData) => ({ ...prevData, ...newData }),
    true // Revalidate after mutation
  )
}
```

## 🎯 Key Features Demonstrated

### 🔄 State Management
- `data`: The fetched data (cached or fresh)
- `error`: Any error that occurred during fetching
- `isLoading`: Initial loading state
- `isValidating`: Background revalidation state
- `mutate`: Function to manually update data

### ⚡ Performance Features
- **Request Deduplication**: Multiple components using the same key share the same request
- **Background Revalidation**: Data updates without blocking the UI
- **Memory Management**: Automatic cleanup and cache size limits
- **Focus/Reconnect Revalidation**: Automatic updates when user returns to tab

### 🛡️ Error Handling
- Graceful error states with retry mechanisms
- Proper TypeScript error typing
- Error boundary integration

### 🔄 Key-based Caching
- Automatic cache invalidation on key changes
- Consistent data across components
- Manual cache management with `mutate()`

## 🧪 TypeScript Support

The hook is fully typed with generics:

```tsx
interface User {
  id: number
  name: string
  email: string
}

const { data, error, isLoading } = useRevali<User>(
  'user-1',
  () => fetch('/api/user/1').then(r => r.json())
)

// data is typed as User | undefined
// error is typed as Error | undefined
```

## 🔄 Advanced Patterns

### Key Changes
```tsx
const [userId, setUserId] = useState('1')
const { data } = useRevali(`user-${userId}`, fetcher)

// Changing userId automatically fetches new data
setUserId('2') // Triggers refetch for user-2
```

### Conditional Fetching
```tsx
const shouldFetch = userId != null
const { data } = useRevali(
  shouldFetch ? `user-${userId}` : null,
  () => fetch(`/api/users/${userId}`).then(r => r.json())
)
```

### Request Cancellation
```tsx
const { data } = useRevali(
  'search-query',
  async (signal) => {
    const response = await fetch(`/api/search?q=${query}`, { signal })
    return response.json()
  },
  {
    abortOnRevalidate: true // Cancel previous search when query changes
  }
)
```

## 🚀 Performance Tips

1. **Use stable keys**: Consistent, descriptive cache keys
2. **Appropriate TTL**: Set cache duration based on data volatility
3. **Conditional fetching**: Skip unnecessary requests
4. **Error boundaries**: Handle errors gracefully
5. **Optimistic updates**: Improve perceived performance

## 🔧 Development

### Build the Example
```bash
pnpm build
```

### Type Check
```bash
pnpm tsc --noEmit
```

### Lint
```bash
pnpm lint
```

## 📚 More Examples

- **Suspense Integration**: Coming soon
- **Custom Hooks**: Coming soon
- **Advanced State Management**: Coming soon
- **Testing Patterns**: Coming soon

---

**Happy coding with Revali! 🚀**