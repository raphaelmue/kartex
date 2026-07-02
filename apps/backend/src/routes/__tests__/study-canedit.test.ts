import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

// Behavioral contract for SEDIT-01: canEdit computation in GET /api/study/due
// and GET /api/study/deck/:deckId. canEdit mirrors the owner / active-EDIT-or-MANAGE
// permission rule established by cards.ts's getDeckAccess helper — never invented anew.

// ─── Prisma mock ─────────────────────────────────────────────────────────────
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    deckShare: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    deck: {
      findUnique: vi.fn(),
    },
    cardProgress: {
      findMany: vi.fn(),
    },
    card: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma.js'
import { studyRouter } from '../study.js'

// ─── Test app factory ─────────────────────────────────────────────────────────
function makeApp(userId = 'user-1') {
  const app = new Hono()
  app.use('*', (c, next) => {
    c.set('userId', userId)
    return next()
  })
  app.route('/study', studyRouter)
  return app
}

function neverSeenCard(deckId: string, deckOwnerId: string) {
  return {
    id: 'card-1',
    deckId,
    frontContent: 'Front',
    backContent: 'Back',
    tags: [] as string[],
    deck: { id: deckId, title: 'Deck', ownerId: deckOwnerId },
  }
}

describe('study canEdit computation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // No cards with existing CardProgress in any test here — every fixture
    // card is exercised via the "never seen" path (dueWithProgress stays empty).
    ;(prisma.cardProgress.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
  })

  describe('GET /api/study/due', () => {
    it('Test 1: returns canEdit=true for a card in a deck owned by the requesting user', async () => {
      ;(prisma.deckShare.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
      ;(prisma.card.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        neverSeenCard('deck-1', 'user-1'),
      ])

      const app = makeApp('user-1')
      const res = await app.request('/study/due')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body[0].canEdit).toBe(true)
    })

    it('Test 2: returns canEdit=true for a card in a deck shared via an active EDIT-permission share', async () => {
      ;(prisma.deckShare.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { deckId: 'deck-1', permission: 'EDIT' },
      ])
      ;(prisma.card.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        neverSeenCard('deck-1', 'owner-other'),
      ])

      const app = makeApp('user-1')
      const res = await app.request('/study/due')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body[0].canEdit).toBe(true)
    })

    it('Test 3: returns canEdit=true for a card in a deck shared via an active MANAGE-permission share', async () => {
      ;(prisma.deckShare.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { deckId: 'deck-1', permission: 'MANAGE' },
      ])
      ;(prisma.card.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        neverSeenCard('deck-1', 'owner-other'),
      ])

      const app = makeApp('user-1')
      const res = await app.request('/study/due')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body[0].canEdit).toBe(true)
    })

    it('Test 4: returns canEdit=false for a card in a deck shared via a READ-permission share', async () => {
      ;(prisma.deckShare.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { deckId: 'deck-1', permission: 'READ' },
      ])
      ;(prisma.card.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        neverSeenCard('deck-1', 'owner-other'),
      ])

      const app = makeApp('user-1')
      const res = await app.request('/study/due')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body[0].canEdit).toBe(false)
    })

    it('Test 5: returns canEdit=false for a card whose deck the user neither owns nor has any share on', async () => {
      ;(prisma.deckShare.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
      ;(prisma.card.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        neverSeenCard('deck-1', 'owner-other'),
      ])

      const app = makeApp('user-1')
      const res = await app.request('/study/due')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body[0].canEdit).toBe(false)
    })
  })

  describe('GET /api/study/deck/:deckId', () => {
    it('Test 6: returns 403 (not a downgraded view-only 200) when the caller\'s EDIT share has isActive=false (Pitfall 5, CR-02)', async () => {
      ;(prisma.deck.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'deck-1',
        ownerId: 'owner-other',
        title: 'Deck',
      })
      ;(prisma.deckShare.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        permission: 'EDIT',
        isActive: false,
      })

      const app = makeApp('user-1')
      const res = await app.request('/study/deck/deck-1')

      // A revoked share must deny access entirely — not silently downgrade to
      // permanent view-only access (the bug fixed by CR-02).
      expect(res.status).toBe(403)
      expect(prisma.card.findMany).not.toHaveBeenCalled()
    })
  })
})
