---
phase: 24-email-invitations
reviewed: 2026-06-28T14:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - apps/backend/prisma/schema.prisma
  - packages/shared/src/schemas/auth.ts
  - packages/shared/src/index.ts
  - apps/backend/src/routes/invites.ts
  - apps/backend/src/routes/auth.ts
  - apps/backend/src/routes/admin.ts
  - apps/backend/src/index.ts
  - apps/backend/src/lib/mailer.ts
  - apps/backend/src/lib/seed.ts
  - apps/backend/src/middleware/auth.ts
  - apps/frontend/src/pages/InviteRegisterPage.tsx
  - apps/frontend/src/pages/AdminPage.tsx
  - apps/frontend/src/App.tsx
  - apps/frontend/src/locales/en.json
  - apps/frontend/src/locales/de.json
  - apps/backend/src/routes/__tests__/admin-delete.test.ts
  - apps/backend/src/routes/__tests__/admin-mailer.test.ts
  - apps/backend/src/middleware/__tests__/auth-public-paths.test.ts
  - apps/frontend/src/pages/__tests__/AdminPage.test.tsx
  - apps/frontend/src/pages/__tests__/InviteRegisterPage.test.tsx
findings:
  critical: 2
  warning: 10
  info: 7
  total: 19
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-06-28T14:00:00Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Phase 24 implements invite-token-based user registration across the full stack: an `InviteToken` Prisma model replacing `InviteCode`, a TOCTOU-safe atomic registration handler, a public token validation route, admin invite management endpoints with SMTP delivery, and matching frontend pages with i18n. The overall architecture is sound — the 256-bit CSPRNG token generation is correct, the Zod email validation prevents header injection, and the registration transaction correctly guards concurrent dual-use via `usedAt: null`.

Two blockers are present: the Prisma datasource block is missing the required `url` field (breaks any fresh deployment or CI run), and the last-admin guard in `DELETE /users/:id` is susceptible to a TOCTOU race that can leave the instance with zero active admins. Among the warnings, the most security-relevant are unchecked JWT payload claims in `authMiddleware` and the non-atomic refresh token rotation that can permanently invalidate a user session. Several quality issues include a human-readable error string used as a machine-readable discriminator, a missing expiry check in the TOCTOU-safe transaction, and an always-enabled delete confirmation button when the target user cannot be found in local state.

---

## Structural Findings (fallow)

No structural pre-pass findings were provided for this phase.

---

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Missing `url` in Prisma datasource block — breaks fresh deployment and migrations

**File:** `apps/backend/prisma/schema.prisma:5-7`

**Issue:** The datasource block specifies only `provider` and has no `url` field. Prisma requires `url` in the datasource block; without it `prisma generate`, `prisma migrate dev`, and `prisma db push` all fail with a validation error. Any fresh checkout, Docker build, or CI pipeline that runs Prisma CLI commands will fail at schema validation. Existing locally-generated artefacts mask this.

**Fix:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

### CR-02: TOCTOU race in last-admin guard — concurrent deletes can leave zero active admins

**File:** `apps/backend/src/routes/admin.ts:101-134`

**Issue:** `adminCount` is read with a standalone `prisma.user.count()` outside the delete transaction. If two concurrent DELETE requests each target one of the last two active admins, both reads see `adminCount = 2`, both guards pass, both deletions proceed, and the instance is left with no admin account. Recovery requires direct database access.

```typescript
// CURRENT — count and delete are not atomic:
const adminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } })
if (adminCount <= 1 && target.role === 'ADMIN') {
  return c.json({ error: 'LAST_ADMIN' }, 400)
}
// ... then prisma.$transaction([...])  ← race window lives here
```

