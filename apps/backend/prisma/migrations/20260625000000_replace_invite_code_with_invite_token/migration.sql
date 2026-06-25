-- Replace InviteCode with InviteToken — implements EMAIL-03 through EMAIL-08
-- DROP InviteCode table (FK constraint must be removed first in Postgres).
-- CREATE InviteToken table.
-- Applied via `prisma migrate deploy` in Docker Compose entrypoint (entrypoint.sh).

-- Drop FK constraint before table drop
ALTER TABLE "InviteCode" DROP CONSTRAINT IF EXISTS "InviteCode_usedById_fkey";
DROP TABLE IF EXISTS "InviteCode";

-- Create InviteToken table
CREATE TABLE "InviteToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InviteToken_token_key" ON "InviteToken"("token");
