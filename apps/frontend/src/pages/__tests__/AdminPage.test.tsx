import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { AdminPage } from '@/pages/AdminPage'

// 1. Mock AuthContext — AdminPage's UsersSection imports useAuth
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'admin-1',
      username: 'adminuser',
      role: 'ADMIN',
      isActive: true,
      createdAt: '2026-01-01',
    },
    loading: false,
    setUser: vi.fn(),
    logout: vi.fn(),
  }),
}))

// 2. Mock @/lib/api — vi.hoisted ensures mock vars are available inside factory
const { mockApiGet, mockApiPost, mockApiDelete, mockApiPatch } = vi.hoisted(() => {
  const mockApiGet = vi.fn()
  const mockApiPost = vi.fn()
  const mockApiDelete = vi.fn()
  const mockApiPatch = vi.fn()
  return { mockApiGet, mockApiPost, mockApiDelete, mockApiPatch }
})
vi.mock('@/lib/api', () => ({
  api: {
    get: mockApiGet,
    post: mockApiPost,
    delete: mockApiDelete,
    patch: mockApiPatch,
  },
}))

// 3. Mock sonner toast — vi.hoisted so we can assert on named functions
const { mockToastSuccess, mockToastError } = vi.hoisted(() => {
  const mockToastSuccess = vi.fn()
  const mockToastError = vi.fn()
  return { mockToastSuccess, mockToastError }
})
vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}))

// Pending invite fixture used by EMAIL-07 and EMAIL-08 tests
const pendingInvite = {
  id: 'inv-1',
  email: 'newuser@example.com',
  expiresAt: '2026-07-04T00:00:00.000Z',
  createdAt: '2026-06-27T00:00:00.000Z',
}

// User row fixtures used by EMAIL-11 (Edit Email Dialog) tests — one with an
// email set, one without, so the Dialog pre-fill can be asserted both ways.
const adminUserRow = {
  id: 'admin-1',
  username: 'adminuser',
  email: 'admin@example.com',
  role: 'ADMIN' as const,
  isActive: true,
  createdAt: '2026-01-01',
}
const regularUserRow = {
  id: 'user-2',
  username: 'regularuser',
  email: null,
  role: 'USER' as const,
  isActive: true,
  createdAt: '2026-02-01',
}
const mockUsers = [adminUserRow, regularUserRow]

/**
 * Default mock setup: InviteTokensSection fetches /api/admin/invites, UsersSection
 * fetches /api/admin/users. The old /api/admin/invite-codes endpoint is handled to
 * prevent unhandled-rejection noise while InviteCodesSection is still present (RED phase).
 */
function setupMocks(invites = [pendingInvite], users: unknown[] = []) {
  mockApiGet.mockImplementation((url: string) => {
    if (url === '/api/admin/invites') {
      return Promise.resolve({ ok: true, json: async () => invites })
    }
    if (url === '/api/admin/users') {
      return Promise.resolve({ ok: true, json: async () => users })
    }
    // Gracefully handle old invite-codes calls present during RED phase
    if (url === '/api/admin/invite-codes') {
      return Promise.resolve({ ok: true, json: async () => [] })
    }
    return Promise.resolve({ ok: false, json: async () => ({}) })
  })
}

