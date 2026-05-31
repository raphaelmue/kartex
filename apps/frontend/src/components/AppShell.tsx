import { useState } from 'react'
import {
  BookOpen,
  Compass,
  LayoutDashboard,
  Menu,
  Moon,
  Settings,
  Shield,
  Sun,
  Upload,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

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
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  const currentLabel =
    navItems.find(item => location.pathname.startsWith(item.to))?.label ??
    (location.pathname.startsWith('/admin') ? 'Admin' : 'Kartex')

  const GITHUB_URL = 'https://github.com/raphaelmue/kartex'
  const DOCS_URL = 'https://github.com/raphaelmue/kartex/blob/main/docs/kartex-format.md'

  const handleLogout = () => {
    void logout()
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 bg-card border-r border-border flex-col h-full">
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

      {/* Mobile backdrop — renders only when drawer is open */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          aria-hidden="true"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer panel — always in DOM for CSS transform animation */}
      <div
        id="mobile-nav-drawer"
        className={cn(
          'fixed top-0 left-0 h-full w-60 bg-card border-r border-border z-50 flex flex-col',
          'transition-transform duration-200 ease-in-out',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-hidden={!drawerOpen}
      >
        {/* Drawer brand area */}
        <div className="h-16 flex items-center px-4">
          <span className="text-xl font-bold">Kartex</span>
        </div>

        {/* Drawer nav — mirrors desktop sidebar */}
        <nav
          aria-label="Main navigation"
          className="flex-1 flex flex-col gap-1 px-2 py-2"
        >
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setDrawerOpen(false)}
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
              onClick={() => setDrawerOpen(false)}
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

        {/* Drawer user area */}
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
      </div>

      {/* Right column — topbar + main content + footer */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Page title bar — always visible; hamburger hidden on desktop */}
        <header className="flex items-center gap-2 h-16 px-4 bg-card border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
          <span className="text-base font-semibold">{currentLabel}</span>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-background p-8">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="h-10 shrink-0 border-t border-border flex items-center justify-between px-4 text-xs text-muted-foreground">
          <span>
            v{__APP_VERSION__}&nbsp;·&nbsp;© Kartex
          </span>
          <div className="flex items-center gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground underline-offset-4 hover:underline"
            >
              GitHub
            </a>
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground underline-offset-4 hover:underline"
            >
              Docs
            </a>
          </div>
        </footer>
      </div>
    </div>
  )
}
