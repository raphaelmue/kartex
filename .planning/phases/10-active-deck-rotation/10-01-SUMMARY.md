---
phase: 10-active-deck-rotation
plan: "01"
subsystem: frontend-tests
tags: [tdd, red-state, deck-toggle, wave-0]
dependency_graph:
  requires: []
  provides: [DECK-01-red-tests]
  affects: [apps/frontend/src/pages/__tests__/DecksPage.test.tsx]
tech_stack:
  added: []
  patterns: [vi.hoisted-mock, waitFor-direct, MemoryRouter-wrapper, deck-factory]
key_files:
  created:
    - apps/frontend/src/pages/__tests__/DecksPage.test.tsx
  modified: []
decisions:
  - "No AuthContext mock in DecksPage.test.tsx — DecksPage does not import useAuth (confirmed by source read, consistent with STATE.md 08-01)"
  - "DeckListItem factory uses 'as unknown as' cast because isActive field not yet on shared schema (Plan 02 adds it)"
  - "findByRole('switch') with name /toggle deck active/i used for DECK-01a/b — matches planned aria-label t('decks.toggleActive')"
metrics:
  duration: "~4 min"
  completed: "2026-06-02"
  tasks_completed: 1
  files_created: 1
---

# Phase 10 Plan 01: Wave 0 RED Test Scaffold Summary

**One-liner:** RED test scaffold for DECK-01 isActive toggle — four failing Vitest cases covering switch render state, PATCH call, and optimistic revert.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create DecksPage.test.tsx Wave 0 RED stub for DECK-01 | a01b43e | apps/frontend/src/pages/__tests__/DecksPage.test.tsx |

## What Was Built

Created `apps/frontend/src/pages/__tests__/DecksPage.test.tsx` with:

- **vi.hoisted** block exposing `mockApiGet` and `mockApiPatch` — both available inside vi.mock() factory (STATE.md 03-02)
- **Three vi.mock calls:** react-router-dom (preserve actual + override `useNavigate`), `@/lib/api` (get/patch/delete), `sonner` (toast.error/success)
- **No AuthContext mock** — DecksPage does not import useAuth (STATE.md 08-01 confirmed)
- **`makeDeck(id, isActive)` factory** returning DeckListItem-shaped object with all fields DecksPage renders; uses `as unknown as` cast since `isActive` is not yet in the shared schema
- **`renderPage()`** wrapping `<DecksPage />` in `<MemoryRouter>`
- **`beforeEach`** resetting both mocks and setting default GET/PATCH responses
- **Four it() cases** keyed by DECK-01a through DECK-01d in their names

## Test Results (RED Confirmed)

```
Test Files  1 failed | 9 passed (10)
Tests       4 failed | 67 passed (71)
```

All 4 DECK-01 cases fail with `Unable to find role="switch"` — a legitimate missing-implementation failure, not a parse or import error. Existing 67 tests remain green.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan creates only test infrastructure. No production code stubs introduced.

## Threat Flags

None — test-only plan, no runtime trust boundary crossed.

## Self-Check: PASSED

- File `apps/frontend/src/pages/__tests__/DecksPage.test.tsx` exists: FOUND
- Commit `a01b43e` exists: FOUND
- Tests collected and fail RED (not import error): CONFIRMED
- Existing 67 tests unaffected: CONFIRMED
