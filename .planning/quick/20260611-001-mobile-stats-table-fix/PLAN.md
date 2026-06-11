---
slug: mobile-stats-table-fix
created: 2026-06-11
status: in-progress
---

# Mobile Stats Table Fix

## Goal

Fix the dashboard stats panel on mobile — the 4-column Per-Deck Progress table in `StatsSummaryPanel` overflows narrow viewports, making the page look broken. Also add horizontal scroll protection to the due-counts table in `DashboardPage`.

## Files

- `apps/frontend/src/components/StatsSummaryPanel.tsx` — wrap Per-Deck Progress table in `overflow-x-auto`
- `apps/frontend/src/pages/DashboardPage.tsx` — wrap per-deck due counts table in `overflow-x-auto`

## Steps

1. Wrap Per-Deck Progress table container in `<div className="overflow-x-auto">` in `StatsSummaryPanel.tsx`
2. Wrap per-deck due counts table container in `<div className="overflow-x-auto">` in `DashboardPage.tsx`
3. Run `npm test` — must pass
4. Run `npm run lint` — must pass
5. Run `npm run build` — must pass
6. Commit with message `fix: prevent stats tables from overflowing on mobile`
7. Create release v1.3.1 (if pipeline passes)
</content>
</invoke>