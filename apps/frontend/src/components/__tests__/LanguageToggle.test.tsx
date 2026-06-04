import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from 'i18next'
import { SettingsPage } from '@/pages/SettingsPage'

// Mock react-router-dom — keep real module but override useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', username: 'testuser', role: 'USER', isActive: true, studyMode: 'normal', createdAt: '2026-01-01' },
    loading: false,
    setUser: vi.fn(),
    logout: vi.fn(),
  }),
}))

// Mock api module (SettingsPage uses it for studyMode PATCH)
vi.mock('@/lib/api', () => ({ api: { patch: vi.fn().mockResolvedValue({ ok: true }) } }))

// Mock sonner
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  )
}

describe('I18N-03: Language toggle in Settings', () => {
  beforeEach(() => {
    vi.spyOn(i18n, 'changeLanguage').mockImplementation((() => Promise.resolve()) as never)
  })

  it('I18N-03a: renders language radio group with EN and DE options', () => {
    renderSettings()
    const enRadio = document.getElementById('lang-en')
    const deRadio = document.getElementById('lang-de')
    expect(enRadio).toBeTruthy()
    expect(deRadio).toBeTruthy()
    expect(screen.getByText('EN')).toBeTruthy()
    expect(screen.getByText('DE')).toBeTruthy()
  })

  it('I18N-03b: clicking the DE radio calls i18n.changeLanguage with "de"', () => {
    renderSettings()
    const deRadio = document.getElementById('lang-de')
    expect(deRadio).toBeTruthy()
    fireEvent.click(deRadio!)
    expect(i18n.changeLanguage).toHaveBeenCalledWith('de')
  })
})
