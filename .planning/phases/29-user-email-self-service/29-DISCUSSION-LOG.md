# Phase 29: User Email Self-Service - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-02
**Phase:** 29-user-email-self-service
**Areas discussed:** Settings email save UX, No-email warning presentation, Admin edit-email interaction, Duplicate/invalid email error UX

---

## Settings Email Save UX

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit Save button | Input + Save button, same Card layout as other sections; gives a clear moment for success/error feedback given email can fail validation/conflict | ✓ |
| Auto-save on blur | Consistent with rest of Settings (no button elsewhere), but a failed save on blur is a worse surprise | |

**User's choice:** Explicit Save button

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-fill and always editable | Input always shows current value (or empty); handles both first-time set and later correction | ✓ |
| Add-only when null | Input only appears if email is currently unset; simpler but blocks self-correction of a typo | |

**User's choice:** Pre-fill and always editable

**Notes:** None — both recommended options accepted directly.

---

## No-Email Warning Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Alert banner at top of Settings page | Uses existing (unused) Alert component in warning/destructive variant, above the Study Mode card | ✓ |
| Inline note inside the email Card | Smaller CardDescription-style text, less prominent | |

**User's choice:** Alert banner at top of Settings page

| Option | Description | Selected |
|--------|-------------|----------|
| Settings page only | Matches locked ROADMAP success criteria exactly | ✓ |
| Also add a dashboard nudge | New capability beyond this phase's scope | |

**User's choice:** Settings page only

**Notes:** Dashboard nudge captured as a deferred idea, not built.

---

## Admin Edit-Email Interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Dialog modal via DropdownMenuItem | New "Edit email" item opens a Dialog (component exists, unused elsewhere) with input + Save/Cancel — consistent with existing row-action pattern | ✓ |
| Inline-editable table cell | Click cell to edit in place — no established pattern in this codebase | |

**User's choice:** Dialog modal via DropdownMenuItem

| Option | Description | Selected |
|--------|-------------|----------|
| Top of menu, above reset/delete | Edit email → separator → reset password → separator → delete (destructive last); shown for every row including admin's own | ✓ |
| Hide for the admin's own row | Adds a conditional the other menu items don't have | |

**User's choice:** Top of menu, above reset/delete, shown for every row

**Notes:** None.

---

## Duplicate/Invalid Email Error UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline error under input | Visible field to attach the error to; clearer for validation-style failure | ✓ |
| Toast-only | Matches existing NO_EMAIL/mailer error pattern, but disappears | |

**User's choice:** Inline error under input

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit "already in use" message | RESET-03 no-enumeration concern doesn't apply — authenticated self-service / admin-only context | ✓ |
| Generic "could not save" message | More cautious but confusing for a simple typo/duplicate case | |

**User's choice:** Explicit "already in use" message

**Notes:** Success still confirmed via toast; only the error path is inline (D-07).

---

## Claude's Discretion

- Exact validation error copy and i18n key naming
- Whether the Settings Save button is disabled until the input differs from current email
- Server-side email normalization (trim/lowercase) before uniqueness check
- Exact Prisma P2002 → `EMAIL_TAKEN`-style error mapping
- Admin Edit Email Dialog copy/layout details

## Deferred Ideas

- Dashboard-wide or global "no email set" nudge — explicitly rejected for this phase, Settings-only per locked success criteria
- Email verification flow — already tracked in REQUIREMENTS.md Future Requirements, unaffected by this phase

### Reviewed Todos (not folded)

- `2026-06-19-improve-user-management-and-email-based-auth-flows.md` — matched at 0.9 relevance on generic keywords; concrete asks already delivered by Phases 23-25; nothing maps to self-service email update specifically
