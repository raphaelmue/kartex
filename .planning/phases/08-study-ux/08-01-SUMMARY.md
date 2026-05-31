---
phase: 08-study-ux
plan: 01
subsystem: testing
tags: [vitest, testing-library, react, tdd, study-session, deck-detail]

# Dependency graph
requires:
  - phase: 07-app-shell
    provides: AppShell with mobile sidebar — test mock patterns (vi.hoisted, vi.importActual) established

provides:
  - "RED test stubs for STUDY-01/02/03 (tag filter, session size picker, shuffle) in StudySessionPage.test.tsx"
  - "RED test stubs for STUDY-04 (groupCardsByFirstTag pure function + h3 tag section heading) in DeckDetailPage.test.tsx"
  - "Stub utility src/utils/groupCardsByFirstTag.ts — throws on call, replaced by real implementation in 08-03"

affects: [08-02, 08-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED phase: stub utility file (throws 'not implemented') allows import resolution while keeping tests failing for behavioral reasons"
    - "vi.hoisted() + vi.mock('@/lib/api') pattern for api.get mock sequences in page component tests"
    - "mockApiGet.mockImplementation(url => ...) for DeckDetailPage which has two concurrent api.get calls (fetchDeck + fetchCards)"
    - "StudySessionPage prefetch mock order: deck info → all cards → due cards (matches Promise.all order)"

key-files:
  created:
    - apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx
    - apps/frontend/src/pages/__tests__/DeckDetailPage.test.tsx
    - apps/frontend/src/utils/groupCardsByFirstTag.ts
  modified: []

key-decisions:
  - "Wave 0 stub pattern: created src/utils/groupCardsByFirstTag.ts as a throwing stub so DeckDetailPage tests can run and fail with behavioral errors (not Vite import resolution errors)"
  - "StudySessionPage does not import useAuth — confirmed from source read; no AuthContext mock needed in StudySessionPage tests"
  - "DeckDetailPage fetchShares is triggered only when ownerId === user.id — set ownerId to 'other-user' in test deck mock to avoid third api.get call"

patterns-established:
  - "Pattern: use mockApiGet.mockImplementation(url => ...) when a component makes parallel non-sequential api.get calls"
  - "Pattern: TDD stub file with throw new Error('not yet implemented') for Wave 0 when module doesn't exist yet"

requirements-completed: [STUDY-01, STUDY-02, STUDY-03, STUDY-04]

# Metrics
duration: 8min
completed: 2026-05-31
---

# Phase 8 Plan 01: Study UX RED Tests Summary

**13 failing RED test stubs covering tag filter (STUDY-01), session size picker (STUDY-02), shuffle (STUDY-03), and deck tag grouping (STUDY-04) — 52 existing tests unaffected**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-31T18:17:38Z
- **Completed:** 2026-05-31T18:25:56Z
- **Tasks:** 2
- **Files modified:** 3 (2 new test files + 1 stub utility)

## Accomplishments

- Created `StudySessionPage.test.tsx` with 10 failing tests for STUDY-01a/b/c/d, STUDY-02a/b/c/d, STUDY-03a/b — all failing with "Unable to find element" errors because config section UI doesn't exist yet
- Created `DeckDetailPage.test.tsx` with 3 failing tests: STUDY-04a/b fail with "not yet implemented" stub error, STUDY-04c fails with "Unable to find role='heading'" because flat Table layout has no h3 headings
- Created `src/utils/groupCardsByFirstTag.ts` stub (throws on call) to allow DeckDetailPage tests to import the module and fail at runtime rather than at Vite's compile-time import analysis

## Task Commits

Each task was committed atomically:

1. **Task 1: Create failing StudySessionPage test stub** - `7dff9a4` (test)
2. **Task 2: Create failing DeckDetailPage test stub** - `58e7cdb` (test)

**Plan metadata:** (docs commit follows)

_Note: Wave 0 is a TDD RED-only plan — no feat/refactor commits. Implementation follows in 08-02 and 08-03._

## Files Created/Modified

- `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx` — 10 RED tests for STUDY-01/02/03 (tag filter, session size, shuffle in StudySessionPage config section)
- `apps/frontend/src/pages/__tests__/DeckDetailPage.test.tsx` — 3 RED tests for STUDY-04 (groupCardsByFirstTag pure function + tag section h3 rendering)
- `apps/frontend/src/utils/groupCardsByFirstTag.ts` — Wave 0 stub (throws "not yet implemented"); replaced with real implementation in 08-03

## Decisions Made

- **Stub file approach:** Vite's import-analysis plugin resolves `import()` expressions at compile time even when wrapped in async functions. Created a stub utility file (`src/utils/groupCardsByFirstTag.ts`) that throws at runtime — this allows the 3 STUDY-04 tests to run and produce behavioral failures instead of zero tests / one suite-level error.
- **DeckDetailPage ownerId = 'other-user':** Set ownerId different from the test user's id to prevent `fetchShares()` from being triggered, avoiding a third `api.get` call that would need mocking.
- **mockApiGet.mockImplementation(url =>):** Used `mockImplementation` (not `mockResolvedValueOnce`) for DeckDetailPage because `fetchDeck` and `fetchCards` run concurrently with `Promise.resolve` — order of call resolution is non-deterministic.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced top-level dynamic import with stub utility file for groupCardsByFirstTag RED tests**

- **Found during:** Task 2 (DeckDetailPage test stub creation)
- **Issue:** Plan specified importing `groupCardsByFirstTag` from `@/utils/groupCardsByFirstTag` (which doesn't exist yet). A top-level static import would fail at Vite's transform phase, producing 0 tests instead of 3 failing tests. A dynamic `import()` inside an async function was also analyzed at compile time by Vite's `vite:import-analysis` plugin, still failing at transform phase.
- **Fix:** Created `src/utils/groupCardsByFirstTag.ts` as a Wave 0 stub that exports a function throwing "not yet implemented". This satisfies Vite's import resolution while ensuring tests fail with behavioral errors at runtime. Wave 2 (08-03) replaces the stub with real implementation.
- **Files modified:** `apps/frontend/src/utils/groupCardsByFirstTag.ts` (created)
- **Verification:** `yarn test --run src/pages/__tests__/DeckDetailPage.test.tsx` shows 3 failing tests with "not yet implemented" and "Unable to find role='heading'" errors
- **Committed in:** `58e7cdb` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test setup approach due to Vite compile-time import analysis)
**Impact on plan:** Auto-fix was essential to produce 3 individually failing tests. The stub file approach is cleaner than the plan's implied approach and produces a better RED gate for Wave 2.

## Issues Encountered

- Vite 5.x analyzes all `import()` dynamic expressions at compile time via `vite:import-analysis` plugin — dynamic imports to non-existent modules fail at transform phase, not at runtime. Resolved by creating stub file.

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `groupCardsByFirstTag` throws | `src/utils/groupCardsByFirstTag.ts` | 6 | Wave 0 placeholder — real implementation added in 08-03 |

## Threat Flags

None — this plan creates only test files and a throwing stub utility. No new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Next Phase Readiness

- Wave 1 (08-02): Implement config section UI in `StudySessionPage.tsx` (tag filter chips, session size segmented buttons, shuffle logic). Tests STUDY-01/02/03 will turn GREEN.
- Wave 2 (08-03): Implement `groupCardsByFirstTag` utility and replace flat Table in `DeckDetailPage.tsx` with tag-sectioned layout. Tests STUDY-04a/b/c will turn GREEN.
- All 52 existing tests continue to pass — no regressions.

---
*Phase: 08-study-ux*
*Completed: 2026-05-31*
