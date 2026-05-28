# Phase 4: Study Loops - Research

**Researched:** 2026-05-28
**Domain:** SM-2 spaced repetition algorithm, study session state machines, dashboard statistics, React animation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Flip triggered by clicking/tapping anywhere on the card body; Space bar also triggers flip on desktop. No separate "Show Answer" button.
- **D-02:** CSS 3D Y-axis rotation animation (~300ms) to reveal the back face.
- **D-03:** Four labeled buttons with inline keyboard shortcut hints: "Again (1)", "Hard (2)", "Good (3)", "Easy (4)". Keyboard shortcuts 1–4 work in parallel.
- **D-04:** Rating buttons color-coded: Again=red, Hard=orange, Good=green, Easy=blue.
- **D-05:** Exam mode timer is per-session (one countdown for the whole exam, not per-card). When timer reaches zero, session ends — user can still rate the current card before it closes.
- **D-06:** Time limit is user-configurable at session start via a pre-session picker (5 / 10 / 15 / 30 / 60 min). No hardcoded default — user must pick before starting.
- **D-07:** Dashboard hero: prominent "X cards due today" heading + large "Start Studying" CTA. Per-deck due counts listed below (deck name + count per row).
- **D-08:** Stats section shows exactly two chips: "Reviewed today: N" and "Streak: N days".

### Claude's Discretion

- Session completion screen design (summary counts, encouraging message, "Return to Dashboard" button).
- Session exit / navigation-away handling — whether in-progress SM-2 ratings are saved or discarded on early exit.
- Exact card face dimensions, shadow, border radius in the study session view.
- Empty state when dashboard has no due cards ("All caught up!" illustration/message).
- `/decks/:id/learn` route's mode selection UI (how the user picks Spaced Repetition vs Deck Mode vs Exam Mode before starting).

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STDY-01 | User can start a spaced repetition session showing all cards due today across all decks (SM-2) | GET /api/study/due — Prisma query with `nextReview <= endOfToday`, join through Card→Deck |
| STDY-02 | During a study session, each card flip is followed by a 4-key recall rating (1=Again, 2=Hard, 3=Good, 4=Easy) | React state machine (front/back/rated), keyboard listener, rating buttons shown only after flip |
| STDY-03 | SM-2 algorithm updates ease factor, interval, and next review date for each rating | Pure function `calculateSM2`, Prisma upsert on CardProgress with `@@unique([userId, cardId])` |
| STDY-04 | User can start a deck mode session (all cards in one deck, sequentially; SM-2 progress saved) | GET /api/study/deck/:deckId — returns all cards; SM-2 updates still persist |
| STDY-05 | User can start an exam mode session (time limit; SM-2 progress not saved) | Same card-flip UI, timer via useRef+setInterval, POST /api/study/rate skipped for exam mode |
| STDY-06 | Dashboard shows all cards due today across all decks with a count per deck | GET /api/dashboard/stats — aggregate query grouping CardProgress by deck |
| STDY-07 | Dashboard shows study statistics: total cards reviewed today, current study streak | Same stats endpoint — count `lastReviewed >= startOfToday` + consecutive-day streak calculation |
</phase_requirements>

---

## Summary

Phase 4 delivers the full study loop that is Kartex's core value proposition: a user opens the dashboard, sees due cards, runs a session, and their SM-2 progress is persisted. The implementation spans three backend endpoints (due cards, rate a card, dashboard stats) and two frontend pages (StudySessionPage, DashboardPage).

The SM-2 algorithm is a pure mathematical function that takes `(quality: 0|3|4|5, repetitions, easeFactor, interval)` and returns updated values. It is best implemented as a tested pure function in `apps/backend/src/lib/sm2.ts` (or `packages/shared/src/lib/sm2.ts` — see Open Questions). The Prisma `upsert` pattern using the `@@unique([userId, cardId])` compound index handles first-time card reviews and repeat reviews uniformly. The study session UI is a simple state machine (FRONT → BACK → RATED → next card or DONE) driven by a single `useState`. Exam mode reuses the identical UI; the only difference is that the POST /api/study/rate call is skipped and a countdown timer runs via `useRef` + `setInterval`.

The streak calculation is the most subtle piece: it requires querying distinct calendar days on which the user reviewed at least one card, then walking backwards from today to count consecutive days. A single Prisma `groupBy` query on `CardProgress.lastReviewed` truncated to date achieves this without a raw SQL query.

**Primary recommendation:** Implement SM-2 as a pure function first with full unit tests, then wire backend endpoints, then build session UI, then build dashboard — in that dependency order (matching the planned 04-01 / 04-02 / 04-03 split).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| SM-2 algorithm calculation | API / Backend | — | Pure function with side effects (DB write); must not run in browser to prevent cheating |
| CardProgress persistence (upsert) | API / Backend | Database / Storage | Prisma upsert against PostgreSQL; @@unique index enforces one record per (user, card) |
| "Due cards today" query | API / Backend | — | Date-range query on CardProgress.nextReview; needs DB index for performance |
| Dashboard stats aggregation | API / Backend | — | Group-by + streak walk requires DB aggregation; too expensive for client |
| Study session state machine | Browser / Client | — | FRONT/BACK/RATED transitions are pure UI state; no server round-trip needed mid-flip |
| Card flip CSS animation | Browser / Client | — | CSS transform-style + backface-visibility; zero server involvement |
| Exam mode countdown timer | Browser / Client | — | setInterval in React via useRef; progress NOT sent to server |
| Rating button UI + keyboard shortcuts | Browser / Client | — | Event listeners on window; purely presentational |
| Mode selector screen | Browser / Client | — | Pre-session form; deck lookup may need a GET /api/decks/:id call |

