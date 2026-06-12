-- AlterTable: Add isActive column to DeckShare (default true — zero-downtime, per-user library toggle)
ALTER TABLE "DeckShare" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
