# Phase 25: Password Reset - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can recover account access via a time-limited email link; admins can trigger the same flow for any user from the admin panel.

**In scope:**
- `PasswordResetToken` model — user-linked, single-use, 1-hour expiry, token stored as SHA-256 hash (RESET-02)
- `POST /api/auth/forgot-password` — public endpoint; accepts email; always returns success (RESET-02, RESET-03)
- `GET /api/auth/reset-password/:token` — public endpoint; validates token (returns error state or ok)
- `POST /api/auth/reset-password/:token` — public endpoint; sets new password, deletes all user refresh tokens (RESET-04, RESET-05)
- `POST /api/admin/users/:id/reset-password` — admin-triggered reset email (RESET-07, RESET-08)
- `/forgot-password` — new public page; email form + inline success state (RESET-01)
- `/reset-password/:token` — new public page; new-password form + inline error states (RESET-04, RESET-06)
- `LoginPage` — add "Forgot password?" link in CardFooter (RESET-01)
- `AdminPage` — extend 3-dot DropdownMenu per user row with "Send password reset email" (RESET-07)
- SQL migration: `add_password_reset_token` table

**Out of scope:**
- Admin editing a user's email address (deferred)
- Force-logout all sessions without reset (deferred)
- Self-service password change (authenticated user changing their own password) — no requirement
- Resend reset email shortcut

</domain>

<decisions>
## Implementation Decisions

### Post-reset Action (D-01)
- **D-01:** After the user successfully sets a new password, the reset endpoint **does not issue a new session**. It changes the password and deletes all RefreshToken rows for the user (RESET-05). The frontend navigates to `/login` with a `{ passwordReset: true }` location state. LoginPage shows a `toast.success('Password reset successfully. Please log in.')` toast on mount — same pattern as the existing `location.state.registered` toast from InviteRegisterPage.

### Admin Reset Placement (D-02 to D-03)
- **D-02:** "Send password reset email" is added to the **existing 3-dot DropdownMenu per user row** in AdminPage's UsersSection. Menu item order: "Send password reset email" → separator → "Delete user" (destructive). Extends the Phase 23 DropdownMenu pattern; no new UI surface.
- **D-03:** When admin triggers reset for a user with no email address (RESET-08), backend returns `NO_EMAIL` error code; frontend maps to `toast.error(t('admin.resetNoEmail'))`. Same pattern as Phase 23 mailer test-send error handling (D-12 decision from Phase 23).

### Forgot-password Form Behaviour (D-04 to D-05)
- **D-04:** `ForgotPasswordPage` is a two-state page. **State A (form)**: email input + "Send reset link" button. **State B (success)**: "Check your email" message + "Back to login" link. On submit, the page transitions to State B regardless of whether the email exists (RESET-03 — no enumeration). State B is terminal — no "try a different email" option.
- **D-05:** `ForgotPasswordPage` uses the same centered `Card` layout as `LoginPage` and `InviteRegisterPage`. No navigation occurs after submit; state transition is controlled by a boolean state (`submitted`).

### Token Error States (D-06)
- **D-06:** `/reset-password/:token` handles all error states **inline** (no redirect), same approach as Phase 24 InviteRegisterPage D-09. On page load, frontend calls `GET /api/auth/reset-password/:token`; if backend returns an error, the page renders an error state with message and "Back to login" link. Three distinct error messages (i18n keys):
  - Already used: `auth.resetLinkUsed` — "This reset link has already been used."
  - Expired: `auth.resetLinkExpired` — "This reset link has expired. Request a new one from the login page."
  - Not found / invalid: `auth.resetLinkInvalid` — "This reset link is not valid."

### Token Security (D-07)
- **D-07:** `PasswordResetToken` stores only the **SHA-256 hash** of the raw token. The raw token is sent only in the email link. On validation, the backend hashes the raw token from the URL and compares against `tokenHash`. Matches the v1.4-research OWASP pattern (from STATE.md). Raw token generated via `crypto.randomBytes(32).toString('hex')`.

