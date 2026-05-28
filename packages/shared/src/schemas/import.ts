import { z } from 'zod'

export const DeckHeaderSchema = z.object({
  deck: z.string().min(1),
  author: z.string().optional(),
  tags: z.array(z.string()).default([]),
})
export type DeckHeader = z.infer<typeof DeckHeaderSchema>

export const ParsedCardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  tags: z.array(z.string()).default([]),
})
export type ParsedCard = z.infer<typeof ParsedCardSchema>

export const ParseWarningSchema = z.object({
  cardIndex: z.number().int().positive(),
  reason: z.string().min(1),
})
export type ParseWarning = z.infer<typeof ParseWarningSchema>

export const KartexParseResultSchema = z.object({
  deck: DeckHeaderSchema,
  cards: z.array(ParsedCardSchema),
  warnings: z.array(ParseWarningSchema),
})
export type KartexParseResult = z.infer<typeof KartexParseResultSchema>

export const ImportResultSchema = z.object({
  deckId: z.string().min(1),
  cardCount: z.number().int().nonnegative(),
  warnings: z.array(ParseWarningSchema),
})
export type ImportResult = z.infer<typeof ImportResultSchema>

export const ImportConfigSchema = z.object({
  maxFileSizeBytes: z.number().int().positive(),
})
export type ImportConfig = z.infer<typeof ImportConfigSchema>
