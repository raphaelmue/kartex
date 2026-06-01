---
phase: 08-study-ux
fixed_at: 2026-05-31T22:02:00Z
review_path: .planning/phases/08-study-ux/08-REVIEW.md
iteration: 1
fix_scope: critical_warning
findings_in_scope: 8
fixed: 7
skipped: 1
status: partial
---

# Phase 08: Code Review Fix Report

**Fixed at:** 2026-05-31T22:02:00Z
**Source review:** .planning/phases/08-study-ux/08-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (CR-01, CR-02, CR-03, WR-01, WR-02, WR-03, WR-04, WR-05)
- Fixed: 7
- Skipped: 1 (WR-03 resolved by CR-02)

## Fixed Issues

### CR-01: Replace biased shuffle with Fisher-Yates

**Files modified:** `apps/frontend/src/pages/StudySessionPage.tsx`
**Commit:** 8660bb2
**Applied fix:** Added a correct non-mutating Fisher-Yates `shuffle<T>()` function at module level (before `SessionRunner`). Replaced `[...sized].sort(() => Math.random() - 0.5)` with `shuffle(sized)` in the loadCards effect.

---

### CR-02: Guard loadCards effect against mid-session re-triggering

**Files modified:** `apps/frontend/src/pages/StudySessionPage.tsx`
**Commit:** 2e2c5fa
**Applied fix:** Added a module-level `CommittedConfig` type and a `committedConfig` state hook. The loadCards effect now depends on `[committedConfig, deckId]` instead of `[selectedMode, deckId, selectedTags, sessionSize, customCount]`. Each mode button (SR, Deck, Exam) now calls both `setSelectedMode` and `setCommittedConfig` atomically when clicked. Global SR sessions receive an auto-committed config via `useState` initializer. This prevents any live config-state change from resetting an in-progress session.

---

### CR-03: Add `patch: vi.fn()` to DeckDetailPage test mock

**Files modified:** `apps/frontend/src/pages/__tests__/DeckDetailPage.test.tsx`
**Commit:** 4f9e725
**Applied fix:** Added `patch: vi.fn()` to the `vi.mock('@/lib/api', ...)` object alongside the existing `get`, `post`, and `delete` mocks.

---

### WR-01: Fix SR endpoint for deck-scoped study

**Files modified:** `apps/frontend/src/pages/StudySessionPage.tsx`
**Commit:** b5c3bc2
**Applied fix:** Changed endpoint selection so SR + deckId now uses `/api/study/deck/${deckId}` instead of falling through to `/api/study/due`. The redundant client-side `data.filter((c) => c.deckId === deckId)` block was removed; server-side scoping is now sufficient.

---

### WR-02: Fix `makeCard` fixture to match DueCard schema

**Files modified:** `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx`
**Commit:** 179be89
**Applied fix:** Updated `makeCard` return type and implementation: replaced `dueAt: string` with `nextReview: string` and added `deckTitle: 'Test Deck'`. The return type annotation was updated to match.

---

### WR-04: Log prefetch errors instead of silently swallowing

**Files modified:** `apps/frontend/src/pages/StudySessionPage.tsx`
**Commit:** 7e76efa
**Applied fix:** Changed `catch {` to `catch (err) {` and replaced the silent swallow comment with `console.error('[StudySessionPage] prefetch failed:', err)` for visibility in dev tools.

---

### WR-05: Fix variable shadowing in groupCardsByFirstTag

**Files modified:** `apps/frontend/src/utils/groupCardsByFirstTag.ts`
**Commit:** bb758df
**Applied fix:** Renamed the inner `.map()` destructuring from `[tag, cards]` to `[tag, groupCards]` and updated the return expression to `{ tag, cards: groupCards }`. Eliminates shadowing of the outer `cards` parameter.

---

## Skipped Issues

### WR-03: Tag chip click during prefetch triggers redundant loadCards effect

**File:** `apps/frontend/src/pages/StudySessionPage.tsx:275`
**Reason:** resolved by CR-02 — WR-03 described the same root cause (loadCards effect reacting to live selectedTags changes). CR-02 fixed this by replacing the live-state deps with a committedConfig snapshot. No separate fix needed.
**Original issue:** selectedTags was a dependency of loadCards effect, creating a latent ordering hazard; resolved by narrowing deps to [committedConfig, deckId].

---

_Fixed: 2026-05-31T22:02:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
