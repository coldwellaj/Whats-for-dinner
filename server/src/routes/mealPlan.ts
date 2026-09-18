import { Router } from "express";
import { prisma, Prisma } from "../db.js";
import { findOrCreateIngredient, type IngredientInput } from "../lib/ingredients.js";
import { reconcileAutoShoppingListItems } from "../lib/shoppingList.js";
import { weekStartKeyFor } from "../lib/week.js";
import { isMealPlanStatus, isMealType } from "../lib/types.js";
import { scopeWhere } from "../middleware/requireAuth.js";
import { RECIPE_SELECT_BASE } from "./recipes.js";

export const mealPlanRouter = Router();

// Selects the fields the meal-plan grid needs, via explicit `select` rather than `include:
// { recipe: true }` (which used to pull every Recipe scalar into the response, including the
// `photo` bytes column — see the select-not-include comment on RECIPE_SELECT_BASE in
// recipes.ts) — plus this entry's own servings/customization flags.
const MEAL_PLAN_ENTRY_SELECT = {
  id: true,
  date: true,
  mealType: true,
  recipeId: true,
  status: true,
  servings: true,
  hasCustomIngredients: true,
  recipe: { select: RECIPE_SELECT_BASE },
} satisfies Prisma.MealPlanEntrySelect;

// Adds the recipe's own ingredients and this entry's customIngredients (each with the shared
// Ingredient row) on top of MEAL_PLAN_ENTRY_SELECT — everything the "customize this meal"
// popup needs to show current vs. recipe-default ingredients side by side.
const MEAL_PLAN_ENTRY_DETAIL_SELECT = {
  id: true,
  date: true,
  mealType: true,
  recipeId: true,
  status: true,
  servings: true,
  hasCustomIngredients: true,
  recipe: { select: { ...RECIPE_SELECT_BASE, ingredients: { include: { ingredient: true } } } },
  customIngredients: { include: { ingredient: true } },
} satisfies Prisma.MealPlanEntrySelect;

// Resolves a submitted ingredient list (name/quantity/unit/notes) into rows ready for a
// nested `customIngredients` create, looking up/creating the shared Ingredient row for each
// name — mirrors recipes.ts's upsertIngredientsForRecipe, but for a meal-plan entry's own
// override list instead of a Recipe's.
async function resolveIngredientRows(ingredients: IngredientInput[]) {
  const rows: { ingredientId: string; quantity: number | null; unit: string | null; notes: string | null }[] = [];
  for (const ing of ingredients) {
    const name = ing.name.trim();
    if (!name) continue;
    const ingredient = await findOrCreateIngredient(name, ing.unit ?? null);
    rows.push({ ingredientId: ingredient.id, quantity: ing.quantity ?? null, unit: ing.unit ?? null, notes: ing.notes ?? null });
  }
  return rows;
}

function isValidServings(servings: unknown): servings is number {
  return typeof servings === "number" && Number.isInteger(servings) && servings > 0;
}

// GET /api/meal-plan?start=YYYY-MM-DD&end=YYYY-MM-DD
mealPlanRouter.get("/", async (req, res) => {
  const { start, end } = req.query as { start?: string; end?: string };
  if (!start || !end) {
    return res.status(400).json({ error: "start and end query params are required" });
  }
  const entries = await prisma.mealPlanEntry.findMany({
    where: {
      ...scopeWhere(req),
      date: {
        gte: new Date(`${start}T00:00:00.000Z`),
        lt: new Date(`${end}T00:00:00.000Z`),
      },
    },
    select: MEAL_PLAN_ENTRY_SELECT,
    orderBy: [{ date: "asc" }, { mealType: "asc" }],
  });
  res.json(entries);
});

// GET /api/meal-plan/:id — full detail (recipe's own ingredients plus this entry's
// customization, if any) for the "customize this meal" popup.
mealPlanRouter.get("/:id", async (req, res) => {
  const entry = await prisma.mealPlanEntry.findFirst({
    where: { id: req.params.id, ...scopeWhere(req) },
    select: MEAL_PLAN_ENTRY_DETAIL_SELECT,
  });
  if (!entry) return res.status(404).json({ error: "Meal plan entry not found" });
  res.json(entry);
});

