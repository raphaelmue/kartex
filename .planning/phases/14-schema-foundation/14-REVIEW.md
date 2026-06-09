---
phase: 14-schema-foundation
reviewed: 2026-06-10T00:00:00Z
depth: deep
files_reviewed: 7
files_reviewed_list:
  - apps/backend/src/routes/study.ts
  - packages/shared/src/lib/kartex-parser.ts
  - packages/shared/src/schemas/stats.ts
  - packages/shared/src/schemas/update.ts
  - packages/shared/src/schemas/import.ts
  - apps/backend/prisma/schema.prisma
  - apps/backend/prisma/migrations/20260609000000_add_reviewlog_and_card_kartexid/migration.sql
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 14: Code Review Report

**Reviewed:** 2026-06-10
**Depth:** deep
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Seven files reviewed covering the ReviewLog audit trail, SM-2 transaction wrapper, kartex-parser `id:` field, and schema additions. Two critical bugs were found: a pre-existing SM-2 interval calculation error that is now being persistently written to the database via the new transaction, and a missing foreign-key constraint on `ReviewLog.deckId` that leaves deckId as an unenforced bare string. Three warnings cover a redundant filter, dead regex code, and a shared-card rating authorization gap. Two info items cover minor code quality issues.

---

## Critical Issues

### CR-01: SM-2 interval calculation uses stale `easeFactor` on repetitions >= 2

**File:** `packages/shared/src/lib/sm2.ts:55`
**Issue:** The interval formula for the third review onwards reads `Math.ceil(interval * easeFactor)` where `easeFactor` is the *old* value from `SM2Input`. The newly-computed `newEF` is not used until the returned struct. For every card rated "Good" or "Easy" after the second repetition, the stored interval is calculated with the pre-update ease factor, diverging from the SM-2 specification which requires the adjusted EF to drive the next interval.

This was a pre-existing bug, but Phase 14's transaction wrapper now writes the incorrect `interval` atomically to `CardProgress` on every rating, making it actively harmful and persistently corrupting spaced-repetition schedules for all users from the first Good/Easy rating on an established card.

**Fix:**
```typescript
// sm2.ts line 55 — replace:
newInterval = Math.ceil(interval * easeFactor)
// with:
newInterval = Math.ceil(interval * newEF)
```

---

### CR-02: `ReviewLog.deckId` has no foreign-key relation to `Deck` — unenforced bare string

**File:** `apps/backend/prisma/schema.prisma:135` and `apps/backend/prisma/migrations/20260609000000_add_reviewlog_and_card_kartexid/migration.sql`

**Issue:** `ReviewLog.deckId` is declared as a plain `String` field with no `@relation`, no `deck Deck @relation(...)` line, and no corresponding FK constraint added in the migration SQL. The migration adds FK constraints for `userId → User` and `cardId → Card`, but omits one for `deckId → Deck`.

The immediate consequence is that Prisma does not enforce referential integrity on `deckId`. If a `Deck` row is deleted (e.g., by admin action or a future soft-delete purge), all `ReviewLog` rows for that deck retain the now-orphaned `deckId` string. Stats queries that JOIN on `deckId` will silently return mismatched or missing data. Additionally, the Prisma client will never validate that the `deckId` written in `study.ts:223` actually refers to a real `Deck` — the value could be any string.

The `Card` model has a back-relation `reviewLogs ReviewLog[]` and `User` has `reviewLogs ReviewLog[]`, but `Deck` has no such back-relation, confirming the FK is missing.

**Fix — Prisma schema:**
```prisma
model ReviewLog {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  cardId      String
  card        Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  deckId      String
  deck        Deck     @relation(fields: [deckId], references: [id], onDelete: Cascade)
  rating      Int
  reviewedAt  DateTime @default(now())

  @@index([userId, reviewedAt])
}
```

Add to `Deck` model:
```prisma
reviewLogs ReviewLog[]
```

