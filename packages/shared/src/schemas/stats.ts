import { z } from 'zod'

// Mastered card thresholds — locked by v1.3 research
// A card is considered mastered when: interval >= MASTERED_INTERVAL_DAYS AND repetitions >= MASTERED_REPETITIONS
export const MASTERED_INTERVAL_DAYS = 21
export const MASTERED_REPETITIONS = 3

export const DifficultyBreakdownSchema = z.object({
  easy: z.number().int().nonnegative(),
  good: z.number().int().nonnegative(),
  hard: z.number().int().nonnegative(),
  again: z.number().int().nonnegative(),
})
export type DifficultyBreakdown = z.infer<typeof DifficultyBreakdownSchema>

export const PerDeckProgressSchema = z.object({
  deckId: z.string().min(1),
  deckTitle: z.string(),
  dueCount: z.number().int().nonnegative(),
  masteredCount: z.number().int().nonnegative(),
  inLearningCount: z.number().int().nonnegative(),
  // null-on-empty convention — a deck with zero captured values is null, never 0
  avgThinkingTimeMs: z.number().nullable(),
})
export type PerDeckProgress = z.infer<typeof PerDeckProgressSchema>

export const RecentSessionSchema = z.object({
  id: z.string(),
  startedAt: z.string(),
  durationSeconds: z.number().int().nonnegative(),
  cardsReviewed: z.number().int().nonnegative(),
  completed: z.boolean(),
  deckTitles: z.array(z.string()),
})
export type RecentSession = z.infer<typeof RecentSessionSchema>

export const StatsSummarySchema = z.object({
  totalReviewed: z.number().int().nonnegative(),
  weekReviewed: z.number().int().nonnegative(),
  retentionRate: z.number().min(0).max(1).nullable(),
  difficultyBreakdown: DifficultyBreakdownSchema.nullable(),
  perDeck: z.array(PerDeckProgressSchema),
  // always an array — empty when no sessions, never null
  recentSessions: z.array(RecentSessionSchema),
})
export type StatsSummary = z.infer<typeof StatsSummarySchema>
