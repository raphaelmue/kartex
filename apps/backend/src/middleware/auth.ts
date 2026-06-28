import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { verifyToken } from '../lib/jwt.js'

// Extend Hono's ContextVariableMap so c.set/c.get are type-safe
declare module 'hono' {
  interface ContextVariableMap {
    userId: string
    role: string
  }
}

// Public API prefixes that bypass JWT authentication.
// The public invite-validation route (GET /api/invites/:token) must be reachable
// without a session so unauthenticated invitees can validate their token and see
// the registration form or an inline error card. This bypass is order-independent
// and supersedes the registration-order assumption that failed in production
// (UAT Gap 1 / EMAIL-06).
//
// Scope: '/api/invites/' only (trailing slash required so /api/admin/invites stays protected).
// Do NOT add '/api/media/' here — POST /api/media/upload is auth-protected.
const PUBLIC_API_PREFIXES = ['/api/invites/'] as const

/**
 * JWT authentication middleware.
 * Reads the access_token httpOnly cookie, verifies it, and sets userId + role on context.
 * Returns 401 if the cookie is missing or the token is invalid/expired.
 *
 * Public paths (PUBLIC_API_PREFIXES) bypass authentication entirely — they call
 * next() immediately without requiring or verifying a token.
 */
export const authMiddleware = createMiddleware(async (c, next) => {
  // Bypass auth for public API prefixes (e.g. /api/invites/:token)
  if (PUBLIC_API_PREFIXES.some((prefix) => c.req.path.startsWith(prefix))) {
    return next()
  }

  const token = getCookie(c, 'access_token')
  if (!token) {
    return c.json({ error: 'Unauthorized.' }, 401)
  }
  try {
    const payload = await verifyToken(token)
    const sub = payload.sub
    const role = payload.role
    if (typeof sub !== 'string' || typeof role !== 'string') {
      return c.json({ error: 'Unauthorized.' }, 401)
    }
    c.set('userId', sub)
    c.set('role', role)
  } catch {
    return c.json({ error: 'Unauthorized.' }, 401)
  }
  await next()
})

/**
 * Admin role enforcement middleware.
 * Must be applied AFTER authMiddleware (requires role to be set on context).
 * Returns 403 if the authenticated user is not an ADMIN.
 */
export const requireAdmin = createMiddleware(async (c, next) => {
  const role = c.get('role')
  if (role !== 'ADMIN') {
    return c.json({ error: 'Forbidden.' }, 403)
  }
  await next()
})
