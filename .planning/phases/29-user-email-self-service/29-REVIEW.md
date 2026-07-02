---
phase: 29-user-email-self-service
reviewed: 2026-07-02T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - apps/backend/src/routes/__tests__/admin-email.test.ts
  - apps/backend/src/routes/__tests__/auth-me.test.ts
  - apps/backend/src/routes/admin.ts
  - apps/backend/src/routes/auth.ts
  - apps/frontend/src/context/AuthContext.tsx
  - apps/frontend/src/locales/de.json
  - apps/frontend/src/locales/en.json
  - apps/frontend/src/pages/AdminPage.tsx
  - apps/frontend/src/pages/SettingsPage.tsx
  - apps/frontend/src/pages/__tests__/AdminPage.test.tsx
  - apps/frontend/src/pages/__tests__/SettingsPage.test.tsx
  - packages/shared/src/schemas/user.ts
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 29: Code Review Report

**Reviewed:** 2026-07-02T00:00:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Reviewed the backend email routes (`admin.ts`, `auth.ts`), the shared `UpdateEmailSchema`/`UpdateMeSchema` schemas, the frontend `SettingsPage`/`AdminPage` email UI, `AuthContext`, locale files, and the associated test files for Phase 29 (user email self-service).

The frontend UI work (SettingsPage email card, AdminPage Edit Email dialog, i18n keys) is solid and well-tested with real RTL assertions. However, the review surfaced two correctness/security-adjacent defects that should block ship:

1. Email normalization (trim + lowercase) was added only to the self-service write paths (`UpdateEmailSchema` / `UpdateMeSchema`), but the pre-existing invite-creation and forgot-password paths were never updated to match. Combined with a case-sensitive `@unique` column and no `citext`, this breaks both the email-uniqueness invariant and the forgot-password flow for case-mismatched input.
2. `PATCH /api/admin/users/:id` has no "last admin" guard on role changes, unlike the equivalent guard implemented for `DELETE /users/:id`. An admin (particularly the sole remaining admin) can self-demote to `USER` with no warning, locking the instance out of all admin functionality.

Additional quality issues: triplicated ad-hoc email-validation logic across `admin.ts` and `packages/shared`, an unhandled Prisma error path when two invites target the same email, test files that are almost entirely `it.todo()` stubs for the exact behaviors under review, and a hand-rolled `UserRecord` type in `AdminPage.tsx` that bypasses the project's stated single-source-of-truth schema convention.

## Critical Issues

### CR-01: Email normalization is inconsistent across write paths — breaks uniqueness and silently breaks forgot-password

**File:** `apps/backend/src/routes/admin.ts:262-267`, `apps/backend/src/routes/auth.ts:92`, `apps/backend/src/routes/auth.ts:296-299`
**Issue:**
This phase adds `.trim().toLowerCase()` normalization to `UpdateEmailSchema` / `UpdateMeSchema` (`packages/shared/src/schemas/user.ts:31-49`) for the *new* self-service write paths (`PATCH /api/auth/me`, `PATCH /api/admin/users/:id`). But two pre-existing paths that also write/read `user.email` were not updated to match:

- `admin.ts:263` — invite creation validates with `z.object({ email: z.string().email() }).safeParse(body)`, with no trim/lowercase. Whatever case the admin types (e.g. `"User@Example.COM"`) is stored verbatim on the `InviteToken` row.
- `auth.ts:92` — registration copies that raw, unnormalized value straight onto the new user: `data: { username, passwordHash, role: 'USER', email: invite.email }`.
- `auth.ts:298` (`POST /forgot-password`) looks the user up with `where: { email: body.data.email }`, where `body.data.email` comes from `PasswordResetRequestSchema` (`packages/shared/src/schemas/auth.ts:25-27`), which also has no `.trim().toLowerCase()`.

The `User.email` column is `String? @unique` in `prisma/schema.prisma:42` — a case-sensitive Postgres unique index (no `citext`). The practical impact:

1. **Uniqueness bypass:** an account created via invite with `"User@Example.com"` and a second account whose owner later self-service-sets `"user@example.com"` (normalized) will NOT collide at the DB level, even though both routes intend to enforce "one email, one account."
2. **Silent forgot-password failure:** if a user's stored email is anything other than the exact case they type into "Forgot password" (very likely, since humans habitually type email addresses in lowercase regardless of how the account was provisioned), `prisma.user.findUnique({ where: { email } })` returns no row. Because `RESET-03` always returns the same generic 200 message to prevent enumeration, the user receives no error and no email — the feature fails silently with no way to detect it happened.

