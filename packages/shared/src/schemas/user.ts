import { z } from 'zod'

export const UserRole = z.enum(['ADMIN', 'USER'])
export type UserRole = z.infer<typeof UserRole>

export const StudyModeSchema = z.enum(['normal', 'intensive', 'exam_prep'])
export type StudyMode = z.infer<typeof StudyModeSchema>

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: UserRole,
  isActive: z.boolean(),
  studyMode: StudyModeSchema.default('normal'),
  createdAt: z.coerce.date(),
  email: z.string().email().nullable().optional(),
})

export type User = z.infer<typeof UserSchema>

// Safe public shape — no sensitive fields. This is what the API returns.
export const UserResponseSchema = UserSchema

export type UserResponse = z.infer<typeof UserResponseSchema>

export const UpdateStudyModeSchema = z.object({
  studyMode: StudyModeSchema,
})
export type UpdateStudyModeInput = z.infer<typeof UpdateStudyModeSchema>

export const UpdateEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Valid email address required.'),
})
export type UpdateEmailInput = z.infer<typeof UpdateEmailSchema>

// Combined schema for PATCH /me — mirrors admin.ts's optional-field-merge convention
export const UpdateMeSchema = z
  .object({
    studyMode: StudyModeSchema.optional(),
    email: z.string().trim().toLowerCase().email('Valid email address required.').optional(),
  })
  .refine((data) => data.studyMode !== undefined || data.email !== undefined, {
    message: 'At least one field is required.',
  })
export type UpdateMeInput = z.infer<typeof UpdateMeSchema>
