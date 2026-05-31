# Phase 8: Study UX - Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase adds pre-session configuration controls to the study flow and reorganizes the deck detail card list by tag:

1. **Tag filter (STUDY-01)** — Before starting a session, the user can select one or more tags via toggle chips to limit which cards appear.
2. **Session size picker (STUDY-02)** — Before starting a session, the user can choose a card count: All due / 10 / 20 / Custom (inline number input). Applies to SR mode only.
3. **Shuffle (STUDY-03)** — Cards in every session are shuffled (random order) before `useStudySession` receives them. Frontend-only, no user interaction needed.
4. **Deck detail tag grouping (STUDY-04)** — Deck detail page replaces the flat card table with tag-sectioned layout: bold tag header + mini-table of cards per section, "Untagged" section last.

**In scope:** STUDY-01, STUDY-02, STUDY-03, STUDY-04 — frontend changes only.
**Out of scope:** Backend schema changes (no Topic model — tags stay as `card.tags[]`), global `/study` route configuration, new API endpoints (tag filtering is client-side).

</domain>

<decisions>
## Implementation Decisions

### Session Setup Screen (STUDY-01, STUDY-02)
- **D-01:** The tag filter and session size picker appear **above the 3 mode cards** on the existing mode selector screen (`StudySessionPage`) — a "Session options" section between the title/back button and the mode cards.
- **D-02:** The config section appears on **deck-specific sessions only** (`/decks/:id/learn`). The global `/study` route skips mode selection and goes directly into SR mode — no config screen shown there.
- **D-03:** The config section layout: tag chips on one side, size picker on the other (or stacked), separated from the mode cards by spacing/divider.

### Tag Filter (STUDY-01)
- **D-04:** Default state: **no tags selected = all cards included**. User opts into filtering by clicking tag chips.
- **D-05:** **Untagged cards are always excluded when any tag filter is active.** If the user selects "biology", only cards tagged with "biology" appear — cards with no tags are excluded.
- **D-06:** Multiple tags selected uses **OR logic**: a card appears if it matches any of the selected tags.
- **D-07:** Tag filter UI: **toggle chips** — each tag is a small clickable chip. Selected = filled/active style, deselected = outline. Tags derived client-side from the fetched deck cards.

### Session Size Picker (STUDY-02)
- **D-08:** Session size picker applies to **SR mode only**. Deck Mode and Exam Mode continue to use all cards (Exam Mode already has a time-based limit).
- **D-09:** The 4 options (All due / 10 / 20 / Custom) are displayed as a **segmented button row**.
- **D-10:** Selecting "Custom" reveals an **inline number input** immediately — no modal or popover.

### Shuffle (STUDY-03)
- **D-11:** Cards are shuffled **client-side in `StudySessionPage`** before being passed to `SessionRunner`/`useStudySession`. Apply to all 3 modes. No UI indicator needed — "always in random order" per requirement.

### Deck Detail Tag Grouping (STUDY-04)
- **D-12:** Replace the flat `<Table>` with a **section layout**: bold tag header (e.g., "biology — 3 cards") + a mini-table of cards for that tag group.
- **D-13:** Within each section, cards render with the same **table columns** as before: # / Front / Tags / Actions. Edit/Delete actions remain.
- **D-14:** Cards with **multiple tags appear under their first tag only** — no duplication across sections.
- **D-15:** Sections are ordered **alphabetically by tag name**. The **"Untagged" section always appears last**.

### Claude's Discretion
- Exact Tailwind classes for the config section layout, chip toggle states (selected vs. deselected), segmented button row styling
- Whether to extract the config section as a `SessionConfig` sub-component or keep inline in `StudySessionPage`
- Tag section header format ("biology" vs. "Biology" capitalization, card count display style)
- Empty state within a tag section (if tag exists but no cards matched — edge case)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Study UX — STUDY-01, STUDY-02, STUDY-03, STUDY-04 (4 requirements for this phase)
- `.planning/ROADMAP.md` §Phase 8 — Success criteria (4 criteria, the acceptance test for this phase)

### Files Being Modified
- `apps/frontend/src/pages/StudySessionPage.tsx` — Add config section (tag filter + size picker) above mode cards; shuffle cards before `SessionRunner`. This is the primary file.
- `apps/frontend/src/pages/DeckDetailPage.tsx` — Replace flat `<Table>` with tag-sectioned layout. Secondary file.
- `apps/frontend/src/hooks/useStudySession.ts` — Read-only reference; shuffle happens upstream before this hook receives cards. No changes expected.

### Shared Types
- `packages/shared/src/schemas/` — `DueCard` type (already includes `tags: string[]`). No schema changes needed.

### Patterns from Prior Phases
- `apps/frontend/src/pages/DeckDetailPage.tsx` — `TagChips` component (toggle chip pattern to extend for filter chips)
- `apps/frontend/src/pages/StudySessionPage.tsx` — Existing mode selector and `SessionRunner` structure — understand before modifying
- `apps/frontend/src/components/AppShell.tsx` — shadcn Button `variant="ghost"` and `size="icon"` toggle pattern

### Prior Decisions Applicable
- 05-UAT decision: "tag-as-topic + filtered study UI, no schema change" — confirms no new Topic model; tag filtering is client-side only
- 04-01: SM-2 and study flow decisions — SR mode behavior unchanged by this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StudySessionPage.tsx` mode selector screen — config section inserts between title area and mode cards. `cards` array is already fetched; tag list can be derived from `cards.flatMap(c => c.tags)` with dedup.
- `DeckDetailPage.tsx` `TagChips` component — existing chip display; extend into a toggleable `TagFilterChip` for the session config.
- shadcn `Button` with `variant="outline"` / `variant="default"` — use for segmented button row (All/10/20/Custom) and chip toggle states.
- `useStudySession.ts` — receives `cards: DueCard[]`. Shuffle before calling this hook. Standard Fisher-Yates or `[...arr].sort(() => Math.random() - 0.5)`.

### Established Patterns
- Tag data is `card.tags: string[]` already returned by `/api/study/due` and `/api/study/deck/:deckId` — no new API calls needed for tag filter.
- `StudySessionPage` already prefetches deck info (`deckTitle`, `deckTotalCards`, `deckDueCount`) before mode selection. Tag list can be derived from the card fetch that happens on mode selection, or from an additional prefetch of `/api/decks/:id/cards`.
- shadcn Select already used for Exam Mode time picker — session size uses buttons instead (segmented row) to avoid nesting two selects.
- Shuffle must not mutate the fetched `cards` array — use spread: `const shuffled = [...cards].sort(() => Math.random() - 0.5)`.

### Integration Points
- `StudySessionPage` loads cards after `selectedMode` is set. Tag filter + size should be applied to `cards` after fetch, before passing to `SessionRunner`.
- `DeckDetailPage` fetches cards via `/api/decks/${deckId}/cards` — all cards returned, group client-side by first tag.
- No backend changes needed. All filtering, sizing, and grouping is client-side.

</code_context>

<specifics>
## Specific Ideas

- Config section layout: tag chip row on one line, size picker segmented buttons on the next line (or same row on wide screens, stacked on mobile).
- Tag chip toggle: deselected = `variant="outline"`, selected = `variant="default"` (filled). Uses shadcn Button.
- Segmented size buttons: a row of 4 Buttons (`All` / `10` / `20` / `Custom`) where the active one has `variant="default"` and others `variant="outline"`. When "Custom" is active, an Input field appears to the right.
- Deck detail section header example: `<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">biology <span className="font-normal">— 3 cards</span></h3>`.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-study-ux*
*Context gathered: 2026-05-31*
