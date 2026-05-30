import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

declare global {
  var prisma: PrismaClient | undefined
}

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  const adapter = new PrismaPg(url)
  return new PrismaClient({ adapter })
}

export const prisma = global.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}
