# Feature Landscape: Learning Statistics & Deck Update via Import

**Domain:** Spaced-repetition flashcard app (self-hosted, SM-2, 2-5 users)
**Milestone:** v1.3.0 — Stats & Import Update
**Researched:** 2026-06-09
**Confidence:** HIGH (codebase direct inspection confirms all schema and parser findings; Anki/RemNote docs used for industry patterns)

---

## Critical Constraints (Read Before Feature Sections)

Two hard constraints discovered by reading the actual codebase. Both directly affect what can be built without schema/format changes.

### Constraint A — No Review History Log in the Database

`CardProgress` stores only the **current SM-2 state** per (user, card) pair:
`easeFactor`, `interval`, `repetitions`, `nextReview`, `lastReviewed`.

There is no `quality` column and no `ReviewHistory` / `ReviewLog` table.
The `POST /api/study/rate` endpoint upserts the latest state and discards the previous one.

**Consequence:** A metric like "% Good+Easy last 30 days" requires storing the outcome of
every review event. That data does not currently exist.

**Options:**

1. **Add a `ReviewLog` table** (recommended) — `(id, userId, cardId, rating, reviewedAt)`.
   Append-only writes on every `POST /api/study/rate`. Cheap to write, enables all future
   stat queries. Requires one Prisma migration. This is the standard pattern in Anki,
   SuperMemo, and RemNote.

2. **Approximate from current state only** — treat "retention rate" as the fraction of
   cards with `interval >= threshold` (mastered cards as a proxy). No migration needed,
   but this is a deck-mastery metric, not a review-accuracy metric. Labelling it "retention
   rate" would be misleading. It should be labelled "mastered card rate" or similar.

Recommendation: **Add `ReviewLog`** in the same migration that adds the card ID field
(below). The table is trivial and unlocks correct retention computation now plus accurate
time-series charts later. Without it, a "retention rate" stat chip is misleading.

### Constraint B — No Card ID in the .kartex Format

The `.kartex` format and parser produce cards with only `front`, `back`, and `tags`.
There is no `id:` field in the format spec, the kartex-parser, or the `ParsedCard` Zod schema.

The project requirements say "Cards matched by stable card ID" — but this field does not exist.

**Consequence:** Import-merge cannot use a stable file-level ID without a format extension.

**Matching strategy options:**

1. **Extend the format with an optional `id:` field** (recommended) — add `id: some-slug`
   as an optional single-line field inside `:: card` blocks, identical to how `tags:` works.
   Parser change is small. `kartex-format.md` spec must be updated. Cards without `id:` are
   treated as new — backward-compatible. This mirrors how Anki uses note GUIDs.

2. **Match by content hash** — SHA-256 of `front + back` text. Fragile: one character
   edit to a card's content makes it look like a deletion + addition, not an update.
   Breaks the core use case (updating card content while preserving SM-2 history).

3. **Match by position** — card N in the file updates card N in the deck. Breaks on any
   reordering, insertion, or deletion. Rejected.

Recommendation: **Add optional `id:` field to the .kartex format.** It is opt-in: source
files without IDs can still be imported as new decks. The deck owner must add `id:` fields
to their source to benefit from update-in-place. Format stays backward-compatible.

Schema change required: `Card.kartexId String?` (nullable). Unique constraint per deck,
not globally — multiple decks can use the same ID namespace.

---

## Feature Area 1: Learning Statistics Dashboard

### Table Stakes (users expect these; missing = product feels incomplete)

| Feature | Why Expected | Complexity | Schema Change? |
|---------|--------------|------------|----------------|
| Total cards reviewed (all-time) | Standard SRS metric; present in Anki, RemNote, SuperMemo, CleverDeck | Low | No — count distinct `CardProgress` rows where `lastReviewed IS NOT NULL` (counts unique cards ever reviewed, not total review events) |
| Cards reviewed this week | Standard weekly-cadence metric; common in all SRS dashboards | Low | No — filter `lastReviewed >= start of current week` |
| Per-deck progress: due / in-learning / mastered / new counts | Users want to see which decks need attention without opening each one | Medium | No — derive from `CardProgress.interval` and presence/absence of `CardProgress` rows |
| "Mastered" definition consistent with SRS norms | Anki and CleverDeck both define "mature" at interval >= 21 days; users familiar with Anki expect this threshold | Low | No — use a named constant `MASTERED_INTERVAL_DAYS = 21` |

**Note on "all-time reviewed" semantics:** `CardProgress` stores one row per (user, card) pair.
Counting those rows counts "distinct cards ever touched," not "total review events." This is an
important caveat for the UI label — "cards studied" is more accurate than "total reviews."
For true total review events you need `ReviewLog`.

