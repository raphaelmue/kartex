# Research Summary — Kartex v1.3.0 Stats & Import Update

**Project:** Kartex v1.3.0 Stats & Import Update
**Domain:** Spaced-repetition flashcard app — learning analytics and deck lifecycle management
**Researched:** 2026-06-09
**Confidence:** HIGH (all findings verified by direct codebase inspection)

---

## Executive Summary

Kartex v1.3.0 delivers two independent features on top of the existing v1.2 stack: a learning statistics dashboard and deck-update-via-import. Both features are achievable without adding any new npm packages. The existing stack (Hono + Prisma 7 + PostgreSQL 16 + shadcn/ui) handles everything; the only new dependencies are Prisma schema additions (a `ReviewLog` model and a `Card.kartexId` nullable column), both landing in a single backward-compatible migration.

The core risk in this milestone is data integrity on two fronts. For stats: the current `CardProgress` schema discards per-review ratings — STATS-02 (retention rate) and STATS-03 (difficulty breakdown) are impossible without a `ReviewLog` table. The synthesis decision is to add `ReviewLog` in v1.3 (same migration as the card ID column) but defer the retention and difficulty chips to v1.4, when real data has accumulated. STATS-01 (total reviewed) and STATS-04 (per-deck progress) are computable from the existing schema and ship in v1.3. For import: the `.kartex` format has no `id:` field — without it, every re-import treats all cards as new and destroys SM-2 history. Adding an optional `id:` field to the parser, the `ParsedCard` Zod schema, and the format docs is a prerequisite for the entire import-merge feature.

The two features are fully independent and can be built in parallel. The recommended delivery order within the milestone is: (1) stats Phase A — no migration, ships sooner; (2) migration + parser extension; (3) import-merge built on top of the migration. All database writes in the import-merge flow must be wrapped in a single Prisma interactive transaction to prevent partial-merge corruption.

---

## Stack Additions

**Zero new npm packages required for v1.3.0.** All capability is already present in the installed stack.

| Addition | Type | Rationale |
|----------|------|-----------|
| `ReviewLog` Prisma model | Schema migration | Required for STATS-02/03; append-only, cheap writes; enables future time-series analytics |
| `Card.kartexId String?` | Schema migration | Stable merge key for import-update; nullable, backward-compatible |
| `packages/shared/src/schemas/stats.ts` | New shared schema file | `StatsSummarySchema` consumed by backend route and frontend component |
| `DeckUpdatePreviewSchema`, `DeckUpdateResultSchema` | Additions to `packages/shared/src/schemas/import.ts` | Shared types for preview and apply responses |
| `GET /api/stats/summary` | New backend route | Stats aggregations separate from `/api/dashboard/stats` so slow queries cannot delay the study CTA |
| `POST /api/import/deck/:id/preview` + `POST /api/import/deck/:id/apply` | New backend routes on existing `importRouter` | Two-phase stateless design; file re-uploaded on apply (small file, no server-side session needed) |
| `StatsSummaryPanel.tsx` | New frontend component | Stat chips below existing dashboard section; skeleton on load; silent no-op on error |
| `DeckUpdateModal.tsx` | New frontend component | Upload → preview → confirm state machine; reuses Dialog already installed |
| `useDeckUpdate.ts` | New frontend hook | Mirrors `useImport` state machine pattern |

**No charting library.** Spec calls for stat chips only. `@radix-ui/react-progress` (already installed) is sufficient for any proportional display.

---

## Critical Blockers Discovered

### Blocker 1 — No `ReviewLog` table (blocks STATS-02, STATS-03)

`POST /api/study/rate` computes SM-2 output from the user rating (1–4) and then discards it. The rating is never persisted. `CardProgress` stores running SM-2 state only; there is no per-event quality log. Retention rate and difficulty breakdown are entirely uncomputable from the current schema.

**Resolution:** Add `ReviewLog` in the v1.3 migration. Instrument `POST /api/study/rate` to append a `ReviewLog` row inside the existing `cardProgress.upsert` transaction. Return `null` from the API for STATS-02/03 fields and display "—" in the UI until v1.4.

**Prisma model to add:**
```prisma
model ReviewLog {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  cardId     String
  card       Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  deckId     String
  deck       Deck     @relation(fields: [deckId], references: [id], onDelete: Cascade)
  rating     Int      // 1=Again 2=Hard 3=Good 4=Easy
  reviewedAt DateTime @default(now())

  @@index([userId, reviewedAt])
  @@index([userId, deckId, reviewedAt])
}
```

Add back-relations to `User`, `Card`, `Deck`. All new columns have defaults — migration is safe on a populated database.

