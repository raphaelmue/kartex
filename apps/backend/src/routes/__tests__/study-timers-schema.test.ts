import { describe, expect, it } from 'vitest'
import {
  RateCardSchema,
  RecentSessionSchema,
  StudySessionCompleteSchema,
  StudySessionStartSchema,
} from '@kartex/shared'

// Behavioral contract for Phase 30 study-timer shared schemas (TIMER-02/03/04)

describe('RateCardSchema — thinkingTimeMs (optional, nonnegative int)', () => {
  it('accepts a valid payload with thinkingTimeMs', () => {
    const result = RateCardSchema.safeParse({
      cardId: 'card-1',
      rating: 3,
      thinkingTimeMs: 4200,
    })
    expect(result.success).toBe(true)
  })

  it('accepts a valid payload without thinkingTimeMs (optional)', () => {
    const result = RateCardSchema.safeParse({
      cardId: 'card-1',
      rating: 3,
    })
    expect(result.success).toBe(true)
  })

  it('rejects a negative thinkingTimeMs', () => {
    const result = RateCardSchema.safeParse({
      cardId: 'card-1',
      rating: 3,
      thinkingTimeMs: -1,
    })
    expect(result.success).toBe(false)
  })
})

describe('StudySessionStartSchema — deckIds (min 1)', () => {
  it('rejects an empty deckIds array', () => {
    const result = StudySessionStartSchema.safeParse({ deckIds: [] })
    expect(result.success).toBe(false)
  })

  it('accepts a non-empty deckIds array', () => {
    const result = StudySessionStartSchema.safeParse({ deckIds: ['d1'] })
    expect(result.success).toBe(true)
  })
})

describe('StudySessionCompleteSchema — sessionId + cardsReviewed', () => {
  it('accepts a valid payload', () => {
    const result = StudySessionCompleteSchema.safeParse({
      sessionId: 's1',
      cardsReviewed: 3,
    })
    expect(result.success).toBe(true)
  })

  it('rejects a negative cardsReviewed', () => {
    const result = StudySessionCompleteSchema.safeParse({
      sessionId: 's1',
      cardsReviewed: -1,
    })
    expect(result.success).toBe(false)
  })
})

describe('RecentSessionSchema — full valid row', () => {
  it('accepts a complete valid row', () => {
    const result = RecentSessionSchema.safeParse({
      id: 'sess-1',
      startedAt: '2026-07-04T00:00:00.000Z',
      durationSeconds: 120,
      cardsReviewed: 5,
      completed: true,
      deckTitles: ['Deck A', 'Deck B'],
    })
    expect(result.success).toBe(true)
  })
})
