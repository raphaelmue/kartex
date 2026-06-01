---
phase: 08-study-ux
reviewed: 2026-05-31T18:51:01Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx
  - apps/frontend/src/pages/__tests__/DeckDetailPage.test.tsx
  - apps/frontend/src/utils/groupCardsByFirstTag.ts
  - apps/frontend/src/pages/StudySessionPage.tsx
  - apps/frontend/src/pages/DeckDetailPage.tsx
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-05-31T18:51:01Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 08 adds study-session UX improvements (tag filter, session size picker, shuffle) and deck tag-grouping to `DeckDetailPage`. The implementation is generally well-structured, but contains three blockers: a biased shuffle algorithm that systematically under-represents cards at the ends of the deck, a `loadCards` effect that fires on every `selectedTags` / `sessionSize` / `customCount` state change even after a session has already started (causing in-progress sessions to reset), and a type gap where `DeckDetailPage` calls `api.patch` but the test mock never declares a `patch` method, meaning any real patch path in tests silently falls through to `undefined`. Five additional warnings cover an incorrect SR endpoint, a `dueAt` field mismatch between test fixtures and the live schema, a re-entrant prefetch triggered on tag toggle, suppressed fetch errors in two catch blocks, and a key-collision risk in tag grouping. Three info items cover dead code, a magic number, and an unused import in the test file.

---

## Critical Issues

### CR-01: Biased shuffle — `sort(() => Math.random() - 0.5)` is not a correct Fisher-Yates shuffle

**File:** `apps/frontend/src/pages/StudySessionPage.tsx:263`

**Issue:** The comment says "non-mutating Fisher-Yates approximation" but the implementation is neither Fisher-Yates nor an approximation of it — it is a comparison-sort with a random comparator. This is a well-documented anti-pattern: JavaScript's `Array.prototype.sort` is not guaranteed to call the comparator a fixed number of times per element, which causes different elements to experience different numbers of random trials. The result is a statistically biased permutation. Cards at the start of a short array are systematically more likely to remain near the start. For a study tool where seeing cards in varied orders is the core value, this is a correctness defect, not a performance issue.

The test `STUDY-03a` only checks that all 15 cards are present (count = 15) and does not verify uniform distribution, so this bug passes the test suite.

**Fix:**
```typescript
// Non-mutating Fisher-Yates (correct)
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Replace line 263:
const shuffled = shuffle(sized)
```

---

### CR-02: `loadCards` effect re-triggers mid-session, silently resetting an in-progress session

**File:** `apps/frontend/src/pages/StudySessionPage.tsx:226–275`

**Issue:** The `useEffect` that loads cards lists `[selectedMode, deckId, selectedTags, sessionSize, customCount]` as dependencies (line 275). Once a mode is selected (`selectedMode !== null`) and a session is running, any change to `selectedTags`, `sessionSize`, or `customCount` will re-fire the effect and call `setCards(shuffled)` with a fresh card list. Because `SessionRunner` is keyed on `cards` (not on a stable key), this replaces the running session without warning, discarding all progress already rated in that session.

A user who accidentally taps a tag chip after starting a session loses their progress with no confirmation. This is a data-loss risk for the study loop — the core value of the application.

**Fix:** Split config state from session state. Guard the effect so it only runs when the user explicitly triggers it (e.g. via a "Start" button that calls a `loadCards` function), rather than reacting to every config-state change. Alternatively, separate the config phase from the running phase with a boolean gate:

```typescript
// Add a committed-config snapshot; only re-load when this snapshot changes
const [committedConfig, setCommittedConfig] = useState<{
  mode: StudyMode; tags: Set<string>; size: 'all' | 10 | 20 | 'custom'; count: number
} | null>(null)

useEffect(() => {
  if (!committedConfig) return
  // ... load cards using committedConfig values ...
}, [committedConfig, deckId])

// On mode card click:
setCommittedConfig({ mode: 'sr', tags: selectedTags, size: sessionSize, count: customCount })
setSelectedMode('sr')
```

---

### CR-03: `DeckDetailPage` calls `api.patch` but the test mock does not declare `patch` — silent runtime error in tests

**File:** `apps/frontend/src/pages/__tests__/DeckDetailPage.test.tsx:40–46` and `apps/frontend/src/pages/DeckDetailPage.tsx:256`

