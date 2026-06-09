# Technology Stack — v1.3.0 Additions

**Project:** Kartex v1.3.0 Stats & Import Update
**Researched:** 2026-06-09
**Mode:** Milestone supplement — existing stack is fixed; this covers NEW capabilities only.

---

## Scope

Two feature areas. The existing stack (React 18 + Vite 5 + TypeScript + shadcn/ui + Hono +
Prisma 7 + PostgreSQL 16 + react-i18next v26 + vite-plugin-pwa) is validated and not
re-researched.

---

## Feature 1: Learning Statistics Dashboard

### Critical Schema Gap — ReviewLog Table Required

**The current schema cannot answer STATS-02 or STATS-03.**

`CardProgress` stores SM-2 state only: `easeFactor`, `interval`, `repetitions`,
`nextReview`, `lastReviewed`. The `rating` (1–4) submitted by the user is used to compute
the SM-2 output and then discarded — it is never persisted. This means:

- STATS-02 (retention rate = % ratings ≥ Good in last 30 days) — **no data**
- STATS-03 (card difficulty breakdown = Easy/Good/Hard/Again counts) — **no data**

STATS-01 (reviewed today count) and STATS-04 (per-deck due/mastered/in-learning) can be
derived from existing `CardProgress` fields.

**Recommended fix: add a `ReviewLog` model to capture every rating event.**

```prisma
model ReviewLog {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  cardId     String
  card       Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  deckId     String
  deck       Deck     @relation(fields: [deckId], references: [id], onDelete: Cascade)
  rating     Int      // 1=Again 2=Hard 3=Good 4=Easy (raw user rating, not SM-2 quality)
  reviewedAt DateTime @default(now())

  @@index([userId, reviewedAt])
  @@index([userId, deckId, reviewedAt])
}
```

Add back-relations to `User`, `Card`, `Deck`:
```prisma
model User  { reviewLogs ReviewLog[] }
model Card  { reviewLogs ReviewLog[] }
model Deck  { reviewLogs ReviewLog[] }
```

**What changes at the route level:** `POST /api/study/rate` already has the `rating` value
in scope (from `RateCardSchema`). Add a `reviewLog.create` call inside the existing
`cardProgress.upsert` — batch both in a `$transaction` to keep the write atomic.

**Migration safety:** New table with no NOT-NULL columns without defaults and no required
foreign keys without defaults. Existing rows are unaffected. No backfill needed — stats
show data from the point the migration runs forward.

**Confidence:** HIGH — direct code read of `study.ts` confirms rating is discarded; Prisma
`$transaction` pattern is already used in `import.ts`.

### What Drives the Stat Chip Values

Once `ReviewLog` exists, the four stats compute as:

| Stat | Source | Query |
|------|--------|-------|
| STATS-01: total reviewed (all time + this week) | `ReviewLog` | COUNT with `reviewedAt >= weekStart` |
| STATS-02: retention rate (30 days) | `ReviewLog` | COUNT(rating >= 3) / COUNT(*) where reviewedAt >= 30 days ago |
| STATS-03: difficulty breakdown | `ReviewLog` | GROUP BY rating where reviewedAt >= 30 days ago (or all time) |
| STATS-04: per-deck progress | `CardProgress` + `Card` | interval >= 21 → "mastered"; repetitions > 0 → "in-learning"; no row → "new/due" |

These are straightforward aggregate queries in Prisma. No special analytics library is needed.

### New API Endpoint

Add `GET /api/stats/summary` (or extend `GET /api/dashboard/stats`). Returning from the
existing dashboard endpoint is simpler (one fetch call) — extend `DashboardStats` in
`packages/shared` rather than adding a new route.

**No new libraries needed** for the backend statistics computation.

### Frontend: No Charting Library

The dashboard spec calls for **stat chips** — small numeric tiles showing a value and a
label. The two existing chips (reviewed today, streak) are already implemented as plain
`div` + Tailwind. The new chips (total reviewed, retention %, difficulty breakdown, per-deck
progress) follow the same pattern.

