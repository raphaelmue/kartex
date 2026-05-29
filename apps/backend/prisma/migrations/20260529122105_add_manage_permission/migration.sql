-- AlterEnum
ALTER TYPE "Permission" ADD VALUE 'MANAGE';

-- DropForeignKey
ALTER TABLE "DeckShare" DROP CONSTRAINT "DeckShare_deckId_fkey";

-- AddForeignKey
ALTER TABLE "DeckShare" ADD CONSTRAINT "DeckShare_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
