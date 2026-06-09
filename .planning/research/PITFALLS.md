# Domain Pitfalls — Kartex v1.3.0

**Domain:** Adding Learning Statistics and Deck-Update-via-Import to an existing Hono + Prisma 7 + PostgreSQL 16 + React + react-i18next flashcard app with SM-2 spaced repetition.
**Researched:** 2026-06-09
**Scope:** Integration pitfalls specific to adding these two features to the existing Kartex codebase. Not generic advice.

---

## Critical Pitfalls

Mistakes that cause incorrect data, data loss, broken functionality, or rewrites.

---

### Pitfall 1: The .kartex Format Has No Card ID Field — The Merge Key Does Not Exist Yet

**Feature:** Deck Update via Import (IMP-01 through IMP-04)

**Problem:** The entire import-merge feature depends on matching cards in the uploaded file to existing cards in the deck by stable ID. However, the current `.kartex` v1 format (`docs/kartex-format.md`) has no `id:` field in the `:: card ... ::` block — only `front:`, `back:`, and `tags:`. The current parser (`packages/shared/src/lib/kartex-parser.ts`) returns `{ front, back, tags }` with no ID. The current export capability does not exist at all — there is no `GET /api/decks/:id/export` endpoint and no kartex serializer in the shared package.

**Why it happens:** The original import flow was one-way (file → new deck). Stable IDs were never needed.

**Risk level:** Critical. If this is not resolved before implementing the merge endpoint, the entire feature must fall back to content-based matching (front text as primary key), which is fragile and loses progress whenever front text is edited.

**Consequences:** Attempting to match by ID using non-existent IDs means every re-import treats all cards as new, deletes all existing cards, and destroys all SM-2 progress — the opposite of the feature's purpose.

**Prevention:**
1. Before writing the merge backend, extend the `.kartex` format spec to include an optional `id:` field per card block: `id: clxxxxxxxxxxxxxxxx`.
2. Add `id?: string` to `ParsedCardSchema` in `packages/shared/src/schemas/import.ts` and update the parser to extract it.
3. Build a kartex serializer that emits card IDs when exporting an existing deck. The export endpoint must write the DB card `id` into each card's `id:` field so round-trips preserve identity.
4. The merge endpoint must treat `id:` as optional for backward compatibility with user-created files that have no IDs — in that case, cards with no `id:` are always treated as new additions.

**Detection:** Check parser output: `parseKartex(source)` returns objects with no `id` field. Grep for `id:` in `docs/kartex-format.md` — it is absent. Grep for `GET /api/decks/:id/export` in the backend — it does not exist.

---

### Pitfall 2: Removing a Card From the Deck Deletes Its CardProgress Via Cascade — This Is Correct But Must Be Explicit

**Feature:** Deck Update via Import (IMP-04: cards absent in file are removed)

**Problem:** When a card is deleted during a merge, its `CardProgress` rows for all users are deleted via the `onDelete: Cascade` on `CardProgress.card`. This is correct behavior (progress without a card is orphaned), but it has a user-visible consequence: any user who had learned that card loses their SM-2 history for it permanently. If the card is re-added later (re-imported with the same `id:`), it starts as new.

**Why it matters:** The confirmation preview UI (IMP-05) must clearly communicate "N cards will be removed — their study history will also be deleted" not just "N cards removed". Silently destroying study progress for multiple users (in a 2–5 user self-hosted instance, other users may share the deck via fork) without warning is a data-loss event from the user's perspective.

**Risk level:** Critical for user trust; LOW technical risk (cascade is already wired in the schema).

**Prevention:**
1. The confirmation preview payload from `POST /api/decks/:id/import/preview` must count `removedCount` and surface it prominently in the UI dialog.
2. The dialog should use language like "Remove X cards (their review history will be lost)" rather than just a count.
3. Consider adding a `dryRun` parameter to the merge endpoint so the frontend can call preview without side effects, then call commit to execute.

---

### Pitfall 3: The Merge Transaction Must Delete-Then-Upsert, Not Upsert-Then-Delete

**Feature:** Deck Update via Import (IMP-02, IMP-03, IMP-04)

**Problem:** If the merge runs as: (1) upsert all cards from file, then (2) delete cards absent from file — there is a window where both old and new cards exist simultaneously. If step 2 fails or is interrupted, the deck has duplicates. More critically: if any card in the file fails validation mid-loop, partial writes have already occurred and are not rolled back.

**Risk level:** Critical. Partial merge leaves the deck in a corrupt state (duplicate cards, cards that should have been removed are still present).