// POST /api/meal-plan  { date, mealType, recipeId, servings?, ingredients? } — servings and
// ingredients are optional per-occurrence overrides; omitting both plans the recipe exactly
// as written (the common case). See MealPlanEntry's schema comments for what each means.
mealPlanRouter.post("/", async (req, res) => {
  const { date, mealType, recipeId, servings, ingredients } = req.body as {
    date: string;
    mealType: string;
    recipeId: string;
    servings?: number | null;
    ingredients?: IngredientInput[] | null;
  };
  if (!date || !mealType || !recipeId) {
    return res.status(400).json({ error: "date, mealType and recipeId are required" });
  }
  if (!isMealType(mealType)) {
    return res.status(400).json({ error: "Invalid mealType" });
  }
  if (servings != null && !isValidServings(servings)) {
    return res.status(400).json({ error: "Servings must be a positive whole number" });
  }
  const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, ...scopeWhere(req) } });
  if (!recipe) return res.status(404).json({ error: "Recipe not found" });

  const ingredientRows = ingredients != null ? await resolveIngredientRows(ingredients) : null;

  const entryDate = new Date(`${date}T00:00:00.000Z`);
  const entry = await prisma.mealPlanEntry.create({
    data: {
      userId: req.userId,
      familyId: req.familyId,
      date: entryDate,
      mealType,
      recipeId,
      servings: servings ?? null,
      ...(ingredientRows ? { hasCustomIngredients: true, customIngredients: { create: ingredientRows } } : {}),
    },
    select: MEAL_PLAN_ENTRY_SELECT,
  });
  await reconcileAutoShoppingListItems({ userId: req.userId, familyId: req.familyId }, weekStartKeyFor(entryDate));
  res.status(201).json(entry);
});

// PUT /api/meal-plan/:id  { date?, mealType?, recipeId?, status?, servings?, ingredients? } —
// `servings: null` clears the serving-size override (back to the recipe's own); `ingredients:
// null` clears ingredient customization entirely (back to following the recipe's ingredients
// live); `ingredients: [...]` (even empty, meaning "remove everything") replaces this entry's
// override list. Changing recipeId resets both, since a customization made for one recipe
// doesn't make sense carried over to a different one, unless the same request also supplies
// a fresh `ingredients` list for the new recipe.
mealPlanRouter.put("/:id", async (req, res) => {
  const existing = await prisma.mealPlanEntry.findFirst({ where: { id: req.params.id, ...scopeWhere(req) } });
  if (!existing) return res.status(404).json({ error: "Meal plan entry not found" });

  const { date, mealType, recipeId, status, servings, ingredients } = req.body as {
    date?: string;
    mealType?: string;
    recipeId?: string;
    status?: string;
    servings?: number | null;
    ingredients?: IngredientInput[] | null;
  };
  if (mealType !== undefined && !isMealType(mealType)) {
    return res.status(400).json({ error: "Invalid mealType" });
  }
  if (status !== undefined && !isMealPlanStatus(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  if (servings != null && !isValidServings(servings)) {
    return res.status(400).json({ error: "Servings must be a positive whole number" });
  }
  if (recipeId !== undefined) {
    const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, ...scopeWhere(req) } });
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
  }

  const recipeChanged = recipeId !== undefined && recipeId !== existing.recipeId;
  const ingredientRows = ingredients != null ? await resolveIngredientRows(ingredients) : null;

  const updated = await prisma.mealPlanEntry.update({
    where: { id: req.params.id },
    data: {
      ...(date !== undefined ? { date: new Date(`${date}T00:00:00.000Z`) } : {}),
      ...(mealType !== undefined ? { mealType } : {}),
      ...(recipeId !== undefined ? { recipeId } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(servings !== undefined
        ? { servings }
        : recipeChanged && ingredients === undefined
          ? { servings: null }
          : {}),
      ...(ingredients !== undefined
        ? ingredients === null
          ? { hasCustomIngredients: false, customIngredients: { deleteMany: {} } }
          : { hasCustomIngredients: true, customIngredients: { deleteMany: {}, create: ingredientRows! } }
        : recipeChanged
          ? { hasCustomIngredients: false, customIngredients: { deleteMany: {} } }
          : {}),
    },
    select: MEAL_PLAN_ENTRY_SELECT,
  });

  const scope = { userId: req.userId, familyId: req.familyId };
  await reconcileAutoShoppingListItems(scope, weekStartKeyFor(existing.date));
  if (date !== undefined) {
    await reconcileAutoShoppingListItems(scope, weekStartKeyFor(new Date(`${date}T00:00:00.000Z`)));
  }
  res.json(updated);
});

mealPlanRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.mealPlanEntry.findFirst({ where: { id: req.params.id, ...scopeWhere(req) } });
  if (!existing) return res.status(204).end();
  await prisma.mealPlanEntry.delete({ where: { id: req.params.id } });
  await reconcileAutoShoppingListItems({ userId: req.userId, familyId: req.familyId }, weekStartKeyFor(existing.date));
  res.status(204).end();
});
