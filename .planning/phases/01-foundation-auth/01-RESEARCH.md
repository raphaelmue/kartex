# Phase 1 Research: Foundation & Auth

**Phase:** 1 — Foundation & Auth
**Date:** 2026-05-25
**Researcher:** Inline (orchestrator wrote directly after subagent connection failures)

---

## Executive Summary

- **Yarn workspaces** require a root `package.json` with `"workspaces": ["apps/*", "packages/*"]` and a `yarn.lock`; cross-workspace imports use the workspace name (e.g. `@kartex/shared`) declared as a dependency with `"workspace:*"` protocol.
- **Hono + @hono/node-server** is the correct pairing for Node.js; use `serveStatic` middleware to serve the built Vite SPA from `apps/backend/public/`; a single container handles both API and static files (per D-06).
- **jose** (not jsonwebtoken) is recommended for JWT in ESM TypeScript — supports both signing and verification with a clean async API; `hono/cookie` handles httpOnly cookie set/get natively.
- **Docker Compose** exposes only the backend port (no Nginx service per D-05); `db` service uses `postgres:16-alpine`; backend runs `prisma migrate deploy` as part of its entrypoint before starting the server.
- **shadcn/ui with Tailwind CSS v3** is the stable combination for Vite projects; `components.json` goes in the frontend workspace root; Tailwind config and CSS import live in `apps/frontend/`.

---

## Technology Decisions

| Concern | Package | Version / Notes |
|---------|---------|-----------------|
| Monorepo | Yarn workspaces | Yarn 4 (berry) or Yarn 1 classic — classic is simpler for Docker |
| Backend framework | `hono` + `@hono/node-server` | latest stable (~4.x) |
| JWT | `jose` | 5.x — pure ESM, no native dependency issues |
| Password hashing | `bcryptjs` | No native bindings (Docker-friendly); 12 salt rounds |
| Rate limiting | `@hono/rate-limiter` or manual in-memory | Simple in-memory per-IP is sufficient for 2-5 users |
| CORS | `hono/cors` | Built-in Hono middleware |
| ORM | `prisma` + `@prisma/client` | 5.x |
| Database | `postgres:16-alpine` | Docker image |
| Frontend build | `vite` + `@vitejs/plugin-react` | Vite 5.x |
| Routing | `react-router-dom` | v6 (stable, widely documented) |
| UI components | `shadcn/ui` | Tailwind v3 — use `npx shadcn@latest init` in frontend workspace |
| Notifications | `sonner` | Toast library used by shadcn |
| Form validation | `react-hook-form` + `@hookform/resolvers` + `zod` | Integrates with shared Zod schemas |

---

## Implementation Patterns

### Monorepo Structure (Yarn Workspaces)

Root `package.json`:
```json
{
  "name": "kartex",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:frontend": "yarn workspace @kartex/frontend dev",
    "dev:backend": "yarn workspace @kartex/backend dev",
    "build": "yarn workspaces foreach -A run build",
    "typecheck": "yarn workspaces foreach -A run typecheck"
  }
}
```

Cross-workspace dependency (`apps/frontend/package.json`):
```json
{
  "dependencies": {
    "@kartex/shared": "workspace:*"
  }
}
```

`packages/shared/package.json` must export its types:
```json
{
  "name": "@kartex/shared",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts" }
}
```

Vite must resolve the workspace package — add to `vite.config.ts`:
```ts
resolve: { alias: { '@kartex/shared': path.resolve(__dirname, '../../packages/shared/src') } }
```

### JWT Auth in Hono

**Token strategy:**
- Access token: 15-min expiry, signed with `JWT_SECRET`, stored in `httpOnly; Secure; SameSite=Strict` cookie named `access_token`
- Refresh token: 30-day expiry, stored in DB (`RefreshToken` table or `User.refreshToken` field), cookie named `refresh_token`

