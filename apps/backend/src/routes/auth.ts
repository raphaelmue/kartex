import type { Context } from 'hono'
import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import bcrypt from 'bcryptjs'
import { randomBytes, createHash } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { LoginSchema, RegisterSchema, UpdateMeSchema, PasswordResetRequestSchema, PasswordResetSchema } from '@kartex/shared'
import { prisma } from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'
import { authMiddleware } from '../middleware/auth.js'
import { rateLimitMiddleware } from '../middleware/rateLimit.js'
import { sendMail, isConfigured } from '../lib/mailer.js'

const auth = new Hono()

// Apply rate limiting to all auth routes (INFR-04, T-02-05)
auth.use('*', rateLimitMiddleware(10, 60_000))

// ─── Cookie helpers ───────────────────────────────────────────────────────────

function isProd(): boolean {
  return process.env.NODE_ENV === 'production'
}

function setAuthCookies(
  c: Context,
  accessToken: string,
  refreshToken: string,
): void {
  const prod = isProd()
  const sameSite = prod ? 'Strict' : 'Lax'

  setCookie(c, 'access_token', accessToken, {
    httpOnly: true,
    sameSite,
    secure: prod,
    path: '/',
    maxAge: 15 * 60, // 15 minutes
  })

  setCookie(c, 'refresh_token', refreshToken, {
    httpOnly: true,
    sameSite,
    secure: prod,
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  })
}

// ─── POST /register ───────────────────────────────────────────────────────────

auth.post('/register', async (c) => {
  const body = RegisterSchema.safeParse(await c.req.json())
  if (!body.success) {
    return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
  }

  const { username, password, token } = body.data

  // Pre-check for informational error messages (not TOCTOU-safe — purely for UX)
  const invite = await prisma.inviteToken.findUnique({ where: { token } })
  if (!invite) {
    return c.json({ error: 'NOT_FOUND' }, 400)
  }
  if (invite.usedAt !== null) {
    return c.json({ error: 'ALREADY_USED' }, 400)
  }
  if (invite.expiresAt < new Date()) {
    return c.json({ error: 'EXPIRED' }, 400)
  }

  // TOCTOU-safe atomic consumption inside an interactive $transaction.
  // updateMany WHERE usedAt IS NULL is the atomic single-use guard (EMAIL-06,
  // T-24-06, T-24-07). Inside the callback throw aborts the transaction (Pitfall 7).
  try {
    await prisma.$transaction(async (tx) => {
      // Atomically mark token used — wins the concurrent-registration race.
      // expiresAt guard closes the window between the pre-check and transaction execution.
      const result = await tx.inviteToken.updateMany({
        where: { token, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      })
      if (result.count === 0) throw new Error('TOKEN_CONSUMED')

      // Username uniqueness check inside the transaction
      const existing = await tx.user.findUnique({ where: { username } })
      if (existing) throw new Error('USERNAME_TAKEN')

      // Create user — role is hard-coded 'USER', email from invite row (T-24-09, T-24-12)
      const passwordHash = await bcrypt.hash(password, 12)
      await tx.user.create({
        data: { username, passwordHash, role: 'USER', email: invite.email },
      })
    })
  } catch (err) {
    const msg = (err as Error).message
    if (msg === 'TOKEN_CONSUMED') return c.json({ error: 'ALREADY_USED' }, 400)
    if (msg === 'USERNAME_TAKEN') return c.json({ error: 'USERNAME_TAKEN' }, 409)
    throw err
  }

  return c.json({ message: 'Account created.' }, 200)
})

// ─── POST /login ──────────────────────────────────────────────────────────────

auth.post('/login', async (c) => {
  const body = LoginSchema.safeParse(await c.req.json())
  if (!body.success) {
    return c.json({ error: 'Invalid username or password.' }, 401)
  }

  const { username, password } = body.data

  // T-02-01: Never distinguish user-not-found from wrong-password (T-02-02)
  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return c.json({ error: 'Invalid username or password.' }, 401)
  }

  // T-02-02: Deactivated accounts return same error (non-leaking)
  if (!user.isActive) {
    return c.json({ error: 'Invalid username or password.' }, 401)
  }

  // Sign access token
  const accessToken = await signToken({ sub: user.id, role: user.role }, '15m')

  // Generate raw refresh token, store hash in DB (T-02-04: rotation)
  const rawRefreshToken = crypto.randomUUID()
  const tokenHash = await bcrypt.hash(rawRefreshToken, 10)

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  setAuthCookies(c, accessToken, rawRefreshToken)

  return c.json(
    { id: user.id, username: user.username, role: user.role, isActive: user.isActive, studyMode: user.studyMode, createdAt: user.createdAt, email: user.email },
    200,
  )
})

