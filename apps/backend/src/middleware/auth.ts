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

/**
 * JWT authentication middleware.
 * Reads the access_token httpOnly cookie, verifies it, and sets userId + role on context.
 * Returns 401 if the cookie is missing or the token is invalid/expired.
 */
export const authMiddleware = createMiddleware(async (c, next) => {
  const token = getCookie(c, 'access_token')
  if (!token) {
    return c.json({ error: 'Unauthorized.' }, 401)
  }
  try {
    const payload = await verifyToken(token)
    c.set('userId', payload.sub as string)
    c.set('role', payload.role as string)
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
