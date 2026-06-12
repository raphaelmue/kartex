-- AlterTable: Add isActive column to DeckShare (default true — zero-downtime, per-user library toggle)
-- TODO: apply migration manually if prisma migrate deploy unavailable (no DATABASE_URL in dev env)
ALTER TABLE "DeckShare" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
