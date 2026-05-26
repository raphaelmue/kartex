---
phase: 02-deck-card-management
plan: "01"
subsystem: backend-api
tags: [hono, prisma, zod, crud, deck, card, cascade, ownership]
dependency_graph:
  requires: [01-03]
  provides: [deck-crud-api, card-crud-api, cascade-delete-migration, shared-deck-card-schemas]
  affects: [frontend-deck-pages, study-loop]
tech_stack:
  added: []
  patterns:
    - Hono sub-router mounted via decks.route('/:deckId/cards', cardsRouter)
    - Ownership check pattern: deck.ownerId !== c.get('userId') before every mutation
    - Zod safeParse on all request bodies with 400 + details on failure
    - c.req.param('deckId') as string for parent-route params in sub-routers (TS workaround)
key_files:
  created:
    - packages/shared/src/schemas/deck.ts
    - packages/shared/src/schemas/card.ts
    - apps/backend/src/routes/decks.ts
    - apps/backend/src/routes/cards.ts
    - apps/backend/prisma/migrations/20260526144227_add_cascade_deletes/migration.sql
  modified:
    - apps/backend/prisma/schema.prisma
    - packages/shared/src/index.ts
    - apps/backend/src/index.ts
decisions:
  - "Used c.req.param('deckId') as string in cards sub-router to work around Hono v4 TypeScript limitation where parent route params are not typed in child routers"
  - "Ran Prisma migrate dev via docker cp + docker exec because the db container port 5432 is not exposed to localhost"
metrics:
  duration: ~15 min
  completed: 2026-05-26
---

# Phase 2 Plan 01: Deck & Card CRUD API Summary

Deck and card CRUD API with Zod validation, ownership enforcement, cascade-delete migration, and shared type schemas.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Prisma schema cascade deletes + shared Zod schemas | dc76896 | schema.prisma, deck.ts, card.ts, index.ts |
| 2 | Run Prisma cascade delete migration | 3cf94c9 | migrations/20260526144227_add_cascade_deletes/ |
| 3 | Deck and card Hono routers + backend index.ts registration | 379cfb8 | decks.ts, cards.ts, index.ts |

## What Was Built

- `packages/shared/src/schemas/deck.ts` — `CreateDeckSchema`, `UpdateDeckSchema`, `DeckSchema` and derived TypeScript types
- `packages/shared/src/schemas/card.ts` — `CreateCardSchema`, `UpdateCardSchema`, `CardSchema` and derived TypeScript types
- `apps/backend/src/routes/decks.ts` — Hono deck CRUD router with card sub-router mounted at `/:deckId/cards`
- `apps/backend/src/routes/cards.ts` — Hono card CRUD router (GET list, POST, PATCH, DELETE) with full deck-ownership checks
- Migration `20260526144227_add_cascade_deletes` — adds `ON DELETE CASCADE` to `Card_deckId_fkey` and `CardProgress_cardId_fkey`
- Backend `index.ts` updated: `decksRouter` registered at `/api/decks` after JWT auth middleware

## Endpoints Added

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/decks | List authenticated user's decks with card counts |
| POST | /api/decks | Create a deck |
| GET | /api/decks/:id | Get a single deck (ownership enforced) |
| PATCH | /api/decks/:id | Update deck title/description/visibility |
| DELETE | /api/decks/:id | Delete deck (cascade deletes cards + progress) |
| GET | /api/decks/:deckId/cards | List all cards in a deck |
| POST | /api/decks/:deckId/cards | Create a card in a deck |
| PATCH | /api/decks/:deckId/cards/:cardId | Update a card |
| DELETE | /api/decks/:deckId/cards/:cardId | Delete a card |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript error on deckId param in sub-router**
- **Found during:** Task 3 — `tsc --noEmit` revealed 4 errors: `Property 'deckId' does not exist on type '{}'`
- **Issue:** Hono v4 sub-routers do not propagate parent path params to child router TypeScript types. Destructuring `const { deckId } = c.req.param()` fails type-checking because the cards router has no `/:deckId` segment in its own route definitions.
- **Fix:** Changed to `c.req.param('deckId') as string` — the string overload returns `string | undefined` which is then asserted. At runtime Hono correctly passes the parent params, so the assertion is safe.
- **Files modified:** `apps/backend/src/routes/cards.ts`
- **Commit:** 379cfb8

**2. [Rule 3 - Blocking] db port 5432 not exposed to localhost**
- **Found during:** Task 2 — `prisma migrate dev` failed with `DATABASE_URL` not found / connection refused
- **Issue:** The `docker-compose.yml` does not expose port 5432 to the host. The Prisma CLI running on the host cannot connect to the db container.
- **Fix:** Copied updated `schema.prisma` into the backend container via `docker cp`, then ran `prisma migrate dev` inside the container via `docker exec`, then copied the generated migration SQL back to the local filesystem.
- **Files modified:** None (process workaround only)
- **Commit:** 3cf94c9

## Known Stubs

None — all endpoints are fully wired to Prisma queries.

## Threat Flags

No new security surface beyond what is documented in the plan's threat model.

## Self-Check: PASSED
