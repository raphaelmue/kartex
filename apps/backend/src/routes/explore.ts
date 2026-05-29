import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'

const explore = new Hono<{ Variables: { userId: string } }>()

// GET /api/explore — list all PUBLIC decks for the explore page (D-08, SHAR-04)
// Auth is inherited from global authMiddleware in index.ts (/api/* guard).
explore.get('/', async (c) => {
  const decks = await prisma.deck.findMany({
    where: { visibility: 'PUBLIC' },
    orderBy: { createdAt: 'desc' },
    include: {
      owner: { select: { username: true } },
      _count: { select: { cards: true } },
    },
  })
  return c.json(decks, 200)
})

export { explore as exploreRouter }
