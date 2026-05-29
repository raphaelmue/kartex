import { z } from 'zod'

export const CreateShareSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  permission: z.enum(['READ', 'EDIT', 'MANAGE']).default('READ'),
})
export type CreateShareInput = z.infer<typeof CreateShareSchema>

export const UpdateShareSchema = z.object({
  permission: z.enum(['READ', 'EDIT', 'MANAGE']),
})
export type UpdateShareInput = z.infer<typeof UpdateShareSchema>

export const ShareSchema = z.object({
  id: z.string(),
  deckId: z.string(),
  sharedWithUserId: z.string(),
  permission: z.enum(['READ', 'EDIT', 'MANAGE']),
  sharedWithUser: z.object({ username: z.string() }),
})
export type Share = z.infer<typeof ShareSchema>

export const ExploreDeckSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  visibility: z.literal('PUBLIC'),
  ownerId: z.string(),
  owner: z.object({ username: z.string() }),
  _count: z.object({ cards: z.number() }).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type ExploreDeck = z.infer<typeof ExploreDeckSchema>
