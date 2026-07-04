-- Migration: 20260704000000_add_study_timers
-- Adds nullable thinkingTimeMs column to ReviewLog (Phase 30 study timers)
-- Adds StudySession + StudySessionDeck tables to track study session duration/deck scope
-- Safe on populated DB: thinkingTimeMs is nullable (no backfill needed, no DEFAULT),
-- both new tables are additive only — zero-downtime, no mutation of existing rows
-- (mirrors 20260609000000 safety).
-- Applied via: prisma migrate deploy (Docker Compose entrypoint)

-- AlterTable: Add nullable thinkingTimeMs column to ReviewLog (no DEFAULT — existing rows get NULL)
ALTER TABLE "ReviewLog" ADD COLUMN "thinkingTimeMs" INTEGER;

-- CreateTable: StudySession — one row per study session, tracks duration + cards reviewed (D-08/D-09)
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "cardsReviewed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable: StudySessionDeck — join table linking a StudySession to the decks it covers (D-09)
CREATE TABLE "StudySessionDeck" (
    "id" TEXT NOT NULL,
    "studySessionId" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,

    CONSTRAINT "StudySessionDeck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Compound index on (userId, startedAt) — covers "recent sessions" queries scoped by user
CREATE INDEX "StudySession_userId_startedAt_idx" ON "StudySession"("userId", "startedAt");

-- CreateIndex: Unique on (studySessionId, deckId) — prevents duplicate deck rows per session
CREATE UNIQUE INDEX "StudySessionDeck_studySessionId_deckId_key" ON "StudySessionDeck"("studySessionId", "deckId");

-- AddForeignKey: StudySession.userId → User.id (CASCADE — sessions removed when user deleted)
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: StudySessionDeck.studySessionId → StudySession.id (CASCADE — join rows removed when session deleted)
ALTER TABLE "StudySessionDeck" ADD CONSTRAINT "StudySessionDeck_studySessionId_fkey" FOREIGN KEY ("studySessionId") REFERENCES "StudySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: StudySessionDeck.deckId → Deck.id (CASCADE — join rows removed when deck deleted)
ALTER TABLE "StudySessionDeck" ADD CONSTRAINT "StudySessionDeck_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