**Fix:**
Normalize email consistently everywhere it is read/written, not just in the new self-service paths:
```ts
// packages/shared/src/schemas/auth.ts
export const PasswordResetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email('Valid email address required.'),
})

// admin.ts — POST /invites
const parsed = z
  .object({ email: z.string().trim().toLowerCase().email() })
  .safeParse(body)
```
Consider also adding a case-insensitive unique index (e.g. `citext` extension or a generated lowercase column with a unique constraint) as defense in depth, since application-layer normalization alone cannot retroactively fix already-diverged rows.

### CR-02: PATCH /api/admin/users/:id allows demoting the last admin — no guard, unlike DELETE

**File:** `apps/backend/src/routes/admin.ts:31-101`
**Issue:** `DELETE /api/admin/users/:id` explicitly protects against removing the last active admin (`admin.ts:146-151`, guarded atomically inside a transaction). `PATCH /api/admin/users/:id` has no equivalent check for role changes. The only self-protection implemented is for `isActive === false` (line 63-65):
```ts
if (id === authenticatedUserId && body.isActive === false) {
  return c.json({ error: 'Cannot deactivate your own account.' }, 400)
}
```
There is no check preventing an admin (in particular the sole remaining admin) from calling `PATCH /users/:id` on their own account with `{ role: 'USER' }`. Since role assignment (lines 74-75) has no admin-count check at all, this is a straightforward, reachable path to a fully admin-less instance — with no undo short of direct database access. This directly contradicts the invariant the DELETE handler was built to protect ("D-08: Last-admin guard... closes the TOCTOU race window").
**Fix:** Add the same guard used for deletion, ideally re-using one atomic check:
```ts
if (body.role === 'USER' && existing.role === 'ADMIN') {
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } })
  if (adminCount <= 1) {
    return c.json({ error: 'LAST_ADMIN' }, 400)
  }
}
```
placed after `existing` is fetched, and ideally inside a transaction (mirroring the DELETE handler) to close the same TOCTOU window that DELETE already accounts for.

## Warnings

### WR-01: Email validation logic is duplicated three times instead of using one shared schema

**File:** `apps/backend/src/routes/admin.ts:55`, `packages/shared/src/schemas/user.ts:31-38`, `packages/shared/src/schemas/user.ts:44`
**Issue:** The exact same validation chain (`trim → toLowerCase → email`) is defined independently in three places:
1. `UpdateEmailSchema.email` (`user.ts:32-36`)
2. `UpdateMeSchema.email` (`user.ts:44`) — a near-identical copy-paste of (1) rather than reuse
3. `admin.ts:55` — `z.string().trim().toLowerCase().email().safeParse(body.email)`, built inline instead of importing `UpdateEmailSchema` from `@kartex/shared`

This contradicts the project's own stated convention ("packages/shared is the single source of truth for all data types... no type drift possible"). If validation rules change later (e.g. a max length, a disposable-domain blocklist), it is easy to update only one or two of the three copies and leave the third inconsistent.
**Fix:** Define the email field once and reuse it:
```ts
// user.ts
const emailField = z.string().trim().toLowerCase().email('Valid email address required.')
export const UpdateEmailSchema = z.object({ email: emailField })
export const UpdateMeSchema = z.object({
  studyMode: StudyModeSchema.optional(),
  email: emailField.optional(),
}).refine(...)
```
and have `admin.ts` import `UpdateEmailSchema` (or a shared `emailField`) instead of re-declaring the chain inline.

### WR-02: Unhandled Prisma P2002 error when two invites target the same email

