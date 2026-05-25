import { z } from 'zod'

export const InviteCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  expiresAt: z.coerce.date(),
  usedAt: z.coerce.date().nullable(),
  usedById: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export type InviteCode = z.infer<typeof InviteCodeSchema>

export type InviteCodeStatus = 'active' | 'used' | 'expired'

/**
 * Derive the status of an invite code from its fields.
 * - 'used'    — usedAt is set (code was consumed by a registration)
 * - 'expired' — expiresAt is in the past
 * - 'active'  — code is still valid and unused
 */
export function getInviteCodeStatus(code: Pick<InviteCode, 'usedAt' | 'expiresAt'>): InviteCodeStatus {
  if (code.usedAt !== null) return 'used'
  if (code.expiresAt < new Date()) return 'expired'
  return 'active'
}
