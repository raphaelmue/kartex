# Phase 15: Stats Feature — Research

**Researched:** 2026-06-10
**Domain:** Prisma aggregate queries, Hono REST endpoint, React parallel fetch, i18n, shadcn/ui display components
**Confidence:** HIGH — all findings sourced directly from the live codebase; no external library research required

---

## Summary

Phase 15 is a read-only stats surface: one new backend endpoint that runs four Prisma queries (all scoped to the authenticated user), one new shared Zod schema that is already defined (Phase 14 created `StatsSummarySchema`), one new React display component (`StatsSummaryPanel`), and a DashboardPage integration that fires both fetches in parallel.

The shared contract (`StatsSummarySchema`, `PerDeckProgressSchema`, `DifficultyBreakdownSchema`, `MASTERED_INTERVAL_DAYS`, `MASTERED_REPETITIONS`) already exists in `packages/shared/src/schemas/stats.ts` — Phase 14 authored it. The backend only needs to implement `apps/backend/src/routes/stats.ts` and register it in `apps/backend/src/index.ts`. The frontend only needs `StatsSummaryPanel.tsx` and a parallel fetch wired into `DashboardPage.tsx`.

The critical design decisions are already locked by prior research: the stats endpoint is separate from `/api/dashboard/stats` (so a stats failure never blocks the study CTA), `retentionRate` and `difficultyBreakdown` are nullable (not zero-filled) when no ReviewLog data exists, and the mastered threshold is `interval >= 21 AND repetitions >= 3`.

**Primary recommendation:** Implement `GET /api/stats/summary` as a single Hono route with four independent Prisma queries. Wire it into DashboardPage via `Promise.allSettled` so a failure silently produces a null stats state without affecting the existing dashboard flow.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Aggregate query execution | API / Backend (Hono + Prisma) | — | All four stats computations touch the database; server owns the data layer |
| Empty-state signalling | API / Backend | Frontend | Backend returns `null` for ReviewLog-derived fields when no data; frontend renders "No data yet" |
| Per-deck mastered/in-learning classification | API / Backend | — | Threshold constants (`MASTERED_INTERVAL_DAYS`, `MASTERED_REPETITIONS`) live in shared; computation in the query handler |
| Parallel fetch orchestration | Browser / Client (React) | — | `Promise.allSettled` in `DashboardPage.useEffect`; stats failure is isolated |
| Loading skeleton | Browser / Client | — | Pure Tailwind animate-pulse placeholders, no library needed |
| i18n key delivery | Browser / Client | — | i18next keys for all chip labels and empty states |
| Schema validation | Shared (`@kartex/shared`) | — | `StatsSummarySchema` already defined; used by backend for serialisation safety and by frontend for type inference |

---

## Standard Stack

### Core (all already installed — no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Hono | existing | New `/api/stats` route | Project-standard backend framework |
| Prisma | existing | `count`, `groupBy`, `findMany` aggregate queries | Project ORM |
| `@kartex/shared` | workspace | `StatsSummarySchema`, `StatsSummary` type, constants | Single source of truth for types |
| React + Vite + TypeScript | existing | `StatsSummaryPanel` component | Project frontend stack |
| shadcn/ui `Table`, `Badge` | existing (installed) | Per-deck progress table, due count badges | Already in `apps/frontend/src/components/ui/` per UI-SPEC |
| lucide-react | existing | Icon usage (none new in Phase 15 per UI-SPEC) | Already installed |
| i18next | existing | 12 new translation keys under `dashboard.stats.*` | Project i18n layer |

**No new packages to install.** The UI-SPEC Registry Safety section explicitly states all required shadcn components are already present.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate `GET /api/stats/summary` | Merged into `/api/dashboard/stats` | Merging would mean a stats DB failure blocks the study CTA — rejected by v1.3-research decision |
| Multiple focused endpoints (one per stat) | Single consolidated endpoint | Single endpoint reduces frontend round-trips and keeps parallel-fetch logic simple; all four stats are logically cohesive |
| Client-side mastered classification | Server-side classification | Server owns the threshold constants; avoids the risk of client/server drift; also consistent with how SM-2 logic is always server-side |

---

## Package Legitimacy Audit

No new packages. All dependencies are already installed. This section is not applicable for Phase 15.

---

## Architecture Patterns

### System Architecture Diagram