**File:** `apps/backend/src/routes/auth.ts:75-100`, `apps/backend/src/routes/admin.ts:254-310`
**Issue:** `POST /admin/invites` has no check for an existing invite (or existing user) with the same email, so an admin can create two separate valid `InviteToken` rows for one address (e.g. re-sending an invite). If the first is redeemed and the resulting user is created, redeeming the second later hits the `User.email` unique constraint inside the registration transaction. The `catch` block in `auth.ts:95-100` only recognizes `'TOKEN_CONSUMED'` and `'USERNAME_TAKEN'`:
```ts
} catch (err) {
  const msg = (err as Error).message
  if (msg === 'TOKEN_CONSUMED') return c.json({ error: 'ALREADY_USED' }, 400)
  if (msg === 'USERNAME_TAKEN') return c.json({ error: 'USERNAME_TAKEN' }, 409)
  throw err
}
```
A `Prisma.PrismaClientKnownRequestError` with code `P2002` on `email` falls through to `throw err`, producing an unhandled 500 instead of a clean error response — the same pattern that `admin.ts:96-98` and `auth.ts:277-279` correctly handle for the other two email-write routes.
**Fix:**
```ts
if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
  return c.json({ error: 'EMAIL_TAKEN' }, 409)
}
```
(requires importing `Prisma` from `@prisma/client` in `auth.ts`, which is already done for other purposes).

### WR-03: Backend test files provide almost no real coverage for the exact behaviors under review

**File:** `apps/backend/src/routes/__tests__/admin-email.test.ts:8-13`, `apps/backend/src/routes/__tests__/auth-me.test.ts:29-38`
**Issue:** `admin-email.test.ts` consists entirely of four `it.todo(...)` stubs — none of them execute any assertion. `auth-me.test.ts` has only two real, executable tests (schema-level normalization), and five `it.todo(...)` stubs covering exactly the security/correctness-sensitive behaviors this phase introduces: `EMAIL_TAKEN` 409 handling, admin-only reachability, and the PATCH `/me` happy path. Because `it.todo` reports as passing/skipped in CI, these files create the appearance of coverage for the uniqueness-conflict and access-control behavior discussed in CR-01/CR-02 above, when in fact none of it is verified at the route level.
**Fix:** Either implement the described route tests with `vi.mock('../../../lib/prisma.js')` as the file comments themselves say is the intended next step, or remove the misleading `it.todo` placeholders and track the gap explicitly outside of the test suite so CI green doesn't imply this is covered.

### WR-04: AdminPage.tsx duplicates the shared User type instead of importing it

**File:** `apps/frontend/src/pages/AdminPage.tsx:65-72`
**Issue:**
```ts
interface UserRecord {
  id: string
  username: string
  email?: string | null
  role: 'ADMIN' | 'USER'
  isActive: boolean
  createdAt: string
}
```
This hand-rolled interface duplicates the shape already defined by `UserResponseSchema`/`User` in `packages/shared/src/schemas/user.ts`, which the project's CLAUDE.md explicitly designates as "the single source of truth for all data types... no type drift possible." Because it's a separate local type, any future change to the shared schema (e.g. a new required field) will not be caught by the type checker here, defeating the purpose of the shared-schema architecture.
**Fix:** Import and reuse (or `Pick<>` from) the shared type, e.g. `Pick<User, 'id' | 'username' | 'email' | 'role' | 'isActive' | 'createdAt'>` from `@kartex/shared`.

## Info

### IN-01: `InviteTokenResponse` imported as a value instead of `import type`

**File:** `apps/frontend/src/pages/AdminPage.tsx:60`
**Issue:** `import { InviteTokenResponse, UpdateEmailSchema } from '@kartex/shared'` imports `InviteTokenResponse` — a type-only export — without the `type` modifier, while the same file elsewhere correctly uses `import type { UpdateEmailInput } from '@kartex/shared'` (line 59). It works today only because Vite's esbuild transform can statically determine the import is unused as a value and elides it; this is fragile and inconsistent with the rest of the file.
**Fix:** `import type { InviteTokenResponse } from '@kartex/shared'` and keep `UpdateEmailSchema` (a runtime value) as a separate value import.

### IN-02: Inconsistent URL construction style

**File:** `apps/frontend/src/pages/AdminPage.tsx:365`
**Issue:** `api.post('/api/admin/users/' + id + '/reset-password', {})` uses string concatenation, while the rest of the file (and this same function's neighbors) consistently use template literals, e.g. `` api.patch(`/api/admin/users/${id}`, ...) ``.
**Fix:** `` api.post(`/api/admin/users/${id}/reset-password`, {}) ``.

---

_Reviewed: 2026-07-02T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
