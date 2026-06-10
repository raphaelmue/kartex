import { describe, it } from 'vitest'

// Behavioral contract for StatsSummaryPanel (STATS-01..04)
// These stubs document the required rendering behavior; full RTL assertions
// will replace these todos in Wave 2 (Plan 03).
// DO NOT import StatsSummaryPanel here — it does not exist until Wave 2.

describe('StatsSummaryPanel (STATS-01..04)', () => {
  it.todo(
    'renders skeleton placeholders (aria-busy) when loading is true'
  )

  it.todo(
    'renders Total Reviewed chip with totalReviewed value and \'this week\' sub-label (STATS-01)'
  )

  it.todo(
    'renders \'No data yet\' for retention chip when summary.retentionRate === null (STATS-02)'
  )

  it.todo(
    'renders rounded percentage when summary.retentionRate is a number (STATS-02)'
  )

  it.todo(
    'renders \'No data yet\' for difficulty chip when summary.difficultyBreakdown === null (STATS-03)'
  )

  it.todo(
    'renders per-deck rows for every deck including zero-card decks with zero counts (STATS-04)'
  )

  it.todo(
    'renders all chips in empty/zero state when summary === null'
  )
})
