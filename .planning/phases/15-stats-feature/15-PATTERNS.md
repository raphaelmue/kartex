# Phase 15: Stats Feature — Pattern Map

**Mapped:** 2026-06-10
**Files analyzed:** 8 (2 create, 5 modify, 1 schema already complete)
**Analogs found:** 8 / 8

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/backend/src/routes/stats.ts` | route | request-response | `apps/backend/src/routes/dashboard.ts` | exact |
| `apps/backend/src/index.ts` | config | request-response | `apps/backend/src/index.ts` (lines 63-64) | self |
| `apps/frontend/src/components/StatsSummaryPanel.tsx` | component | request-response | `apps/frontend/src/pages/DashboardPage.tsx` (lines 136-156) | role-match |
| `apps/frontend/src/pages/DashboardPage.tsx` | page | request-response | `apps/frontend/src/pages/DashboardPage.tsx` (lines 25-47) | self |
| `apps/frontend/src/locales/en.json` | config | — | `apps/frontend/src/locales/en.json` (lines 62-74) | self |
| `apps/frontend/src/locales/de.json` | config | — | `apps/frontend/src/locales/en.json` (lines 62-74) | role-match |
| `apps/backend/src/routes/__tests__/stats-summary.test.ts` | test | — | (no backend route tests exist yet — Wave 0 stub) | none |
| `apps/frontend/src/pages/__tests__/DashboardPage.test.tsx` | test | — | (no DashboardPage test exists yet — Wave 0 stub) | none |

---

## Pattern Assignments

### `apps/backend/src/routes/stats.ts` (route, request-response)

**Analog:** `apps/backend/src/routes/dashboard.ts`

**Imports pattern** (lines 1-4 of dashboard.ts):
```typescript
import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { MASTERED_INTERVAL_DAYS, MASTERED_REPETITIONS } from '@kartex/shared'
// Note: calculateStreak not needed; add StatsSummarySchema for parse safety
```

**Router declaration pattern** (line 5 of dashboard.ts):
```typescript
const stats = new Hono<{ Variables: { userId: string } }>()
```
The generic `{ Variables: { userId: string } }` is the project-standard way to type the JWT-injected userId from `authMiddleware`. Never extract userId from query params or body.

**userId extraction** (line 9 of dashboard.ts):
```typescript
const userId = c.get('userId')
```

**Date boundary pattern** (lines 11-14 of dashboard.ts):
```typescript
const startOfToday = new Date()
startOfToday.setHours(0, 0, 0, 0)
const endOfToday = new Date()
endOfToday.setHours(23, 59, 59, 999)
```
For `weekReviewed`, the startOfWeek variant is:
```typescript
const startOfWeek = new Date()
startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()) // Sunday
startOfWeek.setHours(0, 0, 0, 0)
```

**Prisma count with userId scope** (lines 17-22 of dashboard.ts):
```typescript
const reviewedToday = await prisma.cardProgress.count({
  where: {
    userId,
    lastReviewed: { gte: startOfToday },
  },
})
```
Every Prisma query MUST include `userId` at the top-level `where`. Never omit it.

**Prisma findMany with nested select** (lines 25-44 of dashboard.ts):
```typescript
const dueProgress = await prisma.cardProgress.findMany({
  where: {
    userId,
    nextReview: { lte: endOfToday },
    card: { deck: { ownerId: userId, isActive: true } },
  },
  select: {
    card: { select: { deck: { select: { id: true, title: true } } } },
  },
})
```
For the per-deck stats query in stats.ts, the equivalent nested-select structure with `progress: { where: { userId } }` is critical — see RESEARCH.md Pitfall 4.

**In-application grouping** (lines 46-68 of dashboard.ts):
```typescript
const deckMap = new Map<string, { deckId: string; deckTitle: string; dueCount: number }>()
for (const p of dueProgress) {
  const { id, title } = p.card.deck
  const existing = deckMap.get(id)
  if (existing) {
    existing.dueCount++
  } else {
    deckMap.set(id, { deckId: id, deckTitle: title, dueCount: 1 })
  }
}
```
The stats.ts per-deck query uses the same in-app aggregation pattern, iterating over `deck.cards` instead of a flat array.

**JSON response pattern** (lines 88-97 of dashboard.ts):
```typescript
return c.json(
  {
    totalDue,
    reviewedToday,
    streak,
    byDeck,
  },
  200
)
```

**Export pattern** (line 99 of dashboard.ts):
```typescript
export { dashboard as dashboardRouter }
// → for stats.ts:
export { stats as statsRouter }
```

---

### `apps/backend/src/index.ts` (modify — route registration)

**Analog:** self (existing lines 63-64)

**Registration block to replicate** (lines 62-64):
```typescript
// ─── 5c. Study + Dashboard routes (JWT required — inherited from step 4) ──────
app.route('/api/study', studyRouter)
app.route('/api/dashboard', dashboardRouter)
```

**New import line** (add alongside existing imports at lines 13-14):
```typescript
import { dashboardRouter } from './routes/dashboard.js'
// Add:
import { statsRouter } from './routes/stats.js'
```

**New registration line** (add after line 64, inside the step-5c block):
```typescript
app.route('/api/stats', statsRouter)
```

Auth coverage: `app.use('/api/*', authMiddleware)` at line 54 already covers `/api/stats/*` — no additional middleware needed.

---

### `apps/frontend/src/components/StatsSummaryPanel.tsx` (new component)

**Analog:** `apps/frontend/src/pages/DashboardPage.tsx` (chip pattern lines 136-156 + Table pattern lines 91-134)

**Imports pattern** (lines 1-17 of DashboardPage.tsx — adapt for component):
```typescript
import { useTranslation } from 'react-i18next'
import type { StatsSummary } from '@kartex/shared'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
```

**Component signature** (pure display, no fetch):
```typescript
interface StatsSummaryPanelProps {
  summary: StatsSummary | null
  loading: boolean
}

export function StatsSummaryPanel({ summary, loading }: StatsSummaryPanelProps) {
  const { t } = useTranslation()
  // ...
}
```

**Skeleton loading pattern** (Tailwind animate-pulse, from UI-SPEC Interaction Contract):
```tsx
if (loading) {
  return (
    <div className="mt-8" aria-busy="true">
      <div className="flex gap-4">
        <div className="flex-1 h-[68px] bg-muted animate-pulse rounded-lg" aria-hidden="true" />
        <div className="flex-1 h-[68px] bg-muted animate-pulse rounded-lg" aria-hidden="true" />
      </div>
      <div className="h-[68px] bg-muted animate-pulse rounded-lg mt-4" aria-hidden="true" />
      <div className="h-[120px] bg-muted animate-pulse rounded-lg mt-6" aria-hidden="true" />
    </div>
  )
}
```

**Chip pattern** (lines 139-155 of DashboardPage.tsx — the exact markup to replicate):
```tsx
<div className="flex gap-4">
  {/* Chip 1: Reviewed today */}
  <div className="flex-1 border border-border rounded-lg p-4">
    <p className="text-xs font-normal text-muted-foreground uppercase tracking-wide">
      {t('dashboard.reviewedToday')}
    </p>
    <p className="text-xl font-semibold text-foreground mt-1">{stats.reviewedToday}</p>
  </div>
  {/* Chip 2: Streak */}
  <div className="flex-1 border border-border rounded-lg p-4">
    <p className="text-xs font-normal text-muted-foreground uppercase tracking-wide">
      {t('dashboard.streak')}
    </p>
    <p className="text-xl font-semibold text-foreground mt-1">
      {t('dashboard.streakDays', { count: stats.streak })}
    </p>
  </div>