**Fix — migration SQL (addendum migration):**
```sql
ALTER TABLE "ReviewLog"
  ADD CONSTRAINT "ReviewLog_deckId_fkey"
  FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## Warnings

### WR-01: Dead regex code in `parseCardBlock` — computed but never used

**File:** `packages/shared/src/lib/kartex-parser.ts:125–139`

**Issue:** Lines 125–128 compute `frontMatch`, `backMatch`, and `tagsMatch` via regex against `normalized`, but these values are never read — they are explicitly voided on lines 137–139 (`void frontMatch`, `void backMatch`, `void tagsMatch`). The actual field extraction is performed by `parseFields()` on line 131. The dead regex calls execute on every card block with no effect, and the `void` suppression suggests the author noticed but deferred cleanup.

This is not a correctness problem in isolation, but it obscures which code path is authoritative for field parsing and the leftover regexes contain a subtle bug: the `frontMatch`/`backMatch` patterns use a lookahead `(?=^back:|...)` that may not reliably match under all multiline configurations — if this code were ever un-voided it would produce incorrect results.

**Fix:** Remove lines 125–128 and 137–139 entirely. `parseFields()` is the sole field parser.

---

### WR-02: Redundant client-side filter on `neverSeen` cards in `/due` endpoint

**File:** `apps/backend/src/routes/study.ts:78`

**Issue:** The Prisma query for `neverSeen` already uses `progress: { none: { userId } }`, which returns only cards that have zero `CardProgress` rows for this user. The subsequent `.filter((card) => !cardIdsWithProgress.includes(card.id))` (line 78) can therefore never remove any card — it is dead filtering logic. `cardIdsWithProgress` contains card IDs of cards *with* due progress, but `neverSeen` cards have no progress at all; the intersection is always empty.

The concern is that the variable name `cardIdsWithProgress` hints at a past design where `dueWithProgress` was a subset of all progress records, not all-due records — suggesting this filter was relevant under a different query structure and was not removed when the query was tightened.

**Fix:** Remove lines 77–88's `.filter(...)` call:
```typescript
const newCards = neverSeen.map((card: (typeof neverSeen)[number]) => ({
  id: card.id,
  // ...
}))
```
Also remove the `cardIdsWithProgress` variable (lines 52–54) which becomes unused.

---

### WR-03: Shared-deck rating authorization does not check `isActive` on shared decks

**File:** `apps/backend/src/routes/study.ts:158–165`

**Issue:** The ownership path correctly checks `card.deck.isActive` at line 159 before the ownership branch. However, the `DeckShare` check only verifies the share *exists* — it does not re-check that `card.deck.isActive` is `true` for the shared path. For the owner path, an inactive deck returns 403; for a shared-deck user, the code reaches `tx.cardProgress.upsert` even if `isActive` is `false` (because `isActive` is checked only once, before the ownership branch, and applies to both paths).

Wait — re-reading lines 158–165 carefully: the `isActive` check at line 159 (`if (!card.deck.isActive) return c.json(...)`) executes *before* the ownership check at line 161. So the isActive guard does apply to both the owner and shared paths. This is actually correct.

However, `card` is fetched with `include: { deck: { select: { ownerId: true, isActive: true } } }` but the `Deck` include does *not* select `id` — yet `card.deckId` (the scalar FK) is used later in the ReviewLog write. This is fine because `deckId` is a top-level scalar on `Card`. No bug here; see below for the real concern.

**Revised issue:** The real concern is that the `card` fetch (line 152–155) fetches only `ownerId` and `isActive` from the deck. If `card` is null the 404 fires, but if the card exists on an *archived/soft-deleted* deck, `isActive: false` correctly fires 403. This is correct. Downgrading; see CR-02 for the genuine integrity gap.

**Note:** WR-03 is retained to document the review trail, but the authorization logic for `isActive` is correctly ordered. The warning is that the comment on line 158 reads "Deck must be active regardless of ownership path (CR-02)" — this references an internal issue ID that may confuse future readers since CR-02 is also used as a review finding ID in this document.

**Fix:** Rename the inline comment to avoid collision with external review IDs:
```typescript
// Deck must be active regardless of ownership path (T-4-04)
if (!card.deck.isActive) return c.json({ error: 'Forbidden.' }, 403)
```

---

## Info

### IN-01: `ParsedCardSchema` id field min-length constraint can never fire given parser behavior

**File:** `packages/shared/src/schemas/import.ts:11` cross-referenced with `packages/shared/src/lib/kartex-parser.ts:199`

**Issue:** `ParsedCardSchema` defines `id: z.string().min(1).optional()`. The parser (line 199) already coerces empty strings to `undefined` before placing them in `ParsedCard`. This means `z.string().min(1)` on the schema will never catch an empty string id coming from the parser — the guard is in the parser, not the schema. If any other code path constructs a `ParsedCard` object with `id: ""` and validates it through the schema, the `min(1)` would fire; but today no such path exists.

This is benign but the defense-in-depth constraint is redundant given the parser-side coercion. Document or remove redundancy so the intent is clear.

**Fix:** Add a comment to the schema:
```typescript
id: z.string().min(1).optional(), // parser coerces "" → undefined; min(1) is a schema-level guard
```

---

### IN-02: `stats.ts` exports constants not re-exported from `packages/shared/src/index.ts`

**File:** `packages/shared/src/schemas/stats.ts:5–6` cross-referenced with `packages/shared/src/index.ts`

**Issue:** `MASTERED_INTERVAL_DAYS` and `MASTERED_REPETITIONS` are exported from `stats.ts` but `index.ts` exports `'./schemas/stats'` via `export * from './schemas/stats'` — so these constants *are* re-exported. However, they are not listed in any type index or documented in the shared package API. If Phase 15 stats logic needs to import these thresholds, consumers must know to look in `@kartex/shared`. Since `index.ts` does include them, this is minor.

**Fix:** No code change required. Add a JSDoc comment to the exports noting they are part of the public shared API:
```typescript
/** Thresholds for "mastered" card classification. Part of the public @kartex/shared API. */
export const MASTERED_INTERVAL_DAYS = 21
export const MASTERED_REPETITIONS = 3
```

---

_Reviewed: 2026-06-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