STATS-04 (per-deck progress showing due/mastered/in-learning counts) could optionally use a
progress bar — the `Progress` component from `@radix-ui/react-progress` is **already
installed** in the project (`apps/frontend/src/components/ui/progress.tsx`).

**Decision: do not add a charting library.** Recharts, Nivo, and similar add 50-300 KB to
the bundle. The spec says "stat chips on the existing dashboard page" — numeric tiles, not
charts. The existing `Progress` bar component is sufficient for any proportional display.

**If a bar chart is ever needed** (out of scope for v1.3): Recharts is the idiomatic choice
for React (MIT, ~130 KB gzip, tree-shakeable, well-maintained). Install then, not now.

**No new npm packages needed** for the stats dashboard UI.

### Date Range Arithmetic

Retention rate and difficulty breakdown require "last 30 days" filtering. This is a single
`new Date(); date.setDate(date.getDate() - 30)` computation — no date library needed.
The project already avoids date libraries (no `date-fns` or `dayjs` in either package.json).
Keep that pattern.

**Confidence:** HIGH — confirmed by reading both package.json files and the existing
dashboard route implementation.

---

## Feature 2: Deck Update via Import

### Critical Format Gap — Card `id:` Field Does Not Exist

**The current `.kartex` format has no `id:` field on card blocks.**

The parser (`kartex-parser.ts`) recognises only `front:`, `back:`, and `tags:`. The
`ParsedCard` Zod schema has no `id` field. The import route (`import.ts`) calls
`card.createMany` and does not pass any application-level ID.

For merge-by-ID to work (IMP-02/03/04), cards in the `.kartex` file must carry a stable
identity that survives re-export and re-import. The only correct solution is to add an
optional `id:` field to the format.

**Recommended additions:**

1. **`.kartex` format (docs/kartex-format.md):** Add `id:` as an optional card field. When
   exporting a deck, the backend serialises the Prisma `card.id` (CUID) as the `id:` field.
   When importing for update, the parser extracts `id:` and the route uses it as the merge
   key. Cards without `id:` are treated as new (assigned a new DB id on insert).

2. **`ParsedCard` Zod schema** (`packages/shared/src/schemas/import.ts`):
   ```typescript
   export const ParsedCardSchema = z.object({
     id: z.string().optional(),   // NEW — present only in re-exported decks
     front: z.string().min(1),
     back: z.string().min(1),
     tags: z.array(z.string()).default([]),
   })
   ```

3. **`kartex-parser.ts`:** Add `id:` to `FIELD_PATTERN` and `parseFields`. One-line regex
   change: `const FIELD_PATTERN = /^(front|back|tags|id):\s*(.*)/`
   Collect `id` as a string if present, pass through to `ParsedCard`.

4. **Deck export endpoint (new):** `GET /api/decks/:id/export` — serialises the deck to
   `.kartex` text, writing each card's DB `id` into the `id:` field. This is the mechanism
   by which users get a `.kartex` file that carries IDs. Without export, the update feature
   only works if the user manually added `id:` fields (unlikely) — so export is a
   prerequisite.

**No new libraries needed** for format extension or merge logic.

### Merge Logic — Pure Set Operations, No Library

The merge (IMP-02/03/04) is a three-way diff on card IDs:

```
fileIds   = Set of id values from parsed file (non-null only)
dbIds     = Set of card.id values currently in the deck

toUpdate  = intersection(fileIds, dbIds)   → update content, preserve CardProgress
toAdd     = fileIds - dbIds                → card.createMany
toRemove  = dbIds - fileIds                → card.deleteMany (cascades CardProgress)
noIdCards = cards from file with no id    → card.createMany (always new)
```

This is four JavaScript `Set` operations. No diffing library needed. The `diff` npm package
or similar are for text line diffing, which is irrelevant here.

**Confidence:** HIGH — pure algorithmic logic, no external dependency required.

