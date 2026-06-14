import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

// ─── Prisma mock ─────────────────────────────────────────────────────────────
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    deckShare: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    cardProgress: {
      deleteMany: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma.js'
import { decksRouter } from '../decks.js'

// ─── Test app factory ─────────────────────────────────────────────────────────
function makeApp(userId = 'user-recipient') {
  const app = new Hono()
  app.use('*', (c, next) => {
    c.set('userId', userId)
    return next()
  })
  app.route('/decks', decksRouter)
  return app
}

const mockShare = {
  id: 'share-1',
  deckId: 'deck-abc',
  sharedWithUserId: 'user-recipient',
  permission: 'READ',
  isActive: true,
}

describe('DELETE /api/decks/:id/library — remove from library (LIB-02)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 204 and deletes the DeckShare row when the share recipient removes (D-08)', async () => {
    ;(prisma.deckShare.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockShare)
    ;(prisma.deckShare.delete as ReturnType<typeof vi.fn>).mockResolvedValue(mockShare)

    const app = makeApp('user-recipient')
    const res = await app.request('/decks/deck-abc/library', { method: 'DELETE' })

    expect(res.status).toBe(204)
    expect(prisma.deckShare.delete).toHaveBeenCalledWith({
      where: { deckId_sharedWithUserId: { deckId: 'deck-abc', sharedWithUserId: 'user-recipient' } },
    })
  })

  it('returns 403 when no DeckShare row exists for (deckId, userId) (D-08, IDOR guard)', async () => {
    ;(prisma.deckShare.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const app = makeApp('user-no-share')
    const res = await app.request('/decks/deck-abc/library', { method: 'DELETE' })

    expect(res.status).toBe(403)
    expect(prisma.deckShare.delete).not.toHaveBeenCalled()
  })

  it('does not delete CardProgress rows for the removed deck (D-09)', async () => {
    ;(prisma.deckShare.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockShare)
    ;(prisma.deckShare.delete as ReturnType<typeof vi.fn>).mockResolvedValue(mockShare)

    const app = makeApp('user-recipient')
    const res = await app.request('/decks/deck-abc/library', { method: 'DELETE' })

    expect(res.status).toBe(204)
    // CardProgress rows must NOT be deleted — study history is preserved
    expect(prisma.cardProgress.deleteMany).not.toHaveBeenCalled()
  })

  it.todo(
    "removed deck no longer appears in the user's library / study queue (LIB-02 success criteria 2 and 3) — " +
      'adequately covered by frontend DecksPage optimistic removal test (LIB-02d); ' +
      'a backend assertion requires a full GET /api/decks query with mocked DeckShare list ' +
      'which is out of scope for this unit-level DELETE test'
  )
})
