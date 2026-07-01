# Phase 28: Quick-Edit in Study - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 28-quick-edit-in-study
**Areas discussed:** Menu placement & trigger, Post-edit refresh behavior, Exam mode availability, Jump to deck behavior

---

## Menu placement & trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Progress row | Next to the deck badge, outside CardFlip's click zone — no stopPropagation needed | ✓ |
| Floating on card corner | Overlaid on the card, needs stopPropagation() and a positioning slot in CardFlip | |

**User's choice:** Progress row (recommended)
**Notes:** None.

| Option | Description | Selected |
|--------|-------------|----------|
| Both faces | Menu stays available regardless of flip state | ✓ |
| Front face only | Menu disappears once flipped to back | |

**User's choice:** Both faces
**Notes:** Consistent with progress-row placement — this question resolved itself once placement was chosen.

---

## Post-edit refresh behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate update | onCardUpdated callback replaces the card in local cards[] state | ✓ |
| Toast only | No live refresh; content updates only next time the card comes up | |

**User's choice:** Immediate update (recommended)
**Notes:** None.

| Option | Description | Selected |
|--------|-------------|----------|
| No — ignore for this session | Tag filter was already committed at session start; edits don't retroactively affect the queue | ✓ |
| Re-evaluate filter live | Remove card from queue immediately if edited tags no longer match | |

**User's choice:** No — ignore for this session (recommended)
**Notes:** None.

---

## Exam mode availability

| Option | Description | Selected |
|--------|-------------|----------|
| Show it everywhere | No mode exception; matches SEDIT-01's literal wording | ✓ |
| Hide during exam mode | Editing the answer key mid-exam undermines the test simulation | |

**User's choice:** Show it everywhere (recommended)
**Notes:** None.

---

## Jump to deck behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Navigate immediately | Matches existing "Leave Session" button behavior | ✓ |
| Confirm before leaving | New AlertDialog confirmation pattern | |

**User's choice:** Navigate immediately (recommended)
**Notes:** None.

---

## Todo Fold Decision

The pending todo `2026-06-15-quick-edit-card-button-in-study-mode.md` (score 0.9) was folded into this phase's scope — it's the original todo that SEDIT-01..04 were derived from. A second, lower-relevance match (`2026-06-19-improve-user-management-and-email-based-auth-flows.md`, score 0.6) was reviewed but not folded — already resolved by Phases 23–25.

## Claude's Discretion

- `canEdit` permission computation details (owner OR EDIT/MANAGE share, batch query shape) — per `.planning/research/ARCHITECTURE.md`, to be verified against current `study.ts` during phase research.
- Exact `CardEditorModal` callback signature/naming for the update payload.

## Deferred Ideas

None — discussion stayed within phase scope.
