import { z } from 'zod'

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
})

export type LoginInput = z.infer<typeof LoginSchema>

export const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .max(20, 'Username must be at most 20 characters.')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Username can only contain letters, numbers, and underscores.',
    ),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  inviteCode: z.string().min(1, 'Invite code is required.'),
})

export type RegisterInput = z.infer<typeof RegisterSchema>
