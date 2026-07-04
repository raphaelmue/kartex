---
phase: 30-study-timers-stats
plan: 01
subsystem: database
tags: [prisma, postgresql, zod, migrations, shared-schemas]

requires:
  - phase: 15-stats-feature
    provides: ReviewLog model + stats.ts null-on-empty convention
  - phase: 18-library-deck-toggle
    provides: DeckShare join-table pattern (hand-written migration precedent)

provides:
  - ReviewLog.thinkingTimeMs nullable column
  - StudySession + StudySessionDeck Prisma models and live-DB tables
  - Shared Zod contract for session start/complete requests and stats responses
    (StudySessionStartSchema, StudySessionCompleteSchema, StudySessionSchema,
    RecentSessionSchema, PerDeckProgressSchema.avgThinkingTimeMs,
    StatsSummarySchema.recentSessions)

affects: [30-02, 30-03, 30-04, 30-05]

tech-stack:
  added: []
  patterns:
    - "Hand-written SQL migration applied via Docker image rebuild + container restart (entrypoint runs prisma migrate deploy) — required because the migrations folder is baked into the backend image, not volume-mounted"
    - "Server-authoritative durationSeconds — client never sends it; StudySessionCompleteSchema omits the field on purpose"

key-files:
  created:
    - apps/backend/prisma/migrations/20260704000000_add_study_timers/migration.sql
    - apps/backend/src/routes/__tests__/study-timers-schema.test.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - packages/shared/src/schemas/study.ts
    - packages/shared/src/schemas/stats.ts
    - apps/frontend/src/components/__tests__/StatsSummaryPanel.test.tsx

key-decisions:
  - "Migration apply required a full Docker image rebuild (docker compose build backend) because prisma/migrations is copied into the image at build time, not mounted as a volume — a plain container restart alone found 0 pending migrations"
  - "avgThinkingTimeMs and recentSessions were added as required (non-optional) shared-schema fields, which broke an unrelated frontend test fixture's typecheck during the Docker build — fixed inline per Rule 3 rather than deferring to Plan 04/05"

patterns-established:
  - "StudySessionCompleteSchema deliberately excludes durationSeconds — server computes it from startedAt/completedAt to prevent client-supplied duration tampering (T-30-05 adjacent)"

requirements-completed: [TIMER-02, TIMER-03, TIMER-04]

coverage:
  - id: D1
    description: "ReviewLog.thinkingTimeMs nullable column added to schema, migration, and live DB"
    requirement: "TIMER-02"
    verification:
      - kind: other
        ref: "psql \\d \"ReviewLog\" shows thinkingTimeMs integer nullable column in live DB"
        status: pass
    human_judgment: false
  - id: D2
    description: "StudySession + StudySessionDeck models exist in schema, migration, and live DB with cascading FKs"
    requirement: "TIMER-03"
    verification:
      - kind: other
        ref: "psql \\d \"StudySession\" / \\d \"StudySessionDeck\" show both tables with 3 ON DELETE CASCADE foreign keys in live DB"
        status: pass
    human_judgment: false
  - id: D3
    description: "Shared Zod contract for session start/complete + stats fields (RateCardSchema.thinkingTimeMs, StudySessionStartSchema, StudySessionCompleteSchema, StudySessionSchema, PerDeckProgressSchema.avgThinkingTimeMs, RecentSessionSchema, StatsSummarySchema.recentSessions)"
    requirement: "TIMER-04"
    verification:
      - kind: unit
        ref: "apps/backend/src/routes/__tests__/study-timers-schema.test.ts (8 tests, all pass)"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-07-04
status: complete
---

# Phase 30 Plan 01: Study Timer Data + Contract Foundation Summary

**Prisma schema (ReviewLog.thinkingTimeMs, StudySession, StudySessionDeck) + shared Zod contract for study-timer session lifecycle and stats fields, migration applied to the live database via Docker image rebuild**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-04T11:05:28+02:00
- **Completed:** 2026-07-04T11:14:38+02:00
- **Tasks:** 3 completed
- **Files modified:** 6