**Fix:** Move the guard inside an interactive `$transaction`:
```typescript
try {
  await prisma.$transaction(async (tx) => {
    if (target.role === 'ADMIN') {
      const adminCount = await tx.user.count({ where: { role: 'ADMIN', isActive: true } })
      if (adminCount <= 1) {
        throw Object.assign(new Error('LAST_ADMIN'), { code: 'LAST_ADMIN' })
      }
    }
    await tx.refreshToken.deleteMany({ where: { userId: id } })
    await tx.deckShare.deleteMany({ where: { sharedWithUserId: id } })
    await tx.cardProgress.deleteMany({ where: { userId: id } })
    await tx.card.deleteMany({ where: { deckId: { in: deckIds } } })
    await tx.deck.deleteMany({ where: { ownerId: id } })
    await tx.media.deleteMany({ where: { ownerId: id } })
    await tx.user.delete({ where: { id } })
  })
} catch (err) {
  if ((err as { code?: string }).code === 'LAST_ADMIN') {
    return c.json({ error: 'LAST_ADMIN' }, 400)
  }
  throw err
}
```

---

## Warnings

### WR-01: JWT payload claims cast `as string` without runtime validation — silent undefined propagation

**File:** `apps/backend/src/middleware/auth.ts:44-45`

**Issue:** `verifyToken` returns `JWTPayload` from the jose library. `sub` is typed `string | undefined`; `role` is an ad-hoc claim typed as `unknown`. The middleware casts both without runtime checks:

```typescript
c.set('userId', payload.sub as string)   // sub is string | undefined
c.set('role', payload.role as string)    // role is unknown
```

If a validly-signed JWT omits `sub` or `role` (e.g., a token created by an older code path), `c.get('userId')` in downstream handlers returns `undefined` typed as `string`. In `admin.ts`, the self-delete guard (`id === authenticatedUserId`) silently evaluates `false` when comparing a real id against `undefined`, bypassing the guard. The `requireAdmin` middleware still blocks with a 403 (not 401), but the failure surface is broader than intended.

**Fix:**
```typescript
const sub = payload.sub
const role = payload.role
if (typeof sub !== 'string' || typeof role !== 'string') {
  return c.json({ error: 'Unauthorized.' }, 401)
}
c.set('userId', sub)
c.set('role', role)
```

---

### WR-02: TOCTOU-safe transaction does not check `expiresAt` — expired token can be consumed

**File:** `apps/backend/src/routes/auth.ts:75-79`

**Issue:** The registration transaction's atomic WHERE clause is:
```typescript
where: { token, usedAt: null }
```
It guards against concurrent dual-registration but does not include `expiresAt: { gt: new Date() }`. The pre-check at lines 65-67 does check expiry, but the comment at line 57 explicitly acknowledges the pre-check is "not TOCTOU-safe — purely for UX." A token that passes the pre-check and then expires in the microseconds before the transaction executes will still be marked used and a user account will be created for an expired invite.

**Fix:** Add the expiry guard to the transaction WHERE clause:
```typescript
const result = await tx.inviteToken.updateMany({
  where: { token, usedAt: null, expiresAt: { gt: new Date() } },
  data: { usedAt: new Date() },
})
if (result.count === 0) throw new Error('TOKEN_CONSUMED')
```
If the transaction should distinguish `ALREADY_USED` from `EXPIRED`, use a separate `findUnique` inside the transaction before the `updateMany`.

---

### WR-03: Non-atomic refresh token rotation — if `create` fails after `delete`, session is permanently lost

**File:** `apps/backend/src/routes/auth.ts:203-218`

**Issue:** Token rotation deletes the old record first (line 204), then creates the new one (lines 210-216). If `create` fails — transient DB error, constraint violation, etc. — the old token is already gone, `setAuthCookies` is never reached, and the cookie in the browser holds a token with no matching DB row. The user's session is silently invalidated; they must re-authenticate with username and password.

**Fix:** Wrap the delete and create in a `$transaction`:
```typescript
const newTokenHash = await bcrypt.hash(newRawRefreshToken, 10)
await prisma.$transaction([
  prisma.refreshToken.deleteMany({ where: { id: matchedToken.id } }),
  prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  }),
])
setAuthCookies(c, accessToken, newRawRefreshToken)
```

---

### WR-04: SMTP not-configured error uses a human-readable sentence, not a machine code

**File:** `apps/backend/src/routes/admin.ts:175` / `apps/frontend/src/pages/AdminPage.tsx:142`

