import { z } from 'zod'

export const InviteTokenResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  expiresAt: z.string(),
  createdAt: z.string(),
})
export type InviteTokenResponse = z.infer<typeof InviteTokenResponseSchema>