**Prevention:**
1. The entire merge must run inside a single `prisma.$transaction(async (tx) => { ... })`.
2. Within the transaction: fetch all existing card IDs, compute the diff (add/update/remove sets), then execute all three operations in dependency order: (a) delete removed cards, (b) upsert updated cards, (c) create new cards.
3. Media file writes must happen OUTSIDE the transaction (files are not transactional). Media validation must complete fully before the transaction starts, following the same pattern as the existing import router. If the transaction rolls back, orphaned media files may remain — this is an accepted trade-off per the existing codebase comment at `import.ts:270`.
4. Use Prisma's interactive transactions (not `prisma.$transaction([])` batch API) to ensure a single DB transaction boundary.

---

### Pitfall 4: Retention Rate Is Meaningless for Users With No Review History

**Feature:** Learning Statistics — STATS-02 (retention rate, last 30 days)

**Problem:** Retention rate is defined as `(ratings >= Good) / total_ratings` over the last 30 days. For a new user who has never completed a study session, there are zero `lastReviewed` rows in `CardProgress` — the query returns 0/0. In JavaScript `0/0 === NaN`. If NaN propagates to the API response (e.g., `{ retentionRate: NaN }`), JSON serialization converts it to `null` (JSON does not support NaN), and the frontend receives `null`.

**Why it happens:** The current `CardProgress` schema stores `easeFactor`, `interval`, `repetitions`, `nextReview`, and `lastReviewed`, but has NO `lastRating` field. There is no column that records the individual rating (1=Again, 2=Hard, 3=Good, 4=Easy) at each review. The SM-2 output (new easeFactor, new interval) is stored, but the rating that produced it is not.

**Risk level:** Critical for STATS-02 and STATS-03 specifically. The rating history needed to compute retention rate and difficulty breakdown (Easy/Good/Hard/Again counts) does not exist in the current schema.

**Consequences:**
- Retention rate cannot be computed from existing `CardProgress` columns without a schema change.
- Card difficulty breakdown (STATS-03) requires historical rating data that is not stored.
- Empty-state handling is required at the API and UI level.

**Prevention:**
1. Add a `ReviewHistory` model (or `lastRating Int?` field on `CardProgress`) before implementing the stats endpoint. A separate `ReviewHistory` table is preferable for STATS-03 (count by rating in last 30 days) because it allows aggregation over multiple reviews per card.
2. The stats endpoint must handle the zero-history case: return `{ retentionRate: null, totalReviewed: 0, ... }` with explicit nulls, not NaN.
3. The frontend stats chips must handle null/zero state gracefully: display "—" or "No data yet" rather than "NaN%" or "0%".
4. For STATS-01 (total reviewed all time and this week), the current `lastReviewed` field counts only the most recent review per card per user — it is NOT a count of total review events. Total reviews requires either a ReviewHistory table or a separate counter column.

**Schema consideration:** Adding `ReviewHistory` requires a Prisma migration. It must have `@default` values or be nullable on all new NOT NULL columns to avoid deployment failures (see prior pitfall research for `isActive` migration pattern).

---

### Pitfall 5: "This Week" Date Arithmetic Is Server-Timezone-Dependent

**Feature:** Learning Statistics — STATS-01 (reviewed this week)

**Problem:** The existing dashboard stats endpoint computes "reviewed today" using `new Date()` with `.setHours(0, 0, 0, 0)` — this uses the Node.js process's local timezone. In Docker, the container timezone defaults to UTC. A user in UTC+2 (e.g., Germany) who studies at 23:00 local time is in the next UTC day already. Their "reviewed today" count may appear to be 0 on the dashboard even though they just finished a session. The same applies to "this week" boundaries.

**Risk level:** Moderate. Kartex targets a small self-hosted audience (2–5 users), likely in a single timezone — the impact is small but visible.

**Why it happens:** Prisma stores all `DateTime` values as UTC (via the PostgreSQL `TIMESTAMP(3)` type, which has no timezone info). The existing streak logic in `sm2.ts` uses `new Date().toISOString().slice(0, 10)` (UTC date). All day/week boundaries are implicitly UTC. A user's "today" may differ from UTC's "today".

**Prevention:**
1. Keep the existing approach (UTC boundaries) — document it as "statistics reset at midnight UTC". For a self-hosted 2–5 user app this is acceptable.
2. Alternatively, accept a user timezone offset in the stats query (e.g., via a query param `?tzOffset=120`). The frontend can pass `new Date().getTimezoneOffset()` to shift the boundaries.
3. Do NOT attempt to read the server timezone with `Intl.DateTimeFormat().resolvedOptions().timeZone` in Docker — the container timezone is UTC and does not reflect user preferences.
4. For "this week" (Monday–Sunday vs. Sunday–Saturday): use ISO week (Monday start) consistently. Document the definition in the API response.

