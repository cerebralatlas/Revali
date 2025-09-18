import React, { useState } from 'react'
import { useRevali } from 'revali/frameworks/react'

interface User {
  id: number
  name: string
  email: string
  avatar: string
  bio: string
}

interface UserProfileProps {
  userId: string
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [newName, setNewName] = useState('')

  const { data: user, error, isLoading, isValidating, mutate } = useRevali<User>(
    `user-${userId}`,
    async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      return {
        id: parseInt(userId),
        name: 'John Doe',
        email: 'john.doe@example.com',
        avatar: `https://ui-avatars.com/api/?name=John+Doe&background=007bff&color=fff`,
        bio: 'Software developer passionate about React and TypeScript'
      }
    },
    {
      ttl: 5 * 60 * 1000, // 5 minutes cache
      retries: 2,
      revalidateOnFocus: true
    }
  )

  const handleUpdateName = () => {
    if (!newName.trim()) return

    // Optimistic update
    mutate(
      (prevUser) => prevUser ? { ...prevUser, name: newName } : undefined,
      true // Revalidate after mutation
    )

    setNewName('')
    setIsEditing(false)
  }

  if (isLoading) {
    return <div className="loading">Loading user profile...⏳</div>
  }

  if (error) {
    return <div className="error">Error loading user: {error.message}❌</div>
  }

  if (!user) {
    return <div className="error">User not found❌</div>
  }

  return (
    <div className="user-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <img
          src={user.avatar}
          alt={user.name}
          style={{ width: '64px', height: '64px', borderRadius: '50%' }}
        />
        <div style={{ flex: 1 }}>
          {isEditing ? (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter new name"
                style={{
                  padding: '4px 8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
              <button className="button" onClick={handleUpdateName}>Save</button>
              <button
                className="button"
                onClick={() => setIsEditing(false)}
                style={{ background: '#6c757d' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <h3>{user.name}</h3>
          )}
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Bio:</strong> {user.bio}</p>
        </div>
      </div>

      <div style={{ marginTop: '16px' }}>
        {!isEditing && (
          <button
            className="button"
            onClick={() => {
              setNewName(user.name)
              setIsEditing(true)
            }}
          >
            Edit Name ✏️
          </button>
        )}

        <button
          className="button"
          onClick={() => {
            // Manual revalidation
            window.dispatchEvent(new FocusEvent('focus'))
          }}
        >
          Refresh 🔄
        </button>
      </div>

      {isValidating && <div className="validating">Updating...⏳</div>}
    </div>
  )
}