### Blocker 2 — No `id:` field in `.kartex` format (blocks all of import-merge)

The parser returns `{ front, back, tags }` only. `ParsedCard` Zod schema has no `id` field. Without a stable card identity, every re-import treats every card as new, deletes all existing cards, and destroys SM-2 progress — the exact opposite of the feature's purpose.

**Resolution (prerequisite for any merge backend work):**
1. Add `id: z.string().optional()` to `ParsedCardSchema` in `packages/shared/src/schemas/import.ts`
2. Add `id:` to `FIELD_PATTERN` and `parseFields()` in `packages/shared/src/lib/kartex-parser.ts` — single-line field, same pattern as `tags:`; preserve verbatim (trim only)
3. Update `docs/kartex-format.md` to document `id:` as an optional card field
4. Add `Card.kartexId String?` (nullable, unique per deck) to `schema.prisma`
5. Add `GET /api/decks/:id/export` so users can obtain a `.kartex` file with IDs pre-populated — the mechanism by which round-trips work

---

## Feature Table Stakes

### Stats: What Ships in v1.3 vs. Deferred

| Stat | Source | v1.3? | Notes |
|------|--------|-------|-------|
| STATS-01: Total cards reviewed (all-time + this week) | `CardProgress.lastReviewed` | YES | No migration needed; counts distinct cards ever touched — label as "cards studied", not "total reviews" |
| STATS-04: Per-deck progress (due / in-learning / mastered / new) | `CardProgress` + `Card` | YES | No migration needed; mastered = `interval >= 21 AND repetitions >= 3` |
| STATS-02: Retention rate (% ratings >= Good, last 30 days) | `ReviewLog` | TABLE IN v1.3, CHIPS IN v1.4 | Add `ReviewLog` now; surface the chip after data accumulates |
| STATS-03: Difficulty breakdown (Easy/Good/Hard/Again counts) | `ReviewLog` | TABLE IN v1.3, CHIPS IN v1.4 | Same — data exists after v1.3, chips deferred to v1.4 |

**Mastered threshold (locked):** `interval >= 21 days AND repetitions >= 3`. Aligns with Anki/CleverDeck convention. Name as a constant in code; document in API response schema.

**Stats endpoint decision:** `GET /api/stats/summary` is a new separate route — not an extension of `GET /api/dashboard/stats`. The dashboard's core study CTA must never be blocked by a heavier stats query. Frontend fetches both in parallel.

### Import-Merge: Expected UX

| Step | Behavior |
|------|----------|
| User opens Deck Detail page (owner only) | "Update from file" button in action bar |
| User selects `.kartex` file | Upload triggers `POST /api/import/deck/:id/preview` |
| Preview returned | Modal shows: X added / Y updated / Z removed — with explicit warning that study history for removed cards will be lost |
| User clicks Confirm | `POST /api/import/deck/:id/apply` re-uploads file, applies diff in single Prisma transaction |
| Success | Toast notification; modal closes; card list refreshes |

**Authorization:** deck owner only. EDIT-level shares cannot trigger import-update in v1.3.

**v1.3 scope:** plain `.kartex` files only for update. `.kartex.zip` update (with media changes) deferred due to media-ref rewrite complexity.

---

## Architecture Overview

### New Endpoints

| Endpoint | Handler | Auth | DB writes? |
|----------|---------|------|-----------|
| `GET /api/stats/summary` | `apps/backend/src/routes/stats.ts` | JWT required | No |
| `POST /api/import/deck/:id/preview` | `apps/backend/src/routes/import.ts` | JWT + owner check | No |
| `POST /api/import/deck/:id/apply` | `apps/backend/src/routes/import.ts` | JWT + owner check | Yes — single `$transaction` |

### New Components

| Component | Location | Consumes |
|-----------|----------|---------|
| `StatsSummaryPanel` | `apps/frontend/src/components/StatsSummaryPanel.tsx` | `GET /api/stats/summary` |
| `DeckUpdateModal` | `apps/frontend/src/components/DeckUpdateModal.tsx` | `useDeckUpdate` hook |
| `useDeckUpdate` hook | `apps/frontend/src/hooks/useDeckUpdate.ts` | preview + apply endpoints |

### Modified Components

| Component | Change |
|-----------|--------|
| `DashboardPage` | Add parallel fetch for `/api/stats/summary`; render `StatsSummaryPanel` below existing chips |
| `DeckDetailPage` | Add "Update from file" button (owner only); render `DeckUpdateModal` |
| `POST /api/study/rate` | Append `ReviewLog` row inside existing `cardProgress.upsert` transaction |
| `kartex-parser.ts` | Add `id:` field parsing |
| `ParsedCardSchema` | Add `id?: string` |

