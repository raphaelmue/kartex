import { AlertTriangle, Clock } from 'lucide-react'
import { Component, ReactNode, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AdminRoute } from '@/components/AdminRoute'
import { AppShell } from '@/components/AppShell'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthProvider } from '@/context/AuthContext'
import { AdminPage } from '@/pages/AdminPage'
import { DeckDetailPage } from '@/pages/DeckDetailPage'
import { DecksPage } from '@/pages/DecksPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'

// Root error boundary — prevents uncaught render errors from showing a blank screen
interface ErrorBoundaryState { hasError: boolean; message: string }
class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, message: '' }
  }
  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
    return { hasError: true, message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground max-w-md">{this.state.message}</p>
          <button
            className="text-sm underline text-muted-foreground"
            onClick={() => this.setState({ hasError: false, message: '' })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

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
    <ErrorBoundary>
      <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<ComingSoon title="Dashboard" />} />
            <Route path="/decks" element={<DecksPage />} />
            <Route path="/decks/:id" element={<DeckDetailPage />} />
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
    </ErrorBoundary>
  )
}

export default App
