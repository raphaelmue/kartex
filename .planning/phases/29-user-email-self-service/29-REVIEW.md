---
phase: 29-user-email-self-service
reviewed: 2026-07-03T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - apps/backend/src/routes/__tests__/auth-me.test.ts
  - apps/backend/src/routes/__tests__/admin-email.test.ts
  - packages/shared/src/schemas/user.ts
  - apps/backend/src/routes/auth.ts
  - apps/backend/src/routes/admin.ts
  - apps/frontend/src/context/AuthContext.tsx
  - apps/frontend/src/locales/en.json
  - apps/frontend/src/locales/de.json
  - apps/frontend/src/pages/SettingsPage.tsx
  - apps/frontend/src/pages/__tests__/SettingsPage.test.tsx
  - apps/frontend/src/pages/AdminPage.tsx
  - apps/frontend/src/pages/__tests__/AdminPage.test.tsx
  - packages/shared/src/schemas/email.ts
  - apps/backend/src/routes/__tests__/email-normalization.test.ts
  - packages/shared/src/index.ts
  - packages/shared/src/schemas/auth.ts
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 29: Code Review Report

**Reviewed:** 2026-07-03T00:00:00Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

This review covers the corrected file scope for Phase 29 (User Email Self-Service), including plan 29-05's shared `normalizedEmail()` extraction (the file list was manually reconstructed because 29-05-SUMMARY.md's CRLF line endings broke the automated frontmatter parser — see workflow note). This supersedes the prior 29-REVIEW.md, which was scoped before 29-05 landed.

The normalization refactor itself is sound: `normalizedEmail()` is genuinely the single source of truth and is consumed consistently by `UpdateEmailSchema`, `UpdateMeSchema`, `PasswordResetRequestSchema`, and both `admin.ts` call sites (`PATCH /users/:id`, `POST /invites`) — confirmed by executing `email-normalization.test.ts`. Admin routes are correctly gated by `requireAdmin` in `index.ts` (verified), Prisma cascade deletes correctly cover `PasswordResetToken` (verified against `schema.prisma`), and `tsc --noEmit` passes clean on both workspaces, ruling out a couple of initially-suspected type issues (UMD `React` namespace usage without an explicit `React` import, mixed type/value import from `@kartex/shared`) as non-bugs. All test files in scope pass (`yarn vitest run` on both workspaces).

However, one cross-file correctness bug was found and confirmed by tracing the actual data flow from `POST /api/auth/login` through to `SettingsPage.tsx`: the login (and refresh) response bodies never include the `email` field that the rest of the email-self-service feature depends on, so a user who already has an email on file will see the "no email set" warning and an empty email input immediately after logging in, until a full page reload re-triggers `GET /api/auth/me`. This directly undermines the EMAIL-09/EMAIL-10 UX contract this phase claims to deliver. There is also a real (if low-severity, and apparently deliberately accepted per the `D-08` comments) email-enumeration side channel on the self-service email-update endpoint, plus a test-coverage gap where all new backend route-level behaviors are `it.todo()` stubs rather than executed assertions.

## Critical Issues

### CR-01: Login/refresh responses omit `email`, causing incorrect "no email" UI state right after login

**File:** `apps/backend/src/routes/auth.ts:143-146` (POST /login) and `apps/backend/src/routes/auth.ts:227-230` (POST /refresh)

**Issue:** `GET /api/auth/me` and both admin user endpoints select and return `email`, but the JSON bodies returned by `POST /api/auth/login` and `POST /api/auth/refresh` do not include it:

```ts
return c.json(
  { id: user.id, username: user.username, role: user.role, isActive: user.isActive, studyMode: user.studyMode, createdAt: user.createdAt },
  200,
)
```

`apps/frontend/src/pages/LoginPage.tsx:77` sets the auth-context user directly from this response (`setUser(data.user ?? data)`), and `apps/frontend/src/context/AuthContext.tsx:8-16` declares the `User.email` field as `string | null` (present, not optional). `AuthProvider`'s session hydration (`GET /api/auth/me`) only runs once on the top-level app mount (`useEffect(..., [])`), so a client-side login via `LoginPage` never re-fetches `/me` afterward.

Net effect: immediately after a user with an email on file logs in (the common path — this is not an edge case), `user.email` is `undefined`. In `SettingsPage.tsx`:
- Line 125 (`user?.email == null`) evaluates to `true` (loose `==` treats `undefined` as `null`), so the "No email address set" warning banner renders even though the user has an email.
- Line 76 (`defaultValues: { email: user?.email ?? '' }`) pre-fills the email form with an empty string instead of the user's actual saved email, since `useForm`'s `defaultValues` is captured once at mount and never resynced.

This is a data-correctness bug directly affecting the EMAIL-09/EMAIL-10 feature this phase implements, and it reproduces on every login for every user who has an email set, not just a rare race.

**Fix:** Include `email` in both response bodies, matching `GET /api/auth/me`:
```ts
// auth.ts — POST /login and POST /refresh
return c.json(
  { id: user.id, username: user.username, role: user.role, isActive: user.isActive, studyMode: user.studyMode, createdAt: user.createdAt, email: user.email },
  200,
)
```

## Warnings

### WR-01: `AuthContext.tsx` hand-rolls a `User` type instead of using the shared Zod-derived type

**File:** `apps/frontend/src/context/AuthContext.tsx:8-16`