**Issue:** The backend returns `{ error: 'SMTP not configured.' }` — a natural-language sentence — while the frontend discriminates it by exact string match:
```typescript
// AdminPage.tsx:142
if (errCode === 'SMTP not configured.') {
  toast.error(t('admin.inviteSMTPMissing'))
}
```
Every other discriminated error in the codebase uses a short machine code (`SMTP_ERROR`, `NO_EMAIL`, `SELF_DELETE`, `LAST_ADMIN`). If the backend message is rephrased, the frontend silently falls through to `inviteSendError` — giving the admin incorrect guidance ("Check the SMTP settings") rather than the correct guidance ("SMTP is not configured — contact the server administrator").

**Fix:** Replace the sentence with a code in both the POST /invites (line 175) and POST /mailer/test (line 249) handlers, and update the frontend:
```typescript
// admin.ts:
return c.json({ error: 'SMTP_NOT_CONFIGURED' }, 400)

// AdminPage.tsx:
if (errCode === 'SMTP_NOT_CONFIGURED') {
  toast.error(t('admin.inviteSMTPMissing'))
}
```

---

### WR-05: Raw exception message from nodemailer leaked to client in POST `/api/admin/mailer/test`

**File:** `apps/backend/src/routes/admin.ts:261`

**Issue:**
```typescript
return c.json({ error: (err as Error).message }, 500)
```
Nodemailer error messages include internal network details: SMTP server hostname and port, `connect ECONNREFUSED 10.0.0.5:587`, TLS negotiation errors, authentication failure strings. Even though this endpoint is admin-only, surfacing raw exception text exposes internal network topology and potentially SMTP credentials in browser devtools and client logs, and contradicts the structured error-code pattern used everywhere else.

**Fix:**
```typescript
} catch (err) {
  console.error('[admin] Mailer test failed:', (err as Error).message)
  return c.json({ error: 'SMTP_ERROR' }, 500)
}
```
Update the frontend `MailerSection` to handle `SMTP_ERROR` from the test endpoint (currently it maps only `NO_EMAIL`).

---

### WR-06: `sendMail` rollback can orphan an invite token if the cleanup `delete` also throws

**File:** `apps/backend/src/routes/admin.ts:197-202`

**Issue:**
```typescript
} catch (err) {
  await prisma.inviteToken.delete({ where: { id: invite.id } })  // can throw
  console.error(...)
  return c.json({ error: 'SMTP_ERROR' }, 500)
}
```
If `sendMail` throws and then `prisma.inviteToken.delete` also throws (DB connectivity blip, record already deleted), the inner exception propagates unhandled. The invite row survives in the database — valid and unused — but no email was ever sent. An admin would see a pending invite that was never delivered with no indication of the failure.

**Fix:** Wrap the rollback delete in its own try/catch:
```typescript
} catch (err) {
  try {
    await prisma.inviteToken.delete({ where: { id: invite.id } })
  } catch (cleanupErr) {
    console.error('[admin] Failed to rollback orphaned invite token:', (cleanupErr as Error).message)
  }
  console.error('[admin] Invite email delivery failed:', (err as Error).message)
  return c.json({ error: 'SMTP_ERROR' }, 500)
}
```

---

### WR-07: Delete confirmation button is enabled with empty input when `deleteTarget` is `undefined`

**File:** `apps/frontend/src/pages/AdminPage.tsx:493`

**Issue:**
```tsx
disabled={usernameInput !== (deleteTarget?.username ?? '')}
```
`deleteTarget = users.find(u => u.id === deleteTargetId)`. If `deleteTargetId` is set but the user is not found in local state (stale list, pre-load race), `deleteTarget` is `undefined`. The expression becomes `disabled={usernameInput !== ''}`. With the initial `usernameInput === ''`, `disabled` evaluates to `false` — the "Delete permanently" button is immediately clickable with an empty input field, bypassing the typing confirmation for any unresolvable target.

**Fix:**
```tsx
disabled={!deleteTarget || usernameInput !== deleteTarget.username}
```

---

### WR-08: `InviteToken` response type is defined locally in `AdminPage.tsx` — drift risk at API boundary

**File:** `apps/frontend/src/pages/AdminPage.tsx:43-48`

**Issue:** `InviteToken` is a local interface defined only in `AdminPage.tsx`. The backend selects `{ id, email, expiresAt, createdAt }` inline (admin.ts:183-184) without a shared schema. `packages/shared/src/index.ts` exports nothing for invite token responses. If the backend renames or adds a field, TypeScript cannot catch the mismatch at the API boundary.

