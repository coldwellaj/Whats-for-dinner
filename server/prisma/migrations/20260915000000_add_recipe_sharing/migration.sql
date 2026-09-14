-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "isShared" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Recipe_isShared_idx" ON "Recipe"("isShared");
