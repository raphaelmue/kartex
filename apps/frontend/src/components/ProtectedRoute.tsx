import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'

export function ProtectedRoute() {
  const auth = useAuth()

  // Still loading initial auth check — render nothing to avoid flash of redirect
  if (auth.loading) {
    return null
  }

  if (!auth.user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
