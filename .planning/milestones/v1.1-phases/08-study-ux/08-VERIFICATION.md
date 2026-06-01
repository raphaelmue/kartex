---
phase: 08-study-ux
verified: 2026-05-31T21:00:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open a deck with tagged cards at /decks/:id, click 'Study Deck'; verify the 'Filter by tag' chip row and 'Session size' button row appear above the three mode cards"
    expected: "Config section is visible before any mode is selected; tag chips match the tags present in the deck; size buttons (All due, 10, 20, Custom) are all rendered"
    why_human: "Visual layout and conditional rendering conditioned on availableTags.length > 0 cannot be verified programmatically against a live database"
  - test: "Select one tag chip (e.g. 'biology'); verify it changes to filled/primary style; click Spaced Repetition mode; verify only cards with that tag appear in the session"
    expected: "Chip shows variant=default (filled); session progress shows correct reduced count; cards with no tags do not appear"
    why_human: "Toggle visual state and actual filtered session behavior requires a real running app with seeded data"
  - test: "Select 'Custom' size button; enter 5 in the number input; start SR session; verify session is capped at 5 cards"
    expected: "Number input appears inline immediately after clicking Custom; session progress shows 'Card 1 of 5'"
    why_human: "Inline input appearance and session capping require integration with live data"
  - test: "Start two sessions on the same deck without changing any settings; verify card order differs between sessions"
    expected: "Cards appear in different order each time (shuffle is applied per D-11)"
    why_human: "Non-deterministic shuffle behavior cannot be proven by unit test order alone — requires running the app and observing two successive sessions"
  - test: "Navigate to /study (global study route); verify no config section appears"
    expected: "No 'Filter by tag' section and no 'Session size' section visible — mode selector is skipped entirely and SR starts directly"
    why_human: "D-02 restriction (config hidden for global /study route) requires live navigation"
  - test: "Open a deck with cards tagged 'bio', 'chem', and some untagged; navigate to /decks/:id; verify cards are grouped under h3 section headers alphabetically with 'Untagged' last"
    expected: "Section headers 'BIO', 'CHEM', 'UNTAGGED' (uppercase per Tailwind uppercase class) visible; untagged section appears last; same edit/delete actions work within each section"
    why_human: "Visual grouping and section ordering with real data requires a running app"
  - test: "A card with two tags (e.g. tags=['chem','bio']) should appear only under the 'CHEM' section in DeckDetailPage"
    expected: "The card appears once in the 'CHEM' section; it does not appear in the 'BIO' section"
    why_human: "First-tag-wins deduplication behavior requires real data inspection in the UI"
---

# Phase 8: Study UX Verification Report

**Phase Goal:** Users can target exactly what they want to study before starting a session
**Verified:** 2026-05-31T21:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Before starting a study session, the user can select one or more tags to limit which cards appear | VERIFIED | `StudySessionPage.tsx` lines 294–319: config section with `availableTags.map` renders a Button per tag; `selectedTags` Set state toggles via functional `setSelectedTags`; tag filter applied in loadCards useEffect (lines 247–251); STUDY-01a/b/c/d all pass GREEN |
| 2 | Before starting a session, the user can choose a card count: All due, 10, 20, or a custom number | VERIFIED | `StudySessionPage.tsx` lines 321–349: `SIZE_OPTIONS` constant drives 4 segmented buttons; Custom reveals `<Input type="number">`; slice applied only in SR mode (lines 254–260); STUDY-02a/b/c/d all pass GREEN |
| 3 | Cards within a session are always presented in a shuffled (random) order | VERIFIED | `StudySessionPage.tsx` line 263: `const shuffled = [...sized].sort(() => Math.random() - 0.5)` inside loadCards useEffect body — not in render path (Pitfall 1 avoided); STUDY-03a/b pass GREEN |
| 4 | On the deck detail page, cards are grouped under their tag headers, with untagged cards listed under "Untagged" | VERIFIED | `groupCardsByFirstTag.ts`: Map accumulator, alpha-sort, Untagged appended last; `DeckDetailPage.tsx` line 340: `groupCardsByFirstTag(cards).map(...)` replaces flat Table with per-section h3+Table layout; STUDY-04a/b/c all pass GREEN |

**Score:** 4/4 truths verified

---

### Deferred Items

