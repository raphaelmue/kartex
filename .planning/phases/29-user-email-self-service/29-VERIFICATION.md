---
phase: 29-user-email-self-service
verified: 2026-07-03T07:48:23Z
status: gaps_found
score: 5/6 truths verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: "5/5 roadmap truths verified (1 blocker anti-pattern found separately)"
  gaps_closed:
    - "CR-01 (email normalization): PasswordResetRequestSchema and POST /api/admin/invites now normalize via a single shared normalizedEmail() helper (packages/shared/src/schemas/email.ts), consumed by all 5 read/write sites (UpdateEmailSchema, UpdateMeSchema, PasswordResetRequestSchema, admin PATCH /users/:id, admin POST /invites)."
    - "Documentation gap: REQUIREMENTS.md EMAIL-11 flipped to [x]/Complete in both the checklist and Traceability table; no residual 'Pending' remains."
  gaps_remaining: []
  regressions:
    - "New critical finding surfaced by 29-REVIEW.md (its own CR-01, unrelated to the prior VERIFICATION.md's CR-01) and independently confirmed here: POST /api/auth/login and POST /api/auth/refresh response bodies omit the `email` field, while GET /api/auth/me and the admin endpoints include it. AuthContext hydrates from the login/refresh response directly (no follow-up /me call), so a user who already has an email set sees `user.email === undefined` immediately after logging in (until a full page reload re-triggers the one-time /me hydration in AuthProvider's mount effect). This is not a pre-existing issue — 29-01 (ab7b8ab) introduced `email` to GET/PATCH /me but, unlike the phase-11 precedent for `studyMode` (which required a follow-up fix commit fc7b3b9 for the exact same omission class), never extended login/refresh to include it."
gaps:
  - truth: "A user who already has an email on file sees it correctly reflected in Settings immediately after logging in (accurate no-email warning state, accurate pre-filled email input) without requiring a full page reload"
    status: failed
    reason: "POST /api/auth/login (auth.ts:143-146) and POST /api/auth/refresh (auth.ts:227-230) return { id, username, role, isActive, studyMode, createdAt } — no `email` key at all, unlike GET /api/auth/me (auth.ts:241, select includes email:true) and the admin PATCH endpoints. LoginPage.tsx:77 sets the AuthContext user directly from the login response (setUser(data.user ?? data)); AuthProvider's session-hydration effect (AuthContext.tsx:32-72, calling GET /api/auth/me) only runs once on top-level app mount, and client-side navigate('/dashboard') (LoginPage.tsx:78) does not remount AuthProvider, so no follow-up /me call ever happens. Net effect in SettingsPage.tsx: line 125 `user?.email == null` is true for `undefined` (loose equality), so the amber 'No email address set' warning renders even though the user has an email; line 76 `defaultValues: { email: user?.email ?? '' }` pre-fills the form empty instead of the real saved address (react-hook-form captures defaultValues once at mount, never resynced). Reproduces on every login for every user with an email set — not an edge case. Confirmed directly by reading auth.ts, AuthContext.tsx, LoginPage.tsx, and SettingsPage.tsx; also confirmed SettingsPage.test.tsx mocks useAuth() directly (bypassing the real login->AuthContext->SettingsPage integration path), so no existing test would catch this."
    artifacts:
      - path: "apps/backend/src/routes/auth.ts"
        issue: "POST /login (line ~143-146) and POST /refresh (line ~227-230) response bodies omit `email`, unlike GET /me (line 241) and admin.ts's PATCH /users/:id (select includes email: true)"
      - path: "apps/frontend/src/context/AuthContext.tsx"
        issue: "Session hydration (GET /api/auth/me) only runs once on mount; no re-fetch after a client-side login/refresh sets user from a partial response"
    missing:
      - "Add `email: user.email` to both response bodies in apps/backend/src/routes/auth.ts (POST /login and POST /refresh), matching GET /api/auth/me's shape"
      - "Consider deriving AuthContext's User type from the shared @kartex/shared UserResponse (z.infer) instead of a hand-rolled interface, so a future response-shape mismatch is a compile error, not a silent runtime undefined (this is 29-REVIEW.md's WR-01, the proximate cause of this bug recurring after phase 11 already fixed the identical class of omission for studyMode)"
      - "Add a route-level test (e.g. in auth-me.test.ts or a login/refresh test) asserting the login/refresh response has an `email` key, so this class of regression is caught going forward (29-REVIEW.md's WR-02)"
