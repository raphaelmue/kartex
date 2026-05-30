import {
  BookOpen,
  Compass,
  LayoutDashboard,
  Moon,
  Settings,
  Shield,
  Sun,
  Upload,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/decks', label: 'Decks', icon: BookOpen },
  { to: '/import', label: 'Import', icon: Upload },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppShell() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const handleLogout = () => {
    void logout()
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-card border-r border-border flex flex-col h-full">
        {/* Brand area */}
        <div className="h-16 flex items-center px-4">
          <span className="text-xl font-bold">Kartex</span>
        </div>

        {/* Nav */}
        <nav
          aria-label="Main navigation"
          className="flex-1 flex flex-col gap-1 px-2 py-2"
        >
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 h-11 px-4 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 transition-colors',
                  isActive && 'bg-accent text-accent-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'h-5 w-5',
                      isActive ? 'text-accent-foreground' : 'text-muted-foreground',
                    )}
                    aria-hidden="true"
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}

          {/* Admin link — only for admins */}
          {user?.role === 'ADMIN' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 h-11 px-4 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 transition-colors',
                  isActive && 'bg-accent text-accent-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Shield
                    className={cn(
                      'h-5 w-5',
                      isActive ? 'text-accent-foreground' : 'text-muted-foreground',
                    )}
                    aria-hidden="true"
                  />
                  Admin
                </>
              )}
            </NavLink>
          )}
        </nav>

        {/* User area */}
        <div className="h-16 border-t border-border flex items-center gap-2 px-4">
          <span className="text-sm text-muted-foreground flex-1 truncate">
            {user?.username}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background p-8">
        <Outlet />
      </main>
    </div>
  )
}
