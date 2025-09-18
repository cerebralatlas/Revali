import React from 'react'
import { useRevali } from 'revali/frameworks/react'

interface Stats {
  activeUsers: number
  totalPosts: number
  serverLoad: number
  responseTime: number
}

export const LiveStats: React.FC = () => {
  const { data: stats, error, isLoading, isValidating } = useRevali<Stats>(
    'live-stats',
    async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))

      return {
        activeUsers: Math.floor(Math.random() * 100) + 50,
        totalPosts: Math.floor(Math.random() * 500) + 200,
        serverLoad: Math.floor(Math.random() * 40) + 10,
        responseTime: Math.floor(Math.random() * 200) + 50
      }
    },
    {
      ttl: 30 * 1000, // 30 seconds cache
      refreshInterval: 5 * 1000, // Poll every 5 seconds
      refreshWhenHidden: false, // Pause when tab is not active
      revalidateOnFocus: true
    }
  )

  if (isLoading) {
    return <div className="loading">Loading statistics...⏳</div>
  }

  if (error) {
    return <div className="error">Error loading stats: {error.message}❌</div>
  }

  if (!stats) {
    return <div className="error">No statistics available❌</div>
  }

  return (
    <div>
      <div className="stats">
        <div className="stat-card">
          <h4>Active Users</h4>
          <p>{stats.activeUsers}</p>
        </div>
        <div className="stat-card">
          <h4>Total Posts</h4>
          <p>{stats.totalPosts}</p>
        </div>
        <div className="stat-card">
          <h4>Server Load</h4>
          <p>{stats.serverLoad}%</p>
        </div>
        <div className="stat-card">
          <h4>Response Time</h4>
          <p>{stats.responseTime}ms</p>
        </div>
      </div>

      <div style={{ textAlign: 'center', color: '#666' }}>
        <p>📊 Statistics update every 5 seconds</p>
        {isValidating && <div className="validating">Updating statistics...⏳</div>}
      </div>
    </div>
  )
}