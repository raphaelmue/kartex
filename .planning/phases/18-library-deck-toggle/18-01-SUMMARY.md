---
phase: 18-library-deck-toggle
plan: "01"
subsystem: backend
tags: [prisma, migration, hono, deck-share, library, study-filter]
dependency_graph:
  requires: []
  provides: [DeckShare.isActive, PATCH /api/decks/:id/library, GET /api/decks isActive fix, GET /api/study/due filter fix]
  affects: [apps/backend/prisma/schema.prisma, apps/backend/src/routes/decks.ts, apps/backend/src/routes/study.ts, packages/shared/src/schemas/deck.ts]
tech_stack:
  added: []
  patterns: [Prisma hand-written migration, Hono route handler, Zod schema export, DeckShare-based per-user state]
key_files:
  created:
    - apps/backend/prisma/migrations/20260612000000_add_deckshare_isactive/migration.sql
  modified:
    - apps/backend/prisma/schema.prisma
    - packages/shared/src/schemas/deck.ts
    - apps/backend/src/routes/decks.ts
    - apps/backend/src/routes/study.ts
decisions:
  - "prisma migrate deploy unavailable without DATABASE_URL — migration SQL hand-written; apply via docker compose entrypoint on deploy (consistent with 10-02 pattern)"
  - "isActive: r.isActive override placed before sharedByUsername in sharedRows.map — shadows r.deck.isActive (owner's setting) with DeckShare.isActive (recipient's setting)"
  - "OR[1] deckFilter for shared decks drops Deck.isActive — DeckShare.isActive already gates; owner's isActive must not affect shared recipient's study queue (D-03, D-10)"
metrics:
  duration: "5 min"
  completed: "2026-06-12T13:35:04Z"
  tasks_completed: 3
  files_modified: 5
---

# Phase 18 Plan 01: Library Deck Toggle Backend Summary

Per-user `isActive` state for library (shared) decks: schema migration, shared Zod schema, GET /api/decks fix, new PATCH endpoint, study filter fix.

## What Was Built

### DeckShare.isActive field
Added `isActive Boolean @default(true)` to the `DeckShare` model in `schema.prisma`. This column stores per-user activation state for shared decks — independent of `Deck.isActive` (the owner's toggle). Hand-written migration SQL follows the Phase 10 convention (`20260602000000_add_isactive_studymode`).

### UpdateLibrarySchema
Exported `UpdateLibrarySchema = z.object({ isActive: z.boolean() })` and `UpdateLibraryInput` from `packages/shared/src/schemas/deck.ts`. This is the single source of truth for the PATCH body shape, imported by the backend route and available to the frontend in Plan 02.

### GET /api/decks fix (D-06, D-07)
The `sharedRows.map` callback now produces `{ ...r.deck, isActive: r.isActive, sharedByUsername: r.deck.owner.username }`. The explicit `isActive: r.isActive` override shadows `r.deck.isActive` so the frontend receives the recipient's per-user state, not the deck owner's setting.

### PATCH /api/decks/:id/library
New Hono route handler implementing D-08, D-09:
- Parses body with `UpdateLibrarySchema.safeParse` (400 on failure)
- `findUnique` on `deckId_sharedWithUserId` compound key — returns 403 if no share row (owner has no row for own deck; non-recipient likewise returns 403)
- `update` DeckShare.isActive, returns `{ isActive: updated.isActive }` with 200

### GET /api/study/due fix (D-10, D-11)
Replaced:
```
where: { sharedWithUserId: userId }
const sharedDeckIds = ...
{ id: { in: sharedDeckIds }, isActive: true }
```
With:
```
where: { sharedWithUserId: userId, isActive: true }
const activeSharedDeckIds = ...
{ id: { in: activeSharedDeckIds } }
```
The `DeckShare.isActive` filter is applied at the query level; the `Deck.isActive` filter is dropped from the shared-deck OR branch because the owner's toggle must not exclude the shared deck from a recipient's queue.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Schema migration + UpdateLibrarySchema | 4ba8f0a | schema.prisma, migration.sql, deck.ts (shared) |
| 2 | Apply migration + GET fix + PATCH route | 83d5519 | decks.ts, migration.sql (TODO comment) |
| 3 | Fix GET /api/study/due shared-deck filter | b599fc6 | study.ts |

## Deviations from Plan

### Auto-handled Issues

**1. [Rule 3 - Blocking] prisma migrate deploy unavailable (no DATABASE_URL)**
- **Found during:** Task 2
- **Issue:** `prisma migrate deploy` requires `datasource.url` in env — not available in dev environment
- **Fix:** Added `<!-- TODO: apply migration manually -->` comment to migration.sql header per plan instructions; migration will be applied via Docker Compose entrypoint on deploy. Consistent with Phase 10 pattern (10-02 decision).
- **Files modified:** `apps/backend/prisma/migrations/20260612000000_add_deckshare_isactive/migration.sql`

## Threat Mitigations Applied

| Threat | Mitigation |
|--------|-----------|
| T-18-01 Spoofing | JWT auth middleware on all /api/* routes; userId from `c.get('userId')` not request body |
| T-18-02 Tampering | `findUnique` on compound key before `update` — caller can only update their own share row |
| T-18-03 Elevation of privilege | Owner has no DeckShare row for own deck → `findUnique` returns null → 403 before any DB write |
| T-18-04 Tampering isActive injection | `UpdateLibrarySchema` uses `z.boolean()` — non-boolean values rejected 400 |

## Self-Check: PASSED

| Item | Status |
|------|--------|
| apps/backend/prisma/schema.prisma | FOUND |
| apps/backend/prisma/migrations/20260612000000_add_deckshare_isactive/migration.sql | FOUND |
| packages/shared/src/schemas/deck.ts | FOUND |
| apps/backend/src/routes/decks.ts | FOUND |
| apps/backend/src/routes/study.ts | FOUND |
| Commit 4ba8f0a | FOUND |
| Commit 83d5519 | FOUND |
| Commit b599fc6 | FOUND |
