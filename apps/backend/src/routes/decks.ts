import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { CreateDeckSchema, UpdateDeckSchema, CreateShareSchema, UpdateShareSchema } from '@kartex/shared'
import { cardsRouter } from './cards.js'

const decks = new Hono<{ Variables: { userId: string } }>()

// Mount card sub-router: all routes at /:deckId/cards/* delegate to cardsRouter
decks.route('/:deckId/cards', cardsRouter)

// ─── Authorization helper ────────────────────────────────────────────────────
// Returns true if userId is the deck owner OR has MANAGE-level DeckShare.
// Per D-01: MANAGE-permission users can grant/revoke access (not just owner).
async function canManageDeck(deckId: string, userId: string): Promise<boolean> {
  const deck = await prisma.deck.findUnique({ where: { id: deckId } })
  if (!deck) return false
  if (deck.ownerId === userId) return true
  const share = await prisma.deckShare.findUnique({
    where: { deckId_sharedWithUserId: { deckId, sharedWithUserId: userId } },
  })
  return share?.permission === 'MANAGE'
}

// ─── GET /api/decks — own decks + shared decks (D-06) ────────────────────────
decks.get('/', async (c) => {
  const userId = c.get('userId')
  const [ownDecks, sharedRows] = await Promise.all([
    prisma.deck.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { cards: true } } },
    }),
    prisma.deckShare.findMany({
      where: { sharedWithUserId: userId },
      include: {
        deck: {
          include: {
            _count: { select: { cards: true } },
            owner: { select: { username: true } },
          },
        },
      },
    }),
  ])
  // Merge: own decks have no sharedByUsername; shared rows expose owner username.
  // Business rule: owner is never also a sharedWithUser (enforced in POST /:id/shares).
  const merged = [
    ...ownDecks,
    ...sharedRows.map((r) => ({
      ...r.deck,
      sharedByUsername: r.deck.owner.username,
    })),
  ]
  return c.json(merged, 200)
})

// ─── POST /api/decks — create a deck ────────────────────────────────────────
decks.post('/', async (c) => {
  const body = CreateDeckSchema.safeParse(await c.req.json())
  if (!body.success) {
    return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
  }
  const userId = c.get('userId')
  const deck = await prisma.deck.create({
    data: { ...body.data, ownerId: userId },
  })
  return c.json(deck, 201)
})

// ─── GET /api/decks/:id — single deck (owner OR share recipient) ─────────────
// Per research Open Question 2: relax ownership check to also allow DeckShare users.
// Returns userPermission field so frontend knows whether to show sharing panel.
decks.get('/:id', async (c) => {
  const { id } = c.req.param()
  const userId = c.get('userId')
  const deck = await prisma.deck.findUnique({
    where: { id },
    include: {
      _count: { select: { cards: true } },
      owner: { select: { username: true } },
    },
  })
  if (!deck) return c.json({ error: 'Not found.' }, 404)
  if (deck.ownerId === userId) {
    return c.json({ ...deck, userPermission: 'OWNER' }, 200)
  }
  const share = await prisma.deckShare.findUnique({
    where: { deckId_sharedWithUserId: { deckId: id, sharedWithUserId: userId } },
  })
  if (!share) return c.json({ error: 'Forbidden.' }, 403)
  return c.json({ ...deck, userPermission: share.permission }, 200)
})

// ─── PATCH /api/decks/:id — update deck (owner only) ────────────────────────
decks.patch('/:id', async (c) => {
  const { id } = c.req.param()
  const deck = await prisma.deck.findUnique({ where: { id } })
  if (!deck) return c.json({ error: 'Not found.' }, 404)
  if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)
  const body = UpdateDeckSchema.safeParse(await c.req.json())
  if (!body.success) {
    return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
  }
  const updated = await prisma.deck.update({ where: { id }, data: body.data })
  return c.json(updated, 200)
})

// ─── DELETE /api/decks/:id — delete deck (owner only) ───────────────────────
decks.delete('/:id', async (c) => {
  const { id } = c.req.param()
  const deck = await prisma.deck.findUnique({ where: { id } })
  if (!deck) return c.json({ error: 'Not found.' }, 404)
  if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)
  await prisma.deck.delete({ where: { id } })
  return c.json({ message: 'Deck deleted.' }, 200)
})

