import type { Context } from 'hono'
import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import bcrypt from 'bcryptjs'
import { LoginSchema, RegisterSchema, UpdateStudyModeSchema } from '@kartex/shared'
import { prisma } from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'
import { authMiddleware } from '../middleware/auth.js'
import { rateLimitMiddleware } from '../middleware/rateLimit.js'

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

  const { username, password, inviteCode } = body.data

  // Validate invite code (D-08: single-use, D-09: configurable expiry)
  const invite = await prisma.inviteCode.findUnique({ where: { code: inviteCode } })
  if (!invite || invite.usedAt !== null || invite.expiresAt < new Date()) {
    return c.json({ error: 'Invalid or expired invite code.' }, 400)
  }

  // Check username uniqueness
  const existingUser = await prisma.user.findUnique({ where: { username } })
  if (existingUser) {
    return c.json({ error: 'Username is already taken.' }, 409)
  }

  // Create user
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { username, passwordHash, role: 'USER' },
  })

  // Invalidate invite code (D-08)
  await prisma.inviteCode.update({
    where: { id: invite.id },
    data: { usedAt: new Date(), usedById: user.id },
  })

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
    { id: user.id, username: user.username, role: user.role, isActive: user.isActive, studyMode: user.studyMode, createdAt: user.createdAt },
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

  // T-02-04: Refresh token rotation — delete old, issue new
  await prisma.refreshToken.deleteMany({ where: { id: matchedToken.id } })

  const accessToken = await signToken({ sub: user.id, role: user.role }, '15m')
  const newRawRefreshToken = crypto.randomUUID()
  const newTokenHash = await bcrypt.hash(newRawRefreshToken, 10)

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  setAuthCookies(c, accessToken, newRawRefreshToken)

  return c.json(
    { id: user.id, username: user.username, role: user.role, isActive: user.isActive, studyMode: user.studyMode, createdAt: user.createdAt },
    200,
  )
})

// ─── GET /me ──────────────────────────────────────────────────────────────────

auth.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')

  // T-02-07: Select only safe fields — no passwordHash
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true, isActive: true, studyMode: true, createdAt: true },
  })

  if (!user) {
    return c.json({ error: 'Unauthorized.' }, 401)
  }

  return c.json(user, 200)
})

// ─── PATCH /me ─────────────────────────────────────────────────────────────────

auth.patch('/me', authMiddleware, async (c) => {
  const body = UpdateStudyModeSchema.safeParse(await c.req.json())
  if (!body.success) {
    return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
  }

  const userId = c.get('userId')

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { studyMode: body.data.studyMode },
    select: { id: true, username: true, role: true, isActive: true, studyMode: true, createdAt: true },
  })

  return c.json(updated, 200)
})

export { auth as authRouter }
