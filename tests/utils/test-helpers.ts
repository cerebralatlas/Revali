// -----------------------------
// Test Utilities: Common Helpers
// -----------------------------

import { vi, expect } from 'vitest';

// Helper to create a spy function that tracks calls
export function createSpy<T extends (...args: any[]) => any>(
  implementation?: T
): T & { calls: Parameters<T>[][]; results: ReturnType<T>[] } {
  const calls: Parameters<T>[][] = [];
  const results: ReturnType<T>[] = [];
  
  const spy = ((...args: Parameters<T>) => {
    calls.push(args);
    const result = implementation ? implementation(...args) : undefined;
    results.push(result);
    return result;
  }) as T & { calls: Parameters<T>[][]; results: ReturnType<T>[] };
  
  spy.calls = calls;
  spy.results = results;
  
  return spy;
}

// Helper to wait for a condition to be true
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 10
): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Timeout: condition not met within ${timeout}ms`);
}

// Helper to wait for a specific number of milliseconds
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to create a deferred promise
export function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;
  
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  
  return { promise, resolve, reject };
}

// Helper to mock console methods
export function mockConsole() {
  const originalConsole = { ...console };
  const logs: string[] = [];
  const errors: string[] = [];
  const warns: string[] = [];
  
  console.log = vi.fn((message: string) => logs.push(message));
  console.error = vi.fn((message: string) => errors.push(message));
  console.warn = vi.fn((message: string) => warns.push(message));
  
  return {
    logs,
    errors,
    warns,
    restore: () => {
      Object.assign(console, originalConsole);
    }
  };
}

// Helper to create test data
export function createTestData(id: string | number, overrides: Record<string, any> = {}) {
  return {
    id,
    name: `Test Item ${id}`,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

// Helper to assert error throwing
export async function expectThrowsAsync(
  fn: () => Promise<any>,
  expectedError?: string | RegExp
): Promise<Error> {
  try {
    await fn();
    throw new Error('Expected function to throw, but it did not');
  } catch (error) {
    if (expectedError) {
      const message = error instanceof Error ? error.message : String(error);
      if (typeof expectedError === 'string') {
        expect(message).toContain(expectedError);
      } else {
        expect(message).toMatch(expectedError);
      }
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
