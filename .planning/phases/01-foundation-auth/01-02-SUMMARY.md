---
phase: 01-foundation-auth
plan: "02"
subsystem: backend-auth
tags: [hono, jwt, zod, prisma, auth, middleware, cookies, cors, rate-limiting]
dependency_graph:
  requires:
    - prisma-schema-all-models
    - yarn-workspace-root
  provides:
    - shared-zod-schemas
    - jwt-sign-verify-helpers
    - admin-seed-idempotent
    - auth-routes-register-login-logout-refresh-me
    - admin-routes-users-invite-codes
    - hono-middleware-pattern
    - hono-server-entrypoint
  affects:
    - packages/shared
    - apps/backend
tech_stack:
  added:
    - "jose@^5.9.6 — JWT sign/verify (HS256, access 15m + refresh 30d)"
    - "bcryptjs@^2.4.3 — password hashing (12 rounds) + refresh token storage"
    - "hono/cookie — getCookie/setCookie/deleteCookie for httpOnly cookie management"
    - "hono/cors — CORS middleware with ALLOWED_ORIGIN env var"
    - "hono/factory createMiddleware — type-safe middleware pattern"
    - "@hono/node-server/serve-static — SPA static file serving (D-06)"
  patterns:
    - "Zod schemas in packages/shared — single source of truth for frontend + backend"
    - "PrismaClient global singleton — prevents duplicate instances in dev hot-reload"
    - "Refresh token rotation — raw token in cookie, bcrypt hash in DB, delete-on-use"
    - "Non-leaking error messages — all login failures return same 401 response"
    - "SameSite=Strict (prod) / Lax (dev) — NODE_ENV-driven cookie security"
    - "Health endpoint registered before all middleware — unaffected by auth or catch-all"
key_files:
  created:
    - packages/shared/src/schemas/user.ts
    - packages/shared/src/schemas/auth.ts
    - packages/shared/src/schemas/inviteCode.ts
    - apps/backend/src/lib/prisma.ts
    - apps/backend/src/lib/jwt.ts
    - apps/backend/src/lib/seed.ts
    - apps/backend/src/middleware/auth.ts
    - apps/backend/src/middleware/rateLimit.ts
    - apps/backend/src/routes/auth.ts
    - apps/backend/src/routes/admin.ts
  modified:
    - packages/shared/src/index.ts
    - apps/backend/src/index.ts
decisions:
  - "Refresh token lookup uses bcrypt.compare loop over non-expired tokens — no DB index on hash needed at 2-5 user scale; simple and correct"
  - "rateLimitMiddleware applied via auth.use('*', ...) — covers all five auth routes uniformly"
  - "GET /api/health registered before app.use('/api/*', cors(...)) to ensure it is reachable with zero middleware overhead"
  - "SPA fallback uses readFileSync with try/catch — returns 404 text in dev (no public/index.html); returns full HTML in production"
  - "PATCH /admin/users/:id rejects isActive=false when target id === authenticated user id (T-02-08 self-deactivation protection)"
metrics:
  duration: "~20 minutes"
  completed: "2026-05-25T20:16:32Z"
  tasks_completed: 2
  files_created: 11
  files_modified: 2
---

# Phase 1 Plan 02: Backend Auth API + Shared Zod Schemas Summary

