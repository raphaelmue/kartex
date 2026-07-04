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
  // Optional — re-flips may not carry a value; exam mode never rates (D-04)
  thinkingTimeMs: z.number().int().nonnegative().optional(),
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

// POST /api/study/session/start request body
export const StudySessionStartSchema = z.object({
  deckIds: z.array(z.string().min(1)).min(1),
})
export type StudySessionStartInput = z.infer<typeof StudySessionStartSchema>

// POST /api/study/session/start response
export const StudySessionStartResponseSchema = z.object({
  id: z.string(),
})
export type StudySessionStartResponse = z.infer<
  typeof StudySessionStartResponseSchema
>

// POST /api/study/session/complete request body
// Note: durationSeconds is NOT sent by the client — the server computes it
// authoritatively from startedAt -> completedAt (threat model: client-untrusted duration).
export const StudySessionCompleteSchema = z.object({
  sessionId: z.string().min(1),
  cardsReviewed: z.number().int().nonnegative(),
})
export type StudySessionCompleteInput = z.infer<
  typeof StudySessionCompleteSchema
>

// StudySession as returned in typed responses
export const StudySessionSchema = z.object({
  id: z.string(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  cardsReviewed: z.number().int().nonnegative(),
})
export type StudySession = z.infer<typeof StudySessionSchema>

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
