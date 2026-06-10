import { describe, it } from 'vitest'

// Behavioral contract for DashboardPage stats integration (Phase 15)
// These stubs document the required parallel fetch and failure isolation behavior.
// Full RTL assertions will replace these todos in Wave 2 (Plan 03).
// DO NOT import or render DashboardPage here — Wave 2 fills in real assertions.

describe('DashboardPage stats integration (Phase 15)', () => {
  it.todo(
    'fires /api/dashboard/stats and /api/stats/summary in parallel via Promise.allSettled (STATS-01)'
  )

  it.todo(
    'renders the hero section as soon as dashboard stats resolve, without waiting for the stats summary fetch'
  )

  it.todo(
    'when /api/stats/summary rejects, the dashboard hero still renders and no toast.error is shown (SC-5, T-15-04)'
  )

  it.todo(
    'passes statsLoading to StatsSummaryPanel so skeletons show while the summary fetch is pending'
  )
})