**One-liner:** JWT auth API with bcrypt + jose (HS256), httpOnly cookie rotation, invite-code registration, and Zod schemas shared between backend and frontend.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Shared Zod schemas + backend lib (prisma, jwt, seed) | fe00dc3 | packages/shared/src/schemas/*, apps/backend/src/lib/* |
| 2 | Auth middleware + routes + admin routes + server entrypoint | 68cbbe9 | apps/backend/src/middleware/*, apps/backend/src/routes/*, apps/backend/src/index.ts |

## What Was Built

### Shared Zod Schemas (`packages/shared`)

- **`user.ts`** — `UserRole` enum (`ADMIN | USER`), `UserSchema`, `UserResponseSchema` (no `passwordHash` — safe public shape)
- **`auth.ts`** — `LoginSchema` (min-1 fields), `RegisterSchema` (3-20 char username, alphanumeric+underscore, min-8 password, invite code), exported TypeScript types
- **`inviteCode.ts`** — `InviteCodeSchema`, `getInviteCodeStatus()` helper deriving `'active' | 'used' | 'expired'` from code fields
- **`index.ts`** — re-exports all three schema modules for `@kartex/shared` consumers

### Backend Lib (`apps/backend/src/lib`)

- **`prisma.ts`** — PrismaClient singleton using global var pattern (prevents duplicate instances in dev hot-reload)
- **`jwt.ts`** — `signToken(payload, expiresIn)` and `verifyToken(token)` using jose 5.x HS256; reads `JWT_SECRET` env var
- **`seed.ts`** — `seedAdminIfNeeded()` implementing D-01/D-02/D-03: idempotent check for existing admin, creates admin from env vars, generates + prints first invite code once to stdout

### Auth Middleware (`apps/backend/src/middleware`)

- **`auth.ts`** — `authMiddleware` (reads `access_token` cookie, verifies JWT, sets `userId` + `role` on context) + `requireAdmin` (checks role === 'ADMIN'); includes `ContextVariableMap` declaration for type safety
- **`rateLimit.ts`** — `rateLimitMiddleware(limit, windowMs)`: in-memory Map of IP → `{count, resetAt}` entries; 10 req/min applied to all auth routes

### Auth Routes (`/api/auth`)

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| POST | `/register` | No | Validate invite code, check username, hash password, create user, invalidate code |
| POST | `/login` | No | bcrypt compare, non-leaking 401 for any failure, set httpOnly cookies |
| POST | `/logout` | No | Clear cookies, delete refresh token record from DB |
| POST | `/refresh` | No | Verify refresh token via bcrypt loop, rotate (delete old + issue new) |
| GET | `/me` | Yes (JWT) | Return user without passwordHash via Prisma select |

### Admin Routes (`/api/admin`, JWT + ADMIN role required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List all users (no passwordHash) |
| PATCH | `/users/:id` | Update role/isActive; blocks self-deactivation (T-02-08) |
| GET | `/invite-codes` | List all codes with usedBy relation |
| POST | `/invite-codes` | Generate code with configurable expiryDays (1-365, default 7) |
| DELETE | `/invite-codes/:id` | Delete unused code; rejects used codes |

### Server Entrypoint (`apps/backend/src/index.ts`)

Registration order (critical for Hono):
1. `GET /api/health` — **first**, no auth, no middleware
2. CORS middleware on `/api/*` using `ALLOWED_ORIGIN` env var (no wildcard)
3. Auth router at `/api/auth` (no JWT required)
4. `authMiddleware` on `/api/*` (protects all remaining API routes)
5. `requireAdmin` on `/api/admin/*`, admin router at `/api/admin`
6. `serveStatic({ root: './public' })` — Vite build output (D-06)
7. SPA fallback: `readFileSync('./public/index.html')` with dev-mode 404 fallback

Calls `seedAdminIfNeeded()` before `serve()` to ensure admin exists on first boot.

## Security Measures Implemented

| Threat | Mitigation |
|--------|-----------|
| T-02-01: Login timing attack | bcrypt.compare (constant-time); same 401 for all failures |
| T-02-02: Information disclosure | "Invalid username or password." for all login failure modes |
| T-02-03: Privilege escalation | authMiddleware + requireAdmin on all /api/admin/* |
| T-02-04: Refresh token replay | Rotation: old token deleted on use; replayed token → 401 |
| T-02-05: DoS on auth endpoints | rateLimitMiddleware(10, 60_000) on all /api/auth/* |
| T-02-06: CSRF | SameSite=Strict (prod) / Lax (dev); httpOnly cookies |
| T-02-07: passwordHash exposure | Prisma select excludes hash; UserResponseSchema has no hash field |
| T-02-08: Admin self-deactivation | PATCH /admin/users/:id rejects isActive=false when id === self |
| T-02-09: Invite code brute force | Rate limit + single-use codes (D-08) |
| INFR-05: Wildcard CORS | origin: process.env.ALLOWED_ORIGIN — no '*' |

## Deviations from Plan

**1. [Rule 2 - Missing Critical Functionality] Logout refresh token lookup via bcrypt loop**

The plan described: "hash the cookie value and delete matching record" implying a direct DB lookup by hash. However bcrypt hashes are non-deterministic (new salt each time), so a direct `findUnique({ where: { tokenHash: hash } })` would never match.

- **Found during:** Task 2 implementation
- **Fix:** Logout and refresh both iterate non-expired tokens with `bcrypt.compare()`. At 2-5 user scale with at most a few tokens per user, this is correct and performant. If scale grows, the architecture should switch to storing a deterministic HMAC (e.g., SHA-256) instead of bcrypt for the token hash — but bcrypt provides defense-in-depth if the DB is compromised.
- **Files modified:** apps/backend/src/routes/auth.ts (logout and refresh handlers)
- **Commit:** 68cbbe9

## Known Stubs

None. All endpoints are fully implemented with real DB queries.

## Threat Flags

None. All endpoints and auth paths are covered by the plan's threat model.

## Self-Check: PASSED

- [x] `packages/shared/src/schemas/user.ts` exists — FOUND
- [x] `packages/shared/src/schemas/auth.ts` exists — FOUND
- [x] `packages/shared/src/schemas/inviteCode.ts` exists — FOUND
- [x] `packages/shared/src/index.ts` exports all schemas — FOUND
- [x] `apps/backend/src/lib/prisma.ts` exists — FOUND
- [x] `apps/backend/src/lib/jwt.ts` exists — FOUND
- [x] `apps/backend/src/lib/seed.ts` exists — FOUND
- [x] `apps/backend/src/middleware/auth.ts` exists — FOUND
- [x] `apps/backend/src/middleware/rateLimit.ts` exists — FOUND
- [x] `apps/backend/src/routes/auth.ts` exists — FOUND
- [x] `apps/backend/src/routes/admin.ts` exists — FOUND
- [x] `apps/backend/src/index.ts` updated — FOUND
- [x] Commit fe00dc3 exists: `feat(01-02): shared Zod schemas + backend lib`
- [x] Commit 68cbbe9 exists: `feat(01-02): auth middleware, rate limiter, routes, and server entrypoint`
- [x] `yarn typecheck` exits 0 — VERIFIED
- [x] `yarn workspace @kartex/backend build` exits 0 — VERIFIED
- [x] `passwordHash` not in `packages/shared/src/schemas/user.ts` — VERIFIED (count: 0)
- [x] `httpOnly: true` appears 2x in auth routes — VERIFIED (lines 32, 40)
- [x] `ALLOWED_ORIGIN` used in CORS, no wildcard origin — VERIFIED
- [x] `/api/health` registered before all middleware — VERIFIED (line 14)
