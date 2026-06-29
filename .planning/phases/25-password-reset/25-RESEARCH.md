# Phase 25: Password Reset — Research

**Date:** 2026-06-29
**Status:** Complete

---

## Summary

Phase 25 is a clean extension of the Phase 24 invite-token pattern. The `PasswordResetToken` model follows `RefreshToken` (FK + `onDelete: Cascade`) rather than `InviteToken` (no FK), ensuring auto-cleanup on user delete with no changes to the delete transaction. All three new public backend routes belong in the existing `authRouter` — no index.ts changes required since `app.route('/api/auth', authRouter)` is already registered before `authMiddleware`. The `InviteRegisterPage` two-state pattern is a near-exact template for both `ResetPasswordPage` (loading / error / form) and `ForgotPasswordPage` (form / success). The i18n locale files are at `apps/frontend/src/locales/en.json` (not `i18n/locales/`).

**Primary recommendation:** Add all three reset routes to auth.ts (already public), model PasswordResetToken with FK + cascade, use SHA-256 token hashing with atomic `updateMany` consumption, and mirror the InviteRegisterPage pattern for both new frontend pages.

---

## 1. PasswordResetToken Schema Design

### Comparison

| Model | FK to User | onDelete | Cleanup on user delete |
|-------|-----------|----------|----------------------|
| `RefreshToken` | Yes (`userId`) | none (default RESTRICT) | Manual — `tx.refreshToken.deleteMany({ where: { userId } })` in admin.ts |
| `InviteToken` | None | n/a | Not needed — email-only link, not user-bound |
| `PasswordResetToken` (proposed) | Yes (`userId`) | **Cascade** | Auto — no code needed |

### Analysis

