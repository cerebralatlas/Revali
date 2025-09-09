# Framework Examples

This folder contains examples of using Revali with popular JavaScript frameworks.

## 📁 Available Frameworks

### React
- **Location**: `./react/`
- **Status**: 🚧 Coming Soon
- **Features**: Custom hooks, components, TypeScript examples

### Vue
- **Location**: `./vue/`
- **Status**: 🚧 Coming Soon  
- **Features**: Composition API, Options API, TypeScript examples

### Svelte
- **Location**: `./svelte/`
- **Status**: 🚧 Coming Soon
- **Features**: Stores, reactive statements, TypeScript examples

## 🚀 Quick Start for Each Framework

### React Hook Example
```jsx
import { useState, useEffect, useCallback } from 'react';
import { revaliFetch, subscribe, mutate } from 'revali';

function useRevali(key, fetcher, options) {
  const [data, setData] = useState();
  const [error, setError] = useState();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Implementation details in ./react/ folder
  }, [key]);

  return { data, error, isLoading };
}
```

### Vue Composition API Example
```vue
<script setup>
import { ref, onMounted } from 'vue';
import { revaliFetch, subscribe } from 'revali';

function useRevali(key, fetcher, options) {
  const data = ref();
  const error = ref();
  const isLoading = ref(true);

  // Implementation details in ./vue/ folder
  
  return { data, error, isLoading };
}
</script>
```

### Svelte Store Example
```svelte
<script>
import { writable } from 'svelte/store';
import { revaliFetch, subscribe } from 'revali';

function createRevaliStore(key, fetcher, options) {
  // Implementation details in ./svelte/ folder
  
  return writable();
}
</script>
```

## 📋 Planned Examples

Each framework folder will include:

- ✅ **Basic Setup**: How to integrate Revali
- ✅ **Custom Hooks/Composables**: Reusable data fetching logic
- ✅ **TypeScript Support**: Full type safety examples
- ✅ **Error Handling**: Proper error boundaries and handling
- ✅ **Loading States**: Managing loading and error states
- ✅ **Optimistic Updates**: Real-time UI updates
- ✅ **Cache Management**: Manual cache control
- ✅ **Real-world Examples**: Todo apps, user management, etc.

## 🤝 Contributing

Want to contribute framework examples?

1. Choose a framework folder (react/vue/svelte)
2. Create complete working examples
3. Include setup instructions and documentation
4. Submit a pull request

### Example Structure
```
frameworks/
├── react/
│   ├── package.json
│   ├── README.md
│   ├── basic-example/
│   ├── typescript-example/
│   └── advanced-patterns/
├── vue/
│   ├── package.json
│   ├── README.md
│   └── ...
└── svelte/
    ├── package.json
    ├── README.md
    └── ...
```

## 🎯 Framework-Specific Features

### React Specific
- Integration with React Query patterns
- Suspense support
- Error boundaries
- DevTools integration

### Vue Specific  
- Reactive system integration
- Composition API patterns
- Pinia store integration
- Vue DevTools support

### Svelte Specific
- Store patterns
- Reactive statements
- Svelte Kit integration
- Action patterns

## 📚 Resources

- [Main Documentation](../../README.md)
- [Vanilla JS Examples](../vanilla-js/)
- [Node.js Examples](../node-js/)
- [API Reference](../../README.md#api-reference)
