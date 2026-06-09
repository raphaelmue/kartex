# Architecture Patterns: v1.3.0 Stats & Import Update

**Domain:** Adding learning statistics and deck-update-via-import to an existing Kartex v1.2 app
**Researched:** 2026-06-09
**Confidence:** HIGH (all claims verified against current codebase source)

---

## Existing Architecture Baseline

```
Browser (React SPA)
      |  HTTP(S)
Hono backend (Node.js, port 3000)
  |-- /api/*          → route handlers (auth, decks, study, dashboard, import, ...)
  |-- * (catch-all)   → serveStatic({ root: './public' })
  |-- * (SPA fallback)→ readFileSync('./public/index.html')
      |
  Prisma 7 + PostgreSQL 16
      |
  Docker volume (media files)
```

Key facts about the existing codebase relevant to v1.3.0:

- `CardProgress` stores per-(user, card) SM-2 state: `easeFactor`, `interval`, `repetitions`, `nextReview`, `lastReviewed`. It does NOT store a per-review quality/rating log.
- The `.kartex` format (parser + docs) has no `id:` field on card blocks. Matching cards by ID requires adding this field to both the parser and the format spec.
- The existing import router (`apps/backend/src/routes/import.ts`) creates new decks. It has no update path.
- `DashboardPage` fetches `GET /api/dashboard/stats` for due counts, streak, and reviewed-today. No learning statistics (retention, breakdown, mastered counts) are in that endpoint.
- The `DeckDetailPage` owns an action bar with Study / Edit / Delete buttons. It already has a modal pattern (DeckFormModal, CardEditorModal) for contextual workflows.

---

## Feature 1: Learning Statistics Dashboard

### New Endpoint

**`GET /api/stats/summary`** — new route file `apps/backend/src/routes/stats.ts`

All required data already exists in `CardProgress` and `Card`. No schema migration needed.

Response shape:

```typescript
{
  totalReviewedAllTime: number        // COUNT(CardProgress rows) WHERE userId = ?
  totalReviewedThisWeek: number       // COUNT WHERE lastReviewed >= startOfCurrentWeek
  retentionRate: null                 // See Decision 4 — not computable from current schema
  ratingBreakdown: {
    again: number    // cards where repetitions == 0 AND lastReviewed IS NOT NULL
    hard: number     // cards with low interval relative to repetitions count
    good: number     // (approximation — see Decision 4)
    easy: number
  }
  byDeck: Array<{
    deckId: string
    deckTitle: string
    total: number        // total Card rows in deck
    due: number          // nextReview <= today OR no CardProgress row
    mastered: number     // repetitions >= 3 AND interval >= 21
    inLearning: number   // has CardProgress row but not mastered
    notStarted: number   // no CardProgress row
  }>
}
```

Implementation notes:

- `totalReviewedAllTime`: `prisma.cardProgress.count({ where: { userId } })`
- `totalReviewedThisWeek`: count where `lastReviewed >= startOfWeek`
- `retentionRate`: return `null` — see Decision 4
- `byDeck`: one query per deck is acceptable for 2–5 user target; alternatively a single aggregation query using `groupBy` on cards + left-join progress. The dashboard route pattern (application-side grouping in `Map`) is already established — follow the same pattern.
- "mastered" heuristic: `repetitions >= 3 AND interval >= 21` is a reasonable proxy. No new schema field needed — computed in application code.

**Route registration**: add `app.route('/api/stats', statsRouter)` in `apps/backend/src/index.ts`, placed after the existing auth middleware and before `serveStatic`.

### Shared Schema Changes

Add `StatsSummarySchema` and `StatsSummaryType` in a new file `packages/shared/src/schemas/stats.ts`. Export from `packages/shared/src/index.ts`.

### Modified Components

**`apps/frontend/src/pages/DashboardPage.tsx`** — add a second parallel `useEffect` / fetch that calls `GET /api/stats/summary`. The existing fetch of `GET /api/dashboard/stats` must not be changed (it drives the core study CTA). The stats summary is fetched independently so a slow query cannot delay the due-card count and "Start Studying" button.

### New Components

**`apps/frontend/src/components/StatsSummaryPanel.tsx`** — a new section rendered below the existing stats chips in `DashboardPage`. Contains:

