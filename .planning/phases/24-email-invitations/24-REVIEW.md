---
phase: 24-email-invitations
reviewed: 2026-06-27T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - apps/backend/prisma/migrations/20260625000000_replace_invite_code_with_invite_token/migration.sql
  - apps/backend/prisma/schema.prisma
  - apps/backend/src/index.ts
  - apps/backend/src/lib/seed.ts
  - apps/backend/src/routes/admin.ts
  - apps/backend/src/routes/auth.ts
  - apps/backend/src/routes/invites.ts
  - apps/frontend/src/App.tsx
  - apps/frontend/src/locales/de.json
  - apps/frontend/src/locales/en.json
  - apps/frontend/src/pages/AdminPage.tsx
  - apps/frontend/src/pages/InviteRegisterPage.tsx
  - apps/frontend/src/pages/__tests__/AdminPage.test.tsx
  - apps/frontend/src/pages/__tests__/InviteRegisterPage.test.tsx
  - packages/shared/src/schemas/auth.ts
findings:
  critical: 1
  warning: 6
  info: 4
  total: 11
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-06-27T00:00:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Phase 24 implements email-based invite registration, replacing the prior invite-code system. The TOCTOU-safe atomic token consumption pattern inside a Prisma interactive transaction is correctly designed, and the 256-bit CSPRNG token is appropriate. The route registration order (public invite route before authMiddleware) is correct. The frontend gracefully handles each error state with distinct messages.

One blocker exists: the registration transaction does not handle the case where two invite tokens are sent to the same email address and both are redeemed; the resulting Prisma unique-constraint violation bubbles out as an uncaught 500. Six warnings cover a missing duplicate-email guard, a fragile backend error-code comparison, a non-standard Prisma datasource block, absent rate-limiting on the public validate endpoint, raw SMTP exception forwarding, and a missing bcrypt length cap. Four informational items cover stale i18n keys, incorrect HTTP status, missing already-registered guard, and absent i18n test infrastructure.

---

## Critical Issues

### CR-01: Unhandled Prisma P2002 on email uniqueness during registration crashes with 500

**File:** `apps/backend/src/routes/auth.ts:73-95`

**Issue:** The `POST /auth/register` transaction calls `tx.user.create({ data: { ..., email: invite.email } })`. The `User.email` column has a `@unique` constraint. If an admin sends two invite tokens to the same email address (no guard prevents this — see WR-01) and both are redeemed:

1. First registration: succeeds.
2. Second registration with the second (still-valid) token: `tx.inviteToken.updateMany` marks the token used, `tx.user.findUnique({ where: { username } })` finds no conflict, then `tx.user.create` throws Prisma error P2002 ("Unique constraint failed on the fields: (`email`)").
3. The catch block only intercepts `'TOKEN_CONSUMED'` and `'USERNAME_TAKEN'`; a Prisma P2002 message matches neither, so `throw err` executes.
4. Hono's default handler returns a 500 with no user-facing message.
5. Because the transaction rolls back, the second invite token's `usedAt` is reset to `null` — the token remains valid and every subsequent registration attempt with it will also 500.

**Fix:** Add an email-already-registered check inside the transaction before `user.create`, and surface a distinct error code:

```typescript
// Inside the $transaction callback, after checking username uniqueness:
const emailOwner = await tx.user.findUnique({ where: { email: invite.email } })
if (emailOwner) throw new Error('EMAIL_REGISTERED')
```

Then in the catch block:
```typescript
if (msg === 'EMAIL_REGISTERED') return c.json({ error: 'EMAIL_REGISTERED' }, 409)
```

And return a meaningful message to the frontend (e.g., map `EMAIL_REGISTERED` → "An account with this email address already exists.").

---

## Warnings

### WR-01: No duplicate-email guard in `POST /api/admin/invites` — prerequisite for CR-01

**File:** `apps/backend/src/routes/admin.ts:158-203`

**Issue:** `POST /api/admin/invites` accepts any valid email address without checking (a) whether an active user with that email already exists, or (b) whether a pending invite for that email is already outstanding. An admin can accidentally flood a single address with multiple invite tokens, and any token redeemed after the first successful registration triggers the P2002 crash described in CR-01.