**jose signing:**
```ts
import { SignJWT, jwtVerify } from 'jose'
const secret = new TextEncoder().encode(process.env.JWT_SECRET)
// sign
const token = await new SignJWT({ sub: userId, role })
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('15m')
  .sign(secret)
// verify
const { payload } = await jwtVerify(token, secret)
```

**Refresh token rotation:** On `POST /api/auth/refresh`, verify the refresh token cookie against the DB record, issue a new access token + new refresh token, invalidate the old refresh token in DB (rotation prevents replay).

**Auth middleware pattern:**
```ts
const authMiddleware = createMiddleware(async (c, next) => {
  const token = getCookie(c, 'access_token')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const { payload } = await jwtVerify(token, secret)
    c.set('userId', payload.sub as string)
    c.set('role', payload.role as string)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})
```

Apply to all routes except `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`.

### Prisma Setup & Migrations

Schema lives at `apps/backend/prisma/schema.prisma`. Key models for Phase 1:
- `User` (id, username, passwordHash, role, isActive, createdAt)
- `InviteCode` (id, code, expiresAt, usedAt, usedById, createdAt)
- `RefreshToken` (id, userId, tokenHash, expiresAt, createdAt)

Migration commands:
- Dev: `yarn workspace @kartex/backend prisma migrate dev`
- Production (Docker): `npx prisma migrate deploy` (runs pending migrations only, no prompts)
- Generate client: `npx prisma generate`

Docker entrypoint pattern:
```sh
#!/bin/sh
npx prisma migrate deploy
node dist/index.js
```

### Docker Compose Production Config

```yaml
services:
  backend:
    build: ./apps/backend
    ports:
      - "${BACKEND_PORT:-3000}:3000"
    environment:
      DATABASE_URL: postgresql://kartex:${DB_PASSWORD}@db:5432/kartex
      JWT_SECRET: ${JWT_SECRET}
      ADMIN_USERNAME: ${ADMIN_USERNAME}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - media_data:/app/media

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: kartex
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: kartex
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kartex"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  pg_data:
  media_data:
```

Backend `Dockerfile` (multi-stage):
1. Stage 1: Build frontend (`yarn workspace @kartex/frontend build`) → `apps/frontend/dist/`
2. Stage 2: Build backend (`yarn workspace @kartex/backend build`) → `apps/backend/dist/`
3. Stage 3: Production image — copies `dist/`, `prisma/`, `public/` (frontend build output); installs only prod deps

Hono serving static files:
```ts
import { serveStatic } from '@hono/node-server/serve-static'
// Serve SPA — catch-all after API routes
app.use('*', serveStatic({ root: './public' }))
app.get('*', serveStatic({ path: './public/index.html' })) // SPA fallback
```

### React Router Protected Routes

```tsx
// ProtectedRoute.tsx
function ProtectedRoute() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

// App.tsx routes
<Routes>
  {/* Auth pages — no sidebar */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />

  {/* Protected routes — wrapped in AppShell */}
  <Route element={<ProtectedRoute />}>
    <Route element={<AppShell />}>
      <Route path="/dashboard" element={<DashboardPlaceholder />} />
      <Route path="/decks" element={<ComingSoon />} />
      <Route path="/import" element={<ComingSoon />} />
      <Route path="/explore" element={<ComingSoon />} />
      <Route path="/settings" element={<SettingsPlaceholder />} />
      <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
    </Route>
  </Route>

  <Route path="*" element={<Navigate to="/dashboard" replace />} />
</Routes>
```

Auth state via React Context — `AuthProvider` wraps the app, calls `GET /api/auth/me` on mount to hydrate session from cookie.

### shadcn/ui Setup

Initialize in frontend workspace:
```sh
cd apps/frontend && npx shadcn@latest init
```

`components.json` settings: style=`default`, tailwind config=`tailwind.config.ts`, baseColor=`neutral`, cssVariables=`true`.

