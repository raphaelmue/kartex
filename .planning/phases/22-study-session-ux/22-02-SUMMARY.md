---
phase: 22-study-session-ux
plan: "02"
subsystem: frontend/lib/shuffle
tags: [study, shuffle, tdd, unit-test, refactor]
dependency_graph:
  requires: [22-01]
  provides: [STUDY-05-shuffle-verified]
  affects: [StudySessionPage, lib/shuffle.ts, lib/__tests__/shuffle.test.ts]
tech_stack:
  added: []
  patterns: [extract-to-lib, fisher-yates-shuffle, statistical-test, tdd-green]
key_files:
  created:
    - apps/frontend/src/lib/shuffle.ts
    - apps/frontend/src/lib/__tests__/shuffle.test.ts
  modified:
    - apps/frontend/src/pages/StudySessionPage.tsx
decisions:
  - "STUDY-05: Requirement confirmed closed — Fisher-Yates produces genuine cross-deck interleaving; 1000-run statistical test proves >95% cross-deck mixing"
  - "shuffle extracted to apps/frontend/src/lib/shuffle.ts as named export; StudySessionPage imports via @/lib/shuffle (no behavior change)"
  - "STUDY-05f mock uses try/finally + afterEach vi.restoreAllMocks() to prevent spy leakage across tests"
metrics:
  duration: "4m"
  completed: "2026-06-14"
  tasks_completed: 2
  files_modified: 3
---

# Phase 22 Plan 02: Shuffle Extraction and STUDY-05 Verification Summary

**One-liner:** Fisher-Yates shuffle extracted to `lib/shuffle.ts` as a named export; 6-test unit suite with 1000-run statistical cross-deck interleaving proof closes STUDY-05.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extract shuffle to lib and update StudySessionPage import | 660bf97 | lib/shuffle.ts, StudySessionPage.tsx |
| 2 | Write shuffle unit tests confirming cross-deck interleaving (STUDY-05) | 0518b90 | lib/__tests__/shuffle.test.ts |

## Implementation Details

### Task 1: Extract shuffle to lib/shuffle.ts

Created `apps/frontend/src/lib/shuffle.ts` with the identical Fisher-Yates implementation as a named export `export function shuffle<T>(arr: T[]): T[]`. The function is non-mutating — it spreads `arr` into `out` before performing in-place swaps.

In `StudySessionPage.tsx`: removed the local `function shuffle` definition (lines 20–28 including the CR-01 comment), and added `import { shuffle } from '@/lib/shuffle'` after the `useAuth` import. The call site at line ~489 (`const shuffled = shuffle(sized)`) was left untouched — pure refactor.

All 20 existing StudySessionPage tests pass without modification.

### Task 2: Shuffle unit tests (STUDY-05)

Created `apps/frontend/src/lib/__tests__/shuffle.test.ts` with explicit vitest imports (no globals — STATE.md 07-01 rule). Six test cases:

- **STUDY-05a** (set-equality): `shuffle([1,2,3,4,5])` returns all 5 elements sorted identically.
- **STUDY-05b** (non-mutation): input array is unchanged after shuffle.
- **STUDY-05c** (empty): `shuffle([])` returns `[]`.
- **STUDY-05d** (single): `shuffle(['x'])` returns `['x']`.
- **STUDY-05e** (cross-deck — STUDY-05 core): 30 cards (10 each from deck-A, deck-B, deck-C) shuffled 1000 times. Each run counts deckId transitions; grouped output has 2 transitions, interleaved has ≥4. Asserts `mixedCount > 950`. Result: **STUDY-05 confirmed closed** — Fisher-Yates does not produce deck-grouped output.
- **STUDY-05f** (deterministic): `vi.spyOn(Math, 'random').mockReturnValue(0)` forces j=0 always. For `[3,1,2]`: i=2 swaps idx2↔idx0 → `[2,1,3]`, i=1 swaps idx1↔idx0 → `[1,2,3]`. Wrapped in try/finally; `afterEach(vi.restoreAllMocks)` prevents spy leakage.

## Verification Results

```
grep -n "export function shuffle" apps/frontend/src/lib/shuffle.ts
→ 2: export function shuffle<T>(arr: T[]): T[]

grep -n "from '@/lib/shuffle'" apps/frontend/src/pages/StudySessionPage.tsx
→ 19: import { shuffle } from '@/lib/shuffle'

grep -n "^function shuffle" apps/frontend/src/pages/StudySessionPage.tsx
→ (no results — local definition removed)

npx vitest run src/lib/__tests__/shuffle.test.ts → 6 passed
npx vitest run src/pages/__tests__/StudySessionPage.test.tsx → 20 passed
```

## Deviations from Plan

None — plan executed exactly as written. The TDD sequence used GREEN-only (no RED phase) because Task 1 extracted the implementation before Task 2 wrote the tests — this matches the plan's intent ("the current implementation is correct, it is confirmed by runtime test").

## Known Stubs

None.

## Threat Flags

None — shuffle operates on in-memory card arrays; no new network endpoints, auth paths, file access, or schema changes.

## Self-Check: PASSED

- [x] `apps/frontend/src/lib/shuffle.ts` exists with `export function shuffle` at line 2
- [x] `apps/frontend/src/lib/__tests__/shuffle.test.ts` exists with 6 tests (STUDY-05a through STUDY-05f)
- [x] `apps/frontend/src/pages/StudySessionPage.tsx` imports from `'@/lib/shuffle'` at line 19
- [x] No local `function shuffle` in `StudySessionPage.tsx`
- [x] Commit `660bf97` exists (Task 1 — refactor extract shuffle)
- [x] Commit `0518b90` exists (Task 2 — feat shuffle tests)
- [x] 6/6 shuffle tests pass
- [x] 20/20 StudySessionPage tests pass (no regression)
- [x] STUDY-05e: >950/1000 cross-deck interleaving confirmed
