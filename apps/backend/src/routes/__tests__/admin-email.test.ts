import { describe, it } from 'vitest'

// NOTE: Full integration tests require mocking the Prisma client.
// These stubs define the expected behaviors for PATCH /api/admin/users/:id
// (email branch) introduced in Phase 29 Plan 01 (EMAIL-09, EMAIL-10, EMAIL-11).
// Fill in with vi.mock('../../../lib/prisma.js') in a later pass.

describe('PATCH /api/admin/users/:id — email write (EMAIL-11)', () => {
  it.todo('accepts a valid { email } for an admin and returns the updated user with normalized email')
  it.todo('returns 409 { error: "EMAIL_TAKEN" } when the email is already used by another user (D-08)')
  it.todo('returns 400 with "Valid email address required." when the email format is invalid')
  it.todo('is reachable only through requireAdmin — non-admin callers never reach this handler (access-control note)')
})
