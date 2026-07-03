---
phase: 29-user-email-self-service
plan: 05
subsystem: auth
tags: [zod, email-normalization, shared-schema, hono, admin]

requires:
  - phase: 29-user-email-self-service
    provides: UpdateEmailSchema/UpdateMeSchema (self-service email), admin PATCH /users/:id email write (29-01..04)
provides:
  - normalizedEmail() shared Zod helper (trim -> toLowerCase -> email) as single source of truth
  - PasswordResetRequestSchema now normalizes forgot-password input before User lookup
  - POST /api/admin/invites now normalizes email before persisting InviteToken.email
  - PATCH /api/admin/users/:id deduped onto the shared helper (local var renamed to avoid shadowing)
  - REQUIREMENTS.md EMAIL-11 reconciled to Complete
affects: [phase-30-and-beyond-touching-user.email-or-InviteToken.email]

tech-stack:
  added: []
  patterns:
    - "Single Zod factory (normalizedEmail()) as the sole trim/lowercase/validate chain for any User.email or InviteToken.email write/read path — new consumers must import from '@kartex/shared', never inline the chain"

key-files:
  created:
    - packages/shared/src/schemas/email.ts
    - apps/backend/src/routes/__tests__/email-normalization.test.ts
  modified:
    - packages/shared/src/index.ts
    - packages/shared/src/schemas/user.ts
    - packages/shared/src/schemas/auth.ts
    - apps/backend/src/routes/admin.ts
    - apps/backend/src/routes/__tests__/admin-email.test.ts
    - .planning/REQUIREMENTS.md

key-decisions:
  - "normalizedEmail(message?) factory in packages/shared/src/schemas/email.ts is the single source of truth for the trim().toLowerCase().email() chain; all five consuming sites (UpdateEmailSchema, UpdateMeSchema, PasswordResetRequestSchema, admin PATCH /users/:id, admin POST /invites) now import it instead of inlining"
  - "Renamed the PATCH /users/:id local variable from normalizedEmail to emailToUpdate — the plan's action text described keeping a 'normalizedEmail local', but that name now collides with the imported normalizedEmail() function in the same scope (TDZ/shadowing bug); renaming avoids a runtime ReferenceError and a type error (local was a string, not callable)"

patterns-established:
  - "Single Zod factory as normalization source of truth: extract .trim().toLowerCase().email(msg) once per invariant, never inline per-schema"

requirements-completed: [EMAIL-09, EMAIL-10, EMAIL-11]

coverage:
  - id: D1
    description: "normalizedEmail() shared helper extracted; UpdateEmailSchema, UpdateMeSchema, PasswordResetRequestSchema all normalize identically via one source of truth (closes WR-01)"
    requirement: "EMAIL-09"
    verification:
      - kind: unit
        ref: "apps/backend/src/routes/__tests__/email-normalization.test.ts#normalizedEmail() / PasswordResetRequestSchema / UpdateEmailSchema / UpdateMeSchema"
        status: pass
    human_judgment: false
  - id: D2
    description: "PasswordResetRequestSchema normalizes trim+lowercase before the forgot-password User lookup, so mixed-case stored emails match a lowercase-typed input (closes CR-01 forgot-password half)"
    requirement: "EMAIL-10"
    verification:
      - kind: unit
        ref: "apps/backend/src/routes/__tests__/email-normalization.test.ts#PasswordResetRequestSchema — normalization (CR-01)"
        status: pass
    human_judgment: false
  - id: D3
    description: "POST /api/admin/invites validates and normalizes email via normalizedEmail() before persisting InviteToken.email, closing the invite-provisioned EMAIL_TAKEN bypass (CR-01 invite half); PATCH /users/:id deduped onto the same helper"
    requirement: "EMAIL-11"
    verification:
      - kind: unit
        ref: "yarn workspace @kartex/backend typecheck (admin.ts compiles against normalizedEmail import) + apps/backend/src/routes/__tests__/admin-email.test.ts (it.todo stub, real coverage in D1)"
        status: pass
    human_judgment: false
  - id: D4
    description: "REQUIREMENTS.md reconciled — EMAIL-11 reads [x]/Complete in both the checklist and Traceability table, no residual Pending"
    requirement: "EMAIL-11"
    verification:
      - kind: other
        ref: "grep verification: '- [x] **EMAIL-11**' (1 match), '| EMAIL-11 | Phase 29 | Complete |' (1 match), 'EMAIL-11.*Pending' (0 matches)"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-07-03
status: complete
---

# Phase 29 Plan 05: Email Normalization Gap Closure Summary

**Extracted a single shared `normalizedEmail()` Zod helper and routed all five User.email/InviteToken.email validation sites (self-service PATCH /me, admin PATCH /users/:id, admin POST /invites, forgot-password) through it, plus reconciled EMAIL-11 in REQUIREMENTS.md**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-03T07:05:00Z (approx)
- **Completed:** 2026-07-03T07:23:00Z
- **Tasks:** 3
- **Files modified:** 8 (2 created, 6 modified)

