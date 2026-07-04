# Phase 30: Study Timers & Stats - Pattern Map

**Mapped:** 2026-07-04
**Files analyzed:** 10
**Analogs found:** 10 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `apps/frontend/src/components/SessionTimer.tsx` (new) | component | request-response (client-only, local state + visibility events) | `apps/frontend/src/components/ExamTimer.tsx` | exact (explicitly named as copy-source in UI-SPEC) |
| `apps/frontend/src/pages/StudySessionPage.tsx` (modify `SessionRunner`) | component | event-driven (local timer state + session lifecycle) | itself (existing `startTime`/`endTime`/`ExamTimer` slot, lines 45-54, 124-141) | exact |
| `apps/frontend/src/components/StatsSummaryPanel.tsx` (modify) | component | request-response (renders `StatsSummary` prop) | itself (existing `perDeck` table block, lines 122-180) | exact |
| `apps/backend/prisma/schema.prisma` (modify — `ReviewLog.thinkingTimeMs`, new `StudySession`, `StudySessionDeck` models) | model | CRUD | `ReviewLog` model (line 140) for column addition; `DeckShare` model (line 96) for join-table pattern | exact |
| `apps/backend/prisma/migrations/<timestamp>_add_study_timers/migration.sql` (new) | migration | batch/DDL | `apps/backend/prisma/migrations/20260609000000_add_reviewlog_and_card_kartexid/migration.sql` | exact |
| `apps/backend/src/routes/study.ts` (modify `POST /rate`) | route/controller | CRUD (transaction write) | itself (existing `$transaction` upsert+create block, lines 213-243) | exact |
| `apps/backend/src/routes/study.ts` (new session start/complete route, e.g. `POST /session/start`, `POST /session/complete`) | route/controller | CRUD | `POST /rate` transaction pattern + `GET /due` deck-ownership/share filter (lines 17-39) | role-match |
| `apps/backend/src/routes/stats.ts` (modify `GET /summary`) | route/controller | CRUD (aggregation/read) | itself (existing `perDeck` block, lines 66-118, and null-on-empty `retentionRate`/`difficultyBreakdown` pattern, lines 45-64) | exact |
| `packages/shared/src/schemas/stats.ts` (modify — `avgThinkingTimeMs`, `recentSessions`) | model (zod schema) | transform | itself (`PerDeckProgressSchema`, `StatsSummarySchema`) | exact |
| `packages/shared/src/schemas/study.ts` (modify — `RateCardSchema.thinkingTimeMs`, new `StudySessionSchema`/session request schemas) | model (zod schema) | transform | itself (`RateCardSchema`, `RateCardResponseSchema`) | exact |
| `apps/frontend/src/locales/en.json` / `de.json` (modify) | config | transform | existing `study.*` / `dashboard.stats.*` keys | exact |

## Pattern Assignments

### `apps/frontend/src/components/SessionTimer.tsx` (component, new)

**Analog:** `apps/frontend/src/components/ExamTimer.tsx` (full file, 60 lines — read in one pass)

**Imports pattern** (lines 1-3):
```tsx
import { useEffect, useRef, useState } from 'react'
import { Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
```

**Core count-down primitive to copy and invert to count-up** (lines 10-40):
```tsx
export function ExamTimer({ durationSeconds, onExpire }: ExamTimerProps) {
  const { t } = useTranslation()
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onExpireRef = useRef(onExpire)
  useEffect(() => { onExpireRef.current = onExpire }, [onExpire])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [durationSeconds])
  ...
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs = String(secondsLeft % 60).padStart(2, '0')
```

For `SessionTimer`: replace `setSecondsLeft((prev) => prev <= 1 ? 0 : prev - 1)` with an elapsed-seconds count computed from `startedAt` (prop) minus accumulated hidden-time, e.g. `setElapsed(Math.floor((Date.now() - startedAt - pausedMs) / 1000))`. Add a `document.visibilitychange` listener (new logic, no analog in `ExamTimer`) that accumulates hidden duration into a ref and freezes the tick while `document.hidden === true` (D-05). No `onExpire` callback is needed — drop that prop entirely.

**Markup/a11y pattern to copy verbatim except color** (lines 49-59, drop `colorClass` ternary at lines 42-47 — UI-SPEC mandates no color-shift):
```tsx
<div
  className="flex items-center gap-1 text-sm font-mono tabular-nums text-foreground"
  role="timer"
  aria-live="off"
  aria-label={t('study.sessionElapsedAriaLabel', { time: `${mins}:${secs}` })}
>
  <Timer className="h-4 w-4" aria-hidden="true" />
  <span>{mins}:{secs}</span>
</div>
```

---

### `apps/frontend/src/pages/StudySessionPage.tsx` (modify `SessionRunner`)