**Issue:** `packages/shared/src/schemas/user.ts` already exports `UserResponseSchema` / `UserResponse` (`z.infer`) as the intended single source of truth for the user response shape (per `CLAUDE.md`: "`packages/shared` is the single source of truth for all data types ... no type drift possible"). `AuthContext.tsx` instead defines its own local `interface User` with `email: string | null` as a required, non-optional field — diverging from the canonical schema, which marks `email` as `.optional().nullable()`. CR-01 is a concrete demonstration of exactly this drift: the local type promises `email` is always present, but the actual runtime payload from `/login` and `/refresh` can omit it entirely, and TypeScript had no way to catch this because the hand-rolled type doesn't reflect the shared contract.

**Fix:** Import the type from `@kartex/shared` (or derive `AuthContext`'s `User` from `UserResponse`) so response-shape mismatches surface as compile errors instead of silent runtime `undefined`s:
```ts
import type { UserResponse } from '@kartex/shared'
export type User = UserResponse
```

### WR-02: New backend route behaviors for EMAIL-09/10/11 are untested — all `it.todo()` stubs

**File:** `apps/backend/src/routes/__tests__/auth-me.test.ts:29-38`, `apps/backend/src/routes/__tests__/admin-email.test.ts:8-19`

**Issue:** Both test files only exercise the Zod-schema-level normalization (real, passing assertions). Every actual route-behavior claim for this phase — `GET /api/auth/me` returning `email: null` vs a string, `PATCH /api/auth/me` accepting `{ email }` independently of `{ studyMode }`, the 409 `EMAIL_TAKEN` conflict path, the 400 validation path, and the admin equivalents — is declared with `it.todo(...)` and never actually executes. CR-01 (a real route-response bug) is exactly the class of defect these stubs were meant to catch and did not, because they were never implemented. The comment says "Fill in route stubs ... in a later pass," but as submitted this phase ships route-level email behavior with zero executable route-level test coverage.

**Fix:** Implement at least the todo'd cases with `vi.mock('../../../lib/prisma.js')`, particularly a response-shape assertion for `POST /login` and `POST /refresh` that would have caught CR-01 (e.g. `expect(body).toHaveProperty('email')`).

### WR-03: Self-service email update leaks account existence via 409 EMAIL_TAKEN (email enumeration)

**File:** `apps/backend/src/routes/auth.ts:255-282` (`PATCH /api/auth/me`)

**Issue:** Any authenticated user (not just an admin) can submit an arbitrary email address via `PATCH /api/auth/me` and learn — via the `409 EMAIL_TAKEN` response — whether that exact email address belongs to *some* other registered user in the system. This is a real, if low-impact, enumeration side channel; the code comment ("D-08: unique index is the race-safe gate") indicates it was a deliberate design tradeoff for the concurrency-safety win, and the route is covered by the auth router's `rateLimitMiddleware(10, 60_000)`, which meaningfully limits brute-force probing. Given the project's stated threat model (self-hosted, 2-5 invite-only users), impact is low, but it's worth recording as an accepted-risk item rather than leaving it implicit.

**Fix:** No code change required if this is an accepted tradeoff (recommend noting the decision explicitly in a `D-08` doc reference near `PATCH /api/auth/me`, not just `PATCH /api/admin/users/:id`). If tightening is desired, consider a generic `error: 'UPDATE_FAILED'` response for self-service (non-admin) callers combined with tighter per-user rate limiting on this specific route.

## Info

### IN-01: Duplicated hardcoded email-error string instead of deriving from `normalizedEmail()`'s default message

**File:** `apps/backend/src/routes/admin.ts:58`, `apps/backend/src/routes/admin.ts:266`

**Issue:** Both call sites hardcode the literal string `'Valid email address required.'` as the 400 response body, duplicating (rather than reading) the default `message` parameter already defined once in `normalizedEmail(message = 'Valid email address required.')` (`packages/shared/src/schemas/email.ts:6`). They currently match, but nothing enforces that they stay in sync if the schema's default message is ever edited.

**Fix:** Use the parsed error's own message instead of a separate literal:
```ts
if (!parsedEmail.success) {
  return c.json({ error: parsedEmail.error.issues[0]?.message ?? 'Valid email address required.' }, 400)
}
```

### IN-02: `UpdateMeSchema.refine()` doesn't set an error `path`

**File:** `packages/shared/src/schemas/user.ts:38-45`

**Issue:** The refine check (`at least one field is required`) doesn't pass a `path`, so on failure the Zod error attaches to the schema root rather than a specific field. `body.error.flatten()` (used in `auth.ts`'s `PATCH /me` handler) would put this message under `formErrors` rather than `fieldErrors`, which any future frontend consumer displaying inline field errors would miss. Not currently reachable from the shipped UI (both `SettingsPage` and `AdminPage` always send exactly one field), but worth hardening.

**Fix:**
```ts
.refine((data) => data.studyMode !== undefined || data.email !== undefined, {
  message: 'At least one field is required.',
  path: ['studyMode'],
})
```

### IN-03: `AdminPage.tsx`'s Edit Email dialog reuses a `settings.*` translation key

**File:** `apps/frontend/src/pages/AdminPage.tsx:647-649`

**Issue:** The admin Edit Email dialog's submit-button "Saving..." label uses `t('settings.emailSaving')` instead of an `admin.*`-namespaced key, even though a parallel `admin.saveEmail` key already exists for the same button's idle state one line below. This couples the admin section's copy to the settings page's wording and will silently diverge if either is edited independently.

**Fix:** Add `admin.emailSaving` to both `en.json`/`de.json` and reference it here instead of `settings.emailSaving`.

---

_Reviewed: 2026-07-03T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