</div>
```
New chips add `min-h-[44px]` (accessibility) and `role="region"` + `aria-label` (UI-SPEC accessibility contract).

**Empty state chip variant** (from UI-SPEC Component Inventory):
```tsx
<div className="flex-1 border border-border rounded-lg p-4 min-h-[44px]">
  <p className="text-xs font-normal text-muted-foreground uppercase tracking-wide">
    {label}
  </p>
  <p role="status" className="text-sm text-muted-foreground mt-1">
    {t('dashboard.stats.noData')}
  </p>
</div>
```

**Table pattern** (lines 91-134 of DashboardPage.tsx — per-deck due table as the template):
```tsx
<Table aria-label={t('dashboard.deckColumn')}>
  <TableHeader>
    <TableRow>
      <TableHead>{t('dashboard.deckColumn')}</TableHead>
      <TableHead className="text-right">{t('dashboard.dueColumn')}</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {stats.byDeck.length === 0 ? (
      <TableRow>
        <TableCell colSpan={2} className="text-center text-sm text-muted-foreground py-6">
          {t('dashboard.noDueAnyDeck')}
        </TableCell>
      </TableRow>
    ) : (
      stats.byDeck.map((d) => (
        <TableRow key={d.deckId}>
          <TableCell>
            <span className="text-sm font-normal text-foreground">{d.deckTitle}</span>
          </TableCell>
          <TableCell className="text-right">
            {d.dueCount > 0 ? (
              <Badge variant="secondary">{d.dueCount}</Badge>
            ) : (
              <span className="text-sm text-muted-foreground">{d.dueCount}</span>
            )}
          </TableCell>
        </TableRow>
      ))
    )}
  </TableBody>
