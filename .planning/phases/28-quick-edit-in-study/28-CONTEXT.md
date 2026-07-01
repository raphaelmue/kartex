# Phase 28: Quick-Edit in Study - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Users with owner or EDIT-level access to a card's deck get a 3-dot overflow menu on study session cards, letting them edit the card inline (without leaving the session) or jump to the deck detail page. Menu is absent entirely for users without edit permission. Covers `SEDIT-01` through `SEDIT-04`.

</domain>

<decisions>
## Implementation Decisions

### Menu placement & trigger
- **D-01:** Trigger sits in the progress row (same row as `SessionProgress` + deck badge), not floating on the card face. This is entirely outside `CardFlip`'s click zone, so `e.stopPropagation()` is not required for click-safety (the menu physically cannot trigger a flip).
- **D-02:** Menu is visible on both the front and back face — since it lives in the progress row above `CardFlip`, it's unaffected by flip state and stays available throughout.

### Post-edit refresh behavior
- **D-03:** Saving via "Edit this card" updates the currently displayed content immediately. `CardEditorModal` needs an `onCardUpdated: (updatedCard) => void` callback (or equivalent); `SessionRunner` replaces the matching card in its local `cards` array by `id` so the user never rates a card while still seeing content they just corrected.
- **D-04:** If tags change during the inline edit, the active session's tag filter is NOT re-evaluated. The filter was committed when the session started (`committedConfig`); a card is never removed from the in-progress queue due to a tag edit. Simplicity over correctness here — avoids the queue shrinking unexpectedly mid-session.

### Exam mode availability
- **D-05:** The menu shows in all study modes, including Exam mode, with no mode-based suppression. `SEDIT-01`'s permission rule (owner or EDIT access) is the only gate — no additional mode check needed in `StudyCardMenu` or `SessionRunner`.

### Jump to deck behavior
- **D-06:** "Jump to deck" navigates immediately, with no confirmation dialog — consistent with the existing "Leave Session" button in the top bar, which also navigates without confirming. Ratings already given are saved per-card server-side, so nothing is lost by leaving mid-session.

### Claude's Discretion
- Exact permission computation for `canEdit` (owner OR deck share with EDIT/MANAGE permission), the batch-lookup query shape in `study.ts`, and the exact shared-schema/component wiring are implementation details — see `.planning/research/ARCHITECTURE.md` Feature/Phase F, already researched in detail at milestone kickoff.

### Folded Todos
- **`2026-06-15-quick-edit-card-button-in-study-mode.md`** — "Add quick-edit / jump-to-card button in study mode". This is the original todo that `SEDIT-01..04` were derived from. Its suggestions (3-dot `DropdownMenu`, `MoreHorizontal` icon from lucide-react, placement in the progress row so it doesn't distract from the study flow, reusing `currentCard.deckId` + permission context) are folded into the decisions above. Resolved by this phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture — already researched at milestone kickoff
- `.planning/research/ARCHITECTURE.md` §"Permission Model" (Feature/Phase F: Quick-Edit in Study Mode) — full technical design: `canEdit: z.boolean()` added to `DueCardSchema`, batch-computed in `GET /api/study/due` and `GET /api/study/deck/:id` (owner OR EDIT/MANAGE share, single extra query building a `Set<deckId>`), new `StudyCardMenu.tsx` component, integration into `SessionRunner`, event-propagation guard note, and `onCardUpdated` wiring for `CardEditorModal`. Confidence noted as MEDIUM on the batch-query cost assumption (study.ts wasn't read in full during that research pass) — worth re-verifying against current `study.ts` during phase research.
- `.planning/research/SUMMARY.md` — milestone-level summary referencing the same feature.

### Requirements
- `.planning/REQUIREMENTS.md` §SEDIT — SEDIT-01 through SEDIT-04, the locked requirements for this phase.
- `.planning/ROADMAP.md` §"Phase 28: Quick-Edit in Study" — goal, success criteria, depends on Phase 22.

### Original todo (folded)
- `.planning/todos/pending/2026-06-15-quick-edit-card-button-in-study-mode.md` — source todo with UX suggestions now folded into `<decisions>`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CardEditorModal.tsx` (`apps/frontend/src/components/`) — already used in `DeckDetailPage.tsx` for add/edit card. Currently takes `card?: Card` and calls `onSuccess: () => void` with no updated-card payload — needs an `onCardUpdated` (or similar) callback added to support D-03's immediate refresh. Accepts `deckId` + optional `card` prop; `DueCard` shape (id, deckId, frontContent, backContent, tags) is compatible enough with `Card` for the fields the editor touches, but exact type compatibility should be checked during planning.
- `CardFlip.tsx` — the entire card body (front + back) is the flip click target via `onClick` + `role="button"`. Confirmed the progress row (D-01) sits outside this component entirely in `SessionRunner`, so no changes to `CardFlip` itself are needed for the menu.
- Existing `DropdownMenu` + destructive-item patterns from `DeckDetailPage.tsx` (Phase 17, `17-02`) — reuse for `StudyCardMenu`'s "Edit this card" / "Jump to deck" items.

### Established Patterns
- `SessionRunner` in `StudySessionPage.tsx` already renders the progress row (`SessionProgress` + deck badge + optional mode badge) as a `flex items-center gap-2` row directly above `CardFlip` — natural insertion point for the new menu trigger.
- `currentCard` comes from `useStudySession(cards, mode)`; `cards` is local component state (`useState<DueCard[]>`) set once per session load — supports the D-03 approach of replacing an item in place by `id`.
- `handleLeave` in `SessionRunner` already implements "navigate to deck or dashboard, no confirmation" — the same pattern "Jump to deck" (D-06) should follow.

### Integration Points
- `packages/shared/src/schemas/study.ts` — `DueCardSchema` needs `canEdit: z.boolean()` added (not yet present — confirmed via grep).
- `apps/backend/src/routes/study.ts` — both `GET /api/study/due` and `GET /api/study/deck/:id` need to compute and include `canEdit` per card.
- `SessionRunner` (`StudySessionPage.tsx`) — new `StudyCardMenu` renders in the progress row when `currentCard.canEdit`; handles opening `CardEditorModal` and applying the `onCardUpdated` result to local `cards` state.

</code_context>

<specifics>
## Specific Ideas

No specific visual mockups beyond what's captured in decisions — user deferred to the recommended (progress-row, consistent-with-existing-patterns) option at every choice point.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

### Reviewed Todos (not folded)
- **`2026-06-19-improve-user-management-and-email-based-auth-flows.md`** — matched at low relevance (0.6, generic user/phase keywords); already fully resolved by Phases 23–25. Not applicable to this phase.

</deferred>

---

*Phase: 28-quick-edit-in-study*
*Context gathered: 2026-07-01*