**Issue:** The `api` mock in `DeckDetailPage.test.tsx` declares only `get`, `post`, and `delete`:

```typescript
vi.mock('@/lib/api', () => ({
  api: {
    get: mockApiGet,
    post: vi.fn(),
    delete: vi.fn(),
  },
}))
```

`DeckDetailPage.handleUpdateSharePermission` calls `api.patch(...)` (line 256 of `DeckDetailPage.tsx`). If a test ever exercises that code path, `api.patch` is `undefined` and the call throws `TypeError: api.patch is not a function` at runtime. This is a test reliability defect — it means the share-permission update path is untestable in the current test setup and would produce a confusing error rather than a meaningful failure.

Additionally, `api.patch` is not declared in the mock but IS used by the production component, so any future test that tries to cover `handleUpdateSharePermission` will silently fail to intercept the call.

**Fix:** Add `patch: vi.fn()` to the mock:

```typescript
vi.mock('@/lib/api', () => ({
  api: {
    get: mockApiGet,
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))
```

---

## Warnings

### WR-01: SR mode with `deckId` calls `/api/study/due` (all-decks endpoint) instead of a deck-scoped endpoint

**File:** `apps/frontend/src/pages/StudySessionPage.tsx:232–236`

**Issue:** The endpoint selection logic for SR + deckId falls through to `/api/study/due` (the global due endpoint), then post-filters in the client with `data.filter((c) => c.deckId === deckId)`. This means the browser fetches every due card across all the user's decks, only to throw most of them away. More importantly, if the user has many decks, the client-side filter silently discards due cards from other decks — which is intentional — but the wasted network transfer grows unboundedly with the user's total card count.

The existing `GET /api/study/deck/:deckId` endpoint (used for Deck mode) returns only due cards for that deck. SR + deckId should use this endpoint and let the server do the filtering. The current logic:

```typescript
selectedMode === 'sr' && !deckId
  ? '/api/study/due'
  : selectedMode === 'sr' && deckId
    ? '/api/study/due'          // BUG: should be /api/study/deck/:deckId
    : `/api/study/deck/${deckId}`
```

reduces to: always `/api/study/due` for SR mode, regardless of deckId.

**Fix:**
```typescript
const endpoint =
  selectedMode === 'sr' && !deckId
    ? '/api/study/due'
    : `/api/study/deck/${deckId}`
```
Then remove the redundant client-side `data.filter((c) => c.deckId === deckId)` block, since the server now scopes the response.

Note: the test mock at line 94 of `StudySessionPage.test.tsx` already returns `mockCards.slice(0, 5).map((c) => ({ ...c, deckId: 'deck-abc' }))` for the third prefetch call (the `/api/study/due` call), which masks this bug in tests because all mock data happens to share the same `deckId`.

---

### WR-02: Test fixture `makeCard` includes `dueAt` field absent from the `DueCard` schema

**File:** `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx:36–61`

**Issue:** `makeCard` returns an object with a `dueAt: string` field (line 46). The `DueCard` schema in `packages/shared/src/schemas/study.ts` has no `dueAt` field — it uses `nextReview?: string`. The fixture also lacks the required `deckTitle: string` field from `DueCardSchema`. TypeScript may not catch this at test time because the mock returns `any`-typed responses through `res.json()` casts, but it means the test fixtures do not accurately represent what the real API returns. If the production component ever accesses `card.deckTitle`, tests will not catch regressions because the field is absent from all fixtures.

**Fix:** Update `makeCard` to match `DueCard`:
```typescript
function makeCard(id: string, tags: string[]) {
  return {
    id,
    frontContent: `Front ${id}`,
    backContent: `Back ${id}`,
    tags,
    deckId: 'deck-abc',
    deckTitle: 'Test Deck',
    nextReview: '2026-01-01',
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
  }
}
```

---

### WR-03: Tag chip click during prefetch triggers a redundant `loadCards` effect call before mode is confirmed

**File:** `apps/frontend/src/pages/StudySessionPage.tsx:275`

**Issue:** `selectedTags` is a dependency of the `loadCards` effect. Because `selectedMode` starts as `null` for deck-specific sessions, the guard `if (!selectedMode) return` (line 228) prevents a card load on initial render. However, if the user selects a mode (setting `selectedMode = 'sr'`), and then later interacts with the config UI (which is no longer shown — see `if (!selectedMode)` at line 278), this is not reachable in practice today. But this is a latent ordering hazard: the guard condition and the JSX rendering condition are not in sync. The config panel renders only when `selectedMode === null`, yet the effect runs whenever `selectedTags` changes regardless of whether the config panel is visible. Any future refactor that keeps config visible after mode selection (e.g., to allow mid-session filter changes) would immediately trigger the CR-02 bug path.

