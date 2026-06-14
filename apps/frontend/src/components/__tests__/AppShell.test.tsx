import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'

// Set build-time constant that Vite define would inject
;(globalThis as Record<string, unknown>).__APP_VERSION__ = '1.0.0'

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', username: 'testuser', role: 'USER', isActive: true, createdAt: '2026-01-01' },
    loading: false,
    setUser: vi.fn(),
    logout: vi.fn(),
  }),
}))

// Mock ThemeContext
vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: vi.fn(),
  }),
}))

// Mock react-router-dom — keep real module but override useLocation
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useLocation: () => ({
      pathname: '/dashboard',
      search: '',
      hash: '',
      state: null,
      key: 'default',
    }),
  }
})

function renderAppShell() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AppShell />
    </MemoryRouter>
  )
}

describe('SHELL-01: Mobile sidebar collapse', () => {
  it('SHELL-01a: aside element has class "hidden" (mobile-hidden sidebar)', () => {
    renderAppShell()
    const aside = document.querySelector('aside')
    expect(aside).not.toBeNull()
    expect(aside!.className).toContain('hidden')
  })

  it('SHELL-01b: header contains hamburger button with aria-label "Open navigation menu"; button is md:hidden on desktop', () => {
    renderAppShell()
    const hamburger = screen.getByRole('button', { name: /open navigation menu/i })
    expect(hamburger).toBeTruthy()
    // Hamburger button itself is hidden on desktop (md:hidden); header is always visible
    expect(hamburger.className).toContain('md:hidden')
    const header = hamburger.closest('header')
    expect(header).not.toBeNull()
  })
})

describe('SHELL-02: Mobile overlay drawer', () => {
  it('SHELL-02a: clicking hamburger opens drawer (translate-x-0 class on drawer panel)', () => {
    renderAppShell()
    const hamburger = screen.getByRole('button', { name: /open navigation menu/i })
    fireEvent.click(hamburger)
    const drawer = document.getElementById('mobile-nav-drawer')
    expect(drawer).not.toBeNull()
    expect(drawer!.className).toContain('translate-x-0')
  })

  it('SHELL-02b: clicking backdrop closes drawer (-translate-x-full class on drawer panel)', () => {
    renderAppShell()
    // Open drawer first
    const hamburger = screen.getByRole('button', { name: /open navigation menu/i })
    fireEvent.click(hamburger)

    // Drawer should be open now
    const drawer = document.getElementById('mobile-nav-drawer')
    expect(drawer!.className).toContain('translate-x-0')

    // Click the backdrop
    const backdrop = screen.getByTestId('mobile-backdrop')
    fireEvent.click(backdrop)

    // Drawer should be closed
    expect(drawer!.className).toContain('-translate-x-full')
  })

  it('SHELL-02c: clicking a NavLink inside the drawer closes the drawer', () => {
    renderAppShell()
    // Open drawer first
    const hamburger = screen.getByRole('button', { name: /open navigation menu/i })
    fireEvent.click(hamburger)

    const drawer = document.getElementById('mobile-nav-drawer')
    expect(drawer!.className).toContain('translate-x-0')

    // Click the first NavLink inside the drawer
    const nav = drawer!.querySelector('nav')
    expect(nav).not.toBeNull()
    const firstLink = nav!.querySelector('a')
    expect(firstLink).not.toBeNull()
    fireEvent.click(firstLink!)

    // Drawer should be closed
    expect(drawer!.className).toContain('-translate-x-full')
  })
})

describe('SHELL-03: App footer', () => {
  it('SHELL-03a: footer element contains "Kartex" copyright', () => {
    renderAppShell()
    const footer = document.querySelector('footer')
    expect(footer).not.toBeNull()
    expect(footer!.textContent).toContain('Kartex')
  })

  it('SHELL-03b: footer contains anchor with href containing "github.com/raphaelmue/kartex" and rel="noopener noreferrer"', () => {
    renderAppShell()
    const footer = document.querySelector('footer')
    expect(footer).not.toBeNull()
    const links = footer!.querySelectorAll('a')
    const githubLink = Array.from(links).find(a => a.href.includes('github.com/raphaelmue/kartex'))
    expect(githubLink).toBeTruthy()
    expect(githubLink!.rel).toContain('noopener')
    expect(githubLink!.rel).toContain('noreferrer')
  })

  it('SHELL-03c: footer contains Docs anchor with href pointing to kartex-format.md and rel="noopener noreferrer"', () => {
    renderAppShell()
    const footer = document.querySelector('footer')
    expect(footer).not.toBeNull()
    const links = footer!.querySelectorAll('a')
    const docsLink = Array.from(links).find(a => a.href.includes('kartex-format.md'))
    expect(docsLink).toBeTruthy()
    expect(docsLink!.rel).toContain('noopener')
    expect(docsLink!.rel).toContain('noreferrer')
  })

  it('SHELL-03d: footer contains text matching version pattern /v\\d+\\.\\d+\\.\\d+/', () => {
    renderAppShell()
    const footer = document.querySelector('footer')
    expect(footer).not.toBeNull()
    expect(footer!.textContent).toMatch(/v\d+\.\d+\.\d+/)
  })
})

describe('BRAND-01: Logo SVG in brand areas', () => {
  it('BRAND-01a: sidebar brand area renders inline SVG logo with aria-hidden', () => {
    renderAppShell()
    const aside = document.querySelector('aside')
    expect(aside).not.toBeNull()
    const logoSvg = aside!.querySelector('svg[aria-hidden="true"]')
    expect(logoSvg).not.toBeNull()
  })

  it('BRAND-01b: mobile drawer brand area renders inline SVG logo with aria-hidden', () => {
    renderAppShell()
    const drawer = document.getElementById('mobile-nav-drawer')
    expect(drawer).not.toBeNull()
    const logoSvg = drawer!.querySelector('svg[aria-hidden="true"]')
    expect(logoSvg).not.toBeNull()
  })
})
