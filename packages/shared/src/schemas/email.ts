import { z } from 'zod'

// Single source of truth for email normalization (trim → lowercase → validate).
// Every schema and route that reads/writes User.email or InviteToken.email must
// consume this factory instead of inlining the chain (closes WR-01).
export function normalizedEmail(message = 'Valid email address required.') {
  return z.string().trim().toLowerCase().email(message)
}
