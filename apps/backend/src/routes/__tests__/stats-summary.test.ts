import { describe, it } from 'vitest'

// Behavioral contract for GET /api/stats/summary (STATS-01..04)
// These stubs lock the required behavior so Wave 1 implements against a fixed target.
// Full mock-based assertions will replace these todos in Wave 1 (Plan 02).

describe('GET /api/stats/summary — stats aggregation (STATS-01..04)', () => {
  it.todo(
    'STATS-01: returns totalReviewed = count of CardProgress rows for the authenticated userId (unique card/user pairs, all-time)'
  )

  it.todo(
    'STATS-01: returns weekReviewed = count of CardProgress rows where lastReviewed >= start of current week (Sunday 00:00)'
  )

  it.todo(
    'STATS-02: retentionRate is null when no ReviewLog rows exist for the user in the last 30 days — never 0'
  )

  it.todo(
    'STATS-02: retentionRate equals goodLast30 / totalLast30 (a float in [0,1]) where good = rating >= 3, when ReviewLog rows exist in the last 30 days'
  )

  it.todo(
    'STATS-03: difficultyBreakdown is null when no ReviewLog rows exist in the last 30 days — never a zero-filled object'
  )

  it.todo(
    'STATS-03: difficultyBreakdown maps rating 1->again, 2->hard, 3->good, 4->easy with missing buckets defaulting to 0'
  )

  it.todo(
    'STATS-04: perDeck lists every deck owned by the user, including decks with zero cards (zero counts, never omitted)'
  )

  it.todo(
    'STATS-04: perDeck masteredCount counts cards with progress.interval >= MASTERED_INTERVAL_DAYS (21) AND progress.repetitions >= MASTERED_REPETITIONS (3)'
  )

  it.todo(
    'security T-15-01: every Prisma query is scoped to userId from c.get(\'userId\') — never from URL params or request body'
  )
})
