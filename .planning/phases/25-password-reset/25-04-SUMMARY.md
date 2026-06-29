---
phase: 25-password-reset
plan: "04"
subsystem: frontend-auth-pages
tags: [frontend, auth, password-reset, routing, react]
dependency_graph:
  requires: [25-01, 25-02]
  provides: [forgot-password-page, reset-password-page, public-routes]
  affects: [App.tsx, auth-routing]
tech_stack:
  added: []
  patterns: [status-state-machine, no-enumeration-submit, ref-confirm-password]
key_files:
  created:
    - apps/frontend/src/pages/ForgotPasswordPage.tsx
    - apps/frontend/src/pages/ResetPasswordPage.tsx
  modified:
    - apps/frontend/src/App.tsx
decisions:
  - "ForgotPasswordPage uses single boolean `submitted` state (no state machine needed — no mount token validation)"
  - "onSubmit always calls setSubmitted(true) unconditionally in both try and catch paths — no-enumeration per D-04/RESET-03"
  - "ResetPasswordPage mirrors InviteRegisterPage status state machine exactly (loading → ok | error)"
  - "confirmPassword excluded from POST body; compared via ref only (same as InviteRegisterPage pattern)"
  - "Both routes placed before ProtectedRoute block in App.tsx — identical to /invite/:token model"
metrics:
  duration: "2 min"
  completed_date: "2026-06-29"
  tasks_completed: 3
  files_created: 2
  files_modified: 1
status: complete
---

# Phase 25 Plan 04: Frontend Pages + Routing Summary

**One-liner:** ForgotPasswordPage (no-enumeration two-state) and ResetPasswordPage (loading/error/form state machine) registered as public routes in App.tsx.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 4.1 | Create ForgotPasswordPage.tsx | a5a0ee8 | apps/frontend/src/pages/ForgotPasswordPage.tsx |
| 4.2 | Create ResetPasswordPage.tsx | 886744e | apps/frontend/src/pages/ResetPasswordPage.tsx |
| 4.3 | Register public routes in App.tsx | f8656b6 | apps/frontend/src/App.tsx |

## Verification

`yarn workspace @kartex/frontend build` — exits 0, 2659 modules transformed, no TypeScript errors.

## Decisions Made

- ForgotPasswordPage uses a single boolean `submitted` state — no complex state machine needed since there is no token to validate on mount. The form renders when `submitted === false`; the success card renders when `submitted === true` (terminal).
- `onSubmit` wraps the API call in try/catch and calls `setSubmitted(true)` unconditionally in both the success path and the catch block — enforces no-enumeration design (D-04, RESET-03).
- ResetPasswordPage mirrors InviteRegisterPage's `status: 'loading' | 'ok' | 'error'` state machine exactly. Mount effect validates the token via `GET /api/auth/reset-password/:token`.
- `confirmPassword` is a client-only controlled input backed by a `useRef` — never included in the POST body (`{ newPassword: values.newPassword }` only). This matches the InviteRegisterPage pattern (T-24-15 equivalent).
- Both new routes placed outside `ProtectedRoute` in App.tsx, immediately after `/invite/:token` — identical structural model.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — both pages are fully wired. The i18n keys are consumed from locale files added in Plan 25-02.

## Threat Flags

None — no new network endpoints introduced. The pages call existing backend endpoints (`/api/auth/forgot-password`, `/api/auth/reset-password/:token`) defined in Plan 25-03.

## Self-Check: PASSED

- [x] `apps/frontend/src/pages/ForgotPasswordPage.tsx` — exists, 127 lines, export confirmed
- [x] `apps/frontend/src/pages/ResetPasswordPage.tsx` — exists, 232 lines, export confirmed
- [x] `apps/frontend/src/App.tsx` — 2 imports + 2 routes added, both outside ProtectedRoute
- [x] Commits a5a0ee8, 886744e, f8656b6 — all present in git log
- [x] Build: `yarn workspace @kartex/frontend build` exits 0