### Build Order

**Phase A (Stats, no migration) — can start immediately:**
A1 shared `stats.ts` schema → A2 backend route → A3 register route → A4 `StatsSummaryPanel` → A5 `DashboardPage` modification → A6 i18n keys

**Phase B (Migration + Parser + Import-merge — strictly ordered):**
B1 Prisma migration (ReviewLog + Card.kartexId) → B2 parser `id:` field + shared schema → B3 `computeDeckDiff` helper → B4 preview + apply handlers → B5 `useDeckUpdate` hook → B6 `DeckUpdateModal` → B7 `DeckDetailPage` modification → B8 i18n keys → B9 format docs + export endpoint

Phases A and B are fully independent; A ships sooner.

---

## Top Pitfalls to Avoid

**1. Corrupted merge from non-transactional writes**
All three merge operations (createMany for new cards, update per updated card, deleteMany for removed) must run inside a single `prisma.$transaction(async (tx) => { ... })` interactive transaction. A partial merge leaves duplicate or missing cards. Media writes happen outside the transaction (filesystem is not transactional) — follow the existing accepted trade-off in `import.ts`.

**2. `card.updateMany` is unusable for content updates**
Prisma's `updateMany` applies the same `data` object to all rows. Updated cards each have different `frontContent`/`backContent`/`tags`. Use individual `card.update` calls inside the transaction (one per updated card). For typical deck sizes this is correct and fast enough.

**3. Stats queries must filter by `userId` first**
Every `CardProgress` query in `stats.ts` must include `where: { userId }` to hit the `@@unique([userId, cardId])` compound index. A query without `userId` scans the full table. The existing `dashboard.ts` sets this pattern — replicate it exactly.

**4. Missing deck ownership check on import-update**
Before parsing the uploaded file in preview or apply, verify `deck.ownerId === userId`. Return 404 if the deck does not exist (do not leak existence to unauthorized users); return 403 if the user is not the owner. Failure here allows any authenticated user to overwrite another user's deck.

**5. Preview and commit must use the same diff function**
Extract diff logic into a pure `computeDeckDiff(existingCards, parsedCards)` function. Both preview and apply call it identically. The apply handler re-runs the diff server-side from the re-uploaded file — do not trust a client-supplied diff from the preview response (TOCTOU risk).

**6. i18n parity — all new keys in both en.json and de.json**
react-i18next silently falls back to the key string if a key is missing from the active locale. v1.3 adds approximately 15–25 new keys. Add each key to both locale files in the same commit. Verify key count parity before shipping: `grep -c '":' en.json` vs `grep -c '":' de.json`.

---

## Decisions Made

These are locked in and should not be revisited during roadmap or planning without explicit cause.

| Decision | Resolved Value | Rationale |
|----------|---------------|-----------|
| ReviewLog — add in v1.3? | YES | Required for future STATS-02/03; trivial migration; standard pattern in all SRS apps |
| STATS-02/03 chips — ship when? | v1.4 | No historical data on day 1 of v1.3; misleading to show 0% or "—" as a permanent chip |
| Mastered threshold | `interval >= 21 days AND repetitions >= 3` | Aligns with Anki/CleverDeck; both conditions required |
| Card id: field in .kartex | Optional `id:` field; backward-compatible | Only correct stable key; content hash breaks on edits; position matching breaks on reorder |
| Stats endpoint | Separate `GET /api/stats/summary` | Keeps dashboard's study CTA fast; stats degrade gracefully without blocking core loop |
| Import two-step | `POST /preview` (no DB) + `POST /apply` (transactional) | Stateless re-parse on apply; no server-side session; deterministic |
| Import-update authorization | Owner only (not EDIT-level shares) | Safest default for v1.3; shared-deck update is a v1.4 decision |
| .kartex.zip update | Deferred | Media-ref rewrite on updated cards is complex; plain `.kartex` covers the primary use case |
| No new npm packages | Confirmed | All required capability exists in current stack |
| Charting library | Do not add | Spec says chips; Recharts adds 130 KB+ for no stated v1.3 requirement |

---

## Implications for Roadmap

### Phase 1: Stats Phase A (No-Migration Stats)
**Rationale:** No schema changes — lowest-risk, visible quick win. Fully independent; can start before or in parallel with the migration work.
**Delivers:** `GET /api/stats/summary`, `StatsSummaryPanel`, per-deck progress chips (STATS-04), total reviewed chips (STATS-01)
**Avoids:** N+1 query pattern; `userId` filter omission