**Analog:** itself — `SessionRunner` sub-component (lines 26-160+ read)

**Existing state to reuse as `SessionTimer`'s `startedAt` prop** (line 46):
```tsx
const [startTime] = useState(() => Date.now())
```
No new state needed — D-02/UI-SPEC explicitly says wire `startedAt={startTime}` directly.

**Slot to modify** (lines 135-140), replace conditional-only-exam render with if/else covering both modes:
```tsx
{mode === 'exam' && examDurationSeconds !== null && (
  <ExamTimer
    durationSeconds={examDurationSeconds}
    onExpire={() => setExamExpired(true)}
  />
)}
```
becomes (per UI-SPEC Interaction Contract §1):
```tsx
{mode === 'exam' && examDurationSeconds !== null ? (
  <ExamTimer durationSeconds={examDurationSeconds} onExpire={() => setExamExpired(true)} />
) : (
  <SessionTimer startedAt={startTime} />
)}
```

**Session-duration-at-completion pattern to mirror for `POST` session-complete call** (lines 77-81):
```tsx
const elapsedMs = (endTime ?? startTime) - startTime
const elapsedSec = Math.floor(elapsedMs / 1000)
const elapsedMin = Math.floor(elapsedSec / 60)
const elapsedRemSec = elapsedSec % 60
```
This is the same mm:ss construction the UI-SPEC references for the Recent Sessions `formatDuration` helper — reuse this exact math, do not reinvent.

**New logic needed (no analog, flag for planner):** first-flip-only capture of `thinkingTimeMs` (D-03/D-04) and calling a new session-start/session-complete endpoint from mount/`sessionDone` effect — model this after the existing `useEffect(() => { if (sessionDone) setEndTime(...) }, [sessionDone])` at lines 53-55, extending it to also POST completion data.

---

### `apps/backend/src/routes/study.ts` (modify `POST /rate`, add session routes)

**Analog:** itself, `POST /rate` (lines 155-255)

**Imports pattern** (lines 1-4):
```typescript
import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { RateCardSchema } from '@kartex/shared'
import { calculateSM2, RATING_TO_QUALITY } from '../lib/sm2.js'
```

**Validation pattern** (lines 156-159):
```typescript
const body = RateCardSchema.safeParse(await c.req.json())
if (!body.success) {
  return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
}
```

**Ownership/share check pattern to reuse for session-scoped routes** (lines 165-180): fetch entity, check `card.deck.isActive`, check `ownerId !== userId` then look up `deckShare` and verify `isActive`. Apply the same shape when validating that a `StudySession`'s decks belong to/are shared with the user.

**Transaction pattern — copy directly for `thinkingTimeMs` write and adapt for session create/update** (lines 213-243):
```typescript
const updated = await prisma.$transaction(async (tx) => {
  const upserted = await tx.cardProgress.upsert({ ... })
  await tx.reviewLog.create({
    data: { userId, cardId, deckId: card.deckId, rating, reviewedAt: new Date() },
  })
  return upserted
})
```
Add `thinkingTimeMs` to the `RateCardSchema` body and pass through to `tx.reviewLog.create({ data: { ..., thinkingTimeMs } })`.

