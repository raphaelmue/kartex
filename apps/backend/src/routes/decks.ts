import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { CreateDeckSchema, UpdateDeckSchema } from '@kartex/shared'
import { cardsRouter } from './cards.js'

const decks = new Hono<{ Variables: { userId: string } }>()

// Mount card sub-router: all routes at /:deckId/cards/* delegate to cardsRouter
decks.route('/:deckId/cards', cardsRouter)

// GET /api/decks — list authenticated user's own decks with card count
decks.get('/', async (c) => {
  const userId = c.get('userId')
  const rows = await prisma.deck.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { cards: true } } },
  })
  return c.json(rows, 200)
})

// POST /api/decks — create a deck
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

// GET /api/decks/:id — get a single deck (ownership check)
decks.get('/:id', async (c) => {
  const { id } = c.req.param()
  const deck = await prisma.deck.findUnique({
    where: { id },
    include: { _count: { select: { cards: true } } },
  })
  if (!deck) return c.json({ error: 'Not found.' }, 404)
  if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)
  return c.json(deck, 200)
})

// PATCH /api/decks/:id — update deck title, description, or visibility
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

// DELETE /api/decks/:id — delete deck (cascade deletes cards and progress via DB constraint)
decks.delete('/:id', async (c) => {
  const { id } = c.req.param()
  const deck = await prisma.deck.findUnique({ where: { id } })
  if (!deck) return c.json({ error: 'Not found.' }, 404)
  if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)
  await prisma.deck.delete({ where: { id } })
  return c.json({ message: 'Deck deleted.' }, 200)
})

export { decks as decksRouter }