**Note on "in-learning" vs "mastered" vs "new":**
- New: no `CardProgress` row for this (userId, cardId)
- In-learning: `CardProgress` exists AND `interval < 21`
- Mastered: `CardProgress` exists AND `interval >= 21`

### Differentiators (valued but not expected by all users)

| Feature | Value Proposition | Complexity | Schema Change? |
|---------|-------------------|------------|----------------|
| Retention rate (% ratings >= Good in last 30 days) | Most meaningful SRS accuracy metric; Anki calls it "True Retention"; target 85-95% | Medium | **Yes — requires `ReviewLog` table** |
| Card difficulty breakdown (Easy / Good / Hard / Again counts) | Shows which cards are struggling; informs study strategy; Anki shows this as "Answer Buttons" graph | Medium | **Yes — requires `ReviewLog` table** |
| Upcoming due forecast ("X cards due tomorrow / this week") | Computable from `nextReview` dates without any extra schema | Low | No — aggregate `COUNT WHERE nextReview BETWEEN now AND +7 days` |
| Review heatmap / calendar (study activity grid) | Visual streak; RemNote and Anki both offer this; motivational for daily habit | High | Yes — needs `ReviewLog` for full history; can approximate from `lastReviewed` per card but misses multiple-reviews-per-day |

### Anti-Features (explicitly do not build for v1.3)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Per-card retention curves / learning graphs | Correct only with per-card review history log; charting libraries add bundle size; cognitive overload for 2-5 users | Ship aggregate retention rate instead; defer charts to v2 |
| Leaderboards / comparative stats between users | Out of scope for invite-only self-hosted deployment; social features not in the product vision | Skip entirely |
| "Time to mastery" prediction | Requires FSRS-style stability modeling; SM-2 does not carry this concept naturally | Not applicable to SM-2 |
| Stats updating in real-time during a study session | Distracts from the learning loop; adds live-query complexity | Stats live on dashboard only; refresh on page visit |
| Separate `/stats` page | Fragments the core loop (dashboard → study → back to dashboard); adds navigation overhead | Add stat chips to the existing `/dashboard` page |

### What Major SRS Apps Show (Confidence: HIGH — official docs)

**Anki** (most mature SRS reference):
- Today section: reviews completed, pass/fail rate, card types (learning / review / relearning)
- Graphs: future due forecast, calendar heatmap, reviews by week/month, card counts (new/young/mature/suspended), answer button breakdown (Again/Hard/Good/Easy per card type), ease factor distribution, interval distribution, true retention table (per 1m/3m/6m/12m/all-time)
- Maturity threshold: **interval >= 21 days** (established convention, used as-is by Kartex)

**RemNote**:
- Study streak heatmap, cards-created-over-time widget, upcoming-due forecast
- Per-document color-coded Learning Progress bar across mastery levels (New → Acquiring → Growing → Solidifying → Retaining → Stale)
- Stats are primarily document-centric, not deck-centric at a high level
- Individual card metadata: ease factor, phase, next/last review, mastery level, total study time

**CleverDeck (SM-2)**:
- Mastery defined as interval >= 21 days (configurable, cosmetic setting only)
- Per-deck breakdown of new/in-learning/mastered counts

### Phased Delivery Recommendation

**Phase A (no migration needed):**
1. GET /api/stats/summary endpoint returning: totalReviewedAllTime, reviewedThisWeek, byDeck array of `{ deckId, deckTitle, dueCount, inLearningCount, masteredCount, newCount }`
2. Dashboard stat chips for the above
3. Optionally: upcoming-due-7-days count (requires no migration, just a `nextReview` aggregate)

**Phase B (requires `ReviewLog` migration — can ship same PR as import-merge migration):**
4. Retention rate chip (% Good+Easy last 30 days from `ReviewLog`)
5. Difficulty breakdown (Easy/Good/Hard/Again counts from `ReviewLog`)

If `ReviewLog` is deferred past v1.3, ship Phase A only and clearly label the retention/difficulty
chips as "coming soon" or omit them entirely. Do not ship a "retention rate" metric derived purely
from `interval` thresholds — it would be a different (less useful) metric with a misleading name.

---

## Feature Area 2: Deck Update via Import

