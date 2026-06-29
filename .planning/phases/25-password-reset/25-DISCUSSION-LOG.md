# Phase 25: Password Reset - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-29
**Phase:** 25-password-reset
**Areas discussed:** Post-reset action, Admin reset placement, Forgot-password form post-submit

---

## Post-reset action

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to login with success message | Reset endpoint only changes password and deletes sessions. Frontend navigates to /login with passwordReset state — LoginPage shows toast. No new JWT issued. | ✓ |
| Auto-login after reset | Reset endpoint changes password, deletes old sessions, and issues a fresh JWT + refresh token cookie. User lands on /dashboard. | |

**User's choice:** Redirect to login with success message (Recommended)
**Notes:** No auto-login; the success flow mirrors the existing `location.state.registered` toast from InviteRegisterPage.

---

## Admin reset placement

**Question 1 — Where does 'Send password reset email' live?**

| Option | Description | Selected |
|--------|-------------|----------|
| Add to existing 3-dot DropdownMenu per user row | Extends Phase 23 DropdownMenu (currently has 'Delete user'). Menu: 'Send password reset email' + separator + 'Delete user'. | ✓ |
| Inline button per user row | Add 'Reset password' icon button directly in each row alongside 3-dot menu. | |

**User's choice:** Add to existing 3-dot DropdownMenu (Recommended)

**Question 2 — When user has no email (RESET-08)?**

| Option | Description | Selected |
|--------|-------------|----------|
| Toast error | Backend returns NO_EMAIL error code; frontend maps to localised toast. Same pattern as Phase 23 mailer test-send. | ✓ |
| Inline disabled state | Menu item is disabled/hidden when user has no email. | |

**User's choice:** Toast error (Recommended)
**Notes:** Consistent with NO_EMAIL pattern from Phase 23 admin.ts mailer test-send.

---

## Forgot-password form post-submit

**Question 1 — After submitting email?**

| Option | Description | Selected |
|--------|-------------|----------|
| Inline success state — same page | ForgotPasswordPage replaces form with 'Check your email' message + 'Back to login' link. No navigation. | ✓ |
| Navigate to login with success toast | After submit, navigate to /login and show a toast. | |

**User's choice:** Inline success state — same page (Recommended)

**Question 2 — Offer 'Try a different email' after success?**

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — 'Try a different email' button/link | Resets form to initial state. | |
| No — success state is terminal, Back to login only | Success message + 'Back to login'. If user mis-typed, they click Back and start over. | ✓ |

**User's choice:** No — success state is terminal (Back to login only)
**Notes:** Simpler page design; avoids re-submission complexity.

---

## Claude's Discretion

- Exact SQL migration format for `add_password_reset_token` (follows existing migration conventions)
- Whether `PasswordResetToken` has a FK to `User` (InviteToken has none; FK with `onDelete: Cascade` simplifies cleanup — Claude's call)
- i18n key naming for forgot-password / reset-password pages (follow existing `auth.*` namespace)
- TOCTOU-safe token consumption implementation detail (v1.4-research pattern from STATE.md)

## Deferred Ideas

- Self-service password change (authenticated user changes password without reset flow) — no requirement; deferred
- Resend reset email shortcut — if token expires, user goes through ForgotPasswordPage again; resend deferred
- Force-logout without reset (admin security tool) — deferred per REQUIREMENTS.md
