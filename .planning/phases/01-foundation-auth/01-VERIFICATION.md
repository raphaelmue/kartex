---
phase: 01-foundation-auth
verified: 2026-05-26T10:00:00Z
status: human_needed
score: 14/15 must-haves verified
overrides_applied: 1
overrides:
  - must_have: "INFR-02: Nginx serves the React SPA (static files) and reverse-proxies /api/* requests to the Hono backend"
    reason: "D-05 (locked decision) removed Nginx from Docker Compose. D-06 replaces it: Hono serves the built React SPA via serveStatic from ./public, and the SPA is built into apps/backend/public/ by the Dockerfile frontend-builder stage. The requirement's intent (SPA reachable in browser) is satisfied; only the delivery mechanism differs."
    accepted_by: "plan-executor (01-02-PLAN.md + 01-03-PLAN.md decision_overrides)"
    accepted_at: "2026-05-26T00:00:00Z"
human_verification:
  - test: "Open browser to http://localhost:3000 after docker compose up -d with valid .env — verify the React SPA login page loads"
    expected: "The Sign in — Kartex card renders with username and password fields. No sidebar visible. The page background matches the neutral shadcn theme."
    why_human: "Cannot verify SPA rendering and visual layout programmatically without running the full Docker stack."
  - test: "Register a new user via the /register form using a valid invite code (obtained from docker compose logs backend)"
    expected: "Form submits, toast 'Account created. Please sign in.' appears on the /login redirect. Browser title is 'Create account — Kartex' during registration."
    why_human: "Requires a running stack with a live database, real invite code, and visual form interaction."
  - test: "Log in with admin credentials, navigate to /admin, generate an invite code, then use it to register a second user in an incognito window"
    expected: "Invite code appears in the Invite codes table with 'Active' badge. After use, badge changes to 'Used'. Second user can log in. The used code cannot be used again (400 from backend)."
    why_human: "Requires real DB state, multiple sessions, and visual table rendering."
  - test: "After logging in, close and reopen the browser tab — verify the session is preserved without re-entering credentials"
    expected: "The user lands on /dashboard (Coming soon) without being redirected to /login. Session was hydrated from GET /api/auth/me using the existing httpOnly cookie."
    why_human: "Browser cookie persistence requires a live browser session with real cookies."
  - test: "Log in as admin, log out via the sidebar button, verify the session is cleared"
    expected: "Clicking 'Log out' calls POST /api/auth/logout, clears cookies, redirects to /login. Trying to navigate to /dashboard without re-login redirects back to /login."
    why_human: "Requires real browser cookie clearing and React navigation behavior."
---

# Phase 1: Foundation & Auth Verification Report

