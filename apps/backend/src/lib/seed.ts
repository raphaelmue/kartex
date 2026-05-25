import bcrypt from 'bcryptjs'
import { prisma } from './prisma.js'

/**
 * Idempotent admin seed — called once at server startup.
 *
 * D-01: Creates admin from ADMIN_USERNAME + ADMIN_PASSWORD env vars.
 * D-02: Generates and prints the first invite code to stdout (one-time only).
 * D-03: Skips if an admin user already exists.
 */
export async function seedAdminIfNeeded(): Promise<void> {
  // D-03: Idempotent — skip if admin already exists
  const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (adminExists) return

  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD

  if (!username || !password) {
    console.warn(
      '[seed] ADMIN_USERNAME or ADMIN_PASSWORD not set — skipping admin seed',
    )
    return
  }

  // D-01: Create admin user
  const passwordHash = await bcrypt.hash(password, 12)
  const admin = await prisma.user.create({
    data: {
      username,
      passwordHash,
      role: 'ADMIN',
    },
  })

  // D-02: Generate first invite code and print once to stdout
  const code = crypto
    .randomUUID()
    .replace(/-/g, '')
    .slice(0, 12)
    .toUpperCase()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.inviteCode.create({
    data: {
      code,
      expiresAt,
    },
  })

  console.log(`[seed] Admin '${admin.username}' created.`)
  console.log(`[seed] First invite code: ${code} (expires ${expiresAt.toISOString()})`)
}
