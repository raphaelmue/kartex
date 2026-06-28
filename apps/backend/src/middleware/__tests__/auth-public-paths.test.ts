import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { authMiddleware } from '../auth.js'

/**
 * authMiddleware public-path bypass tests (EMAIL-06 / UAT Gap 1)
 *
 * Verifies that:
 *  - GET /api/invites/<token>  is reachable without a session (bypass works)
 *  - GET /api/decks            returns 401 without a session (protected route unchanged)
 *  - GET /api/admin/invites    returns 401 without a session (admin path not bypassed)
 */

function buildApp() {
  const app = new Hono()

  // Mount auth middleware on all /api/* paths — same as index.ts line 63
  app.use('/api/*', authMiddleware)

  // Public invite validation route (should bypass auth)
  app.get('/api/invites/:token', (c) => c.json({ reached: 'invites' }))

  // Admin invites route — must NOT be bypassed even though path contains 'invites'
  app.get('/api/admin/invites', (c) => c.json({ reached: 'admin' }))

  // A typical protected route — must remain protected
  app.get('/api/decks', (c) => c.json({ reached: 'decks' }))

  return app
}

describe('authMiddleware — public path bypass for /api/invites/', () => {
  it('GET /api/invites/:token reaches the handler (200) without an access_token cookie', async () => {
    const app = buildApp()
    const res = await app.request('/api/invites/abc123')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ reached: 'invites' })
  })

  it('GET /api/decks returns 401 without an access_token cookie', async () => {
    const app = buildApp()
    const res = await app.request('/api/decks')
    expect(res.status).toBe(401)
  })

  it('GET /api/admin/invites returns 401 without an access_token cookie (admin path not bypassed)', async () => {
    const app = buildApp()
    const res = await app.request('/api/admin/invites')
    expect(res.status).toBe(401)
  })
})