**Phase Goal:** A new user can register via invite code, log in, and an admin can manage users — the app is deployable via Docker Compose.
**Verified:** 2026-05-26T10:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `docker compose up -d` starts full stack after filling in `.env` | ✓ VERIFIED | docker-compose.yml has backend + postgres:16-alpine services. All env vars use `${VAR}` syntax. Dockerfile has 3 stages building frontend and backend. `entrypoint.sh` runs `prisma migrate deploy` before starting node. Health condition on db service. |
| 2 | New user can register only with a valid invite code | ✓ VERIFIED | `POST /register` in auth.ts validates invite code existence, checks `usedAt === null`, checks `expiresAt >= now()`. Returns 400 `"Invalid or expired invite code."` otherwise. Single-use enforced via `prisma.inviteCode.update({ usedAt, usedById })`. |
| 3 | Logged-in user's session survives browser refresh; user can log out | ✓ VERIFIED | `AuthContext.tsx` calls `GET /api/auth/me` on mount to hydrate session from httpOnly cookie. `logout()` calls `POST /api/auth/logout` which deletes the refresh token record and clears both cookies. |
| 4 | Access token is transparently refreshed in background | ✓ VERIFIED | `api.ts` module-level `refreshPromise` queues concurrent callers. On 401 (excluding login/register/refresh URLs), fires `POST /api/auth/refresh` once, retries original request on success, calls `onAuthFailure()` on failure. Token rotation in `POST /refresh`: old token deleted, new token issued. |
| 5 | Admin can generate invite codes, view users, change roles/deactivate via /admin | ✓ VERIFIED | `AdminPage.tsx` calls `GET /api/admin/invite-codes` + `GET /api/admin/users` on mount. Generate button calls `POST /api/admin/invite-codes`. Role toggle calls `PATCH /api/admin/users/:id { role }`. Deactivate calls `PATCH /api/admin/users/:id { isActive: false }` with inline confirmation. Self-deactivation blocked in both backend (T-02-08) and frontend (button absent when `u.id === authUser.id`). |
| 6 | INFR-02: SPA is served to the browser | ✓ VERIFIED (override) | Override applied — see overrides section. Hono serves the SPA via `serveStatic({ root: './public' })` and SPA fallback `readFileSync('./public/index.html')`. Vite build outputs to `apps/backend/public/` (confirmed: index.html + assets/ present). |
| 7 | All API endpoints except login and refresh require valid JWT | ✓ VERIFIED | `app.use('/api/*', authMiddleware)` applied at line 31 in index.ts, after auth router (line 28) which handles login/register/logout/refresh without auth. `GET /me` also applies `authMiddleware` inline. |
| 8 | Rate limiting on login, register, refresh endpoints | ✓ VERIFIED | `auth.use('*', rateLimitMiddleware(10, 60_000))` in auth.ts covers all 5 auth routes including register, login, and refresh. In-memory Map per IP, 10 req/min. |
| 9 | CORS restricted to own domain; no wildcard | ✓ VERIFIED | `cors({ origin: process.env.ALLOWED_ORIGIN \|\| 'http://localhost:5173' })` — no `'*'` possible. ALLOWED_ORIGIN in .env.example. |
| 10 | All secrets sourced from .env; none hardcoded | ✓ VERIFIED | docker-compose.yml uses `${JWT_SECRET}`, `${DB_PASSWORD}`, `${ADMIN_USERNAME}`, etc. Zero hardcoded values found. `.env` in `.gitignore`. `.env.example` has all 6 required vars with placeholder values only. |
| 11 | Monorepo scaffolded: yarn install, typecheck pass | ✓ VERIFIED | Root `package.json` has `"workspaces": ["apps/*", "packages/*"]`, `"packageManager": "yarn@4.6.0"`. `.yarnrc.yml` has `nodeLinker: node-modules`. All workspace deps use `workspace:*` protocol. SUMMARY reports yarn install + typecheck exit 0. |
| 12 | Prisma schema has all 8 models and 3 enums; initial migration exists | ✓ VERIFIED | schema.prisma confirmed: User, InviteCode, RefreshToken, Deck, DeckShare, Card, CardProgress, Media. Enums: Role, Visibility, Permission. `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]`. Migration folder `20260525200713_init` present. No email field on User. |
| 13 | Admin seed creates admin + first invite code on fresh DB; skips on subsequent starts | ✓ VERIFIED | `seedAdminIfNeeded()` checks `prisma.user.findFirst({ where: { role: 'ADMIN' } })` and returns early if found. Creates admin + invite code otherwise. Called via `await seedAdminIfNeeded()` before `serve()` in index.ts. |
| 14 | Frontend pages connect to backend via shared Zod schemas | ✓ VERIFIED | `LoginPage.tsx` imports `LoginSchema, LoginInput` from `@kartex/shared`. `RegisterPage.tsx` imports `RegisterSchema, RegisterInput` from `@kartex/shared`. Both use `zodResolver(LoginSchema/RegisterSchema)` with react-hook-form. |
| 15 | SPA renders in browser with correct pages, routing, and app shell | ? HUMAN NEEDED | Artifacts are complete and wired. Visual/behavioral confirmation requires a live browser session. |

