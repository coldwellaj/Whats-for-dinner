import { prisma } from "../db.js";
import { weekRange } from "./week.js";

export type OwnerScope = { userId: string; familyId: string | null };

function scopeWhere({ userId, familyId }: OwnerScope) {
  return familyId ? { familyId } : { familyId: null, userId };
}

/**
 * Recomputes the auto-generated (recipe-derived) shopping list items for a week from the
 * current meal plan, upserting quantities while preserving each item's checked state, and
 * removing auto items for ingredients no longer needed this week. Manual items are untouched.
 * Scoped to a family's shared plan when the caller is in one, else to just their own plan.
 */
// The ingredient lines a single meal-plan entry actually needs, after accounting for its own
// customization (see MealPlanEntry.hasCustomIngredients on the schema):
//  - Customized (has its own customIngredients rows, e.g. an ingredient was added, removed, or
//    substituted just for this occurrence): use those quantities as-is — they were already
//    entered for whatever serving size the user set at the time, so no further scaling.
//  - Not customized: use the recipe's own ingredients, scaled by (entry.servings /
//    recipe.servings) when the user overrode just the serving count without touching any
//    ingredient — e.g. "same recipe, but I'm making it for 6 instead of 4."
function effectiveIngredientLines(entry: {
  servings: number | null;
  hasCustomIngredients: boolean;
  customIngredients: { ingredientId: string; quantity: number | null; unit: string | null }[];
  recipe: { servings: number | null; ingredients: { ingredientId: string; quantity: number | null; unit: string | null }[] };
}) {
  if (entry.hasCustomIngredients) return entry.customIngredients;

  const scale = entry.servings != null && entry.recipe.servings ? entry.servings / entry.recipe.servings : 1;
  if (scale === 1) return entry.recipe.ingredients;
  return entry.recipe.ingredients.map((ri) => ({
    ...ri,
    quantity: ri.quantity != null ? ri.quantity * scale : null,
  }));
}

export async function reconcileAutoShoppingListItems(scope: OwnerScope, weekStartDate: string) {
  const { start, end } = weekRange(weekStartDate);
  const where = scopeWhere(scope);

  const entries = await prisma.mealPlanEntry.findMany({
    where: { ...where, date: { gte: start, lt: end } },
    include: { recipe: { include: { ingredients: true } }, customIngredients: true },
  });

  const totals = new Map<string, { quantity: number | null; unit: string | null }>();
  for (const entry of entries) {
    for (const ri of effectiveIngredientLines(entry)) {
      const existing = totals.get(ri.ingredientId);
      if (!existing) {
        totals.set(ri.ingredientId, { quantity: ri.quantity, unit: ri.unit });
        continue;
      }
      // Only sum quantities when units match (or both are unset); otherwise keep first and drop the amount.
      if (existing.unit === ri.unit && existing.quantity != null && ri.quantity != null) {
        existing.quantity += ri.quantity;
      } else if (existing.quantity != null || ri.quantity != null) {
        existing.quantity = null;
      }
    }
  }

  const existingAutoItems = await prisma.shoppingListItem.findMany({
    where: { ...where, weekStartDate, isManual: false },
  });
  const existingByIngredient = new Map(existingAutoItems.map((i) => [i.ingredientId, i]));

  const neededIngredientIds = new Set(totals.keys());

  await prisma.$transaction([
    // Remove auto items for ingredients no longer used this week
    prisma.shoppingListItem.deleteMany({
      where: {
        ...where,
        weekStartDate,
        isManual: false,
        ingredientId: { notIn: Array.from(neededIngredientIds) },
      },
    }),
    ...Array.from(totals.entries()).map(([ingredientId, { quantity, unit }]) => {
      const existing = existingByIngredient.get(ingredientId);
      if (existing) {
        return prisma.shoppingListItem.update({
          where: { id: existing.id },
          data: { quantity, unit },
        });
      }
      return prisma.shoppingListItem.create({
        data: { userId: scope.userId, familyId: scope.familyId, weekStartDate, ingredientId, quantity, unit, isManual: false },
      });
    }),
  ]);
}
