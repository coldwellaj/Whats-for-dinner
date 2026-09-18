-- AlterTable
ALTER TABLE "MealPlanEntry" ADD COLUMN     "servings" INTEGER,
ADD COLUMN     "hasCustomIngredients" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MealPlanEntryIngredient" (
    "id" TEXT NOT NULL,
    "mealPlanEntryId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "notes" TEXT,

    CONSTRAINT "MealPlanEntryIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MealPlanEntryIngredient_mealPlanEntryId_idx" ON "MealPlanEntryIngredient"("mealPlanEntryId");

-- CreateIndex
CREATE INDEX "MealPlanEntryIngredient_ingredientId_idx" ON "MealPlanEntryIngredient"("ingredientId");

-- AddForeignKey
ALTER TABLE "MealPlanEntryIngredient" ADD CONSTRAINT "MealPlanEntryIngredient_mealPlanEntryId_fkey" FOREIGN KEY ("mealPlanEntryId") REFERENCES "MealPlanEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanEntryIngredient" ADD CONSTRAINT "MealPlanEntryIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