**Score:** 14/15 truths verified (1 overridden, 1 needs human)

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `package.json` | ✓ VERIFIED | workspaces, packageManager yarn@4.6.0 |
| `apps/backend/prisma/schema.prisma` | ✓ VERIFIED | All 8 models, 3 enums, no email on User |
| `apps/backend/prisma/migrations/20260525200713_init` | ✓ VERIFIED | Directory exists |
| `docker-compose.yml` | ✓ VERIFIED | backend + db only, no proxy, all vars use ${} |
| `.env.example` | ✓ VERIFIED | All 6 required vars: DB_PASSWORD, JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD, BACKEND_PORT, ALLOWED_ORIGIN |
| `packages/shared/src/index.ts` | ✓ VERIFIED | Exports user, auth, inviteCode schemas |
| `packages/shared/src/schemas/user.ts` | ✓ VERIFIED | UserRole, UserSchema, UserResponseSchema — no passwordHash |
| `packages/shared/src/schemas/auth.ts` | ✓ VERIFIED | LoginSchema, RegisterSchema, LoginInput, RegisterInput |
| `packages/shared/src/schemas/inviteCode.ts` | ✓ VERIFIED | InviteCodeSchema, getInviteCodeStatus(), InviteCodeStatus type |
| `apps/backend/src/lib/jwt.ts` | ✓ VERIFIED | signToken, verifyToken via jose HS256 |
| `apps/backend/src/lib/seed.ts` | ✓ VERIFIED | seedAdminIfNeeded(), idempotent admin check |
| `apps/backend/src/middleware/auth.ts` | ✓ VERIFIED | authMiddleware, requireAdmin, ContextVariableMap extension |
| `apps/backend/src/middleware/rateLimit.ts` | ✓ VERIFIED | rateLimitMiddleware(limit, windowMs) |
| `apps/backend/src/routes/auth.ts` | ✓ VERIFIED | register, login, logout, refresh, me routes |
| `apps/backend/src/routes/admin.ts` | ✓ VERIFIED | GET/PATCH users, GET/POST/DELETE invite-codes |
| `apps/backend/src/index.ts` | ✓ VERIFIED | Health first, CORS, auth router, authMiddleware, requireAdmin, serveStatic, SPA fallback, seedAdminIfNeeded called |
| `apps/frontend/src/lib/api.ts` | ✓ VERIFIED | api object, setAuthFailureHandler, refreshPromise (5 occurrences), concurrent queuing |
| `apps/frontend/src/context/AuthContext.tsx` | ✓ VERIFIED | AuthProvider, useAuth, GET /api/auth/me on mount, renders null while loading |
| `apps/frontend/src/components/ProtectedRoute.tsx` | ✓ VERIFIED | Returns null while loading, Navigate to /login if no user |
| `apps/frontend/src/components/AdminRoute.tsx` | ✓ VERIFIED | Returns null loading, toast 'Access denied.' + redirect to /dashboard for non-admin |
| `apps/frontend/src/components/AppShell.tsx` | ✓ VERIFIED | 240px sidebar, aria-label="Main navigation", 6 nav links (Admin conditionally for ADMIN role), Log out button |
| `apps/frontend/src/pages/LoginPage.tsx` | ✓ VERIFIED | LoginSchema from @kartex/shared, 'Sign in — Kartex' title, card layout, error on 401 |
| `apps/frontend/src/pages/RegisterPage.tsx` | ✓ VERIFIED | RegisterSchema from @kartex/shared, 'Create account — Kartex' title, invite code field |
| `apps/frontend/src/pages/AdminPage.tsx` | ✓ VERIFIED | 2 aria-label tables, GET /api/admin/invite-codes + GET /api/admin/users, generate + delete + role + deactivate actions |
| `apps/frontend/src/App.tsx` | ✓ VERIFIED | ProtectedRoute, AdminRoute, AppShell, all 6 protected routes, ComingSoon placeholder |
| `apps/frontend/src/main.tsx` | ✓ VERIFIED | BrowserRouter, Toaster duration=4000 position="bottom-right" |
| `apps/frontend/tailwind.config.ts` | ✓ VERIFIED | darkMode: 'class' |
| `apps/frontend/components.json` | ✓ VERIFIED | baseColor: neutral, cssVariables: true |
| `apps/frontend/src/components/ui/` | ✓ VERIFIED | button, card, form, input, label, sonner, table — all 7 components |
| `apps/frontend/src/index.css` | ✓ VERIFIED | @tailwind directives + :root CSS variable block |
| `apps/backend/public/index.html` | ✓ VERIFIED | Vite build output present (index.html + assets/) |
| `apps/backend/Dockerfile` | ✓ VERIFIED | 3-stage build, entrypoint.sh referenced |
| `apps/backend/entrypoint.sh` | ✓ VERIFIED | `npx prisma migrate deploy` then `exec node dist/index.js`, set -e |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/backend/package.json` | `packages/shared` | workspace:* | ✓ WIRED | `"@kartex/shared": "workspace:*"` confirmed |
| `apps/frontend/package.json` | `packages/shared` | workspace:* | ✓ WIRED | `"@kartex/shared": "workspace:*"` confirmed |
| `apps/backend/Dockerfile` | `apps/backend/entrypoint.sh` | CMD | ✓ WIRED | `CMD ["/app/entrypoint.sh"]` at line 83 |
| `apps/backend/entrypoint.sh` | migrations | prisma migrate deploy | ✓ WIRED | `npx prisma migrate deploy` in entrypoint.sh |
| `apps/backend/src/routes/auth.ts` | `packages/shared/src/schemas/auth.ts` | import from @kartex/shared | ✓ WIRED | `import { LoginSchema, RegisterSchema } from '@kartex/shared'` at line 5 |
| `apps/backend/src/routes/auth.ts` | `apps/backend/src/lib/jwt.ts` | signToken/verifyToken calls | ✓ WIRED | Both imported and used in login, refresh, /me handler |
| `apps/backend/src/index.ts` | `apps/backend/src/middleware/auth.ts` | authMiddleware on /api/* | ✓ WIRED | `app.use('/api/*', authMiddleware)` line 31 |
| `apps/backend/src/routes/admin.ts` | `apps/backend/src/middleware/auth.ts` | requireAdmin | ✓ WIRED | `app.use('/api/admin/*', requireAdmin)` in index.ts before admin router |
| `apps/frontend/src/pages/LoginPage.tsx` | `packages/shared/src/schemas/auth.ts` | LoginSchema import | ✓ WIRED | `import { LoginInput, LoginSchema } from '@kartex/shared'` — used in zodResolver |
| `apps/frontend/src/pages/RegisterPage.tsx` | `packages/shared/src/schemas/auth.ts` | RegisterSchema import | ✓ WIRED | `import { RegisterInput, RegisterSchema } from '@kartex/shared'` — used in zodResolver |
| `apps/frontend/src/context/AuthContext.tsx` | `apps/frontend/src/lib/api.ts` | api.get('/api/auth/me') on mount | ✓ WIRED | `api.get('/api/auth/me')` in useEffect at line 39 |
| `apps/frontend/src/lib/api.ts` | `/api/auth/refresh` | POST on 401 + retry | ✓ WIRED | `fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })` when 401 and not in SKIP_REFRESH_PATHS |
| `apps/frontend/src/components/AppShell.tsx` | `apps/frontend/src/context/AuthContext.tsx` | useAuth() | ✓ WIRED | `const { user, logout } = useAuth()` — used for username display and logout action |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `AdminPage.tsx > InviteCodesSection` | `codes` | `GET /api/admin/invite-codes` → `admin.get('/invite-codes')` → `prisma.inviteCode.findMany()` | Yes — DB query with `include: { usedBy: { select: { username } } }` | ✓ FLOWING |
| `AdminPage.tsx > UsersSection` | `users` | `GET /api/admin/users` → `admin.get('/users')` → `prisma.user.findMany({ select: ... })` | Yes — DB query, no passwordHash | ✓ FLOWING |
| `AuthContext.tsx` | `user` | `GET /api/auth/me` → `auth.get('/me')` → `prisma.user.findUnique({ select: ... })` | Yes — DB query, returns live user | ✓ FLOWING |
| `LoginPage.tsx` | Login response | `POST /api/auth/login` → `prisma.user.findUnique()` + bcrypt.compare | Yes — real credential check against DB | ✓ FLOWING |

### Behavioral Spot-Checks

Step 7b: Cannot run behavioral spot-checks without a running server and database. Backend requires a live PostgreSQL connection via `DATABASE_URL`. Docker Compose is the intended deployment vehicle — no runnable entry point without the full stack.

| Behavior | Status |
|----------|--------|
| `GET /api/health` returns 200 | ? SKIP — requires running backend |
| `POST /api/auth/login` with wrong creds → 401 | ? SKIP — requires running backend |
| `GET /api/admin/users` without JWT → 401 | ? SKIP — requires running backend |

**Step 7b: SKIPPED** — no runnable entry point without Docker Compose and PostgreSQL. Manual integration tests documented in Human Verification Required section.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INFR-01 | 01-01 | Full app runs with `docker compose up -d` | ✓ SATISFIED | docker-compose.yml + Dockerfile + entrypoint.sh verified |
| INFR-02 | 01-02, 01-03 | Nginx serves SPA (overridden by D-05/D-06) | ✓ SATISFIED (override) | Hono serveStatic + SPA fallback in index.ts; Vite build output in apps/backend/public/ |
| INFR-03 | 01-02 | All endpoints except login/refresh require JWT | ✓ SATISFIED | authMiddleware on /api/*, applied after auth router; /me uses authMiddleware inline |
| INFR-04 | 01-02 | Rate limiting on auth endpoints | ✓ SATISFIED | rateLimitMiddleware(10, 60_000) via auth.use('*') covering all 5 auth routes |
| INFR-05 | 01-02 | CORS restricted to own domain | ✓ SATISFIED | ALLOWED_ORIGIN env var in cors(); no wildcard |
| INFR-06 | 01-01 | All secrets from .env only | ✓ SATISFIED | docker-compose.yml uses ${VAR} syntax; .gitignore excludes .env; no hardcoded values found |
| AUTH-01 | 01-02, 01-03 | Register with username+password via invite code | ✓ SATISFIED | POST /register validates code; RegisterPage wired with RegisterSchema |
| AUTH-02 | 01-02, 01-03 | Log in with username+password, JWT in httpOnly cookie | ✓ SATISFIED | POST /login sets httpOnly access_token + refresh_token cookies; LoginPage wired |
| AUTH-03 | 01-02, 01-03 | Session persists via refresh token (30-day) | ✓ SATISFIED | RefreshToken stored with 30d expiry; AuthContext hydrates from /me; POST /refresh issues new tokens |
| AUTH-04 | 01-02, 01-03 | Logout invalidates session | ✓ SATISFIED | POST /logout deletes RefreshToken record, clears both cookies; AuthContext logout() wired |
| AUTH-05 | 01-02, 01-03 | Access token transparently refreshed | ✓ SATISFIED | api.ts refreshPromise pattern; 401 → POST /refresh → retry; token rotation |
| ADMN-01 | 01-02, 01-03 | Admin can generate invite codes | ✓ SATISFIED | POST /api/admin/invite-codes; AdminPage Generate button wired |
| ADMN-02 | 01-02, 01-03 | Admin can view all users | ✓ SATISFIED | GET /api/admin/users; AdminPage Users table wired with real DB query |
| ADMN-03 | 01-02, 01-03 | Admin can change role / deactivate | ✓ SATISFIED | PATCH /api/admin/users/:id; AdminPage role + deactivate buttons wired |

**All 14 requirements satisfied.** No orphaned requirements.

### Anti-Patterns Found

No blockers or warnings found. Scan performed across `apps/backend/src/`, `apps/frontend/src/`, and `packages/shared/src/`.

- No TODO/FIXME/HACK comments in source files
- No empty route handlers (all return real DB queries or proper error responses)
- No hardcoded secrets found
- `ComingSoon` placeholder components in App.tsx are intentional per-spec (plan must_haves explicitly requires them for Phase 2+ routes)
- `dist/` directory absent from repo — correct: gitignored, built inside Docker multi-stage build
- `apps/backend/public/` present with `index.html` + `assets/` — Vite build output committed (correct for dev access; gitignored per `.gitignore` entry `apps/backend/public` — however the build output is currently present, suggesting it was committed or built locally; this is a warning but not a blocker)

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No blockers found | — | — |

### Human Verification Required

#### 1. Full Stack Startup and SPA Rendering

**Test:** Copy `.env.example` to `.env`, fill in `JWT_SECRET` (32+ chars), `DB_PASSWORD`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`. Run `docker compose up -d`. Navigate to `http://localhost:3000` (or the configured `BACKEND_PORT`).
**Expected:** The React SPA loads. The /login page renders a card with "Sign in" heading and "Welcome back." description. No sidebar is visible. Page title is "Sign in — Kartex".
**Why human:** Visual rendering, Docker build, network reachability — cannot verify programmatically without running the stack.