---

### Pitfall 6: "Mastered" Card Definition Is Arbitrary — Must Be Locked Down Before Shipping

**Feature:** Learning Statistics — STATS-04 (per-deck progress: due, mastered, in-learning)

**Problem:** There is no canonical definition of "mastered" in SM-2. Anki uses `interval >= 21 days` as a convention. Other apps use `repetitions >= 3` or `easeFactor >= 2.5`. Each definition produces different numbers for the same data. If the threshold is not documented, users will be confused when their "mastered" count differs from their intuition after reviewing cards.

**Why it matters:** The per-deck breakdown (due / mastered / in-learning) is a UI-visible stat. Choosing a threshold that makes most new users see "0 mastered" (too high) or "all cards mastered" (too low) will undermine trust in the feature.

**Risk level:** Moderate. The wrong definition leads to confusing UX, not a technical bug.

**Prevention:**
1. Define "mastered" as `interval >= 21 days AND repetitions >= 3`. This aligns with common flashcard app conventions and is meaningful for SM-2 (a card at 21+ days has gone through at least 3 successful reviews).
2. Define "in-learning" as `CardProgress exists AND interval < 21 days`.
3. Define "new" (never seen) as `no CardProgress row exists`.
4. Lock this definition into a comment in the stats query and into the API response schema so it cannot drift.
5. Cards with `interval >= 21` under an `intensive` or `exam_prep` studyMode multiplier may return to short intervals temporarily — the "mastered" definition should use the stored raw `interval` (not the multiplied `nextReview` date), consistent with how the existing SM-2 route stores intervals.

---

### Pitfall 7: The Stats Endpoint Will Run Multiple Expensive Aggregate Queries — N+1 Risk at Per-Deck Level

**Feature:** Learning Statistics — `GET /api/stats/summary`

**Problem:** STATS-04 requires per-deck progress (due, mastered, in-learning counts). A naive implementation fetches all decks, then for each deck runs separate COUNT queries: `WHERE deckId = X AND interval >= 21`, `WHERE deckId = X AND interval < 21`, etc. For a user with 10 decks this is 30+ queries in a single request.

**Risk level:** Moderate for the current 2–5 user scale, but a pattern that must not be established — it will become severe if deck counts grow.

**Prevention:**
1. Use a single Prisma query with groupBy or a raw SQL aggregation to compute per-deck progress in one round-trip.
2. Alternatively, join `CardProgress` to `Card` to `Deck` in one query and aggregate in application code — fewer round-trips, no N+1.
3. Example approach: `prisma.cardProgress.groupBy({ by: ['cardId'], where: { userId }, _count: true })` combined with a card-to-deck join. Or use `prisma.$queryRaw` for a single aggregation query when the Prisma query builder becomes unwieldy.
4. Add a response time assertion in tests: the stats endpoint must respond in under 200ms against a realistic dataset (100 cards, 5 decks, full CardProgress table).

---

### Pitfall 8: Import-Update Must Verify Deck Ownership — Not Just Deck Existence

**Feature:** Deck Update via Import (IMP-01)

**Problem:** The existing `POST /api/import` route creates a new deck owned by `userId`. The new deck-update endpoint `POST /api/decks/:deckId/import` must verify that the authenticated user is the deck owner (or has EDIT permission) before applying the merge. Forgetting this check allows any authenticated user to overwrite another user's deck content by guessing a deck ID.

**Risk level:** Critical security issue if not addressed.

**Why it happens:** The import route today does not take a `deckId` parameter — it always creates. The new variant accepts a deckId from the URL, which introduces an authorization surface that the original import had no need for.

**Prevention:**
1. At the top of the deck-update handler, replicate the ownership check pattern from `decks.ts` → `canManageDeck(deckId, userId)`.
2. Return 403 if the user is neither owner nor has EDIT or MANAGE permission on the deck.
3. Return 404 (not 403) if the deckId does not exist — do not leak existence to unauthorized users.
4. Write a backend test: user A owns deck D; user B (no share) sends `POST /api/decks/D/import` — must get 403.

---

### Pitfall 9: Media File Handling in Deck-Update Import Is Complex — Three Cases Must Be Handled

**Feature:** Deck Update via Import (IMP-01 with .kartex.zip)

