---
phase: 15-stats-feature
reviewed: 2026-06-10T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - apps/backend/src/routes/__tests__/stats-summary.test.ts
  - apps/frontend/src/components/__tests__/StatsSummaryPanel.test.tsx
  - apps/frontend/src/pages/__tests__/DashboardPage.test.tsx
  - apps/backend/src/routes/stats.ts
  - apps/backend/src/index.ts
  - apps/frontend/src/locales/en.json
  - apps/frontend/src/locales/de.json
  - apps/frontend/src/components/StatsSummaryPanel.tsx
  - apps/frontend/src/pages/DashboardPage.tsx
findings:
  critical: 2
  warning: 4
  info: 1
  total: 7
status: issues_found
---

# Phase 15: Code Review Report

**Reviewed:** 2026-06-10T00:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Phase 15 adds a stats summary endpoint (`GET /api/stats/summary`) and wires it into the dashboard via a new `StatsSummaryPanel` component. The backend logic is well-structured and the data-isolation approach (scoping every query to `userId`) is correct. However two blockers stand out: a hardcoded untranslated string in the panel, and a structural dead-code path that makes the skeleton loading state unreachable. Four additional warnings cover test coverage gaps, error handling, and timezone-fragile date arithmetic.

---

## Critical Issues

### CR-01: Hardcoded English string in `StatsSummaryPanel` — i18n miss

**File:** `apps/frontend/src/components/StatsSummaryPanel.tsx:152`
**Issue:** The empty per-deck table state renders a raw English string `"No decks yet."` instead of a translation key. Every other user-visible string in this file goes through `t()`. This string is invisible in German (`de.json` has no matching key) and will stay English regardless of the user's language setting.

**Fix:**
Add a key to both locale files (e.g., `dashboard.stats.noDecksYet`) and replace the hardcoded string:
```tsx
// en.json → "dashboard": { "stats": { ..., "noDecksYet": "No decks yet." } }
// de.json → "dashboard": { "stats": { ..., "noDecksYet": "Noch keine Stapel." } }

// StatsSummaryPanel.tsx line 152
{t('dashboard.stats.noDecksYet')}
```

---

### CR-02: `statsLoading` skeleton state is structurally unreachable — dead prop

**File:** `apps/frontend/src/pages/DashboardPage.tsx:26,33-51,169`
**Issue:** `statsLoading` is initialised to `true` (line 26) and is only set to `false` inside `fetchAll`, which uses `Promise.allSettled` (line 33). `Promise.allSettled` resolves only after **both** fetches settle, so `setLoading(false)` and `setStatsLoading(false)` always execute in the same async batch. React 18 batches these state updates into a single re-render.

The `if (loading) return <Spinner>` guard (line 59) prevents `StatsSummaryPanel` from mounting until after `loading` becomes `false`. By the time the guard is cleared, `statsLoading` is already `false` in the same render cycle. Therefore `<StatsSummaryPanel loading={statsLoading} />` will never receive `loading={true}` — the skeleton defined in `StatsSummaryPanel` is unreachable.

This means:
- The design intent documented as T-15-03 ("passes statsLoading so skeletons show while the summary fetch is pending") is never satisfied.
- The test at `DashboardPage.test.tsx:124` passes today only because it asserts the skeleton is **gone** after resolution — it does not assert the skeleton was shown during the intermediate state.

**Fix:** Decouple the two loading states. Remove the `loading` guard blocking `StatsSummaryPanel`, or track them independently:

```tsx
// Option A: render the panel independently of the main loading state
// so StatsSummaryPanel can show its own skeleton while the summary fetch is pending

// In fetchAll, set loading=false as soon as dashResult settles (don't wait for summary):
const [dashResult] = await Promise.allSettled([api.get('/api/dashboard/stats')])
if (dashResult.status === 'fulfilled' && dashResult.value.ok) {
  setStats((await dashResult.value.json()) as DashboardStats)
} else {
  toast.error(t('common.somethingWrong'))
}
setLoading(false)

// Fire summary fetch separately, keeping statsLoading=true while it runs:
api.get('/api/stats/summary').then(async (res) => {
  if (res.ok) setStatsSummary((await res.json()) as StatsSummary)
}).finally(() => setStatsLoading(false))
```

---

## Warnings

### WR-01: All backend stats tests are `it.todo` stubs — zero assertions executed