### Table Stakes (users expect these; missing = product feels incomplete)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Upload new .kartex file from Deck Detail page | Core user request: "I updated my source file, refresh the deck without losing my progress" | Medium | New upload affordance on `DeckDetailPage`; existing `ImportPage` is "create new deck" only |
| Confirmation preview showing counts: added / updated / unchanged / removed | Without preview, users fear silent data loss; every SRS app with update support shows what will change before committing | Medium | Two-step: preview endpoint then commit endpoint |
| SM-2 progress preserved for matched cards | This is the entire value proposition; progress loss on re-import is the #1 user complaint in Anki forums | High (design) | Requires stable card matching; see Constraint B — needs `id:` field in format |
| New cards (present in file, absent in deck) added | Expected — user added cards to the source file | Low | Standard `Card.create` after matching |
| Removed cards (present in deck, absent in file) deleted | Expected behavior for "deck reflects the source file"; destructive but correct | Medium | Must be explicit in preview; `onDelete: Cascade` on `CardProgress` already in schema |

### Differentiators (valuable but not expected)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Keep removed cards" option on confirmation dialog | Power users may want to retain cards the author deleted (e.g. personal additions not in source) | Low | Single checkbox on confirmation; default is to delete |
| Dry-run / preview as a separate API call before commit | Clean REST design; avoids file being re-uploaded on confirm | Low-Medium | `POST /api/decks/:id/import/preview` → `POST /api/decks/:id/import/commit`; file held in frontend state between the two calls |
| Per-card diff (show which specific cards changed, not just counts) | Useful for reviewing content changes in detail | High | Verbose for large decks; counts are sufficient for v1.3 |
| Media file updates in .kartex.zip bundles | Update images/audio in place along with card content | High | Requires tracking media refs across update; complex media-ref rewrite for updated cards; defer to later milestone |

### Anti-Features (explicitly do not build)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Silent import without preview | Users cannot undo deletions; Anki forums show this is the top import UX pain point | Always require explicit confirmation before any destructive change |
| Overwriting SM-2 progress by default | Defeats the entire purpose of the feature — users re-import because they updated content, not because they want to reset progress | Never overwrite `CardProgress` rows for matched cards |
| Field-level merge conflict resolution | "Author edited `front`, user also edited `front` — who wins?" is complex and rare at this scale | Last-write-wins: file content always overwrites card content (SM-2 state untouched) |
| Auto-removing cards without user confirmation | Too destructive; a mismatched ID or renamed card could silently delete progress | Count removals in preview; require explicit confirmation |
| Exposing raw SQL diff in the UI | Technical noise; users need counts, not IDs | Show "3 cards added, 1 updated, 2 removed" counts |

### Import-Merge Algorithm (Recommended Design)

```
INPUT: deckId (URL param), .kartex file (multipart upload)

PREVIEW STEP:
  1. Parse file → ParsedCard[] (existing parseKartex — no change)
  2. Load all existing cards for deck: id, kartexId, frontContent, backContent, tags
  3. For each parsed card with a non-null id field:
     - Find existing card WHERE kartexId = parsed.id
     - If found AND content same → UNCHANGED
     - If found AND content differs → UPDATE candidate
     - If not found → ADD candidate
  4. Parsed cards without id field → ADD candidate (cannot match)
  5. Existing cards not matched by any parsed card → REMOVE candidate
  6. Return counts: { added, updated, unchanged, removed }

COMMIT STEP (user confirms):
  7. Execute in a single Prisma transaction:
     a. UPDATE matched cards: frontContent, backContent, tags (CardProgress untouched)
     b. CREATE new Card rows for adds (no CardProgress — treated as new cards)
     c. DELETE Card rows for removes (CardProgress cascade-deletes per schema)
  8. Return { added, updated, removed, warnings }
```

**Cascade delete note:** `Card → CardProgress` already has `onDelete: Cascade` in
`schema.prisma`. Removing a card correctly removes its SM-2 history without extra code.

**Media note:** For v1.3, only plain `.kartex` files are supported for update. The `.kartex.zip`
bundle update (with media changes) is deferred due to complexity of re-mapping media refs on
updated cards. Updated card content that references existing `media://` files via unchanged
refs will continue to work correctly.

### API Design

Two-endpoint approach is preferred over a single endpoint with `dryRun` flag:

```
POST /api/decks/:id/import/preview
  Auth: JWT (deck owner only)
  Body: multipart, field "file" (.kartex only for v1.3)
  Response 200: { added: N, updated: N, unchanged: N, removed: N, warnings: [] }
  Response 422: parse errors

POST /api/decks/:id/import/commit
  Auth: JWT (deck owner only)
  Body: multipart, field "file" (.kartex only for v1.3), optional "keepRemoved": "true"
  Response 200: { added: N, updated: N, removed: N, warnings: [] }
  Response 422: parse errors
```

**Frontend state:** hold the `File` object in React component state between preview and commit.
Re-POST it on the commit call. File is not uploaded twice to the server unless the user changes
it between steps.

