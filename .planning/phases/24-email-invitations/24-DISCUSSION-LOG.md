# Phase 24: Email Invitations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-25
**Phase:** 24-email-invitations
**Areas discussed:** Old invite code system fate, Registration route structure, Admin UI organization, Invalid/used/expired token UX

---

## Old Invite Code System Fate

| Option | Description | Selected |
|--------|-------------|----------|
| Remove entirely | Drop InviteCode model, admin routes, InviteCodesSection, and inviteCode field from RegisterSchema. Clean break aligned with milestone goal. | ✓ |
| Keep both coexisting | Old code-based flow stays; email invites added on top. Two paths to register. | |
| Hide from UI, keep in DB | Remove InviteCodesSection from admin but keep table for now. | |

**User's choice:** Remove entirely

---

| Option | Description | Selected |
|--------|-------------|----------|
| Full removal — drop table + remove app code | SQL migration drops InviteCode table and inviteCodeUsed relation from User. Needs one migration file alongside InviteToken migration. | ✓ |
| App-layer only — remove routes/UI, keep table | InviteCode table stays in DB but unused. No schema migration needed. | |

**User's choice:** Full removal — drop table + remove app code

---

## Registration Route Structure

| Option | Description | Selected |
|--------|-------------|----------|
| /invite/:token (new dedicated route) | New page/route separate from /register. Token is in the path. Clean separation. | ✓ |
| /register?token=xxx (reuse /register with query param) | Same route, conditional rendering based on ?token presence. | |
| /register/:token (token as path segment on existing route) | Keeps /register namespace, token in path. | |

**User's choice:** /invite/:token (new dedicated route)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Remove /register entirely | No public registration — /register route deleted. Only /invite/:token works. | ✓ |
| Keep /register but redirect to /login | Route stays but redirects. | |
| Keep /register as an error page | Shows friendly "registration by invitation only" message. | |

**User's choice:** Remove /register entirely

---

| Option | Description | Selected |
|--------|-------------|----------|
| Email (read-only) + username + password | Minimal friction, matches EMAIL-05 exactly. | |
| Email (read-only) + username + password + confirm password | Adds confirm-password field for safety. | ✓ |

**User's choice:** Email (read-only) + username + password + confirm password

---

## Admin UI Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Single InviteTokensSection (form + pending list together) | Replace InviteCodesSection with InviteTokensSection. Top: email input + Send Invite. Below: pending invites table. | ✓ |
| Two separate sections (Send Invite + Pending Invites) | Separate Card components for form and list. | |
| Integrate into UsersSection | Put invite form near UsersSection. | |

**User's choice:** Single InviteTokensSection (form + pending list together)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Email + Sent date + Expires + Revoke action | Concise and actionable. | ✓ |
| Email + Sent date + Expires + Status badge + Revoke | Adds status badge for at-a-glance visibility. | |
| You decide | Claude picks columns. | |

**User's choice:** Email + Sent date + Expires + Revoke action

---

| Option | Description | Selected |
|--------|-------------|----------|
| Active only — filter out expired on backend | Matches EMAIL-07 (pending = unused, non-expired). Cleaner list. | ✓ |
| All invites (pending + expired), filtered client-side | Full history visible. More complex. | |

**User's choice:** Active only — filter out expired on backend

---

## Invalid/Used/Expired Token UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline error state on /invite/:token | Page loads, backend validates, error renders inline instead of form. No redirect. | ✓ |
| Dedicated /invite/error page (redirect with error type) | Redirect to /invite/error?reason=used|expired|invalid. | |
| Redirect to /login with toast | Minimal implementation but loses specific error context. | |

**User's choice:** Inline error state on /invite/:token

---

| Option | Description | Selected |
|--------|-------------|----------|
| Distinguish all three states | Separate messages for used, expired, and invalid/not-found. | ✓ |
| Combine expired + invalid, separate used | Two messages instead of three. | |
| One generic message for all | Minimal implementation. | |

**User's choice:** Distinguish all three states

---

## Claude's Discretion

- Whether InviteToken uses `cuid()` or `crypto.randomBytes(32)` for the token value — noted as a planner decision in CONTEXT.md specifics.
- Whether InviteCode table drop and InviteToken table creation are one migration file or two — noted as planner decision.

## Deferred Ideas

- Resend invitation shortcut (pre-fill email, revoke old) — future UX improvement
- Expiry countdown on invite page — unnecessary complexity
- Bulk invites (multiple emails at once) — future phase