```
DashboardPage.useEffect
  │
  ├── api.get('/api/dashboard/stats')  ──► GET /api/dashboard/stats  ──► Prisma: CardProgress, Deck
  │                                         (existing — unchanged)
  └── api.get('/api/stats/summary')   ──► GET /api/stats/summary     ──► Prisma: CardProgress (×2)
                                           (NEW)                               ReviewLog (×2)
                                                │
                                                └──► StatsSummarySchema.parse(result)
                                                       │
                                              StatsSummary | null
                                                       │
                                        DashboardPage state: setStatsSummary(...)
                                                       │
                                             <StatsSummaryPanel summary={...} />
```

### Recommended Project Structure

No new directories. Files to create/modify:

```
apps/backend/src/routes/
├── stats.ts                    ← NEW — GET /api/stats/summary handler
└── ... (existing unchanged)

apps/backend/src/
└── index.ts                    ← MODIFY — register statsRouter under /api/stats

apps/frontend/src/components/
└── StatsSummaryPanel.tsx       ← NEW — pure display component

apps/frontend/src/pages/
└── DashboardPage.tsx           ← MODIFY — add parallel fetch + StatsSummaryPanel

apps/frontend/src/locales/
├── en.json                     ← MODIFY — 12 new dashboard.stats.* keys
└── de.json                     ← MODIFY — same 12 keys in German (atomic with en.json)
```

### Pattern 1: Hono Route with Four Prisma Queries

**What:** A single async Hono handler runs four Prisma queries (two against CardProgress, two against ReviewLog), combines results into a `StatsSummary` shape, and returns it as JSON.

**When to use:** All stats are per-user read-only aggregations with no side effects — single route is appropriate.

**Example — route skeleton (modelled exactly on `apps/backend/src/routes/dashboard.ts`):**
```typescript
// Source: apps/backend/src/routes/dashboard.ts (existing pattern)
import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { MASTERED_INTERVAL_DAYS, MASTERED_REPETITIONS } from '@kartex/shared'

const stats = new Hono<{ Variables: { userId: string } }>()

stats.get('/summary', async (c) => {
  const userId = c.get('userId')
  // ... four queries ...
  return c.json(result, 200)
})

export { stats as statsRouter }
```

**Registration in `index.ts` (modelled on existing routes):**
```typescript
// Source: apps/backend/src/index.ts lines 63-64 (existing registration pattern)
import { statsRouter } from './routes/stats.js'
// ...
app.route('/api/stats', statsRouter)
```

### Pattern 2: Prisma Aggregate Queries for Stats

**What:** Exact Prisma query shapes for each of the four stats required.

**STATS-01: Total reviewed (all-time) and this-week from CardProgress**

`totalReviewed` — count of CardProgress rows for userId (each upsert row = one card ever reviewed):
```typescript
// Source: inferred from apps/backend/src/routes/dashboard.ts reviewedToday pattern
const totalReviewed = await prisma.cardProgress.count({
  where: { userId },
})

const startOfWeek = new Date()
startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()) // Sunday
startOfWeek.setHours(0, 0, 0, 0)

const weekReviewed = await prisma.cardProgress.count({
  where: {
    userId,
    lastReviewed: { gte: startOfWeek },
  },
})
```

Note: `totalReviewed` counts unique card/user pairs in CardProgress (not individual review events). This is the correct interpretation of STATS-01 ("total cards reviewed") — it counts distinct cards that have ever been reviewed, not the total number of review events. If the intent were review events, it would use ReviewLog.count. The REQUIREMENTS.md says "total cards reviewed (all time)" which aligns with CardProgress.count (one row per card/user pair). [VERIFIED: codebase read — `CardProgress` has `@@unique([userId, cardId])` in schema.prisma]

**STATS-02: Retention rate from ReviewLog (last 30 days)**

Rating >= Good means `rating >= 3` (ratings: Again=1, Hard=2, Good=3, Easy=4 — from `RATING_TO_QUALITY` in study.ts and SM-2 constants in shared):
```typescript
// Source: apps/backend/prisma/schema.prisma ReviewLog + apps/backend/src/routes/study.ts
const thirtyDaysAgo = new Date()
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

const [totalLast30, goodLast30] = await Promise.all([
  prisma.reviewLog.count({
    where: { userId, reviewedAt: { gte: thirtyDaysAgo } },
  }),
  prisma.reviewLog.count({
    where: { userId, reviewedAt: { gte: thirtyDaysAgo }, rating: { gte: 3 } },
  }),
])

const retentionRate = totalLast30 === 0
  ? null  // Empty state — no data, not 0%
  : goodLast30 / totalLast30  // 0.0–1.0, schema: z.number().min(0).max(1).nullable()
```

