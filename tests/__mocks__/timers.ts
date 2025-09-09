// -----------------------------
// Test Utilities: Timer Mocks
// -----------------------------

export class MockTimers {
  private timers: Map<number, NodeJS.Timeout> = new Map();
  private timerId = 0;
  
  // Mock setTimeout
  setTimeout(callback: () => void, delay: number): number {
    const id = ++this.timerId;
    const timer = setTimeout(() => {
      this.timers.delete(id);
      callback();
    }, delay);
    
    this.timers.set(id, timer);
    return id;
  }
  
  // Mock clearTimeout
  clearTimeout(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }
  
  // Clear all timers
  clearAllTimers(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
  
  // Get active timer count
  getActiveTimerCount(): number {
    return this.timers.size;
  }
}

export const mockTimers = new MockTimers();

// Helper to wait for all pending timers
export function flushPromises(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// Helper to advance time and flush promises
export async function advanceTimersAndFlush(ms: number): Promise<void> {
  // This function should be called with vi imported in the test file
  // vi.advanceTimersByTime(ms);
  await flushPromises();
}
