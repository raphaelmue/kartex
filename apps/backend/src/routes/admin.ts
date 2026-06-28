import { randomBytes } from 'node:crypto'
import { unlink } from 'node:fs/promises'
import { z } from 'zod'
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

  // D-05: Ordered cascade delete via interactive $transaction (atomic).
  // D-08: Last-admin guard is inside the transaction to close the TOCTOU race window
  // (concurrent DELETE requests each seeing adminCount=2 then both deleting).
  // Note: ReviewLog rows auto-delete via existing onDelete: Cascade on userId FK.
  // Note: DeckShare rows where user is deck owner auto-delete via Cascade on Deck (deckId FK).
  const deckIds = (await prisma.deck.findMany({ where: { ownerId: id }, select: { id: true } })).map(
    (d) => d.id,
  )

  try {
    await prisma.$transaction(async (tx) => {
      // D-08: Last-admin guard inside the transaction — atomic check-and-delete
      if (target.role === 'ADMIN') {
        const adminCount = await tx.user.count({ where: { role: 'ADMIN', isActive: true } })
        if (adminCount <= 1) {
          throw Object.assign(new Error('LAST_ADMIN'), { code: 'LAST_ADMIN' })
        }
      }
      await tx.refreshToken.deleteMany({ where: { userId: id } })
      await tx.deckShare.deleteMany({ where: { sharedWithUserId: id } })
      await tx.cardProgress.deleteMany({ where: { userId: id } })
      await tx.card.deleteMany({ where: { deckId: { in: deckIds } } })
      await tx.deck.deleteMany({ where: { ownerId: id } })
      await tx.media.deleteMany({ where: { ownerId: id } })
      await tx.user.delete({ where: { id } })
    })
  } catch (err) {
    if ((err as { code?: string }).code === 'LAST_ADMIN') {
      return c.json({ error: 'LAST_ADMIN' }, 400)
    }
    throw err
  }

  return c.json({ message: 'User deleted.' }, 200)
})

// ─── GET /invites ─────────────────────────────────────────────────────────────
// EMAIL-07: Returns active-only (unused, non-expired) pending invites.
// Token value is never included in the response (T-24-13).

admin.get('/invites', async (c) => {
  const invites = await prisma.inviteToken.findMany({
    where: { usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, expiresAt: true, createdAt: true },
  })

  return c.json(invites, 200)
})

// ─── POST /invites ────────────────────────────────────────────────────────────
// EMAIL-03, EMAIL-04: Generate a 256-bit CSPRNG token, store it, and send an
// invite email. If sendMail throws, delete the created row (rollback).
// Guard: returns 400 if SMTP is not configured (D-10 soft-fail pattern).

admin.post('/invites', async (c) => {
  let body: unknown = {}
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid request body.' }, 400)
  }

  // Validate email address (T-24-11: Zod .email() prevents header injection)
  const parsed = z.object({ email: z.string().email() }).safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Valid email address required.' }, 400)
  }
  const { email } = parsed.data

  // D-10: SMTP not configured — surface at call time, not startup
  if (!isConfigured()) {
    return c.json({ error: 'SMTP_NOT_CONFIGURED' }, 400)
  }

  // T-24-05: 256-bit CSPRNG token — never cuid or truncated UUID
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const invite = await prisma.inviteToken.create({
    data: { email, token, expiresAt },
    select: { id: true, email: true, expiresAt: true, createdAt: true },
  })

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
  const inviteLink = `${appUrl}/invite/${token}`

  try {
    await sendMail({
      to: email,
      subject: "You've been invited to Kartex",
      text: `You've been invited to Kartex. Complete your registration within 7 days:\n${inviteLink}`,
      html: `<p>You've been invited to Kartex.</p><p><a href="${inviteLink}">Complete your registration</a></p><p>This link expires in 7 days.</p>`,
    })
  } catch (err) {
    // Roll back the created invite token if email delivery fails
    await prisma.inviteToken.delete({ where: { id: invite.id } })
    console.error('[admin] Invite email delivery failed:', (err as Error).message)
    return c.json({ error: 'SMTP_ERROR' }, 500)
  }

  return c.json(invite, 200)
})

// ─── DELETE /invites/:id ──────────────────────────────────────────────────────
// EMAIL-08: Revoke a pending invite. Returns 400 if already used — cannot
// un-ring that bell.

admin.delete('/invites/:id', async (c) => {
  const { id } = c.req.param()

  const invite = await prisma.inviteToken.findUnique({ where: { id } })
  if (!invite) {
    return c.json({ error: 'Invite not found.' }, 404)
  }

  if (invite.usedAt !== null) {
    return c.json({ error: 'Cannot revoke a used invite.' }, 400)
  }

  await prisma.inviteToken.delete({ where: { id } })

  return c.json({ message: 'Invite revoked.' }, 200)
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
    return c.json({ error: 'SMTP_NOT_CONFIGURED' }, 400)
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
    console.error('[admin] Mailer test failed:', (err as Error).message)
    return c.json({ error: 'SMTP_ERROR' }, 500)
  }
})

export { admin as adminRouter }