---

## Standard Stack

### Core (already installed — no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma Client | ^5.22.0 [VERIFIED: apps/backend/package.json] | CardProgress upsert, due-card queries, stats aggregation | Already the project ORM |
| Hono | ^4.7.9 [VERIFIED: apps/backend/package.json] | New `/api/study` and `/api/dashboard` routers | Established backend framework |
| Zod (`@kartex/shared`) | workspace:* [VERIFIED: packages/shared/src/index.ts] | RateCardSchema, DueCardSchema, DashboardStatsSchema | Single source of truth for all schemas |
| React 18 + hooks | ^18.3.1 [VERIFIED: apps/frontend/package.json] | useState for session state, useRef for timer, useEffect for keyboard listener | Already the frontend framework |
| Tailwind CSS | ^3.4.17 [VERIFIED: apps/frontend/package.json] | Card flip CSS + rating button colors | Already the styling system |
| sonner | ^2.0.7 [VERIFIED: apps/frontend/package.json] | Toast on session complete | Already installed for notifications |
| lucide-react | ^1.16.0 [VERIFIED: apps/frontend/package.json] | Timer icon, trophy/streak icon | Already the icon library |

### No New Packages Required

All functionality can be built with existing dependencies. The CSS 3D flip animation is pure CSS (no animation library needed). The SM-2 algorithm is a pure function (no external library needed). The countdown timer uses browser-native `setInterval`.

**Installation:** No new `npm install` / `yarn add` commands needed for this phase.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser                          Hono Backend                    PostgreSQL
──────────────────────────────   ──────────────────────────────  ──────────────
DashboardPage
  → GET /api/dashboard/stats  →  dashboardRouter.get('/stats')
                                   prisma.cardProgress.groupBy()  → CardProgress
                                   streak walk (consecutive days)  + Card + Deck
                              ←  { dueCount, byDeck[], reviewedToday, streak }
  renders hero + deck table
  + stats chips

StudySessionPage
  (mode: 'sr'|'deck'|'exam')

  [SR mode]
  → GET /api/study/due        →  studyRouter.get('/due')
                                   prisma.cardProgress.findMany()  → cards with
                                   WHERE nextReview <= endOfToday    nextReview ≤ now
                              ←  Card[] (with progress or defaults)

  [Deck mode]
  → GET /api/study/deck/:id   →  studyRouter.get('/deck/:deckId')
                                   prisma.card.findMany({ deckId }) → all cards
                              ←  Card[]

  [Session loop — per card]
  state: FRONT → BACK → RATED
  user rates (1–4)

  [SR/Deck only — not Exam]
  → POST /api/study/rate      →  studyRouter.post('/rate')
                                   calculateSM2(quality, prev)
                                   prisma.cardProgress.upsert()    → CardProgress
                              ←  { nextReview, interval, easeFactor }

  advance to next card or DONE screen
```

### Recommended Project Structure (new files only)

```
packages/shared/src/schemas/
└── study.ts                 ← RateCardSchema, DueCardResponseSchema,
                               DashboardStatsSchema, StudyModeSchema

apps/backend/src/lib/
└── sm2.ts                   ← calculateSM2() pure function

apps/backend/src/routes/
├── study.ts                 ← GET /due, GET /deck/:id, POST /rate
└── dashboard.ts             ← GET /stats

apps/frontend/src/pages/
├── DashboardPage.tsx        ← hero widget + deck table + stat chips
└── StudySessionPage.tsx     ← mode selector → session loop → completion

apps/frontend/src/hooks/
└── useStudySession.ts       ← encapsulates session state machine + API calls

apps/frontend/src/components/
└── CardFlip.tsx             ← CSS 3D flip card component (reuses KartexRenderer)
```

### Pattern 1: SM-2 Pure Function

**What:** A pure TypeScript function that takes current progress and a quality score and returns the next progress values.

**When to use:** Called inside `POST /api/study/rate` handler after validating input. Never runs in the browser.

```typescript
// Source: [VERIFIED from design.md §9 + https://github.com/cnnrhill/sm-2]
// Rating key mapping (from design.md §9):
//   Button "Again (1)" → quality 0
//   Button "Hard (2)"  → quality 3
//   Button "Good (3)"  → quality 4
//   Button "Easy (4)"  → quality 5

export type SM2Quality = 0 | 3 | 4 | 5

export interface SM2Input {
  quality: SM2Quality
  repetitions: number   // CardProgress.repetitions
  easeFactor: number    // CardProgress.easeFactor  (default 2.5)
  interval: number      // CardProgress.interval    (default 1)
}

export interface SM2Output {
  repetitions: number
  easeFactor: number
  interval: number
  nextReview: Date      // today + interval days
}