`PasswordResetToken` is fundamentally user-bound (it resets a specific user's password). An orphaned reset token (user deleted, token remains) would be a dead record with no valid target — there is no good reason to keep it.

`InviteToken` has no FK because it is created before the user exists. `PasswordResetToken` is created after the user exists, so a FK is appropriate.

`RefreshToken` has a FK but no cascade; cleanup is manual in the delete transaction. This was done before Phase 23 introduced the cascade migration pattern. For Phase 25, adding `onDelete: Cascade` avoids requiring a manual `tx.passwordResetToken.deleteMany()` step in the user-delete transaction.

### Recommendation

```prisma
model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
}
```

**FK with `onDelete: Cascade`** — when user is deleted, their reset tokens auto-delete. The `DELETE /api/admin/users/:id` transaction in admin.ts requires no change. `tokenHash` is unique (indexed) for fast lookup; a single user can have at most one valid token at a time in practice but the model allows multiple (the backend should delete any prior unused token before creating a new one, or simply allow multiple and check the latest — simplest is to allow multiple and the consume logic is per-token).

Add `resetTokens PasswordResetToken[]` relation to the `User` model.

---

## 2. SQL Migration Format

### Established Convention

Hand-written migrations (Phase 10 onward) use:
- **Directory name:** `YYYYMMDD000000_snake_case_description`
- **File:** `migration.sql` inside that directory
- **Header comment:** one line describing what the migration does + implementation note about `prisma migrate deploy`
- **Identifiers:** double-quoted PostgreSQL identifiers (`"TableName"`, `"columnName"`)
- **Types:** `TEXT NOT NULL`, `TEXT` (nullable), `TIMESTAMP(3)`, `BOOLEAN NOT NULL DEFAULT true`

### Examples Examined

`20260621000000_add_user_email/migration.sql`:
```sql
-- AlterTable: Add email column to User — implements EMAIL-01
-- Applied via `prisma migrate deploy` in Docker Compose entrypoint (entrypoint.sh).
ALTER TABLE "User" ADD COLUMN "email" TEXT UNIQUE;
```

`20260625000000_replace_invite_code_with_invite_token/migration.sql`:
```sql
-- Replace InviteCode with InviteToken — implements EMAIL-03 through EMAIL-08
-- Applied via `prisma migrate deploy` in Docker Compose entrypoint (entrypoint.sh).
CREATE TABLE "InviteToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InviteToken_token_key" ON "InviteToken"("token");
```

### Migration for Phase 25

**Directory:** `apps/backend/prisma/migrations/20260629000000_add_password_reset_token/`
**File:** `migration.sql`

```sql
-- CreateTable: PasswordResetToken — implements RESET-02
-- Token stored as SHA-256 hash only (raw token sent in email link only — OWASP pattern).
-- onDelete: CASCADE ensures tokens auto-delete when user is deleted.
-- Applied via `prisma migrate deploy` in Docker Compose entrypoint (entrypoint.sh).

CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

ALTER TABLE "PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## 3. Token Generation & Security

### Confirmed Pattern (from STATE.md v1.4-research + auth.ts + admin.ts)

**Generation:**
```typescript
import { randomBytes, createHash } from 'node:crypto'

const rawToken = randomBytes(32).toString('hex')          // 64-char hex — sent in email URL
const tokenHash = createHash('sha256').update(rawToken).digest('hex')  // stored in DB
const expiresAt = new Date(Date.now() + 60 * 60 * 1000)  // 1 hour (RESET-02)
```

**Validation (GET endpoint — read-only check):**
```typescript
const { token: rawToken } = c.req.param()
const tokenHash = createHash('sha256').update(rawToken).digest('hex')
const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } })
if (!record)                    return c.json({ error: 'NOT_FOUND' }, 400)
if (record.usedAt !== null)     return c.json({ error: 'ALREADY_USED' }, 400)
if (record.expiresAt < new Date()) return c.json({ error: 'EXPIRED' }, 400)
return c.json({ ok: true }, 200)
```

**Atomic TOCTOU-safe consumption (POST endpoint — state change):**
```typescript
// Inside $transaction:
const result = await tx.passwordResetToken.updateMany({
  where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
  data: { usedAt: new Date() },
})
if (result.count === 0) throw new Error('TOKEN_CONSUMED')
```

This is the same pattern used in `auth.ts` for InviteToken consumption in the `/register` route (`tx.inviteToken.updateMany({ where: { token, usedAt: null, expiresAt: { gt: new Date() } }, ... })`).

**Difference from InviteToken:** The raw invite token is stored as-is (field `token`). The reset token stores only the hash (field `tokenHash`). The lookup key changes from `{ token }` to `{ tokenHash }`.

**Full reset transaction:**
```typescript
await prisma.$transaction(async (tx) => {
  const result = await tx.passwordResetToken.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  })
  if (result.count === 0) throw new Error('TOKEN_CONSUMED')

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await tx.user.update({ where: { id: record.userId }, data: { passwordHash } })
  await tx.refreshToken.deleteMany({ where: { userId: record.userId } })  // RESET-05
})
```

Note: `record` from pre-check lookup must carry `userId` into the transaction. Pre-check is a UX-only guard (not TOCTOU-safe by itself); the transaction's `updateMany` count=0 check is the true atomic gate.

---

## 4. Public Route Registration

### How Index.ts Works

```
app.route('/api/auth', authRouter)        // step 3 — BEFORE authMiddleware
app.route('/api/media', mediaPublicRouter) // step 3b — BEFORE authMiddleware
app.route('/api/invites', invitesPublicRouter) // step 3c — BEFORE authMiddleware
app.use('/api/*', authMiddleware)          // step 4 — JWT gate
```

`authRouter` is already registered at step 3, before `authMiddleware`. All routes in `auth.ts` are therefore public by default (no JWT required). This is why `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`, and `/api/auth/register` all work without a token.

### Conclusion

**No changes required to `index.ts`** for Phase 25. The three new reset routes added to `auth.ts` are automatically public because the auth router is mounted before the JWT middleware:

- `POST /api/auth/forgot-password` → add to auth.ts ✓ (public via step 3)
- `GET  /api/auth/reset-password/:token` → add to auth.ts ✓ (public via step 3)
- `POST /api/auth/reset-password/:token` → add to auth.ts ✓ (public via step 3)

The admin route `POST /api/admin/users/:id/reset-password` goes into `admin.ts` — already behind `requireAdmin` at step 6.

**Rate limiting note:** `auth.ts` line 14: `auth.use('*', rateLimitMiddleware(10, 60_000))` applies to all auth routes including the new ones. The forgot-password endpoint is rate-limited to 10 requests/minute — appropriate and desirable.

---

## 5. Frontend Page Patterns

### InviteRegisterPage — Exact Structure (template for ResetPasswordPage)

State machine:
```typescript
const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
const [errorCode, setErrorCode] = useState<string | null>(null)
```

Token from URL:
```typescript
const { token } = useParams<{ token: string }>()
```

Fetch on mount:
```typescript
useEffect(() => {
  if (!token) { setErrorCode('NOT_FOUND'); setStatus('error'); return }
  api.get(`/api/invites/${token}`)
    .then(async (res) => {
      if (res.ok) { /* extract email, setStatus('ok') */ }
      else { const body = await res.json(); setErrorCode(body.error ?? 'NOT_FOUND'); setStatus('error') }
    })
    .catch(() => { setErrorCode('NOT_FOUND'); setStatus('error') })
}, [token])
```

Conditional render order:
1. `if (status === 'loading')` → centered Card with `Loader2 animate-spin`
2. `if (status === 'error')` → Card with CardHeader (title) + CardContent (message from errorCode) + CardFooter (back link)
3. `// status === 'ok'` → Card with form

