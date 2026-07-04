---
phase: 29-user-email-self-service
reviewed: 2026-07-04T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - apps/backend/src/routes/__tests__/admin-email.test.ts
  - apps/backend/src/routes/__tests__/auth-login.test.ts
  - apps/backend/src/routes/__tests__/auth-me.test.ts
  - apps/backend/src/routes/admin.ts
  - apps/backend/src/routes/auth.ts
  - apps/frontend/src/context/AuthContext.tsx
  - apps/frontend/src/locales/de.json
  - apps/frontend/src/locales/en.json
  - apps/frontend/src/pages/__tests__/AdminPage.test.tsx
  - apps/frontend/src/pages/__tests__/SettingsPage.test.tsx
  - apps/frontend/src/pages/AdminPage.tsx
  - apps/frontend/src/pages/SettingsPage.tsx
  - packages/shared/src/schemas/user.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 29: Code Review Report

**Reviewed:** 2026-07-04T00:00:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

This is a full re-review of Phase 29 (User Email Self-Service) including gap-closure plan 29-06, which supersedes the prior 29-REVIEW.md (that pass covered plans 29-01 through 29-05 and reported one Critical finding: `POST /api/auth/login` and `POST /api/auth/refresh` omitted the `email` field, causing a false "no email" warning immediately after login).

**CR-01 is confirmed fixed.** `apps/backend/src/routes/auth.ts:144` and `apps/backend/src/routes/auth.ts:228` both now include `email: user.email` in their `c.json(...)` response bodies, matching `GET /api/auth/me`'s shape exactly. The new `apps/backend/src/routes/__tests__/auth-login.test.ts` is a real (non-stub), executable route-integration test that mounts the actual `authRouter` via Hono with mocked Prisma/bcryptjs/jwt and asserts both responses contain `email` — I traced the test and confirmed it would fail if the fix were reverted (it directly asserts `body.email === 'user@example.com'` for login and `body).toHaveProperty('email')` for refresh). **WR-01 from the prior review (hand-rolled `AuthContext.User` type) is also confirmed fixed** — `AuthContext.tsx` now derives `User` as `Omit<UserResponse, 'createdAt'> & { createdAt: string }` from `@kartex/shared`, removing the duplicate interface.

However, three issues from the prior review remain unaddressed (untested backend route behaviors, an undocumented email-enumeration side channel, and two minor duplication/consistency nits), and this pass surfaces one new structural concern: the shared `UserResponseSchema.email` field is declared `.optional()` in addition to `.nullable()`, which — ironically, given 29-06's stated rationale of using the shared schema to prevent silent response-shape drift — means a TypeScript consumer typed against `UserResponse` would not get a compile error if a future response handler omits the `email` key entirely. The only thing currently guarding against that exact regression class recurring is the new runtime test, not the type system.

## Warnings

### WR-01: Backend route behaviors for EMAIL-10/EMAIL-11 remain untested — all `it.todo()` stubs

**File:** `apps/backend/src/routes/__tests__/auth-me.test.ts:29-38`, `apps/backend/src/routes/__tests__/admin-email.test.ts:8-19`

**Issue:** Both files only exercise Zod-schema-level normalization (real, passing assertions for `UpdateEmailSchema`/`UpdateMeSchema`). Every actual route-behavior claim tied to this phase's requirements is still declared with `it.todo(...)` and never executes:
- `GET /api/auth/me` returning `email: null` vs. a string
- `PATCH /api/auth/me` accepting `{ email }` independently of `{ studyMode }`, returning 409 `EMAIL_TAKEN`, returning 400 on invalid format
- `PATCH /api/admin/users/:id`'s email branch (valid update, 409 `EMAIL_TAKEN`, 400 invalid format, admin-only reachability)

29-06 proved that real route-integration tests catch real regressions (CR-01 slipped past exactly this kind of stub-only coverage). The comment "Fill in route stubs ... in a later pass" still applies here — these two files ship zero executable route-level coverage for EMAIL-10/EMAIL-11, the same class of gap that let CR-01 through undetected in the prior review pass.

**Fix:** Follow the pattern now established in `auth-login.test.ts` (hoisted `vi.mock('../../lib/prisma.js', ...)`, mount the real router via Hono, assert on `res.status` / `res.json()`) to replace the `it.todo` stubs with real assertions, at minimum for the `EMAIL_TAKEN` (409) and invalid-format (400) paths on both `PATCH /api/auth/me` and `PATCH /api/admin/users/:id`.

### WR-02: Self-service email update leaks account existence via 409 EMAIL_TAKEN (email enumeration) — still undocumented at this route

**File:** `apps/backend/src/routes/auth.ts:267-281` (`PATCH /api/auth/me`)

**Issue:** Any authenticated user (not just an admin) can submit an arbitrary email address via `PATCH /api/auth/me` and learn — via the `409 EMAIL_TAKEN` response — whether that exact email address belongs to *some* other registered user. The code comment at line 276 ("D-08: Duplicate email — unique index is the race-safe gate") documents the *concurrency* design choice but not the *enumeration* tradeoff, unlike other routes in this same file which explicitly note accepted enumeration risks (e.g., the `RESET-03` comments around `POST /forgot-password`). Given the project's small invite-only user base (2-5 users) impact is low and the route is rate-limited (`rateLimitMiddleware(10, 60_000)` applied to the whole `auth` router), but this was flagged in the prior review pass and remains unaddressed.

