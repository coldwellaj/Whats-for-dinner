import { prisma } from "../db.js";
import { weekRange } from "./week.js";

/**
 * Recomputes the auto-generated (recipe-derived) shopping list items for a week from the
 * current meal plan, upserting quantities while preserving each item's checked state, and
 * removing auto items for ingredients no longer needed this week. Manual items are untouched.
 */
export async function reconcileAutoShoppingListItems(weekStartDate: string) {
  const { start, end } = weekRange(weekStartDate);

  const entries = await prisma.mealPlanEntry.findMany({
    where: { date: { gte: start, lt: end } },
    include: { recipe: { include: { ingredients: true } } },
  });

  const totals = new Map<string, { quantity: number | null; unit: string | null }>();
  for (const entry of entries) {
    for (const ri of entry.recipe.ingredients) {
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
    where: { weekStartDate, isManual: false },
  });
  const existingByIngredient = new Map(existingAutoItems.map((i) => [i.ingredientId, i]));

  const neededIngredientIds = new Set(totals.keys());

  await prisma.$transaction([
    // Remove auto items for ingredients no longer used this week
    prisma.shoppingListItem.deleteMany({
      where: {
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
        data: { weekStartDate, ingredientId, quantity, unit, isManual: false },
      });
    }),
  ]);
}