#### 2. Invite Code Registration Flow

**Test:** Check `docker compose logs backend | grep "invite code"` to obtain the first invite code. Open `/register`. Submit valid username (3-20 alphanumeric+underscore chars), password (8+ chars), and the invite code.
**Expected:** Redirect to `/login`. Toast appears: "Account created. Please sign in." Page title is "Sign in — Kartex". The invite code cannot be reused — a second registration attempt with the same code shows inline error "Invalid or expired invite code." under the invite code field.
**Why human:** Requires live DB state, real invite code, real form submission, toast visibility.

#### 3. Session Persistence After Browser Refresh

**Test:** Log in with admin credentials. Then close and reopen the browser tab (or press F5).
**Expected:** The app lands on `/dashboard` (Coming soon screen with Clock icon) without redirecting to `/login`. The session was hydrated from `GET /api/auth/me` using the existing httpOnly access_token cookie.
**Why human:** Browser cookie persistence and React state hydration require a live browser session.

#### 4. Silent Token Refresh

**Test:** Log in as admin. Using browser DevTools, manually expire the access_token cookie (set its value to an invalid JWT string). Navigate to `/admin` or trigger any API call.
**Expected:** The app silently calls `POST /api/auth/refresh`, gets new cookies, retries the original request, and renders the admin page without showing a login prompt or error.
**Why human:** Cookie manipulation and silent refresh behavior require a live browser + DevTools interaction.