Error message mapping:
```typescript
const message = errorCode === 'ALREADY_USED' ? t('auth.inviteAlreadyUsed')
              : errorCode === 'EXPIRED'       ? t('auth.inviteExpired')
              :                                 t('auth.inviteInvalid')
```

Confirm password (client-only, NOT in schema, NOT sent to API):
```typescript
const [confirmPassword, setConfirmPassword] = useState('')
const confirmPasswordRef = useRef('')
// onChange: update both state (controlled input) and ref (stable closure value)
// on submit: compare values.password !== confirmPasswordRef.current
```

On success:
```typescript
navigate('/login', { state: { registered: true } })
```

### ResetPasswordPage Adaptation

Map from InviteRegisterPage:
- `useParams<{ token: string }>()` — same
- `status` state machine — same (`'loading' | 'ok' | 'error'`)
- Fetch on mount: `GET /api/auth/reset-password/${token}` — analogous
- Error codes: `ALREADY_USED` → `auth.resetLinkUsed`, `EXPIRED` → `auth.resetLinkExpired`, default → `auth.resetLinkInvalid`
- Form fields: `newPassword` (in PasswordResetSchema) + `confirmPassword` (ref pattern, NOT in schema)
- On success: `navigate('/login', { state: { passwordReset: true } })`

The GET validate endpoint for reset does NOT need to return user data (unlike invite which returns `{ email }`). Response: `{ ok: true }` on success.

### ForgotPasswordPage Structure

Two-state, NO token involved:
```typescript
const [submitted, setSubmitted] = useState(false)
```

State A (form):
- Card with email Input (react-hook-form + PasswordResetRequestSchema)
- On submit: POST to `/api/auth/forgot-password`; on **any** response (ok or not), `setSubmitted(true)` — no enumeration
- Button: "Send reset link"

State B (success — terminal):
- Card with "Check your email" heading
- Subtext: "If that email is registered, a password reset link is on its way. It expires in 1 hour."
- "Back to login" Link

Layout: same centered Card with `w-[400px] max-w-[calc(100vw-32px)]` pattern.

### LoginPage CardFooter — Adding "Forgot password?" Link

