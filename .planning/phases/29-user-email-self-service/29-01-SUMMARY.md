---
phase: 29-user-email-self-service
plan: 01
subsystem: api
tags: [zod, prisma, hono, auth, admin, email-validation]

# Dependency graph
requires:
  - phase: 23-auth-foundation
    provides: User.email column (nullable, unique), authMiddleware, requireAdmin route-group gate
  - phase: 25-password-reset
    provides: prisma.user.findUnique-by-email precedent, PasswordResetRequestSchema pattern this phase's schemas mirror
provides:
  - UpdateEmailSchema / UpdateEmailInput (packages/shared)
  - UpdateMeSchema / UpdateMeInput (packages/shared)
  - GET /api/auth/me returns email (null-safe)
  - PATCH /api/auth/me accepts { email } and/or { studyMode }, normalizes email, 409 EMAIL_TAKEN on conflict
  - PATCH /api/admin/users/:id accepts a validated { email }, shares the EMAIL_TAKEN contract
affects: [29-02, 29-03, 29-04, frontend Settings page, frontend Admin page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zod email normalization chain: .trim().toLowerCase().email(msg) — transform before validate"
    - "Prisma P2002 catch → { error: 'EMAIL_TAKEN' } 409, no pre-check, no transaction (unique index is the race-safe gate)"
    - "Optional-field-merge idiom for partial PATCH bodies (assign into data object only when field !== undefined)"

key-files:
  created:
    - apps/backend/src/routes/__tests__/auth-me.test.ts
    - apps/backend/src/routes/__tests__/admin-email.test.ts
  modified:
    - packages/shared/src/schemas/user.ts
    - apps/backend/src/routes/auth.ts
    - apps/backend/src/routes/admin.ts

key-decisions:
  - "Removed now-unused UpdateStudyModeSchema import from auth.ts (lint no-unused-vars error) after PATCH /me switched to UpdateMeSchema — the export itself is kept in packages/shared for other consumers"
  - "admin.ts PATCH /users/:id validates email explicitly via a Zod one-liner (z.string().trim().toLowerCase().email()) rather than extending the existing hand-cast style, preserving mass-assignment whitelist discipline (T-29-01)"

patterns-established:
  - "Shared EMAIL_TAKEN 409 contract across both self-service (/me) and admin (/users/:id) email write paths"

requirements-completed: [EMAIL-09, EMAIL-10, EMAIL-11]

coverage:
  - id: D1
    description: "GET /api/auth/me returns the email field (null for users without one)"
    requirement: EMAIL-09
    verification:
      - kind: unit
        ref: "apps/backend/src/routes/__tests__/auth-me.test.ts (it.todo route stubs — real assertion deferred; select-clause change verified by typecheck + code read)"
        status: unknown
    human_judgment: true
    rationale: "Route-level GET /me behavior is only stubbed (it.todo) per this codebase's established integration-test convention (no Prisma mocking in this phase) — needs a manual or later-wave check that the live endpoint returns email null-safe."
  - id: D2
    description: "PATCH /api/auth/me accepts { email } independently of { studyMode }, normalizes via trim+lowercase, and returns 409 EMAIL_TAKEN on duplicate"
    requirement: EMAIL-10
    verification:
      - kind: unit
        ref: "apps/backend/src/routes/__tests__/auth-me.test.ts > UpdateEmailSchema / UpdateMeSchema — normalization (EMAIL-09)"
        status: pass
    human_judgment: true
    rationale: "Normalization is unit-tested and passing; the P2002→409 route behavior and independent-field-merge behavior are it.todo stubs (no Prisma mock in this phase) — needs UAT once the frontend consumes this endpoint."
  - id: D3
    description: "PATCH /api/admin/users/:id accepts a validated, normalized { email } and shares the EMAIL_TAKEN conflict contract"
    requirement: EMAIL-11
    verification:
      - kind: unit
        ref: "apps/backend/src/routes/__tests__/admin-email.test.ts (it.todo stubs)"
        status: unknown
    human_judgment: true
    rationale: "Route behavior is stub-only per convention; validated by code read + typecheck, not an executable Prisma-mocked test."

duration: 15min
completed: 2026-07-02
status: complete
---

# Phase 29 Plan 01: User Email Self-Service — Backend API Summary

**Shared Zod email-normalization schemas plus the three backend route changes (GET/PATCH /me, PATCH /admin/users/:id) that make email readable, writable, and conflict-safe via a shared EMAIL_TAKEN 409 contract.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-02T16:24:00Z (approx)
- **Completed:** 2026-07-02T16:33:09Z
- **Tasks:** 3
- **Files modified:** 3 (packages/shared/src/schemas/user.ts, apps/backend/src/routes/auth.ts, apps/backend/src/routes/admin.ts) + 2 new test files

## Accomplishments

- Added `UpdateEmailSchema`/`UpdateEmailInput` and `UpdateMeSchema`/`UpdateMeInput` to `packages/shared`, both using the `.trim().toLowerCase().email(msg)` normalization chain (transform-before-validate ordering), while keeping `UpdateStudyModeSchema` exported unchanged
- `GET /api/auth/me` now selects and returns `email` (null-safe) alongside existing fields
- `PATCH /api/auth/me` parses `UpdateMeSchema`, merges `studyMode`/`email` independently via the optional-field-merge idiom, and catches Prisma `P2002` to return `409 { error: 'EMAIL_TAKEN' }`
- `PATCH /api/admin/users/:id` validates `body.email` with an explicit Zod one-liner (not a raw cast), whitelists it into the Prisma `data` object alongside `role`/`isActive`, and shares the same `EMAIL_TAKEN` 409 contract
- Rebuilt `packages/shared/dist` so backend/frontend runtime consumers see the new schemas

## Task Commits

Each task was committed atomically:

1. **Task 1: Add UpdateEmailSchema + UpdateMeSchema to shared package and rebuild** - `52bcf68` (feat)
2. **Task 2: Extend GET /me and PATCH /me in auth.ts (email read + write + P2002)** - `ab7b8ab` (feat)
3. **Task 3: Extend PATCH /users/:id in admin.ts (validated email branch + P2002)** - `4c540e5` (feat)

**Plan metadata:** (pending — final docs commit follows this summary)

## Files Created/Modified

- `packages/shared/src/schemas/user.ts` - Added `UpdateEmailSchema`/`UpdateEmailInput`, `UpdateMeSchema`/`UpdateMeInput`
- `apps/backend/src/routes/auth.ts` - `GET /me` select includes `email`; `PATCH /me` uses `UpdateMeSchema` + P2002 catch → `EMAIL_TAKEN`
- `apps/backend/src/routes/admin.ts` - `PATCH /users/:id` validates + whitelists `email`; P2002 catch → `EMAIL_TAKEN`
- `apps/backend/src/routes/__tests__/auth-me.test.ts` - New: real normalization tests + `it.todo` route stubs
- `apps/backend/src/routes/__tests__/admin-email.test.ts` - New: `it.todo` route stubs

## Decisions Made

- Dropped the now-unused `UpdateStudyModeSchema` import from `auth.ts` after switching `PATCH /me` to `UpdateMeSchema` — `@typescript-eslint/no-unused-vars` is configured as an error, not a warning, in this repo, so keeping the dead import would have broken lint. The export itself remains available in `packages/shared` per the plan's instruction not to remove it.
- Followed the established `it.todo` structural-stub convention (matching `admin-delete.test.ts`/`admin-mailer.test.ts`) for all route-level behaviors that would require Prisma mocking — only the schema normalization logic got a real, executable test.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed unused `UpdateStudyModeSchema` import from auth.ts**
- **Found during:** Task 2 (Extend GET /me and PATCH /me in auth.ts)
- **Issue:** The plan's action text said to keep `UpdateStudyModeSchema` imported "in case it's referenced elsewhere," but after switching `PATCH /me`'s parse call to `UpdateMeSchema`, the import became genuinely unused in this file. `yarn eslint apps/backend/src/routes/auth.ts` failed with `'UpdateStudyModeSchema' is defined but never used` (`@typescript-eslint/no-unused-vars` is an error in this repo's config, not a warning).
- **Fix:** Removed `UpdateStudyModeSchema` from the import line in `auth.ts`. The schema export itself is untouched in `packages/shared/src/schemas/user.ts`.
- **Files modified:** `apps/backend/src/routes/auth.ts`
- **Verification:** `yarn eslint apps/backend/src/routes/auth.ts` passes clean; `yarn workspace @kartex/backend typecheck` passes; full backend test suite green (50 passed, 71 todo).
- **Committed in:** `ab7b8ab` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — lint error)
**Impact on plan:** Necessary correction to satisfy the repo's lint gate (CLAUDE.md: "ALWAYS run tests after making code changes"). No scope creep — no behavior change beyond removing a dead import.