#### 5. Admin Page Functionality

**Test:** Log in as admin. Navigate to `/admin`. Generate an invite code with 14-day expiry. Verify it appears in the table with "Active" status. Register a new user with that code. Verify the code now shows "Used" status in the admin table. Use role toggle to promote the new user to admin, then demote them back. Attempt to deactivate the admin account (own row) — button should be absent.
**Expected:** All operations succeed with toast confirmations. Table updates after each action. Self-deactivation button is absent for the admin's own row.
**Why human:** Requires real DB state mutations, multiple API calls, and table re-rendering with accurate data.

---

## Gaps Summary

No programmatic gaps found. All 14 enumerated requirements are satisfied by verified code. All artifacts are substantive (not stubs), properly wired, and data flows to real DB queries.

The only outstanding items are 5 human verification checks that require running the full Docker Compose stack to confirm visual rendering, real cookie behavior, and end-to-end user flows. These are standard integration tests that cannot be executed without a live environment.

**INFR-02 override:** The ROADMAP defines INFR-02 as "Nginx serves the React SPA." Design decision D-05 (locked, pre-plan) replaced Nginx with Hono's `serveStatic`. Both plans 01-02 and 01-03 carry this as a `decision_overrides` entry. The spirit of the requirement (SPA reachable in browser) is satisfied — the delivery mechanism changed from Nginx to Hono, not the outcome.

---

_Verified: 2026-05-26T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
