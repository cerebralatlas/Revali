// -----------------------------
// Revali Polling Demo
// Demonstrates the new polling/interval revalidation feature
// -----------------------------

import { revaliFetch, getPollingInfo, hasActivePolling, subscribe, cleanupPolling } from '../../dist/index.js';

// Mock API that returns current timestamp
const mockApi = () => {
  const data = {
    timestamp: new Date().toISOString(),
    value: Math.floor(Math.random() * 100),
  };
  console.log(`📡 API called, returning:`, data);
  return Promise.resolve(data);
};

async function pollingDemo() {
  console.log('🚀 Starting Revali Polling Demo\n');

  // Subscribe to data updates
  const unsubscribe = subscribe('live-data', (data, error) => {
    if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log('🔔 Data updated:', data);
    }
  });

  try {
    // Fetch with polling enabled
    console.log('1️⃣  Fetching data with 3-second polling interval...');
    const initialData = await revaliFetch('live-data', mockApi, {
      refreshInterval: 3000,      // Poll every 3 seconds
      ttl: 10000,                // Cache for 10 seconds
      refreshWhenHidden: true,   // Continue polling when tab is hidden
      dedupingInterval: 1000,    // Prevent requests closer than 1 second
    });

    console.log('📦 Initial data:', initialData);
    console.log('📊 Polling info:', getPollingInfo());
    console.log('🔍 Has active polling:', hasActivePolling('live-data'));

    // Wait to see polling in action
    console.log('\n2️⃣  Waiting 10 seconds to observe polling...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('\n3️⃣  Fetching again (should return cached data and refresh in background)...');
    const cachedData = await revaliFetch('live-data', mockApi, {
      refreshInterval: 3000,
      ttl: 10000,
    });
    console.log('📦 Cached data:', cachedData);

    // Wait a bit more
    console.log('\n4️⃣  Waiting 5 more seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    unsubscribe();
    cleanupPolling();
    console.log('📊 Final polling info:', getPollingInfo());
  }

  console.log('\n✅ Demo completed!');
}

// Run the demo
pollingDemo().catch(console.error);
