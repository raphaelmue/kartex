---
phase: 29-user-email-self-service
verified: 2026-07-04T00:00:00Z
status: passed
score: 6/6 truths verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: "5/6 truths verified"
  gaps_closed:
    - "Truth 6 (login/refresh email regression): POST /api/auth/login and POST /api/auth/refresh response bodies now include `email: user.email`, matching GET /api/auth/me's shape (apps/backend/src/routes/auth.ts:144, :228). AuthContext's User type is now single-sourced from @kartex/shared's UserResponse (Omit<UserResponse, 'createdAt'> & { createdAt: string }) instead of a hand-rolled interface, so the response shape can no longer silently drift from the frontend type. A real (non-todo) route-level regression test (apps/backend/src/routes/__tests__/auth-login.test.ts) asserts both responses include `email`; ran directly — 2/2 pass."
  gaps_remaining: []
  regressions: []
deferred: []
---

# Phase 29: User Email Self-Service Verification Report

**Phase Goal:** Users can add or update their email address from Settings, and see a warning when no email is set (since password reset requires one)
**Verified:** 2026-07-04T00:00:00Z
**Status:** passed
**Re-verification:** Yes — after gap-closure plan 29-06 (login/refresh email regression)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /auth/me returns the email field (null for users who have none) | ✓ VERIFIED | `apps/backend/src/routes/auth.ts:239-242` — `select` includes `email: true`. Unchanged, regression-checked. |
| 2 | Settings page shows an Email section with an input and save button | ✓ VERIFIED | `apps/frontend/src/pages/SettingsPage.tsx:140-185` — Card, `Input type="email"` bound to RHF, submit button wired to `PATCH /api/auth/me`. Regression-checked, unchanged. |
| 3 | Submitting a duplicate email shows a clear conflict error; an invalid format is rejected at the schema level | ✓ VERIFIED | `PATCH /api/auth/me` and `PATCH /api/admin/users/:id` both catch Prisma `P2002` → `409 EMAIL_TAKEN` (`auth.ts:276-278`, `admin.ts:96`). All 5 email read/write sites consume the shared `normalizedEmail()` helper (`packages/shared/src/schemas/email.ts`, re-confirmed in `user.ts:2,33,41` and `admin.ts`). Regression-checked, unchanged since prior re-verification. |
| 4 | Settings page shows a prominent warning when email is null, explaining that password reset requires an email address | ✓ VERIFIED | `SettingsPage.tsx:125-138` — amber `Alert role="alert"` renders when `user?.email == null`. Now correctly reflects real state on first render after login (see truth 6). |
| 5 | Admin can set or update any user's email from the admin panel user dropdown | ✓ VERIFIED | `AdminPage.tsx` Edit-email dialog (lines ~273-399) + `PATCH /api/admin/users/:id` (`admin.ts:36-96`, normalizes via shared helper, handles `EMAIL_TAKEN`). Unaffected by this round's changes (admin list sourced from `GET /users`, which already includes `email`). Regression-checked. |
| 6 | A user who already has an email on file sees it correctly reflected in Settings immediately after logging in (accurate no-email warning state, accurate pre-filled email input), without requiring a full page reload | ✓ VERIFIED | **Gap closed by 29-06.** `apps/backend/src/routes/auth.ts:144` (POST /login) and `:228` (POST /refresh) now include `email: user.email`, matching GET /me's shape exactly. `apps/frontend/src/context/AuthContext.tsx:12` — `User` type is now `Omit<UserResponse, 'createdAt'> & { createdAt: string }`, single-sourced from `@kartex/shared`'s `UserResponse` (no more hand-rolled duplicate that could silently drop fields). `LoginPage.tsx:77` — `setUser(data.user ?? data)` now receives a payload that includes `email`, so `SettingsPage.tsx`'s `user?.email == null` check and `defaultValues: { email: user?.email ?? '' }` (lines 76, 125) both reflect the real value immediately after login. A real, non-todo route-level test (`apps/backend/src/routes/__tests__/auth-login.test.ts`) asserts both login and refresh responses contain the correct `email` value; ran directly — **2/2 pass**. |

**Score:** 6/6 truths verified.

### Deferred Items

