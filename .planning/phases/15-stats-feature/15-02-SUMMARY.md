---
phase: 15-stats-feature
plan: 02
subsystem: api
tags: [hono, prisma, typescript, i18n, stats, reviewlog]

# Dependency graph
requires:
  - phase: 14
    provides: ReviewLog model with @@index([userId, reviewedAt]), StatsSummarySchema/constants in @kartex/shared, CardProgress fields (interval, repetitions, nextReview, lastReviewed)
provides:
  - GET /api/stats/summary endpoint returning StatsSummary shape (totalReviewed, weekReviewed, retentionRate, difficultyBreakdown, perDeck)
  - 12 dashboard.stats.* i18n keys in en.json and de.json (English + German)
  - statsRouter exported from apps/backend/src/routes/stats.ts and registered under /api/stats
affects: [15-03-PLAN.md, DashboardPage.tsx parallel fetch integration, StatsSummaryPanel.tsx component]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hono route with four Prisma queries scoped to userId — exact structural analog to dashboard.ts"
    - "retentionRate null-on-empty guard: totalLast30 === 0 ? null : rate (T-15-02)"
    - "difficultyBreakdown null-on-empty guard: breakdown.length === 0 ? null : {...} (Pitfall 7)"
    - "Nested progress: { where: { userId } } in per-deck Deck.findMany to prevent cross-user data (T-15-01, Pitfall 4)"
    - "MASTERED_INTERVAL_DAYS and MASTERED_REPETITIONS imported from @kartex/shared — no magic numbers"
    - "Atomic i18n commit: en.json + de.json updated in same commit (STATE.md 10-05)"

key-files:
  created:
    - apps/backend/src/routes/stats.ts
  modified:
    - apps/backend/src/index.ts
    - apps/frontend/src/locales/en.json
    - apps/frontend/src/locales/de.json

key-decisions:
  - "Prisma client regenerated with prisma generate — Phase 14 ReviewLog migration existed but generated client was stale; unblocked compilation"
  - "Pre-existing kartex-parser-id test failures (IMP-07, 3 tests) are out of scope for Phase 15 — deferred to Phase 16 import implementation"
  - "retentionRate returns null (not 0) when no ReviewLog data — honors T-15-02 / STATS-02 null empty-state contract"
  - "difficultyBreakdown returns null (not zero-filled object) when no ReviewLog data — honors T-15-02 / STATS-03 null empty-state contract"
  - "perDeck uses ownerId: userId scope (consistent with dashboard.ts pattern) — shared decks out of scope for Phase 15 per RESEARCH Pitfall 6"

patterns-established:
  - "Stats route pattern: stats.get('/summary', async(c) => { const userId = c.get('userId'); ... }) mirrors dashboard.ts exactly"
  - "MASTERED threshold: interval >= MASTERED_INTERVAL_DAYS && repetitions >= MASTERED_REPETITIONS (import from @kartex/shared)"

requirements-completed: [STATS-01, STATS-02, STATS-03, STATS-04]

# Metrics
duration: 6min
completed: 2026-06-10
---

# Phase 15 Plan 02: Stats Backend + i18n Summary

**GET /api/stats/summary Hono endpoint with four scoped Prisma queries, null empty-state guards for ReviewLog-derived fields, and 12 dashboard.stats.* i18n keys added atomically to en.json + de.json**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-06-10T09:00:04Z
- **Completed:** 2026-06-10T09:05:44Z
- **Tasks:** 2
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- Created `apps/backend/src/routes/stats.ts` with `GET /api/stats/summary` handler implementing all four STATS-01..04 requirements
- Registered `statsRouter` under `/api/stats` in `apps/backend/src/index.ts` — auth coverage from existing `app.use('/api/*', authMiddleware)` at line 54
- Added all 12 `dashboard.stats.*` i18n keys to both `en.json` and `de.json` in a single atomic commit (STATE.md decision 10-05)

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement GET /api/stats/summary route and register it** - `23576db` (feat)
2. **Task 2: Add dashboard.stats.* i18n keys to en.json and de.json** - `2afa2e1` (feat)

## Files Created/Modified
- `apps/backend/src/routes/stats.ts` — New statsRouter: STATS-01 (totalReviewed/weekReviewed from CardProgress), STATS-02 (retentionRate from ReviewLog with null guard), STATS-03 (difficultyBreakdown groupBy with null guard), STATS-04 (per-deck progress with nested userId scope)
- `apps/backend/src/index.ts` — Added import + `app.route('/api/stats', statsRouter)` after dashboardRouter registration
- `apps/frontend/src/locales/en.json` — 12 new keys under `dashboard.stats` (English values)
- `apps/frontend/src/locales/de.json` — 12 new keys under `dashboard.stats` (German values)

## Decisions Made
- **Prisma generate required:** Phase 14 added the ReviewLog model to schema.prisma and wrote the SQL migration, but the Prisma client had not been regenerated. `yarn workspace @kartex/backend prisma generate` was run to unblock TypeScript compilation. This is a one-time fix; the generated files are in `.gitignore`-adjacent node_modules.
- **Pre-existing test failures scoped out:** `kartex-parser-id.test.ts` has 3 failing tests for IMP-07 (optional `id:` field in kartex parser). These failures existed before this plan and are not related to Phase 15 work. They are deferred to Phase 16.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma client stale — ReviewLog model missing from generated client**
- **Found during:** Task 1 (backend build verification)
- **Issue:** `prisma.reviewLog` TypeScript error: `Property 'reviewLog' does not exist on type 'PrismaClient'`. Phase 14 added ReviewLog to schema.prisma and created the SQL migration, but `prisma generate` had not been run to update the generated client in node_modules.
- **Fix:** Ran `yarn workspace @kartex/backend prisma generate` to regenerate the Prisma client with ReviewLog model included.
- **Files modified:** `node_modules/.prisma/client/` (regenerated, not committed — generated artifact)
- **Verification:** `yarn workspace @kartex/backend build` exits 0 after regeneration.
- **Committed in:** 23576db (included in Task 1 commit context, client itself not committed)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Single auto-fix was essential to unblock compilation. No scope creep. Stale Prisma client is a routine post-migration step.

## Issues Encountered
- Pre-existing kartex-parser-id test failures (3 tests, IMP-07) exist before and after this plan. Out of scope for Phase 15. Documented in deferred items.

## Known Stubs

None — all data flows wired to live Prisma queries. No placeholder values, hardcoded empties, or TODO markers in the created files.

## Threat Flags

No new threat surface introduced beyond what is documented in the plan's threat model. The stats endpoint is covered by:
- T-15-01: all Prisma queries scope to `userId` from `c.get('userId')` — never from params/body
- T-15-02: null guards on retentionRate and difficultyBreakdown prevent misleading 0%/zero-fill
- T-15-03: ReviewLog index `@@index([userId, reviewedAt])` backs all 30-day range scans (Phase 14)

## Next Phase Readiness
- Wave 2 (Plan 15-03) can now consume `GET /api/stats/summary` and all 12 `dashboard.stats.*` i18n keys
- `StatsSummaryPanel.tsx` component and `DashboardPage.tsx` parallel fetch integration are the remaining deliverables
- Backend build clean, frontend build clean

---
*Phase: 15-stats-feature*
*Completed: 2026-06-10*