// ─── POST /logout ─────────────────────────────────────────────────────────────

auth.post('/logout', async (c) => {
  const rawRefreshToken = getCookie(c, 'refresh_token')

  if (rawRefreshToken) {
    // Find and delete the refresh token record by comparing against all tokens for cleanup
    // We search by brute-force comparison since bcrypt hashes can't be reversed-queried
    const tokens = await prisma.refreshToken.findMany({
      where: { expiresAt: { gt: new Date() } },
    })
    for (const token of tokens) {
      if (await bcrypt.compare(rawRefreshToken, token.tokenHash)) {
        await prisma.refreshToken.deleteMany({ where: { id: token.id } })
        break
      }
    }
  }

  const prod = isProd()
  const sameSite = prod ? 'Strict' : 'Lax'
  deleteCookie(c, 'access_token', { path: '/', secure: prod, sameSite })
  deleteCookie(c, 'refresh_token', { path: '/', secure: prod, sameSite })

  return c.json({ message: 'Logged out.' }, 200)
})

// ─── POST /refresh ────────────────────────────────────────────────────────────

auth.post('/refresh', async (c) => {
  const rawRefreshToken = getCookie(c, 'refresh_token')
  if (!rawRefreshToken) {
    return c.json({ error: 'Unauthorized.' }, 401)
  }

  // Find all non-expired refresh tokens and check against the cookie value
  const tokens = await prisma.refreshToken.findMany({
    where: { expiresAt: { gt: new Date() } },
  })

  let matchedToken: (typeof tokens)[number] | null = null
  for (const token of tokens) {
    if (await bcrypt.compare(rawRefreshToken, token.tokenHash)) {
      matchedToken = token
      break
    }
  }

  if (!matchedToken) {
    return c.json({ error: 'Unauthorized.' }, 401)
  }

  // Get associated user
  const user = await prisma.user.findUnique({ where: { id: matchedToken.userId } })
  if (!user || !user.isActive) {
    return c.json({ error: 'Unauthorized.' }, 401)
  }

  // T-02-04: Refresh token rotation — delete old and create new atomically.
  // Wrapped in $transaction so a create failure does not permanently invalidate the session
  // (if create failed after delete, the browser's cookie would have no matching DB row).
  const accessToken = await signToken({ sub: user.id, role: user.role }, '15m')
  const newRawRefreshToken = crypto.randomUUID()
  const newTokenHash = await bcrypt.hash(newRawRefreshToken, 10)

  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { id: matchedToken.id } }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    }),
  ])

  setAuthCookies(c, accessToken, newRawRefreshToken)

  return c.json(
    { id: user.id, username: user.username, role: user.role, isActive: user.isActive, studyMode: user.studyMode, createdAt: user.createdAt, email: user.email },
    200,
  )
})

// ─── GET /me ──────────────────────────────────────────────────────────────────

auth.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')

  // T-02-07: Select only safe fields — no passwordHash
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true, isActive: true, studyMode: true, createdAt: true, email: true },
  })

  if (!user) {
    return c.json({ error: 'Unauthorized.' }, 401)
  }

  return c.json(user, 200)
})

// ─── PATCH /me ─────────────────────────────────────────────────────────────────
// EMAIL-10/EMAIL-11: Accepts { studyMode } and/or { email } independently.
// Email is already trim+lowercased by UpdateMeSchema before it reaches Prisma.

auth.patch('/me', authMiddleware, async (c) => {
  const body = UpdateMeSchema.safeParse(await c.req.json())
  if (!body.success) {
    return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
  }

  const userId = c.get('userId')

  const data: { studyMode?: (typeof body.data)['studyMode']; email?: string } = {}
  if (body.data.studyMode !== undefined) data.studyMode = body.data.studyMode
  if (body.data.email !== undefined) data.email = body.data.email

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, username: true, role: true, isActive: true, studyMode: true, createdAt: true, email: true },
    })

    return c.json(updated, 200)
  } catch (err) {
    // D-08: Duplicate email — unique index is the race-safe gate (no pre-check, no transaction)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return c.json({ error: 'EMAIL_TAKEN' }, 409)
    }
    throw err
  }
})

// ─── POST /forgot-password ────────────────────────────────────────────────────
// RESET-03: Always returns 200 — no email enumeration regardless of outcome.
// D-07: Raw token never stored — only SHA-256 hash persisted.

