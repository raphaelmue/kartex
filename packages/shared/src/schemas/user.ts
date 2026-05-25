import { z } from 'zod'

export const UserRole = z.enum(['ADMIN', 'USER'])
export type UserRole = z.infer<typeof UserRole>

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: UserRole,
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
})

export type User = z.infer<typeof UserSchema>

// Safe public shape — no sensitive fields. This is what the API returns.
export const UserResponseSchema = UserSchema

export type UserResponse = z.infer<typeof UserResponseSchema>