**Fix:** Before creating the invite token, reject with a meaningful error if the email is already in use:

```typescript
const existingUser = await prisma.user.findUnique({ where: { email } })
if (existingUser) {
  return c.json({ error: 'EMAIL_ALREADY_REGISTERED' }, 409)
}

const existingInvite = await prisma.inviteToken.findFirst({
  where: { email, usedAt: null, expiresAt: { gt: new Date() } },
})
if (existingInvite) {
  return c.json({ error: 'INVITE_ALREADY_PENDING' }, 409)
}
```

---

### WR-02: Fragile string comparison detects SMTP error by message text, not by code

**File:** `apps/frontend/src/pages/AdminPage.tsx:142`

**Issue:** The SMTP-not-configured path is detected by comparing the raw error *message* returned from the backend:

```typescript
if (errCode === 'SMTP not configured.') {
  toast.error(t('admin.inviteSMTPMissing'))
}
```

The backend returns `{ error: 'SMTP not configured.' }` (a human-readable string, not a code). If the backend message is updated or translated, this comparison silently falls through to `common.somethingWrong`, giving the admin no actionable guidance.

**Fix:** Change the backend to return a machine-readable code and update the frontend to match:

```typescript
// admin.ts
return c.json({ error: 'SMTP_NOT_CONFIGURED' }, 400)

// AdminPage.tsx
if (errCode === 'SMTP_NOT_CONFIGURED') {
  toast.error(t('admin.inviteSMTPMissing'))
}
```

The same pattern exists in `POST /mailer/test` (admin.ts line 246) and should be harmonised.

---

### WR-03: `datasource db` block in schema.prisma is missing the required `url` field

**File:** `apps/backend/prisma/schema.prisma:5-7`

**Issue:** The `datasource db` block contains only `provider = "postgresql"` with no `url` field:

```prisma
datasource db {
  provider = "postgresql"
}
```

Standard Prisma configuration requires `url = env("DATABASE_URL")`. Without it, `prisma generate`, `prisma migrate deploy`, and the Prisma client itself cannot determine the connection string from the schema. If the project relies solely on a `prisma.config.ts` for the URL (Prisma 5.14+ feature), the schema should document that; otherwise this is a misconfiguration that breaks all CLI commands and Docker-entrypoint migration runs.

**Fix:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

### WR-04: Public invite-validation endpoint has no rate limiting

**File:** `apps/backend/src/routes/invites.ts:15-31`

**Issue:** `GET /api/invites/:token` is registered before `authMiddleware` in `index.ts` (intentionally, so unauthenticated users can validate their token). However, unlike every auth route — which applies `rateLimitMiddleware(10, 60_000)` via `auth.use('*', ...)` — the invites public router has no rate-limiting middleware. Any client can enumerate request patterns against this endpoint without throttling.