## Accomplishments
- New `packages/shared/src/schemas/email.ts` exports `normalizedEmail(message?)` — `z.string().trim().toLowerCase().email(message)` — the single source of truth for email normalization (closes WR-01)
- `PasswordResetRequestSchema` (forgot-password) now normalizes trim+lowercase before validation — previously had zero normalization, meaning a mixed-case stored email would silently never match a lowercase-typed lookup (closes CR-01 forgot-password half)
- `POST /api/admin/invites` now validates via `normalizedEmail()` instead of a bare `z.string().email()` — closes the case-variant bypass of the `EMAIL_TAKEN` unique-index guarantee for invite-provisioned accounts (closes CR-01 invite half)
- `PATCH /api/admin/users/:id` deduped onto the same helper (was already normalizing inline; now delegates)
- Real, executable cross-schema test (`email-normalization.test.ts`) proves `normalizedEmail()`, `PasswordResetRequestSchema`, `UpdateEmailSchema`, and `UpdateMeSchema` all normalize `' Foo@Bar.COM '` → `'foo@bar.com'` identically, plus a malformed-input rejection case
- `REQUIREMENTS.md` EMAIL-11 flipped to `[x]`/"Complete" in both the checklist and Traceability table (closes Gap 2)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract shared normalizedEmail() helper** — `69f8087` (test, RED) + `0065966` (feat, GREEN)
2. **Task 2: Normalize admin.ts email-validation sites** — `9fe1114` (fix)
3. **Task 3: Reconcile REQUIREMENTS.md EMAIL-11** — `f4e1bd3` (docs)

**Plan metadata:** commit pending (this SUMMARY + REQUIREMENTS.md already committed in Task 3; orchestrator handles STATE.md/ROADMAP.md post-merge in worktree mode)

_Note: Task 1 is TDD (tdd="true") — test → feat gate sequence confirmed in git log._

## Files Created/Modified
- `packages/shared/src/schemas/email.ts` - new `normalizedEmail(message?)` factory, single source of truth
- `packages/shared/src/index.ts` - re-exports `./schemas/email`
- `packages/shared/src/schemas/user.ts` - `UpdateEmailSchema`/`UpdateMeSchema` delegate to `normalizedEmail()`
- `packages/shared/src/schemas/auth.ts` - `PasswordResetRequestSchema` delegates to `normalizedEmail()` (previously unnormalized)
- `apps/backend/src/routes/admin.ts` - `POST /invites` and `PATCH /users/:id` both route through `normalizedEmail()`; local var renamed `emailToUpdate` to avoid shadowing
- `apps/backend/src/routes/__tests__/email-normalization.test.ts` - new real test suite (5 assertions)
- `apps/backend/src/routes/__tests__/admin-email.test.ts` - added `it.todo` documenting the invite normalization contract
- `.planning/REQUIREMENTS.md` - EMAIL-11 checklist + Traceability row flipped to Complete

## Decisions Made
- `normalizedEmail(message?)` factory signature chosen (optional message param) to preserve each call site's exact default error string ('Valid email address required.') without needing per-site overrides
- Renamed the PATCH /users/:id local email variable from `normalizedEmail` to `emailToUpdate` — the plan's prose described "the normalizedEmail local" but literally keeping that name would collide with (shadow) the newly imported `normalizedEmail` function in the same scope, causing a TDZ/type error. This is a same-intent rename, not a behavior change.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Renamed shadowing local variable in admin.ts PATCH /users/:id**
- **Found during:** Task 2 (Normalize admin.ts email-validation sites)
- **Issue:** The plan's action text asked to preserve "the `normalizedEmail` local" while also importing a function of the same name (`normalizedEmail`) into the same file/scope. Keeping the local variable name identical to the imported function would shadow the import for the rest of the function body (`let` hoisting/TDZ) and change `normalizedEmail().safeParse(...)` from a function call into calling a string, a compile error.
- **Fix:** Renamed the local `let normalizedEmail: string | undefined` to `let emailToUpdate: string | undefined`, and its one downstream usage (`data.email = normalizedEmail` → `data.email = emailToUpdate`). No behavior change — same validation flow, same whitelist merge into `data`.
- **Files modified:** apps/backend/src/routes/admin.ts
- **Verification:** `yarn workspace @kartex/backend typecheck` passes; `yarn workspace @kartex/backend test run admin-email` passes (5 todo, 0 failures)
- **Committed in:** 9fe1114 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — naming collision)
**Impact on plan:** Necessary correctness fix to make the plan's literal instruction compile; no scope creep, no behavior change.

## Issues Encountered
- `yarn install` was required before any test/build commands would run in this worktree (no `node_modules` state file present) — ran once at the start of Task 1, not part of any task's committed changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- CR-01 (blocker) and WR-01 (warning) from 29-VERIFICATION.md are both closed: every User.email/InviteToken.email write/read path in the codebase now converges on one `normalizedEmail()` helper
- REQUIREMENTS.md is now accurate for all of Phase 29's EMAIL-09/10/11 requirements
- No Prisma migration needed or added — the explicit deferral rationale in 29-05-PLAN.md's objective (2-5 user self-hosted deployment, no automatic `lower(email)` backfill) still applies; any already-diverged case-variant row can be corrected in seconds via the now-normalizing admin PATCH endpoint
- No blockers for Phase 30 or milestone completion

---
*Phase: 29-user-email-self-service*
*Completed: 2026-07-03*

## Self-Check: PASSED

All 9 created/modified files verified present on disk; all 5 task/summary commit hashes (69f8087, 0065966, 9fe1114, f4e1bd3, c8b33d0) verified present in git log.