**Authorization:** only the deck owner can trigger an import-update. DeckShare READ/EDIT
holders cannot update the source deck. (Deck owner created the deck; they own the source file.)

### Format Extension Required

Add an optional `id:` field to card blocks in the `.kartex` format:

```
:: card
id: thermo-001
front: What is the zeroth law of thermodynamics?
back: If A ≡ B and B ≡ C, then A ≡ C. (Defines temperature as a transitive property.)
tags: [laws, zeroth-law]
::
```

Rules:
- `id:` is a single-line field (like `tags:`)
- IDs must be unique within a file; duplicate IDs produce a warning; second card treated as new
- Cards without `id:` are always new (cannot be matched to existing cards)
- IDs are stored in `Card.kartexId String?` (nullable DB column; unique per deck, not globally)
- The format is explicitly backward-compatible: old files without `id:` still import correctly

Parser changes needed:
- Add `id` field to `ParsedCard` Zod schema in `packages/shared/src/schemas/import.ts`
- Add `id` detection to `parseFields()` in `kartex-parser.ts` (single-line field, same as `tags`)
- Update `kartex-format.md` documentation

---

## Feature Dependency Map

```
ReviewLog table migration
  ├── POST /api/study/rate → append ReviewLog row on every rating
  ├── Retention rate chip (STATS-02)
  └── Difficulty breakdown chip (STATS-03)

No migration needed:
  ├── Total cards reviewed all-time (STATS-01 variant A)
  ├── Reviewed this week (STATS-01 variant B)
  └── Per-deck progress (STATS-04): due / in-learning / mastered / new

kartexId field on Card model (migration)
  ├── id: field in .kartex format (format extension)
  ├── ParsedCard.id in shared Zod schemas
  ├── parseFields() in kartex-parser.ts
  └── Import-merge matching logic
       ├── POST /api/decks/:id/import/preview (IMP-01, IMP-05)
       ├── POST /api/decks/:id/import/commit (IMP-02, IMP-03, IMP-04)
       └── DeckDetailPage: upload affordance + confirmation modal
```

---

## MVP Recommendation for v1.3

**Ship Phase A (Stats, no new migration):**
- `GET /api/stats/summary` — totalReviewedAllTime, reviewedThisWeek, byDeck summary
- Dashboard stat chips for all Phase A metrics
- New `StatsSchema` and `DeckProgressSchema` in `packages/shared`

**Ship Phase B (Import-merge, one migration):**
- Migration: add `ReviewLog` table + `Card.kartexId String?` (single migration, low cost)
- Parser extension: `id:` field support
- `POST /api/decks/:id/import/preview` + `POST /api/decks/:id/import/commit`
- `DeckDetailPage` upload affordance + confirmation dialog

**Defer:**
- Retention rate chip and difficulty breakdown chip (need `ReviewLog` data to accumulate first — ship the table in v1.3, surface the metrics in v1.4 once there is real data)
- Media update support in `.kartex.zip` bundles
- Per-card diff view in import preview

**Delivery order:** Stats Phase A first (no format changes, no migration needed), then
Import-merge Phase B (requires format extension + migration). Stats and Import-merge are
independent of each other — can be parallelized within the milestone.

---

## Sources

- [Anki Statistics Manual](https://docs.ankiweb.net/stats.html) — HIGH confidence
- [Anki Packaged Decks Import](https://docs.ankiweb.net/importing/packaged-decks.html) — HIGH confidence
- [RemNote Flashcard Statistics](https://help.remnote.com/en/articles/7970392-flashcard-statistics) — MEDIUM confidence
- [RemNote Flashcard Home](https://help.remnote.com/en/articles/7925835-the-flashcard-home) — MEDIUM confidence
- [CleverDeck Algorithm (mastery threshold)](https://cleverdeck.com/manual/algorithm/) — MEDIUM confidence
- [Anki Forums: Updating imported deck without losing progress](https://forums.ankiweb.net/t/is-there-a-way-to-update-an-imported-deck-so-i-dont-lose-my-progress-with-the-cards-already-in-there/47625) — MEDIUM confidence (user pain points, expected behaviors)
- [Flashcards World Import/Export](https://flashcards.world/wiki/import-export/) — LOW confidence (confirms preview-before-commit pattern is expected; non-destructive default is common)
- Kartex codebase: `apps/backend/prisma/schema.prisma`, `packages/shared/src/lib/kartex-parser.ts`, `packages/shared/src/schemas/import.ts`, `apps/backend/src/routes/study.ts`, `apps/backend/src/routes/dashboard.ts`, `docs/kartex-format.md` — HIGH confidence (ground truth)
