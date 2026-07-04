import { describe, expect, it } from 'vitest'
import { StudySessionCompleteSchema, StudySessionStartSchema } from '@kartex/shared'

// Behavioral contract for POST /api/study/session/start + /session/complete (TIMER-02, TIMER-03)
// These stubs document the required route behavior; full mock-based route coverage is a
// future test-harness task (see study-rate-reviewlog.test.ts convention).

describe('POST /api/study/rate — thinkingTimeMs passthrough (TIMER-02)', () => {
  it.todo(
    'a rate request with thinkingTimeMs stores it verbatim on the ReviewLog row inside the existing tx.reviewLog.create call'
  )

  it.todo(
    'a rate request without thinkingTimeMs stores NULL on the ReviewLog row (field is optional, never recomputed)'
  )
})

describe('POST /api/study/session/start — authorization (TIMER-03, T-30-02)', () => {
  it.todo(
    'rejects the whole request with 403 when any requested deckId is neither owned by the user nor actively shared with them'
  )

  it.todo(
    'creates one StudySession row plus one StudySessionDeck row per deckId when every deck is owned or actively shared'
  )

  it.todo(
    'returns { id } with 201 on success'
  )
})

describe('POST /api/study/session/complete — ownership + server-computed duration (TIMER-03, T-30-01, T-30-03)', () => {
  it.todo(
    'returns 404 when sessionId does not match any StudySession row'
  )

  it.todo(
    'returns 403 when session.userId !== the authenticated userId — never updates by id alone'
  )

  it.todo(
    'computes durationSeconds from session.startedAt -> now server-side; the request body has no duration field to read'
  )

  it.todo(
    'an exam-mode session (no /rate calls at all) can still be started and completed — StudySession tracking is independent of SM-2 persistence (D-07)'
  )
})

describe('Shared schema contract used by the session routes', () => {
  it('StudySessionCompleteSchema does not require a durationSeconds field', () => {
    const result = StudySessionCompleteSchema.safeParse({ sessionId: 's', cardsReviewed: 2 })
    expect(result.success).toBe(true)
  })

  it('StudySessionStartSchema rejects an empty deckIds array', () => {
    const result = StudySessionStartSchema.safeParse({ deckIds: [] })
    expect(result.success).toBe(false)
  })
})