**Fix:** Add an authoritative schema to the shared package:
```typescript
// packages/shared/src/schemas/inviteToken.ts
import { z } from 'zod'
export const InviteTokenResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  expiresAt: z.string(),
  createdAt: z.string(),
})
export type InviteTokenResponse = z.infer<typeof InviteTokenResponseSchema>
```
Export from `packages/shared/src/index.ts` and import in `AdminPage.tsx` (replacing the local interface) and in `admin.ts` to type-check the `select` shape.

---

### WR-09: Submit error handler in `InviteRegisterPage` does not handle `EXPIRED` — falls to generic toast

**File:** `apps/frontend/src/pages/InviteRegisterPage.tsx:97-108`

**Issue:**
```typescript
if (err === 'ALREADY_USED') {
  toast.error(t('auth.inviteAlreadyUsed'))
} else {
  toast.error(t('common.somethingWrong'))  // EXPIRED falls here
}
```
A realistic scenario: the user opens the invite page (token is valid), fills out the form over several minutes, and submits after the 7-day token expires. The backend pre-check returns `EXPIRED` (400), but the frontend shows "Something went wrong. Please try again." — an unhelpful message for a foreseeable and actionable error.

**Fix:**
```typescript
if (err === 'ALREADY_USED') {
  toast.error(t('auth.inviteAlreadyUsed'))
} else if (err === 'EXPIRED') {
  toast.error(t('auth.inviteExpired'))
} else {
  toast.error(t('common.somethingWrong'))
}
```

---

### WR-10: `APP_URL` fallback silently sends broken invite links in production

**File:** `apps/backend/src/routes/admin.ts:187-188`

**Issue:**
```typescript
const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
const inviteLink = `${appUrl}/invite/${token}`
```
If `APP_URL` is not configured in a production deployment, every invite email contains a `http://localhost:3000/invite/<token>` link. The admin sees a 200 success response; the invitee receives a dead link. No error is surfaced anywhere in the delivery path.

**Fix:** Fail explicitly when `APP_URL` is absent rather than silently producing a broken link:
```typescript
const appUrl = process.env.APP_URL
if (!appUrl) {
  console.error('[admin] APP_URL env var is not set — cannot generate invite link')
  return c.json({ error: 'SERVER_MISCONFIGURED' }, 500)
}
const inviteLink = `${appUrl}/invite/${token}`
```

---

## Info

### IN-01: Stale legacy i18n keys from the old `InviteCode` implementation remain in both locale files

**File:** `apps/frontend/src/locales/en.json` and `apps/frontend/src/locales/de.json`

**Issue:** The following keys are no longer referenced by any component after `InviteCodesSection` was removed in plan 07, but survive in both locale files: `admin.inviteCodesTitle`, `admin.inviteCodesDesc`, `admin.expiryDaysLabel`, `admin.generating`, `admin.generate`, `admin.noInviteCodes`, `admin.inviteGenerated`, `admin.inviteDeleted`, `table.codeColumn`, `table.usedByColumn`. They add noise and risk confusion with the new `admin.inviteTokensTitle` and `admin.inviteColExpires` keys that replaced them.

**Fix:** Remove the listed keys from both locale files.

---

### IN-02: Dead code branch in `handleSendInvite` — `SMTP_ERROR` and `else` branches are identical

**File:** `apps/frontend/src/pages/AdminPage.tsx:144-148`

**Issue:**
```typescript
} else if (errCode === 'SMTP_ERROR') {
  toast.error(t('admin.inviteSendError'))   // same as else
} else {
  toast.error(t('admin.inviteSendError'))   // identical
}
```
The explicit `SMTP_ERROR` branch and the catch-all `else` branch show the same toast. The only distinctly handled case is `'SMTP not configured.'`. The `SMTP_ERROR` branch is functionally unreachable — it does nothing the `else` does not already do. Either give `SMTP_ERROR` a distinct message or collapse both into the `else`.

---

### IN-03: Structural assertion tests are tautologies that always pass

