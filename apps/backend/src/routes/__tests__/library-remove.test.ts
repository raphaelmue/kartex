import { describe, it } from 'vitest'

// NOTE: Full integration tests require Prisma mocking or a test DB.
// These stubs define the expected behaviors for the DELETE /api/decks/:id/library
// endpoint introduced in Phase 19 Plan 01 (LIB-02).
// Fill in with vi.mock('../../../lib/prisma.js') in a future execution pass.

describe('DELETE /api/decks/:id/library — remove from library (LIB-02)', () => {
  it.todo('returns 204 and deletes the DeckShare row when the share recipient removes (D-08)')
  it.todo('returns 403 when no DeckShare row exists for (deckId, userId) (D-08, IDOR guard)')
  it.todo('does not delete CardProgress rows for the removed deck (D-09)')
  it.todo('removed deck no longer appears in the user\'s library / study queue (LIB-02 success criteria 2 and 3)')
})
