import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { RateCardSchema } from '@kartex/shared'
import { calculateSM2, RATING_TO_QUALITY } from '../lib/sm2.js'

const study = new Hono<{ Variables: { userId: string } }>()

const STUDY_MODE_MULTIPLIERS: Record<string, number> = {
  normal: 1.0,
  intensive: 0.5,
  exam_prep: 0.25,
}

// GET /api/study/due — cards due today across all user's decks (STDY-01)
// Includes: cards with nextReview <= endOfToday AND new cards (no CardProgress row)
// Covers owned decks and decks shared with the user
study.get('/due', async (c) => {
  const userId = c.get('userId')
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  // Deck IDs shared with this user
  const sharedRows = await prisma.deckShare.findMany({
    where: { sharedWithUserId: userId },
    select: { deckId: true },
  })
  const sharedDeckIds = sharedRows.map((r: { deckId: string }) => r.deckId)

  const deckFilter = {
    OR: [
      { ownerId: userId, isActive: true },
      { id: { in: sharedDeckIds }, isActive: true },
    ],
  }

  // Cards WITH progress where nextReview is due today
  const dueWithProgress = await prisma.cardProgress.findMany({
    where: {
      userId,
      nextReview: { lte: endOfToday },
      card: { deck: deckFilter },
    },
    include: {
      card: {
        include: { deck: { select: { id: true, title: true } } },
      },
    },
    orderBy: { nextReview: 'asc' },
  })

  // Cards WITHOUT any progress for this user (never seen — always due)
  const cardIdsWithProgress: string[] = dueWithProgress.map(
    (p: (typeof dueWithProgress)[number]) => p.cardId
  )
  const neverSeen = await prisma.card.findMany({
    where: {
      deck: deckFilter,
      progress: { none: { userId } },
    },
    include: { deck: { select: { id: true, title: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const progressCards = dueWithProgress.map((p: (typeof dueWithProgress)[number]) => ({
    id: p.card.id,
    deckId: p.card.deckId,
    deckTitle: p.card.deck.title,
    frontContent: p.card.frontContent,
    backContent: p.card.backContent,
    tags: p.card.tags,
    easeFactor: p.easeFactor,
    interval: p.interval,
    repetitions: p.repetitions,
    nextReview: p.nextReview.toISOString(),
  }))

  const newCards = neverSeen
    .filter((card: (typeof neverSeen)[number]) => !cardIdsWithProgress.includes(card.id))
    .map((card: (typeof neverSeen)[number]) => ({
      id: card.id,
      deckId: card.deckId,
      deckTitle: card.deck.title,
      frontContent: card.frontContent,
      backContent: card.backContent,
      tags: card.tags,
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReview: undefined as string | undefined,
    }))

  const dueCards = [...progressCards, ...newCards]

  return c.json(dueCards, 200)
})

// GET /api/study/deck/:deckId — all cards in a deck (STDY-04)
// Returns all cards regardless of nextReview (for Deck Mode and Exam Mode)
study.get('/deck/:deckId', async (c) => {
  const userId = c.get('userId')
  const deckId = c.req.param('deckId')

  const deck = await prisma.deck.findUnique({ where: { id: deckId } })
  if (!deck) return c.json({ error: 'Not found.' }, 404)
  if (deck.ownerId !== userId) {
    const share = await prisma.deckShare.findUnique({
      where: { deckId_sharedWithUserId: { deckId, sharedWithUserId: userId } },
    })
    if (!share) return c.json({ error: 'Forbidden.' }, 403)
  }

  const cards = await prisma.card.findMany({
    where: { deckId },
    include: {
      progress: { where: { userId }, take: 1 },
      deck: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const result = cards.map((card: (typeof cards)[number]) => {
    const progress = card.progress[0]
    return {
      id: card.id,
      deckId: card.deckId,
      deckTitle: deck.title,
      frontContent: card.frontContent,
      backContent: card.backContent,
      tags: card.tags,
      easeFactor: progress?.easeFactor ?? 2.5,
      interval: progress?.interval ?? 1,
      repetitions: progress?.repetitions ?? 0,
      nextReview: progress?.nextReview.toISOString(),
    }
  })

  return c.json(result, 200)
})

// POST /api/study/rate — submit a recall rating for one card (STDY-02, STDY-03)
// Security: T-4-01 ownership check, T-4-02 rating validation, T-4-03 server-side SM-2
study.post('/rate', async (c) => {
  const body = RateCardSchema.safeParse(await c.req.json())
  if (!body.success) {
    return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
  }

  const { cardId, rating } = body.data
  const userId = c.get('userId')

  // T-4-01: Verify card exists and belongs to the authenticated user's deck
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { deck: { select: { ownerId: true, isActive: true } } },
  })
  if (!card) return c.json({ error: 'Not found.' }, 404)

  // Deck must be active regardless of ownership path (CR-02)
  if (!card.deck.isActive) return c.json({ error: 'Forbidden.' }, 403)

  if (card.deck.ownerId !== userId) {
    const share = await prisma.deckShare.findUnique({
      where: { deckId_sharedWithUserId: { deckId: card.deckId, sharedWithUserId: userId } },
    })
    if (!share) return c.json({ error: 'Forbidden.' }, 403)
  }

  // Fetch current CardProgress and user studyMode in parallel
  const [existing, ratingUser] = await Promise.all([
    prisma.cardProgress.findUnique({
      where: { userId_cardId: { userId, cardId } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { studyMode: true },
    }),
  ])

  // T-4-03: SM-2 runs server-side only — client sends rating 1-4, server computes nextReview
  const quality = RATING_TO_QUALITY[rating]
  const sm2 = calculateSM2({
    quality,
    repetitions: existing?.repetitions ?? 0,
    easeFactor: existing?.easeFactor ?? 2.5,
    interval: existing?.interval ?? 1,
  })

  // SM2-02: Apply study mode multiplier to nextReview only — interval stored raw (SM2-03)
  // T-11-05: unknown mode falls back to 1.0 (normal) — no amplification possible
  const multiplier = STUDY_MODE_MULTIPLIERS[ratingUser?.studyMode ?? 'normal'] ?? 1.0
  const adjustedNextReview = new Date()
  adjustedNextReview.setDate(
    adjustedNextReview.getDate() + Math.max(1, Math.ceil(sm2.interval * multiplier))
  )
  adjustedNextReview.setHours(0, 0, 0, 0)

  // Upsert CardProgress + write ReviewLog in one atomic transaction (D-10, STATS-05)
  // deckId taken from the already-loaded card variable — never from request body (D-11)
  const updated = await prisma.$transaction(async (tx) => {
    const upserted = await tx.cardProgress.upsert({
      where: { userId_cardId: { userId, cardId } },
      update: {
        easeFactor: sm2.easeFactor,
        interval: sm2.interval,
        repetitions: sm2.repetitions,
        nextReview: adjustedNextReview,
        lastReviewed: new Date(),
      },
      create: {
        userId,
        cardId,
        easeFactor: sm2.easeFactor,
        interval: sm2.interval,
        repetitions: sm2.repetitions,
        nextReview: adjustedNextReview,
        lastReviewed: new Date(),
      },
    })
    await tx.reviewLog.create({
      data: {
        userId,
        cardId,
        deckId: card.deckId,
        rating,
        reviewedAt: new Date(),
      },
    })
    return upserted
  })

  return c.json(
    {
      cardId: updated.cardId,
      nextReview: updated.nextReview.toISOString(),
      interval: updated.interval,
      easeFactor: updated.easeFactor,
      repetitions: updated.repetitions,
    },
    200
  )
})

export { study as studyRouter }