export function calculateSM2(input: SM2Input): SM2Output {
  const { quality, repetitions, easeFactor, interval } = input

  // Step 1: adjust ease factor
  //   newEF = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const newEF = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  )

  // Step 2: compute interval and repetitions
  let newInterval: number
  let newRepetitions: number

  if (quality < 3) {
    // "Again" — reset to day 1, repetitions reset to 0
    newInterval = 1
    newRepetitions = 0
  } else {
    // Correct recall — advance interval
    if (repetitions === 0) {
      newInterval = 1
    } else if (repetitions === 1) {
      newInterval = 6
    } else {
      newInterval = Math.ceil(interval * easeFactor)
    }
    newRepetitions = repetitions + 1
  }

  // Step 3: compute nextReview date
  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + newInterval)
  nextReview.setHours(0, 0, 0, 0)  // normalize to start of day

  return { repetitions: newRepetitions, easeFactor: newEF, interval: newInterval, nextReview }
}
```

**Critical edge cases:**
- easeFactor must be floored at 1.3 (prevents interval from shrinking to near-zero)
- quality=0 ("Again") resets BOTH interval (→1) AND repetitions (→0); easeFactor is still adjusted (gets lower)
- First review (repetitions=0): interval stays at 1 regardless of quality ≥ 3
- Interval for second review (repetitions=1): fixed at 6 days regardless of EF
- `Math.ceil()` on interval multiplication prevents drift to 0

### Pattern 2: Prisma CardProgress Upsert

**What:** Single `prisma.cardProgress.upsert()` call that creates a new progress record on first review or updates an existing one.

**When to use:** Inside `POST /api/study/rate` after calling `calculateSM2`.

```typescript
// Source: [VERIFIED from apps/backend/prisma/schema.prisma — @@unique([userId, cardId])]
const result = await prisma.cardProgress.upsert({
  where: {
    userId_cardId: { userId, cardId }  // compound unique index name
  },
  update: {
    easeFactor: sm2.easeFactor,
    interval: sm2.interval,
    repetitions: sm2.repetitions,
    nextReview: sm2.nextReview,
    lastReviewed: new Date(),
  },
  create: {
    userId,
    cardId,
    easeFactor: sm2.easeFactor,
    interval: sm2.interval,
    repetitions: sm2.repetitions,
    nextReview: sm2.nextReview,
    lastReviewed: new Date(),
  },
})
```

**Critical detail:** Prisma generates the compound unique name as `userId_cardId` from `@@unique([userId, cardId])`. This is the exact string to pass to `where:`. [VERIFIED: schema.prisma line 119]

### Pattern 3: Due Cards Query

**What:** Query that returns cards where `nextReview` is on or before the end of today, belonging to the authenticated user.

```typescript
// Source: [VERIFIED from schema.prisma — CardProgress → Card → Deck relationship]
const endOfToday = new Date()
endOfToday.setHours(23, 59, 59, 999)

const progressRows = await prisma.cardProgress.findMany({
  where: {
    userId,
    nextReview: { lte: endOfToday },
    card: { deck: { ownerId: userId } }  // ownership check
  },
  include: {
    card: {
      include: { deck: { select: { id: true, title: true } } }
    }
  },
  orderBy: { nextReview: 'asc' }
})
```

**For deck mode** (all cards, no due-date filter):
```typescript
// Cards with no progress yet must also appear — use LEFT JOIN semantics via
// findMany on Card with optional CardProgress include
const cards = await prisma.card.findMany({
  where: { deckId },
  include: {
    progress: {
      where: { userId },
      take: 1
    }
  },
  orderBy: { createdAt: 'asc' }
})
```

### Pattern 4: Dashboard Stats Query

**What:** Single efficient query for "reviewed today" count and "per-deck due counts".

```typescript
// Source: [ASSUMED — standard Prisma aggregate pattern]
const startOfToday = new Date()
startOfToday.setHours(0, 0, 0, 0)
const endOfToday = new Date()
endOfToday.setHours(23, 59, 59, 999)

// Count reviewed today
const reviewedToday = await prisma.cardProgress.count({
  where: {
    userId,
    lastReviewed: { gte: startOfToday }
  }
})

// Due cards grouped by deck
const dueProgress = await prisma.cardProgress.findMany({
  where: {
    userId,
    nextReview: { lte: endOfToday },
    card: { deck: { ownerId: userId } }
  },
  select: {
    card: { select: { deck: { select: { id: true, title: true } } } }
  }
})
// Group by deckId in application code (simple reduce)
```

### Pattern 5: Streak Calculation

**What:** Count consecutive calendar days (ending today or yesterday) on which the user reviewed at least one card.

**Algorithm:**
1. Fetch all distinct `lastReviewed` dates for the user (truncated to date).
2. Build a Set of date strings (`YYYY-MM-DD`).
3. Walk backwards from today: count consecutive days present in the Set.
4. If today is not in the Set, check yesterday — if also absent, streak is 0.

```typescript
// Source: [ASSUMED — standard streak pattern]
const reviewDates = await prisma.cardProgress.findMany({
  where: { userId, lastReviewed: { not: null } },
  select: { lastReviewed: true },
  distinct: ['lastReviewed'],  // Prisma distinct — approximation; use groupBy for precision
})

// More reliable: groupBy day
const grouped = await prisma.$queryRaw<{ day: string }[]>`
  SELECT DISTINCT DATE("lastReviewed") as day
  FROM "CardProgress"
  WHERE "userId" = ${userId} AND "lastReviewed" IS NOT NULL
  ORDER BY day DESC
`
// Walk from today backwards counting consecutive days
```

**Alternative without raw SQL:** Use Prisma `findMany` ordered by `lastReviewed` desc, deduplicate to dates in application code — acceptable for small datasets (2-5 users, <10k reviews each).

### Pattern 6: React Study Session State Machine

**What:** A simple enum-based state machine for the card flip interaction.

**States:**
```
FRONT  ─(click/space)→  BACK  ─(rate 1-4)→  RATED  ─(auto advance ~300ms)→  FRONT (next card)
                                                                              or
                                                                             DONE  (no more cards)
