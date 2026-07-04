import { describe, expect, it } from 'vitest'
import { RecentSessionSchema } from '@kartex/shared'

// Behavioral contract for GET /api/stats/summary extensions (TIMER-04)
// These stubs document the required behavior; full mock-based route coverage is a
// future test-harness task (see stats-summary.test.ts convention).

describe('GET /api/stats/summary — perDeck.avgThinkingTimeMs (TIMER-04)', () => {
  it.todo(
    'avgThinkingTimeMs is null for a deck with no captured ReviewLog.thinkingTimeMs values — never 0'
  )

  it.todo(
    'avgThinkingTimeMs equals the average of ReviewLog.thinkingTimeMs for that deck when values exist'
  )

  it.todo(
    'the groupBy aggregation is scoped to { userId, thinkingTimeMs: { not: null } } (T-15-01)'
  )
})

describe('GET /api/stats/summary — recentSessions (TIMER-04, D-08, D-11)', () => {
  it.todo(
    'recentSessions returns at most 10 rows ordered by startedAt desc'
  )

  it.todo(
    'an in-progress session (completedAt null) appears in recentSessions with completed=false (D-08)'
  )

  it.todo(
    'the recentSessions query is scoped by { userId } (T-15-01)'
  )

  it.todo(
    'each recentSessions row includes deckTitles derived from its StudySessionDeck join rows, supporting multi-deck sessions (D-09)'
  )
})

describe('Shared schema contract used by the stats response', () => {
  it('RecentSessionSchema parses a representative row', () => {
    const result = RecentSessionSchema.safeParse({
      id: 'sess-1',
      startedAt: '2026-07-04T00:00:00.000Z',
      durationSeconds: 120,
      cardsReviewed: 5,
      completed: false,
      deckTitles: ['Deck A'],
    })
    expect(result.success).toBe(true)
  })
})
