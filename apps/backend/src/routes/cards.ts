import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { CreateCardSchema, UpdateCardSchema } from '@kartex/shared'

const cards = new Hono<{ Variables: { userId: string } }>()

// ─── Authorization helper ────────────────────────────────────────────────────
// Returns the caller's effective write-level access to a deck:
//   'owner'  — full control
//   'editor' — EDIT or MANAGE share (may create/update/delete cards)
//   'reader' — READ share (may list cards, no mutations)
//   null     — no access (deck not found or no share)
async function getDeckAccess(
  deckId: string,
  userId: string,
): Promise<'owner' | 'editor' | 'reader' | null> {
  const deck = await prisma.deck.findUnique({ where: { id: deckId }, select: { ownerId: true } })
  if (!deck) return null
  if (deck.ownerId === userId) return 'owner'
  const share = await prisma.deckShare.findUnique({
    where: { deckId_sharedWithUserId: { deckId, sharedWithUserId: userId } },
    select: { permission: true },
  })
  if (!share) return null
  return share.permission === 'READ' ? 'reader' : 'editor'
}

// GET /api/decks/:deckId/cards — list all cards in a deck
// Accessible to owner and any share recipient (READ, EDIT, or MANAGE).
cards.get('/', async (c) => {
  const deckId = c.req.param('deckId') as string
  const access = await getDeckAccess(deckId, c.get('userId'))
  if (!access) return c.json({ error: 'Not found.' }, 404)
  if (access === null) return c.json({ error: 'Forbidden.' }, 403)
  const rows = await prisma.card.findMany({
    where: { deckId },
    orderBy: { createdAt: 'asc' },
  })
  return c.json(rows, 200)
})

// POST /api/decks/:deckId/cards — create a card in a deck
// Requires EDIT or MANAGE share (or ownership).
cards.post('/', async (c) => {
  const deckId = c.req.param('deckId') as string
  const access = await getDeckAccess(deckId, c.get('userId'))
  if (access === null) return c.json({ error: 'Not found.' }, 404)
  if (access === 'reader') return c.json({ error: 'Forbidden.' }, 403)
  const body = CreateCardSchema.safeParse(await c.req.json())
  if (!body.success) {
    return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
  }
  const card = await prisma.card.create({ data: { ...body.data, deckId } })
  return c.json(card, 201)
})

// PATCH /api/decks/:deckId/cards/:cardId — update a card
// Requires EDIT or MANAGE share (or ownership).
cards.patch('/:cardId', async (c) => {
  const deckId = c.req.param('deckId') as string
  const cardId = c.req.param('cardId')
  const access = await getDeckAccess(deckId, c.get('userId'))
  if (access === null) return c.json({ error: 'Not found.' }, 404)
  if (access === 'reader') return c.json({ error: 'Forbidden.' }, 403)
  const card = await prisma.card.findUnique({ where: { id: cardId } })
  if (!card || card.deckId !== deckId) return c.json({ error: 'Not found.' }, 404)
  const body = UpdateCardSchema.safeParse(await c.req.json())
  if (!body.success) {
    return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
  }
  const updated = await prisma.card.update({ where: { id: cardId }, data: body.data })
  return c.json(updated, 200)
})

// DELETE /api/decks/:deckId/cards/:cardId — delete a card
// Requires EDIT or MANAGE share (or ownership).
cards.delete('/:cardId', async (c) => {
  const deckId = c.req.param('deckId') as string
  const cardId = c.req.param('cardId')
  const access = await getDeckAccess(deckId, c.get('userId'))
  if (access === null) return c.json({ error: 'Not found.' }, 404)
  if (access === 'reader') return c.json({ error: 'Forbidden.' }, 403)
  const card = await prisma.card.findUnique({ where: { id: cardId } })
  if (!card || card.deckId !== deckId) return c.json({ error: 'Not found.' }, 404)
  await prisma.card.delete({ where: { id: cardId } })
  return c.json({ message: 'Card deleted.' }, 200)
})

export { cards as cardsRouter }