### Confirmation Preview — New Shared Schema

IMP-05 requires a preview showing added/updated/removed counts before the user commits.
This is a two-phase API:

- **Phase 1:** `POST /api/decks/:id/import/preview` — parse the file, compute diff counts,
  return the summary. Nothing written to DB.
- **Phase 2:** `POST /api/decks/:id/import/commit` — re-parse (or accept a preview token)
  and apply the merge.

Add a new Zod schema in `packages/shared/src/schemas/import.ts`:

```typescript
export const DeckUpdatePreviewSchema = z.object({
  toAdd:    z.number().int().nonnegative(),
  toUpdate: z.number().int().nonnegative(),
  toRemove: z.number().int().nonnegative(),
  warnings: z.array(ParseWarningSchema),
})
export type DeckUpdatePreview = z.infer<typeof DeckUpdatePreviewSchema>
```

No new libraries needed.

### File Upload UI — Reuse `useImport` Hook Pattern

The existing `ImportPage.tsx` and `useImport` hook handle file upload, parse preview, and
confirmation already. The deck-update upload on `DeckDetailPage` should reuse the same
pattern: a hidden `<input type="file">` + `FormData` POST, progress state managed locally.

The confirmation preview dialog can use the existing `Dialog` component from
`@radix-ui/react-dialog` (already installed).

**No new UI libraries needed.**

### ZIP Bundle Handling for Deck Update

The existing import route handles both `.kartex` and `.kartex.zip`. The deck-update route
must handle both as well. All ZIP logic (`unzipper`, `file-type`, `ALLOWED_MIMES`, media
UUID rewrite) already exists in `import.ts`. Extract the shared logic into a helper
function and call it from both routes.

**No new libraries needed** — `unzipper` and `file-type` are already installed.

---

## Summary of New Dependencies

**Zero new npm packages are required for v1.3.0.**

| Feature | Change | Libraries |
|---------|--------|-----------|
| ReviewLog schema | New Prisma model + migration | None — Prisma already installed |
| Stats API | Extend dashboard route, aggregate queries | None |
| Stats UI chips | Extend existing chip layout | None — shadcn/ui Progress already installed |
| `.kartex` `id:` field | Parser + schema update | None — `yaml` already installed |
| Merge logic | Set operations in `import.ts` | None |
| Preview schema | New Zod object in `packages/shared` | None — Zod already installed |
| Deck export | New `GET /api/decks/:id/export` route | None |
| Update UI | File input + Dialog on DeckDetailPage | None — Dialog already installed |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Stats visualization | No charting library — numeric chips | Recharts | Spec says chips, not charts; adds 130 KB+ bundle weight for no stated requirement |
| Date range | Inline `new Date()` arithmetic | date-fns / dayjs | No date library in project; 30-day window is a single subtraction |
| Card merge key | `id:` field in `.kartex` format | Content hash of front+back | Content hash breaks on any edit; stable DB id is the only reliable key |
| Diff computation | In-memory Set operations | npm `diff` package | `diff` is for text line diffing; structural card set operations need no library |
| Preview/commit two-phase | Stateless re-parse on commit | Server-side session token | Stateless is simpler; re-parsing a small file is negligible cost |

---

## Sources

- Direct code read: `apps/backend/src/routes/study.ts` — confirms rating is discarded after SM-2 computation (HIGH confidence)
- Direct code read: `apps/backend/prisma/schema.prisma` — confirms no `ReviewLog` or `lastRating` field exists (HIGH confidence)
- Direct code read: `packages/shared/src/lib/kartex-parser.ts` — confirms no `id:` field parsed (HIGH confidence)
- Direct code read: `packages/shared/src/schemas/import.ts` — confirms `ParsedCard` has no `id` field (HIGH confidence)
- Direct code read: `apps/frontend/package.json` — confirms no charting library installed, `@radix-ui/react-progress` and `@radix-ui/react-dialog` already present (HIGH confidence)
