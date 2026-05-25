import { readFileSync } from 'node:fs'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware, requireAdmin } from './middleware/auth.js'
import { authRouter } from './routes/auth.js'
import { adminRouter } from './routes/admin.js'
import { seedAdminIfNeeded } from './lib/seed.js'

const app = new Hono()

// ─── 1. Health endpoint (FIRST — no auth, no catch-all interference) ──────────
app.get('/api/health', (c) => c.json({ status: 'ok' }))

// ─── 2. CORS (INFR-05: restricted to ALLOWED_ORIGIN — no wildcard) ────────────
app.use(
  '/api/*',
  cors({
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
    credentials: true, // Required for httpOnly cookie auth
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

// ─── 3. Auth routes (no JWT required for register/login/logout/refresh) ───────
app.route('/api/auth', authRouter)

// ─── 4. JWT auth middleware on all remaining /api/* routes (INFR-03) ──────────
app.use('/api/*', authMiddleware)

// ─── 5. Admin routes (JWT + ADMIN role required) ──────────────────────────────
app.use('/api/admin/*', requireAdmin)
app.route('/api/admin', adminRouter)

// ─── 7. Static files (D-06: Hono serves the built Vite SPA) ──────────────────
app.use('*', serveStatic({ root: './public' }))

// ─── 8. SPA fallback (React Router client-side routing) ──────────────────────
//        All non-API, non-static requests return index.html
app.get('*', (c) => {
  try {
    const html = readFileSync('./public/index.html', 'utf8')
    return c.html(html)
  } catch {
    // In development, public/ may not exist (no Vite build yet)
    return c.text('Kartex backend is running. Start the frontend with: yarn dev:frontend', 404)
  }
})

// ─── Server startup ───────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT ?? '3000', 10)

await seedAdminIfNeeded()

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[server] Listening on http://localhost:${info.port}`)
})
