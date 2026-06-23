---
phase: 23-auth-foundation
plan: "04"
subsystem: frontend-admin-ui
tags: [admin, i18n, delete-dialog, email-column, mailer, shadcn, react, typescript]
status: complete

dependency_graph:
  requires:
    - 23-01 (User.email column — provides the email field returned by GET /api/admin/users)
    - 23-02 (POST /api/admin/mailer/test endpoint — MailerSection button target)
    - 23-03 (DELETE /api/admin/users/:id with SELF_DELETE/LAST_ADMIN guards — delete dialog target)
  provides:
    - 16 admin i18n keys in both en.json and de.json (deleteUser, emailColumn, mailerTitle, etc.)
    - Email column (ADMIN-05) in UsersSection table
    - Two-step username-confirmed delete dialog (ADMIN-01/02/03/04) via DropdownMenu + AlertDialog
    - MailerSection Card with Send test email button (EMAIL-02)
    - handleDeleteUser with SELF_DELETE/LAST_ADMIN error mapping
    - MailerSection rendered above InviteCodesSection
  affects:
    - apps/frontend/src/pages/AdminPage.tsx
    - apps/frontend/src/locales/en.json
    - apps/frontend/src/locales/de.json

tech_stack:
  added: []
  patterns:
    - "DropdownMenu + single AlertDialog outside map loop (deleteTargetId state) — mirrors Phase 17 DeckDetailPage pattern"
    - "usernameInput reset on onOpenChange close (Pitfall 5 prevention)"
    - "Button (not AlertDialogAction) for confirm to prevent auto-close before async handler"
    - "e.stopPropagation() on DropdownMenuTrigger onPointerDown + onClick (UI-SPEC note 6)"
    - "Atomic i18n commit: both locale files in same commit (Pitfall 6 prevention)"

key_files:
  created: []
  modified:
    - apps/frontend/src/locales/en.json
    - apps/frontend/src/locales/de.json
    - apps/frontend/src/pages/AdminPage.tsx

key_decisions:
  - "colSpan updated 5→6 for empty-state row after adding Email column"
  - "AlertDialog outside users.map() — single shared instance (mirrors Phase 17 pattern)"
  - "usernameInput reset both in onOpenChange and on successful delete (double-reset safety)"
  - "MailerSection uses common.loading as button loading label (consistent with existing pattern)"
  - "MailerSection rendered first in AdminPage body (infrastructure-first per UI-SPEC Phase-Specific Note 4)"

requirements-completed:
  - ADMIN-01
  - ADMIN-02
  - ADMIN-03
  - ADMIN-04
  - ADMIN-05
  - EMAIL-02

duration: ~5min
completed: 2026-06-23
---

# Phase 23 Plan 04: Admin UI — Email Column, Delete Dialog, Mailer Summary

**Email column (ADMIN-05), two-step username-confirmed delete dialog (ADMIN-01/02/03/04), and MailerSection test-email button (EMAIL-02) wired to backend endpoints with SELF_DELETE/LAST_ADMIN guard toasts; all 16 strings localized atomically in en.json + de.json.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-23T21:26:22Z
- **Completed:** 2026-06-23T21:31:00Z
- **Tasks:** 3 of 4 auto-completed (Task 4 is human-verify checkpoint — STOPPED)
- **Files modified:** 3

## Accomplishments

- Added all 16 new admin i18n keys to both en.json and de.json in a single atomic commit (Pitfall 6 prevention)
- Extended UsersSection with Email column (displays email or em-dash for null) and a 3-dot DropdownMenu per row opening a username-confirmed AlertDialog delete flow
- Added MailerSection Card with "Send test email" button, loading state, and NO_EMAIL/success toast mapping; rendered above InviteCodesSection per UI-SPEC ordering

## Task Commits

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add 16 admin i18n keys to both locale files | 14c7f80 | en.json, de.json |
| 2 | Add email column + 3-dot delete dialog to UsersSection | 9d63ca3 | AdminPage.tsx |
| 3 | Add MailerSection with Send test email button | 7740548 | AdminPage.tsx |
| 4 | Human-verify checkpoint | — (awaiting) | — |

## Files Created/Modified

- `apps/frontend/src/locales/en.json` — 16 new admin.* keys added (deleteUser*, emailColumn, testEmail*, mailer*, userActionsLabel)
- `apps/frontend/src/locales/de.json` — German translations for all 16 new keys added atomically
- `apps/frontend/src/pages/AdminPage.tsx` — UserRecord.email field; AlertDialog/DropdownMenu/MoreVertical imports; deleteTargetId + usernameInput state; Email column; handleDeleteUser with guard toast mapping; MailerSection function; MailerSection rendered first in AdminPage

## Decisions Made

- `colSpan` updated 5→6 after adding the Email column (empty-state row must span all columns)
- Single `AlertDialog` outside `users.map()` controlled by `deleteTargetId` — mirrors Phase 17 DeckDetailPage pattern; prevents N dialog instances in DOM
- Used `Button` (not `AlertDialogAction`) for the confirm button — AlertDialogAction auto-closes before the async handler completes
- `usernameInput` reset in both `onOpenChange(false)` and on successful delete — double-reset ensures clean state on ESC / outside-click and on confirmation
- `MailerSection` uses `t('common.loading')` as the loading label — consistent with existing loading label patterns project-wide
- `MailerSection` rendered first in AdminPage body (infrastructure-first ordering per UI-SPEC Phase-Specific Note 4)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None — all UI elements are wired to backend endpoints implemented in Plans 02 and 03.

## Threat Flags

None beyond the plan's threat model:
- T-23-08 (client-side delete confirmation): Username-gate is UX only; authoritative guards (SELF_DELETE/LAST_ADMIN) live server-side in Plan 03
- T-23-09 (wrong-user delete): Single AlertDialog keyed on deleteTargetId + exact-username match prevents accidental wrong-row deletion; usernameInput reset on close (Pitfall 5)

## Next Phase Readiness

- Phase 23 UI is complete pending human verification (Task 4 checkpoint)
- After human-verify approval, Phase 23 (auth-foundation) can be closed
- Phase 24 and 25 (password reset flow, user profile email editing) can proceed

---
*Phase: 23-auth-foundation*
*Completed: 2026-06-23*

## Self-Check: PASSED

- `apps/frontend/src/locales/en.json` — FOUND (contains deleteUser, emailColumn, mailerTitle, userActionsLabel)
- `apps/frontend/src/locales/de.json` — FOUND (contains Benutzer löschen, E-Mail, E-Mail / SMTP, Benutzeraktionen)
- `apps/frontend/src/pages/AdminPage.tsx` — FOUND (contains deleteTargetId, handleDeleteUser, MailerSection, emailColumn, NO_EMAIL)
- Commits 14c7f80, 9d63ca3, 7740548 — all present in git log