- Chip row: total reviewed all time, total this week
- Per-deck progress table: due / mastered / in-learning columns
- Rating breakdown chips or a simple bar: Again / Hard / Good / Easy

Uses existing shadcn/ui `Badge` and `Table` components that are already imported in `DashboardPage`.

Loading state: renders a skeleton (`animate-pulse` divs) while the fetch resolves. On error: silently renders nothing (stats are supplementary, not blocking).

### Data Flow

```
DashboardPage mount
  ├── api.get('/api/dashboard/stats')  [existing — unchanged]
  │     └── sets stats → renders hero section + deck table + chips
  └── api.get('/api/stats/summary')    [new — parallel]
        └── sets summaryStats (null on error/loading)
              └── StatsSummaryPanel({ data: summaryStats })
                    └── renders chips + breakdown + per-deck table
                        (skeleton while null, silent no-op on error)
```

---

## Feature 2: Deck Update via Import

### The `id:` Field Problem (must be solved first)

The `.kartex` format has no `id:` field. The requirement to "match cards by ID" requires:

1. **Parser change** (`packages/shared/src/lib/kartex-parser.ts`): add `id:` as a recognised single-line field in `parseFields`, treated identically to `tags:`.
2. **Schema change** (`packages/shared/src/schemas/import.ts`): add `id: z.string().optional()` to `ParsedCardSchema`.
3. **Format doc change** (`docs/kartex-format.md`): document `id:` as an optional card field.

Cards in the file with no `id:` field are always treated as new cards. This is backward-compatible with all existing `.kartex` files.

### New Endpoints

Both endpoints extend the existing `importRouter` in `apps/backend/src/routes/import.ts`.

---

**`POST /api/import/deck/:deckId/preview`**

Parse the uploaded file, compute the diff against the existing deck, return the preview without any DB writes.

Request: `multipart/form-data`, field `file` (`.kartex` or `.kartex.zip`). No `deckName` field — a deck update does not rename the deck.

Response (200):

```typescript
{
  added: number
  updated: number
  removed: number
  addedCards: Array<{ front: string; back: string; tags: string[] }>
  updatedCards: Array<{ id: string; front: string; back: string; tags: string[] }>
  removedCards: Array<{ id: string; frontContent: string }>
  warnings: Array<{ cardIndex: number; reason: string }>
}
```

---

**`POST /api/import/deck/:deckId/apply`**

Re-parse the uploaded file (stateless — same file sent again) and apply the diff atomically.

Request: `multipart/form-data`, field `file` (same file as preview). Re-parsing is safe because it is a pure operation.

Response (200):

```typescript
{
  deckId: string
  addedCount: number
  updatedCount: number
  removedCount: number
  warnings: Array<{ cardIndex: number; reason: string }>
}
```

Both endpoints enforce `deck.ownerId === userId`. MANAGE-permission shares may not trigger an import update — owner only. This matches the existing pattern for deck deletion.

### Diff Algorithm (server-side, shared between preview and apply)

```
existingCards = prisma.card.findMany({ where: { deckId } })
existingById  = Map<card.id → Card>

for each parsedCard in file:
  if parsedCard.id && existingById.has(parsedCard.id):
    → "updated" bucket
  else:
    → "added" bucket

for each existingCard whose id is NOT in the "updated" bucket id set:
  → "removed" bucket

Transaction (apply only):
  1. card.createMany(added)
  2. card.update × N for each updated (content fields only; CardProgress untouched)
  3. card.deleteMany({ where: { id: { in: removedIds } } })
     — cascade in schema.prisma (onDelete: Cascade on Card→CardProgress) handles progress cleanup
```

Extract the diff logic into a helper function `computeDeckDiff(existingCards, parsedCards)` so it can be called identically in both preview and apply handlers.

### Shared Schema Changes

In `packages/shared/src/schemas/import.ts`:

- Add `id: z.string().optional()` to `ParsedCardSchema`
- Add `DeckUpdatePreviewSchema` (the 200 preview response shape)
- Add `DeckUpdateResultSchema` (the 200 apply response shape)
- Export both new types from `packages/shared/src/index.ts`

### New Frontend Components

**`apps/frontend/src/hooks/useDeckUpdate.ts`** — mirrors the `useImport` hook structure. Step state machine: `'idle' | 'uploading' | 'preview' | 'applying' | 'success' | 'error'`. Calls `/api/import/deck/:deckId/preview` on file selection, then `/api/import/deck/:deckId/apply` on user confirmation. Accepts `deckId` as a parameter.