```

```typescript
// Source: [ASSUMED — standard React pattern]
type CardFace = 'front' | 'back'

// In StudySessionPage or useStudySession hook:
const [currentIndex, setCurrentIndex] = useState(0)
const [face, setFace] = useState<CardFace>('front')
const [isFlipping, setIsFlipping] = useState(false)  // drives CSS animation class

const flip = useCallback(() => {
  if (face !== 'front' || isFlipping) return
  setIsFlipping(true)
  // CSS animation is ~300ms; switch content at midpoint (~150ms)
  setTimeout(() => setFace('back'), 150)
  setTimeout(() => setIsFlipping(false), 300)
}, [face, isFlipping])

// Keyboard handler (attach to window in useEffect, clean up on unmount)
useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
    if (e.code === 'Space' && face === 'front') { e.preventDefault(); flip() }
    if (face === 'back') {
      if (e.key === '1') rate(0)   // Again
      if (e.key === '2') rate(3)   // Hard
      if (e.key === '3') rate(4)   // Good
      if (e.key === '4') rate(5)   // Easy
    }
  }
  window.addEventListener('keydown', handleKey)
  return () => window.removeEventListener('keydown', handleKey)
}, [face, flip, rate])
```

### Pattern 7: CSS 3D Card Flip

**What:** Classic flashcard Y-axis 3D flip using CSS perspective + transform-style.

```css
/* Source: [ASSUMED — standard CSS 3D flip pattern] */
.card-scene {
  perspective: 1000px;
}

.card-body {
  position: relative;
  transform-style: preserve-3d;
  transition: transform 300ms ease;
  cursor: pointer;
}

.card-body.is-flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;  /* Safari */
}

.card-face--back {
  transform: rotateY(180deg);
}
```

**In Tailwind + inline style approach (to avoid custom CSS file):**
```tsx
// Source: [ASSUMED — standard Tailwind CSS 3D pattern]
<div style={{ perspective: '1000px' }}>
  <div
    className={cn(
      'relative transition-transform duration-300',
      '[transform-style:preserve-3d]',
      isFlipped && '[transform:rotateY(180deg)]'
    )}
    style={{ transformStyle: 'preserve-3d' }}  // fallback for some Tailwind JIT configs
  >
    {/* Front face */}
    <div className="[backface-visibility:hidden]">
      <KartexRenderer content={card.frontContent} />
    </div>
    {/* Back face */}
    <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
      <KartexRenderer content={card.backContent} />
      {/* Rating buttons shown only after flip */}
    </div>
  </div>
</div>
```

### Pattern 8: Exam Mode Countdown Timer

**What:** Per-session countdown that does not trigger re-renders on every tick; updates displayed seconds via `useRef` + DOM manipulation or batched state updates.

```typescript
// Source: [ASSUMED — standard React timer pattern]
const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60)
const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
const isExpiredRef = useRef(false)

useEffect(() => {
  timerRef.current = setInterval(() => {
    setSecondsLeft(prev => {
      if (prev <= 1) {
        // Time's up — clear interval, allow current card rating
        clearInterval(timerRef.current!)
        isExpiredRef.current = true
        return 0
      }
      return prev - 1
    })
  }, 1000)
  return () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }
}, [durationMinutes])

// Format display: MM:SS
const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
```

**D-05 compliance:** When `isExpiredRef.current === true`, show an "out of time" banner but allow the user to rate the current card before the session closes. After rating that final card (or if they click "End session"), navigate back to dashboard.

### Pattern 9: Hono Route Registration

**What:** New study and dashboard routers registered in `apps/backend/src/index.ts` after the `authMiddleware` line, exactly matching the existing pattern.

```typescript
// Source: [VERIFIED: apps/backend/src/index.ts]
// Add after line 41 (existing decksRouter registration):
import { studyRouter } from './routes/study.js'
import { dashboardRouter } from './routes/dashboard.js'

app.route('/api/study', studyRouter)
app.route('/api/dashboard', dashboardRouter)
```

Both routers use `new Hono<{ Variables: { userId: string } }>()` and access `c.get('userId')` exactly as `cards.ts` and `decks.ts` do.

### Pattern 10: Zod Schemas for Study API

**What:** New schemas in `packages/shared/src/schemas/study.ts`.

```typescript
// Source: [ASSUMED — derived from design.md §9 and existing schema patterns]
import { z } from 'zod'

// Quality values as defined in design.md §9
// 1=Again→0, 2=Hard→3, 3=Good→4, 4=Easy→5
export const RatingSchema = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4)
])
export type Rating = z.infer<typeof RatingSchema>

// Rating request body
export const RateCardSchema = z.object({
  cardId: z.string().min(1),
  rating: RatingSchema,  // 1|2|3|4 (UI buttons) — backend maps to SM-2 quality
})
export type RateCardInput = z.infer<typeof RateCardSchema>

// Response from POST /api/study/rate
export const RateCardResponseSchema = z.object({
  cardId: z.string(),
  nextReview: z.string(),  // ISO date string
  interval: z.number(),
  easeFactor: z.number(),
  repetitions: z.number(),
})