While the 256-bit token space makes brute force computationally impossible, rate limiting is still appropriate as defense-in-depth and to prevent abuse of the email-disclosure side effect (a valid `GET` response reveals the invitee's email address).

**Fix:** Add rate limiting to the invites router:

```typescript
import { rateLimitMiddleware } from '../middleware/rateLimit.js'

invites.use('*', rateLimitMiddleware(10, 60_000))
```

---

### WR-05: Raw SMTP exception messages forwarded directly to HTTP clients

**File:** `apps/backend/src/routes/admin.ts:197-201, 256-261`

**Issue:** Both `POST /api/admin/invites` and `POST /api/admin/mailer/test` catch mailer errors and return the raw exception message to the HTTP caller:

```typescript
// Line 199-200
await prisma.inviteToken.delete({ where: { id: invite.id } })
return c.json({ error: (err as Error).message }, 500)

// Line 259-260
} catch (err) {
  return c.json({ error: (err as Error).message }, 500)
}
```

SMTP library exceptions frequently include the remote SMTP server's hostname, port, and authentication failure details. While these endpoints are admin-only, leaking infrastructure details in HTTP response bodies is undesirable and inconsistent with the project's non-leaking auth error pattern.

**Fix:** Log the full error server-side and return a generic, stable error code:

```typescript
} catch (err) {
  console.error('[admin] mailer error:', err)
  await prisma.inviteToken.delete({ where: { id: invite.id } })
  return c.json({ error: 'MAIL_SEND_FAILED' }, 500)
}
```

---

### WR-06: Password field has no maximum length — bcrypt silently truncates at 72 bytes

**File:** `packages/shared/src/schemas/auth.ts:19`

**Issue:** `RegisterSchema` enforces `password: z.string().min(8, ...)` with no upper bound. bcrypt truncates input at 72 bytes before hashing. A user who sets a password longer than 72 characters would have their credentials accepted, but any password sharing the same first 72 bytes would also authenticate successfully. This is a subtle but provable authentication bypass for affected accounts (different passwords accepted as equivalent).

**Fix:**
```typescript
password: z.string().min(8, 'Password must be at least 8 characters.').max(72, 'Password must be at most 72 characters.'),
```

---

## Info

### IN-01: Stale i18n keys from the old invite-code system remain in both locale files

**File:** `apps/frontend/src/locales/en.json`, `apps/frontend/src/locales/de.json`

**Issue:** The new `InviteTokensSection` in `AdminPage.tsx` uses the `admin.inviteTokens*` and `admin.invite*` key family. The following keys from the prior invite-code implementation appear in both locale files and are no longer referenced by any reviewed component:

- `admin.inviteCodesTitle`, `admin.inviteCodesDesc`
- `admin.expiryDaysLabel`, `admin.generating`, `admin.generate`
- `admin.noInviteCodes`, `admin.inviteGenerated`, `admin.inviteDeleted`
- `auth.needInvite`, `auth.inviteCode`
- `table.codeColumn`, `table.usedByColumn`

Dead i18n keys bloat the locale files and can mislead translators.

**Fix:** Remove all keys listed above from both `en.json` and `de.json` after confirming they are unused across the full codebase.

---

### IN-02: `POST /api/admin/invites` returns HTTP 200 on successful resource creation

**File:** `apps/backend/src/routes/admin.ts:203`

**Issue:** `return c.json(invite, 200)` is returned after a new `InviteToken` is successfully persisted. HTTP semantics specify 201 Created for new resource creation.

**Fix:**
```typescript
return c.json(invite, 201)
```

---

### IN-03: No check whether invitee email is already registered before sending invite email

**File:** `apps/backend/src/routes/admin.ts:158-203`

**Issue:** Related to WR-01 but distinct in cause: even outside the double-invite scenario, `POST /api/admin/invites` does not check whether the target email address belongs to an already-registered user. An admin who invites a person who already has an account wastes a token, sends a confusing email to the invitee, and the resulting registration attempt silently fails with a P2002 (see CR-01). Surfacing this at invite-creation time produces a much better admin experience.

**Fix:** See WR-01 for the combined guard.

---

### IN-04: Test files lack i18n infrastructure — translation assertions may be fragile

**File:** `apps/frontend/src/pages/__tests__/AdminPage.test.tsx`, `apps/frontend/src/pages/__tests__/InviteRegisterPage.test.tsx`

**Issue:** Both test files render components that call `useTranslation()` extensively, but neither file mocks `react-i18next` nor sets up an i18n instance with English translations. If the project's Vitest setup does not globally configure i18next with the `en.json` locale, `t('admin.inviteTokensTitle')` returns the key string `"admin.inviteTokensTitle"` and assertions like `screen.getByText('Email Invitations')` fail. The tests work in CI only if a global setup file (not in scope for this review) initialises i18n — that coupling is invisible to readers of the test files.

**Fix:** Add an explicit i18n mock or initialisation at the top of each test file, or extract it into a shared test utility:

```typescript
// e.g. test-utils/i18n.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/locales/en.json'

i18n.use(initReactI18next).init({
  lng: 'en',
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
})

export default i18n
```

Import this in each test file to make the translation dependency explicit.

---

_Reviewed: 2026-06-27T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
