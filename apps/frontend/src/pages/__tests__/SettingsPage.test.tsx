import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'sonner'
import { SettingsPage } from '@/pages/SettingsPage'

// SM2-01: SettingsPage test suite — study mode selector (render, persist, optimistic revert)

// 1. Mock react-router-dom — preserve real, override useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

// 2. Mock api module
const { mockApiPatch } = vi.hoisted(() => ({ mockApiPatch: vi.fn() }))
vi.mock('@/lib/api', () => ({ api: { patch: mockApiPatch } }))

// 3. Mock sonner
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// 4. Mock useAuth with mutable user holder
const mockSetUser = vi.fn()
const mockUser = vi.hoisted(() => ({
  current: {
    id: '1',
    username: 'test',
    role: 'USER' as const,
    isActive: true,
    studyMode: 'normal',
    createdAt: '2026-01-01',
  },
}))
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser.current, setUser: mockSetUser, loading: false }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    mockUser.current = {
      id: '1',
      username: 'test',
      role: 'USER' as const,
      isActive: true,
      studyMode: 'normal',
      createdAt: '2026-01-01',
    }
    mockSetUser.mockClear()
    mockApiPatch.mockClear()
    vi.mocked(toast.success).mockClear()
    vi.mocked(toast.error).mockClear()
  })

  // SM2-01a: renders all three mode options
  it('SM2-01a: renders all three study mode options', () => {
    renderPage()
    // i18next is initialized with en.json in test/setup.ts — real translations are returned
    expect(screen.getByText('Normal')).toBeTruthy()
    expect(screen.getByText('Intensive')).toBeTruthy()
    expect(screen.getByText('Exam Prep')).toBeTruthy()
  })

  // SM2-01b: current mode is pre-selected
  it('SM2-01b: current mode is pre-selected in RadioGroup', () => {
    mockUser.current = { ...mockUser.current, studyMode: 'intensive' }
    renderPage()
    const intensiveRadio = document.getElementById('mode-intensive') as HTMLButtonElement | null
    expect(intensiveRadio).toBeTruthy()
    // Radix RadioGroupItem sets data-state="checked" when selected
    expect(intensiveRadio?.getAttribute('data-state')).toBe('checked')
  })

  // SM2-01c: selecting a mode calls PATCH /api/auth/me
  it('SM2-01c: selecting a mode calls PATCH /api/auth/me', async () => {
    mockApiPatch.mockResolvedValue({ ok: true })
    renderPage()

    const examPrepRadio = document.getElementById('mode-exam_prep') as HTMLButtonElement | null
    expect(examPrepRadio).toBeTruthy()
    fireEvent.click(examPrepRadio!)

    await waitFor(() =>
      expect(mockApiPatch).toHaveBeenCalledWith('/api/auth/me', { studyMode: 'exam_prep' }),
    )
  })

  // SM2-01d: optimistic update + success toast
  it('SM2-01d: successful PATCH triggers optimistic setUser and success toast', async () => {
    mockApiPatch.mockResolvedValue({ ok: true })
    renderPage()

    const intensiveRadio = document.getElementById('mode-intensive') as HTMLButtonElement | null
    fireEvent.click(intensiveRadio!)

    await waitFor(() => expect(mockSetUser).toHaveBeenCalled())

    const callArg = mockSetUser.mock.calls[0][0] as { studyMode: string }
    expect(callArg.studyMode).toBe('intensive')

    await waitFor(() => expect(toast.success).toHaveBeenCalled())
  })

  // SM2-01e: reverts and shows error toast on failure
  it('SM2-01e: failed PATCH reverts setUser and shows error toast', async () => {
    mockApiPatch.mockResolvedValue({ ok: false })
    renderPage()

    const intensiveRadio = document.getElementById('mode-intensive') as HTMLButtonElement | null
    fireEvent.click(intensiveRadio!)

    // setUser called twice: optimistic update + revert
    await waitFor(() => expect(mockSetUser).toHaveBeenCalledTimes(2))

    const revertArg = mockSetUser.mock.calls[1][0] as { studyMode: string }
    expect(revertArg.studyMode).toBe('normal')

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })
})