// Card with optional progress (for due-card queries)
export const DueCardSchema = z.object({
  id: z.string(),
  deckId: z.string(),
  deckTitle: z.string(),
  frontContent: z.string(),
  backContent: z.string(),
  tags: z.array(z.string()),
  // Current SM-2 state (defaults if no progress record exists)
  easeFactor: z.number().default(2.5),
  interval: z.number().default(1),
  repetitions: z.number().default(0),
  nextReview: z.string().optional(),
})
export type DueCard = z.infer<typeof DueCardSchema>

// Dashboard stats response
export const DashboardStatsSchema = z.object({
  totalDue: z.number(),
  reviewedToday: z.number(),
  streak: z.number(),
  byDeck: z.array(z.object({
    deckId: z.string(),
    deckTitle: z.string(),
    dueCount: z.number(),
  })),
})
export type DashboardStats = z.infer<typeof DashboardStatsSchema>
```

### Pattern 11: Backend Route Pattern (study.ts)

**What:** Following `cards.ts`/`decks.ts` exactly — `new Hono`, Zod validation, `c.get('userId')`, `c.json()`.

```typescript
// Source: [VERIFIED: apps/backend/src/routes/cards.ts — established pattern]
import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { RateCardSchema } from '@kartex/shared'
import { calculateSM2, RATING_TO_QUALITY } from '../lib/sm2.js'

const study = new Hono<{ Variables: { userId: string } }>()

// Rating-to-quality map (UI button 1-4 → SM-2 quality 0/3/4/5)
export const RATING_TO_QUALITY = { 1: 0, 2: 3, 3: 4, 4: 5 } as const

// GET /api/study/due — cards due today for the authenticated user (STDY-01)
study.get('/due', async (c) => {
  const userId = c.get('userId')
  // ... query per Pattern 3
  return c.json(cards, 200)
})

// GET /api/study/deck/:deckId — all cards in a deck (STDY-04)
study.get('/deck/:deckId', async (c) => { /* ... */ })

// POST /api/study/rate — submit a rating for one card (STDY-02, STDY-03)
study.post('/rate', async (c) => {
  const body = RateCardSchema.safeParse(await c.req.json())
  if (!body.success) return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
  const { cardId, rating } = body.data
  const userId = c.get('userId')
  // fetch current progress or use defaults
  // call calculateSM2(...)
  // upsert CardProgress per Pattern 2
  return c.json(updated, 200)
})

