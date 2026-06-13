# Phase 19: Library Remove Action - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-13
**Phase:** 19-library-remove-action
**Areas discussed:** Entry point, Confirmation UX, CardProgress on removal

---

## Entry Point

| Option | Description | Selected |
|--------|-------------|----------|
| Decks page ⋮ dropdown | Add ⋮ DropdownMenu to library deck cards. "Remove from library" is the only destructive item. No Explore API change needed. | ✓ |
| Explore page state-aware button | Explore detects per-user library status and switches "Add to Library" → "Remove from Library". Requires Explore API to return `isInLibrary` flag. | |
| Both | Library decks get ⋮ dropdown on Decks page AND Explore becomes state-aware. | |

**User's choice:** Decks page ⋮ dropdown
**Notes:** User confirmed Study and Open buttons stay unchanged in the card footer. The ⋮ menu contains only the remove action.

---

## Confirmation UX

| Option | Description | Selected |
|--------|-------------|----------|
| AlertDialog | Consistent with Phase 17 owned-deck delete pattern. Single shared dialog outside the map loop, `removeTargetId` state. Body notes that study progress is preserved. | ✓ |
| Immediate with toast | Fire API immediately on click, show success toast. No dialog. | |

**User's choice:** AlertDialog
**Notes:** User confirmed the exact dialog body: "Your study progress for this deck will be preserved. You can re-add it from Explore at any time."

---

## CardProgress on Removal

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve CardProgress | Only DeckShare row deleted. CardProgress rows survive. Re-adding the deck resumes prior study progress. | ✓ |
| Delete CardProgress too | Cascade-delete CardProgress rows for cards in the removed deck. Permanent data loss. | |

**User's choice:** Preserve CardProgress
**Notes:** Standard spaced-repetition behavior. The requirement's "permanently remove" refers to library membership, not study data.

---

## Claude's Discretion

- Backend response code for `DELETE /api/decks/:id/library`: 204 (no content) — standard for successful delete with no body
- Optimistic deck list removal after success: follow existing `handleDelete` pattern (`setDecks` filter)
- `MoreVertical` icon for the ⋮ trigger button — already used in owned-deck cards

## Deferred Ideas

- Explore page state-awareness ("In Library / Remove" button on Explore cards) — declined for Phase 19; possible future UX enhancement
- LIB-03 (hide/block a public deck from Explore results) — in REQUIREMENTS.md future requirements; not v1.3.2
- Logo redesign todo — correctly deferred to Phase 20 (BRAND-01/BRAND-02)
