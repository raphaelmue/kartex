---
phase: 29-user-email-self-service
plan: 02
subsystem: ui
tags: [i18n, typescript, react, authcontext, requirements-doc]

# Dependency graph
requires:
  - phase: 29-01
    provides: Backend GET /me and PATCH /me returning email, and admin PATCH /users/:id email support
provides:
  - AuthContext User type carries email so consumers can read the client-side no-email state
  - All settings.* and admin.* email i18n keys in en.json and de.json
  - REQUIREMENTS.md enumerating EMAIL-09/10/11 with the stale deferred note corrected
affects: [29-03-settings-page, 29-04-admin-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Both locale files updated in the same commit for any new i18n key set (prevents de.json key fallback to raw string)"

key-files:
  created: []
  modified:
    - apps/frontend/src/context/AuthContext.tsx
    - apps/frontend/src/locales/en.json
    - apps/frontend/src/locales/de.json
    - .planning/REQUIREMENTS.md

key-decisions:
  - "email: string | null added to AuthContext User interface as a type-only change — no provider logic touched"
  - "REQUIREMENTS.md deferred note narrowed to only the email re-verification sub-flow; self-service + admin email edit are now enumerated as EMAIL-09/10/11 for Phase 29"

patterns-established: []

requirements-completed: [EMAIL-09, EMAIL-10, EMAIL-11]

coverage:
  - id: D1
    description: "AuthContext User type carries email: string | null"
    requirement: "EMAIL-09"
    verification:
      - kind: unit
        ref: "yarn workspace @kartex/frontend typecheck"
        status: pass
    human_judgment: false
  - id: D2
    description: "All settings.* and admin.* email i18n keys exist in both en.json and de.json"
    requirement: "EMAIL-10"
    verification:
      - kind: other
        ref: "node -e key-presence check script (task 2 verify block)"
        status: pass
    human_judgment: false
  - id: D3
    description: "REQUIREMENTS.md enumerates EMAIL-09/10/11 and the stale deferred note is corrected"
    requirement: "EMAIL-11"
    verification:
      - kind: other
        ref: "node -e REQUIREMENTS.md reconciliation check script (task 3 verify block)"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-02
status: complete
---

# Phase 29 Plan 02: AuthContext type, i18n keys, requirements reconciliation Summary

**Client-side User type gains `email: string | null`, all Phase 29 settings/admin i18n copy lands in en.json and de.json in one commit, and REQUIREMENTS.md now enumerates EMAIL-09/10/11 with the stale "admin-only" deferred note corrected.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-02T16:40:00+02:00
- **Completed:** 2026-07-02T16:43:10+02:00
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- `User` interface in `AuthContext.tsx` now carries `email: string | null`, matching the shape `GET /me` returns after Plan 01 — unblocks Plan 03's no-email warning and form default, and Plan 04's `setUser` typechecking
- All 10 `settings.*` and 9 `admin.*` email copy keys from the UI-SPEC Copywriting Contract added to both `en.json` and `de.json` in a single commit, verified present in both locales by a node script
- `.planning/REQUIREMENTS.md` now enumerates EMAIL-09 (self-service email update), EMAIL-10 (no-email warning), EMAIL-11 (admin email edit) as pending requirement rows and Traceability entries; the stale "admin update of user email is sufficient for v1.4" deferred note is corrected to reflect that Phase 29 ships both self-service and admin email edit (only the re-verification sub-flow remains deferred)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add email to the AuthContext User interface** - `c9a2ddc` (feat)
2. **Task 2: Add all Phase 29 i18n keys to en.json and de.json (same commit)** - `65b1245` (feat)
3. **Task 3: Reconcile REQUIREMENTS.md — enumerate EMAIL-09/10/11 and fix the stale deferred note** - `a6ac896` (docs)

**Plan metadata:** (pending — final commit follows this summary)

## Files Created/Modified
- `apps/frontend/src/context/AuthContext.tsx` - Added `email: string | null` to the `User` interface
- `apps/frontend/src/locales/en.json` - Added 10 `settings.*` and 9 `admin.*` email copy keys
- `apps/frontend/src/locales/de.json` - Added matching German translations for the same keys
- `.planning/REQUIREMENTS.md` - Added EMAIL-09/10/11 rows, Traceability entries, corrected deferred note, updated mapped-requirements count (28/28 → 31/31)

## Decisions Made
- Type-only addition to `AuthContext.tsx` — no provider/hydration logic changed, keeping this plan's diff surface minimal and dependency-free for Wave 2
- EMAIL-09/10/11 left unchecked (`[ ]`) in REQUIREMENTS.md since their implementation ships in later plans (03/04), not this plan — matches plan guidance to prefer `[ ]` here
- Narrowed the "Self-service email update" deferred note rather than deleting it outright, preserving the still-valid deferral of the email re-verification sub-flow

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- AuthContext `User.email` and all i18n copy keys are in place for Plan 03 (SettingsPage) and Plan 04 (AdminPage) to consume directly
- REQUIREMENTS.md accurately reflects Phase 29 scope; no further reconciliation needed before phase close
- No blockers identified

---
*Phase: 29-user-email-self-service*
*Completed: 2026-07-02*

## Self-Check: PASSED

- FOUND: apps/frontend/src/context/AuthContext.tsx
- FOUND: apps/frontend/src/locales/en.json
- FOUND: apps/frontend/src/locales/de.json
- FOUND: .planning/REQUIREMENTS.md
- FOUND commit: c9a2ddc
- FOUND commit: 65b1245
- FOUND commit: a6ac896
