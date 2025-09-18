import React from 'react'
import { UserProfile } from './components/UserProfile'
import { PostsList } from './components/PostsList'
import { LiveStats } from './components/LiveStats'
import { ErrorBoundary } from './components/ErrorBoundary'

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>Revali React Examples</h1>
        <p>Framework-agnostic SWR data fetching library with React integration</p>
      </header>

      <div className="examples">
        <ErrorBoundary>
          <section className="example-section">
            <h2>🎨 User Profile with Optimistic Updates</h2>
            <p>Demonstrates basic data fetching, loading states, and optimistic updates</p>
            <UserProfile userId="1" />
          </section>
        </ErrorBoundary>

        <ErrorBoundary>
          <section className="example-section">
            <h2>📋 Posts List with Key Changes</h2>
            <p>Shows how the hook responds to key changes and different users</p>
            <PostsList />
          </section>
        </ErrorBoundary>

        <ErrorBoundary>
          <section className="example-section">
            <h2>📊 Live Statistics with Polling</h2>
            <p>Real-time data updates using polling intervals</p>
            <LiveStats />
          </section>
        </ErrorBoundary>
      </div>
    </div>
  )
}

export default App