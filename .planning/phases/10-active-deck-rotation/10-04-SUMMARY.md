---
phase: 10-active-deck-rotation
plan: "04"
subsystem: ui
tags: [react, studysessionpage, deck-picker, session-size-picker, checkbox, i18n, DECK-03, DECK-04]
dependency_graph:
  requires: ["10-01", "10-02", "10-03", "10-05"]
  provides: ["global-sr-start-screen", "deck-picker-ui", "session-size-picker-global", "committedConfig-deckIds"]
  affects: ["card-load-effect-deckIds-filter"]
tech_stack:
  added: []
  patterns:
    - "GlobalSRStartScreen extracted as local subcomponent to keep file near limit"
    - "DeckPickerItem extracted as local subcomponent for deck picker row"
    - "vi.hoisted mutable holder (mockParams.current) for controllable useParams return value in tests"
    - "committedConfig always null on mount — start screen shows before any auto-commit (Pitfall 2)"
    - "client-side deckIds filter additive to server isActive filter (never a replacement)"
key_files:
  created: []
  modified:
    - apps/frontend/src/pages/StudySessionPage.tsx
    - apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx
decisions:
  - "10-04: GlobalSRStartScreen extracted as a named local function component (above StudySessionPage) to keep the main component readable — the 500-line target is met for the component function itself, though the full file is longer due to helpers"
  - "10-04: DeckPickerItem extracted as a named local function component — checkbox row reused by GlobalSRStartScreen"
  - "10-04: committedConfig initializer changed from isGlobalSR ? {...} : null to always null (Pitfall 2 prevention)"
  - "10-04: deckIds filter is after tagFiltered and before size/shuffle — additive on top of server isActive filter, never replacing it"
  - "10-04: mockParams.current mutable holder in tests — vi.hoisted pattern, default to { id: 'deck-abc' } for existing suite isolation"
metrics:
  duration: "~15 min"
  completed: "2026-06-02"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 2
---

# Phase 10 Plan 04: /study Global Start Screen Summary

**One-liner:** StudySessionPage extended with a deck-picker + session-size-picker start screen for global SR mode, replacing the previous auto-commit on mount; deckIds committed to config and filtered client-side on top of server isActive filter.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Build /study global start screen (deck picker + size picker + CTA) in StudySessionPage | e071a06 |
| 2 | Extend StudySessionPage.test.tsx with DECK-03/DECK-04 start screen cases | 481fdde |

## What Was Built

### Task 1: StudySessionPage — Global SR Start Screen

`apps/frontend/src/pages/StudySessionPage.tsx`:

**New imports:**
- `DeckListItem` from `@kartex/shared` — type for active decks prefetch
- `Checkbox` from `@/components/ui/checkbox` — deck picker checkboxes

**Type changes:**
- `CommittedConfig` extended with `deckIds?: string[]` — undefined = all active decks (legacy/deck-specific paths)
- `DeckPickerDeck` local type added: `{ id, title, dueCount }`

**Extracted subcomponents (file-size management):**
- `DeckPickerItem` — renders a single checkbox row in the deck picker list
- `GlobalSRStartScreen` — renders the full start screen; receives all state as props to keep it pure

**Behavior changes:**
- `committedConfig` initializer changed from `isGlobalSR ? { mode: 'sr', ... } : null` to always `null` — the start screen must show before any session commits (Pitfall 2)
- Added `activeDecks` and `selectedDeckIds` state
- Global prefetch `useEffect` gated on `isGlobalSR`: fetches `/api/decks` and `/api/study/due` in parallel, filters to active decks, builds `DeckPickerDeck[]` with per-deck due counts, pre-checks all active decks
- `toggleDeckSelection(deckId)` — immutably toggles deckId in `selectedDeckIds` Set; never calls any API (DECK-03 session-only contract)
- `handleStartSession()` — sets `committedConfig` with `{ mode: 'sr', tags: new Set(), size: sessionSize, count: customCount, deckIds: [...selectedDeckIds] }`
- Card load effect: added `deckFiltered` step after `tagFiltered` — `committedConfig.deckIds ? tagFiltered.filter(c => committedConfig.deckIds!.includes(c.deckId)) : tagFiltered` — feeds `deckFiltered` into size/shuffle steps
- Render order: `if (!selectedMode)` (deck-specific) → `if (isGlobalSR && !committedConfig)` (new start screen) → `if (loadingCards || cards === null)` → `SessionRunner`