auth.post('/forgot-password', async (c) => {
  const raw = await c.req.json().catch(() => ({}))
  const body = PasswordResetRequestSchema.safeParse(raw)
  if (!body.success) {
    // Validation failures must not reveal enumeration information
    return c.json({ message: 'If that email is registered, a reset link is on its way.' }, 200)
  }

  const user = await prisma.user.findUnique({
    where: { email: body.data.email },
    select: { id: true, email: true },
  })

  // RESET-03: No user found — return identical success-shaped response (no enumeration)
  if (!user || !user.email) {
    return c.json({ message: 'If that email is registered, a reset link is on its way.' }, 200)
  }

  // Guard APP_URL — do not leak server config state to caller
  if (!process.env.APP_URL) {
    console.error('[auth] APP_URL env var is not set — cannot generate password reset link')
    return c.json({ message: 'If that email is registered, a reset link is on its way.' }, 200)
  }

  // Guard SMTP — do not leak server config state to caller (RESET-03)
  if (!isConfigured()) {
    console.error('[auth] SMTP not configured — cannot send password reset email')
    return c.json({ message: 'If that email is registered, a reset link is on its way.' }, 200)
  }

  // D-07: Generate raw token; store only SHA-256 hash
  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // RESET-02: 1 hour

  const resetTokenRow = await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  })

  const resetLink = `${process.env.APP_URL}/reset-password/${rawToken}`

  try {
    await sendMail({
      to: user.email,
      subject: 'Kartex — Password Reset',
      text: `Reset your Kartex password by clicking the link below. This link expires in 1 hour:\n${resetLink}`,
      html: `<p>Reset your Kartex password by clicking the link below.</p><p><a href="${resetLink}">Reset Password</a></p><p>This link expires in 1 hour.</p>`,
    })
  } catch (err) {
    // Roll back the created token if email delivery fails (same pattern as admin.ts invite rollback)
    try {
      await prisma.passwordResetToken.delete({ where: { id: resetTokenRow.id } })
    } catch (cleanupErr) {
      console.error('[auth] Failed to rollback orphaned reset token:', (cleanupErr as Error).message)
    }
    console.error('[auth] Password reset email delivery failed:', (err as Error).message)
    // RESET-03: Still return 200 — do not reveal delivery failure to caller
    return c.json({ message: 'If that email is registered, a reset link is on its way.' }, 200)
  }

  return c.json({ message: 'If that email is registered, a reset link is on its way.' }, 200)
})

// ─── GET /reset-password/:token ───────────────────────────────────────────────
// RESET-06: Read-only validation; returns distinct error codes per invalid state.
// Frontend uses this to decide whether to mount the reset form.

auth.get('/reset-password/:token', async (c) => {
  const { token } = c.req.param()
  const tokenHash = createHash('sha256').update(token).digest('hex')

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } })

  if (!record) {
    return c.json({ error: 'NOT_FOUND' }, 400)
  }
  if (record.usedAt !== null) {
    return c.json({ error: 'ALREADY_USED' }, 400)
  }
  if (record.expiresAt < new Date()) {
    return c.json({ error: 'EXPIRED' }, 400)
  }

  return c.json({ ok: true }, 200)
})

// ─── POST /reset-password/:token ──────────────────────────────────────────────
// TOCTOU-safe: atomic updateMany WHERE usedAt IS NULL inside $transaction.
// RESET-05: Deletes all RefreshToken rows for the user on success (full session invalidation).
// D-01: No JWT issued — frontend navigates to /login for re-authentication.

auth.post('/reset-password/:token', async (c) => {
  const { token } = c.req.param()
  const tokenHash = createHash('sha256').update(token).digest('hex')

  // UX pre-check — not TOCTOU-safe; purely for informational error messages (Pitfall 2)
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } })
  if (!record) {
    return c.json({ error: 'NOT_FOUND' }, 400)
  }
  if (record.usedAt !== null) {
    return c.json({ error: 'ALREADY_USED' }, 400)
  }
  if (record.expiresAt < new Date()) {
    return c.json({ error: 'EXPIRED' }, 400)
  }

  const body = PasswordResetSchema.safeParse(await c.req.json().catch(() => ({})))
  if (!body.success) {
    return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Atomic single-use gate — wins the concurrent-request race (TOCTOU-safe)
      const result = await tx.passwordResetToken.updateMany({
        where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      })
      if (result.count === 0) throw new Error('TOKEN_CONSUMED')

      const passwordHash = await bcrypt.hash(body.data.newPassword, 12)

      // Use record.userId from pre-check — avoids nested query inside transaction (Pitfall 3)
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      })

      // RESET-05: Invalidate all active sessions
      await tx.refreshToken.deleteMany({ where: { userId: record.userId } })
    })
  } catch (err) {
    if ((err as Error).message === 'TOKEN_CONSUMED') {
      return c.json({ error: 'ALREADY_USED' }, 400)
    }
    throw err
  }

  // D-01: Plain success message — no JWT, no cookies
  return c.json({ message: 'Password reset successfully.' }, 200)
})

export { auth as authRouter }
