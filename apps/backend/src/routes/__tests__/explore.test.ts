import { describe, it } from 'vitest'

// NOTE: Integration tests requiring Prisma mocking.
// Fill with vi.mock('../../../lib/prisma.js') in a follow-up.

describe('GET /api/explore', () => {
  it.todo('returns only PUBLIC decks (SHAR-04)')
  it.todo('includes owner.username in each deck response')
  it.todo('returns empty array when no PUBLIC decks exist')
  it.todo('does not include PRIVATE or SHARED decks')
})

describe('POST /api/decks/:id/fork', () => {
  it.todo('creates new deck named "Copy of [title]" with PRIVATE visibility (SHAR-05, D-10, D-11)')
  it.todo('copies all cards to new deck (SHAR-05)')
  it.todo('new deck is owned by the requesting user (SHAR-05)')
  it.todo('source deck is unchanged after fork')
  it.todo('returns 403 when deck is PRIVATE and caller has no DeckShare (Pitfall 4)')
  it.todo('allows fork when deck is PRIVATE but caller has a DeckShare record')
  it.todo('returns 404 for non-existent deck')
})
