# Phase 14: Schema Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-09
**Phase:** 14-schema-foundation
**Areas discussed:** kartexId uniqueness, ReviewLog deletion policy, New schema file placement

---

## kartexId Uniqueness

| Option | Description | Selected |
|--------|-------------|----------|
| `@@unique([deckId, kartexId])` | A deck cannot have two cards with the same kartexId. Guarantees unambiguous matching in Phase 16. Any import with duplicate IDs would be a parse error/warning. Slightly stricter format enforcement. | ✓ |
| No uniqueness constraint | kartexId is just a nullable text field. Simpler schema. If a deck has two cards with the same kartexId, Phase 16 would match the first one found — ambiguous behavior. |  |

**User's choice:** `@@unique([deckId, kartexId])`
**Notes:** Unique-within-deck constraint chosen to guarantee clean matching for Phase 16 import-update.

---

### kartexId Character Format

| Option | Description | Selected |
|--------|-------------|----------|
| Any non-empty string | Accept any string — spaces, unicode, special chars all allowed. Simplest rule, most flexible for users. Validated only by min-length 1. | ✓ |
| URL-safe identifier | Restrict to letters, digits, hyphens, underscores. Easier to use in URLs and CLI. Users must follow a naming convention. |  |

**User's choice:** Any non-empty string (min-length 1 only)

---

## ReviewLog Deletion Policy

### On Card Delete

| Option | Description | Selected |
|--------|-------------|----------|
| CASCADE delete | ReviewLog rows for a deleted card are removed automatically. Consistent with how CardProgress works. Stats for deleted cards disappear — clean DB, no orphaned rows. | ✓ |
| Keep (no action) | ReviewLog rows stay after card deletion. Historical review counts persist even for cards that no longer exist. Requires nullable cardId. |  |

**User's choice:** CASCADE delete

---

### On User Delete

| Option | Description | Selected |
|--------|-------------|----------|
| CASCADE delete | All ReviewLog rows for a deleted user are removed. Consistent with User → CardProgress cascade. Clean, no orphaned data. | ✓ |
| Keep (no action) | ReviewLog rows stay after user deletion. Requires nullable userId — unusual for this app's user count (2-5 users). |  |

**User's choice:** CASCADE delete

---

### ReviewLog Index

| Option | Description | Selected |
|--------|-------------|----------|
| `@@index([userId, reviewedAt])` | Covers the most common stats query pattern: filter by userId + date range. Without it, stats queries scan all ReviewLog rows. | ✓ |
| No extra index | Let the DB decide. Can add index later if stats are slow. |  |
| You decide | Claude picks based on expected query patterns. |  |

**User's choice:** `@@index([userId, reviewedAt])`

---

## New Schema File Placement

### StatsSummarySchema

| Option | Description | Selected |
|--------|-------------|----------|
| New `stats.ts` file | `packages/shared/src/schemas/stats.ts` — follows the one-file-per-resource convention. Clean separation, easy for Phase 15 researcher to find. | ✓ |
| Append to `study.ts` | Stats are study-related; add alongside DashboardStatsSchema. Fewer files but mixes concerns. |  |

**User's choice:** New `stats.ts` file

---

### DeckUpdatePreviewSchema / DeckUpdateResultSchema

| Option | Description | Selected |
|--------|-------------|----------|
| New `update.ts` file | `packages/shared/src/schemas/update.ts` — dedicated file for import-update flow schemas. Mirrors stats.ts as a clean Phase 16 artifact. | ✓ |
| Append to `import.ts` | Import-update is a variant of import; add alongside ImportResultSchema. Fewer files but makes import.ts busier. |  |

**User's choice:** New `update.ts` file

---

## Claude's Discretion

- Migration file naming: follows existing timestamp pattern in `apps/backend/prisma/migrations/`
- Parser implementation: add `id` to `FIELD_PATTERN` and `parseFields` result type, mirroring the existing `front`/`back`/`tags` handling
- Transaction wrapper style: interactive transaction `prisma.$transaction(async (tx) => {...})` with `tx.cardProgress.upsert` + `tx.reviewLog.create`

## Deferred Ideas

None — discussion stayed within phase scope.
