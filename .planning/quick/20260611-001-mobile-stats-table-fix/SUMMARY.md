---
slug: mobile-stats-table-fix
status: complete
completed: 2026-06-11
commit: faf3973
---

Wrapped the per-deck due counts table in `DashboardPage` and the per-deck progress table in `StatsSummaryPanel` with `overflow-x-auto` containers. The 4-column stats table now scrolls horizontally on narrow viewports instead of pushing the layout wider than the screen.

Tests: 104/104 passed. Lint: 0 errors. Build: success.
</content>
</invoke>