**`apps/frontend/src/components/DeckUpdateModal.tsx`** — a shadcn/ui `Dialog` triggered from `DeckDetailPage`. Contains:

1. **Upload step**: drop zone (same keyboard/drag interaction pattern as `ImportPage`'s drop zone). Note: `ImportPage` has the drop zone logic inlined. Consider extracting a `KartexFileDropZone` presentational component to avoid duplicating event handlers — this is optional but reduces drift. Minimum viable: copy the drop zone JSX block.
2. **Preview step**: diff summary chips (X added / Y updated / Z removed), expandable lists for each bucket (use the `LazyCard`-style collapsible pattern from `ImportPage`), warning banner if `warnings.length > 0`, note that removed cards lose their study history, Confirm / Cancel buttons.
3. **Applying step**: spinner.
4. **Success step**: toast via `sonner` + modal auto-close + `onSuccess()` callback (triggers `fetchCards` in parent).
5. **Error state**: inline error alert inside the modal (do not close on error).

### Modified Components

**`apps/frontend/src/pages/DeckDetailPage.tsx`** — add an "Update from file" button in the owner action bar (owner only, `deck.ownerId === user?.id`). Add state `deckUpdateModalOpen: boolean`. Render `DeckUpdateModal` at the bottom of the component. Pass `deckId` and `onSuccess={fetchCards}` to the modal.

### Data Flow

```
DeckDetailPage (owner view)
  └── "Update from file" button → deckUpdateModalOpen = true

DeckUpdateModal — step: idle
  └── user drops/selects .kartex file → step: uploading
        └── api.postForm('/api/import/deck/:deckId/preview', formData)
              → 200: diff payload → step: preview
              → 422: parse/validation error → step: error (show message in modal)
              → 413: file too large → step: error

DeckUpdateModal — step: preview
  └── shows: X added / Y updated / Z removed + card lists + warnings
  └── "Confirm Update" → step: applying
        └── api.postForm('/api/import/deck/:deckId/apply', formData)
              → 200: result → step: success → toast + close + onSuccess()
              → error: step: error (show message, user can retry or cancel)

Backend — preview handler:
  1. bodyLimit (reuse MAX_BYTES env var)
  2. auth + deck ownership check
  3. parse file via parseKartex(@kartex/shared)
  4. prisma.card.findMany({ where: { deckId } })
  5. computeDeckDiff(existingCards, parsedCards)
  6. return diff — zero DB writes

Backend — apply handler:
  1. bodyLimit
  2. auth + deck ownership check
  3. parse file (re-parse — stateless)
  4. prisma.card.findMany({ where: { deckId } })
  5. computeDeckDiff(existingCards, parsedCards)
  6. prisma.$transaction: createMany → update × N → deleteMany
  7. return counts
```

---

## Build Order

Phases A and B are fully independent and can be built in either order or in parallel.

### Phase A: Stats Dashboard (no dependencies on Phase B)

| Step | What | Why first |
|------|------|-----------|
| A1 | `packages/shared/src/schemas/stats.ts` + export from `index.ts` | Type contract needed by both backend and frontend |
| A2 | `apps/backend/src/routes/stats.ts` — implement `GET /` | Backend before frontend can test against it |
| A3 | Register `statsRouter` in `apps/backend/src/index.ts` | Required before any frontend call works |
| A4 | `apps/frontend/src/components/StatsSummaryPanel.tsx` — skeleton + display | Component before page modification |
| A5 | `apps/frontend/src/pages/DashboardPage.tsx` — add fetch + render panel | Depends on A4 |
| A6 | i18n keys in `en.json` + `de.json` | Any step after A4 |

### Phase B: Deck Update via Import (ordered strictly)

| Step | What | Why this order |
|------|------|----------------|
| B1 | Parser: add `id:` field to `parseFields` in `kartex-parser.ts` | All downstream depends on parser |
| B2 | Schema: add `id?` to `ParsedCardSchema`, add preview/result schemas | Types needed by backend and frontend |
| B3 | Parser tests: update `kartex-parser.test.ts` | Validate parser change before wiring backend |
| B4 | `docs/kartex-format.md`: document `id:` field | Can be done any time after B1 |
| B5 | Backend: add `computeDeckDiff` helper + preview + apply handlers in `import.ts` | Depends on B2 |
| B6 | Backend tests: `import.test.ts` for preview and apply routes | Depends on B5 |
| B7 | `apps/frontend/src/hooks/useDeckUpdate.ts` | Depends on B2 (types) |
| B8 | `apps/frontend/src/components/DeckUpdateModal.tsx` | Depends on B7 |
| B9 | `apps/frontend/src/pages/DeckDetailPage.tsx` — add button + modal | Depends on B8 |
| B10 | i18n keys in `en.json` + `de.json` | Any step after B8 |

### Dependency Map

```
Phase A:
  packages/shared/schemas/stats.ts
    └── backend/routes/stats.ts
          └── backend/index.ts (registration)
                └── frontend/StatsSummaryPanel.tsx
                      └── frontend/DashboardPage.tsx (modified)

Phase B:
  packages/shared/lib/kartex-parser.ts (id field)
    └── packages/shared/schemas/import.ts (ParsedCard.id + new schemas)
          ├── backend/routes/import.ts (preview + apply handlers)
          │     └── backend tests
          └── frontend/hooks/useDeckUpdate.ts
                └── frontend/components/DeckUpdateModal.tsx
                      └── frontend/pages/DeckDetailPage.tsx (modified)
```

---

## Component Boundary Summary

| Component | Status | Location | Purpose |
|-----------|--------|----------|---------|
| `StatsSummarySchema` / type | NEW | `packages/shared/src/schemas/stats.ts` | Shared type for stats response |
| `GET /api/stats/summary` | NEW | `apps/backend/src/routes/stats.ts` | Return aggregated learning stats |
| Register `statsRouter` | MODIFIED | `apps/backend/src/index.ts` | Mount new route |
| `StatsSummaryPanel` | NEW | `apps/frontend/src/components/StatsSummaryPanel.tsx` | Render stat chips + per-deck table |
| `DashboardPage` | MODIFIED | existing | Add parallel stats fetch + render panel |
| `kartex-parser.ts` | MODIFIED | `packages/shared/src/lib/kartex-parser.ts` | Parse optional `id:` card field |
| `ParsedCardSchema` | MODIFIED | `packages/shared/src/schemas/import.ts` | Add `id?: string` |
| `DeckUpdatePreviewSchema` | NEW | `packages/shared/src/schemas/import.ts` | Shared type for diff preview response |
| `DeckUpdateResultSchema` | NEW | `packages/shared/src/schemas/import.ts` | Shared type for apply response |
| `computeDeckDiff` helper | NEW | `apps/backend/src/routes/import.ts` | Pure diff function, used in both handlers |
| `POST /api/import/deck/:id/preview` | NEW | `apps/backend/src/routes/import.ts` | Compute diff, no DB writes |
| `POST /api/import/deck/:id/apply` | NEW | `apps/backend/src/routes/import.ts` | Apply diff transactionally |
| `useDeckUpdate` hook | NEW | `apps/frontend/src/hooks/useDeckUpdate.ts` | State machine for update flow |
| `DeckUpdateModal` | NEW | `apps/frontend/src/components/DeckUpdateModal.tsx` | Upload → preview → confirm UI |
| `DeckDetailPage` | MODIFIED | existing | Add "Update from file" button + modal |

---

## Key Architecture Decisions

**Decision 1: Stats endpoint is a separate route (`/api/stats/summary`), not an extension of `/api/dashboard/stats`.**

`/api/dashboard/stats` drives the core study loop (due cards, streak, reviewed-today). It must remain fast and always-available — this is the "core value" of the application. The new stats aggregations (per-deck mastered counts, all-time review totals) involve heavier queries and can fail gracefully without blocking the study CTA. Keeping them in a separate endpoint means a slow stats query cannot delay the dashboard's primary content. The frontend fetches both in parallel.

**Decision 2: Preview + Apply both re-upload the file (no server-side session).**

Storing the parse result between preview and apply would require server-side state (session, cache, or DB staging table). This adds complexity, memory pressure, and expiry edge cases. The `.kartex` file is small (bounded by `MAX_BYTES`). Re-parsing on apply is deterministic and safe. For a 2–5 user deployment the double-upload cost is negligible.

**Decision 3: `id:` matching is opt-in, not required.**

Cards in the import file without an `id:` field are always treated as new. This is backward-compatible with all existing `.kartex` files and the LLM generation prompt in `kartex-format.md`. Users who want update-in-place semantics must include `id:` fields in their `.kartex` files. A future "Export as .kartex" feature (out of scope for v1.3) would produce files with IDs pre-populated.

**Decision 4: `retentionRate` returns `null` — do not approximate from current schema.**

`CardProgress` stores the running SM-2 state per card, not a per-review quality log. There is no reliable way to derive "% of ratings >= Good in last 30 days" from the current schema. Returning an approximated percentage would be misleading. Return `null` and display "n/a" in the UI. If exact retention metrics are needed in a future milestone, a `ReviewLog` model (one row per card rating event) can be added then.

**Decision 5: `card.updateMany` is NOT usable for content updates — use individual `card.update` calls in the transaction.**

Prisma's `updateMany` does not support per-row different data (it applies the same `data` object to all matched rows). Updated cards each have different `frontContent`/`backContent`/`tags` values. The transaction must call `card.update` once per updated card, or use a raw SQL `UPDATE ... CASE WHEN ...` — the per-card update loop is simpler and correct for the expected volume (dozens to hundreds of cards).

---

## Critical Pitfalls

**Pitfall 1: Retention rate is not directly computable from the current schema.**

`CardProgress` has no per-review quality log. Any percentage labeled "retention rate" derived from the current fields would be a proxy metric. Do not display a fabricated number as an exact measured rate — return `null` and display "n/a."

**Pitfall 2: The `id:` field must survive the parser unchanged.**

The `parseFields` function trims leading/trailing whitespace from single-line field values. A cuid ID value has no whitespace, so trimming is safe. But the comparison in the diff algorithm is a strict string equality check against `card.id` (cuid). Any transformation (lowercasing, truncation) would cause match failures. Ensure the parser returns the `id` value verbatim (after trim only).

**Pitfall 3: Diff sets must be mutually exclusive before the transaction.**

Validate that a card ID cannot appear in both the "updated" and "removed" sets before executing the transaction. If the same ID were in both (a bug in the diff logic), the transaction would attempt to update a card that was just deleted, or vice versa. Assert disjointness with a `Set` intersection check in `computeDeckDiff`.

**Pitfall 4: `card.deleteMany` (via cascade) deletes `CardProgress` for removed cards.**

This is the intended behavior per IMP-04. The `DeckUpdateModal` preview step must surface this consequence visibly — removed cards should be listed with a prominent warning that study history for those cards will be permanently deleted. Do not bury this in small print.

**Pitfall 5: Stats queries must always filter by `userId` first.**

All `CardProgress` queries in `stats.ts` must include `where: { userId }` to use the `@@unique([userId, cardId])` compound index. The existing `dashboard.ts` follows this pattern consistently — replicate it. A query without a `userId` filter would scan the entire `CardProgress` table.

**Pitfall 6: The existing import handler creates decks — the update handler must reject creation.**

The new `/deck/:deckId/preview` and `/deck/:deckId/apply` routes receive a deckId in the path. They must verify that `deck.ownerId === userId` AND that the deck actually exists, before parsing the file. A 404 on deck not found and a 403 on wrong owner are both required. Do not proceed to file parsing if authorization fails.

---

## Sources

- Codebase: `apps/backend/prisma/schema.prisma` — verified Card, CardProgress, Deck models
- Codebase: `apps/backend/src/routes/dashboard.ts` — existing stats query patterns
- Codebase: `apps/backend/src/routes/import.ts` — existing import handler structure, bodyLimit pattern
- Codebase: `apps/backend/src/routes/decks.ts` — authorization patterns (canManageDeck, isDeckOwner)
- Codebase: `packages/shared/src/lib/kartex-parser.ts` — parseFields function, existing field handling
- Codebase: `packages/shared/src/schemas/import.ts` — ParsedCardSchema, existing import types
- Codebase: `apps/frontend/src/pages/DashboardPage.tsx` — current fetch pattern and chip layout
- Codebase: `apps/frontend/src/pages/DeckDetailPage.tsx` — action bar and modal integration pattern
- Codebase: `apps/frontend/src/hooks/useImport.ts` — hook state machine pattern to replicate
- Codebase: `docs/kartex-format.md` — confirmed no `id:` field exists in current format spec
