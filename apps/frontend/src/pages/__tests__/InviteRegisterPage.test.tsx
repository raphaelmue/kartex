import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { InviteRegisterPage } from '@/pages/InviteRegisterPage'

// 1. Mock react-router-dom — preserve real module, override useParams and useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ token: 'abc123' }),
    useNavigate: () => mockNavigate,
  }
})

// 2. Mock @/lib/api — vi.hoisted ensures mock vars are available inside factory
const { mockApiGet, mockApiPost } = vi.hoisted(() => {
  const mockApiGet = vi.fn()
  const mockApiPost = vi.fn()
  return { mockApiGet, mockApiPost }
})
vi.mock('@/lib/api', () => ({
  api: {
    get: mockApiGet,
    post: mockApiPost,
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

// 3. Mock sonner toast
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// No AuthContext mock — InviteRegisterPage is a public page and does not call useAuth.

function renderPage() {
  return render(
    <MemoryRouter>
      <InviteRegisterPage />
    </MemoryRouter>,
  )
}

describe('InviteRegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ────────────────────────────────────────────────────────────
  // EMAIL-05: Valid token → form renders with pre-filled email
  // ────────────────────────────────────────────────────────────
  describe('valid token (EMAIL-05)', () => {
    beforeEach(() => {
      mockApiGet.mockResolvedValue({
        ok: true,
        json: async () => ({ email: 'invitee@example.com' }),
      })
    })

    it('renders the registration form with email pre-filled', async () => {
      renderPage()

      await waitFor(() => {
        expect(screen.getByDisplayValue('invitee@example.com')).toBeInTheDocument()
      })
    })

    it('renders the email input as disabled', async () => {
      renderPage()

      await waitFor(() => {
        expect(screen.getByDisplayValue('invitee@example.com')).toBeInTheDocument()
      })

      const emailInput = screen.getByDisplayValue('invitee@example.com')
      expect(emailInput).toBeDisabled()
    })

    it('shows the card title "Create your account"', async () => {
      renderPage()

      await waitFor(() => {
        expect(screen.getByText('Create your account')).toBeInTheDocument()
      })
    })

    it('POST body contains token, username, password and NOT confirmPassword (EMAIL-05)', async () => {
      mockApiPost.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })

      renderPage()

      // Wait for the form to appear
      await waitFor(() => {
        expect(screen.getByDisplayValue('invitee@example.com')).toBeInTheDocument()
      })

      // Fill username
      const usernameInput = screen.getByLabelText(/Username/i)
      fireEvent.change(usernameInput, { target: { value: 'newuser' } })

      // Fill password
      const passwordInput = screen.getByLabelText(/^Password$/i)
      fireEvent.change(passwordInput, { target: { value: 'secret123' } })

      // Fill confirm password
      const confirmInput = screen.getByLabelText(/Confirm password/i)
      fireEvent.change(confirmInput, { target: { value: 'secret123' } })

      // Submit the form
      const submitBtn = screen.getByRole('button', { name: /Create Account/i })
      await act(async () => {
        fireEvent.click(submitBtn)
      })

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledTimes(1)
      })

      const [, body] = mockApiPost.mock.calls[0] as [string, Record<string, unknown>]
      expect(body).toHaveProperty('token', 'abc123')
      expect(body).toHaveProperty('username', 'newuser')
      expect(body).toHaveProperty('password', 'secret123')
      // confirmPassword must NOT be in the POST body
      expect(body).not.toHaveProperty('confirmPassword')
    })

    it('navigates to /login with registered:true on success', async () => {
      mockApiPost.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })

      renderPage()

      await waitFor(() => {
        expect(screen.getByDisplayValue('invitee@example.com')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'newuser' } })
      fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'secret123' } })
      fireEvent.change(screen.getByLabelText(/Confirm password/i), { target: { value: 'secret123' } })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Create Account/i }))
      })

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', { state: { registered: true } })
      })
    })
  })

  // ────────────────────────────────────────────────────────────
  // EMAIL-06: Error states — three distinct inline messages
  // ────────────────────────────────────────────────────────────
  describe('error states (EMAIL-06)', () => {
    it('shows "already been used" copy for ALREADY_USED error', async () => {
      mockApiGet.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'ALREADY_USED' }),
      })

      renderPage()

      await waitFor(() => {
        // auth.inviteAlreadyUsed: "This invite has already been used."
        expect(
          screen.getByText('This invite has already been used.'),
        ).toBeInTheDocument()
      })

      // The registration form must NOT be shown
      expect(screen.queryByRole('button', { name: /Create Account/i })).not.toBeInTheDocument()
    })

    it('shows "has expired" copy for EXPIRED error', async () => {
      mockApiGet.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'EXPIRED' }),
      })

      renderPage()

      await waitFor(() => {
        // auth.inviteExpired: "This invite link has expired. Contact an admin for a new invitation."
        expect(
          screen.getByText(
            'This invite link has expired. Contact an admin for a new invitation.',
          ),
        ).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: /Create Account/i })).not.toBeInTheDocument()
    })

    it('shows "not valid" copy for NOT_FOUND error', async () => {
      mockApiGet.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'NOT_FOUND' }),
      })

      renderPage()

      await waitFor(() => {
        // auth.inviteInvalid: "This invite link is not valid."
        expect(screen.getByText('This invite link is not valid.')).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: /Create Account/i })).not.toBeInTheDocument()
    })

    it('shows "not valid" copy when api.get rejects (network error)', async () => {
      mockApiGet.mockRejectedValue(new Error('Network error'))

      renderPage()

      await waitFor(() => {
        expect(screen.getByText('This invite link is not valid.')).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: /Create Account/i })).not.toBeInTheDocument()
    })

    it('each error state renders inline — no form inputs present', async () => {
      mockApiGet.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'ALREADY_USED' }),
      })

      renderPage()

      await waitFor(() => {
        expect(screen.getByText('This invite has already been used.')).toBeInTheDocument()
      })

      // No username or password inputs should appear
      expect(screen.queryByLabelText(/Username/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/^Password$/i)).not.toBeInTheDocument()
    })
  })
})
