---
phase: 25-password-reset
plan: "05"
subsystem: frontend
tags:
  - auth
  - password-reset
  - admin
  - i18n
dependency_graph:
  requires:
    - 25-02
    - 25-03
    - 25-04
  provides:
    - LoginPage forgot-password link (RESET-01)
    - LoginPage post-reset toast (D-01)
    - AdminPage admin-triggered reset action (D-02, D-03)
  affects:
    - apps/frontend/src/pages/LoginPage.tsx
    - apps/frontend/src/pages/AdminPage.tsx
tech_stack:
  added: []
  patterns:
    - location.state navigation pattern for post-action toast (D-01)
    - DropdownMenuSeparator between menu item groups
    - Error-code-mapped toasts (NO_EMAIL, SMTP_NOT_CONFIGURED, SMTP_ERROR)
key_files:
  created: []
  modified:
    - apps/frontend/src/pages/LoginPage.tsx
    - apps/frontend/src/pages/AdminPage.tsx
decisions:
  - Stale /register link removed from LoginPage CardFooter — route no longer exists since Phase 24 (invite-only)
  - handleSendPasswordReset takes only id — backend looks up email via user ID, no email in request body
  - Reset menu item placed first in DropdownMenu, delete item last, separated by DropdownMenuSeparator (D-02)
metrics:
  duration: ~8 min
  completed: "2026-06-29"
  tasks_completed: 2
  files_modified: 2
status: complete
---

# Phase 25 Plan 05: Integration Touches Summary

## One-liner

Wired "Forgot password?" link and post-reset toast into LoginPage, and added admin-triggered reset with NO_EMAIL error handling into AdminPage UsersSection dropdown.

## What Was Built

### Task 5.1 — LoginPage.tsx

- Extended the location-state `useEffect` to handle `passwordReset: true` in addition to `registered: true`. Type cast updated to `{ registered?: boolean; passwordReset?: boolean }`.
- On `passwordReset: true`: calls `toast.success(t('auth.resetSuccess'))` then `navigate('/login', { replace: true, state: {} })` to clear state (D-01 — prevents re-show on back navigation).
- Replaced the `CardFooter` with a `flex flex-col items-start gap-2` layout containing a single `Link` to `/forgot-password` with text `t('auth.forgotPassword')` (RESET-01).
- Removed the stale `/register` link — that route has not existed since Phase 24 (invite-only registration).

### Task 5.2 — AdminPage.tsx

- Added `DropdownMenuSeparator` to the `@/components/ui/dropdown-menu` import (Pitfall 8 prevention — explicit import required).
- Added `handleSendPasswordReset(id: string)` inside `UsersSection`:
  - Calls `POST /api/admin/users/:id/reset-password` (endpoint from Plan 25-03).
  - Success: `toast.success(t('admin.resetSentSuccess'))`.
  - Error codes mapped to localised toasts: `NO_EMAIL` → `t('admin.resetNoEmail')` (RESET-08, D-03); `SMTP_NOT_CONFIGURED` → `t('admin.inviteSMTPMissing')`; `SMTP_ERROR` → `t('admin.inviteSendError')`; fallback → `t('common.somethingWrong')`.
  - Catch: `toast.error(t('common.somethingWrong'))`.
- Extended `DropdownMenuContent` with three children in D-02 order:
  1. Reset email `DropdownMenuItem` (calls `handleSendPasswordReset`)
  2. `DropdownMenuSeparator`
  3. Delete `DropdownMenuItem` (destructive, unchanged)

## Verification

`yarn workspace @kartex/frontend build` exited 0. Both files compiled without TypeScript errors.

All grep acceptance criteria passed:
- `forgot-password` in LoginPage: 1
- `forgotPassword` in LoginPage: 1
- `passwordReset` in LoginPage: 2
- `resetSuccess` in LoginPage: 1
- `DropdownMenuSeparator` in AdminPage: 2 (import + JSX)
- `handleSendPasswordReset` in AdminPage: 2 (definition + call site)
- `resetSentSuccess` in AdminPage: 1
- `resetNoEmail` in AdminPage: 1
- `sendPasswordReset` in AdminPage: 1

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Hash | Message |
|------|------|---------|
| 5.1 | 3187cd3 | feat(25-05): add forgot-password link and post-reset toast to LoginPage |
| 5.2 | 1f57332 | feat(25-05): add admin-triggered password reset to AdminPage UsersSection |

## Self-Check: PASSED

- `apps/frontend/src/pages/LoginPage.tsx` — exists, modified
- `apps/frontend/src/pages/AdminPage.tsx` — exists, modified
- Commit `3187cd3` — verified in git log
- Commit `1f57332` — verified in git log
