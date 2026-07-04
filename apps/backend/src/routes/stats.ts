import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { MASTERED_INTERVAL_DAYS, MASTERED_REPETITIONS } from '@kartex/shared'

const stats = new Hono<{ Variables: { userId: string } }>()

// GET /api/stats/summary — per-user stats: totals, retention, difficulty, per-deck (STATS-01..04)
stats.get('/summary', async (c) => {
  const userId = c.get('userId')

  // ─── Date boundaries ────────────────────────────────────────────────────────
  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()) // Sunday start
  startOfWeek.setHours(0, 0, 0, 0)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  // ─── STATS-01: total reviewed (all-time) + this-week from CardProgress ──────
  const totalReviewed = await prisma.cardProgress.count({
    where: { userId },
  })

  const weekReviewed = await prisma.cardProgress.count({
    where: {
      userId,
      lastReviewed: { gte: startOfWeek },
    },
  })

  // ─── STATS-02: retention rate from ReviewLog (last 30 days) ─────────────────
  // rating >= 3 (Good or Easy) counts as a "successful" review
  const [totalLast30, goodLast30] = await Promise.all([
    prisma.reviewLog.count({
      where: { userId, reviewedAt: { gte: thirtyDaysAgo } },
    }),
    prisma.reviewLog.count({
      where: { userId, reviewedAt: { gte: thirtyDaysAgo }, rating: { gte: 3 } },
    }),
  ])

  // CRITICAL: null on empty — never return 0 when no review history (T-15-02, Pitfall 1)
  const retentionRate = totalLast30 === 0 ? null : goodLast30 / totalLast30

  // ─── STATS-03: difficulty breakdown from ReviewLog (last 30 days) ────────────
  const breakdown = await prisma.reviewLog.groupBy({
    by: ['rating'],
    where: { userId, reviewedAt: { gte: thirtyDaysAgo } },
    _count: { rating: true },
  })

  // CRITICAL: null on empty — never zero-fill when no review history (T-15-02, Pitfall 7)
  const difficultyBreakdown =
    breakdown.length === 0
      ? null
      : {
          again: breakdown.find((r: (typeof breakdown)[number]) => r.rating === 1)?._count.rating ?? 0,
          hard: breakdown.find((r: (typeof breakdown)[number]) => r.rating === 2)?._count.rating ?? 0,
          good: breakdown.find((r: (typeof breakdown)[number]) => r.rating === 3)?._count.rating ?? 0,
          easy: breakdown.find((r: (typeof breakdown)[number]) => r.rating === 4)?._count.rating ?? 0,
        }

  // ─── STATS-04: per-deck progress — all owned decks (incl. zero-card) ─────────
  // Nested progress: { where: { userId } } is MANDATORY — prevents cross-user data (Pitfall 4, T-15-01)
  const decks = await prisma.deck.findMany({
    where: { ownerId: userId },
    select: {
      id: true,
      title: true,
      cards: {
        select: {
          progress: {
            where: { userId },
            select: {
              interval: true,
              repetitions: true,
              nextReview: true,
            },
          },
        },
      },
    },
  })

  // ─── TIMER-04: per-deck average flip time from ReviewLog.thinkingTimeMs ─────
  const avgThinkingTimeByDeck = await prisma.reviewLog.groupBy({
    by: ['deckId'],
    where: { userId, thinkingTimeMs: { not: null } },
    _avg: { thinkingTimeMs: true },
  })

  const perDeck = decks.map((deck: (typeof decks)[number]) => {
    let dueCount = 0
    let masteredCount = 0
    let inLearningCount = 0

    for (const card of deck.cards) {
      const progress = card.progress[0]
      if (!progress) {
        // Never-seen card — always due
        dueCount++
      } else {
        if (progress.nextReview <= endOfToday) dueCount++
        if (
          progress.interval >= MASTERED_INTERVAL_DAYS &&
          progress.repetitions >= MASTERED_REPETITIONS
        ) {
          masteredCount++
        } else {
          inLearningCount++
        }
      }
    }

    // CRITICAL: null on empty — never 0 when no thinkingTimeMs values captured (T-15-02 convention)
    const avgGroup = avgThinkingTimeByDeck.find(
      (g: (typeof avgThinkingTimeByDeck)[number]) => g.deckId === deck.id
    )
    const avgThinkingTimeMs = avgGroup?._avg.thinkingTimeMs ?? null

    return {
      deckId: deck.id,
      deckTitle: deck.title,
      dueCount,
      masteredCount,
      inLearningCount,
      avgThinkingTimeMs,
    }
  })

  // ─── TIMER-04: last 10 recent sessions (D-11), each with deck titles + completed flag ──
  const sessions = await prisma.studySession.findMany({
    where: { userId },
    orderBy: { startedAt: 'desc' },
    take: 10,
    include: { decks: { include: { deck: { select: { title: true } } } } },
  })

  const recentSessions = sessions.map((session: (typeof sessions)[number]) => ({
    id: session.id,
    startedAt: session.startedAt.toISOString(),
    durationSeconds: session.durationSeconds ?? 0,
    cardsReviewed: session.cardsReviewed,
    completed: session.completedAt !== null,
    deckTitles: session.decks.map((d: (typeof session.decks)[number]) => d.deck.title),
  }))

  return c.json(
    { totalReviewed, weekReviewed, retentionRate, difficultyBreakdown, perDeck, recentSessions },
    200
  )
})

export { stats as statsRouter }
