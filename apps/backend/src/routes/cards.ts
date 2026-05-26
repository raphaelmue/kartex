import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { CreateCardSchema, UpdateCardSchema } from '@kartex/shared'

const cards = new Hono<{ Variables: { userId: string } }>()

// GET /api/decks/:deckId/cards — list all cards in a deck (ownership check on deck)
cards.get('/', async (c) => {
  const deckId = c.req.param('deckId') as string
  const deck = await prisma.deck.findUnique({ where: { id: deckId } })
  if (!deck) return c.json({ error: 'Not found.' }, 404)
  if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)
  const rows = await prisma.card.findMany({
    where: { deckId },
    orderBy: { createdAt: 'asc' },
  })
  return c.json(rows, 200)
})

// POST /api/decks/:deckId/cards — create a card in a deck
cards.post('/', async (c) => {
  const deckId = c.req.param('deckId') as string
  const deck = await prisma.deck.findUnique({ where: { id: deckId } })
  if (!deck) return c.json({ error: 'Not found.' }, 404)
  if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)
  const body = CreateCardSchema.safeParse(await c.req.json())
  if (!body.success) {
    return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
  }
  const card = await prisma.card.create({ data: { ...body.data, deckId } })
  return c.json(card, 201)
})

// PATCH /api/decks/:deckId/cards/:cardId — update a card
cards.patch('/:cardId', async (c) => {
  const deckId = c.req.param('deckId') as string
  const cardId = c.req.param('cardId')
  const deck = await prisma.deck.findUnique({ where: { id: deckId } })
  if (!deck) return c.json({ error: 'Not found.' }, 404)
  if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)
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
cards.delete('/:cardId', async (c) => {
  const deckId = c.req.param('deckId') as string
  const cardId = c.req.param('cardId')
  const deck = await prisma.deck.findUnique({ where: { id: deckId } })
  if (!deck) return c.json({ error: 'Not found.' }, 404)
  if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)
  const card = await prisma.card.findUnique({ where: { id: cardId } })
  if (!card || card.deckId !== deckId) return c.json({ error: 'Not found.' }, 404)
  await prisma.card.delete({ where: { id: cardId } })
  return c.json({ message: 'Card deleted.' }, 200)
})

export { cards as cardsRouter }