The `@@index([userId, reviewedAt])` on ReviewLog (added in Phase 14 migration) ensures both queries hit the compound index. [VERIFIED: codebase read — schema.prisma line 139]

**STATS-03: Difficulty breakdown from ReviewLog (last 30 days)**

```typescript
// Source: ReviewLog.rating domain 1-4 (study.ts RatingSchema) + stats.ts DifficultyBreakdownSchema
const breakdown = await prisma.reviewLog.groupBy({
  by: ['rating'],
  where: { userId, reviewedAt: { gte: thirtyDaysAgo } },
  _count: { rating: true },
})

const difficultyBreakdown = breakdown.length === 0
  ? null  // Empty state
  : {
      again: breakdown.find(r => r.rating === 1)?._count.rating ?? 0,
      hard:  breakdown.find(r => r.rating === 2)?._count.rating ?? 0,
      good:  breakdown.find(r => r.rating === 3)?._count.rating ?? 0,
      easy:  breakdown.find(r => r.rating === 4)?._count.rating ?? 0,
    }
```

Prisma `groupBy` is the correct tool here — it returns one row per distinct `rating` value with its count. The `thirtyDaysAgo` variable is shared with the STATS-02 queries; compute it once before the parallel block. [ASSUMED — Prisma groupBy API; confirmed by pattern matching with existing code]

**STATS-04: Per-deck progress (due, mastered, in-learning) from CardProgress**

This is the most complex query. It must include ALL of the user's owned decks, even those with zero cards:

```typescript
// Source: MASTERED_INTERVAL_DAYS=21, MASTERED_REPETITIONS=3 from packages/shared/src/schemas/stats.ts
// Source: deck ownership pattern from apps/backend/src/routes/dashboard.ts
const decks = await prisma.deck.findMany({
  where: { ownerId: userId },
  select: {
    id: true,
    title: true,
    cards: {
      select: {
        progress: {
          where: { userId },
          select: {
            interval: true,
            repetitions: true,
            nextReview: true,
          },
        },
      },
    },
  },
})

const now = new Date()
const endOfToday = new Date()
endOfToday.setHours(23, 59, 59, 999)

const perDeck = decks.map(deck => {
  let dueCount = 0
  let masteredCount = 0
  let inLearningCount = 0

  for (const card of deck.cards) {
    const progress = card.progress[0]
    if (!progress) {
      // Never seen — always due
      dueCount++
    } else {
      if (progress.nextReview <= endOfToday) dueCount++
      if (
        progress.interval >= MASTERED_INTERVAL_DAYS &&
        progress.repetitions >= MASTERED_REPETITIONS
      ) {
        masteredCount++
      } else {
        inLearningCount++
      }
    }
  }

  return {
    deckId: deck.id,
    deckTitle: deck.title,
    dueCount,
    masteredCount,
    inLearningCount,
  }
})
```

Note: This performs in-application grouping (same pattern as `dashboard.ts` lines 46-67). The alternative is a complex raw SQL query — the application-code approach is simpler and consistent with existing patterns for a small user count (2-5 users).

The `where: { userId }` guard on the `progress` sub-select is critical (v1.3-research decision: "Every CardProgress query in stats.ts must include where: { userId } to hit compound index"). [VERIFIED: codebase read — STATE.md]

### Pattern 3: Parallel Fetch in DashboardPage

**What:** Fire both fetches simultaneously; handle stats failure silently without blocking the study CTA.

**Current DashboardPage pattern (lines 25-47):** Single sequential fetch with `setLoading(true)` at the top level — the entire page blocks on `loading` being true. Phase 15 must NOT make the page wait for both fetches before rendering.

