import { prisma } from "../db.js";

/**
 * Moves a user into a family: points their existing personal (familyId: null) recipes,
 * meal-plan entries, and shopping-list items at the family so they become shared, then
 * sets the user's own familyId. Used for family creation, accepting an invite by email,
 * and auto-joining on first login when an invite is waiting for that email.
 */
export async function joinFamily(userId: string, familyId: string) {
  await prisma.$transaction([
    prisma.recipe.updateMany({ where: { userId, familyId: null }, data: { familyId } }),
    prisma.mealPlanEntry.updateMany({ where: { userId, familyId: null }, data: { familyId } }),
    prisma.shoppingListItem.updateMany({ where: { userId, familyId: null }, data: { familyId } }),
    prisma.user.update({ where: { id: userId }, data: { familyId } }),
  ]);
}
