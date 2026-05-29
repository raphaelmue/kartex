---
phase: 06-sharing-explore-deploy
plan: 01
subsystem: backend/sharing
tags: [prisma, migration, sharing, zod, hono, vitest]
dependency_graph:
  requires: []
  provides:
    - DeckShare API (POST/PATCH/DELETE /api/decks/:id/shares)
    - canManageDeck authorization helper
    - Permission.MANAGE enum value (Prisma + DB)
    - CreateShareSchema, UpdateShareSchema, ShareSchema, ExploreDeckSchema (packages/shared)
    - DeckListItemSchema (packages/shared)
    - GET /api/decks returns own + shared decks (D-06)
    - GET /api/decks/:id allows DeckShare recipients (D-07)
    - Backend Vitest test infrastructure
  affects:
    - apps/backend/src/routes/decks.ts
    - apps/backend/prisma/schema.prisma
    - packages/shared/src/schemas/*
tech_stack:
  added:
    - vitest@2.1.9 (backend devDependency)
  patterns:
    - canManageDeck helper — checks owner OR MANAGE-permission DeckShare before mutating shares
    - DeckShare upsert — update permission if exists, create if not (handles re-share gracefully)
    - Promise.all for parallel own+shared deck fetch in GET /
    - Generic "User not found." error (T-06-02 — prevent username enumeration)
key_files:
  created:
    - apps/backend/vitest.config.ts
    - apps/backend/src/routes/__tests__/sharing.test.ts
    - apps/backend/prisma/migrations/20260529122105_add_manage_permission/migration.sql
    - packages/shared/src/schemas/share.ts
  modified:
    - apps/backend/package.json (test script + vitest devDependency)
    - apps/backend/prisma/schema.prisma (MANAGE enum + onDelete: Cascade)
    - apps/backend/src/routes/decks.ts (canManageDeck + sharing routes + GET extensions)
    - packages/shared/src/schemas/deck.ts (DeckListItemSchema added)
    - packages/shared/src/index.ts (share barrel export added)
decisions:
  - "MANAGE-permission users can manage shares — enforced by canManageDeck (owner OR MANAGE)"
  - "DeckShare upsert semantics: POST /:id/shares updates permission if share already exists"
  - "GET /api/decks/:id returns userPermission field (OWNER | READ | EDIT | MANAGE) for frontend panel logic"
  - "Owner cannot be added as share recipient — returns 409 to prevent confusion"
  - "DeckShare cascade: deleting a deck removes all its DeckShare rows (onDelete: Cascade)"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-29"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 5
---

# Phase 06 Plan 01: DeckShare API + Prisma Migration + Test Infrastructure Summary

**One-liner:** DeckShare CRUD API with MANAGE permission tier, cascade delete migration, and Vitest test infrastructure for backend sharing routes.

## What Was Built

### Task 1 — Wave 0: Backend test infrastructure + Zod share schemas + DeckListItemSchema

Added Vitest (`^2.1.9`, matching frontend pin from 03-01) to `apps/backend` with a `node` environment config. Created `packages/shared/src/schemas/share.ts` exporting `CreateShareSchema`, `UpdateShareSchema`, `ShareSchema`, and `ExploreDeckSchema` — following the `card.ts` pattern exactly. Extended `deck.ts` schema with `DeckListItemSchema` (adds `sharedByUsername` and `owner` fields for the mixed-deck list). Added barrel export to `packages/shared/src/index.ts`. Created test stubs covering all SHAR-01 through SHAR-06 behaviors as `it.todo(...)` entries, plus one passing structural test confirming `CardProgress @@unique([userId, cardId])` satisfies SHAR-06 at the DB level.

**Commit:** `723de5f`

### Task 2 — Prisma schema migration: MANAGE enum + DeckShare cascade

Added `MANAGE` to the `Permission` enum in `schema.prisma`. Added `onDelete: Cascade` to the `DeckShare.deck` relation so deleting a deck automatically removes all its share rows. Created migration `20260529122105_add_manage_permission` using `prisma migrate dev --create-only`, inspected the SQL (no `BEGIN;` wrapper around `ALTER TYPE` — Postgres pitfall avoided), then applied with `prisma migrate dev`. Prisma client regenerated with the new `MANAGE` enum value.

Migration SQL contains:
- `ALTER TYPE "Permission" ADD VALUE 'MANAGE';`
- FK drop + re-add with `ON DELETE CASCADE ON UPDATE CASCADE`

**Commit:** `36e35ec`

### Task 3 — Extend decks.ts: sharing routes + canManageDeck + GET / + relaxed GET /:id

Rewrote `apps/backend/src/routes/decks.ts` preserving all existing routes and adding:

- **`canManageDeck(deckId, userId)`** — async helper returning `true` if caller is deck owner OR has `MANAGE` permission in `DeckShare`. Called at the top of every share management route (T-06-01 mitigated).
- **`GET /`** — parallel fetch of own decks + `DeckShare` rows via `Promise.all`. Maps shared rows to include `sharedByUsername` from the deck owner's username (D-06).
- **`GET /:id`** — relaxed from owner-only to owner OR `DeckShare` recipient (D-07). Returns `userPermission: 'OWNER' | 'READ' | 'EDIT' | 'MANAGE'` field for frontend panel logic.
- **`GET /:id/shares`** — list all shares for a deck (owner or MANAGE only).
- **`POST /:id/shares`** — add/update share by username. Returns generic `"User not found."` on username miss (T-06-02). Blocks adding deck owner as recipient (409). Uses `upsert` to idempotently set permission.
- **`PATCH /:id/shares/:sharedWithUserId`** — update permission on existing share.
- **`DELETE /:id/shares/:sharedWithUserId`** — revoke access; returns `"Access revoked."`.

**Commit:** `b1d6a60`

## Verification Results

```
yarn workspace @kartex/shared build       → exit 0 (no output)
yarn workspace @kartex/backend typecheck  → exit 0 (no output)
yarn workspace @kartex/backend test --run → 1 passed, 14 todo
npx prisma migrate status                 → "Database schema is up to date!"
```

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Infrastructure Notes

The dev database (Docker Compose) does not expose port 5432 to localhost by default. To run the migration, a temporary `postgres:16-alpine` container with `-p 5432:5432` was started, the migration was applied, and the container was removed. The compose DB was restored to its normal state after. This is expected for this project's Docker setup and not a deviation.

## Security Notes (Threat Model)

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-06-01: IDOR on share management routes | `canManageDeck` called at top of every share mutation | Implemented |
| T-06-02: Username enumeration via share creation | Returns `"User not found."` (404) — same message regardless of reason | Implemented |
| T-06-03: PATCH /decks/:id visibility change | Owner-only check unchanged | Accepted (no change) |
| T-06-04: Mass-create DoS on shares | Auth middleware + upsert semantics cap rows at 1 per deck+user pair | Accepted |

## Known Stubs

None — no placeholder data or TODO markers in production code paths.

## Self-Check: PASSED

Files exist:
- `apps/backend/vitest.config.ts` — FOUND
- `apps/backend/src/routes/__tests__/sharing.test.ts` — FOUND
- `packages/shared/src/schemas/share.ts` — FOUND
- `apps/backend/prisma/migrations/20260529122105_add_manage_permission/migration.sql` — FOUND
- `apps/backend/src/routes/decks.ts` — FOUND (contains canManageDeck, sharing routes)

Commits:
- `723de5f` — FOUND (Wave 0: test infra + share schemas)
- `36e35ec` — FOUND (Prisma migration)
- `b1d6a60` — FOUND (decks.ts sharing routes)
