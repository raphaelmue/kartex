---
phase: 04-study-loops
plan: 03
subsystem: ui
tags: [react, shadcn-ui, badge, table, spaced-repetition, dashboard]

# Dependency graph
requires:
  - phase: 04-01
    provides: GET /api/dashboard/stats endpoint, DashboardStats Zod schema and TypeScript type
  - phase: 04-02
    provides: /study and /decks/:id/learn routes already wired in App.tsx

provides:
  - DashboardPage React component at /dashboard route (replaces ComingSoon placeholder)
  - Hero section with totalDue large number and Start Studying CTA (navigates to /study)
  - Empty state when totalDue === 0 (CheckCircle2 icon, "You're all caught up!" copy)
  - Per-deck due counts Table with clickable deck name links to /decks/:deckId
  - Two stat chips: "Reviewed today" and "Streak" (D-08 locked layout)
  - shadcn Badge component (badge.tsx) installed for per-deck count display
affects: [phase-5-import, phase-6-explore]

# Tech tracking
tech-stack:
  added: [shadcn Badge component (class-variance-authority already present)]
  patterns:
    - DashboardPage fetches via api.get('/api/dashboard/stats') with toast.error on failure (T-4-10 mitigated)
    - navigate('/study') in onClick handler for Start Studying CTA (D-07 locked)
    - Per-deck table uses shadcn Table + Badge variant="secondary" for non-zero counts
    - Two stat chips use border/rounded-lg card pattern (not shadcn Card) per D-08

key-files:
  created:
    - apps/frontend/src/pages/DashboardPage.tsx
    - apps/frontend/src/components/ui/badge.tsx
  modified:
    - apps/frontend/src/App.tsx

key-decisions:
  - "shadcn Badge installed via npx shadcn@latest add badge — class-variance-authority was already a project dependency (^0.7.1)"
  - "Stat chips use inline border/rounded-lg divs rather than shadcn Card to stay minimal per UI-SPEC §1c and D-08"
  - "Empty state renders inside hero section (replaces CTA when totalDue === 0) rather than as a separate page section — matches UI-SPEC §1d intent"

patterns-established:
  - "Pattern: DashboardPage data fetch — api.get() with setLoading(true)/finally setLoading(false) + early return on !stats null guard"

requirements-completed: [STDY-06, STDY-07]

# Metrics
duration: 8min
completed: 2026-05-28
---

# Phase 4 Plan 03: Dashboard UI Summary

**DashboardPage with SM-2 due-count hero (text-5xl), Start Studying CTA navigating to /study, per-deck Table with Badge counts, and two stat chips (Reviewed today / Streak) wired at /dashboard replacing the ComingSoon placeholder**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-28T17:10:00Z
- **Completed:** 2026-05-28T17:22:00Z
- **Tasks:** 1
- **Files modified:** 3 (2 created + 1 modified)

## Accomplishments
- DashboardPage fully implements D-07 (hero) and D-08 (stat chips) locked decisions from CONTEXT.md
- Per-deck due counts table with clickable deck names linking to /decks/:deckId
- Empty state ("You're all caught up!") with CheckCircle2 icon when totalDue === 0
- document.title set to 'Dashboard — Kartex' per UI-SPEC convention
- shadcn Badge component installed (was missing — installed via npx shadcn add badge)
- /dashboard route in App.tsx now renders DashboardPage instead of ComingSoon
- TypeScript build clean, 31 tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: DashboardPage component + App.tsx route wiring** - `28b964e` (feat)

## Files Created/Modified
- `apps/frontend/src/pages/DashboardPage.tsx` — Hero due-count, Start Studying CTA, per-deck table, stat chips, empty state
- `apps/frontend/src/components/ui/badge.tsx` — shadcn Badge component (installed via npx shadcn@latest add badge)
- `apps/frontend/src/App.tsx` — Added DashboardPage import; replaced ComingSoon at /dashboard

## Decisions Made
- Installed shadcn Badge via `npx shadcn@latest add badge` since badge.tsx was absent from ui/ components — class-variance-authority was already present as ^0.7.1
- Used inline `border border-border rounded-lg p-4` divs for stat chips rather than shadcn Card to keep the layout minimal and match the UI-SPEC §1c spec

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing shadcn Badge component**
- **Found during:** Task 1 (pre-check before creating DashboardPage)
- **Issue:** Plan referenced `import { Badge } from '@/components/ui/badge'` but badge.tsx did not exist in apps/frontend/src/components/ui/ — the import would have caused a build error
- **Fix:** Ran `npx shadcn@latest add badge` from apps/frontend/ directory; badge.tsx created with `secondary` and `default` variants required by DashboardPage
- **Files modified:** apps/frontend/src/components/ui/badge.tsx (created)
- **Verification:** `yarn workspace @kartex/frontend build` exits 0 with badge import resolved
- **Committed in:** `28b964e` (Task 1 commit, alongside DashboardPage.tsx)

---

**Total deviations:** 1 auto-fixed (1 blocking dependency — missing shadcn component)
**Impact on plan:** Required for build to pass. No behavior change to planned implementation.

## Issues Encountered
- Pre-existing KartexRenderer.test.tsx failures (2 Typst tests) remain as baseline failures — confirmed unrelated to this plan's changes (same failures documented in 04-01 SUMMARY).

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Phase 4 (Study Loops) is fully complete: SM-2 API (04-01), study session UI (04-02), dashboard UI (04-03)
- Core value loop is live: open /dashboard → see due cards → Start Studying → rate cards → SM-2 updates → return to dashboard
- Phase 5 (Import) can proceed — no blockers from Phase 4
- /import route at ComingSoon, ready to be replaced in Phase 5

## Known Stubs
None — DashboardPage fetches real data from GET /api/dashboard/stats which returns live database aggregates.

---
*Phase: 04-study-loops*
*Completed: 2026-05-28*
