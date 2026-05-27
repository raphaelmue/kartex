import { readFileSync } from 'node:fs'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware, requireAdmin } from './middleware/auth.js'
import { authRouter } from './routes/auth.js'
import { adminRouter } from './routes/admin.js'
import { decksRouter } from './routes/decks.js'
import { mediaRouter, mediaPublicRouter } from './routes/media.js'
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

// ─── 3b. Media public route (GET only — no auth required for img/audio src) ───
//         Must be registered BEFORE authMiddleware so browsers can load media
//         files via <img src> and <audio src> without a cookie (T-03-MEDIA-AUTH).
app.route('/api/media', mediaPublicRouter)

// ─── 4. JWT auth middleware on all remaining /api/* routes (INFR-03) ──────────
app.use('/api/*', authMiddleware)

// ─── 5. Deck + Card routes (JWT required — inherited from step 4) ─────────────
app.route('/api/decks', decksRouter)

// ─── 5b. Media protected route (POST /upload — auth required) ────────────────
app.route('/api/media', mediaRouter)

// ─── 6. Admin routes (JWT + ADMIN role required) ──────────────────────────────
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
