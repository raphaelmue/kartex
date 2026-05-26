import React from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '@/context/AuthContext'

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const auth = useAuth()

  if (auth.loading) {
    return null
  }

  if (!auth.user) {
    return <Navigate to="/login" replace />
  }

  if (auth.user.role !== 'ADMIN') {
    toast.warning('Access denied.')
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