**Recommended approach — two independent state slices, no blocking on stats:**
```typescript
// Source: DashboardPage.tsx existing pattern + Success Criterion 5
const [stats, setStats] = useState<DashboardStats | null>(null)
const [statsSummary, setStatsSummary] = useState<StatsSummary | null>(null)
const [statsLoading, setStatsLoading] = useState(true)
const [loading, setLoading] = useState(true)

const fetchAll = async () => {
  // Fire both fetches in parallel — neither waits for the other
  const [dashboardResult, summaryResult] = await Promise.allSettled([
    api.get('/api/dashboard/stats'),
    api.get('/api/stats/summary'),
  ])

  // Dashboard stats (existing flow — toast on failure)
  if (dashboardResult.status === 'fulfilled' && dashboardResult.value.ok) {
    setStats((await dashboardResult.value.json()) as DashboardStats)
  } else {
    toast.error(t('common.somethingWrong'))
  }
  setLoading(false)

  // Stats summary (silent failure — null state = empty state chips)
  if (summaryResult.status === 'fulfilled' && summaryResult.value.ok) {
    setStatsSummary((await summaryResult.value.json()) as StatsSummary)
  }
  // On failure: statsSummary stays null → StatsSummaryPanel renders empty states
  setStatsLoading(false)
}

useEffect(() => {
  void fetchAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

The existing `if (loading) return (...)` guard only checks `loading` (dashboard stats loading), so the page renders the hero section as soon as dashboard stats resolve. `StatsSummaryPanel` receives `statsLoading` prop to decide whether to show skeletons.

**Alternative considered: two separate `useEffect` calls.** Also valid but `Promise.allSettled` in one `useEffect` is cleaner and consistent with how study.ts already uses `Promise.all` for parallel Prisma queries.

### Pattern 4: StatsSummaryPanel Component Structure

**What:** Pure display component receiving `summary: StatsSummary | null` and `loading: boolean`.

```typescript
// Source: 15-UI-SPEC.md — chip pattern from DashboardPage.tsx lines 140-156
interface StatsSummaryPanelProps {
  summary: StatsSummary | null
  loading: boolean
}

