-- AlterTable: Add isActive column to Deck (default true — zero-downtime)
ALTER TABLE "Deck" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Add studyMode column to User (default 'normal' — Phase 11 prep)
ALTER TABLE "User" ADD COLUMN "studyMode" TEXT NOT NULL DEFAULT 'normal';
