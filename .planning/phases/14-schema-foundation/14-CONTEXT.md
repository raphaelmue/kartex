# Phase 14: Schema Foundation - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure infrastructure — no UI, no new API endpoints visible to users. Delivers:
1. Prisma migration: `ReviewLog` table + nullable `Card.kartexId` column (single SQL migration file)
2. Parser update: optional `id:` field in `.kartex` card blocks
3. Shared Zod schema additions: `ParsedCardSchema` (add optional `id`), new `stats.ts` (`StatsSummarySchema`), new `update.ts` (`DeckUpdatePreviewSchema`, `DeckUpdateResultSchema`)
4. Rate endpoint update: write one `ReviewLog` row inside the existing `cardProgress.upsert` transaction
5. Docs update: `docs/kartex-format.md` documents the optional `id:` field

This phase unblocks Phase 15 (stats queries need ReviewLog) and Phase 16 (import-update needs Card.kartexId).

</domain>

<decisions>
## Implementation Decisions

### kartexId Column

- **D-01:** `Card.kartexId` is nullable (`String?`) — existing cards have no ID and that is fine.
- **D-02:** Uniqueness constraint: `@@unique([deckId, kartexId])` — a deck cannot have two cards with the same `kartexId`. Enables unambiguous card matching in Phase 16 import-update. If a `.kartex` file contains duplicate `id:` values within the same deck on import, it is treated as a warning/error (implementation detail for Phase 16).
- **D-03:** Character validation: any non-empty string is valid for `kartexId` (min-length 1, no character restrictions). The parser accepts whatever string the user writes in the `id:` field and passes it through. No URL-safe restriction.
- **D-04:** `docs/kartex-format.md` must document `id:` as an optional card field with a short example and note that it enables deck updates via re-import.

### ReviewLog Table

- **D-05:** Fields: `id` (cuid, primary key), `userId` (String), `cardId` (String), `deckId` (String), `rating` (Int, 1–4), `reviewedAt` (DateTime, default now()).
- **D-06:** Cascade on Card delete: `onDelete: Cascade` on the `cardId` foreign key — ReviewLog rows for a deleted card are removed. Consistent with how `CardProgress` handles card deletion.
- **D-07:** Cascade on User delete: `onDelete: Cascade` on the `userId` foreign key — all ReviewLog rows for a deleted user are removed.
- **D-08:** Index: `@@index([userId, reviewedAt])` — covers the most common stats query pattern (filter by userId + date range). Required per v1.3 research ("every stats query must scope by userId to hit compound index").
- **D-09:** `deckId` is stored at the time of review (denormalized) — deckId is on the Card and could be looked up via join, but storing it directly avoids a join in stats queries. Follows the same pattern as existing DashboardStats `byDeck` queries.

### ReviewLog Write in Rate Endpoint

- **D-10:** Both `cardProgress.upsert` and the `ReviewLog` create must execute inside a single Prisma interactive transaction (`prisma.$transaction(async (tx) => {...})`). The rate call fails if either write fails — atomicity is required.
- **D-11:** `deckId` for the ReviewLog row is taken from `card.deckId` (already fetched in the ownership check at the top of the rate handler).

### New Shared Schema Files

- **D-12:** `StatsSummarySchema` lives in a new file: `packages/shared/src/schemas/stats.ts`. Follows the one-file-per-resource convention (matches `study.ts`, `import.ts`, `deck.ts`, etc.).
- **D-13:** `DeckUpdatePreviewSchema` and `DeckUpdateResultSchema` live in a new file: `packages/shared/src/schemas/update.ts`. Dedicated to the import-update flow.
- **D-14:** Both new schema files are exported from `packages/shared/src/index.ts`.
- **D-15:** Schema stubs in Phase 14 are minimal but correct enough for Phase 15/16 to build on without modification. No placeholder `z.unknown()` shapes — define the actual fields based on the success criteria in ROADMAP.md.

### Migration Strategy

- **D-16:** Single hand-written SQL migration file (same pattern as 10-02 decision — `prisma migrate dev` unavailable in driver-adapter mode). Migration applied via `prisma migrate deploy` on deploy. Both `ReviewLog` and `Card.kartexId` go in one migration to avoid two deploy cycles.
- **D-17:** Migration must be safe on a populated database: `kartexId` is nullable (no default needed for existing rows), `ReviewLog` is a new table (no existing data affected).

