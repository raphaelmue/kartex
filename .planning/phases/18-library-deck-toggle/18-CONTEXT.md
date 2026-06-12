# Phase 18: Library Deck Toggle — Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a per-user active/inactive toggle to all non-owned decks (library decks added from Explore page AND directly-shared decks). The toggle state persists in a new `DeckShare.isActive` column and filters the `/study/due` queue identically to the owned-deck `Deck.isActive` toggle. No change to owned-deck behavior.

</domain>

<decisions>
## Implementation Decisions

### Data Model

- **D-01:** Per-user isActive state lives in `DeckShare.isActive: Boolean @default(true)`. No new table. Existing DeckShare rows all default to active (zero-downtime migration).
- **D-02:** Scope is ALL DeckShare rows — both `POST /api/decks/:id/library` (public deck added from Explore) and directly-shared decks (deck owner shares with user via Deck Detail). Consistent behavior: any non-owned deck in the deck list gets the toggle.
- **D-03:** `Deck.isActive` (owner's field) is NOT used for the study queue filter for shared decks — only `DeckShare.isActive` controls whether a shared deck enters a recipient's study queue.

### Backend — Schema Migration

- **D-04:** Prisma migration adds `isActive Boolean @default(true)` to `DeckShare`. This is a zero-downtime additive migration (non-null with default, no backfill needed).
- **D-05:** The migration file is hand-written SQL (like Phase 10's `isActive` migration) if `prisma migrate dev` is unavailable in the driver-adapter mode. Apply via `prisma migrate deploy` or Docker entrypoint.

### Backend — GET /api/decks Response

- **D-06:** In `GET /api/decks`, when building the merged list from `sharedRows`, the response overrides `isActive` with `r.isActive` (the DeckShare row's isActive) for non-owned decks. This means `DeckListItem.isActive` reflects per-user preference for both owned and shared decks — no frontend type change needed.
- **D-07:** The `sharedRows` query in `GET /api/decks` must select `isActive` from `DeckShare` (add to the `include` or projection). Current query includes the full deck plus owner; add `r.isActive` to the spread.

### Backend — Toggle Endpoint

- **D-08:** `PATCH /api/decks/:id/library` accepts `{ isActive: boolean }` in the request body and updates `DeckShare.isActive` for the `(deckId, userId)` pair. Auth: only the share recipient (`sharedWithUserId === userId`) can call it; returns 403 if user is the deck owner or has no share row.
- **D-09:** `PATCH /api/decks/:id/library` returns the updated `isActive` value (or the full merged deck item) — frontend uses optimistic update + rollback on error, same pattern as owned-deck toggle.

### Backend — Study Filter

- **D-10:** In `GET /api/study/due`, replace the current shared-deck filter:
  ```
  // BEFORE (wrong — uses Deck.isActive, owner's setting):
  { id: { in: sharedDeckIds }, isActive: true }

  // AFTER (correct — filters by DeckShare.isActive, recipient's setting):
  sharedRows query: where: { sharedWithUserId: userId, isActive: true }
  deckFilter branch: { id: { in: activeSharedDeckIds } }   // no Deck.isActive filter
  ```
- **D-11:** Same study filter fix applies to any other route that currently uses `sharedDeckIds` — check `study.ts` for all usages (at minimum `GET /due`; also check the study start screen deck-list endpoint if one exists).

### Frontend — DecksPage Library Footer

- **D-12:** The `deck.ownerId !== user?.id` branch in DecksPage (currently Study + Open only) gets a Switch identical to the owned-deck Switch. The Switch calls `handleToggleLibraryActive(deck.id, checked)` instead of `handleToggleActive`.
- **D-13:** `handleToggleLibraryActive` uses `PATCH /api/decks/${deckId}/library` with body `{ isActive: checked }`. Same optimistic update + rollback pattern as `handleToggleActive`. Same toast messages (`decks.activatedToast` / `decks.deactivatedToast`).
- **D-14:** Reuse existing i18n keys `decks.activeLabel` and `decks.toggleActive` — no new i18n keys needed for the toggle itself.
- **D-15:** The opacity wrapper `<div className={deck.isActive ? '' : 'opacity-60'}>` already uses `deck.isActive` — once the backend returns `DeckShare.isActive` in that field, the visual state works automatically for library decks too.

### Shared Schema

- **D-16:** `DeckListItem.isActive` already exists as `z.boolean().default(true)`. No type change needed. The field now semantically means "active for THIS user's study queue" for all deck types.
- **D-17:** A new `UpdateLibrarySchema` (or inline in the route) validates `{ isActive: z.boolean() }` for the PATCH body. Add to `packages/shared/src/schemas/deck.ts`.

### Claude's Discretion

- How to handle the edge case where a user has a DeckShare but the deck owner set `Deck.isActive = false` — can note in research but not a blocker; the per-user DeckShare.isActive is the only filter for the recipient's queue.
- Order of items in the library deck CardFooter (Switch + label position relative to Study/Open buttons) — follow the same pattern as the owned-deck footer.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema & Data Model
- `apps/backend/prisma/schema.prisma` — current Prisma schema; `DeckShare` model needs `isActive` field
- `packages/shared/src/schemas/deck.ts` — `DeckListItemSchema`, `UpdateDeckSchema`; add `UpdateLibrarySchema`

### Backend Routes
- `apps/backend/src/routes/decks.ts` — `GET /api/decks` (merge logic lines ~45-70), `POST /api/decks/:id/library` (lines ~273-300); add `PATCH /api/decks/:id/library`
- `apps/backend/src/routes/study.ts` — `GET /api/study/due` (deckFilter lines ~18-40); fix shared deck isActive filter

### Frontend
- `apps/frontend/src/pages/DecksPage.tsx` — `handleToggleActive` pattern (lines ~100-115); library deck footer (lines ~155-175 per Phase 17 final state); `deck.ownerId !== user?.id` branch
- `apps/frontend/src/locales/en.json` — reuse `decks.activeLabel`, `decks.toggleActive`, `decks.activatedToast`, `decks.deactivatedToast`
- `apps/frontend/src/locales/de.json` — same keys

### Prior Phase Context
- `.planning/phases/17-mobile-ui-polish/17-02-SUMMARY.md` — DecksPage structure after Phase 17 (DropdownMenu, AlertDialog, ownerId guard)
- `.planning/phases/10-active-deck-rotation/` — owned-deck isActive pattern (how Deck.isActive was added; migration approach)

</canonical_refs>

## Plan Sketch (for planner)

**Plan 18-01 — Backend (schema + endpoints + study filter)**
1. Prisma schema: add `isActive Boolean @default(true)` to `DeckShare`
2. Migration SQL: `ALTER TABLE "DeckShare" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true`
3. `packages/shared`: add `UpdateLibrarySchema = z.object({ isActive: z.boolean() })`
4. `GET /api/decks`: select `isActive` from sharedRows; spread `isActive: r.isActive` into merged library items
5. `PATCH /api/decks/:id/library`: validate body, find share row for (deckId, userId), update `isActive`, return 200
6. `GET /api/study/due`: filter sharedRows by `isActive: true`; remove `Deck.isActive` filter from shared branch

**Plan 18-02 — Frontend (DecksPage toggle + tests)**
1. `DecksPage`: add `handleToggleLibraryActive` calling `PATCH /api/decks/:id/library`
2. `DecksPage`: add Switch + label to library deck CardFooter (`deck.ownerId !== user?.id` branch)
3. Tests: backend route test for `PATCH /api/decks/:id/library`; study filter test for `DeckShare.isActive`; DecksPage test for library Switch render + handler call