**File:** `apps/backend/src/routes/__tests__/admin-delete.test.ts:25-59`

**Issue:** Four tests in the file use `expect(true).toBe(true)` or compare a string constant to itself:
```typescript
it('ReviewLog schema has onDelete: Cascade on userId...', () => {
  expect(true).toBe(true)   // always passes
})
it('DELETE handler uses SELF_DELETE error code...', () => {
  const selfDeleteCode = 'SELF_DELETE'
  expect(selfDeleteCode).toBe('SELF_DELETE')  // tautology
})
```
These pass unconditionally. A schema change removing `onDelete: Cascade` or a handler change modifying the error code would not be detected. The numerous `it.todo` stubs are correctly labelled; the issue is these four tests produce misleading green CI signals.

**Fix:** Convert them to `it.todo` to remove the false assurance, or replace with real assertions against the schema DMMF or handler integration tests.

---

### IN-04: `fetchTokens` and `fetchUsers` swallow all errors silently — empty list is indistinguishable from fetch failure

**File:** `apps/frontend/src/pages/AdminPage.tsx:120-124` and `262-265`

**Issue:**
```typescript
} catch {
  // silently ignore fetch errors on load
}
```
A network failure or a 500 from the server leaves the admin with an empty table that looks identical to "no records exist." The admin cannot distinguish between a successful empty result and a broken request, which is particularly misleading in the user management context.

**Fix:**
```typescript
} catch {
  toast.error(t('common.somethingWrong'))
}
```

---

### IN-05: Media files are unlinked from disk before the database transaction commits

**File:** `apps/backend/src/routes/admin.ts:108-134`

**Issue:** `unlink()` is called for each media file before `prisma.$transaction([...])` begins at line 126. If the transaction subsequently fails (edge-case FK violation, connection drop), the files have been deleted from disk but the `Media` rows survive in the database — orphaned records pointing to non-existent paths. The D-07 "best-effort" comment applies to individual `unlink` failures within the loop, not to the overall ordering relative to the transaction commit.

**Fix:** Execute the database transaction first; clean up files only after it commits successfully:
```typescript
// 1. Atomic DB deletion first
await prisma.$transaction([...])

// 2. Best-effort file cleanup after commit
for (const m of mediaRecords) {
  try { await unlink(m.storagePath) } catch (err) {
    console.warn(`[admin] Could not delete media file ${m.storagePath}:`, (err as Error).message)
  }
}
```

---

### IN-06: Escape-key handler on unfocused `<span>` is dead code

**File:** `apps/frontend/src/pages/AdminPage.tsx:404-408`

**Issue:**
```tsx
<span
  role="alert"
  onKeyDown={handleConfirmKeyDown}   // only fires if span is focused
  tabIndex={-1}
>
```
`tabIndex={-1}` means the span cannot receive focus via keyboard navigation and is never auto-focused when it appears. `onKeyDown` only fires on the currently focused element. In practice, the Escape key handler never fires during normal interaction — Escape dismissal of the deactivation confirmation does not work.

**Fix:** Remove the handler (the Cancel button covers dismiss). If Escape dismissal is desired, either programmatically focus the span when it appears (`useEffect(() => spanRef.current?.focus(), [confirmDeactivateId])`) or use a `<dialog>` element which provides built-in Escape handling.

---

### IN-07: `Media` model has no `@relation` to `User` — missing database-level FK constraint on `ownerId`

**File:** `apps/backend/prisma/schema.prisma:142-150`

**Issue:** `Media.ownerId` is a plain `String` with no Prisma relation definition. Prisma does not emit a foreign key constraint for it. The explicit cascade delete in `admin.ts` compensates at the application layer, but any code path that deletes a user outside of `admin.ts` (direct SQL, a future endpoint) would leave orphaned Media rows.

**Fix:** Add a formal relation to enforce the FK at the database level:
```prisma
model Media {
  id          String   @id @default(cuid())
  ownerId     String
  owner       User     @relation(fields: [ownerId], references: [id])
  ...
}
```
Add `media Media[]` to the `User` model. Alternatively, add `onDelete: Cascade` to remove media automatically when the user is deleted (simplifying the admin delete handler).

---

_Reviewed: 2026-06-28T14:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
