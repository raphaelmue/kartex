import { z } from 'zod'

export const CreateCardSchema = z.object({
  frontContent: z.string().min(1, 'Front content is required.').max(10000),
  backContent: z.string().min(1, 'Back content is required.').max(10000),
  tags: z.array(z.string()).default([]),
})
export type CreateCardInput = z.infer<typeof CreateCardSchema>

export const UpdateCardSchema = CreateCardSchema.partial()
export type UpdateCardInput = z.infer<typeof UpdateCardSchema>

export const CardSchema = z.object({
  id: z.string(),
  deckId: z.string(),
  frontContent: z.string(),
  backContent: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Card = z.infer<typeof CardSchema>
