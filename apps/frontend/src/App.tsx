import { Clock } from 'lucide-react'
import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AdminRoute } from '@/components/AdminRoute'
import { AppShell } from '@/components/AppShell'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthProvider } from '@/context/AuthContext'
import { AdminPage } from '@/pages/AdminPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'

// Coming soon placeholder for Phase 2+ routes
function ComingSoon({ title }: { title: string }) {
  useEffect(() => {
    document.title = `${title} — Kartex`
  }, [title])

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <Clock className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <h2 className="text-xl font-semibold">Coming soon</h2>
      <p className="text-sm text-muted-foreground">This feature is being built.</p>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<ComingSoon title="Dashboard" />} />
            <Route path="/decks" element={<ComingSoon title="Decks" />} />
            <Route path="/import" element={<ComingSoon title="Import" />} />
            <Route path="/explore" element={<ComingSoon title="Explore" />} />
            <Route path="/settings" element={<ComingSoon title="Settings" />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