Current CardFooter (line 150–155):
```tsx
<CardFooter className="text-sm text-muted-foreground">
  {t('auth.noAccount')}{' '}
  <Link to="/register" className="ml-1 underline hover:text-foreground">
    {t('auth.register')}
  </Link>
</CardFooter>
```

Add "Forgot password?" as a separate element — cleanest as a `flex justify-between` or two-line approach:
```tsx
<CardFooter className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
  <Link to="/forgot-password" className="underline hover:text-foreground">
    {t('auth.forgotPassword')}
  </Link>
  <span>
    {t('auth.noAccount')}{' '}
    <Link to="/invite" className="ml-1 underline hover:text-foreground">
      {t('auth.register')}
    </Link>
  </span>
</CardFooter>
```

Note: The `/register` link in the current CardFooter points to a non-existent route (removed in Phase 24). The planner may choose to fix this stale link as part of Phase 25 (scope question — at minimum the "Forgot password?" link must be added).

### LoginPage Toast — passwordReset State

Existing registered toast pattern (lines 43–50 of LoginPage.tsx):
```typescript
useEffect(() => {
  const state = location.state as { registered?: boolean } | null
  if (state?.registered) {
    toast.success(t('auth.accountCreated'))
    navigate('/login', { replace: true, state: {} })
  }
}, [location.state, navigate, t])
```

Add passwordReset branch to the same effect:
```typescript
useEffect(() => {
  const state = location.state as { registered?: boolean; passwordReset?: boolean } | null
  if (state?.registered) {
    toast.success(t('auth.accountCreated'))
    navigate('/login', { replace: true, state: {} })
  }
  if (state?.passwordReset) {
    toast.success(t('auth.resetSuccess'))
    navigate('/login', { replace: true, state: {} })
  }
}, [location.state, navigate, t])
```

### AdminPage DropdownMenu — Adding Reset Action

Current DropdownMenuContent (one item):
```tsx
<DropdownMenuContent align="end">
  <DropdownMenuItem
    className="text-destructive focus:text-destructive"
    onClick={() => setDeleteTargetId(u.id)}
  >
    {t('admin.deleteUser')}
  </DropdownMenuItem>
</DropdownMenuContent>
```

Extended (two items + separator):
```tsx
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

<DropdownMenuContent align="end">
  <DropdownMenuItem onClick={() => void handleSendPasswordReset(u.id, u.email)}>
    {t('admin.sendPasswordReset')}
  </DropdownMenuItem>
  <DropdownMenuSeparator />
  <DropdownMenuItem
    className="text-destructive focus:text-destructive"
    onClick={() => setDeleteTargetId(u.id)}
  >
    {t('admin.deleteUser')}
  </DropdownMenuItem>
</DropdownMenuContent>
```

Handler pattern (mirrors mailer test pattern from MailerSection):
```typescript
const handleSendPasswordReset = async (id: string, email: string | null | undefined) => {
  try {
    const res = await api.post(`/api/admin/users/${id}/reset-password`, {})
    if (res.ok) {
      toast.success(t('admin.resetSentSuccess'))
    } else {
      const body = await res.json().catch(() => ({}))
      const errorCode = (body as { error?: string }).error
      if (errorCode === 'NO_EMAIL') {
        toast.error(t('admin.resetNoEmail'))
      } else if (errorCode === 'SMTP_NOT_CONFIGURED') {
        toast.error(t('admin.inviteSMTPMissing'))  // reuse existing key
      } else if (errorCode === 'SMTP_ERROR') {
        toast.error(t('admin.inviteSendError'))    // reuse existing key
      } else {
        toast.error(t('common.somethingWrong'))
      }
    }
  } catch {
    toast.error(t('common.somethingWrong'))
  }
}
```

Note: `DropdownMenuSeparator` must be imported; it's in `@/components/ui/dropdown-menu`.

### App.tsx — New Public Routes

