-- Migration: 20260609000000_add_reviewlog_and_card_kartexid
-- Adds ReviewLog table for spaced-repetition audit trail (Phase 14 / Phase 15 stats)
-- Adds nullable kartexId column to Card for import-update matching (Phase 16)
-- Safe on populated DB: kartexId is nullable (no backfill needed), ReviewLog is a new table.
-- Applied via: prisma migrate deploy (Plan 03)

-- AlterTable: Add nullable kartexId column to Card (no DEFAULT — existing rows get NULL per D-01)
ALTER TABLE "Card" ADD COLUMN "kartexId" TEXT;

-- CreateIndex: Composite unique on (deckId, kartexId) — NULLs are treated as distinct in Postgres
-- so existing rows with NULL kartexId do NOT violate the constraint (D-02, D-17)
CREATE UNIQUE INDEX "Card_deckId_kartexId_key" ON "Card"("deckId", "kartexId");

-- CreateTable: ReviewLog — one row per rating event, append-only audit trail (D-05)
CREATE TABLE "ReviewLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Compound index on (userId, reviewedAt) — covers stats queries scoped by user + date range (D-08)
CREATE INDEX "ReviewLog_userId_reviewedAt_idx" ON "ReviewLog"("userId", "reviewedAt");

-- AddForeignKey: ReviewLog.userId → User.id (CASCADE — all logs removed when user deleted, D-07)
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ReviewLog.cardId → Card.id (CASCADE — logs removed when card deleted, D-06)
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
