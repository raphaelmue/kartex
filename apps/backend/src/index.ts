import { readFileSync } from 'node:fs'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { authMiddleware, requireAdmin } from './middleware/auth.js'
import { authRouter } from './routes/auth.js'
import { adminRouter } from './routes/admin.js'
import { decksRouter } from './routes/decks.js'
import { mediaRouter, mediaPublicRouter } from './routes/media.js'
import { studyRouter } from './routes/study.js'
import { dashboardRouter } from './routes/dashboard.js'
import { statsRouter } from './routes/stats.js'
import { importRouter } from './routes/import.js'
import { exploreRouter } from './routes/explore.js'
import { deckUpdateRouter } from './routes/deckUpdate.js'
import { seedAdminIfNeeded } from './lib/seed.js'
import { isConfigured } from './lib/mailer.js'

const app = new Hono()

// ─── 0. Cross-origin isolation headers (PWA-04 + Typst WASM in production) ──
// MUST be first — applies COOP/COEP to ALL responses (API, static, SPA fallback)
// Dev-only workaround in vite.config.ts server.headers is superseded by this
app.use(
  '*',
  secureHeaders({
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginEmbedderPolicy: 'require-corp',
  }),
)

// ─── 1. Health endpoint (FIRST — no auth, no catch-all interference) ──────────
app.get('/api/health', (c) => c.json({ status: 'ok' }))

// ─── 2. CORS (INFR-05: restricted to ALLOWED_ORIGIN — no wildcard) ────────────
app.use(
  '/api/*',
  cors({
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
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

// ─── 5c. Study + Dashboard routes (JWT required — inherited from step 4) ──────
app.route('/api/study', studyRouter)
app.route('/api/dashboard', dashboardRouter)
app.route('/api/stats', statsRouter)

// ─── 5d. Import route (JWT required — inherited from step 4) ──────────────────
app.route('/api/import', importRouter)

// ─── 5e. Explore route (JWT required — inherited from step 4) ─────────────────
app.route('/api/explore', exploreRouter)

// ─── 5f. Deck update route (JWT required — inherited from step 4) ─────────────
app.route('/api/decks', deckUpdateRouter)

// ─── 6. Admin routes (JWT + ADMIN role required) ──────────────────────────────
app.use('/api/admin/*', requireAdmin)
app.route('/api/admin', adminRouter)

// ─── 7a. sw.js — Cache-Control: no-store (PWA-05) ───────────────────────────
// Explicit route before serveStatic catch-all — prevents browser from caching the SW
app.get('/sw.js', (c) => {
  try {
    const sw = readFileSync('./public/sw.js', 'utf8')
    c.header('Cache-Control', 'no-store')
    c.header('Content-Type', 'application/javascript')
    return c.body(sw)
  } catch {
    return c.text('Service worker not found', 404)
  }
})

// ─── 7b. Static files — no-store for workbox chunks (PWA-05), default for others
app.use(
  '*',
  serveStatic({
    root: './public',
    onFound: (filePath, c) => {
      if (/workbox-[^/]+\.js$/.test(filePath)) {
        c.header('Cache-Control', 'no-store')
      }
    },
  }),
)

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

try {
  await seedAdminIfNeeded()
} catch (err) {
  console.warn('[server] Admin seed skipped — database not reachable at startup:', (err as Error).message)
}

console.log(`[server] Mailer ${isConfigured() ? 'configured' : 'disabled (SMTP env vars missing)'}`)

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[server] Listening on http://localhost:${info.port}`)
})
