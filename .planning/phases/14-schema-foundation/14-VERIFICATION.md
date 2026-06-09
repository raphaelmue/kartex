---
phase: 14-schema-foundation
verified: 2026-06-10T00:00:00Z
status: passed
score: 9/9
overrides_applied: 0
---

# Phase 14: Schema Foundation Verification Report

**Phase Goal:** Establish the schema foundation that unblocks Phases 15 (stats) and 16 (import-update).
**Verified:** 2026-06-10
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Prisma schema declares ReviewLog model with userId, cardId, deckId, rating, reviewedAt and @@index([userId, reviewedAt]) | VERIFIED | `schema.prisma` lines 129-140: model ReviewLog present with all required fields, `@@index([userId, reviewedAt])`, and Cascade FKs on user and card relations |
| 2 | Prisma schema declares Card.kartexId as String? with @@unique([deckId, kartexId]) | VERIFIED | `schema.prisma` line 104: `kartexId String?`; line 111: `@@unique([deckId, kartexId])` |
| 3 | SQL migration file exists and contains DDL for ReviewLog table, Card.kartexId column, indexes, and cascade FKs | VERIFIED | File exists at `apps/backend/prisma/migrations/20260609000000_add_reviewlog_and_card_kartexid/migration.sql`; contains `CREATE TABLE "ReviewLog"`, `ADD COLUMN "kartexId" TEXT`, `CREATE UNIQUE INDEX "Card_deckId_kartexId_key"`, `CREATE INDEX "ReviewLog_userId_reviewedAt_idx"`, two ON DELETE CASCADE FKs; no deckId FK (correct per D-09) |
| 4 | packages/shared exports StatsSummarySchema, DifficultyBreakdownSchema, PerDeckProgressSchema with correct nullable fields | VERIFIED | `stats.ts`: StatsSummarySchema defined with `retentionRate: z.number().min(0).max(1).nullable()` and `difficultyBreakdown: DifficultyBreakdownSchema.nullable()`; MASTERED_INTERVAL_DAYS=21 and MASTERED_REPETITIONS=3 constants present; index.ts exports `./schemas/stats` |
| 5 | packages/shared exports DeckUpdatePreviewSchema and DeckUpdateResultSchema | VERIFIED | `update.ts`: DeckUpdatePreviewSchema (added/updated/unchanged/removed) and DeckUpdateResultSchema (extends with deckId) present with type aliases; index.ts exports `./schemas/update` |
| 6 | ParsedCardSchema has optional id field (id: z.string().min(1).optional()) | VERIFIED | `import.ts` line 11: `id: z.string().min(1).optional()` as first field in ParsedCardSchema |
| 7 | kartex-parser.ts parses id: field — passes value through to ParsedCard, treats empty id as undefined | VERIFIED | `kartex-parser.ts`: FIELD_PATTERN includes `id\|front\|back\|tags`; parseFields() returns `{ id?: string; ... }`; empty id handled via `val.length > 0 ? val : undefined`; parseCardBlock() return object includes `id`; `return { card: { front, back, tags, id } }` at line 173 |
| 8 | study.ts wraps cardProgress.upsert + reviewLog.create in prisma.$transaction; deckId sourced from card.deckId (D-11) | VERIFIED | `study.ts` lines 199-229: `prisma.$transaction(async (tx) => { tx.cardProgress.upsert(...); tx.reviewLog.create({ data: { userId, cardId, deckId: card.deckId, rating, reviewedAt: new Date() } }); return upserted })`; no deckId from request body |
| 9 | docs/kartex-format.md documents the optional id: card field with table row, example, backward-compat note | VERIFIED | §4 table contains `id` row (No / "Stable identifier for import-update matching"); "id Field" subsection with code example, uniqueness rule, and backward-compat statement: "Omitting id: is always valid; existing imports without id: continue to work unchanged" |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/backend/prisma/schema.prisma` | ReviewLog model + Card.kartexId field | VERIFIED | Both present; ReviewLog has 7 fields + index + 2 cascade relations; Card.kartexId nullable with composite unique |
| `apps/backend/prisma/migrations/20260609000000_add_reviewlog_and_card_kartexid/migration.sql` | DDL for ReviewLog table, Card.kartexId column, indexes, FKs | VERIFIED | All DDL present; no deckId FK (D-09 compliant) |
| `packages/shared/src/schemas/stats.ts` | StatsSummarySchema + constants | VERIFIED | 33 lines; all exports present including nullable fields for STATS-02/03 empty-state |
| `packages/shared/src/schemas/update.ts` | DeckUpdatePreviewSchema + DeckUpdateResultSchema | VERIFIED | 15 lines; both schemas and type aliases exported |
| `packages/shared/src/schemas/import.ts` | ParsedCardSchema with optional id field | VERIFIED | Line 11: `id: z.string().min(1).optional()` |
| `packages/shared/src/index.ts` | Re-exports for stats.ts and update.ts | VERIFIED | Lines 12-13: `export * from './schemas/stats'` and `export * from './schemas/update'` |
| `packages/shared/src/lib/kartex-parser.ts` | Parses optional id: field | VERIFIED | FIELD_PATTERN includes id; parseFields and parseCardBlock handle id correctly |
| `apps/backend/src/routes/study.ts` | prisma.$transaction wrapping upsert + reviewLog.create | VERIFIED | Lines 199-229; deckId: card.deckId present; no deckId from request body |
| `docs/kartex-format.md` | Documents optional id: card field | VERIFIED | Table row, id Field subsection with example, rules, and backward-compat guarantee |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/shared/src/index.ts` | `schemas/stats.ts` and `schemas/update.ts` | `export *` | WIRED | Both `export * from './schemas/stats'` and `export * from './schemas/update'` present |
| `Card` model in schema.prisma | `kartexId` column + `@@unique([deckId, kartexId])` | Prisma field + composite unique | WIRED | Line 104: `kartexId String?`; line 111: `@@unique([deckId, kartexId])` |
| `parseFields()` in kartex-parser.ts | `ParsedCardSchema.id` | id property passed through parseCardBlock | WIRED | parseFields returns `id?: string`; parseCardBlock passes it to returned card object |
| `POST /api/study/rate` handler | `tx.reviewLog.create` | `prisma.$transaction` interactive callback | WIRED | Line 219: `await tx.reviewLog.create({ data: { userId, cardId, deckId: card.deckId, rating, reviewedAt: new Date() } })` |
| `ReviewLog.deckId` | `card.deckId` (loaded by ownership check) | already-loaded card variable | WIRED | Line 222: `deckId: card.deckId`; negative gate: no `deckId: body.data` or `deckId: c.req` in study.ts |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| STATS-05 | 14-01, 14-03 | Each card rating is recorded in ReviewLog inside POST /api/study/rate transaction | SATISFIED | ReviewLog model in schema, migration SQL, prisma.$transaction + tx.reviewLog.create in study.ts |
| IMP-07 | 14-01, 14-02 | .kartex format accepts optional id: field per card block; existing files backward compatible | SATISFIED | ParsedCardSchema.id optional, kartex-parser.ts parses id:, backward compat confirmed in parser logic and documented in kartex-format.md |

### Anti-Patterns Found

No blockers or warnings found. Scanned key files modified in this phase:
- `apps/backend/prisma/schema.prisma` — clean DDL, no TBD/FIXME/XXX
- `apps/backend/prisma/migrations/...migration.sql` — clean DDL comments, no debt markers
- `packages/shared/src/schemas/stats.ts` — no placeholder patterns
- `packages/shared/src/schemas/update.ts` — no placeholder patterns
- `packages/shared/src/schemas/import.ts` — concrete schema, not a stub
- `packages/shared/src/index.ts` — re-export list, no issues
- `packages/shared/src/lib/kartex-parser.ts` — no TODO/TBD; `void frontMatch` / `void backMatch` / `void tagsMatch` are deliberate suppression of unused variable warnings, not stubs
- `apps/backend/src/routes/study.ts` — no debt markers; it.todo in test file is Approach B per plan spec (explicitly accepted)
- `docs/kartex-format.md` — substantive documentation

### Human Verification Required

None. All must-haves are verifiable programmatically and have been verified. Phase 14 delivers pure schema/library/documentation changes with no UI or runtime behavior requiring visual inspection.

---

_Verified: 2026-06-10_
_Verifier: Claude (gsd-verifier)_