// ─────────────────────────────────────────────────────────────────────────
// EMAIL-07: Admin sees pending invites table with Email / Sent / Expires
// ─────────────────────────────────────────────────────────────────────────
describe('InviteTokensSection — pending invites table (EMAIL-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('renders the "Email Invitations" section title', async () => {
    render(<AdminPage />)

    await waitFor(() => {
      // admin.inviteTokensTitle = "Email Invitations"
      expect(screen.getByText('Email Invitations')).toBeTruthy()
    })
  })

  it('renders Email, Sent, and Expires column headers in the pending-invites table', async () => {
    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('Email Invitations')).toBeTruthy()
    })

    // 'Sent' (admin.inviteColSent) is unique to InviteTokensSection
    expect(screen.getByRole('columnheader', { name: 'Sent' })).toBeTruthy()
    // 'Expires' (admin.inviteColExpires) — at least one instance must appear
    expect(screen.getAllByRole('columnheader', { name: 'Expires' }).length).toBeGreaterThan(0)
    // 'Email' (admin.inviteColEmail) — at least one instance must appear
    expect(screen.getAllByRole('columnheader', { name: 'Email' }).length).toBeGreaterThan(0)
  })

  it('renders a table row containing the pending invite email address', async () => {
    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('newuser@example.com')).toBeTruthy()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────
// EMAIL-03: Admin sends an invite — POST /api/admin/invites + success toast
// ─────────────────────────────────────────────────────────────────────────
describe('InviteTokensSection — send invite (EMAIL-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('calls POST /api/admin/invites with the email and shows a success toast', async () => {
    mockApiPost.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'inv-2',
        email: 'invited@example.com',
        expiresAt: '2026-07-04T00:00:00.000Z',
        createdAt: '2026-06-27T00:00:00.000Z',
      }),
    })

    render(<AdminPage />)

    // Wait for section to be mounted and initial fetch to complete
    await waitFor(() => {
      expect(screen.getByText('Email Invitations')).toBeTruthy()
    })

    // Type an email into the invite email input
    // admin.inviteEmailPlaceholder = "Email address"
    const emailInput = screen.getByPlaceholderText('Email address')
    fireEvent.change(emailInput, { target: { value: 'invited@example.com' } })

    // Click the Send Invite button — admin.sendInviteButton = "Send Invite"
    fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }))

    // Verify POST was called with the correct email
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/api/admin/invites', {
        email: 'invited@example.com',
      })
    })

    // Verify success toast — admin.inviteSentSuccess = "Invitation sent to {{email}}."
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Invitation sent to invited@example.com.',
      )
    })
  })

  it('shows inviteSendError toast when POST /api/admin/invites returns 500 SMTP_ERROR', async () => {
    mockApiPost.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'SMTP_ERROR' }),
    })

    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('Email Invitations')).toBeTruthy()
    })

    const emailInput = screen.getByPlaceholderText('Email address')
    fireEvent.change(emailInput, { target: { value: 'fail@example.com' } })

    fireEvent.click(screen.getByRole('button', { name: 'Send Invite' }))

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Could not send the invitation email. Check the SMTP settings and try again.',
      )
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────
// EMAIL-08: Admin revokes a pending invite — DELETE /api/admin/invites/:id
// ─────────────────────────────────────────────────────────────────────────
describe('InviteTokensSection — revoke invite (EMAIL-08)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('calls DELETE /api/admin/invites/:id when the revoke icon button is clicked', async () => {
    mockApiDelete.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Invite revoked.' }),
    })

    render(<AdminPage />)

    // Wait for the pending invite row to appear
    await waitFor(() => {
      expect(screen.getByText('newuser@example.com')).toBeTruthy()
    })

    // Find the revoke button by its aria-label (admin.revokeInviteAriaLabel interpolated with email)
    const revokeButton = screen.getByRole('button', {
      name: 'Revoke invitation for newuser@example.com',
    })
    fireEvent.click(revokeButton)

    // Verify DELETE was called with the correct invite id
    await waitFor(() => {
      expect(mockApiDelete).toHaveBeenCalledWith('/api/admin/invites/inv-1')
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────
// EMAIL-11: Admin edits any user's email via the "Edit email" DropdownMenuItem
// + shared Dialog
// ─────────────────────────────────────────────────────────────────────────
describe('UsersSection — Edit Email Dialog (EMAIL-11)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks([pendingInvite], mockUsers)
  })

  async function openEditEmailDialogFor(username: string) {
    const trigger = await screen.findByRole('button', {
      name: `User actions for ${username}`,
    })
    // Radix UI DropdownMenu in JSDOM requires pointerdown before click to open
    fireEvent.pointerDown(trigger)
    fireEvent.click(trigger)

    const editItem = await screen.findByRole('menuitem', { name: 'Edit email' })
    fireEvent.click(editItem)
  }

  it('EMAIL-11a: "Edit email" is the first menu item, before password reset and delete', async () => {
    render(<AdminPage />)

    const trigger = await screen.findByRole('button', {
      name: 'User actions for adminuser',
    })
    fireEvent.pointerDown(trigger)
    fireEvent.click(trigger)

    const items = await screen.findAllByRole('menuitem')
    const labels = items.map((item) => item.textContent)

    expect(labels).toEqual([
      'Edit email',
      'Send password reset email',
      'Delete user',
    ])
  })

  it('EMAIL-11b: opening the dialog pre-fills the input with the target user\'s current email', async () => {
    render(<AdminPage />)

    await openEditEmailDialogFor('adminuser')

    const emailInput = (await screen.findByLabelText(
      'Email address',
    )) as HTMLInputElement
    expect(emailInput.value).toBe('admin@example.com')
  })

  it('EMAIL-11c: submitting a valid new email PATCHes, shows a success toast, refreshes the list, and closes the dialog', async () => {
    mockApiPatch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...adminUserRow, email: 'newemail@example.com' }),
    })

    render(<AdminPage />)

    // Initial fetch on mount
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/api/admin/users')
    })
    const initialGetCalls = mockApiGet.mock.calls.filter(
      (call) => call[0] === '/api/admin/users',
    ).length

    await openEditEmailDialogFor('adminuser')

    const emailInput = await screen.findByLabelText('Email address')
    fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save email' }))

    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledWith('/api/admin/users/admin-1', {
        email: 'newemail@example.com',
      })
    })

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Email updated')
    })

    // fetchUsers() refresh — /api/admin/users called again after the PATCH
    await waitFor(() => {
      const laterGetCalls = mockApiGet.mock.calls.filter(
        (call) => call[0] === '/api/admin/users',
      ).length
      expect(laterGetCalls).toBeGreaterThan(initialGetCalls)
    })

    // Dialog closed
    await waitFor(() => {
      expect(screen.queryByLabelText('Email address')).toBeNull()
    })
  })

  it('EMAIL-11d: a 409 EMAIL_TAKEN response shows the inline conflict message and keeps the dialog open', async () => {
    mockApiPatch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'EMAIL_TAKEN' }),
    })

    render(<AdminPage />)

    await openEditEmailDialogFor('regularuser')

    const emailInput = await screen.findByLabelText('Email address')
    fireEvent.change(emailInput, { target: { value: 'taken@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save email' }))

    // Inline conflict message — real i18next value for admin.emailTaken
    await screen.findByText('This email is already in use')

    expect(mockToastSuccess).not.toHaveBeenCalled()
    // Dialog stays open
    expect(screen.getByLabelText('Email address')).toBeTruthy()
  })
})
