import { describe, it } from 'vitest'

// Behavioral contract for STATS-05: ReviewLog write on POST /api/study/rate
// The rate handler wraps cardProgress.upsert + reviewLog.create in prisma.$transaction (D-10).
// These tests document the required behavior; full mock-based coverage is a future test-harness task.

describe('POST /api/study/rate — ReviewLog audit trail (STATS-05)', () => {
  it.todo(
    'Test 1: a successful rate request inserts exactly one ReviewLog row with the correct userId, cardId, deckId, and rating'
  )

  it.todo(
    'Test 2: ReviewLog.deckId equals card.deckId fetched from the DB — never sourced from the request body (D-11)'
  )

  it.todo(
    'Test 3: when cardProgress.upsert throws inside the transaction, no ReviewLog row is inserted — atomicity enforced by prisma.$transaction rollback (D-10)'
  )

  it.todo(
    'Test 4: a rate request still returns 200 with the same response shape (cardId, nextReview, interval, easeFactor, repetitions) — backward compatibility preserved'
  )
})
