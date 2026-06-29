import { AlertTriangle } from 'lucide-react'
import { Component, ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AdminRoute } from '@/components/AdminRoute'
import { AppShell } from '@/components/AppShell'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthProvider } from '@/context/AuthContext'
import { AdminPage } from '@/pages/AdminPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { DeckDetailPage } from '@/pages/DeckDetailPage'
import { DecksPage } from '@/pages/DecksPage'
import { LoginPage } from '@/pages/LoginPage'
import { InviteRegisterPage } from '@/pages/InviteRegisterPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { ImportPage } from '@/pages/ImportPage'
import { StudySessionPage } from '@/pages/StudySessionPage'
import { ExplorePage } from '@/pages/ExplorePage'
import { SettingsPage } from '@/pages/SettingsPage'

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


function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/invite/:token" element={<InviteRegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/decks" element={<DecksPage />} />
            <Route path="/decks/:id" element={<DeckDetailPage />} />
            <Route path="/decks/:id/learn" element={<StudySessionPage />} />
            <Route path="/study" element={<StudySessionPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/settings" element={<SettingsPage />} />
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
