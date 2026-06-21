# Phase 23: Auth Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-21
**Phase:** 23-Auth Foundation
**Areas discussed:** Delete confirmation data, Cascade delete approach, SMTP verification mechanism, Email column display

---

## Delete Confirmation Data

| Option | Description | Selected |
|--------|-------------|----------|
| Static categories | "This will permanently delete their decks, cards, study progress, and review logs." No extra API call. | ✓ |
| Live counts | Prefetch endpoint returns deck/card/progress counts before showing dialog. | |

**User's choice:** Static categories

| Option | Description | Selected |
|--------|-------------|----------|
| Username | Type the target's username to enable confirm button (ADMIN-02 requirement). | ✓ |
| "delete" or "confirm" | Generic confirmation phrase. | |

**User's choice:** Username

| Option | Description | Selected |
|--------|-------------|----------|
| shadcn AlertDialog | Already installed; single shared instance outside map loop; destructive semantics built in. | ✓ |
| shadcn Dialog | More flexible but heavier; wrong semantics for destructive action. | |

**User's choice:** shadcn AlertDialog

| Option | Description | Selected |
|--------|-------------|----------|
| 3-dot DropdownMenu per row | Consistent with Phase 17/22 pattern; avoids overflow issues. | ✓ |
| Inline Delete button per row | Simpler but adds visual weight; Phase 17 moved away from this. | |

**User's choice:** 3-dot DropdownMenu per row

**Notes:** All choices aligned with established patterns from prior phases (17, 22).

---

## Cascade Delete Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit ordered $transaction | DELETE in order: RefreshToken, DeckShare, CardProgress, Cards, Decks, InviteCode, User. No schema changes. | ✓ |
| Schema FK cascades | Add onDelete: Cascade to all User FK relations; cleaner schema but more migration surface. | |

**User's choice:** Explicit ordered $transaction

| Option | Description | Selected |
|--------|-------------|----------|
| No — orphaned media accepted | REQUIREMENTS.md explicitly defers this as out of scope. | |
| Yes — delete media files | Query Media by ownerId, delete files, delete DB rows in transaction. | ✓ |

**User's choice:** Yes — delete media files
**Notes:** This overrides REQUIREMENTS.md §Out of Scope ("Orphaned media cleanup on user delete — disk space not a concern for 2-5 users; accepted limitation per T-5-07"). Explicit user decision 2026-06-21. CONTEXT.md documents the override.

| Option | Description | Selected |
|--------|-------------|----------|
| Best-effort — log failures, continue | File delete errors are logged but don't roll back the DB transaction. | ✓ |
| Fail transaction on any disk error | Roll back entire delete if any file can't be removed. | |

**User's choice:** Best-effort — log failures, continue

| Option | Description | Selected |
|--------|-------------|----------|
| Count active admins before deleting | Count WHERE role=ADMIN AND isActive=true; block if count ≤ 1 and target is last admin. | ✓ |
| You decide | Claude picks safest implementation. | |

**User's choice:** Count active admins before deleting

---

## SMTP Verification Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Startup log only | Log mailer config on startup; no test send in Phase 23. | |
| Admin 'Send test email' button | POST /api/admin/mailer/test sends to admin's own email address. | ✓ |

**User's choice:** Admin 'Send test email' button

| Option | Description | Selected |
|--------|-------------|----------|
| Show error toast: 'Set your email address first' | Button always visible; returns error if admin.email is null. | ✓ |
| Disable/hide button when admin has no email | Proactive disable. | |

**User's choice:** Show error toast: 'Set your email address first'

| Option | Description | Selected |
|--------|-------------|----------|
| Soft fail — warn on startup, mailer disabled | Server starts normally; mailer returns error when called without config. | ✓ |
| Hard fail — crash on startup if SMTP unconfigured | Server won't start without SMTP. Too restrictive for dev/non-email environments. | |

**User's choice:** Soft fail — warn on startup, mailer disabled

---

## Email Column Display

| Option | Description | Selected |
|--------|-------------|----------|
| New inline table column | Standard column; '—' for null; consistent with invite code "Used by" column. | ✓ |
| Email visible on row expand or hover | Popover/expand; adds interaction cost for a 2-5 user panel. | |

**User's choice:** New inline table column

| Option | Description | Selected |
|--------|-------------|----------|
| No — display only in Phase 23 | ADMIN-05 requires viewing only; editing is deferred. | ✓ |
| Yes — add inline email edit | Out of scope for v1.4 requirements. | |

**User's choice:** No — display only in Phase 23

---

## Claude's Discretion

None — user made all decisions explicitly.

## Deferred Ideas

- Admin edit user email — viewing only in Phase 23; editing deferred per REQUIREMENTS.md
- Resend invitation — captured in REQUIREMENTS.md future requirements; Phase 24 scope
- Return-to-study after card edit — unrelated to this phase
