---
phase: 04-study-loops
plan: 01
subsystem: api
tags: [sm2, spaced-repetition, prisma, hono, zod, vitest]

# Dependency graph
requires:
  - phase: 03-card-crud
    provides: CardProgress Prisma model, cards.ts route pattern, authMiddleware

provides:
  - SM-2 pure function (calculateSM2) and streak utility (calculateStreak) exported from @kartex/shared
  - Zod schemas: RatingSchema, RateCardSchema, RateCardResponseSchema, DueCardSchema, DashboardStatsSchema
  - RATING_TO_QUALITY mapping (UI button 1-4 → SM-2 quality 0/3/4/5)
  - GET /api/study/due — due cards across all decks including never-seen cards
  - GET /api/study/deck/:deckId — all cards in a deck for Deck/Exam mode
  - POST /api/study/rate — server-side SM-2 computation + CardProgress upsert
  - GET /api/dashboard/stats — totalDue, reviewedToday, streak, byDeck[]
  - 14 passing unit tests (8 SM-2 algorithm + 6 streak edge cases)
affects: [04-study-session-ui, 04-dashboard, phase-5, phase-6]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SM-2 algorithm implemented as pure function in shared package for testability from frontend Vitest runner
    - Prisma compound unique accessor userId_cardId used in upsert where clause
    - Backend lib/sm2.ts re-exports from @kartex/shared for consistent import paths across the monorepo
    - noImplicitAny: explicit type annotations on Prisma map/filter callbacks required in strict mode

key-files:
  created:
    - packages/shared/src/lib/sm2.ts
    - packages/shared/src/schemas/study.ts
    - apps/backend/src/lib/sm2.ts
    - apps/backend/src/routes/study.ts
    - apps/backend/src/routes/dashboard.ts
    - apps/frontend/src/lib/__tests__/sm2.test.ts
    - apps/frontend/src/lib/__tests__/streak.test.ts
  modified:
    - packages/shared/src/index.ts
    - apps/backend/src/index.ts

key-decisions:
  - "SM-2 quality mapping: Again(1)=0, Hard(2)=3, Good(3)=4, Easy(4)=5 — RATING_TO_QUALITY constant in shared package"
  - "calculateSM2 uses original easeFactor (not new EF) for third+ interval calculation: interval = ceil(prev_interval * old_EF)"
  - "Streak starts from today if today has a review, else from yesterday — preserves streak for users who haven't studied yet today"
  - "Prisma map/filter callbacks require explicit type annotations ((p: (typeof arr)[number]) => ...) due to strict noImplicitAny in backend tsconfig"
  - "neverSeen cards filtered with .filter((card) => !cardIdsWithProgress.includes(card.id)) to avoid double-counting when due+never-seen overlap"

patterns-established:
  - "Pattern: Shared lib — place pure utility functions in packages/shared/src/lib/ so both backend and frontend Vitest runner can import"
  - "Pattern: Backend re-export — apps/backend/src/lib/*.ts re-exports from @kartex/shared for consistent import paths"
  - "Pattern: Prisma noImplicitAny fix — annotate callback params as (item: (typeof queryResult)[number]) => ..."

requirements-completed: [STDY-01, STDY-02, STDY-03, STDY-04, STDY-05, STDY-06, STDY-07]

# Metrics
duration: 10min
completed: 2026-05-28
---

# Phase 4 Plan 01: SM-2 Algorithm + Study API Summary

**SM-2 spaced-repetition pure function with 14 unit tests, 4 Zod schemas, and 4 backend endpoints (GET /study/due, GET /study/deck/:id, POST /study/rate, GET /dashboard/stats) wired into the Hono backend**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-28T14:50:00Z
- **Completed:** 2026-05-28T15:04:10Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- SM-2 algorithm implemented as tested pure function in shared package — importable by both backend and frontend Vitest
- 14 unit tests pass: 8 covering SM-2 algorithm edge cases (Again double-reset, easeFactor floor 1.3, first/second/third interval rules, Easy EF increase) + 6 covering streak edge cases (empty, today, yesterday, gap, consecutive, broken streak)
- All 4 backend endpoints registered with authMiddleware (JWT required); ownership checks implemented per threat model T-4-01 through T-4-05

## Task Commits

Each task was committed atomically:

1. **Task 1: SM-2 pure function + shared study schemas + unit tests** - `32a48c5` (feat)
2. **Task 2: Backend study + dashboard routers + index.ts registration** - `94c2ca0` (feat)

## Files Created/Modified
- `packages/shared/src/lib/sm2.ts` - calculateSM2, calculateStreak, RATING_TO_QUALITY, SM2Input/Output types
- `packages/shared/src/schemas/study.ts` - RatingSchema, RateCardSchema, DueCardSchema, DashboardStatsSchema
- `packages/shared/src/index.ts` - added barrel exports for study schemas and sm2 lib
- `apps/backend/src/lib/sm2.ts` - re-exports calculateSM2/calculateStreak/RATING_TO_QUALITY from @kartex/shared
- `apps/backend/src/routes/study.ts` - GET /due, GET /deck/:deckId, POST /rate with T-4-01/02/03 ownership + validation mitigations
- `apps/backend/src/routes/dashboard.ts` - GET /stats with totalDue, reviewedToday, streak, byDeck[] aggregation
- `apps/backend/src/index.ts` - registered /api/study and /api/dashboard after authMiddleware
- `apps/frontend/src/lib/__tests__/sm2.test.ts` - 14 test cases for calculateSM2 and calculateStreak
- `apps/frontend/src/lib/__tests__/streak.test.ts` - importability smoke test

## Decisions Made
- SM-2 uses original easeFactor (not updated EF) for computing third+ intervals — matches the classic algorithm spec
- calculateStreak accepts optional `today` parameter for deterministic testing with fixed dates
- Backend lib/sm2.ts is a thin re-export so consumers import from `../lib/sm2.js` with consistent paths

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript noImplicitAny errors on Prisma callback parameters**
- **Found during:** Task 2 (Backend study + dashboard routers)
- **Issue:** Backend tsconfig has `strict: true` which includes `noImplicitAny`. Prisma `findMany` results used in `.map()` and `.filter()` callbacks had implicit `any` type for the callback parameter, and `[...new Set(...)]` spread produced `unknown[]` instead of `string[]`
- **Fix:** Added explicit type annotations on all Prisma query result callbacks using `(item: (typeof queryResult)[number])` pattern. Used `Array.from(new Set(...))` with explicit `string[]` type annotation instead of spread
- **Files modified:** `apps/backend/src/routes/study.ts`, `apps/backend/src/routes/dashboard.ts`
- **Verification:** `yarn workspace @kartex/backend build` exits 0 with 0 type errors
- **Committed in:** `94c2ca0` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - TypeScript strict mode compliance)
**Impact on plan:** Fix required for TypeScript build to pass. No behavior change — only type annotation addition.

## Issues Encountered
- Pre-existing KartexRenderer.test.tsx failures (2 Typst tests) noted as baseline failures — not caused by this plan's changes. Confirmed by git stash verification.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 7 STDY requirements are backend-complete
- Plan 02 (study session UI) can now import DueCard, RateCardResponse types from @kartex/shared
- Plan 02 can call GET /api/study/due, GET /api/study/deck/:id, POST /api/study/rate
- Plan 03 (dashboard UI) can call GET /api/dashboard/stats
- No blockers

## Known Stubs
None — all endpoints return real data from database queries.

---
*Phase: 04-study-loops*
*Completed: 2026-05-28*
