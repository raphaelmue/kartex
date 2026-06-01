import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from 'i18next'
import { AppShell } from '@/components/AppShell'

// Set build-time constant that Vite define would inject
;(globalThis as Record<string, unknown>).__APP_VERSION__ = '1.0.0'

// Mock AuthContext — mirrors AppShell.test.tsx pattern
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', username: 'testuser', role: 'USER', isActive: true, createdAt: '2026-01-01' },
    loading: false,
    setUser: vi.fn(),
    logout: vi.fn(),
  }),
}))

// Mock ThemeContext — mirrors AppShell.test.tsx pattern
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

describe('I18N-03: Language toggle button', () => {
  beforeEach(() => {
    vi.spyOn(i18n, 'changeLanguage').mockResolvedValue(i18n)
  })

  it('I18N-03a: renders a button with accessible name from a11y.switchLanguage and visible text "EN"', () => {
    renderAppShell()
    // The button should have aria-label matching t('a11y.switchLanguage') = 'Switch language'
    // and its visible text should be 'EN' when i18n.language === 'en'
    const langButton = screen.getByRole('button', { name: /switch language/i })
    expect(langButton).toBeTruthy()
    expect(langButton.textContent).toBe('EN')
  })

  it('I18N-03b: clicking the language button calls i18n.changeLanguage with "de"', () => {
    renderAppShell()
    const langButton = screen.getByRole('button', { name: /switch language/i })
    fireEvent.click(langButton)
    expect(i18n.changeLanguage).toHaveBeenCalledWith('de')
  })
})
