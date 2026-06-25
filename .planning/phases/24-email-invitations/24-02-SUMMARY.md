---
phase: "24"
plan: "02"
subsystem: frontend-i18n
status: complete
tags: [i18n, locales, invite, email-invitations]
dependency_graph:
  requires: [24-01]
  provides: [auth-invite-keys, admin-invite-keys]
  affects: [24-04-PLAN, 24-05-PLAN]
tech_stack:
  added: []
  patterns: [i18n-parity-commit, json-locale-editing]
key_files:
  created: []
  modified:
    - apps/frontend/src/locales/en.json
    - apps/frontend/src/locales/de.json
decisions:
  - "24-02: Both locale files updated atomically per task (one commit per locale pair) — consistent with 10-05 pattern"
  - "24-02: auth.email key added as 'Email' / 'E-Mail' — distinct from auth.username; required by InviteRegisterPage email field label"
  - "24-02: auth.createYourAccount added as new key ('Create your account') to differentiate from existing auth.createAccount ('Create account') — different UI context (card title vs button)"
metrics:
  duration: 98s
  completed_date: "2026-06-25"
  tasks_completed: 2
  files_modified: 2
---

# Phase 24 Plan 02: Invite i18n Keys Summary

23 new invitation i18n keys added to both en.json and de.json in full parity — 11 auth keys for InviteRegisterPage and 12 admin keys for InviteTokensSection.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add auth.* invite keys to en.json and de.json | 0b84350 | apps/frontend/src/locales/en.json, apps/frontend/src/locales/de.json |
| 2 | Add admin.* invite keys to en.json and de.json | a4c273e | apps/frontend/src/locales/en.json, apps/frontend/src/locales/de.json |

## What Was Built

**Task 1 — auth.* keys (11 new):**
- `auth.invitePageTitle` — document title for invite registration page
- `auth.createYourAccount` — card title in form state
- `auth.inviteWelcome` — card description orienting the invited user
- `auth.email` — email field label (disabled, pre-filled from API)
- `auth.confirmPassword` — confirm password field label
- `auth.inviteErrorTitle` — error card title ("Unable to register")
- `auth.inviteAlreadyUsed` — D-10 error: token already consumed
- `auth.inviteExpired` — D-10 error: token past expiry date
- `auth.inviteInvalid` — D-10 error: token not found
- `auth.passwordMismatch` — client-side validation message
- `auth.backToSignIn` — error state back-link text

**Task 2 — admin.* keys (12 new):**
- `admin.inviteTokensTitle` — section card title
- `admin.inviteTokensDesc` — section card description
- `admin.inviteEmailPlaceholder` — email input placeholder
- `admin.sendInviteButton` — send invite button label
- `admin.inviteColEmail` / `inviteColSent` / `inviteColExpires` — table column headers
- `admin.revokeInviteAriaLabel` — aria-label with `{{email}}` interpolation (D-07)
- `admin.pendingInvitesEmpty` — empty state message
- `admin.inviteSentSuccess` — success toast with `{{email}}` interpolation (D-06)
- `admin.inviteSMTPMissing` — SMTP not configured error toast
- `admin.inviteRevokeSuccess` — revoke success toast

## Verification

```
auth keys OK  (11 keys verified in both locales)
admin keys OK (12 keys verified in both locales, {{email}} interpolation confirmed)
15 test files, 123 tests — all passing (no regressions from JSON edits)
```

## Deviations from Plan

None — plan executed exactly as written. All 23 keys added with word-for-word English values from UI-SPEC Copywriting Contract and idiomatic German equivalents.

## Known Stubs

None — this plan adds only string values to locale files. No UI components or data sources involved.

## Threat Flags

None — static locale JSON edits with no runtime trust boundary crossed (T-24-04: error message copy is intentionally generic; T-24-SC: no packages installed).

## Self-Check: PASSED

- [x] apps/frontend/src/locales/en.json modified with 23 new keys
- [x] apps/frontend/src/locales/de.json modified with 23 new keys
- [x] Commit 0b84350 exists (auth keys)
- [x] Commit a4c273e exists (admin keys)
- [x] Parity verified: both node scripts exit 0
- [x] 123 tests pass — no regressions
