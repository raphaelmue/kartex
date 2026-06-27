---
phase: "24"
plan: "04"
subsystem: frontend
tags: [invite, registration, react, react-hook-form, vitest, tdd]
requires: [24-01, 24-02, 24-03]
provides: [InviteRegisterPage, invite-route]
affects: [App.tsx, routing]
tech-stack:
  added: []
  patterns:
    - react-hook-form with zodResolver and FormField
    - useRef for confirmPassword to avoid stale closure in async onSubmit
    - Three-state component (loading/error/form) with inline error cards
    - Disabled email input for spoofing prevention (D-05, T-24-16)
key-files:
  created:
    - apps/frontend/src/pages/InviteRegisterPage.tsx
    - apps/frontend/src/pages/__tests__/InviteRegisterPage.test.tsx
  modified:
    - apps/frontend/src/App.tsx
  deleted:
    - apps/frontend/src/pages/RegisterPage.tsx
decisions:
  - "D-04 enforced: /register route replaced by /invite/:token; RegisterPage.tsx deleted"
  - "D-05 enforced: email field is disabled Input outside RegisterSchema — never sent to API"
  - "confirmPassword implemented via useRef (confirmPasswordRef) to avoid stale closure in async onSubmit"
  - "Three distinct inline error states: ALREADY_USED / EXPIRED / NOT_FOUND (or network error)"
  - "Stale @kartex/shared dist was root cause of zodResolver failures — rebuilt before Task 2 commit"
metrics:
  duration: "~2 sessions (context carried over)"
  completed: "2026-06-27"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 4
status: complete
---

# Phase 24 Plan 04: InviteRegisterPage TDD Implementation Summary

**One-liner:** InviteRegisterPage with token-gated registration, pre-filled email, three error states, and client-only confirmPassword via useRef — replacing /register route entirely.

## Tasks Completed

| Task | Commit | Description |
|------|--------|-------------|
| 1. Failing tests (RED) | d0062fc | Add 10 failing tests covering EMAIL-05 and EMAIL-06 |
| 2. Implementation (GREEN) | b5d902c | InviteRegisterPage, App.tsx route swap, RegisterPage deletion |

## What Was Built

### InviteRegisterPage (`apps/frontend/src/pages/InviteRegisterPage.tsx`)

Three-state component:

**State A — Loading:** Shows `Loader2` spinner inside a Card while the `GET /api/invites/:token` call is in flight.

**State B — Error:** Shows an inline Card with `CardTitle` (auth.inviteErrorTitle), a `<p>` with the error message, and a "Back to sign in" link. Three distinct messages:
- `ALREADY_USED` → `auth.inviteAlreadyUsed`
- `EXPIRED` → `auth.inviteExpired`
- Any other / network error → `auth.inviteInvalid`

**State C — Form:** A registration form with:
- Hidden `<input type="hidden" name="token" value={token} />` (part of RegisterSchema)
- Disabled email input, pre-filled from API response (D-05: not in schema, not in POST body)
- Username — FormField controlled by react-hook-form
- Password — FormField controlled by react-hook-form
- Confirm password — manual FormItem using `useRef` (`confirmPasswordRef`) to avoid stale closure in async `onSubmit`; has no `name` attribute so it never appears in POST body
- Submit button with loading state (`isSubmitting`)

### Route Changes (`apps/frontend/src/App.tsx`)

- Removed: `<Route path="/register" element={<RegisterPage />} />`
- Added: `<Route path="/invite/:token" element={<InviteRegisterPage />} />` (outside ProtectedRoute)
- Removed: `import { RegisterPage }` → replaced with `import { InviteRegisterPage }`

### RegisterPage Deletion

`apps/frontend/src/pages/RegisterPage.tsx` deleted per D-04. No public registration path remains.

## Test Coverage (EMAIL-05 + EMAIL-06)

All 10 tests pass GREEN:

**EMAIL-05 — Valid token:**
1. Renders registration form with email pre-filled ✓
2. Email input is disabled ✓
3. Card title "Create your account" shown ✓
4. POST body contains token, username, password and NOT confirmPassword ✓
5. Navigates to /login with registered:true on success ✓

**EMAIL-06 — Error states:**
6. ALREADY_USED → "This invite has already been used." ✓
7. EXPIRED → "This invite link has expired..." ✓
8. NOT_FOUND → "This invite link is not valid." ✓
9. Network error → "This invite link is not valid." ✓
10. Each error state renders inline — no form inputs present ✓

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stale @kartex/shared compiled dist caused zodResolver to fail**
- **Found during:** Task 2 implementation / test debugging
- **Issue:** `packages/shared/dist/schemas/auth.js` still had `inviteCode` field (old schema) while source had been updated to `token` in Plan 24-01. Vitest imports the compiled `dist/index.js` (specified in package.json `"main"`), not the TypeScript source. This caused zodResolver to fail with `{"inviteCode":{"message":"Required","type":"invalid_type"}}` — the form's onSubmit callback was never reached, making two tests fail.
- **Fix:** Ran `yarn workspace @kartex/shared build` to regenerate `dist/` from updated source. The `dist/` directory is gitignored so this is a local dev environment issue.
- **Files modified:** `packages/shared/dist/` (gitignored, not committed)
- **Commits:** b5d902c (Task 2 commit after fix)

**2. [Rule 2 - Duplicate text] Removed redundant sr-only h1 from form state**
- **Found during:** Task 1 test writing
- **Issue:** Initial component draft had both `<h1 className="sr-only">Create your account</h1>` and `<CardTitle>Create your account</CardTitle>`, causing `screen.getByText()` to fail with "Found multiple elements with same text".
- **Fix:** Removed the sr-only h1; CardTitle provides the accessible heading.
- **Files modified:** `apps/frontend/src/pages/InviteRegisterPage.tsx`

## Known Stubs

None. All data is wired: API call fetches email, form posts to `/api/auth/register`, navigation works on success.

## Self-Check: PASSED

Files created/modified:
- `apps/frontend/src/pages/InviteRegisterPage.tsx` — FOUND ✓
- `apps/frontend/src/pages/__tests__/InviteRegisterPage.test.tsx` — FOUND ✓
- `apps/frontend/src/App.tsx` — FOUND (modified) ✓
- `apps/frontend/src/pages/RegisterPage.tsx` — DELETED ✓ (intentional per D-04)

Commits:
- d0062fc — FOUND ✓
- b5d902c — FOUND ✓

Tests: 133 passed, 0 failed (16 test files) ✓
Typecheck: clean ✓
