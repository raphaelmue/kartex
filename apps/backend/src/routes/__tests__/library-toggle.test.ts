import { describe, it } from 'vitest'

// NOTE: Full integration tests require Prisma mocking or a test DB.
// These stubs define the expected behaviors for the PATCH /api/decks/:id/library
// endpoint introduced in Phase 18 Plan 01 (LIB-01).
// Fill in with vi.mock('../../../lib/prisma.js') in a future execution pass.

describe('PATCH /api/decks/:id/library — isActive toggle (LIB-01)', () => {
  it.todo('returns 200 + { isActive: false } when share recipient deactivates (D-09)')
  it.todo('returns 200 + { isActive: true } when share recipient re-activates (D-09)')
  it.todo('returns 403 when called by the deck owner (D-08)')
  it.todo('returns 403 when no DeckShare row exists for (deckId, userId) (D-08)')
  it.todo('returns 400 when body.isActive is missing or non-boolean (D-17)')
})

describe('GET /api/decks — isActive override for shared decks (LIB-01)', () => {
  it.todo('returns DeckShare.isActive (false) not Deck.isActive (true) for shared deck (D-06)')
  it.todo('returns DeckShare.isActive (true) for active shared deck (D-06)')
})