**File:** `apps/backend/src/routes/__tests__/stats-summary.test.ts:8-43`
**Issue:** Every test case in this file is `it.todo(...)`. Vitest marks `todo` tests as pending and skips them entirely. The test suite reports "0 tests passed" for this file and will return a green result even if the entire `stats.ts` implementation is deleted. The security test (T-15-01) is also a stub.

**Fix:** Implement mock-based assertions for at least the critical invariants before shipping:
- `retentionRate` is `null` when no `ReviewLog` rows exist (not `0`)
- `difficultyBreakdown` is `null` when empty (not a zero-filled object)
- Every query is scoped to `userId` from `c.get('userId')`

---

### WR-02: `stats.ts` route handler has no error handling — unhandled Prisma rejections

**File:** `apps/backend/src/routes/stats.ts:8-121`
**Issue:** The handler `async (c) => { ... }` performs five Prisma queries with no `try/catch` block. If the database is unavailable or Prisma throws (connection timeout, constraint violation, etc.), the unhandled rejection propagates to Hono's default handler. Other routes in this codebase likely have explicit error handling; this handler is inconsistent and will produce an unstructured 500 response rather than the same error shape the client expects.

**Fix:**
```ts
stats.get('/summary', async (c) => {
  try {
    const userId = c.get('userId')
    // ... existing logic ...
    return c.json({ totalReviewed, weekReviewed, retentionRate, difficultyBreakdown, perDeck }, 200)
  } catch (err) {
    console.error('[stats] summary query failed:', err)
    return c.json({ error: 'Failed to load stats' }, 500)
  }
})
```

---

### WR-03: Date boundaries use Node.js local time — timezone-fragile

**File:** `apps/backend/src/routes/stats.ts:12-20`
**Issue:** `startOfWeek`, `thirtyDaysAgo`, and `endOfToday` are all computed using `new Date()` with `setDate`/`setHours` — these methods operate on the Node.js process local time zone, not UTC. In Docker, the container timezone defaults to UTC, which is probably correct, but the code makes this assumption implicitly. If the server is ever deployed in a non-UTC timezone, `startOfWeek` and `endOfToday` will misalign with user expectations (e.g., a review done at 23:30 UTC+2 may count as tomorrow's review).

**Fix:** Use explicit UTC arithmetic to make timezone handling explicit and test-safe:
```ts
// UTC-safe start of week (Sunday 00:00 UTC)
const now = new Date()
const dayOfWeek = now.getUTCDay()
const startOfWeek = new Date(Date.UTC(
  now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOfWeek,
  0, 0, 0, 0
))

// UTC-safe end of today
const endOfToday = new Date(Date.UTC(
  now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
  23, 59, 59, 999
))
```

---

### WR-04: `fetchAll` captures stale `t()` reference — language-switch miss

**File:** `apps/frontend/src/pages/DashboardPage.tsx:32-52,54-57`
**Issue:** `fetchAll` is defined as a `const` inside the component body and directly calls `t(...)` (line 42). The `useEffect` that calls it has an empty dependency array `[]` with an `eslint-disable-next-line react-hooks/exhaustive-deps` comment (line 56). If the user switches language before the dashboard data loads, the error toast will fire with the old locale's translation string because `fetchAll` closed over the stale `t` reference.

This is low-risk in practice (the dashboard loads quickly), but the eslint suppression comment hides a real correctness concern.

**Fix:** Include `t` in the effect dependencies, or move the error toast call outside the closed-over function:
```ts
useEffect(() => {
  void fetchAll()
}, []) // acceptable if fetchAll is extracted to a useCallback with t dependency
// OR:
const fetchAll = useCallback(async () => { ... }, [t])
useEffect(() => { void fetchAll() }, [fetchAll])
```

---

## Info

### IN-01: `totalReviewed` and `weekReviewed` queries are sequential — missed parallelism

**File:** `apps/backend/src/routes/stats.ts:23-32`
**Issue:** `totalReviewed` (line 23) and `weekReviewed` (line 27) are two independent `COUNT` queries executed sequentially. The `retentionRate` queries at line 36 correctly use `Promise.all`. These two counts could be parallelized the same way, reducing handler latency by one database round-trip.

**Fix:**
```ts
const [totalReviewed, weekReviewed] = await Promise.all([
  prisma.cardProgress.count({ where: { userId } }),
  prisma.cardProgress.count({ where: { userId, lastReviewed: { gte: startOfWeek } } }),
])
```

---

_Reviewed: 2026-06-10T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
