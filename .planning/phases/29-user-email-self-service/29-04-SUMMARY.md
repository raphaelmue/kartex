---
phase: 29-user-email-self-service
plan: 04
subsystem: ui
tags: [react-hook-form, zod, shadcn, radix-dialog, i18n, react]

requires:
  - phase: 29-user-email-self-service (Plan 01)
    provides: UpdateEmailSchema/UpdateEmailInput (shared Zod schema), PATCH /api/admin/users/:id email support
  - phase: 29-user-email-self-service (Plan 02)
    provides: admin.* i18n keys (en/de)
  - phase: 29-user-email-self-service (Plan 03)
    provides: RHF+Zod+shadcn Form pattern, EMAIL_TAKEN-to-inline-error mapping precedent
provides:
  - "Edit email" DropdownMenuItem (first item) in each admin user row
  - Single shared Dialog (editEmailTargetId-controlled) with RHF + zodResolver email form
  - onAdminEmailSubmit: PATCH /api/admin/users/:id, EMAIL_TAKEN inline error, success toast + close + fetchUsers() refresh
  - EMAIL-11 RTL test coverage in AdminPage.test.tsx
affects: []

tech-stack:
  added: []
  patterns:
    - "Reset an RHF form synchronously inside the triggering onClick handler (not a useEffect keyed on the target id) when the form lives inside a Dialog that opens on the same interaction — avoids a Radix Dialog auto-focus / RHF re-render race"
    - "onOpenAutoFocus={(e) => e.preventDefault()} on DialogContent when the dialog's first focusable element is an RHF-controlled input"

key-files:
  created: []
  modified:
    - apps/frontend/src/pages/AdminPage.tsx
    - apps/frontend/src/pages/__tests__/AdminPage.test.tsx

key-decisions:
  - "Moved the form-reset-on-open logic from a useEffect(..., [editEmailTargetId]) into the DropdownMenuItem's onClick handler (openEditEmailDialog helper), calling adminEmailForm.reset() before setEditEmailTargetId — eliminates the effect/render race entirely rather than papering over it"
  - "Added onOpenAutoFocus={(e) => e.preventDefault()} to the Edit Email DialogContent — a standard shadcn/react-hook-form mitigation for Radix Dialog's default auto-focus interacting badly with an RHF-controlled first field"

patterns-established:
  - "Admin Edit Email Dialog completes the phase's three-surface pattern (backend contract, Settings self-service, Admin override), reusing the exact RHF+Zod+shadcn Form shape and EMAIL_TAKEN mapping from Plan 03"

requirements-completed: [EMAIL-11]

coverage:
  - id: D1
    description: "'Edit email' is the first DropdownMenuItem in each user row, above 'Send password reset email' and 'Delete user'"
    requirement: EMAIL-11
    verification:
      - kind: unit
        ref: "apps/frontend/src/pages/__tests__/AdminPage.test.tsx#EMAIL-11a: \"Edit email\" is the first menu item, before password reset and delete"
        status: pass
    human_judgment: false
  - id: D2
    description: "Selecting 'Edit email' opens a single shared Dialog pre-filled with that user's current email"
    requirement: EMAIL-11
    verification:
      - kind: unit
        ref: "apps/frontend/src/pages/__tests__/AdminPage.test.tsx#EMAIL-11b: opening the dialog pre-fills the input with the target user's current email"
        status: pass
    human_judgment: false
  - id: D3
    description: "Saving submits PATCH /api/admin/users/:id { email }; success shows a toast, closes the dialog, and refreshes the user list"
    requirement: EMAIL-11
    verification:
      - kind: unit
        ref: "apps/frontend/src/pages/__tests__/AdminPage.test.tsx#EMAIL-11c: submitting a valid new email PATCHes, shows a success toast, refreshes the list, and closes the dialog"
        status: pass
    human_judgment: false
  - id: D4
    description: "A duplicate email shows an inline conflict message and keeps the dialog open; an invalid format is blocked inline before any request is sent"
    requirement: EMAIL-11
    verification:
      - kind: unit
        ref: "apps/frontend/src/pages/__tests__/AdminPage.test.tsx#EMAIL-11d: a 409 EMAIL_TAKEN response shows the inline conflict message and keeps the dialog open"
        status: pass
    human_judgment: false

duration: ~45min active work (interrupted mid-plan by a session-limit; resumed in a follow-up session)
completed: 2026-07-02
status: complete
---

# Phase 29 Plan 04: Admin Edit Email Dialog Summary

**"Edit email" DropdownMenuItem + shared Dialog on AdminPage, completing the phase's admin-override surface for EMAIL-11 — with a Radix Dialog/RHF auto-focus race fixed along the way.**

## Performance

