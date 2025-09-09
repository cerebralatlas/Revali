# Vue Examples

🚧 **Coming Soon**

This folder will contain comprehensive Vue examples for using Revali with both Composition API and Options API.

## Planned Examples

- **Composition API**: Modern Vue 3 patterns with `useRevali`
- **Options API**: Vue 2 compatible patterns
- **TypeScript**: Full TypeScript integration
- **Pinia Integration**: State management patterns
- **Error Handling**: Proper error handling patterns
- **Todo App**: Complete application example

## Preview: useRevali Composable

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
  // Implementation coming soon...
}
</script>
```

## Contributing

Want to help create Vue examples? Please see our [Contributing Guide](../../../CONTRIBUTING.md).
