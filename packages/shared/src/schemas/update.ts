import { z } from 'zod'

export const DeckUpdatePreviewSchema = z.object({
  added: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  unchanged: z.number().int().nonnegative(),
  removed: z.number().int().nonnegative(),
})
export type DeckUpdatePreview = z.infer<typeof DeckUpdatePreviewSchema>

export const DeckUpdateResultSchema = DeckUpdatePreviewSchema.extend({
  deckId: z.string().min(1),
})
export type DeckUpdateResult = z.infer<typeof DeckUpdateResultSchema>