deferred: []
---

# Phase 29: User Email Self-Service Verification Report

**Phase Goal:** Users can add or update their email address from Settings, and see a warning when no email is set (since password reset requires one)
**Verified:** 2026-07-03T07:48:23Z
**Status:** gaps_found
**Re-verification:** Yes — after gap closure (29-05-PLAN.md, executed to close the prior VERIFICATION.md's CR-01/WR-01/doc gaps)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /auth/me returns the email field (null for users who have none) | ✓ VERIFIED | `apps/backend/src/routes/auth.ts:239-242` — `select` includes `email: true`; unchanged since prior verification. |
| 2 | Settings page shows an Email section with an input and save button | ✓ VERIFIED | `apps/frontend/src/pages/SettingsPage.tsx:140-185` — Card, `Input type="email"` bound to RHF, submit button present and wired to `PATCH /api/auth/me`. Structurally unchanged and correct; see truth 6 below for a data-correctness caveat that affects what value this input shows on first render after login. |
| 3 | Submitting a duplicate email shows a clear conflict error; an invalid format is rejected at the schema level | ✓ VERIFIED (caveat closed) | `PATCH /api/auth/me` and `PATCH /api/admin/users/:id` both catch Prisma `P2002` → `409 EMAIL_TAKEN`. **The prior verification's caveat is now closed:** all 5 email read/write sites (`UpdateEmailSchema`, `UpdateMeSchema`, `PasswordResetRequestSchema`, admin `PATCH /users/:id`, admin `POST /invites`) consume one shared `normalizedEmail()` helper (`packages/shared/src/schemas/email.ts`), confirmed by reading `auth.ts`, `user.ts`, and `admin.ts` (lines 6-9, 262-266) and by running `email-normalization.test.ts` directly (5/5 pass). |
| 4 | Settings page shows a prominent warning when email is null, explaining that password reset requires an email address | ✓ VERIFIED (structurally) | `SettingsPage.tsx:125-138` — amber `Alert role="alert"` renders when `user?.email == null`. Structurally correct; note truth 6's finding that this condition is also (incorrectly) satisfied by a real-but-unset value of `undefined` right after login. |
| 5 | Admin can set or update any user's email from the admin panel user dropdown | ✓ VERIFIED | `AdminPage.tsx` Edit Email dropdown item + dialog, `PATCH /api/admin/users/:id`, unchanged since prior verification and unaffected by this phase's login/refresh gap (admin user list is fetched via `GET /users`, which includes `email`). |
| 6 | A user who already has an email on file sees it correctly reflected in Settings immediately after logging in (accurate warning state, accurate pre-filled input), not only after a full page reload | ✗ FAILED | New finding, independently confirmed (see Gaps below): `POST /login`/`POST /refresh` omit `email`; `AuthContext` never re-fetches `/me` after a client-side login. Reproduces every login for every user with an email set. |

**Score:** 5/6 truths verified (truth 6 added this round — derived from the phase goal and from 29-REVIEW.md's independently-confirmed new CR-01 finding; the original 5 roadmap success criteria are literally still satisfied in isolation, but truth 6 is necessary for the phase's stated goal — "Users can add or update their email address from Settings, and see a warning when no email is set" — to actually hold for a real user session, not just a cold-loaded page).

### Deferred Items

None.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared/src/schemas/email.ts` | `normalizedEmail()` factory, single source of truth | ✓ VERIFIED | New file, exports `normalizedEmail(message?)` returning `z.string().trim().toLowerCase().email(message)`. |
| `packages/shared/src/schemas/auth.ts` | `PasswordResetRequestSchema` normalized | ✓ VERIFIED | Line 26-28: `email: normalizedEmail()`, replacing the prior bare `z.string().email()`. |
| `apps/backend/src/routes/admin.ts` | Both email sites (`PATCH /users/:id`, `POST /invites`) normalized via shared helper | ✓ VERIFIED | Line 6 imports `normalizedEmail` from `@kartex/shared`; line ~55 (`PATCH /users/:id`) and line ~263 (`POST /invites`) both call `normalizedEmail()`/`normalizedEmail().safeParse`; the old bare `z.object({ email: z.string().email() })` invite validator is gone (grep confirms 0 matches). |
| `apps/backend/src/routes/__tests__/email-normalization.test.ts` | Real cross-schema normalization test | ✓ VERIFIED | New file, 5 real (non-todo) assertions; ran directly — 5/5 pass. |
| `.planning/REQUIREMENTS.md` | EMAIL-11 reconciled to Complete | ✓ VERIFIED | Line 23 checklist `[x]`, line 107 Traceability `Complete`; no residual "Pending" for EMAIL-11 (grep confirms). |
| `apps/backend/src/routes/auth.ts` (POST /login, POST /refresh) | Response bodies should include `email` to match GET /me | ✗ MISSING | Lines 143-146 and 227-230 omit `email`; this is the truth-6 gap. Not a must-have this phase's plans claimed to touch, but required for the phase goal to hold end-to-end. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `normalizedEmail()` (shared) | `UpdateEmailSchema`/`UpdateMeSchema`/`PasswordResetRequestSchema` | direct import from `./email` | ✓ WIRED | Confirmed in `packages/shared/src/schemas/user.ts` and `auth.ts`. |
| `normalizedEmail()` (shared) | `admin.ts` PATCH /users/:id + POST /invites | `import { normalizedEmail } from '@kartex/shared'` | ✓ WIRED | Confirmed at both call sites; shared package rebuilt (`yarn workspace @kartex/shared build` per plan) so backend resolves it at runtime. |
| `POST /login` / `POST /refresh` response | `AuthContext.User.email` | `setUser(data.user ?? data)` (LoginPage) / hydrateSession `setUser(data)` (AuthContext) | ✗ NOT_WIRED (for email specifically) | The response object simply lacks the key; `User.email: string \| null` (non-optional in the hand-rolled type) silently becomes `undefined` at runtime. This is the truth-6 gap. |
| `user.email == null` | No-email Alert | JSX conditional | ⚠️ PARTIAL | Wired correctly for the true-null case (confirmed by `EMAIL-10a/b` RTL tests, which mock `useAuth()` directly and never exercise the real login response), but the condition is also satisfied by the unrelated `undefined` state produced by the truth-6 gap — the link is technically "wired" but produces a false positive for a subset of real user sessions. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Shared package typecheck | `yarn workspace @kartex/shared typecheck` | Clean, no errors | PASS |
| Backend typecheck | `yarn workspace @kartex/backend typecheck` | Clean, no errors | PASS |
| email-normalization test file | `yarn workspace @kartex/backend test run email-normalization` | 5/5 passed (ran directly) | PASS |
| Bare invite validator removed | `grep -n "z.object({ email: z.string().email() })" apps/backend/src/routes/admin.ts` | 0 matches | PASS |
| Login/refresh response shape | Direct code read of `auth.ts:143-146`, `227-230` vs. `241` | `email` key absent from login/refresh, present in /me | FAIL (this is the truth-6 gap; no server needed to run to observe — it's a static response-shape mismatch confirmed by reading the handler source) |
| AuthProvider re-hydration on client nav | Direct code read of `AuthContext.tsx:32-72` and `LoginPage.tsx:58-62,71-78` | `hydrateSession` only in a `useEffect(..., [])` on `AuthProvider` mount; `navigate('/dashboard')` is client-side (no remount) | Confirms no follow-up `/me` call after login |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| EMAIL-09 | 29-01, 29-02, 29-03, 29-05 | User can add/update their own email from Settings | ⚠️ SATISFIED with a caveat | Backend + Settings UI fully wired and tested for the cold-load / already-hydrated case; the truth-6 gap means the Settings page can show stale/incorrect email state for one browser session immediately after login (self-heals on full reload). |
| EMAIL-10 | 29-01, 29-02, 29-03, 29-05 | Settings shows a no-email warning | ⚠️ SATISFIED with a caveat | Same as above — warning logic itself is correct, but can false-positive right after login due to the truth-6 gap. |
| EMAIL-11 | 29-01, 29-02, 29-04, 29-05 | Admin can set/update any user's email | ✓ SATISFIED | Unaffected by the truth-6 gap (admin list is sourced from `GET /users`, which includes `email`). REQUIREMENTS.md now correctly reflects `Complete`. |

No orphaned requirements — REQUIREMENTS.md maps only EMAIL-09/10/11 to Phase 29, all three claimed by plans in this phase (including 29-05's gap-closure requirements list).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/backend/src/routes/auth.ts` | 143-146 (POST /login), 227-230 (POST /refresh) | Response body omits `email`, inconsistent with `GET /me`'s select | 🛑 Blocker | Causes truth-6 failure — incorrect Settings UI state (false "no email" warning, empty pre-filled input) for every user with an email set, immediately after login, until a full reload. Confirmed as this phase's own regression (29-01 added `email` to GET/PATCH /me but not login/refresh; codebase has direct precedent for this exact omission class with `studyMode`, fixed in phase 11 by commit `fc7b3b9`). Reported independently in `29-REVIEW.md` as its own CR-01 (distinct from the prior VERIFICATION.md's CR-01, which is now closed). |
| `apps/frontend/src/context/AuthContext.tsx` | 8-16 | Hand-rolled `User` interface (`email: string \| null`, non-optional) instead of deriving from `@kartex/shared`'s `UserResponse` | ⚠️ Warning | Proximate cause of the blocker above going undetected by TypeScript — the type promises `email` is always present, but real login/refresh payloads can omit it entirely. (29-REVIEW.md WR-01.) |
| `apps/backend/src/routes/__tests__/auth-me.test.ts`, `admin-email.test.ts` | various | All new route-behavior assertions (beyond schema normalization) are `it.todo()` stubs | ⚠️ Warning | Established repo convention per the prior verification, but concretely meant this class of defect (a route response missing a field) was not caught by any test in this phase. (29-REVIEW.md WR-02.) |
| `apps/backend/src/routes/auth.ts` | 255-282 (`PATCH /me`) | Any authenticated (non-admin) user can probe whether an arbitrary email belongs to another account via the `409 EMAIL_TAKEN` response | ℹ️ Info (accepted low-severity tradeoff) | Deliberate design choice per the `D-08` code comment (unique-index race-safe gate); rate-limited by the existing `rateLimitMiddleware`. Not a Phase 29 blocker for a 2-5-user self-hosted deployment. (29-REVIEW.md WR-03.) |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` debt markers in any file touched by 29-05 or found in the re-scanned auth/admin routes.

### Human Verification Required

None — the truth-6 gap is fully demonstrable by static code reading (response shape vs. type contract vs. one-time hydration effect); no runtime server needed to establish it's reachable and reproducible.

### Gaps Summary

Plan 29-05 successfully closed both items from the prior verification: (1) the CR-01 email-normalization gap — all 5 `User.email`/`InviteToken.email` read/write sites now converge on a single shared `normalizedEmail()` helper, proven by a real, passing cross-schema test; and (2) the REQUIREMENTS.md EMAIL-11 documentation gap, now correctly marked `Complete`.

However, this re-verification surfaces a **new, unrelated, unresolved critical defect** — independently confirmed here after being flagged as this phase's own `29-REVIEW.md` CR-01 (a fresh code review run after 29-05 landed, whose own numbering happens to also start at CR-01, distinct from the prior VERIFICATION.md's CR-01): `POST /api/auth/login` and `POST /api/auth/refresh` never return the `email` field, while `GET /api/auth/me` and the admin endpoints do. Because `AuthContext` hydrates the user object directly from the login/refresh response and only re-fetches `/me` once, on the app's initial mount (never again after a client-side login), any user who already has an email on file will see an incorrect "no email set" warning and an empty email input in Settings immediately after logging in — until they perform a full page reload. This reproduces on every login for every user with an email, directly undermining the observable behavior the phase goal promises ("...see a warning when no email is set").

This is not a hypothetical: I traced the exact code path (auth.ts response bodies -> LoginPage.tsx `setUser` -> AuthContext's one-shot hydration effect -> SettingsPage's `== null` check and RHF `defaultValues`) and confirmed no existing test exercises this integration path (`SettingsPage.test.tsx` mocks `useAuth()` directly, bypassing it entirely).

**Recommended fix (small, well-scoped, matches existing precedent):** add `email: user.email` to both response bodies in `apps/backend/src/routes/auth.ts` (POST /login, POST /refresh), matching `GET /api/auth/me`'s shape — the same fix pattern already used once before in this codebase for an identical `studyMode` omission (phase 11, commit `fc7b3b9`). A route-level test asserting the response includes `email` would prevent recurrence.

I'm reporting `status: gaps_found` because this defect is real, reproducible, and directly breaks the phase's stated user-facing promise for the common case of an already-logged-in user with an email on file — not because any of the plan 29-05 gap-closure work failed (it succeeded completely).

---

_Verified: 2026-07-03T07:48:23Z_
_Verifier: Claude (gsd-verifier)_
