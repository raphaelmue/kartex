---
phase: 14-schema-foundation
plan: "01"
subsystem: schema
tags: [prisma, schema, migration, zod, shared-schemas]

dependency_graph:
  requires: []
  provides:
    - ReviewLog Prisma model with cascade FKs and stats index
    - Card.kartexId nullable field with composite unique constraint
    - SQL migration for ReviewLog table and Card.kartexId column
    - StatsSummarySchema (Phase 15 contract)
    - DeckUpdatePreviewSchema + DeckUpdateResultSchema (Phase 16 contract)
    - ParsedCardSchema.id optional field (IMP-07 contract)
  affects:
    - apps/backend/prisma/schema.prisma
    - packages/shared/src/index.ts

tech_stack:
  added: []
  patterns:
    - Hand-written SQL migration (prisma migrate deploy workflow, no migrate dev)
    - Denormalized deckId scalar on ReviewLog (avoids join in stats queries)
    - Compound @@index([userId, reviewedAt]) for stats query scoping

key_files:
  created:
    - apps/backend/prisma/migrations/20260609000000_add_reviewlog_and_card_kartexid/migration.sql
    - packages/shared/src/schemas/stats.ts
    - packages/shared/src/schemas/update.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - packages/shared/src/schemas/import.ts
    - packages/shared/src/index.ts

decisions:
  - "ReviewLog.deckId is a denormalized scalar (no FK) per D-09 to avoid joins in stats queries"
  - "Card.kartexId uses @@unique([deckId, kartexId]); Postgres NULLs treated as distinct so existing rows do not violate constraint"
  - "MASTERED_INTERVAL_DAYS=21 and MASTERED_REPETITIONS=3 constants locked by v1.3 research, defined in stats.ts"
  - "retentionRate and difficultyBreakdown are nullable in StatsSummarySchema for STATS-02/03 empty-state contract"

metrics:
  duration_minutes: 3
  completed_date: "2026-06-09"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 3
---

# Phase 14 Plan 01: Schema Foundation Summary

**One-liner:** Prisma schema baseline with ReviewLog model (cascade FKs, stats compound index) and Card.kartexId (nullable, composite unique), hand-written SQL migration, and concrete Zod schemas for Phase 15 stats and Phase 16 import-update contracts.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add ReviewLog model and Card.kartexId to Prisma schema | 51f3598 | apps/backend/prisma/schema.prisma |
| 2 | Hand-write SQL migration for ReviewLog and Card.kartexId | f68cb29 | apps/backend/prisma/migrations/20260609000000_add_reviewlog_and_card_kartexid/migration.sql |
| 3 | Extend shared schemas — ParsedCardSchema.id + stats.ts + update.ts + index re-exports | feea977 | packages/shared/src/schemas/import.ts, stats.ts, update.ts, packages/shared/src/index.ts |

## Decisions Made

1. **ReviewLog.deckId denormalized scalar (D-09):** deckId stored at review time without a FK relation. Avoids join in stats queries; follows DashboardStats byDeck pattern.

2. **Card.kartexId composite unique (D-02):** `@@unique([deckId, kartexId])` — Postgres treats multiple NULLs as distinct, so existing rows with NULL kartexId do not violate the constraint. Migration is safe on populated DB.

3. **MASTERED thresholds in stats.ts:** `MASTERED_INTERVAL_DAYS = 21`, `MASTERED_REPETITIONS = 3` — locked by v1.3 research. Defined here so Phase 15 reuses the same values.

4. **Nullable fields in StatsSummarySchema:** `retentionRate` and `difficultyBreakdown` are `.nullable()` to represent the "No data yet" empty state required by STATS-02/STATS-03 success criteria.

5. **Single migration file (D-16):** Both ReviewLog and Card.kartexId changes go in one migration to avoid two `prisma migrate deploy` cycles. Applied in Plan 03 after the rate endpoint changes are ready.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `yarn workspace @kartex/shared typecheck` — PASS (exit 0)
- `grep -c "model ReviewLog" apps/backend/prisma/schema.prisma` — returns 1
- `grep -c "kartexId String?" apps/backend/prisma/schema.prisma` — returns 1
- Migration file exists at correct path — PASS
- Behavioral check: `typeof StatsSummarySchema`, `typeof DeckUpdatePreviewSchema`, `typeof DeckUpdateResultSchema` — all `object` (Zod schemas are objects)

## Self-Check: PASSED

Files exist:
- apps/backend/prisma/schema.prisma — FOUND (modified)
- apps/backend/prisma/migrations/20260609000000_add_reviewlog_and_card_kartexid/migration.sql — FOUND
- packages/shared/src/schemas/stats.ts — FOUND
- packages/shared/src/schemas/update.ts — FOUND
- packages/shared/src/schemas/import.ts — FOUND (modified)
- packages/shared/src/index.ts — FOUND (modified)

Commits exist:
- 51f3598 feat(14-01): add ReviewLog model and Card.kartexId to Prisma schema — FOUND
- f68cb29 feat(14-01): add hand-written SQL migration for ReviewLog and Card.kartexId — FOUND
- feea977 feat(14-01): extend shared schemas for Phase 15/16 contracts — FOUND