**Fix:** No code change required if this is an accepted tradeoff — add a `D-08` comment near `PATCH /api/auth/me` (mirroring the `RESET-03` comments elsewhere in the file) explicitly noting the enumeration tradeoff was considered and accepted, so it isn't mistaken for an oversight in a future audit.

### WR-03: `UserResponseSchema.email` is `.optional()`, which defeats the type-level drift protection 29-06 was built to provide

**File:** `packages/shared/src/schemas/user.ts:17`

**Issue:** `email: z.string().email().nullable().optional()` allows the `email` key to be entirely absent from a value typed as `UserResponse`, not just `null`. Every backend `select` in `auth.ts` and `admin.ts` always includes `email: true`, so at runtime the key is always present (string or `null`) — `.optional()` doesn't reflect the actual contract. This matters because 29-06's own stated rationale for deriving `AuthContext.User` from `UserResponse` was to "prevent the client-side auth shape from silently drifting from the backend contract" (29-06-SUMMARY.md) — but since `email` is optional in the type, if a future response literal (in `auth.ts` or elsewhere) omitted `email` again, and that literal were ever typed against `UserResponse`, TypeScript would raise **no error**, because omitting an optional key is always valid. The only safeguard against the exact CR-01 regression class recurring is now the runtime test in `auth-login.test.ts` — the type system provides none, despite the refactor being framed as a compile-time guard.

**Fix:** Change to `email: z.string().email().nullable()` (drop `.optional()`) so the schema accurately requires the key to always be present (nullable, not missing). This also more accurately reflects the Prisma schema (`email String? @unique` is always selected, never omitted from any route in scope).

## Info

### IN-01: Duplicated hardcoded email-error string instead of deriving from `normalizedEmail()`'s default message

**File:** `apps/backend/src/routes/admin.ts:58`, `apps/backend/src/routes/admin.ts:266`

**Issue:** Both call sites hardcode the literal string `'Valid email address required.'`, duplicating the default `message` parameter already defined once in `normalizedEmail(message = 'Valid email address required.')` (`packages/shared/src/schemas/email.ts:6`). They currently match, but nothing enforces they stay in sync if the schema's default message is ever edited.

**Fix:**
```ts
if (!parsedEmail.success) {
  return c.json({ error: parsedEmail.error.issues[0]?.message ?? 'Valid email address required.' }, 400)
}
```

### IN-02: `UpdateMeSchema.refine()` doesn't set an error `path`

**File:** `packages/shared/src/schemas/user.ts:43-45`

**Issue:** The refine check ("at least one field is required") doesn't pass a `path`, so on failure the Zod error attaches to the schema root rather than a specific field. `body.error.flatten()` (used in `auth.ts`'s `PATCH /me` handler at line 258) would put this message under `formErrors` rather than `fieldErrors`. Not currently reachable from the shipped UI (both `SettingsPage` and `AdminPage` always send exactly one field), but worth hardening for future consumers that display inline field errors.

**Fix:**
```ts
.refine((data) => data.studyMode !== undefined || data.email !== undefined, {
  message: 'At least one field is required.',
  path: ['studyMode'],
})
```

### IN-03: `AdminPage.tsx`'s Edit Email dialog reuses a `settings.*` translation key instead of its own `admin.*` key

**File:** `apps/frontend/src/pages/AdminPage.tsx:647`

**Issue:** The admin Edit Email dialog's submit-button "Saving..." label uses `t('settings.emailSaving')` instead of an `admin.*`-namespaced key, even though a parallel `admin.saveEmail` key already exists for the same button's idle state one line below (line 649). This couples the admin section's copy to the Settings page's wording and will silently diverge if either is translated/edited independently (both `en.json` and `de.json` currently have matching text for `settings.emailSaving` but no `admin.emailSaving` equivalent exists).

**Fix:** Add `admin.emailSaving` to both `en.json`/`de.json` and reference it here instead of `settings.emailSaving`.

### IN-04: `AdminPage.tsx`'s local `UserRecord` interface duplicates the shared `UserResponse` shape

**File:** `apps/frontend/src/pages/AdminPage.tsx:65-72`

**Issue:** `interface UserRecord { id, username, email?, role, isActive, createdAt }` hand-rolls the exact shape already exported as `UserResponse` from `@kartex/shared` — the same duplication class that 29-06 just fixed for `AuthContext.User`. `role` is retyped as the literal union `'ADMIN' | 'USER'` instead of importing `UserRole`, and `createdAt` as `string` instead of deriving via the same `Omit<UserResponse, 'createdAt'> & { createdAt: string }` pattern now established in `AuthContext.tsx`. This is the admin-facing counterpart to the exact problem 29-06 solved for the regular-user auth path, and it's a plausible next drift point since it isn't tied to the backend contract by any type-level check.

**Fix:** Replace with `type UserRecord = Omit<UserResponse, 'createdAt'> & { createdAt: string }` (or import `AuthContext`'s exported `User` type directly, since they'd now be structurally identical), consistent with the pattern established in 29-06.

---

_Reviewed: 2026-07-04T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
