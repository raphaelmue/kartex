import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'

// ─── Public router — GET /:token (no auth required) ──────────────────────────
// Validates an invite token and returns the associated email.
// Must be registered BEFORE authMiddleware in index.ts so unauthenticated
// invitees can validate their token without getting a 401 (Pitfall 1).

const invites = new Hono()

// ─── GET /:token ──────────────────────────────────────────────────────────────
// Returns { email } for a valid, unused, non-expired token.
// Returns 400 with a distinct error code for each invalid state (D-09/D-10).

invites.get('/:token', async (c) => {
  const { token } = c.req.param()

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

  // Only the email is returned — never the token value or usedAt (T-24-13)
  return c.json({ email: invite.email }, 200)
})

export { invites as invitesPublicRouter }