export { study as studyRouter }
```

### Anti-Patterns to Avoid

- **SM-2 in the browser:** Never compute SM-2 in React. If the API call fails silently, progress is lost. Always persist via POST /api/study/rate.
- **Hardcoded timer default:** D-06 requires the user to pick the exam duration — do not initialize the timer with a default value and start immediately.
- **Rating buttons visible on front face:** D-03 specifies buttons appear only after flip. Reveal them with the back face (conditionally render based on `face === 'back'`).
- **Missing `-webkit-backface-visibility`:** Omitting the vendor prefix causes the flip to show both faces simultaneously on Safari/older WebKit. Always include both.
- **`transform-style: preserve-3d` on a Tailwind flex container:** Tailwind's `flex` sets `display: flex` which can interfere with `transform-style`. Apply `preserve-3d` on the inner card wrapper, not the outer container.
- **Streak counting from `lastReviewed` with time component:** Cards reviewed at different times of day will have different `lastReviewed` timestamps. Truncate to date before comparing — use `DATE(lastReviewed)` in SQL or `.toDateString()` in JS.
- **Forgetting to cancel setInterval on unmount:** React strict mode mounts/unmounts components twice in development. Always return a cleanup function from `useEffect` that calls `clearInterval`.
- **Querying all CardProgress for a user without filtering by deck ownership:** A malicious user could theoretically rate cards they don't own. Always validate that the card's deck is owned by the authenticated user in POST /api/study/rate.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SM-2 interval scheduling | Custom scheduling logic | The canonical SM-2 formulas from design.md §9 as a pure function | The formulas are well-defined; the edge cases (EF floor, repetitions reset) are easy to miss |
| Date normalization for "due today" | Custom date string manipulation | `new Date(); setHours(23,59,59,999)` (JS Date) | Time zone drift, DST edge cases — use simple JS Date boundary construction |
| Progress record creation/update | Two separate create/update operations | Prisma `upsert` with `@@unique` compound key | Avoids race condition on concurrent ratings; single operation |
| Streak counting | Complex recursive SQL | Application-code Set lookup after simple `findMany` (small dataset) | 2-5 users, <10k records — no need for database-side streak computation |
| CSS 3D animation | Animation library (Framer Motion, etc.) | Plain CSS `transform` + `transition` | Zero dependency; 300ms flip is trivially achievable in CSS alone |
| Countdown timer | Date-based countdown library | `setInterval` + `useState` | Native browser API; trivial implementation; no library needed |

**Key insight:** This phase has no unsolved problems that require new libraries. All complexity is algorithmic (SM-2) or state-management (session state machine), both solvable with existing tools.

---

## Common Pitfalls

### Pitfall 1: SM-2 "Again" Resets Repetitions, Not Just Interval

**What goes wrong:** Developer resets `interval` to 1 on a quality < 3 rating but forgets to also reset `repetitions` to 0. On the next successful review, the algorithm uses the stale `repetitions` value and skips the warmup phase (1 day → 6 days → EF*prev_interval), jumping to a too-large interval.

**Why it happens:** The `interval` field is the visible output; `repetitions` tracks which interval formula to apply next, which is less obvious.

**How to avoid:** In `calculateSM2`, when `quality < 3`: set both `newInterval = 1` AND `newRepetitions = 0`. Unit tests must cover this case explicitly.

**Warning signs:** After rating a card "Again" twice then "Good", the interval jumps to something like 15 days instead of 1 day.

### Pitfall 2: CSS backface-visibility Requires vendor prefix in WebKit

**What goes wrong:** The back face of the card is visible through the front face on Safari/iOS Chrome, making both faces simultaneously visible during the flip.

**Why it happens:** Older WebKit requires `-webkit-backface-visibility: hidden` in addition to the standard property.

**How to avoid:** Always apply both: `backface-visibility: hidden; -webkit-backface-visibility: hidden` to both `.card-face--front` and `.card-face--back` elements.

**Warning signs:** Flip works in Chrome/Firefox but shows card back through front on iOS.

### Pitfall 3: transform-style: preserve-3d Inheritance

**What goes wrong:** A parent element with `overflow: hidden` or `will-change: transform` flattens the 3D context, causing the flip to appear as a 2D fade instead of a 3D rotation.

**Why it happens:** `overflow: hidden` implicitly creates a new stacking context that breaks `preserve-3d` propagation.

**How to avoid:** Do not apply `overflow: hidden` to any ancestor of the card-flip element. Use `overflow: visible` on the card scene wrapper, and handle overflow with a wrapping container outside the 3D context.

**Warning signs:** Flip appears as a 2D horizontal scale/shrink instead of a 3D rotation.

### Pitfall 4: setInterval Firing After Component Unmount

**What goes wrong:** The exam timer's `setInterval` callback fires after the component unmounts (e.g., user navigates away), causing a `setState` call on an unmounted component — React warns in development and can cause stale state bugs.

**Why it happens:** `useEffect` cleanup is only called if a cleanup function is returned. Forgetting to return `() => clearInterval(timerRef.current)` leaves the interval running.

**How to avoid:** Always return a cleanup function from the `useEffect` that starts the timer. Also clear the ref in the cleanup.

### Pitfall 5: Prisma @@unique Compound Index Name

**What goes wrong:** Developer uses `where: { userId, cardId }` in the upsert instead of `where: { userId_cardId: { userId, cardId } }`, getting a Prisma validation error at runtime.

**Why it happens:** Prisma's compound unique index generates a specific accessor name (`{field1}_{field2}`) that must be used as the `where` key in `upsert`/`findUnique`.

**How to avoid:** The name is `userId_cardId` (exactly as generated from `@@unique([userId, cardId])`). Use `where: { userId_cardId: { userId, cardId } }`.

**Warning signs:** `Unknown argument "userId"` or `Unknown argument "cardId"` in Prisma error when calling `upsert`.

### Pitfall 6: "Due Today" Query Including Cards Without Progress Records

**What goes wrong:** `GET /api/study/due` only queries `CardProgress` records — it misses cards the user has never reviewed (which have no `CardProgress` row and are therefore always "due").

**Why it happens:** The natural Prisma query starts from `CardProgress` and returns cards with `nextReview <= today`. Cards with no progress record are absent.

**How to avoid:** Two options:
1. Spaced Repetition mode (`GET /due`) only shows cards the user has previously seen that are due. New cards need to be explicitly introduced. This is standard SM-2 behavior — acceptable if the product accepts it.
2. Alternatively, include new cards (those with no `CardProgress` row) in the due list by querying `Card` records without a progress row and appending them.

**Decision for this phase:** STDY-01 says "all cards due today across all decks (SM-2)". SM-2 technically only applies to previously seen cards. New cards are "due" by default since their `nextReview = now()` (the schema default). This means a user's brand-new cards are always included if `nextReview <= endOfToday` — which is correct since the schema default is `@default(now())`. [VERIFIED: schema.prisma line 115]

However: new cards have **no `CardProgress` row at all** until their first rating. The `GET /due` endpoint must handle the case where a card has no progress row — in that case, use SM-2 defaults (easeFactor=2.5, interval=1, repetitions=0) and treat `nextReview` as "now" (i.e., always due).

**Recommended approach:** Query `Card` left-joined to `CardProgress` to include both never-seen cards and due cards.

### Pitfall 7: Streak Counting Off-By-One (Today vs Yesterday)

**What goes wrong:** Streak is calculated as 0 even though the user studied yesterday but not yet today.

**Why it happens:** Strict "streak must include today" logic incorrectly breaks the streak if the user hasn't studied yet today.

**How to avoid:** The streak walk should start from "today OR yesterday" — if today has reviews, include it; if only yesterday does, still count it. The streak breaks only when there is a day gap.

**Logic:**
```
if today has reviews → start walk from today
else if yesterday has reviews → start walk from yesterday
else → streak = 0
```

### Pitfall 8: Rating Buttons Accessible Before Flip (keyboard shortcut leaks)

**What goes wrong:** The keyboard handler for keys 1–4 fires even when the card is showing its front face, causing an accidental rating before the user has seen the answer.

**Why it happens:** The `keydown` event listener is added to `window` and doesn't check the current face state before dispatching a rating.

**How to avoid:** Guard the rating key handlers: only dispatch `rate()` when `face === 'back'`. The guard must read from the current React state, which requires either including `face` in the dependency array of the `useEffect` (so the listener is re-registered on each flip) or using `useRef` to track the current face.

---

## Code Examples

### SM-2 Quality Mapping (design.md §9 canonical table)

```typescript
// Source: [VERIFIED: docs/design.md §9]
// UI Button → SM-2 quality score mapping
const RATING_TO_QUALITY: Record<1 | 2 | 3 | 4, 0 | 3 | 4 | 5> = {
  1: 0,  // Again  — did not know
  2: 3,  // Hard   — recalled with effort
  3: 4,  // Good   — recalled confidently
  4: 5,  // Easy   — recalled instantly
}
```

### Route Registration (exact pattern from index.ts)

```typescript
// Source: [VERIFIED: apps/backend/src/index.ts lines 41-48]
// Insert after line 41 (app.route('/api/decks', decksRouter))
app.route('/api/study', studyRouter)
app.route('/api/dashboard', dashboardRouter)
```

### Dashboard Page Hero (D-07 spec)

```tsx
// Source: [VERIFIED: 04-CONTEXT.md D-07, D-08]
// Hero section
<div className="mb-8">
  <h1 className="text-4xl font-bold">{stats.totalDue}</h1>
  <p className="text-muted-foreground">cards due today</p>
  <Button className="w-full mt-4" size="lg" onClick={() => navigate('/decks/:id/learn')}>
    Start Studying
  </Button>