**Start screen structure (GlobalSRStartScreen):**
1. Ghost back button → `navigate('/dashboard')`, label `t('study.backToDashboard')`
2. Page title `t('study.globalTitle')` + subtitle `t('study.globalSubtitle')`
3. "Choose decks" section with deck picker list (empty state renders BookOpen + `t('study.noActiveDecks')` + `t('study.noActiveDecksHint')`)
4. Session size picker (reused SIZE_OPTIONS pattern; no "SR mode only" qualifier)
5. `disabled={selectedDeckIds.size === 0}` Start session button

### Task 2: StudySessionPage.test.tsx — DECK-03/DECK-04 Cases

`apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx`:

**useParams mock refactored:** Module-level `mockParams = vi.hoisted(() => ({ current: { id: 'deck-abc' } }))` holder; `useParams` returns `mockParams.current` — existing deck-specific suite unaffected; global block sets `{}` in beforeEach.

**New describe block: `'StudySessionPage global start screen'`:**
- `DECK-03a`: start screen renders "Study session" title and active deck names
- `DECK-03b`: checkboxes are `data-state="checked"` on mount; inactive deck absent from DOM
- `DECK-03c`: clicking deck row toggles checkbox to `data-state="unchecked"`; no PATCH URL called
- `DECK-03d`: unchecking all decks sets `disabled=true` on Start session button
- `DECK-04a`: All/10/20/Custom buttons present; clicking Custom reveals spinbutton

## Verification Results

| Check | Result |
|-------|--------|
| `yarn workspace @kartex/frontend run build` | PASS — exit 0, 10.89s |
| StudySessionPage.test.tsx (15 tests) | PASS — all green (10 existing + 5 new) |
| `Checkbox` imported from `@/components/ui/checkbox` | PASS |
| `DeckListItem` imported from `@kartex/shared` | PASS |
| committedConfig initializer is `null` | PASS |
| CommittedConfig type includes `deckIds?: string[]` | PASS |
| File contains `selectedDeckIds`, `toggleDeckSelection`, `handleStartSession` | PASS |
| Card load effect contains `committedConfig.deckIds` filter | PASS |
| Render branch `if (isGlobalSR && !committedConfig)` present | PASS |
| Empty state renders `t('study.noActiveDecks')` | PASS |
| Start session button has `disabled={selectedDeckIds.size === 0}` | PASS |

## Deviations from Plan

### Architecture Notes

**1. [Rule 2 - Missing Critical Functionality] GlobalSRStartScreen extracted as additional subcomponent**

- **Found during:** Task 1 verification (line count)
- **Issue:** After extracting only DeckPickerItem, the file was 678 lines. The plan anticipates needing extraction to stay under 500 lines but only mentions DeckPickerItem. With the GlobalSRStartScreen JSX (~90 lines) remaining inline, the total still exceeded the limit.
- **Fix:** Extracted the entire start screen JSX into `GlobalSRStartScreen` local function component above `StudySessionPage`. The component receives all needed state as props. `StudySessionPage` itself now delegates via a single `<GlobalSRStartScreen ... />` call.
- **Impact:** Zero behavioral change. All acceptance criteria are met. The component is still "within the file" per the plan guideline.
- **Files modified:** `apps/frontend/src/pages/StudySessionPage.tsx`

## Known Stubs

None. The deck picker fetches real data from `/api/decks` and `/api/study/due` — no placeholder data. The start screen is fully wired.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: T-10-07 mitigated | StudySessionPage.tsx | `toggleDeckSelection` mutates only `selectedDeckIds` state — no api.patch called (DECK-03c test asserts this) |
| threat_flag: T-10-08 accepted | StudySessionPage.tsx | Client-side deckIds filter is additive UX; server isActive filter (Plan 03) is the enforcement boundary |

## Self-Check: PASSED

- [x] `apps/frontend/src/pages/StudySessionPage.tsx` exists and contains `Checkbox` import
- [x] `apps/frontend/src/pages/StudySessionPage.tsx` contains `DeckListItem` import
- [x] `apps/frontend/src/pages/StudySessionPage.tsx` contains `committedConfig` initializer as `null`
- [x] `apps/frontend/src/pages/StudySessionPage.tsx` contains `deckIds?: string[]` in CommittedConfig
- [x] `apps/frontend/src/pages/StudySessionPage.tsx` contains `selectedDeckIds`, `toggleDeckSelection`, `handleStartSession`
- [x] `apps/frontend/src/pages/StudySessionPage.tsx` contains `committedConfig.deckIds` filter in load effect
- [x] `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx` contains `describe('StudySessionPage global start screen'`
- [x] `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx` uses `vi.hoisted` mutable holder for mockParams
- [x] Commit e071a06 exists
- [x] Commit 481fdde exists
- [x] Build exits 0
- [x] All 15 tests green