Components needed for Phase 1:
```sh
npx shadcn@latest add button input form label card table
# Sonner (toast) is added via: npx shadcn@latest add sonner
```

All components land in `apps/frontend/src/components/ui/`.

### Admin Seed Pattern

In `apps/backend/src/lib/seed.ts`, called once at server startup:
```ts
export async function seedAdminIfNeeded() {
  const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (adminExists) return // idempotent — skip on non-fresh installs (D-03)

  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD
  if (!username || !password) {
    console.warn('[seed] ADMIN_USERNAME/ADMIN_PASSWORD not set — skipping admin seed')
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.create({ data: { username, passwordHash, role: 'ADMIN' } })

  // Generate first invite code, print once to stdout (D-02)
  const code = crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  await prisma.inviteCode.create({ data: { code, expiresAt } })
  console.log(`[seed] First invite code: ${code} (expires ${expiresAt.toISOString()})`)
}
```

Call in server entrypoint after Prisma connects, before routes start accepting traffic.

### Rate Limiting

Simple in-memory rate limiter sufficient for 2-5 users. Use a map of `ip → { count, resetAt }`:
- Auth endpoints: 10 requests per minute per IP
- Or use `@hono/rate-limiter` package if available, configured per-route

Apply to: `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/refresh`

### CORS

```ts
import { cors } from 'hono/cors'
app.use('/api/*', cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  credentials: true, // required for cookies
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))
```

In production, `ALLOWED_ORIGIN` should be set to the app's public domain in `.env`.

---

## File Structure

Expected file tree after Phase 1 completion:

```
kartex/
├── package.json                    # Yarn workspace root
├── yarn.lock
├── .env.example
├── docker-compose.yml
├── .gitignore
│
├── apps/
│   ├── backend/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # All models (User, InviteCode, RefreshToken, Deck, Card, ...)
│   │   │   └── migrations/
│   │   └── src/
│   │       ├── index.ts            # Server entrypoint — calls seedAdminIfNeeded(), mounts routes
│   │       ├── lib/
│   │       │   ├── prisma.ts       # Prisma client singleton
│   │       │   ├── seed.ts         # Admin + invite code seed
│   │       │   └── jwt.ts          # sign/verify helpers using jose
│   │       ├── middleware/
│   │       │   ├── auth.ts         # JWT verification middleware
│   │       │   └── rateLimit.ts    # Rate limiter middleware
│   │       └── routes/
│   │           └── auth.ts         # POST /register, /login, /logout, /refresh + GET /me
│   │           └── admin.ts        # GET /users, PATCH /users/:id, POST /invite-codes, DELETE /invite-codes/:id
│   │
│   └── frontend/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── postcss.config.js
│       ├── components.json         # shadcn/ui config
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx             # Router setup
│           ├── index.css           # Tailwind base + shadcn CSS variables
│           ├── components/
│           │   ├── ui/             # shadcn/ui components (Button, Input, Form, ...)
│           │   ├── AppShell.tsx    # Sidebar layout wrapper
│           │   └── ProtectedRoute.tsx
│           ├── context/
│           │   └── AuthContext.tsx  # useAuth() hook + AuthProvider
│           ├── lib/
│           │   └── api.ts          # fetch wrapper with auto-refresh logic
│           └── pages/
│               ├── LoginPage.tsx
│               ├── RegisterPage.tsx
│               └── AdminPage.tsx
│
└── packages/
    └── shared/
        ├── package.json
        └── src/
            ├── index.ts
            └── schemas/
                ├── user.ts         # UserSchema, UserRole enum
                ├── auth.ts         # LoginSchema, RegisterSchema
                └── inviteCode.ts   # InviteCodeSchema
```

---

## Risks & Landmines

1. **Yarn 1 vs Yarn 4 in Docker** — Yarn Berry (4) uses PnP by default which breaks many tools in Docker. Use `nodeLinker: node-modules` in `.yarnrc.yml` or stick with Yarn 1 classic for simpler Docker builds.

