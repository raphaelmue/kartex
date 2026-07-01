import { z } from 'zod'

// UI rating buttons 1–4 (mapped to SM-2 quality on the server)
export const RatingSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
])
export type Rating = z.infer<typeof RatingSchema>

// POST /api/study/rate request body
export const RateCardSchema = z.object({
  cardId: z.string().min(1),
  rating: RatingSchema,
})
export type RateCardInput = z.infer<typeof RateCardSchema>

// POST /api/study/rate response
export const RateCardResponseSchema = z.object({
  cardId: z.string(),
  nextReview: z.string(),
  interval: z.number(),
  easeFactor: z.number(),
  repetitions: z.number(),
})
export type RateCardResponse = z.infer<typeof RateCardResponseSchema>

// Card returned by GET /api/study/due and GET /api/study/deck/:deckId
export const DueCardSchema = z.object({
  id: z.string(),
  deckId: z.string(),
  deckTitle: z.string(),
  frontContent: z.string(),
  backContent: z.string(),
  tags: z.array(z.string()),
  easeFactor: z.number().default(2.5),
  interval: z.number().default(1),
  repetitions: z.number().default(0),
  nextReview: z.string().optional(),
  canEdit: z.boolean(),
})
export type DueCard = z.infer<typeof DueCardSchema>

// GET /api/dashboard/stats response
export const DashboardStatsSchema = z.object({
  totalDue: z.number(),
  reviewedToday: z.number(),
  streak: z.number(),
  byDeck: z.array(
    z.object({
      deckId: z.string(),
      deckTitle: z.string(),
      dueCount: z.number(),
    })
  ),
})
export type DashboardStats = z.infer<typeof DashboardStatsSchema>
