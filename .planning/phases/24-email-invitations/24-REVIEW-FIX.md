---
phase: 24-email-invitations
fixed_at: 2026-06-28T15:00:00Z
review_path: .planning/phases/24-email-invitations/24-REVIEW.md
iteration: 1
fix_scope: critical_warning
findings_in_scope: 12
fixed: 12
skipped: 0
status: all_fixed
---

# Phase 24: Code Review Fix Report

**Fixed at:** 2026-06-28T15:00:00Z
**Source review:** .planning/phases/24-email-invitations/24-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 12 (2 Critical, 10 Warning)
- Fixed: 12
- Skipped: 0

**Verification note:** Backend typecheck (`@kartex/backend`) has pre-existing errors unrelated to these fixes — `prisma.inviteToken` is not yet in the generated Prisma client types because `prisma generate` has not been run after the `InviteToken` model was added to `schema.prisma`. This is a pre-existing condition (visible on `main` before any fix was applied). CR-01 provides the missing `url` field required to run `prisma generate` successfully. Backend fixes used Tier 1 (re-read) verification. Frontend and shared package fixes used Tier 2 (typecheck passed clean).

---

## Fixed Issues

### CR-01: Missing `url` in Prisma datasource block

**Files modified:** `apps/backend/prisma/schema.prisma`
**Commit:** bb9b7f6
**Applied fix:** Added `url = env("DATABASE_URL")` to the `datasource db` block. Without this field, `prisma generate`, `prisma migrate dev`, and `prisma db push` all fail schema validation.

---

### CR-02: TOCTOU race in last-admin guard

**Files modified:** `apps/backend/src/routes/admin.ts`
**Commit:** 84f4f14
**Applied fix:** Removed the standalone `prisma.user.count()` call and the early-return guard that preceded the transaction. Converted the batch `$transaction([...])` to an interactive `$transaction(async (tx) => {...})` and placed the admin count check as the first operation inside the transaction callback. A custom error with `code: 'LAST_ADMIN'` is thrown to abort the transaction and is caught in an outer try/catch to return the 400 response. This closes the race window between the count read and the delete.

---

### WR-01: JWT payload claims cast `as string` without runtime validation

**Files modified:** `apps/backend/src/middleware/auth.ts`
**Commit:** aa03cc1
**Applied fix:** Replaced the unsafe `payload.sub as string` and `payload.role as string` casts with runtime `typeof` checks. If either `sub` or `role` is not a `string`, the middleware returns 401 instead of propagating `undefined` typed as `string` to downstream handlers.

---

### WR-02: TOCTOU-safe transaction does not check `expiresAt`

**Files modified:** `apps/backend/src/routes/auth.ts`
**Commit:** a1f1e04
**Applied fix:** Added `expiresAt: { gt: new Date() }` to the `updateMany` WHERE clause in the registration transaction. This closes the window where a token that expires between the pre-check and the transaction execution could still be consumed to create a user account.

---

### WR-03: Non-atomic refresh token rotation

**Files modified:** `apps/backend/src/routes/auth.ts`
**Commit:** 4cd726b
**Applied fix:** Moved `signToken` and `bcrypt.hash` before the transaction (since they're async operations not needing DB), then wrapped `refreshToken.deleteMany` and `refreshToken.create` in a single batch `$transaction([...])`. If `create` fails, the `deleteMany` is also rolled back, preserving the existing session.

---

### WR-04: SMTP not-configured error uses human-readable sentence

**Files modified:** `apps/backend/src/routes/admin.ts`, `apps/frontend/src/pages/AdminPage.tsx`
**Commit:** 6f72bc3
**Applied fix:** Both SMTP-not-configured return points in `admin.ts` (POST /invites and POST /mailer/test) now return `{ error: 'SMTP_NOT_CONFIGURED' }` instead of `{ error: 'SMTP not configured.' }`. The frontend `handleSendInvite` discriminator was updated from the sentence string to the machine code `'SMTP_NOT_CONFIGURED'`. Frontend typecheck passed.

---

### WR-05: Raw nodemailer exception message leaked to client

**Files modified:** `apps/backend/src/routes/admin.ts`, `apps/frontend/src/pages/AdminPage.tsx`
**Commit:** 1a02d78
**Applied fix:** In the POST /mailer/test catch block, replaced `return c.json({ error: (err as Error).message })` with `console.error(...)` followed by `return c.json({ error: 'SMTP_ERROR' }, 500)`. Also updated `MailerSection.handleTestEmail` in AdminPage.tsx to explicitly handle `SMTP_NOT_CONFIGURED` and `SMTP_ERROR` codes from the test endpoint (previously only `NO_EMAIL` was handled). Frontend typecheck passed.

---

### WR-06: `sendMail` rollback can orphan an invite token

**Files modified:** `apps/backend/src/routes/admin.ts`
**Commit:** bbcffa8
**Applied fix:** Wrapped the `prisma.inviteToken.delete` rollback call in its own try/catch inside the outer catch block. If the cleanup delete itself throws (DB connectivity blip, record already gone), the secondary error is logged separately and execution continues to return the `SMTP_ERROR` 500 response. This prevents the cleanup exception from propagating and masking the original delivery failure.

---

### WR-07: Delete confirmation button enabled when `deleteTarget` is `undefined`

**Files modified:** `apps/frontend/src/pages/AdminPage.tsx`
**Commit:** 07487f5
**Applied fix:** Changed `disabled={usernameInput !== (deleteTarget?.username ?? '')}` to `disabled={!deleteTarget || usernameInput !== deleteTarget.username}`. When `deleteTarget` is `undefined` (stale list / pre-load race), the button is now always disabled regardless of input value, requiring a resolved target before the destructive action can proceed. Frontend typecheck passed.

---

### WR-08: `InviteToken` response type defined locally in `AdminPage.tsx`

**Files modified:** `packages/shared/src/schemas/inviteToken.ts` (new), `packages/shared/src/index.ts`, `apps/frontend/src/pages/AdminPage.tsx`
**Commit:** 94eeb19
**Applied fix:** Created `packages/shared/src/schemas/inviteToken.ts` with `InviteTokenResponseSchema` (Zod schema) and `InviteTokenResponse` (inferred type). Exported it from `packages/shared/src/index.ts`. Removed the local `InviteToken` interface from `AdminPage.tsx` and replaced with the shared `InviteTokenResponse` type imported from `@kartex/shared`. The `useState<InviteToken[]>` was updated to `useState<InviteTokenResponse[]>`. Frontend and shared typecheck passed.

---

### WR-09: Submit error handler does not handle `EXPIRED`

**Files modified:** `apps/frontend/src/pages/InviteRegisterPage.tsx`
**Commit:** c600c92
**Applied fix:** Added an `else if (err === 'EXPIRED')` branch in `onSubmit` that shows `t('auth.inviteExpired')`. This covers the realistic scenario where a user fills out the form over several minutes and submits after the 7-day token expires — they now receive actionable feedback instead of the generic "Something went wrong" message. Frontend typecheck passed.

---

### WR-10: `APP_URL` fallback silently sends broken invite links

**Files modified:** `apps/backend/src/routes/admin.ts`
**Commit:** cb6256d
**Applied fix:** Removed the `?? 'http://localhost:3000'` fallback. When `APP_URL` is not set, the handler logs an error and returns `{ error: 'SERVER_MISCONFIGURED' }` with HTTP 500 before creating the invite token or sending the email. This gives the admin a clear failure signal instead of silently delivering a dead localhost link.

---

_Fixed: 2026-06-28T15:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
