---
phase: 15-stats-feature
plan: 01
subsystem: testing
tags: [vitest, tdd, stats, red-test-scaffold]

requires:
  - phase: 14-schema-foundation
    provides: StatsSummarySchema, PerDeckProgressSchema, DifficultyBreakdownSchema, MASTERED_INTERVAL_DAYS, MASTERED_REPETITIONS, ReviewLog model

provides:
  - "Wave 0 RED test scaffold: 3 behavioral contract files (22 it.todo stubs total)"
  - "Backend stub: apps/backend/src/routes/__tests__/stats-summary.test.ts (9 todos for STATS-01..04 + T-15-01)"
  - "Frontend stub: apps/frontend/src/components/__tests__/StatsSummaryPanel.test.tsx (7 todos)"
  - "Frontend stub: apps/frontend/src/pages/__tests__/DashboardPage.test.tsx (4 todos)"

affects:
  - "15-02: Wave 1 backend implementation — must satisfy all 9 backend stubs"
  - "15-03: Wave 2 frontend implementation — must satisfy all 11 frontend stubs"

tech-stack:
  added: []
  patterns:
    - "Minimal RED stub pattern: import { describe, it } from 'vitest' only; no expect, no mocks, no component imports — todos are descriptive strings only"
    - "Wave 0 convention: test files must not import not-yet-created modules to prevent broken imports before Wave 1/2"

key-files:
  created:
    - apps/backend/src/routes/__tests__/stats-summary.test.ts
    - apps/frontend/src/components/__tests__/StatsSummaryPanel.test.tsx
    - apps/frontend/src/pages/__tests__/DashboardPage.test.tsx
  modified: []

key-decisions:
  - "Wave 0 stub pattern: import { describe, it } from 'vitest' with it.todo() only — no rendering or Prisma mocks before Wave 1/2 exists"
  - "Pre-existing kartex-parser-id.test.ts failures (3 RED assertions from Phase 14) confirmed pre-existing; backend exits 1 at baseline — not caused by Plan 01"

patterns-established:
  - "RED stub pattern established for Phase 15: descriptive it.todo strings only, no imports of Wave 1/2 artifacts"

requirements-completed: [STATS-01, STATS-02, STATS-03, STATS-04]

duration: 2min
completed: 2026-06-10
---

# Phase 15 Plan 01: Stats Feature Wave 0 RED Test Scaffold Summary

**Three Vitest stub files (22 it.todo entries) locking the behavioral contract for the stats endpoint, StatsSummaryPanel component, and DashboardPage parallel-fetch integration before Wave 1/2 implementation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-06-10T08:54:04Z
- **Completed:** 2026-06-10T08:56:09Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Backend behavioral contract locked: 9 it.todo stubs in `stats-summary.test.ts` covering STATS-01..04 (totalReviewed, weekReviewed, retentionRate null guard, difficultyBreakdown null guard, perDeck all-decks, mastered threshold, T-15-01 userId scoping)
- Frontend behavioral contract locked: 7 it.todo stubs in `StatsSummaryPanel.test.tsx` covering loading skeleton, all chip states, null summary empty state
- DashboardPage integration contract locked: 4 it.todo stubs in `DashboardPage.test.tsx` covering Promise.allSettled parallel fetch, hero isolation, silent stats failure (SC-5, T-15-04), and statsLoading prop
- Frontend suite green: 11 tests pass, 2 new stub files discovered as skipped (11 todos total)

## Task Commits

1. **Task 1: Backend stats-summary RED test stub** - `50628bf` (test)
2. **Task 2: Frontend StatsSummaryPanel + DashboardPage RED test stubs** - `16acd66` (test)

## Files Created/Modified

- `apps/backend/src/routes/__tests__/stats-summary.test.ts` — 9 it.todo stubs for GET /api/stats/summary behavioral contract (STATS-01..04, T-15-01)
- `apps/frontend/src/components/__tests__/StatsSummaryPanel.test.tsx` — 7 it.todo stubs for StatsSummaryPanel rendering contract
- `apps/frontend/src/pages/__tests__/DashboardPage.test.tsx` — 4 it.todo stubs for DashboardPage parallel fetch integration

## Decisions Made

- Wave 0 stub pattern: `import { describe, it } from 'vitest'` with no `expect`, no mocks, no component imports — todos are descriptive strings only. Matches `study-rate-reviewlog.test.ts` pattern exactly.
- Pre-existing `kartex-parser-id.test.ts` failures (3 RED assertions from Phase 14 IMP-07) confirmed pre-existing; backend suite exits 1 at baseline regardless of Plan 01 changes. These are out of scope — Phase 14 parser implementation pending in Phase 16.

## Deviations from Plan

### Pre-Existing Issue (not caused by Plan 01)

**1. [Out of Scope - Pre-existing] kartex-parser-id.test.ts 3 RED failures block backend exit 0**
- **Found during:** Task 1 verification
- **Issue:** `yarn workspace @kartex/backend test --run` exits 1 due to 3 failing assertions in `kartex-parser-id.test.ts` (IMP-07 — parser `id:` field not yet implemented). This is a Phase 14/16 gap.
- **Fix:** Confirmed pre-existing by stashing new file and re-running — same 3 failures. Out of scope per scope-boundary rule.
- **Deferred to:** `deferred-items.md` — kartex-parser-id.test.ts RED assertions require Phase 16 parser id: field implementation
- **Impact on Plan 01:** Plan 01 acceptance criterion "exits 0" cannot be fully met due to pre-existing failures. New file adds zero new failures; 9 todos show as skipped correctly.

---

**Total deviations:** 0 auto-fixed (1 pre-existing out-of-scope noted)
**Impact on plan:** Plan 01 deliverables fully met. Pre-existing backend failures are not caused by this plan.

## Issues Encountered

- Backend suite pre-existing exit 1: kartex-parser-id.test.ts IMP-07 parser tests are RED stubs from Phase 14 that await Phase 16 implementation. Verified by running suite without new file (same failures). Documented in deferred-items.md.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Wave 0 behavioral contracts are locked: all three test stub files exist with correct it.todo conventions
- Wave 1 (Plan 02) can implement `apps/backend/src/routes/stats.ts` + `apps/backend/src/index.ts` against the 9 backend stubs
- Wave 2 (Plan 03) can implement `StatsSummaryPanel.tsx` + DashboardPage parallel fetch against the 11 frontend stubs
- Pre-existing `kartex-parser-id.test.ts` failures will need to be addressed in Phase 16 (IMP-07 parser id: field)

## Self-Check: PASSED

- [x] `apps/backend/src/routes/__tests__/stats-summary.test.ts` — FOUND
- [x] `apps/frontend/src/components/__tests__/StatsSummaryPanel.test.tsx` — FOUND
- [x] `apps/frontend/src/pages/__tests__/DashboardPage.test.tsx` — FOUND
- [x] `.planning/phases/15-stats-feature/15-01-SUMMARY.md` — FOUND
- [x] Commit `50628bf` — FOUND
- [x] Commit `16acd66` — FOUND

---
*Phase: 15-stats-feature*
*Completed: 2026-06-10*
