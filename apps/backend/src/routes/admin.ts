import { unlink } from 'node:fs/promises'
import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { sendMail, isConfigured, verifyConnection } from '../lib/mailer.js'

const admin = new Hono()

// ─── GET /users ───────────────────────────────────────────────────────────────

admin.get('/users', async (c) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      isActive: true,
      createdAt: true,
      email: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return c.json(users, 200)
})

// ─── PATCH /users/:id ─────────────────────────────────────────────────────────

admin.patch('/users/:id', async (c) => {
  const { id } = c.req.param()
  const authenticatedUserId = c.get('userId')

  let body: { role?: string; isActive?: boolean }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid request body.' }, 400)
  }

  // Validate role if provided
  if (body.role !== undefined && body.role !== 'ADMIN' && body.role !== 'USER') {
    return c.json({ error: 'role must be "ADMIN" or "USER".' }, 400)
  }

  // Validate isActive if provided
  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    return c.json({ error: 'isActive must be a boolean.' }, 400)
  }

  // T-02-08: Prevent admin self-deactivation
  if (id === authenticatedUserId && body.isActive === false) {
    return c.json({ error: 'Cannot deactivate your own account.' }, 400)
  }

  // Check user exists
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    return c.json({ error: 'User not found.' }, 404)
  }

  const data: { role?: 'ADMIN' | 'USER'; isActive?: boolean } = {}
  if (body.role !== undefined) data.role = body.role as 'ADMIN' | 'USER'
  if (body.isActive !== undefined) data.isActive = body.isActive

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      username: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  })

  return c.json(updated, 200)
})

// ─── DELETE /users/:id ────────────────────────────────────────────────────────
// ADMIN-01: Hard-delete a user and all their owned/linked data in FK-safe order.
// ADMIN-04: Guards prevent self-delete and last-active-admin deletion.

admin.delete('/users/:id', async (c) => {
  const { id } = c.req.param()
  const authenticatedUserId = c.get('userId')

  // D-08: Self-delete guard — admin cannot delete their own account
  if (id === authenticatedUserId) {
    return c.json({ error: 'SELF_DELETE' }, 400)
  }

  // Load target user
  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) {
    return c.json({ error: 'User not found.' }, 404)
  }

  // D-08: Last-admin guard — prevent losing the last active admin account
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } })
  if (adminCount <= 1 && target.role === 'ADMIN') {
    return c.json({ error: 'LAST_ADMIN' }, 400)
  }

  // D-06/D-07: Media file cleanup — best-effort before the transaction.
  // Failures are logged and do not abort the deletion (D-07).
  const mediaRecords = await prisma.media.findMany({ where: { ownerId: id } })
  for (const m of mediaRecords) {
    try {
      await unlink(m.storagePath)
    } catch (err) {
      // D-07: best-effort — log and continue; do not roll back
      console.warn(`[admin] Could not delete media file ${m.storagePath}:`, (err as Error).message)
    }
  }

  // D-05: Ordered cascade delete via prisma.$transaction (atomic).
  // Pitfall 2: deckIds pre-computed BEFORE the $transaction array (no await inside array).
  // Note: ReviewLog rows auto-delete via existing onDelete: Cascade on userId FK (no explicit step needed).
  // Note: DeckShare rows where user is deck owner auto-delete via existing onDelete: Cascade on Deck (deckId FK).
  const deckIds = (await prisma.deck.findMany({ where: { ownerId: id }, select: { id: true } })).map(
    (d) => d.id,
  )

  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { userId: id } }),
    prisma.deckShare.deleteMany({ where: { sharedWithUserId: id } }),
    prisma.cardProgress.deleteMany({ where: { userId: id } }),
    prisma.card.deleteMany({ where: { deckId: { in: deckIds } } }),
    prisma.deck.deleteMany({ where: { ownerId: id } }),
    prisma.inviteCode.deleteMany({ where: { usedById: id } }),
    prisma.media.deleteMany({ where: { ownerId: id } }),
    prisma.user.delete({ where: { id } }),
  ])

  return c.json({ message: 'User deleted.' }, 200)
})

// ─── GET /invite-codes ────────────────────────────────────────────────────────

admin.get('/invite-codes', async (c) => {
  const codes = await prisma.inviteCode.findMany({
    include: {
      usedBy: {
        select: { username: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return c.json(codes, 200)
})

// ─── POST /invite-codes ───────────────────────────────────────────────────────

admin.post('/invite-codes', async (c) => {
  let body: { expiryDays?: unknown } = {}
  try {
    body = await c.req.json()
  } catch {
    // Empty body is fine — use defaults
  }

  // D-09: Configurable expiry, default 7 days
  const expiryDays = body.expiryDays !== undefined ? Number(body.expiryDays) : 7
  if (!Number.isInteger(expiryDays) || expiryDays < 1 || expiryDays > 365) {
    return c.json({ error: 'expiryDays must be an integer between 1 and 365.' }, 400)
  }

  const code = crypto
    .randomUUID()
    .replace(/-/g, '')
    .slice(0, 12)
    .toUpperCase()
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)

  const inviteCode = await prisma.inviteCode.create({
    data: { code, expiresAt },
    select: { id: true, code: true, expiresAt: true, createdAt: true },
  })

  return c.json(inviteCode, 200)
})

// ─── DELETE /invite-codes/:id ─────────────────────────────────────────────────

admin.delete('/invite-codes/:id', async (c) => {
  const { id } = c.req.param()

  const inviteCode = await prisma.inviteCode.findUnique({ where: { id } })
  if (!inviteCode) {
    return c.json({ error: 'Invite code not found.' }, 404)
  }

  if (inviteCode.usedAt !== null) {
    return c.json({ error: 'Cannot delete a used invite code.' }, 400)
  }

  await prisma.inviteCode.delete({ where: { id } })

  return c.json({ message: 'Invite code deleted.' }, 200)
})

// ─── POST /mailer/test ────────────────────────────────────────────────────────
// EMAIL-02 / D-11: Send a test email to the logged-in admin's own address.
// D-12: Returns 400 with NO_EMAIL if the admin has no email address set.
// D-10: Returns 400 if SMTP is not configured (soft-fail surfaced at call time).

admin.post('/mailer/test', async (c) => {
  const authenticatedUserId = c.get('userId')

  const user = await prisma.user.findUnique({
    where: { id: authenticatedUserId },
    select: { email: true },
  })

  // D-12: Admin has no email set — frontend maps NO_EMAIL to "Set your email address first" toast
  if (!user?.email) {
    return c.json({ error: 'NO_EMAIL' }, 400)
  }

  // D-10: SMTP not configured — soft-fail surfaced at call time
  if (!isConfigured()) {
    return c.json({ error: 'SMTP not configured.' }, 400)
  }

  try {
    await verifyConnection()
    await sendMail({
      to: user.email,
      subject: 'Kartex — SMTP test email',
      text: 'This is a test email from your Kartex instance.',
      html: '<p>This is a test email from your Kartex instance.</p>',
    })
    return c.json({ message: 'Test email sent.' }, 200)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

export { admin as adminRouter }