None.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/frontend/src/pages/StudySessionPage.tsx` | Tag filter + session size UI + shuffle in loadCards | VERIFIED | 433 lines (under 500); contains availableTags/selectedTags/sessionSize/customCount state; config section JSX; filter+slice+shuffle pipeline |
| `apps/frontend/src/utils/groupCardsByFirstTag.ts` | Named export `groupCardsByFirstTag` — Map accumulator, alpha-sort, Untagged last | VERIFIED | 22 lines; named export confirmed at line 3; `tags[0] ?? 'Untagged'` key at line 7; Untagged appended last at lines 17–18 |
| `apps/frontend/src/pages/DeckDetailPage.tsx` | Flat Table replaced with grouped tag-section layout; imports groupCardsByFirstTag | VERIFIED | 497 lines (under 500); imports `groupCardsByFirstTag` at line 8; grouped sections JSX at line 340; CardActionCell helper extracted to stay under limit |
| `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx` | 10 tests covering STUDY-01/02/03 | VERIFIED | 10 tests, all GREEN; valid mock sequence for prefetch Promise.all |
| `apps/frontend/src/pages/__tests__/DeckDetailPage.test.tsx` | 3 tests covering STUDY-04 | VERIFIED | 3 tests, all GREEN; real groupCardsByFirstTag import and h3 heading assertion |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `availableTags` state | `allCardsRes` prefetch useEffect | `setAvailableTags([...new Set(all.flatMap((c) => c.tags))].sort())` | WIRED | Line 213 inside `if (allCardsRes.ok)` block — prefetch useEffect, not loadCards useEffect (Pitfall 2 avoided) |
| Tag chip onClick | `selectedTags` Set state | `setSelectedTags` functional update creating new Set copy | WIRED | Lines 307–312: functional update adds/deletes from new Set, returns new Set — triggers re-render |
| `loadCards` useEffect | `setCards(shuffled)` | tag filter → size slice → `[...sized].sort(() => Math.random() - 0.5)` | WIRED | Lines 247–265; all three steps present in order; `Math.random` on line 263 inside useEffect (not render) |
| `groupCardsByFirstTag` | `card.tags[0] ?? 'Untagged'` | Map accumulator keyed on first tag | WIRED | `groupCardsByFirstTag.ts` line 7 |
| Untagged sort | sections.filter(tag !== 'Untagged').sort + push Untagged last | filter alpha-sorted entries then push Untagged section | WIRED | `groupCardsByFirstTag.ts` lines 13–19 |
| section header h3 | `group.tag + groupCards.length` | JSX h3 rendering tag name and card count | WIRED | `DeckDetailPage.tsx` lines 342–345: `{tag}` and `{groupCards.length} cards` in h3 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `StudySessionPage.tsx` config section | `availableTags` | `allCardsRes.json()` in prefetch useEffect (line 211) — `/api/study/deck/${deckId}` | Yes — API response cast to `DueCard[]`, tags flatMapped and deduped | FLOWING |
| `StudySessionPage.tsx` SessionRunner | `cards` (shuffled) | `api.get(endpoint)` in loadCards useEffect (line 238); filter+slice+shuffle pipeline | Yes — API response processed and stored via `setCards(shuffled)` | FLOWING |
| `DeckDetailPage.tsx` grouped sections | `cards` | `api.get(/api/decks/${deckId}/cards)` in `fetchCards()` (line 148) | Yes — API response set via `setCards(await res.json())` | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite: 65/65 pass | `yarn workspace @kartex/frontend test --run` | 65 passed (8 test files), 0 failed | PASS |
| TypeScript typecheck exits 0 | `yarn workspace @kartex/frontend typecheck` | exit 0, no output | PASS |
| `Math.random` in useEffect body (not render) | grep `Math.random` in StudySessionPage.tsx | Line 263 inside `void (async () => {...})()` useEffect body | PASS |
| `setAvailableTags` in prefetch useEffect | grep `setAvailableTags` in StudySessionPage.tsx | Line 213 inside `if (allCardsRes.ok)` block in prefetch useEffect | PASS |
| `groupCardsByFirstTag` named export | grep `export function groupCardsByFirstTag` | Line 3 of groupCardsByFirstTag.ts | PASS |
| `Math.max(1` guard on customCount onChange | grep `Math.max(1` in StudySessionPage.tsx | Line 344: `setCustomCount(Math.max(1, parseInt(e.target.value, 10) \|\| 1))` | PASS |
| `groupCards.length` rendered in h3 | grep `groupCards.length` in DeckDetailPage.tsx | Line 344: `— {groupCards.length} cards` in h3 span | PASS |
| StudySessionPage under 500 lines | `wc -l` | 433 lines | PASS |
| DeckDetailPage under 500 lines | `wc -l` | 497 lines | PASS |

---

### Probe Execution

Step 7c: SKIPPED — no probe scripts declared in plans or found under `scripts/*/tests/probe-*.sh` for this phase. Phase 8 is a pure frontend change with no migration scripts.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| STUDY-01 | 08-01, 08-02 | User can filter a study session by one or more tags before it begins | SATISFIED | selectedTags Set state + tag chip UI + OR filter in loadCards useEffect; STUDY-01a/b/c/d GREEN |
| STUDY-02 | 08-01, 08-02 | User can choose session size (All due / 10 / 20 / custom) before starting a session | SATISFIED | SIZE_OPTIONS + sessionSize state + slice in loadCards (SR only); STUDY-02a/b/c/d GREEN |
| STUDY-03 | 08-01, 08-02 | Cards in a study session are always presented in random order | SATISFIED | Non-mutating Fisher-Yates in useEffect, line 263; STUDY-03a/b GREEN |
| STUDY-04 | 08-01, 08-03 | Deck detail page groups cards under tag headers; untagged cards appear under "Untagged" | SATISFIED | groupCardsByFirstTag.ts + DeckDetailPage grouped sections; STUDY-04a/b/c GREEN |

All 4 requirements in scope for Phase 8 are SATISFIED. No orphaned requirements found — REQUIREMENTS.md maps STUDY-01..04 to Phase 8, all claimed by plans 08-01/02/03.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `StudySessionPage.tsx` | 397 | `placeholder="Select time limit"` | Info | HTML input placeholder attribute — not a debt marker; this is the Exam Mode duration select, pre-existing behavior |
| `DeckDetailPage.tsx` | 394 | `placeholder="Username"` | Info | HTML input placeholder attribute on share form — pre-existing, not a debt marker |

No `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, or `not yet implemented` markers found in any Phase 8 production files. All Wave 0 stub code (`throw new Error('not yet implemented')` in the original groupCardsByFirstTag stub) was fully replaced by the real implementation in 08-03.

---

### Human Verification Required

Seven items require human testing against a running application with real data. All automated checks passed; the items below verify visual behavior, UX flow, and non-deterministic shuffle that unit tests cannot fully cover.

#### 1. Config section renders above mode cards

**Test:** Open a deck with tagged cards at `/decks/:id`, click "Study Deck"; observe the study session page before selecting a mode.
**Expected:** A "Filter by tag" chip row and a "Session size (SR mode only)" button row appear above the three mode cards. Chips are visible for all tags present in the deck.
**Why human:** `availableTags.length > 0` is the render condition — requires real DB data to populate tags.

#### 2. Tag chip OR filter limits the session

**Test:** Select one tag chip (e.g. "biology"); click Spaced Repetition mode.
**Expected:** Chip shows filled/primary style when selected. Session progress shows a reduced count matching only cards with that tag. Cards with no tags do not appear.
**Why human:** Filtered session count depends on actual deck data; visual toggle style is a class name not easily observable outside a browser.

#### 3. Custom session size caps the session

**Test:** Select "Custom" size button; enter 5 in the number input that appears inline; click Spaced Repetition mode.
**Expected:** Number input appears immediately without a modal. Session progress shows "Card 1 of 5".
**Why human:** Inline input appearance and session capping require integration with live card data.

#### 4. Sessions shuffle card order

**Test:** Start two sessions on the same deck without changing settings; observe card presentation order across both runs.
**Expected:** Card order differs between sessions (shuffle is applied per D-11).
**Why human:** Non-deterministic shuffle cannot be proven by unit test order checking — requires observing two live sessions.

#### 5. Global /study route shows no config section

**Test:** Navigate to `/study` (global study route, no deck ID); observe the page.
**Expected:** No "Filter by tag" and no "Session size" section visible. SR mode starts directly without a mode selector.
**Why human:** D-02 restriction (config hidden for global route) requires live navigation — `isGlobalSR = !deckId` branch is not covered by current tests.

#### 6. DeckDetailPage tag sections render correctly

**Test:** Open a deck with cards tagged "bio", "chem", and some untagged at `/decks/:id`.
**Expected:** Section headers "BIO", "CHEM", "UNTAGGED" (uppercase via Tailwind `uppercase` class) visible in alphabetical order; untagged section is last. Edit and Delete actions still work within each section's table rows.
**Why human:** Visual grouping layout and action button functionality within grouped rows requires a live app with seeded data.

#### 7. First-tag-wins deduplication in DeckDetailPage

**Test:** A card with two tags (e.g. tags=['chem','bio']) should appear only in the "CHEM" section.
**Expected:** The card appears once under "CHEM"; it does not also appear under "BIO".
**Why human:** Requires real data inspection in the rendered UI.

---

### Gaps Summary

No gaps found. All 4 ROADMAP success criteria are VERIFIED against the actual codebase. All 65 tests pass GREEN. TypeScript typecheck is clean. Both modified page files are under the 500-line CLAUDE.md limit. All key links are wired. All data flows are connected. No debt markers found in production files.

Status is `human_needed` (not `passed`) because 7 items require visual/interactive verification against a running application — per Step 9, human_needed takes precedence over passed even when all automated checks pass.

---

_Verified: 2026-05-31T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