- **Duration:** ~45 min active work, spread across two sessions (an earlier session was cut off by a provider session limit after Task 1 committed but before Task 2's tests were verified)
- **Completed:** 2026-07-02
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added the "Edit email" `DropdownMenuItem` as the first item in each admin user row's dropdown, above "Send password reset email" and the destructive "Delete user"
- Added a single shared `Dialog` (outside the `users.map()` loop, mirroring the existing delete-confirmation `AlertDialog` pattern) controlled by `editEmailTargetId`, containing an `adminEmailForm` (`useForm<UpdateEmailInput>` + `zodResolver(UpdateEmailSchema)`) pre-filled with the target user's current email
- Implemented `onAdminEmailSubmit`: PATCHes `/api/admin/users/:id`, maps a 409 `EMAIL_TAKEN` response to an inline `form.setError('email', ...)` (dialog stays open), and on success shows a toast, closes the dialog, and calls `fetchUsers()` to refresh the list
- Added `AdminPage.test.tsx` EMAIL-11a–d RTL cases (menu item order, dialog pre-fill, valid save with refresh, EMAIL_TAKEN inline conflict) plus a hoisted `mockApiPatch`
- **Found and fixed a genuine render-loop bug** during Task 2 test verification (see Deviations)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add "Edit email" menu item + shared Edit Email Dialog to AdminPage** - `7893e6c` (feat)
2. **Task 2: Add RTL test cases for the Edit Email Dialog to AdminPage.test.tsx** - `bd11cc5` (test) — includes the auto-focus/render-loop fix discovered while running the new tests (Rule 1)

**Plan metadata:** (this commit)

## Files Created/Modified

- `apps/frontend/src/pages/AdminPage.tsx` - "Edit email" DropdownMenuItem, shared Edit Email Dialog, `adminEmailForm`, `onAdminEmailSubmit`; reset-on-open moved into the click handler; `onOpenAutoFocus` prevention added to `DialogContent`
- `apps/frontend/src/pages/__tests__/AdminPage.test.tsx` - hoisted `mockApiPatch`, `adminUserRow`/`regularUserRow` fixtures, EMAIL-11a–d RTL cases

## Decisions Made

- Wrapped `zodResolver(UpdateEmailSchema)` in a custom `Resolver<UpdateEmailInput>` (mirroring Plan 03's `SettingsPage` pattern) so the inline format-error renders the localized `admin.emailInvalid` copy.
- Moved the RHF form reset out of a `useEffect(..., [editEmailTargetId])` and into the `DropdownMenuItem`'s `onClick` (see Deviations) — reset now happens synchronously before the Dialog opens, with no reactive indirection.
- Added `onOpenAutoFocus={(e) => e.preventDefault()}` to the Edit Email `DialogContent` (see Deviations).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Effect-driven form reset raced with Radix Dialog's auto-focus, causing an infinite render loop**
- **Found during:** Task 2 (running the EMAIL-11b/c/d RTL tests written against Task 1's implementation)
- **Issue:** Task 1's original implementation reset `adminEmailForm` via `useEffect(() => { adminEmailForm.reset(...) }, [editEmailTargetId])`, fired after `setEditEmailTargetId` opened the Dialog. Radix `Dialog`'s default `onOpenAutoFocus` behavior tries to focus the first focusable element (the RHF-controlled email `Input`) at the same moment the effect resets the form's field state, creating a focus/re-render race that never settled — any test interaction that opened the dialog (via `fireEvent.click` on the "Edit email" item) hung indefinitely instead of resolving, confirmed via isolated `vitest` runs showing steady memory growth in the worker process with no completion, even under an explicit `--testTimeout`.
- **Fix:** (a) Replaced the `useEffect` with a plain `openEditEmailDialog(targetUser)` helper that calls `adminEmailForm.reset({ email: targetUser.email ?? '' })` synchronously in the `DropdownMenuItem`'s `onClick`, before `setEditEmailTargetId` — removing the reactive indirection entirely. (b) Added `onOpenAutoFocus={(e) => e.preventDefault()}` to `DialogContent`, a standard shadcn/react-hook-form mitigation, as defense in depth against the same class of Radix-auto-focus interaction.
- **Files modified:** `apps/frontend/src/pages/AdminPage.tsx`
- **Verification:** All 4 EMAIL-11 tests pass (previously 3 of 4 hung indefinitely); full `AdminPage` suite (10/10) and full frontend suite (17 files, 152/152) green with no regressions.
- **Committed in:** `bd11cc5` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary — the dialog was unusable in its Task 1 form (any real user click would have hit the same freeze in a browser under the right timing, not just in tests). No scope creep — fix is scoped to this dialog only.

## Issues Encountered

- An earlier execution attempt for this plan was interrupted by a provider session limit immediately after Task 1's commit, leaving Task 2's test file uncommitted mid-write. On resume, the uncommitted test file was inspected, verified complete and correct against the plan's acceptance criteria, and then used as-is once the underlying hang (see Deviations) was root-caused and fixed.
- Diagnosing the hang required isolating it from an unrelated environmental confound: repeatedly spawning/killing `vitest` processes in the same shell session left orphaned worker processes that made some early re-runs flaky. Root cause was confirmed empirically (steady memory growth in a single stuck worker, immune to `--testTimeout`, reproducible only once the "Edit email" item was actually clicked) rather than by inspection alone.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 29's three surfaces (backend contract, Settings self-service, Admin override) are all complete and independently verified.
- The `onOpenAutoFocus` / synchronous-reset pattern documented here should be applied to any future Dialog that wraps an RHF form pre-filled from per-row data, to avoid the same class of bug.

---
*Phase: 29-user-email-self-service*
*Completed: 2026-07-02*

## Self-Check: PASSED

- FOUND: apps/frontend/src/pages/AdminPage.tsx
- FOUND: apps/frontend/src/pages/__tests__/AdminPage.test.tsx
- FOUND: .planning/phases/29-user-email-self-service/29-04-SUMMARY.md
- FOUND commit: 7893e6c (feat)
- FOUND commit: bd11cc5 (test + fix)
