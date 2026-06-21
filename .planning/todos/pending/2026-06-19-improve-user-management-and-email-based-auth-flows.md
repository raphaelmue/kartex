---
created: 2026-06-19T19:51:39.229Z
title: Improve user management and email-based auth flows
area: auth
files: []
resolves_phase: 23
---

## Problem

User management and registration are currently limited. Admins lack in-app controls to manage existing users, and registration is invite-code-only with no email layer. Several related gaps:

1. **Admin capabilities** — Admins cannot reset a user's password or delete a user account from the admin panel. These are essential moderation tools for a multi-user self-hosted app.

2. **Email-based registration** — Users can only register via manually shared invite codes. There is no option to register with an email address and verify it, which reduces trust and makes account recovery impossible.

3. **Email verification** — No mechanism exists to verify that a registered user actually owns their email address.

4. **Password reset** — Users have no self-service way to reset a forgotten password. Admins must intervene manually.

5. **Direct email invitations** — Instead of generating an invite code and sharing it out-of-band, admins should be able to send invite emails directly from the application.

## Solution

Break into distinct sub-features, likely spanning a dedicated milestone or multi-phase effort:

- **Admin: Reset user password** — Admin triggers a forced reset; user receives email with reset link or one-time code.
- **Admin: Delete user** — Admin can permanently delete a user account (with confirmation), cascading to their decks and progress.
- **Email verification flow** — On registration, send a verification email with a token link. Gate certain features (or show a banner) until verified.
- **Self-service password reset** — "Forgot password" flow: user enters email → receives reset link → sets new password.
- **Email-based invitations** — Admin enters an email address; system sends a personalised invite link directly rather than exposing a raw code. Invite codes remain as fallback for offline sharing.

Requires adding an email-sending integration (SMTP / transactional email provider via env-configured credentials) and storing token state (hashed tokens + expiry) in the database.