### Claude's Discretion
- Exact SQL migration format for `add_password_reset_token` table (follows existing migration file conventions)
- Whether `PasswordResetToken` has a FK to `User` (InviteToken has none; a FK with `onDelete: Cascade` simplifies cleanup)
- i18n key naming for forgot-password / reset-password pages (follow existing `auth.*` namespace)
- TOCTOU-safe token consumption: use atomic `updateMany WHERE tokenHash = X AND usedAt IS NULL` + count check (v1.4-research pattern)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/REQUIREMENTS.md` — RESET-01 through RESET-08 with full acceptance criteria
- `.planning/ROADMAP.md` §Phase 25 — Goal, success criteria, phase dependencies

### Data Model & Migration Pattern
- `apps/backend/prisma/schema.prisma` — `InviteToken` model (closest analog for `PasswordResetToken`; note difference: InviteToken stores raw token, PasswordResetToken stores hash only); `RefreshToken` model (all rows for user deleted on reset — RESET-05); `User.email` (required for reset email delivery)
- `apps/backend/prisma/migrations/` — Existing migration files for format reference
- `.planning/STATE.md` §Decisions — Hand-written SQL migration pattern (10-02, 18-01, 24-01 decisions): `prisma migrate dev` unavailable; apply via `prisma migrate deploy` or Docker Compose entrypoint

### Existing Auth Implementation
- `apps/backend/src/routes/auth.ts` — `POST /login` (for JWT issuance pattern to avoid), `POST /logout` (for RefreshToken deleteMany pattern — RESET-05 mirrors this but deletes ALL tokens, not just one), `POST /refresh` (for RefreshToken consumption pattern)
- `apps/backend/src/index.ts` — Public route bypass pattern: register before `authMiddleware` (see `invitesPublicRouter` at line 60; new password-reset public routes follow the same approach)

### Existing Token Page Patterns
- `apps/backend/src/routes/invites.ts` — InviteToken validation route (GET /:token) pattern for analogous `GET /api/auth/reset-password/:token`
- `apps/frontend/src/pages/InviteRegisterPage.tsx` — Two-state public token page pattern: `status` state (`'loading' | 'ok' | 'error'`), token from `useParams`, inline error rendering; `ResetPasswordPage` follows this structure

### Existing Admin Implementation
- `apps/backend/src/routes/admin.ts` — `POST /api/admin/mailer/test` (mailer singleton call + NO_EMAIL error code pattern — D-03 mirrors this); `DELETE /api/admin/users/:id` (DropdownMenu per row pattern)
- `apps/frontend/src/pages/AdminPage.tsx` — UsersSection 3-dot DropdownMenu per user row (Phase 23 pattern); `toast.success` / `toast.error` feedback pattern

### Login Page (for "Forgot password?" link addition)
- `apps/frontend/src/pages/LoginPage.tsx` — CardFooter structure (line 150+); existing `location.state.registered` toast pattern for `passwordReset` toast state (D-01)

### Mailer Singleton
- `apps/backend/src/lib/mailer.ts` — `sendMail()` and `isConfigured()` — Phase 25 uses it for both user-initiated and admin-initiated reset emails

### i18n
- `apps/frontend/src/i18n/locales/en.json` — Existing `auth.*` namespace keys; add `auth.forgotPassword`, `auth.resetPassword`, `auth.resetLinkUsed`, `auth.resetLinkExpired`, `auth.resetLinkInvalid`, `auth.resetSuccess`, `admin.sendPasswordReset`, `admin.resetNoEmail` — same keys must be added to `de.json`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`InviteRegisterPage.tsx`**: Closest analog for `ResetPasswordPage` — public token page, status state, `useParams` for token, conditional render (loading / ok / error). Copy structure, adapt form fields (new password + confirm password instead of username + password).
- **`LoginPage.tsx` CardFooter**: Add "Forgot password?" `<Link to="/forgot-password">` alongside existing footer content. Existing `location.state.registered` toast logic is the template for the `location.state.passwordReset` toast (D-01).
- **`AdminPage.tsx` DropdownMenu per user row**: Extend with "Send password reset email" item. Single DropdownMenuContent with two items + separator; `text-destructive` styling stays on "Delete user" only.
- **`apps/backend/src/routes/admin.ts` mailer pattern**: `POST /api/admin/mailer/test` shows the `sendMail()` call, `NO_EMAIL` error code return, and `isConfigured()` guard. Admin reset route (`POST /users/:id/reset-password`) follows the same structure.
- **nodemailer singleton (`apps/backend/src/lib/mailer.ts`)**: Already configured via `SMTP_*` env vars. `sendMail()` used for reset email delivery.

### Established Patterns
- **Hand-written SQL migrations**: Write migration SQL manually; no `prisma migrate dev`. Migration name: `add_password_reset_token`.
- **Public route bypass**: Register reset routes before `app.use('/api/*', authMiddleware)` in `index.ts` — same as `invitesPublicRouter`.
- **Atomic TOCTOU-safe token consumption**: `updateMany WHERE tokenHash = ? AND usedAt IS NULL` + count check (v1.4-research pattern).
- **SHA-256 token hashing**: `crypto.createHash('sha256').update(rawToken).digest('hex')` — store hash, send raw in email.
- **Toast feedback in admin**: `toast.success()` / `toast.error()` from sonner.
- **RefreshToken deleteMany**: `prisma.refreshToken.deleteMany({ where: { userId } })` — deletes all sessions for user. Used in reset-password endpoint for RESET-05.

### Integration Points
- `POST /api/auth/forgot-password` → new public route in auth.ts → looks up user by email, generates token, stores hash, sends email → `ForgotPasswordPage` calls this on form submit
- `GET /api/auth/reset-password/:token` → new public route in auth.ts → hashes raw token, looks up `PasswordResetToken` → `ResetPasswordPage` calls on mount
- `POST /api/auth/reset-password/:token` → new public route in auth.ts → validates token, updates `User.passwordHash`, deletes all `RefreshToken` rows, marks token `usedAt` → `ResetPasswordPage` calls on form submit
- `POST /api/admin/users/:id/reset-password` → new admin route → looks up user, checks email present, generates token, sends email → AdminPage DropdownMenu calls this
- `App.tsx` → add `/forgot-password` and `/reset-password/:token` routes (public, no auth guard — same pattern as `/invite/:token`)
- `packages/shared/src/schemas/` → add `PasswordResetRequestSchema` (email field) and `PasswordResetSchema` (newPassword field) for frontend form validation

</code_context>

<specifics>
## Specific Ideas

- The reset email content should mirror the invite email: include the user's email address, a clear CTA ("Reset your password"), the reset link (`${APP_URL}/reset-password/${rawToken}`), and the 1-hour expiry deadline.
- `ForgotPasswordPage` State B (success): heading "Check your email", subtext "If that email is registered, a password reset link is on its way. It expires in 1 hour.", then a "Back to login" link. No timer, no re-submit.
- `ResetPasswordPage` form fields: "New password" + "Confirm password". Minimum password length from existing `PasswordSchema` (or define new `PasswordResetSchema` in shared package with same constraints). Confirm password is frontend-only validation (same as InviteRegisterPage).
- Token expiry window: 1 hour (from RESET-02 requirement), shorter than invite token (7 days). Store as `expiresAt = new Date(Date.now() + 60 * 60 * 1000)`.

</specifics>

<deferred>
## Deferred Ideas

- **Self-service password change (authenticated flow)** — user changes password without going through forgot-password flow; no requirement; deferred
- **Resend reset email** — if token expires before user clicks, they must go through ForgotPasswordPage again; a resend shortcut is deferred
- **Force-logout without reset** — admin security tool to invalidate all sessions without requiring a password change; deferred per REQUIREMENTS.md

### Reviewed Todos (not folded)
- **"Support deck update via zip file upload"** (2026-06-15) — maps to Phase 27, not Phase 25
- **"Add quick-edit / jump-to-card button in study mode"** (2026-06-15) — maps to Phase 28, not Phase 25
- **"Improve user management and email-based auth flows"** (2026-06-19) — already folded into Phase 23; Phase 25 delivers the reset half of this todo

</deferred>

---

*Phase: 25-password-reset*
*Context gathered: 2026-06-29*
