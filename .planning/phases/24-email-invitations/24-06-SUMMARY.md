---
phase: 24-email-invitations
plan: "06"
subsystem: auth
tags: [hono, middleware, jwt, invite, email]

requires:
  - phase: 24-01
    provides: InviteToken model + migration
  - phase: 24-02
    provides: admin invite-token management routes
  - phase: 24-03
    provides: public invites route handler (invitesPublicRouter)

provides:
  - PUBLIC_API_PREFIXES bypass in authMiddleware — /api/invites/ is reachable without a session
  - apps/backend/src/middleware/__tests__/auth-public-paths.test.ts — middleware reachability test
  - Order-independent auth bypass that supersedes Hono route-registration assumptions

affects:
  - 24-07 (frontend invite page — depends on 200 response from unauthenticated GET /api/invites/:token)
  - Any future public API routes that need to be added to PUBLIC_API_PREFIXES

tech-stack:
  added: []
  patterns:
    - "PUBLIC_API_PREFIXES constant pattern — scoped string-prefix allowlist for authMiddleware bypass"
    - "TDD middleware test using Hono app.request() — no server/listen, no Prisma needed"

key-files:
  created:
    - apps/backend/src/middleware/__tests__/auth-public-paths.test.ts
  modified:
    - apps/backend/src/middleware/auth.ts

key-decisions:
  - "Bypass prefix is exactly '/api/invites/' (trailing slash) so /api/admin/invites stays protected"
  - "PUBLIC_API_PREFIXES bypass is the first statement in authMiddleware — order-independent fix superseding Hono registration-order assumption (UAT Gap 1 / EMAIL-06)"
  - "No new packages — fix uses existing hono and stdlib only (T-24-SC: accept)"

patterns-established:
  - "PUBLIC_API_PREFIXES: extend this array to add future public API paths; bypass is positional-first in authMiddleware"
  - "Middleware tests: build a fresh Hono app per test with app.use + app.get, dispatch via app.request() — no server, no DB mock needed"

requirements-completed: [EMAIL-06]

coverage:
  - id: D1
    description: "PUBLIC_API_PREFIXES bypass in authMiddleware — GET /api/invites/:token reaches handler (200) without an access_token cookie"
    requirement: EMAIL-06
    verification:
      - kind: unit
        ref: "apps/backend/src/middleware/__tests__/auth-public-paths.test.ts#GET /api/invites/:token reaches the handler (200) without an access_token cookie"
        status: pass
    human_judgment: false
  - id: D2
    description: "Protected routes remain protected — GET /api/decks and GET /api/admin/invites return 401 without a cookie"
    requirement: EMAIL-06
    verification:
      - kind: unit
        ref: "apps/backend/src/middleware/__tests__/auth-public-paths.test.ts#GET /api/decks returns 401 without an access_token cookie"
        status: pass
      - kind: unit
        ref: "apps/backend/src/middleware/__tests__/auth-public-paths.test.ts#GET /api/admin/invites returns 401 without an access_token cookie (admin path not bypassed)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Manual UAT verification — incognito window /invite/<token> renders invite card instead of redirecting to /login"
    verification: []
    human_judgment: true
    rationale: "Requires a deployed environment and a valid/invalid invite token; cannot be automated in unit tests"

duration: 8min
completed: 2026-06-28
status: complete
---

# Phase 24 Plan 06: Auth Public-Path Bypass Summary

**authMiddleware gains a PUBLIC_API_PREFIXES bypass so unauthenticated invitees can reach GET /api/invites/:token without a session (EMAIL-06 / UAT Gap 1 fix)**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-28T16:24:00Z
- **Completed:** 2026-06-28T16:32:00Z
- **Tasks:** 2 (TDD: RED test + GREEN implementation)
- **Files modified:** 2

## Accomplishments

- Added `PUBLIC_API_PREFIXES = ['/api/invites/'] as const` constant to `middleware/auth.ts` with the bypass as the first statement in `authMiddleware`
- Created `apps/backend/src/middleware/__tests__/auth-public-paths.test.ts` — 3-case middleware reachability test (invites=200, decks=401, admin/invites=401)
- Full backend test suite remains green (29 passed, 62 todo stubs pre-existing)
- Fix is order-independent — supersedes Hono route-registration ordering assumption that caused UAT Gap 1

## Task Commits

Each task was committed atomically:

1. **Task 1: Failing middleware test for public invite path bypass (RED)** - `86d46b0` (test)
2. **Task 2: Scope authMiddleware to bypass the public /api/invites/ prefix (GREEN)** - `3e31972` (feat)

## Files Created/Modified

- `apps/backend/src/middleware/__tests__/auth-public-paths.test.ts` — created: 3-case Hono middleware test proving invites bypass + protected routes unchanged
- `apps/backend/src/middleware/auth.ts` — modified: added PUBLIC_API_PREFIXES constant and bypass branch (first statement in authMiddleware)

## Decisions Made

- Bypass prefix is exactly `'/api/invites/'` (trailing slash) so `/api/admin/invites` stays protected — confirmed by test case 3
- Bypass is the first statement in authMiddleware — path check runs before getCookie, making it order-independent regardless of Hono route registration order
- No packages added — pure stdlib + existing hono (T-24-SC disposition: accept)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- `yarn typecheck` shows pre-existing errors in `mailer.ts`, `admin.ts`, `routes/auth.ts`, and `routes/invites.ts` (Prisma client not regenerated after Phase 24-01 migration; `nodemailer` types missing from Phase 23-02). None in `middleware/auth.ts`. These errors existed before this plan's changes and are unchanged by Plan 06.

## Threat Surface Scan

No new network endpoints, auth paths, or trust-boundary changes introduced.
The T-24-21 threat (over-broad bypass) is fully mitigated: `/api/admin/invites` returns 401 as proven by test case 3.

## Next Phase Readiness

- Plan 07 (frontend invite page) unblocked: the backend now serves 200 for `GET /api/invites/:token` to unauthenticated visitors
- UAT tests 4-7 (invite flow) are unblocked by this fix

---
*Phase: 24-email-invitations*
*Completed: 2026-06-28*