</div>

// Per-deck table
<Table>
  <TableHeader>
    <TableRow><TableHead>Deck</TableHead><TableHead>Due</TableHead></TableRow>
  </TableHeader>
  <TableBody>
    {stats.byDeck.map(d => (
      <TableRow key={d.deckId}>
        <TableCell>{d.deckTitle}</TableCell>
        <TableCell>{d.dueCount}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>

// Stats chips (D-08)
<div className="flex gap-4 mt-6">
  <div className="border rounded-lg p-4">Reviewed today: {stats.reviewedToday}</div>
  <div className="border rounded-lg p-4">Streak: {stats.streak} days</div>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SM-2 as the only SRS algorithm | FSRS (Free Spaced Repetition Scheduler) gaining adoption | ~2022 | FSRS is more accurate but complex; SM-2 is still perfectly valid for v1 |
| Custom SRS libraries | Pure function implementations | Always standard | No library needed; the algorithm is simple enough to own |
| Framer Motion for card flips | CSS `transform` + `transition` | N/A | CSS is sufficient; no library overhead |

**Deprecated/outdated:**
- SuperMemo's SM-18/SM-17 algorithms: far more complex, unnecessary for this use case. SM-2 from 1987 is the correct choice for Kartex v1.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Streak walk starts from "today or yesterday" (not strictly today) | Pitfall 7 | If product wants "today only" streak, streak would reset to 0 if user hasn't studied yet today — needs user clarification |
| A2 | New cards (no CardProgress row) are treated as always due in SR mode | Pitfall 6 | If product only wants previously-seen cards in SR queue, implementation needs a different query |
| A3 | Deck ownership check in `/api/study/rate` is sufficient authorization | Pattern 11 | If DeckShare (Phase 6) should allow shared deck study, this check would need updating |
| A4 | `DATE(lastReviewed)` grouping for streak uses UTC | Pattern 4 | If users are in non-UTC timezones, "today" boundary may be off by up to 12 hours — acceptable for v1 small-group deployment |
| A5 | Session exit discards in-progress ratings (not yet persisted to server) | Claude's Discretion | If "auto-save on exit" is desired, a `beforeunload` handler or `useBeforeUnload` is needed |

---

## Open Questions

1. **Where should `calculateSM2` live — `apps/backend/src/lib/` or `packages/shared/src/lib/`?**
   - What we know: It's a pure function with no dependencies. `packages/shared` is for schemas (Zod). The function is only called server-side.
   - What's unclear: Whether keeping it in shared would benefit future unit testing from the frontend test runner.
   - Recommendation: Put it in `apps/backend/src/lib/sm2.ts` — it is backend-only logic (server-authoritative). If tests are needed from the frontend runner, they can be duplicated or the package structure can evolve.

2. **Should "Start Studying" from the Dashboard start a global SR session or ask which deck?**
   - What we know: STDY-01 says SR mode shows "due cards across all decks". D-07 says the CTA is "Start Studying".
   - What's unclear: The route — does "Start Studying" go to `/decks/:id/learn` (requires picking a deck) or a new global `/study` route?
   - Recommendation: Add a new `/study` route (global SR mode) separate from `/decks/:id/learn` (deck-specific modes). The dashboard CTA navigates to `/study` for global SR.

3. **Should the mode selector for `/decks/:id/learn` be a page or a modal?**
   - What we know: Claude's Discretion per CONTEXT.md. Three modes (SR/Deck/Exam) need to be presented.
   - Recommendation: A full-page mode selector (not a modal) — simpler to implement, easier to add the exam time picker without modal sizing issues.

---

## Environment Availability

Step 2.6: SKIPPED — this phase introduces no new external tools or services. All dependencies (Node.js, PostgreSQL, Prisma, React, Tailwind) are already confirmed present from Phases 1-3.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 [VERIFIED: apps/frontend/package.json] |
| Config file | `apps/frontend/vitest.config.ts` [VERIFIED] |
| Quick run command | `yarn workspace @kartex/frontend test --run` |
| Full suite command | `yarn workspace @kartex/frontend test --run --coverage` |

Note: Backend has no test runner configured (no vitest in `apps/backend/package.json`). The SM-2 pure function is the only backend logic requiring tests. **Wave 0 gap:** Install Vitest in backend or test SM-2 function from the shared package test runner.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STDY-03 | SM-2 easeFactor formula — correct calculation for all 4 ratings | unit | `yarn workspace @kartex/frontend test --run src/lib/__tests__/sm2.test.ts` | ❌ Wave 0 |
| STDY-03 | SM-2 "Again" resets interval=1 AND repetitions=0 | unit | same file | ❌ Wave 0 |
| STDY-03 | SM-2 easeFactor floor at 1.3 | unit | same file | ❌ Wave 0 |
| STDY-03 | SM-2 first review → interval=1, second → interval=6 | unit | same file | ❌ Wave 0 |
| STDY-02 | Rating buttons only visible after flip (face=back) | unit (React) | `yarn workspace @kartex/frontend test --run src/components/__tests__/CardFlip.test.tsx` | ❌ Wave 0 |
| STDY-06 | Dashboard stats endpoint returns correct structure | integration | manual (no backend test runner) | ❌ Wave 0 |
| STDY-07 | Streak = 0 when no reviews | unit | SM-2 test file or separate streak.test.ts | ❌ Wave 0 |
| STDY-07 | Streak counts consecutive days correctly | unit | same | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `yarn workspace @kartex/frontend test --run`
- **Per wave merge:** `yarn workspace @kartex/frontend test --run --coverage`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/frontend/src/lib/__tests__/sm2.test.ts` — covers STDY-03 (SM-2 pure function unit tests; place here if function lives in frontend lib, or in backend lib with its own test runner)
- [ ] `apps/frontend/src/components/__tests__/CardFlip.test.tsx` — covers STDY-02 (rating button visibility gating)
- [ ] Backend test runner: no Vitest in `apps/backend/package.json` — consider adding for route integration tests, or accept manual testing for STDY-06/STDY-07 backend logic

**Note on SM-2 test location:** If `calculateSM2` lives in `apps/backend/src/lib/sm2.ts`, the existing frontend Vitest runner cannot test it directly. The cleanest solution for Phase 4 is to place the pure function in `packages/shared/src/lib/sm2.ts` and add it to the shared package's exports — the frontend test runner can then import and test it. This is a planning decision.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (existing) | JWT httpOnly cookie — already implemented via authMiddleware |
| V3 Session Management | yes (existing) | 15-min access token + 30-day refresh — already implemented |
| V4 Access Control | yes | Verify card belongs to user's own deck before accepting rating |
| V5 Input Validation | yes | RateCardSchema validates rating is 1|2|3|4; cardId is non-empty string |
| V6 Cryptography | no | No new cryptographic operations in this phase |

### Known Threat Patterns for Study API

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Rating a card from another user's deck | Tampering | In POST /api/study/rate, verify `card.deck.ownerId === userId` before upserting |
| Submitting invalid rating values (e.g., 0, 5, 99) | Tampering | RateCardSchema with `z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])` |
| Forging next-review date by manipulating client-side SM-2 | Tampering | SM-2 runs server-side only — client submits `rating` (1-4), server computes `nextReview` |
| Exam mode results being persisted (STDY-05: progress not saved) | Spoofing | Exam mode skips POST /api/study/rate entirely on the client — enforced by `mode === 'exam'` guard |

---

## Sources

### Primary (HIGH confidence)

- `docs/design.md` §9 — SM-2 specification (rating key table, study modes) — project document, fully authoritative [VERIFIED]
- `apps/backend/prisma/schema.prisma` — CardProgress model, @@unique compound index [VERIFIED]
- `apps/frontend/src/App.tsx` — existing routes (ComingSoon placeholders for /dashboard) [VERIFIED]
- `apps/backend/src/routes/cards.ts` and `decks.ts` — established route patterns [VERIFIED]
- `apps/frontend/src/lib/api.ts` — api wrapper (credentials:include, silent refresh) [VERIFIED]
- `apps/frontend/src/components/KartexRenderer.tsx` — reusable renderer for card content [VERIFIED]
- `apps/backend/src/index.ts` — router registration order [VERIFIED]
- `apps/frontend/package.json` — installed deps, Vitest 2.1.9 pinned [VERIFIED]
- `apps/backend/package.json` — no test runner in backend [VERIFIED]
- `packages/shared/src/index.ts` and `schemas/*.ts` — existing schema patterns [VERIFIED]

### Secondary (MEDIUM confidence)

- https://github.com/cnnrhill/sm-2 — SM-2 algorithm reference implementation (easeFactor formula, repetitions reset, EF floor at 1.3) [CITED]
- Web search: SM-2 algorithm formula and edge cases [CITED: dev.to/umangsinha12/how-spaced-repetition-actually-works-the-sm-2-algorithm-1ge3]

### Tertiary (LOW confidence)

- CSS 3D flip patterns, React setInterval patterns, streak calculation patterns — based on well-known standard practices [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- SM-2 algorithm: HIGH — formula verified against two independent sources + design.md spec
- Prisma upsert pattern: HIGH — schema.prisma compound unique index verified directly
- Architecture patterns: HIGH — derived directly from existing codebase patterns
- CSS flip animation: MEDIUM — standard pattern, assumed correct, no codebase-specific CSS framework quirks found
- Streak calculation: MEDIUM — algorithm logic is standard, raw SQL vs Prisma approach needs confirmation
- Test infrastructure: HIGH — vitest.config.ts verified, backend gap verified

**Research date:** 2026-05-28
**Valid until:** 2026-07-01 (dependencies are pinned; Prisma schema is stable)
