-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_deckId_fkey";

-- DropForeignKey
ALTER TABLE "CardProgress" DROP CONSTRAINT "CardProgress_cardId_fkey";

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardProgress" ADD CONSTRAINT "CardProgress_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
