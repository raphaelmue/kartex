---
phase: 08-study-ux
plan: 02
subsystem: frontend
tags: [react, vitest, study-session, tag-filter, session-size, shuffle, tdd-green]

# Dependency graph
requires:
  - phase: 08-01
    provides: RED test stubs for STUDY-01/02/03 in StudySessionPage.test.tsx

provides:
  - "Tag filter chip UI (STUDY-01) — OR logic, untagged excluded when any tag active"
  - "Session size segmented button row + custom inline input (STUDY-02) — SR mode only"
  - "Fisher-Yates shuffle applied in loadCards useEffect (STUDY-03) — all 3 modes"
  - "Config section (Filter by tag + Session size) in mode selector — hidden when no tags"

affects: [08-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "availableTags derived from allCardsRes prefetch useEffect (not from cards state) — prevents chip list from shrinking when filter is active"
    - "Tag filter + size slice + shuffle applied in single loadCards useEffect pipeline — one setCards call"
    - "SIZE_OPTIONS declared as module-level const to avoid re-creation on render"
    - "Functional setState for selectedTags Set — creates new Set copy to trigger React re-render"

key-files:
  created: []
  modified:
    - apps/frontend/src/pages/StudySessionPage.tsx
    - apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx

key-decisions:
  - "Progress text format fix: RED tests expected '1 / 5' but SessionProgress renders 'Card 1 of 5'; updated test assertions to match actual component output"
  - "act() removed from STUDY-03a/b: Vitest 2.1.9 + React 18 warns 'environment not configured to support act()'; replaced with direct waitFor pattern used by all other tests"
  - "loadCards dep array extended with selectedTags, sessionSize, customCount — read synchronously inside async IIFE so stale closure is not an issue; deps ensure effect re-fires if user navigates back and changes options"

requirements-completed: [STUDY-01, STUDY-02, STUDY-03]

# Metrics
duration: 6min
completed: 2026-05-31T18:37:51Z
---

# Phase 8 Plan 02: Tag Filter + Session Size + Shuffle (GREEN) Summary

**Implemented tag filter chips (STUDY-01), session size segmented buttons (STUDY-02), and Fisher-Yates shuffle (STUDY-03) in StudySessionPage.tsx — all 10 RED tests now GREEN**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-31T18:31:00Z
- **Completed:** 2026-05-31T18:37:51Z
- **Tasks:** 1
- **Files modified:** 2 (StudySessionPage.tsx + StudySessionPage.test.tsx)

## Accomplishments

- Added `Input` import and module-level `SIZE_OPTIONS` constant to `StudySessionPage.tsx`
- Added four new state variables: `availableTags: string[]`, `selectedTags: Set<string>`, `sessionSize: 'all' | 10 | 20 | 'custom'`, `customCount: number`
- Modified prefetch useEffect: cast `allCardsRes.json()` to `DueCard[]` and derive unique sorted tags via `setAvailableTags([...new Set(all.flatMap(c => c.tags))].sort())`
- Modified loadCards useEffect: replaced `setCards(filtered)` with three-step pipeline — tag filter (OR logic, D-05/D-06) → size slice (SR mode only, D-08) → Fisher-Yates shuffle (D-11) → `setCards(shuffled)`
- Added config section JSX in `!selectedMode` branch: "Filter by tag" chip row + "Session size (SR mode only)" segmented button row; both conditional on `availableTags.length > 0` (hidden for untagged decks per D-02)
- Fixed test assertions and removed `act()` wrapper (see Deviations)

## Task Commits

1. **Task 1: Implement tag filter + session size + shuffle in StudySessionPage.tsx** — `b641ab7` (feat)

## Files Created/Modified

- `apps/frontend/src/pages/StudySessionPage.tsx` — Added Input import, SIZE_OPTIONS const, 4 state vars, config section JSX, filter+slice+shuffle pipeline (338 → 433 lines, 95 lines added)
- `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx` — Fixed test assertions (progress text format) and removed act() wrapper for STUDY-03a/b tests

## Decisions Made

- **Progress text format:** `SessionProgress` renders `Card X of Y` not `X / Y`. Updated test assertions accordingly rather than changing the established component behavior.
- **act() removal:** Vitest 2.1.9 + React 18 does not have act() support configured; `act(async () => { await waitFor(...) })` pattern triggers warnings and timing issues. Refactored STUDY-03a/b to use `waitFor` directly (same pattern as all other tests in the file).
- **dep array extended:** `selectedTags`, `sessionSize`, `customCount` added to loadCards useEffect deps; these are read synchronously inside the async IIFE so the effect closure captures current values at fire time — no stale closure risk.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed progress text format mismatch in test assertions**

- **Found during:** Task 1 (first test run after implementation)
- **Issue:** The RED test stubs from 08-01 used `expect(progressText).toContain('1 / 5')` but `SessionProgress` renders `Card 1 of 5`. These assertions would never pass without changing the component (which would break established UX).
- **Fix:** Updated 7 assertion strings in `StudySessionPage.test.tsx` from `'1 / 5'` / `'1 / 10'` / `'1 / 15'` / regex `/1 \/ 15/` to the correct `'Card 1 of 5'` / `'Card 1 of 10'` / `'Card 1 of 15'` format.
- **Files modified:** `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx`
- **Committed in:** `b641ab7`

**2. [Rule 1 - Bug] Removed act() wrapper from STUDY-03a/b tests**

- **Found during:** Task 1 (second test run — 8 passed but STUDY-03a/b still failing)
- **Issue:** `act(async () => { await waitFor(...) })` caused "The current testing environment is not configured to support act(...)" warnings and timing failures. The `waitFor` inside `act` was not resolving because the prefetch mocks had already been consumed before `waitFor` ran.
- **Fix:** Refactored STUDY-03a and STUDY-03b to use the same `waitFor` + `fireEvent` + `waitFor` pattern used by all other tests in the file. Also moved the loadCards mock setup to after `waitFor(() => filter by tag visible)` (matching the ordering used in STUDY-01b/c).
- **Files modified:** `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx`
- **Committed in:** `b641ab7`

---

**Total deviations:** 2 auto-fixed (Rule 1 — test bugs in RED stubs from 08-01)
**Impact:** Both fixes were essential. The test assertions were incorrect and would never pass without them. The act() pattern was incompatible with the Vitest 2.1.9 environment.

## Verification Results

1. **StudySessionPage tests: 10/10 GREEN**
   ```
   ✓ STUDY-01a: no tags selected — all 15 cards pass through
   ✓ STUDY-01b: tag "bio" selected — only bio cards; untagged excluded
   ✓ STUDY-01c: tags "bio" and "chem" — OR logic
   ✓ STUDY-01d: chip toggle variant (default ↔ outline)
   ✓ STUDY-02a: sessionSize=10, SR mode — sliced to 10
   ✓ STUDY-02b: sessionSize=10, Deck mode — all 15 cards (no slice)
   ✓ STUDY-02c: sessionSize=custom, customCount=5 — sliced to 5
   ✓ STUDY-02d: Custom button reveals spinbutton input
   ✓ STUDY-03a: all 15 cards reach SessionRunner (no loss, no duplication)
   ✓ STUDY-03b: shuffle is non-mutating (original array unchanged)
   ```

2. **Full suite: 62 passed, 3 failed** — the 3 failures are the intentional Wave 0 RED stubs in `DeckDetailPage.test.tsx` (STUDY-04a/b/c), to be made GREEN in 08-03. No regressions from the 52 pre-existing tests.

3. **Math.random in loadCards useEffect (not render path):** `grep -n 'Math.random' StudySessionPage.tsx` → line 263 inside useEffect body. Pitfall 1 avoided.

4. **setAvailableTags in prefetch useEffect:** line 213 inside `if (allCardsRes.ok)` block. Pitfall 2 avoided.

5. **File under 500 lines:** 433 lines.

## Known Stubs

None — this plan made the implementation GREEN. No placeholder data or stubs remain in the implemented code.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes. T-08-04 mitigation applied: `Math.max(1, parseInt(e.target.value, 10) || 1)` in custom count onChange. T-08-03 accepted: React JSX auto-escapes `{tag}` interpolation.

## Next Phase Readiness

- Wave 2 (08-03): Implement `groupCardsByFirstTag` utility and replace flat Table in `DeckDetailPage.tsx` with tag-sectioned layout. Tests STUDY-04a/b/c will turn GREEN.
- All 62 currently-passing tests must remain green after 08-03.

---
*Phase: 08-study-ux*
*Completed: 2026-05-31*
