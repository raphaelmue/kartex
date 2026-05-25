import type { MiddlewareHandler } from 'hono'

interface RateLimitEntry {
  count: number
  resetAt: number
}

/**
 * Simple in-memory per-IP rate limiter.
 * Sufficient for the 2-5 user scale of Kartex.
 *
 * @param limit - Maximum number of requests allowed per window
 * @param windowMs - Window duration in milliseconds
 * @returns Hono middleware handler
 */
export function rateLimitMiddleware(limit: number, windowMs: number): MiddlewareHandler {
  const store = new Map<string, RateLimitEntry>()

  return async (c, next) => {
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      c.req.header('x-real-ip') ||
      'unknown'

    const now = Date.now()
    const entry = store.get(ip)

    if (!entry || now > entry.resetAt) {
      // New window
      store.set(ip, { count: 1, resetAt: now + windowMs })
    } else if (entry.count >= limit) {
      return c.json({ error: 'Too many requests.' }, 429)
    } else {
      entry.count++
    }

    await next()
  }
}
