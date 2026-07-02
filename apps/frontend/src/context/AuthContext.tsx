import React, { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { api, setAuthFailureHandler } from '@/lib/api'
import type { StudyMode } from '@kartex/shared'

export interface User {
  id: string
  username: string
  role: 'ADMIN' | 'USER'
  isActive: boolean
  studyMode: StudyMode
  createdAt: string
  email: string | null
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  setUser: (u: User | null) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Register auth failure handler once on mount
    setAuthFailureHandler(() => {
      setUser(null)
      navigate('/login')
      toast.error('Your session has expired. Please sign in again.')
    })

    // Hydrate session using plain fetch — NOT the api wrapper.
    // The api wrapper calls onAuthFailure() when /api/auth/me returns 401 + refresh fails,
    // which redirects unauthenticated users away from public routes (e.g. /invite/:token).
    // A 401 on initial load means "not logged in", not "session expired".
    const hydrateSession = async () => {
      try {
        let res = await fetch('/api/auth/me', { credentials: 'include' })
        if (res.status === 401) {
          // Silently try to refresh — access token may be expired but refresh token valid
          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          })
          if (refreshRes.ok) {
            res = await fetch('/api/auth/me', { credentials: 'include' })
          }
        }
        if (res.ok) {
          const data = await res.json()
          setUser(data)
        } else {
          setUser(null)
        }
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    void hydrateSession()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const logout = async () => {
    try {
      await api.post('/api/auth/logout')
    } catch {
      // Fail-open: even if request fails, clear state and navigate
    } finally {
      setUser(null)
      navigate('/login')
    }
  }

  // Render nothing while initial auth check is in flight (prevents flash of redirect)
  if (loading) {
    return null
  }

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