// ─── GET /api/decks/:id/shares — list shares (owner or MANAGE) ───────────────
decks.get('/:id/shares', async (c) => {
  const { id } = c.req.param()
  const userId = c.get('userId')
  if (!(await canManageDeck(id, userId))) {
    return c.json({ error: 'Forbidden.' }, 403)
  }
  const shares = await prisma.deckShare.findMany({
    where: { deckId: id },
    include: { sharedWithUser: { select: { username: true } } },
    orderBy: { sharedWithUser: { username: 'asc' } },
  })
  return c.json(shares, 200)
})

// ─── POST /api/decks/:id/shares — add a user (owner or MANAGE) ───────────────
// D-04: add by exact username. Returns generic "User not found." on miss.
decks.post('/:id/shares', async (c) => {
  const { id } = c.req.param()
  const userId = c.get('userId')
  if (!(await canManageDeck(id, userId))) {
    return c.json({ error: 'Forbidden.' }, 403)
  }
  const body = CreateShareSchema.safeParse(await c.req.json())
  if (!body.success) {
    return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
  }
  // Look up the target user by username
  const targetUser = await prisma.user.findUnique({
    where: { username: body.data.username },
    select: { id: true },
  })
  if (!targetUser) {
    return c.json({ error: 'User not found.' }, 404)
  }
  // Owner cannot be added as a share recipient
  const deck = await prisma.deck.findUnique({ where: { id }, select: { ownerId: true } })
  if (!deck) return c.json({ error: 'Not found.' }, 404)
  if (targetUser.id === deck.ownerId) {
    return c.json({ error: 'Cannot share a deck with its owner.' }, 409)
  }
  // Upsert: update permission if already exists; create if not
  const share = await prisma.deckShare.upsert({
    where: { deckId_sharedWithUserId: { deckId: id, sharedWithUserId: targetUser.id } },
    update: { permission: body.data.permission },
    create: { deckId: id, sharedWithUserId: targetUser.id, permission: body.data.permission },
    include: { sharedWithUser: { select: { username: true } } },
  })
  return c.json(share, 201)
})

// ─── PATCH /api/decks/:id/shares/:userId — update permission ─────────────────
decks.patch('/:id/shares/:sharedWithUserId', async (c) => {
  const { id, sharedWithUserId } = c.req.param()
  const userId = c.get('userId')
  if (!(await canManageDeck(id, userId))) {
    return c.json({ error: 'Forbidden.' }, 403)
  }
  const body = UpdateShareSchema.safeParse(await c.req.json())
  if (!body.success) {
    return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
  }
  const existing = await prisma.deckShare.findUnique({
    where: { deckId_sharedWithUserId: { deckId: id, sharedWithUserId } },
  })
  if (!existing) return c.json({ error: 'Share not found.' }, 404)
  const updated = await prisma.deckShare.update({
    where: { deckId_sharedWithUserId: { deckId: id, sharedWithUserId } },
    data: { permission: body.data.permission },
    include: { sharedWithUser: { select: { username: true } } },
  })
  return c.json(updated, 200)
})

// ─── DELETE /api/decks/:id/shares/:userId — revoke (owner or MANAGE) ─────────
decks.delete('/:id/shares/:sharedWithUserId', async (c) => {
  const { id, sharedWithUserId } = c.req.param()
  const userId = c.get('userId')
  if (!(await canManageDeck(id, userId))) {
    return c.json({ error: 'Forbidden.' }, 403)
  }
  const existing = await prisma.deckShare.findUnique({
    where: { deckId_sharedWithUserId: { deckId: id, sharedWithUserId } },
  })
  if (!existing) return c.json({ error: 'Share not found.' }, 404)
  await prisma.deckShare.delete({
    where: { deckId_sharedWithUserId: { deckId: id, sharedWithUserId } },
  })
  return c.json({ message: 'Access revoked.' }, 200)
})

export { decks as decksRouter }