Current public routes (outside ProtectedRoute):
```tsx
<Route path="/login" element={<LoginPage />} />
<Route path="/invite/:token" element={<InviteRegisterPage />} />
```

Add:
```tsx
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
<Route path="/reset-password/:token" element={<ResetPasswordPage />} />
```

Both pages are public (no auth required — users are recovering access). Pattern: same as `/invite/:token`.

---

## 6. Email Template Pattern

### Invite Email (from admin.ts for reference)
```typescript
await sendMail({
  to: email,
  subject: "You've been invited to Kartex",
  text: `You've been invited to Kartex. Complete your registration within 7 days:\n${inviteLink}`,
  html: `<p>You've been invited to Kartex.</p><p><a href="${inviteLink}">Complete your registration</a></p><p>This link expires in 7 days.</p>`,
})
```

### Recommended Reset Email

```typescript
const appUrl = process.env.APP_URL
if (!appUrl) {
  console.error('[auth] APP_URL env var is not set — cannot generate reset link')
  return c.json({ error: 'SERVER_MISCONFIGURED' }, 500)
}
const resetLink = `${appUrl}/reset-password/${rawToken}`

await sendMail({
  to: user.email,
  subject: 'Kartex — Password Reset',
  text: `Someone requested a password reset for your Kartex account.\n\nReset your password:\n${resetLink}\n\nThis link expires in 1 hour. If you did not request a reset, you can safely ignore this email.`,
  html: `<p>Someone requested a password reset for your Kartex account.</p><p><a href="${resetLink}">Reset your password</a></p><p>This link expires in 1 hour. If you did not request a reset, you can safely ignore this email.</p>`,
})
```

This mirrors the invite email pattern exactly: `text` + `html`, subject with "Kartex —" prefix, APP_URL guard with SERVER_MISCONFIGURED error, try/catch with SMTP_ERROR return.

**Error rollback:** Unlike invite tokens (where the token is created before sending), for reset tokens the email delivery failure should clean up the created token row (same pattern as `prisma.inviteToken.delete({ where: { id: invite.id } })` in admin.ts). If email fails, delete the `PasswordResetToken` row so the user can try again.

---

## 7. i18n Keys

### i18n File Actual Location

The files are at `apps/frontend/src/locales/en.json` and `apps/frontend/src/locales/de.json` (not `apps/frontend/src/i18n/locales/` as referenced in CONTEXT.md — confirmed by directory scan).

### Existing auth.* Keys (en.json — confirmed)

`auth.signIn`, `auth.signInTitle`, `auth.welcomeBack`, `auth.username`, `auth.password`, `auth.signingIn`, `auth.noAccount`, `auth.register`, `auth.invalidCredentials`, `auth.createAccount`, `auth.createAccountTitle`, `auth.needInvite`, `auth.inviteCode`, `auth.creatingAccount`, `auth.alreadyHaveAccount`, `auth.invalidInvite`, `auth.usernameTaken`, `auth.accountCreated`, `auth.invitePageTitle`, `auth.createYourAccount`, `auth.inviteWelcome`, `auth.email`, `auth.confirmPassword`, `auth.inviteErrorTitle`, `auth.inviteAlreadyUsed`, `auth.inviteExpired`, `auth.inviteInvalid`, `auth.passwordMismatch`, `auth.backToSignIn`

### New Keys Required (Phase 25)

None of these exist in en.json yet.

**auth.* additions:**

| Key | Suggested English Value | Usage |
|-----|------------------------|-------|
| `auth.forgotPassword` | "Forgot password?" | LoginPage CardFooter link text |
| `auth.forgotPasswordTitle` | "Forgot your password?" | ForgotPasswordPage card title |
| `auth.forgotPasswordDesc` | "Enter your email address to receive a reset link." | ForgotPasswordPage card description |
| `auth.sendResetLink` | "Send reset link" | ForgotPasswordPage submit button |
| `auth.sendingResetLink` | "Sending..." | ForgotPasswordPage submit button (loading) |
| `auth.resetEmailSentTitle` | "Check your email" | ForgotPasswordPage success state heading |
| `auth.resetEmailSentDesc` | "If that email is registered, a password reset link is on its way. It expires in 1 hour." | ForgotPasswordPage success subtext |
| `auth.resetPasswordTitle` | "Reset your password" | ResetPasswordPage card title (form state) |
| `auth.resetPasswordDesc` | "Enter a new password for your account." | ResetPasswordPage card description |
| `auth.newPassword` | "New password" | ResetPasswordPage form field label |
| `auth.resettingPassword` | "Resetting..." | ResetPasswordPage submit button (loading) |
| `auth.resetErrorTitle` | "Unable to reset password" | ResetPasswordPage error state title |
| `auth.resetLinkUsed` | "This reset link has already been used." | ResetPasswordPage error message (ALREADY_USED) |
| `auth.resetLinkExpired` | "This reset link has expired. Request a new one from the login page." | ResetPasswordPage error message (EXPIRED) |
| `auth.resetLinkInvalid` | "This reset link is not valid." | ResetPasswordPage error message (NOT_FOUND) |
| `auth.resetSuccess` | "Password reset successfully. Please log in." | LoginPage toast (D-01) |
| `auth.resetPageTitle` | "Reset Password — Kartex" | document.title |
| `auth.forgotPageTitle` | "Forgot Password — Kartex" | document.title |

**admin.* additions:**

| Key | Suggested English Value | Usage |
|-----|------------------------|-------|
| `admin.sendPasswordReset` | "Send password reset email" | AdminPage DropdownMenu item |
| `admin.resetNoEmail` | "This user has no email address set" | Toast on NO_EMAIL error code (RESET-08) |
| `admin.resetSentSuccess` | "Password reset email sent" | Toast on success |

**Reused existing keys (no change needed):**
- `admin.inviteSMTPMissing` — reused for SMTP_NOT_CONFIGURED on admin reset
- `admin.inviteSendError` — reused for SMTP_ERROR on admin reset
- `common.somethingWrong` — fallback
- `auth.backToSignIn` — "Back to sign in" link in both new error states

Both `en.json` and `de.json` must be updated in the same commit (established pattern from 10-05 decision).

---

## 8. Validation Architecture

### High-Risk Behaviors

| ID | Behavior | Test Assertion |
|----|----------|----------------|
| VAL-01 | No enumeration: `POST /api/auth/forgot-password` with unknown email returns 200 | HTTP 200 + success body regardless of whether email is in DB |
| VAL-02 | Token single-use: second `POST /api/auth/reset-password/:token` with same token fails | First call: 200; second call: 400 with error ALREADY_USED (or TOKEN_CONSUMED) |
| VAL-03 | Expired token: token with `expiresAt` in the past is rejected by GET and POST | GET returns 400 `EXPIRED`; POST returns 400 before updating password |
| VAL-04 | Session invalidation: all RefreshTokens deleted after successful reset | `prisma.refreshToken.findMany({ where: { userId } })` returns empty after `POST /reset-password` succeeds |
| VAL-05 | Admin reset with no-email user: `POST /api/admin/users/:id/reset-password` returns NO_EMAIL | HTTP 400 + body `{ error: 'NO_EMAIL' }` when target user has `email: null` |

### Test Implementation Notes

- VAL-01: The response body for forgot-password should be the same `{ message: '...' }` whether or not user exists. Test with a non-existent email and assert 200.
- VAL-02: Requires creating a token, calling POST once (success), calling POST again (failure). The `usedAt` field must be set after first consumption.
- VAL-03: Requires inserting a `PasswordResetToken` row with `expiresAt` in the past. Both the GET validate and POST consume endpoints must check expiry.
- VAL-04: After a successful `POST /reset-password/:token`, query `prisma.refreshToken.count({ where: { userId } })` — must be 0.
- VAL-05: Create a user with `email: null`; call the admin endpoint; expect 400 with NO_EMAIL error code.

---

## Pitfalls

### Pitfall 1: Auth router rate limiting applies to reset routes

`auth.ts` line 14: `auth.use('*', rateLimitMiddleware(10, 60_000))` applies to ALL routes in the auth router, including the new `forgot-password` and `reset-password` routes. This is intentional and correct for security, but implementors must not bypass it or be surprised when integration tests hit rate limits.

### Pitfall 2: Pre-check is not TOCTOU-safe

The `findUnique` pre-check in validation endpoints (e.g., `GET /reset-password/:token`) is a UX convenience only. The atomic `updateMany WHERE usedAt IS NULL` in the `POST` transaction is the true single-use gate. Never rely on the pre-check result inside the POST handler.

### Pitfall 3: Must resolve userId from token before the $transaction

The `passwordResetToken` record (containing `userId`) must be fetched before the `$transaction` begins so the user ID is available for both the `user.update` and `refreshToken.deleteMany` calls inside the transaction. Do NOT use a nested `findUnique` inside the transaction for the pre-check data.

### Pitfall 4: Token rollback on email send failure

If `sendMail()` throws, the created `PasswordResetToken` row must be deleted (like the invite token rollback in admin.ts lines 212–216). Without rollback, the user cannot request another reset (unique index on `tokenHash` is not the constraint — but a logical "token in flight" issue means the user might think an email is coming when it isn't). Best practice: create token row → send email → on failure, delete token row.

### Pitfall 5: APP_URL env var guard

Both the user-initiated (`POST /forgot-password`) and admin-initiated (`POST /admin/users/:id/reset-password`) routes need `process.env.APP_URL` to construct the reset link. Both must guard with `if (!appUrl) return c.json({ error: 'SERVER_MISCONFIGURED' }, 500)` — same as admin.ts invite route (line 196–199).

### Pitfall 6: de.json must be updated atomically

Per 10-05 decision: add all Phase 25 keys to both `en.json` and `de.json` in the same commit. Missing `de.json` keys fall back to the raw key string (not English), producing broken UI for German users.

### Pitfall 7: i18n file path mismatch

CONTEXT.md references `apps/frontend/src/i18n/locales/en.json` — this path does NOT exist. The actual files are at `apps/frontend/src/locales/en.json` and `apps/frontend/src/locales/de.json`. Confirmed by directory scan.

### Pitfall 8: DropdownMenuSeparator import

`DropdownMenuSeparator` is not currently imported in AdminPage.tsx. It must be added to the import from `@/components/ui/dropdown-menu` alongside the existing `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger`.

### Pitfall 9: stale `/register` link in LoginPage CardFooter

The current CardFooter has `<Link to="/register">` but `/register` was removed in Phase 24 (24-04-PLAN.md: "remove /register"). This link silently redirects to `/dashboard` via the catch-all, and then back to `/login` if the user is unauthenticated. It is pre-existing but the planner should decide whether to address it in Phase 25 when editing the CardFooter.

---

## Shared Schema Additions

New Zod schemas needed in `packages/shared/src/schemas/auth.ts` (or a new `passwordReset.ts`):

```typescript
// For ForgotPasswordPage form
export const PasswordResetRequestSchema = z.object({
  email: z.string().email('Valid email address required.'),
})
export type PasswordResetRequestInput = z.infer<typeof PasswordResetRequestSchema>

// For ResetPasswordPage form
export const PasswordResetSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
})
export type PasswordResetInput = z.infer<typeof PasswordResetSchema>
```

`confirmPassword` remains frontend-only (ref pattern from InviteRegisterPage) — NOT in the shared schema and NOT sent to the API.

These schemas must be exported from `packages/shared/src/index.ts`.

---

## RESEARCH COMPLETE