export function StatsSummaryPanel({ summary, loading }: StatsSummaryPanelProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      // Skeleton from UI-SPEC Interaction Contract
      <div className="mt-8">
        <div className="flex gap-4">
          <div className="flex-1 h-[68px] bg-muted animate-pulse rounded-lg" aria-hidden="true" />
          <div className="flex-1 h-[68px] bg-muted animate-pulse rounded-lg" aria-hidden="true" />
        </div>
        <div className="h-[68px] bg-muted animate-pulse rounded-lg mt-4" aria-hidden="true" />
        <div className="h-[120px] bg-muted animate-pulse rounded-lg mt-6" aria-hidden="true" />
      </div>
    )
  }

  // Derive safe display values from nullable summary
  const totalReviewed = summary?.totalReviewed ?? 0
  const weekReviewed  = summary?.weekReviewed ?? 0
  const retentionRate = summary?.retentionRate  // null = no data
  const diffBreakdown = summary?.difficultyBreakdown  // null = no data
  const perDeck       = summary?.perDeck ?? []

  return (
    <div className="mt-8">
      {/* Row 1: Total Reviewed + Retention Rate chips (flex gap-4) */}
      <div className="flex gap-4">
        {/* Total Reviewed chip */}
        <div
          role="region"
          aria-label={t('dashboard.stats.totalReviewed')}
          className="flex-1 border border-border rounded-lg p-4 min-h-[44px]"
        >
          <p className="text-xs font-normal text-muted-foreground uppercase tracking-wide">
            {t('dashboard.stats.totalReviewed')}
          </p>
          <p className="text-xl font-semibold text-foreground mt-1">
            {totalReviewed.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('dashboard.stats.thisWeek', { count: weekReviewed })}
          </p>
        </div>

        {/* Retention Rate chip */}
        <div
          role="region"
          aria-label={t('dashboard.stats.retentionRate')}
          className="flex-1 border border-border rounded-lg p-4 min-h-[44px]"
        >
          <p className="text-xs font-normal text-muted-foreground uppercase tracking-wide">
            {t('dashboard.stats.retentionRate')}
          </p>
          {retentionRate === null ? (
            <p role="status" className="text-sm text-muted-foreground mt-1">
              {t('dashboard.stats.noData')}
            </p>
          ) : (
            <p className="text-xl font-semibold text-foreground mt-1">
              {Math.round(retentionRate * 100)}%
            </p>
          )}
        </div>
      </div>

      {/* Row 2: Difficulty Breakdown chip (full width) */}
      {/* ... */}

      {/* Row 3: Per-Deck Progress table */}
      {/* ... */}
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Blocking the hero on stats:** Do NOT await the stats fetch before setting `loading = false`. The hero must render as soon as dashboard stats arrive.
- **Using `Promise.all` instead of `Promise.allSettled`:** `Promise.all` rejects if either fetch fails; `Promise.allSettled` lets each resolve independently. Stats failure must be silent (Success Criterion 5).
- **Displaying `0%` when no ReviewLog data:** The schema encodes this as `null`, not `0`. Rendering `"0%"` violates STATS-02. Always check for `null` explicitly.
- **Computing mastered client-side:** The threshold constants live in `@kartex/shared` but computation must happen in the backend query, not in `StatsSummaryPanel`, to keep the component pure and avoid duplicating business logic.
- **Forgetting `where: { userId }` in CardProgress queries:** Omitting this hits a full table scan and returns other users' data. Every Prisma query in stats.ts must scope to `userId`. [VERIFIED: codebase read — v1.3-research decision in STATE.md]
- **Adding `retentionRate: 0` when totalLast30 === 0:** Return `null` instead to enable the "No data yet" empty state. Returning `0` would be mathematically correct but UX-incorrect per STATS-02.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Parallel fetch with silent failure | Custom try/catch wrappers per fetch | `Promise.allSettled` | Built-in, handles rejection without throwing; already understood by the team |
| Mastered card threshold | Hardcoded `21` and `3` in route file | `MASTERED_INTERVAL_DAYS`, `MASTERED_REPETITIONS` from `@kartex/shared` | Already defined in Phase 14; single source of truth prevents drift |
| Type-safe stats response | Inline `as any` casts | `StatsSummary` type from `@kartex/shared` | Already defined; import and use |
| Skeleton loading UI | Custom CSS animation | `bg-muted animate-pulse rounded-lg` (Tailwind) | Exactly what the UI-SPEC specifies; no library needed |
| Number formatting | Manual string concatenation | `.toLocaleString()` for count display | Handles locale-specific thousands separators automatically |

---

## Common Pitfalls

### Pitfall 1: `retentionRate: 0` when no ReviewLog data
**What goes wrong:** If `totalLast30 === 0` and the handler returns `retentionRate: 0`, the frontend renders "0%" instead of "No data yet".
**Why it happens:** Defensive coding instinct fills nulls with zeros.
**How to avoid:** Explicitly check `totalLast30 === 0` and return `null` for `retentionRate`. The schema already declares `z.number().min(0).max(1).nullable()` — honor it.
**Warning signs:** Test STATS-02 against a fresh account with no review history.

### Pitfall 2: Stats failure causes blank dashboard
**What goes wrong:** If the stats fetch throws (network error) and the error propagates up to a top-level error boundary, the entire page goes blank.
**Why it happens:** Using `.then().catch()` chaining or `Promise.all` instead of `Promise.allSettled`.
**How to avoid:** Use `Promise.allSettled`. After settlement, handle each result independently. If the stats result is `'rejected'` or `value.ok === false`, call `setStatsLoading(false)` and leave `statsSummary` as `null`. No toast.
**Warning signs:** Test by mocking the `/api/stats/summary` fetch to reject; verify the hero section still renders.

### Pitfall 3: Missing `where: { userId }` in Prisma queries
**What goes wrong:** CardProgress.count without `userId` filter returns aggregate across all users. For a multi-user app this leaks data and is a correctness bug.
**Why it happens:** Copy-paste from a single-user prototype.
**How to avoid:** Every query in `stats.ts` must begin with `where: { userId }` at the top level.
**Warning signs:** `totalReviewed` count is higher than expected; stats change when other users study.

### Pitfall 4: `progress` sub-select in per-deck query omitting `where: { userId }`
**What goes wrong:** Without `where: { userId }` inside the nested `progress` select, a card shared with multiple users inflates mastered/in-learning counts.
**Why it happens:** Nested selects can silently omit the user scope.
**How to avoid:** `cards: { select: { progress: { where: { userId }, select: {...} } } }`.

### Pitfall 5: i18n keys not added to both locale files atomically
**What goes wrong:** `de.json` missing keys fall back to the raw key string (e.g. `"dashboard.stats.totalReviewed"`) not the English string. Pitfall explicitly documented in STATE.md (10-05 decision).
**Why it happens:** Only updating `en.json` in one commit.
**How to avoid:** Always update `en.json` AND `de.json` in the same commit. Both have identical structure.

### Pitfall 6: Per-deck progress excluding shared decks
**What goes wrong:** Using `where: { ownerId: userId }` only would exclude decks shared with the user.
**Why it happens:** Simplest query only checks ownership.
**Resolution for Phase 15:** The v1.3 scope only shows owned decks in the per-deck progress section (consistent with the dashboard.ts `ownerId: userId` filter). The UI-SPEC says "listing each deck" without specifying shared — and the existing `byDeck` table in dashboard.ts also only shows owned decks. Keep `where: { ownerId: userId }` for consistency.

### Pitfall 7: Prisma `groupBy` with no rows returning empty array
**What goes wrong:** `reviewLog.groupBy(...)` with no matching rows returns `[]`, not `null`. Code that directly accesses `breakdown[0]._count` throws.
**Why it happens:** Assuming at least one result row exists.
**How to avoid:** Check `breakdown.length === 0` first and return `difficultyBreakdown: null`. Use `.find(r => r.rating === N)?._count.rating ?? 0` to safely handle missing rating buckets (e.g. no "Again" ratings ever given).

### Pitfall 8: `weekReviewed` using `lastReviewed` vs `updatedAt`
**What goes wrong:** Using `CardProgress.updatedAt` instead of `lastReviewed` for the week count.
**Why it happens:** Confusing the two timestamp fields.
**How to avoid:** Use `lastReviewed: { gte: startOfWeek }`. The `lastReviewed` field is explicitly set to `new Date()` on every upsert in `study.ts` line 207.

---

## Code Examples

### Route registration (index.ts addition)
```typescript
// Source: apps/backend/src/index.ts lines 63-64 (existing pattern)
import { statsRouter } from './routes/stats.js'
// ... (after studyRouter and dashboardRouter registrations)
app.route('/api/stats', statsRouter)
```

### Hono route file skeleton
```typescript
// Source: apps/backend/src/routes/dashboard.ts (structural pattern)
import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { MASTERED_INTERVAL_DAYS, MASTERED_REPETITIONS } from '@kartex/shared'

const stats = new Hono<{ Variables: { userId: string } }>()

stats.get('/summary', async (c) => {
  const userId = c.get('userId')
  // ... queries ...
  return c.json(result, 200)
})

export { stats as statsRouter }
```

### DashboardPage parallel fetch addition
```typescript
// Source: DashboardPage.tsx lines 25-47 (existing fetchStats pattern, extended)
import type { StatsSummary } from '@kartex/shared'
import { StatsSummaryPanel } from '@/components/StatsSummaryPanel'

// New state slice (alongside existing stats/loading)
const [statsSummary, setStatsSummary] = useState<StatsSummary | null>(null)
const [statsLoading, setStatsLoading] = useState(true)

// Replace existing fetchStats + useEffect with:
const fetchAll = async () => {
  const [dashResult, summaryResult] = await Promise.allSettled([
    api.get('/api/dashboard/stats'),
    api.get('/api/stats/summary'),
  ])
  if (dashResult.status === 'fulfilled' && dashResult.value.ok) {
    setStats((await dashResult.value.json()) as DashboardStats)
  } else {
    toast.error(t('common.somethingWrong'))
  }
  setLoading(false)

  if (summaryResult.status === 'fulfilled' && summaryResult.value.ok) {
    setStatsSummary((await summaryResult.value.json()) as StatsSummary)
  }
  setStatsLoading(false)
}
useEffect(() => { void fetchAll() }, []) // eslint-disable-line
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ReviewLog did not exist | ReviewLog table added with `@@index([userId, reviewedAt])` | Phase 14 (2026-06-09) | STATS-02/03 are now possible |
| StatsSummarySchema undefined | `StatsSummarySchema` defined in `packages/shared/src/schemas/stats.ts` | Phase 14 (2026-06-09) | No schema work needed in Phase 15 |
| No mastered threshold constant | `MASTERED_INTERVAL_DAYS = 21`, `MASTERED_REPETITIONS = 3` in shared | Phase 14 (2026-06-09) | Import constants; don't hardcode |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `retentionRate` should use `rating >= 3` (Good or Easy) as the threshold for "success" | Standard Stack — STATS-02 query | If the threshold is different (e.g. only Easy = 4), the percentage would be lower — functional but semantically different. The REQUIREMENTS.md says "ratings >= Good" which maps to >= 3 using the established 1-4 scale from study.ts. | 
| A2 | Per-deck progress shows only owned decks (not shared decks) | Common Pitfalls — Pitfall 6 | If shared decks should appear, the query needs an OR clause. For Phase 15 scope the simpler `ownerId: userId` filter is consistent with existing dashboard.ts behaviour. |
| A3 | `totalReviewed` counts distinct CardProgress rows (unique card/user pairs), not total ReviewLog events | Standard Stack — STATS-01 query | STATS-01 says "total cards reviewed" — this is ambiguous. CardProgress.count gives unique cards reviewed; ReviewLog.count gives total rating events. The CardProgress interpretation aligns with the "Total Reviewed" label better. |
| A4 | Prisma `groupBy` on `ReviewLog.rating` returns `_count: { rating: true }` in the result shape | Standard Stack — STATS-03 query | If Prisma's `groupBy` + `_count` API shape differs, the `breakdown.find(r => r.rating === N)?._count.rating` access would fail. [ASSUMED — not directly tested in this session] |

**All other claims were verified by reading the live codebase directly.**

---

## Open Questions

1. **`totalReviewed` semantics: unique cards vs. total reviews**
   - What we know: REQUIREMENTS.md says "total cards reviewed (all time)" and the UI-SPEC chip label is "Total Reviewed"
   - What's unclear: Should it count unique cards ever reviewed (CardProgress.count = same card reviewed 50 times counts as 1) or total review events (ReviewLog.count = same card reviewed 50 times counts as 50)?
   - Recommendation: Use `CardProgress.count` (unique cards). The phrase "total cards reviewed" implies distinct cards. If the user expects review events, the label would need to say "Total Reviews". This assumption is logged as A3 above.

2. **Week boundary: Sunday vs. Monday start**
   - What we know: `weekReviewed` counts CardProgress rows with `lastReviewed >= startOfWeek`
   - What's unclear: Is the week Sunday-to-Saturday (JS `getDay() === 0`) or Monday-to-Sunday (ISO)?
   - Recommendation: Use Sunday start (JS default) for simplicity. The difference is cosmetic and affects only the chip sub-label.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 15 is pure code changes. No new external dependencies, services, CLIs, or runtimes beyond what is already running (PostgreSQL, Node.js/Hono). The ReviewLog table and its index were deployed in Phase 14 (`prisma migrate deploy`).

---

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 (pinned — see STATE.md 03-01) |
| Config file | `apps/frontend/vitest.config.ts` / `apps/backend/vitest.config.ts` |
| Quick run command | `yarn workspace @kartex/frontend test --run` |
| Full suite command | `yarn workspace @kartex/frontend test --run && yarn workspace @kartex/backend test --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STATS-01 | `GET /api/stats/summary` returns `totalReviewed` and `weekReviewed` integer counts | integration / unit | `yarn workspace @kartex/backend test --run` | ❌ Wave 0 |
| STATS-02 | `retentionRate` is `null` when no ReviewLog rows in last 30 days; float 0-1 otherwise | unit (backend route) | `yarn workspace @kartex/backend test --run` | ❌ Wave 0 |
| STATS-03 | `difficultyBreakdown` is `null` when no ReviewLog rows in last 30 days; object with easy/good/hard/again otherwise | unit (backend route) | `yarn workspace @kartex/backend test --run` | ❌ Wave 0 |
| STATS-04 | Per-deck table shows all owned decks; decks with 0 cards show zero counts; mastered threshold `interval>=21 AND repetitions>=3` | unit (backend route) | `yarn workspace @kartex/backend test --run` | ❌ Wave 0 |
| STATS-01 | DashboardPage renders `StatsSummaryPanel` with `totalReviewed` chip visible | component test | `yarn workspace @kartex/frontend test --run` | ❌ Wave 0 |
| STATS-02/03 | StatsSummaryPanel shows "No data yet" when `summary.retentionRate === null` | component test | `yarn workspace @kartex/frontend test --run` | ❌ Wave 0 |
| (SC-5) | Stats fetch failure leaves dashboard hero rendered; no toast error from stats | component test | `yarn workspace @kartex/frontend test --run` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `yarn workspace @kartex/frontend test --run` (frontend tasks) or `yarn workspace @kartex/backend test --run` (backend tasks)
- **Per wave merge:** `yarn workspace @kartex/frontend test --run && yarn workspace @kartex/backend test --run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/backend/src/routes/__tests__/stats-summary.test.ts` — covers STATS-01, STATS-02, STATS-03, STATS-04 (backend unit tests with Prisma mocked)
- [ ] `apps/frontend/src/pages/__tests__/DashboardPage.test.tsx` — covers STATS-01 chip render, STATS-02/03 empty state, SC-5 parallel fetch failure isolation
- [ ] `apps/frontend/src/components/__tests__/StatsSummaryPanel.test.tsx` — covers StatsSummaryPanel with various `summary` shapes (null, partial, full)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT via `authMiddleware` already applied to `/api/*` in `index.ts` — `statsRouter` inherits it automatically |
| V3 Session Management | no — read-only endpoint | n/a |
| V4 Access Control | yes | `userId = c.get('userId')` from JWT context; every Prisma query scoped to `userId` (never from request body) |
| V5 Input Validation | minimal | `GET /api/stats/summary` has no request body; no query parameters; no validation needed beyond JWT |
| V6 Cryptography | no | n/a |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Horizontal privilege escalation (user A reads user B's stats) | Information Disclosure | Every query scoped to `userId` from JWT — never from URL params or body |
| ReviewLog scan without index | DoS / performance | `@@index([userId, reviewedAt])` ensures all date-range queries are indexed — already created in Phase 14 migration |
| Returning 0% retention instead of null (misleading data) | Tampering / integrity | Explicit `totalLast30 === 0 ? null : rate` guard in route handler |

---

## Files to Create / Modify

### Create
| File | Why |
|------|-----|
| `apps/backend/src/routes/stats.ts` | New Hono route: `GET /api/stats/summary` |
| `apps/frontend/src/components/StatsSummaryPanel.tsx` | New pure display component |
| `apps/backend/src/routes/__tests__/stats-summary.test.ts` | Wave 0 test stub (Wave 0 plan) |
| `apps/frontend/src/pages/__tests__/DashboardPage.test.tsx` | Wave 0 test stub or full test |

### Modify
| File | Why |
|------|-----|
| `apps/backend/src/index.ts` | Register `statsRouter` under `/api/stats` |
| `apps/frontend/src/pages/DashboardPage.tsx` | Add parallel fetch, `statsSummary` state, `StatsSummaryPanel` render |
| `apps/frontend/src/locales/en.json` | 12 new `dashboard.stats.*` keys |
| `apps/frontend/src/locales/de.json` | Same 12 keys in German (same commit as en.json) |

### No changes needed
| File | Why no change |
|------|--------------|
| `packages/shared/src/schemas/stats.ts` | Already complete (Phase 14) |
| `packages/shared/src/index.ts` | Already exports stats.ts (Phase 14) |
| `apps/backend/prisma/schema.prisma` | ReviewLog table already exists (Phase 14) |
| Any shadcn/ui component | All required components already installed per UI-SPEC |

---

## Proposed Wave Structure for Planner

**Wave 1 (all parallel — no shared files):**
- Plan A: Backend route `stats.ts` + index.ts registration + backend test stub
- Plan B: i18n keys (en.json + de.json)

**Wave 2 (blocked on Wave 1 — uses the new endpoint + i18n keys):**
- Plan C: `StatsSummaryPanel.tsx` + DashboardPage.tsx parallel fetch integration + frontend tests

This mirrors the existing wave pattern used in Phases 10 and 11.

---

## Sources

### Primary (HIGH confidence — verified directly from codebase)
- `apps/backend/prisma/schema.prisma` — ReviewLog model, CardProgress model, indexes
- `packages/shared/src/schemas/stats.ts` — StatsSummarySchema, constants
- `apps/frontend/src/pages/DashboardPage.tsx` — existing fetch pattern, chip pattern
- `apps/backend/src/routes/dashboard.ts` — existing Prisma query patterns
- `apps/backend/src/routes/study.ts` — ReviewLog write pattern, transaction, rating domain
- `apps/backend/src/index.ts` — route registration pattern
- `.planning/phases/15-stats-feature/15-UI-SPEC.md` — UI contract (approved 2026-06-10)
- `.planning/STATE.md` — locked decisions relevant to Phase 15

### Secondary (MEDIUM confidence)
- Phase 14 plan artifacts — confirm schema was implemented as designed

### Tertiary (LOW confidence — assumptions)
- Prisma `groupBy` + `_count` API shape (assumption A4)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed, versions confirmed from package.json
- Architecture: HIGH — sourced from live codebase patterns
- Pitfalls: HIGH — two sourced from STATE.md locked decisions, others from code analysis
- Prisma query shapes: MEDIUM/HIGH — patterns for `count` and `findMany` verified; `groupBy` shape assumed from training knowledge (A4)

**Research date:** 2026-06-10
**Valid until:** 2026-07-10 (stable stack — no fast-moving dependencies)

---

## RESEARCH COMPLETE
