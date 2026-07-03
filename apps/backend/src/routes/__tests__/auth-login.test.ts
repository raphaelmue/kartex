import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

// Regression guard for the 29-06 gap: POST /login and POST /refresh must
// return the same `email` field that GET /api/auth/me already returns.
// Reverting Task 1 (removing `email: user.email` from either c.json(...) call
// in auth.ts) makes these assertions fail — this is a real shape check, not a
// tautology (see 29-06-PLAN.md Task 3 acceptance criteria).

// ─── Prisma mock ─────────────────────────────────────────────────────────────
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    refreshToken: { create: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

// ─── bcryptjs mock — avoid real hashing in tests ──────────────────────────────
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn().mockResolvedValue(true),
    hash: vi.fn().mockResolvedValue('hashed'),
  },
}))

// ─── jwt mock — avoid real signing in tests ───────────────────────────────────
vi.mock('../../lib/jwt.js', () => ({
  signToken: vi.fn().mockResolvedValue('signed-token'),
}))

import { prisma } from '../../lib/prisma.js'
import { authRouter } from '../auth.js'

function makeApp() {
  const app = new Hono()
  app.route('/auth', authRouter)
  return app
}

const baseUser = {
  id: 'user-1',
  username: 'testuser',
  passwordHash: 'hashed',
  role: 'USER' as const,
  isActive: true,
  studyMode: 'normal' as const,
  createdAt: new Date('2026-01-01'),
  email: 'user@example.com',
}

describe('POST /api/auth/login — response includes email (29-06 regression guard)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with an email key equal to the mocked user\'s email', async () => {
    ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseUser)
    ;(prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'token-1',
      userId: baseUser.id,
      tokenHash: 'hashed',
      expiresAt: new Date(Date.now() + 1000),
    })

    const app = makeApp()
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser', password: 'password123' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.email).toBe('user@example.com')
  })
})

describe('POST /api/auth/refresh — response includes email (29-06 regression guard)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with an email key in the response body', async () => {
    ;(prisma.refreshToken.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'token-1',
        userId: baseUser.id,
        tokenHash: 'hashed',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    ])
    ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseUser)
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([{}, {}])

    const app = makeApp()
    const res = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { Cookie: 'refresh_token=some-raw-refresh-token' },
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveProperty('email')
  })
})