**Problem:** When updating a deck via a `.kartex.zip` file, media handling has three cases that must all be handled correctly:
1. **New media** — files in the new zip not referenced by existing cards. These should be uploaded as in the original import.
2. **Re-used media** — files in the new zip with the same name as existing media referenced by the deck's cards. If naively re-uploaded, duplicate `Media` rows are created; the old files on disk are orphaned.
3. **Removed media** — files referenced by cards being deleted in the merge. The `Media` rows and disk files are orphaned after the card delete.

**Why it happens:** The existing import route always creates new `Media` rows (new UUID filenames) for every file in the zip. There is no deduplication or cleanup logic.

**Risk level:** Moderate. Orphaned files are a storage leak, not a data correctness issue. The existing import.ts already has an accepted trade-off (comment at line 270: "if transaction fails after media writes, orphaned files remain on disk").

**Prevention:**
1. For the v1.3 implementation, accept the same trade-off as the original import: new zip media always creates new `Media` rows. Document it explicitly.
2. Do NOT attempt to deduplicate media by filename — filenames in zips are user-controlled and can collide accidentally. UUID-based storage names (existing pattern) are correct.
3. For removed-card media cleanup: add a post-merge step that queries for `Media` rows whose `filename` is referenced in the deleted cards' content but not in any remaining card content. Delete both the `Media` row and the disk file. Run this AFTER the transaction commits (not inside it, since filesystem operations are not transactional).
4. If the post-merge cleanup fails (e.g., disk permission error), log a warning but do not fail the entire import — orphaned files are a maintenance concern, not a user-facing error.

---

### Pitfall 10: react-i18next Locale Parity — All New Keys Must Be Added to Both en.json and de.json

**Feature:** Both features (stats chips on dashboard, import-update UI)

**Problem:** The project has 254 i18n keys in `apps/frontend/src/locales/en.json` and `de.json`. The v1.3 features will add approximately 15–25 new keys (stat chip labels, confirmation dialog text, diff preview labels, error messages). If any key exists in `en.json` but not `de.json`, react-i18next will silently fall back to the key string at runtime (e.g., `"stats.retentionRate"` instead of a label). There is no build-time check enforcing parity.

**Risk level:** Moderate. Silent fallback means the UI shows raw key strings in German locale — visible but not breaking.

**Prevention:**
1. After adding any key to `en.json`, immediately add the same key with a placeholder value to `de.json` (e.g., the English text prefixed with `[DE]` or a copy of the English string).
2. Follow the existing project decision D-07: user content (deck titles, card counts) is passed as `{{value}}` interpolations — never embedded directly in translation strings.
3. Use the `labelKey` pattern for constant arrays: store key strings in module scope, call `t(key)` inside component render — do not call `t()` at module level.
4. Count keys in both files before shipping: `grep -c '":' en.json` vs `grep -c '":' de.json` — they must match.

---

## Minor Pitfalls

---

### Pitfall 11: The Existing DashboardStats Zod Schema Must Be Extended, Not Replaced

**Feature:** Learning Statistics — all STATS-* requirements

**Problem:** `DashboardStatsSchema` in `packages/shared/src/schemas/study.ts` currently defines `{ totalDue, reviewedToday, streak, byDeck }`. The dashboard endpoint at `GET /api/dashboard/stats` returns this shape. The stats summary endpoint (`GET /api/stats/summary`) is a new endpoint, but the dashboard page also needs the new stats. If the stats are added to the existing endpoint's response, the Zod schema must be updated; if they are served from a new endpoint, the frontend makes two requests on dashboard load.

**Prevention:**
1. Add the new stat fields to the existing `DashboardStatsSchema` (extend, not replace). The dashboard page already fetches `GET /api/dashboard/stats` — adding fields to the same response avoids a second API call on the most-visited page.
2. Add fields as optional (`z.number().optional()`) initially so old clients do not break if the backend deploys before the frontend — then tighten to required once both are deployed together.
3. If a separate `GET /api/stats/summary` is preferred for cleanliness, use `Promise.all` in the frontend to fetch both in parallel and merge before rendering.

---

### Pitfall 12: Confirmation Preview Must Use the Same Parser as the Merge Commit

**Feature:** Deck Update via Import (IMP-05)

**Problem:** The preview endpoint (dry-run) and the commit endpoint (actual merge) must use identical diff logic. If the preview computes the diff one way and the commit uses a different path, the user approves a preview that does not match what actually executes. This is a trust violation — users will see "2 cards removed" in the preview but 4 cards actually removed after commit.

**Risk level:** Minor if both code paths share the same diff function, but likely if preview and commit are implemented in separate code blocks.