2. **Prisma binary targets in Docker** — Prisma generates native binaries. The `Dockerfile` must `COPY prisma/` before `prisma generate`, and the final image must match the build target (`linux-musl-openssl-3.0.x` for alpine). Use `binaryTargets` in `schema.prisma` if needed.

3. **SPA fallback in Hono** — `serveStatic` serves exact file matches; for React Router client-side routing, all non-API 404s must return `index.html`. Order matters: API routes first, then static middleware, then catch-all returning `index.html`.

4. **Cookie SameSite in dev** — In development (HTTP), `Secure` flag must be false and `SameSite=Lax` (not `Strict`) to work with Vite proxy. Add `NODE_ENV` check.

5. **CORS credentials** — `credentials: true` on the Hono CORS middleware AND `credentials: 'include'` on every frontend `fetch()` call — missing either breaks cookie auth silently.

6. **Vite proxy in dev** — `vite.config.ts` must proxy `/api` to `http://localhost:3001` (or whatever backend dev port) to avoid CORS issues in dev. This proxy does not exist in production (Hono serves everything).

7. **shadcn/ui path aliases** — `components.json` uses `@/` alias; `vite.config.ts` and `tsconfig.json` must both define `"@": "./src"` alias or shadcn CLI will fail.

8. **Refresh token race condition** — Multiple concurrent requests with an expired access token can all try to refresh simultaneously. Frontend should debounce/queue refresh requests (one promise shared across all concurrent callers).

---

## Validation Architecture

### Automated (can run in CI / plan verification)
- `yarn typecheck` — TypeScript compilation with no errors across all workspaces
- `yarn workspace @kartex/backend prisma validate` — Schema validation
- `yarn workspace @kartex/frontend build` — Vite build succeeds (catches import errors)
- `yarn workspace @kartex/backend build` — tsc compile succeeds

### Semi-automated (requires running services)
- `docker compose up -d` completes without error (INFR-01)
- `curl http://localhost:3000/api/health` returns 200 (backend reachable)
- `curl http://localhost:3000/` returns `index.html` (SPA served)
- `POST /api/auth/register` with invalid invite code returns 400/401
- `POST /api/auth/register` with valid invite code returns 200 + sets cookies
- `POST /api/auth/login` returns 200 + sets cookies for valid credentials
- `GET /api/auth/me` returns 401 without cookies, 200 with valid access token
- `POST /api/auth/refresh` issues new access token using refresh token cookie

### Manual (browser-level)
- Register form rejects invalid invite code with error message
- Login → dashboard redirect works; sidebar renders
- Browser refresh keeps user logged in (refresh token hydrates session)
- Logout clears session; next visit redirects to /login
- Admin page shows invite code table; generate/delete works
- Phase 2+ routes show "Coming soon" placeholder

---

## RESEARCH COMPLETE

Key findings for the planner:
- **Yarn workspaces** with `workspace:*` protocol for cross-package deps; Yarn classic recommended for Docker simplicity
- **jose** for JWT (pure ESM, no native deps); `hono/cookie` for httpOnly cookie management
- **bcryptjs** (not bcrypt) avoids native binding issues in Docker Alpine images
- **Single Dockerfile** handles both frontend build (Vite) and backend (tsc); copies Vite output to `apps/backend/public/`; Hono serves it via `serveStatic`
- **No Nginx in Docker Compose** — backend port exposed directly for external NPM proxy (per D-05)
- **Prisma seed** runs at startup via `seedAdminIfNeeded()` — idempotent check prevents re-seeding
- **Three plans** align well with phase scope: (1) monorepo scaffold + Prisma + Docker, (2) backend auth routes + middleware, (3) frontend pages + app shell
- **Tailwind v3 + shadcn/ui** is the stable combination; avoid Tailwind v4 for now (shadcn compatibility is still maturing)