## Issues Encountered

None beyond the deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Shared schemas (`UpdateEmailSchema`, `UpdateMeSchema`) and rebuilt `dist` are ready for Wave 2 frontend plans (Settings page email form, Admin page edit-email dialog, AuthContext `User.email` field) to import from `@kartex/shared`.
- Both write paths (`PATCH /me`, `PATCH /users/:id`) share the identical `EMAIL_TAKEN` 409 / format-400 contract, so frontend error-mapping logic can be written once and reused.
- No blockers. Full backend test suite passes (50 passed, 71 todo across 15 files); `yarn workspace @kartex/shared build && typecheck` and `yarn workspace @kartex/backend typecheck` both clean.

## Known Stubs

- `apps/backend/src/routes/__tests__/auth-me.test.ts` — 5 `it.todo` stubs for `GET /me` and `PATCH /me` route-level behaviors (null-safe email, independent field write, 409 conflict, 400 invalid format). These are intentional per this codebase's established convention (route-behavior tests require Prisma mocking, out of scope for this phase — see RESEARCH.md §Validation Architecture). The route logic was verified by code read + typecheck + the passing schema-normalization unit tests, not by an executable Prisma-mocked integration test.
- `apps/backend/src/routes/__tests__/admin-email.test.ts` — 4 `it.todo` stubs for the same reason, covering `PATCH /users/:id` email validation, conflict, and access-control note.

---
*Phase: 29-user-email-self-service*
*Completed: 2026-07-02*

## Self-Check: PASSED

All created/modified files confirmed present on disk; all 3 task commits (52bcf68, ab7b8ab, 4c540e5) confirmed in git log.