### Phase 2: Schema Migration + Parser Foundation
**Rationale:** Unblocks the entire import-merge track and pre-positions STATS-02/03 for v1.4. Single migration minimizes deployment friction.
**Delivers:** `ReviewLog` model, `Card.kartexId String?`, parser `id:` field, updated `ParsedCard` schema, `computeDeckDiff` helper, format docs, export endpoint
**Avoids:** Blockers 1 and 2

### Phase 3: Import-Merge Feature
**Rationale:** Depends on Phase 2 (kartexId column + parser). Backend-first within the phase.
**Delivers:** Preview + apply endpoints, `useDeckUpdate` hook, `DeckUpdateModal`, "Update from file" button on Deck Detail
**Features:** IMP-01 through IMP-05
**Avoids:** Non-transactional merge, missing ownership check, preview/commit divergence

### Phase 4: Stats Phase B Chips (v1.4, out of v1.3 scope)
**Rationale:** `ReviewLog` table exists after Phase 2 and data has accumulated through real usage. Surface STATS-02/03 chips once there is meaningful data.
**Delivers:** Retention rate chip, difficulty breakdown chip
**Features:** STATS-02, STATS-03

### Phase Ordering Rationale

- Phase 1 (stats chips from existing data) can ship before any migration work — independent.
- Phase 2 (migration) unblocks Phase 3 strictly; no way around this dependency.
- Phase 3 is the most complex phase (multiple new components + backend handlers); plan it carefully.
- Phase 4 is deferred by product decision, not technical constraint.

### Research Flags

All research comes from direct codebase inspection — HIGH confidence. No deeper research phases are needed for v1.3.0 planning.

**Phases with standard patterns (no research-phase needed):**
- Phase 1: Prisma aggregate queries follow existing `dashboard.ts` patterns exactly.
- Phase 3: Set-operation diff logic is standard; Prisma interactive transactions are already established in `import.ts`.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All findings from direct code reads of both `package.json` files and schema.prisma |
| Features | HIGH | Industry patterns from Anki/RemNote/CleverDeck official docs; codebase constraints confirmed by inspection |
| Architecture | HIGH | All component decisions verified against existing route, hook, and component patterns in the codebase |
| Pitfalls | HIGH | Pitfalls are concrete and codebase-specific; each traced to a specific file |

**Overall confidence:** HIGH

### Gaps to Address

- **`GET /api/decks/:id/export` endpoint** — needed for round-trip ID preservation; serializer format is straightforward (reverse of the parser) but the endpoint needs to be planned within Phase 2/3.
- **UTC week boundary for "this week" stat** — accepted trade-off (UTC midnight reset); document in the API response. Add a `?tzOffset` query param in a follow-up if users in non-UTC timezones complain.
- **"Keep removed cards" option** — a FEATURES.md differentiator but not table stakes; omit from v1.3 unless trivial to add alongside the confirmation dialog.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `apps/backend/prisma/schema.prisma` — CardProgress, Card, Deck, User models confirmed
- `apps/backend/src/routes/study.ts` — rating discarded after SM-2 computation confirmed
- `apps/backend/src/routes/import.ts` — existing import handler structure and transaction pattern
- `apps/backend/src/routes/dashboard.ts` — userId filter pattern and stats query patterns
- `apps/backend/src/routes/decks.ts` — ownership check patterns
- `packages/shared/src/lib/kartex-parser.ts` — parseFields, no id field confirmed
- `packages/shared/src/schemas/import.ts` — ParsedCard, no id field confirmed
- `packages/shared/src/schemas/study.ts` — DashboardStatsSchema definition
- `apps/frontend/src/pages/DashboardPage.tsx` — fetch pattern and chip layout
- `apps/frontend/src/pages/DeckDetailPage.tsx` — action bar and modal pattern
- `apps/frontend/src/hooks/useImport.ts` — state machine pattern to replicate
- `docs/kartex-format.md` — no `id:` field confirmed absent

### Secondary (MEDIUM-HIGH confidence — official docs)
- [Anki Statistics Manual](https://docs.ankiweb.net/stats.html) — maturity threshold 21 days, retention rate definition
- [Anki Packaged Decks Import](https://docs.ankiweb.net/importing/packaged-decks.html) — GUID-based stable card matching pattern
- [CleverDeck Algorithm](https://cleverdeck.com/manual/algorithm/) — mastered = interval >= 21 confirmed
- [RemNote Flashcard Statistics](https://help.remnote.com/en/articles/7970392-flashcard-statistics) — per-deck breakdown patterns
- [Prisma Transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) — interactive transaction pattern

---
*Research completed: 2026-06-09*
*Ready for roadmap: yes*
