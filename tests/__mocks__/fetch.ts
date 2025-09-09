// -----------------------------
// Test Utilities: Fetch Mock
// -----------------------------

export interface MockFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<any>;
  text: () => Promise<string>;
}

export interface MockFetchOptions {
  delay?: number;
  shouldFail?: boolean;
  failureRate?: number; // 0-1, percentage of requests that should fail
  response?: any;
  status?: number;
}

class MockFetch {
  private callCount = 0;
  private responses: Map<string, MockFetchOptions> = new Map();
  
  // Configure mock response for a specific URL
  mockResponse(url: string, options: MockFetchOptions) {
    this.responses.set(url, options);
  }
  
  // Clear all mock configurations
  clearMocks() {
    this.responses.clear();
    this.callCount = 0;
  }
  
  // Get call statistics
  getCallCount() {
    return this.callCount;
  }
  
  // Mock fetch implementation
  async fetch(url: string): Promise<MockFetchResponse> {
    this.callCount++;
    
    const config = this.responses.get(url) || {};
    const {
      delay = 0,
      shouldFail = false,
      failureRate = 0,
      response = { data: `mock-data-${this.callCount}` },
      status = 200
    } = config;
    
    // Simulate network delay
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Simulate random failures
    const shouldFailRandomly = Math.random() < failureRate;
    
    if (shouldFail || shouldFailRandomly) {
      throw new Error(`Mock fetch failed for ${url}`);
    }
    
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: async () => response,
      text: async () => JSON.stringify(response),
    };
  }
}

export const mockFetch = new MockFetch();

// Helper function to create a mock fetcher
export function createMockFetcher<T>(url: string, options?: MockFetchOptions) {
  if (options) {
    mockFetch.mockResponse(url, options);
  }
  
  return async (): Promise<T> => {
    const response = await mockFetch.fetch(url);
    return response.json();
  };
}

// Helper to create a failing fetcher
export function createFailingFetcher(errorMessage = 'Fetch failed'): () => Promise<never> {
  return async () => {
    throw new Error(errorMessage);
  };
}

// Helper to create a delayed fetcher
export function createDelayedFetcher<T>(data: T, delay: number) {
  return async (): Promise<T> => {
    await new Promise(resolve => setTimeout(resolve, delay));
    return data;
  };
}