None.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/backend/src/routes/auth.ts` (POST /login, POST /refresh) | Response bodies include `email`, matching GET /me | ✓ VERIFIED | Lines 144 and 228 both contain `email: user.email` in the `c.json(...)` literal. Confirmed via direct file read and `grep -c 'email: user.email' apps/backend/src/routes/auth.ts` → 2. |
| `apps/frontend/src/context/AuthContext.tsx` | `User` type single-sourced from shared `UserResponse` | ✓ VERIFIED | Line 12: `export type User = Omit<UserResponse, 'createdAt'> & { createdAt: string }`, imported from `@kartex/shared` (line 6). No hand-rolled `interface User` remains. |
| `apps/backend/src/routes/__tests__/auth-login.test.ts` | Real (non-todo) route-level test guarding the response shape | ✓ VERIFIED | New file, 2 real `it(...)` assertions (no `it.todo`). Ran directly: `yarn workspace @kartex/backend test run auth-login` → 2/2 pass. |
| `packages/shared/src/schemas/email.ts` | `normalizedEmail()` factory, single source of truth | ✓ VERIFIED (unchanged, regression-checked) | Consumed by `UpdateEmailSchema`, `UpdateMeSchema`, `PasswordResetRequestSchema`, admin `PATCH /users/:id`, admin `POST /invites`. |
| `.planning/REQUIREMENTS.md` | EMAIL-09/10/11 marked Complete | ✓ VERIFIED | Lines 21-23 checklist `[x]` all three; lines 105-107 Traceability table `Complete` for all three. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `POST /login` / `POST /refresh` response | `AuthContext.User.email` | `setUser(data.user ?? data)` (LoginPage) / `hydrateSession` `setUser(data)` (AuthContext) | ✓ WIRED | Response now includes `email`; `User` type derives it from `UserResponse` (no field can be silently typed-but-absent). Confirmed by reading `auth.ts:144,228`, `AuthContext.tsx:12`, `LoginPage.tsx:77`. |
| `user.email == null` | No-email Alert (`SettingsPage.tsx`) | JSX conditional | ✓ WIRED | Now correctly reflects the true email state immediately after login (previously produced a false positive due to the login-response gap; that gap is closed). |
| `normalizedEmail()` (shared) | 5 email read/write sites | direct import | ✓ WIRED | Unchanged from prior re-verification; regression-checked in `user.ts` and `admin.ts`. |
| Admin `PATCH /users/:id` | `EMAIL_TAKEN` conflict handling | Prisma `P2002` catch | ✓ WIRED | `admin.ts:96` and `auth.ts:277-278`, unchanged. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Login/refresh regression test | `yarn workspace @kartex/backend test run auth-login` | 2/2 passed (ran directly) | ✓ PASS |
| Backend typecheck | `yarn workspace @kartex/backend typecheck` | Clean, 0 errors | ✓ PASS |
| Frontend typecheck | `yarn workspace @kartex/frontend typecheck` | Clean, 0 errors | ✓ PASS |
| Login response includes `email` | Direct code read of `auth.ts:144` vs. `241` (GET /me) | Identical key set: id, username, role, isActive, studyMode, createdAt, email | ✓ PASS |
| Refresh response includes `email` | Direct code read of `auth.ts:228` | Same shape as login/`/me` | ✓ PASS |
| No debt markers introduced | `grep -n -E "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` across `auth.ts`, `AuthContext.tsx`, `auth-login.test.ts` | 0 matches | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| EMAIL-09 | 29-01, 29-02, 29-03, 29-05, 29-06 | User can add/update their own email from Settings | ✓ SATISFIED | Backend + Settings UI fully wired and tested; the truth-6 login/refresh gap that previously undermined this for the immediately-post-login case is now closed. |
| EMAIL-10 | 29-01, 29-02, 29-03, 29-05, 29-06 | Settings shows a no-email warning | ✓ SATISFIED | Warning logic correct and now accurate immediately after login (no more false positive from the login-response gap). |
| EMAIL-11 | 29-01, 29-02, 29-04, 29-05 | Admin can set/update any user's email | ✓ SATISFIED | Unaffected by this round's changes; `REQUIREMENTS.md` reflects `Complete`. |

No orphaned requirements — `REQUIREMENTS.md` maps only EMAIL-09/10/11 to Phase 29, all three claimed across plans (including 29-06's gap-closure requirements list `[EMAIL-09, EMAIL-10]`).

### Anti-Patterns Found

None in files modified by 29-06 (`auth.ts`, `AuthContext.tsx`, `auth-login.test.ts`) — no `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers, no empty implementations, no hardcoded empty stubs. The two prior warnings from the last re-verification are now resolved or were informational-only and remain unchanged in disposition:

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/backend/src/routes/auth.ts` | 255-282 (`PATCH /me`) | Any authenticated (non-admin) user can probe whether an arbitrary email belongs to another account via the `409 EMAIL_TAKEN` response | ℹ️ Info (accepted, pre-existing, out of scope for this phase) | Deliberate design choice per the `D-08` code comment (unique-index race-safe gate); rate-limited by `rateLimitMiddleware`. Not a Phase 29 blocker for a 2-5-user self-hosted deployment. |

### Human Verification Required

None. The truth-6 fix is fully demonstrable by static code reading (response shape now matches the type contract, and the type contract is now single-sourced from the shared schema) plus a real, passing, non-mocked-integration route test that would fail if the fix were reverted (confirmed empirically per 29-06-SUMMARY.md's revert-and-restore check).

### Gaps Summary

No gaps. Plan 29-06 closed the only remaining gap from the prior re-verification: `POST /api/auth/login` and `POST /api/auth/refresh` now return `email` in their response bodies, matching `GET /api/auth/me`. `AuthContext`'s `User` type is single-sourced from `@kartex/shared`'s `UserResponse`, eliminating the hand-rolled-interface drift risk that let this class of bug occur (and recur — this is the same omission class previously fixed once for `studyMode` in phase 11). A real route-level test (`auth-login.test.ts`, 2/2 passing) guards the response shape going forward.

All 6 observable truths for the phase goal are verified. All 5 required artifacts pass all three levels (exist, substantive, wired). All key links are wired correctly. Requirements EMAIL-09, EMAIL-10, and EMAIL-11 are all satisfied with no orphans. No blocker or warning-level anti-patterns remain. No human verification items are outstanding.

**Phase goal achieved: users can add or update their email address from Settings, and see an accurate warning when no email is set — including immediately after logging in, without needing a full page reload.**

---

_Verified: 2026-07-04T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
