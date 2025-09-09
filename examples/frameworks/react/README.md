# React Examples

🚧 **Coming Soon**

This folder will contain comprehensive React examples for using Revali.

## Planned Examples

- **Basic Hook**: Simple `useRevali` hook implementation
- **TypeScript**: Full TypeScript integration
- **Error Boundaries**: Proper error handling patterns
- **Suspense**: Integration with React Suspense
- **Advanced Patterns**: Complex state management scenarios
- **Todo App**: Complete application example

## Preview: useRevali Hook

```jsx
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
  // Implementation coming soon...
}
```

## Contributing

Want to help create React examples? Please see our [Contributing Guide](../../../CONTRIBUTING.md).
