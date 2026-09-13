import { prisma } from "../db.js";

export type LastMadeInfo = {
  lastMadeAt: string | null;
  daysSinceLastMade: number | null;
};

function toInfo(lastMadeAt: Date | null): LastMadeInfo {
  if (!lastMadeAt) return { lastMadeAt: null, daysSinceLastMade: null };
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.floor((Date.now() - lastMadeAt.getTime()) / msPerDay);
  return { lastMadeAt: lastMadeAt.toISOString(), daysSinceLastMade: days };
}

/** Most recent MADE meal-plan entry date for a single recipe. */
export async function getLastMadeForRecipe(userId: string, recipeId: string): Promise<LastMadeInfo> {
  const entry = await prisma.mealPlanEntry.findFirst({
    where: { userId, recipeId, status: "MADE" },
    orderBy: { date: "desc" },
  });
  return toInfo(entry?.date ?? null);
}

/** Most recent MADE meal-plan entry date for many recipes at once, keyed by recipeId. */
export async function getLastMadeForRecipes(
  userId: string,
  recipeIds: string[]
): Promise<Record<string, LastMadeInfo>> {
  if (recipeIds.length === 0) return {};
  const entries = await prisma.mealPlanEntry.findMany({
    where: { userId, recipeId: { in: recipeIds }, status: "MADE" },
    orderBy: { date: "desc" },
  });
  const latestByRecipe = new Map<string, Date>();
  for (const entry of entries) {
    if (!latestByRecipe.has(entry.recipeId)) {
      latestByRecipe.set(entry.recipeId, entry.date);
    }
  }
  const result: Record<string, LastMadeInfo> = {};
  for (const id of recipeIds) {
    result[id] = toInfo(latestByRecipe.get(id) ?? null);
  }
  return result;
}
