---
phase: 29-user-email-self-service
plan: 06
subsystem: auth
tags: [hono, prisma, zod, jwt, react, testing]

# Dependency graph
requires:
  - phase: 29-user-email-self-service
    provides: User.email column, GET/PATCH /api/auth/me email support (plans 01-05)
provides:
  - POST /api/auth/login response includes email
  - POST /api/auth/refresh response includes email
  - AuthContext User type single-sourced from @kartex/shared UserResponse
  - Real route-level regression test for login/refresh email shape
affects: [auth, settings-page, admin-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AuthContext.User type derived via Omit<UserResponse, 'createdAt'> & { createdAt: string } instead of a hand-rolled duplicate interface"

key-files:
  created:
    - apps/backend/src/routes/__tests__/auth-login.test.ts
  modified:
    - apps/backend/src/routes/auth.ts
    - apps/frontend/src/context/AuthContext.tsx

key-decisions:
  - "AuthContext's User type is now Omit<UserResponse, 'createdAt'> & { createdAt: string } — single-sourced from shared's Zod schema, only overriding createdAt because the wire format is a JSON string, not a Date"
  - "Verified the new test is a genuine regression guard (not a tautology) by temporarily removing email from the login response, re-running the test, confirming failure, then restoring the fix"

patterns-established:
  - "Omit<X, 'field'> & { field: OverrideType } is the pattern for single-sourcing a frontend type from a shared Zod-derived type when one field's wire representation differs from its schema type (Date -> string)"

requirements-completed: [EMAIL-09, EMAIL-10]

coverage:
  - id: D1
    description: "POST /api/auth/login and POST /api/auth/refresh response bodies include the email field, matching GET /api/auth/me's shape"
    requirement: "EMAIL-09"
    verification:
      - kind: unit
        ref: "apps/backend/src/routes/__tests__/auth-login.test.ts#POST /api/auth/login — response includes email (29-06 regression guard) > returns 200 with an email key equal to the mocked user's email"
        status: pass
      - kind: unit
        ref: "apps/backend/src/routes/__tests__/auth-login.test.ts#POST /api/auth/refresh — response includes email (29-06 regression guard) > returns 200 with an email key in the response body"
        status: pass
    human_judgment: false
  - id: D2
    description: "AuthContext's User type is single-sourced from @kartex/shared's UserResponse, not a hand-rolled duplicate interface"
    requirement: "EMAIL-10"
    verification:
      - kind: unit
        ref: "yarn workspace @kartex/frontend typecheck (0 errors) + eslint apps/frontend/src/context/AuthContext.tsx (0 errors)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A user with an email on file sees the correct Settings state (no false 'no email' warning, correct pre-filled input) immediately after login without a full page reload"
    verification: []
    human_judgment: true
    rationale: "This is a client-side rendering/UX behavior across LoginPage -> AuthContext -> SettingsPage that depends on the browser DOM state after a real login; no automated test exercises this full flow in this plan. Manual reasoning check in the plan's <verification> section confirms the data path is now correct (email is present in the login response and AuthContext no longer strips it), but a human should confirm visually per the plan's stated truth."

# Metrics
duration: ~12min
completed: 2026-07-03
status: complete
---

# Phase 29 Plan 06: Login/Refresh Email Field Gap Closure Summary

**Added the missing `email` field to POST /login and POST /refresh responses, single-sourced AuthContext's User type from shared's UserResponse schema, and added a real regression-guard test for the response shape.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-07-03T08:16:03Z
- **Tasks:** 3
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- `POST /api/auth/login` and `POST /api/auth/refresh` now return `email` alongside id/username/role/isActive/studyMode/createdAt, matching `GET /api/auth/me`'s shape exactly
- `AuthContext`'s `User` type is no longer a hand-rolled duplicate — it's derived as `Omit<UserResponse, 'createdAt'> & { createdAt: string }` from `@kartex/shared`, so future backend response-shape changes can no longer silently drift from the frontend type without a compile error
- A new real (non-todo) route-integration test file, `auth-login.test.ts`, mounts the actual `authRouter` via Hono with mocked Prisma/bcryptjs/jwt and asserts both login and refresh responses include `email` — manually verified this test fails if the fix is reverted

## Task Commits

Each task was committed atomically:

1. **Task 1: Add email to login and refresh response bodies** - `f283359` (feat)
2. **Task 2: Single-source AuthContext User type from shared UserResponse** - `ce6f2c4` (refactor)
3. **Task 3: Real route-level test asserting login/refresh return email** - `51b6bca` (test)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP update)

## Files Created/Modified
- `apps/backend/src/routes/auth.ts` - Added `email: user.email` to the POST /login and POST /refresh `c.json(...)` response literals
- `apps/frontend/src/context/AuthContext.tsx` - Replaced hand-rolled `User` interface with `export type User = Omit<UserResponse, 'createdAt'> & { createdAt: string }`, imported from `@kartex/shared`
- `apps/backend/src/routes/__tests__/auth-login.test.ts` (new) - Real route-integration tests for login/refresh email field, following the `study-canedit.test.ts` Hono-mount pattern

## Decisions Made
- Only `createdAt` is overridden in the derived `User` type (Date -> string) — every other field, including `email`, comes straight from `UserResponse` so the shape can't silently diverge from the backend contract again
- Verified the new test's regression-guard property empirically: temporarily removed `email` from the login response, confirmed the login test failed with `expected undefined to be 'user@example.com'`, then restored the fix (confirmed via `git diff` showing no residual change) before committing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. `prisma.refreshToken.deleteMany` had to be added to the test's Prisma mock (the POST /refresh handler calls it inside `$transaction`) — this was implied by reading `auth.ts` per the plan's `<read_first>` instructions and is not a deviation, just a mock-completeness detail needed to make the described test pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Truth 6 from `29-VERIFICATION.md` is now satisfiable: a user with an email set will see correct Settings state immediately after login (email present in login/refresh response, AuthContext type no longer silently drops it)
- Phase 29 gap-closure plans (29-05, 29-06) both complete; recommend re-running phase verification to confirm no further gaps before closing the phase
- No blockers for subsequent phases

---
*Phase: 29-user-email-self-service*
*Completed: 2026-07-03*

## Self-Check: PASSED

- FOUND: apps/backend/src/routes/__tests__/auth-login.test.ts
- FOUND: .planning/phases/29-user-email-self-service/29-06-SUMMARY.md
- FOUND: f283359 (Task 1 commit)
- FOUND: ce6f2c4 (Task 2 commit)
- FOUND: 51b6bca (Task 3 commit)
- FOUND: db01605 (SUMMARY commit)
