---
phase: 08-study-ux
plan: "04"
subsystem: frontend/deck-detail
tags: [gap-closure, ux, tag-filter, deck-detail]
dependency_graph:
  requires: []
  provides: [flat-card-table-with-tag-filter]
  affects: [DeckDetailPage]
tech_stack:
  added: []
  patterns: [tag-filter-chip-bar, flat-table-with-derived-filter-state]
key_files:
  created: []
  modified:
    - apps/frontend/src/pages/DeckDetailPage.tsx
    - apps/frontend/src/pages/__tests__/DeckDetailPage.test.tsx
decisions:
  - "filterTag state toggle: clicking active chip sets to null (clear), clicking inactive chip sets it as filter"
  - "allTags derived from cards.flatMap(tags) deduped with Set — includes all tags regardless of active filter"
  - "filteredCards uses Array.includes — cards with multiple tags appear under any of their tag filters, resolving the UAT STUDY-04c grouping bug"
  - "groupCardsByFirstTag retained unchanged in utils — STUDY-04a/04b pure function tests continue to pass"
metrics:
  duration_minutes: 5
  completed_date: "2026-06-01"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 2
---

# Phase 8 Plan 04: Gap Closure — Flat Table + Tag Filter Bar Summary

Replaced the h3 section-grouped card list in DeckDetailPage with a flat sortable Table and a tag filter chip bar, resolving UAT issues STUDY-04c (Tests 6 & 7).

## What Was Built

**DeckDetailPage flat table + tag filter bar:**
- Filter chip bar above the card table: one Button per unique tag (sorted A-Z), variant="outline" when inactive, variant="default" when active
- Clicking a chip filters the table to cards containing that tag; clicking again clears the filter
- Single flat Table with columns: #, Front, Tags, Actions — card index resets from 1 for filtered set
- Cards with multiple tags (e.g. `['bio', 'chem']`) appear under any of their tag filters — no "first tag wins" deduplication problem
- `groupCardsByFirstTag` import removed from DeckDetailPage (pure function retained in utils for its own tests)

**Updated STUDY-04c test:**
- Asserts `getByRole('button', { name: 'bio' })` and `getByRole('button', { name: 'chem' })` exist
- Asserts `queryByRole('heading', { level: 3, name: /bio/i })` is null (no h3 section headers)

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace grouped card list with flat table + tag filter bar | 129e52f | DeckDetailPage.tsx |
| 2 | Update STUDY-04c test to assert filter buttons | af1f508 | DeckDetailPage.test.tsx |
| 3 | Full test suite — no regressions | (verify only) | — |

## Test Results

- STUDY-04a: pass (groupCardsByFirstTag pure function — unchanged)
- STUDY-04b: pass (groupCardsByFirstTag pure function — unchanged)
- STUDY-04c: pass (tag filter buttons rendered, no h3 headers)
- Full suite: 67 tests, 9 test files — all pass

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- [x] apps/frontend/src/pages/DeckDetailPage.tsx — modified, groupCardsByFirstTag import removed, filterTag state added, flat table rendering
- [x] apps/frontend/src/pages/__tests__/DeckDetailPage.test.tsx — modified, STUDY-04c updated
- [x] Commit 129e52f — exists
- [x] Commit af1f508 — exists
- [x] 67/67 tests pass