### Claude's Discretion

- Migration file naming follows the existing pattern in `apps/backend/prisma/migrations/` (timestamp prefix).
- The parser update adds `id` to the `FIELD_PATTERN` regex and `parseFields` result type — implementation mirrors the existing `front`/`back`/`tags` handling.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema & Data Model
- `apps/backend/prisma/schema.prisma` — current full schema; add `ReviewLog` and `Card.kartexId` here
- `docs/design.md` — authoritative data model spec (§9 SM-2, §7 .kartex format)

### Parser
- `packages/shared/src/lib/kartex-parser.ts` — current parser; add `id:` field parsing here
- `packages/shared/src/schemas/import.ts` — `ParsedCardSchema` to update with optional `id` field
- `docs/kartex-format.md` — must be updated to document optional `id:` card field

### Rate Endpoint
- `apps/backend/src/routes/study.ts` — `POST /api/study/rate` handler to wrap in transaction and add ReviewLog write

### Shared Schema Additions
- `packages/shared/src/schemas/study.ts` — reference for schema style/export conventions
- `packages/shared/src/index.ts` — add exports for `stats.ts` and `update.ts`

### Prior Decisions
- `apps/backend/prisma/migrations/` — existing migration files for naming/structure reference
- `.planning/STATE.md` § Accumulated Context — v1.3-research decisions (index, mastered threshold, stateless import, transaction pattern)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `parseFields()` in `kartex-parser.ts` — already handles `front`, `back`, `tags` via `FIELD_PATTERN`. Add `id` to the pattern and result type to parse the optional `id:` field.
- `cardProgress.upsert` in `study.ts` (line ~198) — current target for the transaction wrapper. The card lookup (ownership check) already fetches `card.deckId` — available for the ReviewLog write.
- `packages/shared/src/schemas/study.ts` — `DashboardStatsSchema` is the style reference for new stat-related schemas.

### Established Patterns
- **Prisma interactive transaction**: `prisma.$transaction(async (tx) => { ... })` — use `tx.cardProgress.upsert(...)` and `tx.reviewLog.create(...)` inside.
- **Hand-written SQL migrations**: See `apps/backend/prisma/migrations/` for timestamp naming and structure. No `prisma migrate dev` in driver-adapter mode.
- **Shared schema exports**: Each schema file exports named schemas and inferred types. `index.ts` re-exports everything.
- **@@unique compound key naming**: Prisma generates `userId_cardId` from `@@unique([userId, cardId])` — `@@unique([deckId, kartexId])` generates `deckId_kartexId`.
- **onDelete: Cascade**: Used on `DeckShare`, `CardProgress` already — `ReviewLog` follows the same pattern for both `cardId` and `userId` foreign keys.

### Integration Points
- `apps/backend/src/routes/study.ts` POST `/rate` — transaction wrapper + ReviewLog create
- `packages/shared/src/lib/kartex-parser.ts` — `parseFields()` and `parseCardBlock()` for `id:` field
- `packages/shared/src/schemas/import.ts` — `ParsedCardSchema` needs optional `id` field
- `packages/shared/src/index.ts` — export `stats.ts` and `update.ts` additions
- `apps/backend/prisma/schema.prisma` — `ReviewLog` model + `Card.kartexId` field

</code_context>

<specifics>
## Specific Ideas

- `StatsSummarySchema` fields (Phase 15 will implement the endpoint, but the schema stub should match): `totalReviewed` (all-time count), `weekReviewed` (this-week count), `retentionRate` (number, nullable — no data = null), `difficultyBreakdown` (object with `easy`/`good`/`hard`/`again` counts), `perDeck` (array of deck progress objects).
- `DeckUpdatePreviewSchema` fields: `added` (number), `updated` (number), `unchanged` (number), `removed` (number). `DeckUpdateResultSchema`: same shape plus `deckId`.
- Mastered threshold (from v1.3 research): `interval >= 21 AND repetitions >= 3` — locked by research, used in Phase 15 stats queries. Document this constant in `stats.ts` or Phase 15 implementation.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 14-Schema Foundation*
*Context gathered: 2026-06-09*
