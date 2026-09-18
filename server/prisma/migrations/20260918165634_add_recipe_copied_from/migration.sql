-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "copiedFromId" TEXT;

-- CreateIndex
CREATE INDEX "Recipe_copiedFromId_idx" ON "Recipe"("copiedFromId");