## Accomplishments
- `ReviewLog` gained a nullable `thinkingTimeMs Int?` column; `StudySession` and `StudySessionDeck` models added following the `DeckShare` join-table pattern, both relation sides wired
- Hand-written SQL migration `20260704000000_add_study_timers` mirrors the `20260609000000` structure (header comment, nullable ALTER, CREATE TABLE/INDEX, cascading FKs) and was applied to the live database
- `packages/shared` now exports the full study-session request/response contract: `RateCardSchema.thinkingTimeMs` (optional), `StudySessionStartSchema`, `StudySessionStartResponseSchema`, `StudySessionCompleteSchema` (server-authoritative — no client-sent `durationSeconds`), `StudySessionSchema`, `PerDeckProgressSchema.avgThinkingTimeMs` (nullable), `RecentSessionSchema`, `StatsSummarySchema.recentSessions`
- A real TDD-driven test (`study-timers-schema.test.ts`, 8 assertions) locks the six required behaviors from the plan's `<behavior>` block

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema models + hand-written SQL migration + prisma generate** - `88e7864` (feat)
2. **Task 2: Shared Zod contract (study + stats) with real validation test** - `be30e6e` (test, RED) → `21c02c7` (feat, GREEN)
3. **Task 3: Apply migration to the live database** - no dedicated commit (DB-only operation); blocking fix committed as `bdf08fa` (fix)

**Plan metadata:** (this commit)

## Files Created/Modified
- `apps/backend/prisma/schema.prisma` - Added `ReviewLog.thinkingTimeMs`, `StudySession`, `StudySessionDeck` models + back-relations on `User`/`Deck`
- `apps/backend/prisma/migrations/20260704000000_add_study_timers/migration.sql` - Hand-written DDL, applied to live DB
- `packages/shared/src/schemas/study.ts` - `RateCardSchema.thinkingTimeMs`, `StudySessionStartSchema`, `StudySessionStartResponseSchema`, `StudySessionCompleteSchema`, `StudySessionSchema`
- `packages/shared/src/schemas/stats.ts` - `PerDeckProgressSchema.avgThinkingTimeMs`, `RecentSessionSchema`, `StatsSummarySchema.recentSessions`
- `apps/backend/src/routes/__tests__/study-timers-schema.test.ts` - New real Zod-validation test (8 assertions)
- `apps/frontend/src/components/__tests__/StatsSummaryPanel.test.tsx` - Fixture updated for two new required schema fields (Rule 3 fix)

## Decisions Made
- Migration required a full `docker compose build backend` + `docker compose up -d backend` cycle, not just a container restart — `apps/backend/prisma/migrations` is `COPY`'d into the image at build time (no volume mount), so a stale image reported "No pending migrations" even after the file existed on the host disk
- `StudySessionCompleteSchema` intentionally has no `durationSeconds` field — the server computes it from `startedAt`/`completedAt` so a client can never report a falsified session duration

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed frontend test fixture broken by new required schema fields**
- **Found during:** Task 3 (Docker image rebuild, required to pick up the new migration file)
- **Issue:** `docker compose build backend` runs the frontend's `tsc`-checked Vite build as part of the multi-stage Dockerfile. `apps/frontend/src/components/__tests__/StatsSummaryPanel.test.tsx` constructed `PerDeckProgress`/`StatsSummary` object literals that predate this plan's new required fields (`avgThinkingTimeMs`, `recentSessions`), so the build failed with `TS2741: Property 'avgThinkingTimeMs' is missing`.
- **Fix:** Added `avgThinkingTimeMs: null` to both `perDeck` fixture rows and `recentSessions: []` to the `fullSummary` object.
- **Files modified:** `apps/frontend/src/components/__tests__/StatsSummaryPanel.test.tsx`
- **Verification:** `docker compose build backend` succeeds; `yarn workspace @kartex/frontend test --run StatsSummaryPanel` passes (8/8 tests)
- **Committed in:** `bdf08fa`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to unblock Task 3's Docker rebuild; no scope creep — fix was a two-field fixture update, not a behavior or component change. The real `StatsSummaryPanel` route/component wiring for these fields is Plan 03/04/05's responsibility.

## Issues Encountered
- The live database's backend container was already running from a 3-day-old image that predates this plan's migration file. `docker compose exec backend npx prisma migrate deploy` initially reported "No pending migrations to apply" because the container's baked-in `prisma/migrations` folder didn't include `20260704000000_add_study_timers`. Resolved by rebuilding the image (`docker compose build backend`) and recreating the container (`docker compose up -d backend`), which ran the entrypoint's `prisma migrate deploy` against the fresh image and applied the migration successfully. Confirmed via a follow-up `migrate deploy` (0 pending) and `psql \d` on all three affected tables/columns.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The database and shared contract are fully ready for Plan 02 (frontend `SessionTimer` component) and Plan 03 (backend `study.ts`/`stats.ts` route implementation) — both are thin consumers of the schemas defined here
- `packages/shared` dist is rebuilt; Prisma client regenerated; live DB has the new tables/column confirmed via direct `psql` inspection
- No blockers

---
*Phase: 30-study-timers-stats*
*Completed: 2026-07-04*

## Self-Check: PASSED

All created files and commit hashes verified present on disk and in git history.
