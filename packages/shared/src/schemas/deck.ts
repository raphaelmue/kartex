import { z } from 'zod'

export const CreateDeckSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(200),
  description: z.string().max(2000).optional(),
  visibility: z.enum(['PRIVATE', 'SHARED', 'PUBLIC']).default('PRIVATE'),
  isActive: z.boolean().optional(),
})
export type CreateDeckInput = z.infer<typeof CreateDeckSchema>

export const UpdateDeckSchema = CreateDeckSchema.partial()
export type UpdateDeckInput = z.infer<typeof UpdateDeckSchema>

export const DeckSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  visibility: z.enum(['PRIVATE', 'SHARED', 'PUBLIC']),
  ownerId: z.string(),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
  _count: z.object({ cards: z.number() }).optional(),
})
export type Deck = z.infer<typeof DeckSchema>

export const DeckListItemSchema = DeckSchema.extend({
  sharedByUsername: z.string().optional(),
  owner: z.object({ username: z.string() }).optional(),
})
export type DeckListItem = z.infer<typeof DeckListItemSchema>
