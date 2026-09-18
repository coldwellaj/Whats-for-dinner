import { prisma, Prisma } from "../db.js";

export type IngredientInput = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
};

// Finds or creates the shared Ingredient row for a name. `upsert` alone isn't safe here:
// two requests creating a recipe (or meal-plan customization) with the same brand-new
// ingredient name can both miss the SELECT and then race on the INSERT, so the loser's
// upsert throws a P2002 unique-constraint error instead of falling back to the row the
// winner just created. Catch that one case and re-fetch instead of letting it propagate.
export async function findOrCreateIngredient(name: string, defaultUnit: string | null) {
  try {
    return await prisma.ingredient.upsert({
      where: { name },
      update: {},
      create: { name, defaultUnit },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return prisma.ingredient.findUniqueOrThrow({ where: { name } });
    }
    throw err;
  }
}