</Table>
```
Per-deck progress table in StatsSummaryPanel has 4 columns (Deck | Due | Mastered | In Learning) instead of 2, but the structure is identical. Deck cell uses plain `<span>` (not `<Link>`) per UI-SPEC.

---

### `apps/frontend/src/pages/DashboardPage.tsx` (modify)

**Analog:** self (existing lines 25-47)

**Current fetch pattern to replace** (lines 29-47):
```typescript
const fetchStats = async () => {
  try {
    const res = await api.get('/api/dashboard/stats')
    if (res.ok) {
      setStats((await res.json()) as DashboardStats)
    } else {
      toast.error(t('common.somethingWrong'))
    }
  } catch {
    toast.error(t('common.serverUnreachable'))
  } finally {
    setLoading(false)
  }
}

useEffect(() => {
  void fetchStats()
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

**New parallel fetch pattern to replace it with** (based on existing pattern + RESEARCH.md Pattern 3):
```typescript
// New imports to add:
import type { StatsSummary } from '@kartex/shared'
import { StatsSummaryPanel } from '@/components/StatsSummaryPanel'

// New state slices (alongside existing line 22-23):
const [statsSummary, setStatsSummary] = useState<StatsSummary | null>(null)
const [statsLoading, setStatsLoading] = useState(true)

// Replace fetchStats + its useEffect with:
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
  // Silent failure: statsSummary stays null → StatsSummaryPanel renders empty states
  setStatsLoading(false)
}

useEffect(() => {
  void fetchAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

**Render insertion point** (after line 156 — after existing chips div, before closing `</div>`):
```tsx
{/* ── 1d. Stats Summary Panel (Phase 15) ──────────────────────── */}
<StatsSummaryPanel summary={statsSummary} loading={statsLoading} />
```

The `if (loading) return (...)` guard at line 49 only checks `loading` (dashboard stats) — this is correct. Do NOT add `|| statsLoading` to that guard. The hero renders immediately when dashboard stats arrive.

---

### `apps/frontend/src/locales/en.json` and `de.json` (modify)

**Analog:** `apps/frontend/src/locales/en.json` lines 62-74

**Existing dashboard block structure** (lines 62-74):
```json
"dashboard": {
  "title": "Dashboard — Kartex",
  "cardsDueToday": "cards due today",
  "startStudying": "Start Studying",
  "allCaughtUp": "You're all caught up!",
  "noDueCards": "No cards are due today. Come back tomorrow.",
  "deckColumn": "Deck",
  "dueColumn": "Due",
  "noDueAnyDeck": "No cards due across any deck.",
  "reviewedToday": "Reviewed today",
  "streak": "Streak",
  "streakDays": "{{count}} days"
}
```

**New keys to add inside the existing `"dashboard"` object** (flat sub-group pattern):
```json
"stats": {
  "totalReviewed": "Total Reviewed",
  "thisWeek": "{{count}} this week",
  "retentionRate": "Retention Rate (30 days)",
  "difficultyBreakdown": "Difficulty Breakdown",
  "noData": "No data yet",
  "perDeckProgress": "Per-Deck Progress",
  "masteredColumn": "Mastered",
  "inLearningColumn": "In Learning",
  "easyLabel": "Easy",
  "goodLabel": "Good",
  "hardLabel": "Hard",
  "againLabel": "Again"
}
```

**German equivalents for `de.json`** (same keys, same commit):
```json
"stats": {
  "totalReviewed": "Insgesamt gelernt",
  "thisWeek": "{{count}} diese Woche",
  "retentionRate": "Behaltenquote (30 Tage)",
  "difficultyBreakdown": "Schwierigkeitsverteilung",
  "noData": "Noch keine Daten",
  "perDeckProgress": "Fortschritt je Stapel",
  "masteredColumn": "Gemeistert",
  "inLearningColumn": "In Bearbeitung",
  "easyLabel": "Einfach",
  "goodLabel": "Gut",
  "hardLabel": "Schwer",
  "againLabel": "Nochmal"
}
```

The `"dashboard"` object uses flat keys with a nested `"stats"` sub-object. The i18next key `dashboard.stats.totalReviewed` resolves correctly with this structure. Both locale files must be updated in the same commit (STATE.md decision 10-05).

---

## Shared Patterns

### Auth — automatic via middleware
**Source:** `apps/backend/src/index.ts` line 54
```typescript
app.use('/api/*', authMiddleware)
```
**Apply to:** `apps/backend/src/routes/stats.ts`
No per-route auth setup needed. `statsRouter` registered under `/api/stats` inherits the `authMiddleware` automatically. The userId arrives via `c.get('userId')`.

### userId scoping — all Prisma queries
**Source:** `apps/backend/src/routes/dashboard.ts` lines 17-22
```typescript
await prisma.cardProgress.count({
  where: {
    userId,          // ← ALWAYS first in every where clause
    lastReviewed: { gte: startOfToday },
  },
})
```
**Apply to:** All four Prisma queries in `apps/backend/src/routes/stats.ts`. Omitting `userId` returns aggregate data across all users (correctness + privacy bug).

### api.get() fetch helper
**Source:** `apps/frontend/src/lib/api.ts` lines 64-67
```typescript
export const api = {
  get(url: string, options?: RequestInit): Promise<Response> {
    return baseFetch(url, { ...options, method: 'GET' })
  },
  // ...
}
```
**Apply to:** `apps/frontend/src/pages/DashboardPage.tsx` (already used; no change to api.ts needed). The helper handles 401 → token refresh transparently.

### Toast error pattern
**Source:** `apps/frontend/src/pages/DashboardPage.tsx` lines 35, 37
```typescript
toast.error(t('common.somethingWrong'))
toast.error(t('common.serverUnreachable'))
```
**Apply to:** DashboardPage.tsx parallel fetch — only for the dashboard stats failure path. Stats summary failure is SILENT (no toast). Do not add `toast.error` to the summary result handler.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/backend/src/routes/__tests__/stats-summary.test.ts` | test | — | No backend route unit tests exist in the codebase yet. Wave 0 stub; follow Vitest patterns from `apps/backend/vitest.config.ts`. |
| `apps/frontend/src/pages/__tests__/DashboardPage.test.tsx` | test | — | No DashboardPage test exists. Wave 0 stub; follow Vitest + React Testing Library patterns from `apps/frontend/vitest.config.ts`. |

---

## Metadata

**Analog search scope:** `apps/backend/src/routes/`, `apps/backend/src/index.ts`, `apps/frontend/src/pages/`, `apps/frontend/src/locales/`, `apps/frontend/src/lib/`, `packages/shared/src/schemas/`
**Files read:** dashboard.ts, index.ts, DashboardPage.tsx, stats.ts (shared), api.ts, en.json
**Pattern extraction date:** 2026-06-10