**New session routes (no direct analog — compose from `GET /due`'s deck filter, lines 22-39, plus this transaction pattern):**
- `POST /session/start` — `prisma.studySession.create({ data: { userId, startedAt: new Date(), decks: { create: deckIds.map(deckId => ({ deckId })) } } })` (mirrors `DeckShare` join-row creation style).
- `POST /session/complete` (or `PATCH /session/:id`) — `prisma.studySession.update({ where: { id, userId }, data: { completedAt: new Date(), cardsReviewed, durationSeconds } })`. Include a `userId` ownership guard exactly like the `card.deck.ownerId !== userId` check above.

---

### `apps/backend/src/routes/stats.ts` (modify `GET /summary`)

**Analog:** itself, `perDeck` block (lines 66-118) and null-on-empty convention (lines 45-64)

**Null-on-empty pattern to replicate for avg flip time (per-row) and recentSessions (array, never null — empty array + `noSessionsYet` UI state instead, per UI-SPEC)**:
```typescript
// CRITICAL: null on empty — never return 0 when no review history (T-15-02, Pitfall 1)
const retentionRate = totalLast30 === 0 ? null : goodLast30 / totalLast30
```
Apply identically per-deck: `avgThinkingTimeMs: reviewLogsForDeck.length === 0 ? null : sum / count`.

**Per-deck aggregation pattern to copy structurally** (lines 88-118):
```typescript
const perDeck = decks.map((deck) => {
  let dueCount = 0
  let masteredCount = 0
  let inLearningCount = 0
  for (const card of deck.cards) { ... }
  return { deckId: deck.id, deckTitle: deck.title, dueCount, masteredCount, inLearningCount }
})
```
Add `avgThinkingTimeMs` computed via a `prisma.reviewLog.groupBy({ by: ['deckId'], where: { userId, thinkingTimeMs: { not: null } }, _avg: { thinkingTimeMs: true } })` query (mirrors the `groupBy` already used for `difficultyBreakdown`, lines 49-53), then merged into the `perDeck` map by `deckId` — same `.find()` merge idiom used at lines 60-63.

**Recent sessions query (new, no direct analog) — model shape after existing multi-query-then-merge style used throughout this file:**
```typescript
const recentSessions = await prisma.studySession.findMany({
  where: { userId },
  orderBy: { startedAt: 'desc' },
  take: 10, // D-11
  include: { decks: { include: { deck: { select: { title: true } } } } },
})
```
Map to `{ id, startedAt, durationSeconds, cardsReviewed, completed: session.completedAt !== null, deckTitles: session.decks.map(d => d.deck.title) }` — `completed` flag distinguishes D-08 abandoned rows for the UI's "Incomplete" badge.

---

### `apps/backend/prisma/schema.prisma` (modify)

**Analog for column addition — `ReviewLog` model** (lines 140-151):
```prisma
model ReviewLog {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  cardId      String
  card        Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  deckId      String
  rating      Int
  reviewedAt  DateTime @default(now())

  @@index([userId, reviewedAt])
}
```
Add `thinkingTimeMs Int?` (nullable — no backfill for historical rows, same nullable-column precedent as `Card.kartexId`).

**Analog for join table — `DeckShare` model** (lines 96-106):
```prisma
model DeckShare {
  id               String     @id @default(cuid())
  deckId           String
  deck             Deck       @relation(fields: [deckId], references: [id], onDelete: Cascade)
  sharedWithUserId String
  sharedWithUser   User       @relation(fields: [sharedWithUserId], references: [id])
  permission       Permission @default(READ)
  isActive         Boolean    @default(true)

  @@unique([deckId, sharedWithUserId])
}
```
`StudySessionDeck` should follow this exact shape minus the `permission`/`isActive` fields:
```prisma
model StudySessionDeck {
  id             String       @id @default(cuid())
  studySessionId String
  studySession   StudySession @relation(fields: [studySessionId], references: [id], onDelete: Cascade)
  deckId         String
  deck           Deck         @relation(fields: [deckId], references: [id], onDelete: Cascade)

  @@unique([studySessionId, deckId])
}
```

**New `StudySession` model (no direct analog — compose from `CardProgress`'s nullable-timestamp pattern, line 135, plus `ReviewLog`'s user-cascade pattern):**
```prisma
model StudySession {
  id             String             @id @default(cuid())
  userId         String
  user           User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  startedAt      DateTime           @default(now())
  completedAt    DateTime?
  durationSeconds Int?
  cardsReviewed  Int                @default(0)
  decks          StudySessionDeck[]

  @@index([userId, startedAt])
}
```

---

### `apps/backend/prisma/migrations/<timestamp>_add_study_timers/migration.sql` (new)

**Analog:** `apps/backend/prisma/migrations/20260609000000_add_reviewlog_and_card_kartexid/migration.sql` (full file, 34 lines — read in one pass)

Copy the hand-written migration structure verbatim: header comment block explaining what/why/safety, `ALTER TABLE` for the nullable `ReviewLog.thinkingTimeMs` column (no DEFAULT, matches `Card.kartexId` precedent at lines 7-8), `CREATE TABLE` for each new table, `CREATE INDEX` for the compound `(userId, startedAt)` index (mirrors `ReviewLog_userId_reviewedAt_idx`, lines 26-27), and `ADD CONSTRAINT ... ON DELETE CASCADE` foreign keys (lines 29-33 pattern) for `StudySession.userId`, `StudySessionDeck.studySessionId`, and `StudySessionDeck.deckId`.

---

### `packages/shared/src/schemas/stats.ts` / `study.ts` (modify)

**Analog:** itself — `PerDeckProgressSchema` / `StatsSummarySchema` (stats.ts lines 16-32), `RateCardSchema` (study.ts lines 13-17)

```typescript
export const PerDeckProgressSchema = z.object({
  deckId: z.string().min(1),
  deckTitle: z.string(),
  dueCount: z.number().int().nonnegative(),
  masteredCount: z.number().int().nonnegative(),
  inLearningCount: z.number().int().nonnegative(),
})
```
Add `avgThinkingTimeMs: z.number().nullable()` field, following the existing `retentionRate`/`difficultyBreakdown` nullable convention (stats.ts lines 28-29).

Add a `RecentSessionSchema` (no analog, new) and `recentSessions: z.array(RecentSessionSchema)` on `StatsSummarySchema`:
```typescript
export const RecentSessionSchema = z.object({
  id: z.string(),
  startedAt: z.string(),
  durationSeconds: z.number().int().nonnegative(),
  cardsReviewed: z.number().int().nonnegative(),
  completed: z.boolean(),
  deckTitles: z.array(z.string()),
})
```

`RateCardSchema` (study.ts lines 13-16) gains `thinkingTimeMs: z.number().int().nonnegative().optional()` (optional — not every rating event necessarily has a captured value, e.g. re-flips per D-04).

---

### `apps/frontend/src/components/StatsSummaryPanel.tsx` (modify)

**Analog:** itself — existing `perDeck` `Table` block (lines 122-180)

**Column-append pattern** (lines 134-142 for `TableHead`, lines 161-173 for `TableCell`) — append one more `TableHead`/`TableCell` pair after "In Learning" exactly as shown in UI-SPEC Interaction Contract §2; follow the existing `hidden sm:table-cell text-right` class convention used at lines 137-142/168-173.

**Section-append pattern for "Recent Sessions"** — copy the `<div className="mt-6">` + `<p className="text-sm font-semibold text-foreground mb-2">` + `role="region"` wrapper structure verbatim from the "Per-Deck Progress" section (lines 123-127), and the empty-state `TableRow`/`colSpan` idiom (lines 146-154) for `noSessionsYet`.

**Optional-chaining defaults pattern** (line 38):
```tsx
const perDeck = summary?.perDeck ?? []
```
Add `const recentSessions = summary?.recentSessions ?? []` following the identical convention.

---

## Shared Patterns

### Null-on-empty stats convention
**Source:** `apps/backend/src/routes/stats.ts` lines 45-46, 55-64
**Apply to:** `avgThinkingTimeMs` (per-deck, per-row null) in `stats.ts` and `StatsSummaryPanel.tsx`'s rendering of that field — never render `0.0s`, always fall back to `t('dashboard.stats.noData')`.

### Deck ownership/share authorization guard
**Source:** `apps/backend/src/routes/study.ts` lines 174-180 (also `GET /due` lines 22-39)
**Apply to:** new session-start/session-complete routes — must verify the requesting user owns or has an active share on every deck referenced by a `StudySessionDeck` row before creating it.

### Prisma `$transaction` write pattern
**Source:** `apps/backend/src/routes/study.ts` lines 213-243
**Apply to:** `POST /rate` (extended with `thinkingTimeMs`) and the new session-complete endpoint if it needs to atomically update `StudySession` + touch `ReviewLog`/`CardProgress` in the same request.

### Hand-written migration style
**Source:** `apps/backend/prisma/migrations/20260609000000_add_reviewlog_and_card_kartexid/migration.sql`
**Apply to:** the new migration adding `ReviewLog.thinkingTimeMs`, `StudySession`, `StudySessionDeck` — same header-comment, `ALTER TABLE`/`CREATE TABLE`/`CREATE INDEX`/`ADD CONSTRAINT` ordering and cascade-delete rationale comments.

### `role="timer"` / `aria-live="off"` a11y contract
**Source:** `apps/frontend/src/components/ExamTimer.tsx` lines 49-58
**Apply to:** `SessionTimer.tsx` — identical attributes, only the color-shift ternary (lines 42-47) is dropped per UI-SPEC.

### Optional-chaining defaults for summary fields
**Source:** `apps/frontend/src/components/StatsSummaryPanel.tsx` lines 34-38
**Apply to:** any new field read off the `summary` prop (`recentSessions`, per-deck `avgThinkingTimeMs`) — never assume presence without `summary?.field ?? default`.

## No Analog Found

None — every file in scope has at least a role-match analog in the existing codebase (see table above). The only genuinely new logic without a structural precedent is the Page Visibility API pause/resume stopwatch behavior (D-05) inside `SessionTimer.tsx`; it composes standard `document.visibilitychange` listener logic with the existing `ExamTimer` interval-tick primitive rather than copying from an existing component.

## Metadata

**Analog search scope:** `apps/frontend/src/components/`, `apps/frontend/src/pages/`, `apps/backend/src/routes/`, `apps/backend/prisma/`, `packages/shared/src/schemas/`
**Files scanned:** `ExamTimer.tsx`, `StudySessionPage.tsx`, `SessionProgress.tsx` (referenced only), `StatsSummaryPanel.tsx`, `stats.ts`, `study.ts`, `schema.prisma` (ReviewLog/CardProgress/DeckShare/Card models), migration `20260609000000_add_reviewlog_and_card_kartexid`, `packages/shared/src/schemas/stats.ts`, `packages/shared/src/schemas/study.ts`
**Pattern extraction date:** 2026-07-04