More immediately: if a user selects mode SR (triggering a load), then the load completes and `cards` is set — any programmatic state update to `selectedTags` (e.g., from a parent) would retrigger the effect and silently replace the card list.

**Fix:** This is resolved by the same fix as CR-02 (commit the config snapshot at the moment the mode button is clicked; stop deriving load triggers from live config state).

---

### WR-04: Prefetch `catch` block swallows all errors silently with no user feedback

**File:** `apps/frontend/src/pages/StudySessionPage.tsx:219–221`

**Issue:** The prefetch effect's catch block is:
```typescript
} catch {
  // Non-critical for mode selector — swallow
}
```

If the prefetch fails (network error, 500), the user sees the mode selector with `0 cards due` and an empty tag list — indistinguishable from a deck with no cards and no due items. There is no indication that the data failed to load. The user may choose "Spaced Repetition" expecting to study due cards, only to get an empty session with no explanation.

**Fix:** At minimum, log the error for debugging. Better: show a non-blocking inline warning in the mode selector:
```typescript
} catch (err) {
  console.error('[StudySessionPage] prefetch failed:', err)
  // Optionally: setDeckLoadError(true) to show a warning in the UI
}
```

---

### WR-05: `groupCardsByFirstTag` — variable shadowing on the `cards` parameter name

**File:** `apps/frontend/src/utils/groupCardsByFirstTag.ts:21`

**Issue:** The function signature uses `cards` as a parameter name (line 3: `cards: Card[]`), and the `.map()` callback on line 21 destructures the same name:
```typescript
return sorted.map(([tag, cards]) => ({ tag, cards }))
```
The inner `cards` shadows the outer `cards` parameter. While JavaScript resolves this correctly (the inner binding wins inside the callback), this is a classic naming confusion that can mislead readers into thinking they are referencing the original input array. It also triggers `no-shadow` ESLint rules in many configurations.

**Fix:**
```typescript
return sorted.map(([tag, groupCards]) => ({ tag, cards: groupCards }))
```

---

## Info

### IN-01: `SessionRunner` — `examExpired` state is set but never used to change session behavior

**File:** `apps/frontend/src/pages/StudySessionPage.tsx:46, 138–146`

**Issue:** `examExpired` is set to `true` when `ExamTimer.onExpire` fires (line 46). It triggers a visible banner (lines 138–146). However, the banner says "Rate this card to finish" but does not prevent the user from continuing to navigate to further cards (the rating buttons remain fully enabled after the last card's rating). The `examExpired` state does not gate any behavior — the session can continue past expiry indefinitely. This may be intentional (per D-05: "timer expired banner"), but if the intent is to stop the session at expiry, the current implementation does not accomplish that.

**Fix:** If the timer should end the session, call `setSessionDone(true)` inside `onExpire`. If the intent is only to show the banner and let the user finish the current card, document this explicitly with a comment.

---

### IN-02: Magic number `0.5` in the shuffle comparator is unexplained

**File:** `apps/frontend/src/pages/StudySessionPage.tsx:263`

**Issue:** `[...sized].sort(() => Math.random() - 0.5)` — the `0.5` is the midpoint used to split positive/negative returns from the comparator. While common knowledge in JS circles, it is a magic number and its meaning is non-obvious to readers unfamiliar with this anti-pattern. Since CR-01 recommends replacing this entirely with a proper Fisher-Yates, the magic number goes away as part of that fix.

**Fix:** Resolved by the fix for CR-01.

---

### IN-03: Unused import `fireEvent` in `DeckDetailPage.test.tsx`

**File:** `apps/frontend/src/pages/__tests__/DeckDetailPage.test.tsx:2`

**Issue:** `fireEvent` is imported from `@testing-library/react` (line 2) but is never used in the file. None of the three test cases simulate any user interaction — they only render and assert.

**Fix:**
```typescript
import { render, screen, waitFor } from '@testing-library/react'
```

---

_Reviewed: 2026-05-31T18:51:01Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