**Prevention:**
1. Extract the diff computation into a pure function: `computeDiff(existingCards: Card[], parsedCards: ParsedCard[]): { toAdd, toUpdate, toRemove }`.
2. Both the preview handler and the commit handler call the same `computeDiff` function.
3. The commit handler takes the commit input (the uploaded file bytes + deckId) and runs `computeDiff` again server-side — do not trust a client-provided diff from the preview response. Re-running the diff on commit is idempotent and prevents TOCTOU issues.

---

### Pitfall 13: The Import-Update Endpoint Must Not Be Accessible on Shared Decks the User Does Not Own

**Feature:** Deck Update via Import

**Problem:** If a deck is shared with another user at EDIT permission level, the question of whether they can trigger a re-import is a business rule, not just a permission check. Forked decks (user's own copy) should always allow import-update. Shared decks (owner is someone else) should require EDIT or MANAGE level, but the deck owner may not expect their deck to be structurally modified by an EDIT-level collaborator via import.

**Prevention:**
1. For v1.3, restrict import-update to deck owners only (not EDIT-level shares). This is the safest default.
2. Document the restriction in the API: `POST /api/decks/:id/import-update` requires `ownerId === userId`.
3. If EDIT-level share import-update is desired later, make it an explicit v1.4 decision.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Stats: schema design | CardProgress has no rating history — STATS-02 and STATS-03 are impossible without a schema addition (Pitfall 4) | Add ReviewHistory table or lastRating column before writing stats endpoint |
| Stats: empty state | Zero-history users produce NaN/null retention rate (Pitfall 4) | Return explicit null from API; handle null in frontend chips |
| Stats: per-deck query | N+1 query pattern for per-deck progress counts (Pitfall 7) | Use groupBy or single aggregation query |
| Stats: "mastered" definition | Arbitrary threshold causes user confusion (Pitfall 6) | Lock down `interval >= 21 AND repetitions >= 3` before shipping |
| Stats: week boundary | UTC week boundary vs. user local time (Pitfall 5) | Accept UTC; document in API; add tzOffset param if users complain |
| Import-update: format | No card `id:` field in .kartex v1 — merge key does not exist (Pitfall 1) | Extend format spec and parser before writing merge endpoint |
| Import-update: cascade | Card deletion destroys all user CardProgress rows (Pitfall 2) | Confirmation preview must surface "study history will be lost" |
| Import-update: transaction | Partial merge on error leaves deck corrupt (Pitfall 3) | All DB operations in single Prisma interactive transaction |
| Import-update: auth | Missing ownership check allows deck overwrites by other users (Pitfall 8) | Check ownerId === userId at top of handler |
| Import-update: media | Re-uploaded and orphaned media on merge (Pitfall 9) | Accept orphan trade-off for v1.3; add post-commit cleanup for removed-card media |
| Import-update: preview/commit | Preview diff diverges from commit diff (Pitfall 12) | Single shared computeDiff() function; re-run on commit |
| i18n: both features | New keys missing from de.json produce key-string fallback in German locale (Pitfall 10) | Add to both locale files in same commit; verify key count parity |
| Schema: ReviewHistory migration | New NOT NULL columns need @default or nullable to avoid deploy failure on populated DB | Follow isActive migration pattern — always include @default or make nullable |

---

## Sources

- Kartex codebase: `apps/backend/prisma/schema.prisma` — `CardProgress` has no rating column
- Kartex codebase: `packages/shared/src/lib/kartex-parser.ts` — `ParsedCard` has no `id` field
- Kartex codebase: `docs/kartex-format.md` — no `id:` field documented in card block syntax
- Kartex codebase: `apps/backend/src/routes/import.ts` line 270 — accepted orphan media trade-off
- Kartex codebase: `packages/shared/src/schemas/study.ts` — `DashboardStatsSchema` definition
- [Prisma Transactions and batch queries](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [Prisma upsert race condition — Issue #3242](https://github.com/prisma/prisma/issues/3242)
- [Prisma DateTime timezone issues with PostgreSQL](https://medium.com/@basem.deiaa/how-to-fix-prisma-datetime-and-timezone-issues-with-postgresql-1c778aa2d122)
- [Anki import — stable ID / GUID matching for update-in-place](https://docs.ankiweb.net/importing/text-files.html)
- [CleverDeck SM-2 "mastered" definition (21-day threshold)](https://cleverdeck.com/manual/algorithm/)
- [i18next TypeScript — type-safe key enforcement](https://www.i18next.com/overview/typescript)
