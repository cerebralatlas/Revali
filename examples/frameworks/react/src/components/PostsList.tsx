import React, { useState } from 'react'
import { useRevali } from 'revali/frameworks/react'

interface Post {
  id: number
  title: string
  body: string
  userId: number
}

interface PostsData {
  posts: Post[]
  userName: string
}

export const PostsList: React.FC = () => {
  const [selectedUserId, setSelectedUserId] = useState('1')

  const { data, error, isLoading, isValidating } = useRevali<PostsData>(
    `posts-user-${selectedUserId}`,
    async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800))

      const users = {
        '1': { name: 'John Doe', posts: 3 },
        '2': { name: 'Jane Smith', posts: 2 },
        '3': { name: 'Bob Johnson', posts: 4 }
      }

      const user = users[selectedUserId as keyof typeof users]

      return {
        posts: Array.from({ length: user.posts }, (_, i) => ({
          id: i + 1,
          title: `${user.name}'s Post ${i + 1}`,
          body: `This is a sample post content from ${user.name}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
          userId: parseInt(selectedUserId)
        })),
        userName: user.name
      }
    },
    {
      ttl: 2 * 60 * 1000, // 2 minutes cache
      revalidateOnFocus: true
    }
  )

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId)
  }

  if (isLoading) {
    return <div className="loading">Loading posts...⏳</div>
  }

  if (error) {
    return <div className="error">Error loading posts: {error.message}❌</div>
  }

  if (!data) {
    return <div className="error">No posts found❌</div>
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h3>Posts by {data.userName}</h3>
        <div style={{ marginTop: '12px' }}>
          <label style={{ marginRight: '12px', fontWeight: 'bold' }}>
            Select User:
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => handleUserChange(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="1">John Doe</option>
            <option value="2">Jane Smith</option>
            <option value="3">Bob Johnson</option>
          </select>
        </div>
      </div>

      <ul className="posts-list">
        {data.posts.map((post) => (
          <li key={post.id} className="post-item">
            <h4>{post.title}</h4>
            <p>{post.body}</p>
          </li>
        ))}
      </ul>

      {isValidating && <div className="validating">Updating posts...⏳</div>}
    </div>
  )
}