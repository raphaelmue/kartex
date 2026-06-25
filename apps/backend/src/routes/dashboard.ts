import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { calculateStreak } from '../lib/sm2.js'

const dashboard = new Hono<{ Variables: { userId: string } }>()

// GET /api/dashboard/stats — due counts, reviewed today, streak (STDY-06, STDY-07)
dashboard.get('/stats', async (c) => {
  const userId = c.get('userId')

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  // Count cards reviewed today
  const reviewedToday = await prisma.cardProgress.count({
    where: {
      userId,
      lastReviewed: { gte: startOfToday },
    },
  })

  // Include decks shared with (added to library by) this user
  const sharedRows = await prisma.deckShare.findMany({
    where: { sharedWithUserId: userId, isActive: true },
    select: { deckId: true },
  })
  const activeSharedDeckIds = sharedRows.map((r: { deckId: string }) => r.deckId)

  const deckFilter = {
    OR: [
      { ownerId: userId, isActive: true },
      { id: { in: activeSharedDeckIds } },
    ],
  }

  // Due cards grouped by deck (cards WITH progress due today)
  const dueProgress = await prisma.cardProgress.findMany({
    where: {
      userId,
      nextReview: { lte: endOfToday },
      card: { deck: deckFilter },
    },
    select: {
      card: { select: { deck: { select: { id: true, title: true } } } },
    },
  })

  // Never-seen cards (no CardProgress row) — also due
  const neverSeen = await prisma.card.findMany({
    where: {
      deck: deckFilter,
      progress: { none: { userId } },
    },
    include: { deck: { select: { id: true, title: true } } },
  })

  // Group by deck in application code
  const deckMap = new Map<string, { deckId: string; deckTitle: string; dueCount: number }>()

  for (const p of dueProgress) {
    const { id, title } = p.card.deck
    const existing = deckMap.get(id)
    if (existing) {
      existing.dueCount++
    } else {
      deckMap.set(id, { deckId: id, deckTitle: title, dueCount: 1 })
    }
  }

  for (const card of neverSeen) {
    const { id, title } = card.deck
    const existing = deckMap.get(id)
    if (existing) {
      existing.dueCount++
    } else {
      deckMap.set(id, { deckId: id, deckTitle: title, dueCount: 1 })
    }
  }

  const byDeck = Array.from(deckMap.values())
  const totalDue = byDeck.reduce((sum, d) => sum + d.dueCount, 0)

  // Streak calculation: fetch all distinct lastReviewed dates, truncated to YYYY-MM-DD
  const reviewRecords = await prisma.cardProgress.findMany({
    where: { userId, lastReviewed: { not: null } },
    select: { lastReviewed: true },
  })

  const reviewDates: string[] = Array.from(
    new Set(
      reviewRecords
        .map((r: (typeof reviewRecords)[number]) => r.lastReviewed)
        .filter((d: Date | null): d is Date => d !== null)
        .map((d: Date) => d.toISOString().slice(0, 10))
    )
  )

  const streak = calculateStreak(reviewDates)

  return c.json(
    {
      totalDue,
      reviewedToday,
      streak,
      byDeck,
    },
    200
  )
})

export { dashboard as dashboardRouter }
