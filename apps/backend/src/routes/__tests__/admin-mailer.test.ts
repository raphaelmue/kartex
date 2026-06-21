import { describe, it } from 'vitest'

// NOTE: Full integration tests require mocking the nodemailer mailer singleton.
// These stubs define the expected behaviors for POST /api/admin/mailer/test
// introduced in Phase 23 Plan 03 (EMAIL-02).
// Fill in with vi.mock('../../../lib/mailer.js') in the execution pass.

describe('POST /api/admin/mailer/test — test email send (EMAIL-02)', () => {
  it.todo('returns 200 when SMTP is configured and the calling admin has an email address set')
  it.todo('sends the test email to the logged-in admin\'s own email address (D-11)')
  it.todo('returns 400 with "Set your email address first" when the calling admin has no email set (D-12)')
  it.todo('returns a descriptive error when SMTP env vars are missing or incomplete (D-10 — mailer not configured)')
  it.todo('returns 401 when called without authentication')
  it.todo('returns 403 when called by a non-admin user')
})
