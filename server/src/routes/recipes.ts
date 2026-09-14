import { Router, type Request } from "express";
import { prisma } from "../db.js";
import { getLastMadeForRecipe, getLastMadeForRecipes } from "../lib/lastMade.js";
import { scopeWhere } from "../middleware/requireAuth.js";

// Excludes the caller's own scope from a shared-recipe query. Deliberately avoids both
// `NOT: scopeWhere(req)` and a bare `familyId: { not: req.familyId } }` — Prisma compiles
// both to plain SQL `<>`/`NOT (...)`, and SQL's three-valued logic makes `NULL <> X`
// evaluate to NULL (dropped by WHERE, not included), silently hiding every personal-scoped
// (familyId IS NULL) shared recipe from any family-scoped caller. Explicitly OR-ing in a
// `familyId: null` branch (which Prisma *does* compile to a proper `IS NULL`/`IS NOT NULL`)
// sidesteps that: NULL rows match the null-check branch directly, so the NULL-propagating
// comparison in the other branch never has to evaluate them.
function excludeOwnScope(req: Request) {
  return req.familyId
    ? { OR: [{ familyId: null }, { familyId: { not: req.familyId } }] }
    : { OR: [{ familyId: { not: null } }, { userId: { not: req.userId } }] };
}

export const recipesRouter = Router();

type IngredientInput = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
};

async function upsertIngredientsForRecipe(recipeId: string, ingredients: IngredientInput[]) {
  await prisma.recipeIngredient.deleteMany({ where: { recipeId } });
  for (const ing of ingredients) {
    const name = ing.name.trim();
    if (!name) continue;
    const ingredient = await prisma.ingredient.upsert({
      where: { name },
      update: {},
      create: { name, defaultUnit: ing.unit ?? null },
    });
    await prisma.recipeIngredient.create({
      data: {
        recipeId,
        ingredientId: ingredient.id,
        quantity: ing.quantity ?? null,
        unit: ing.unit ?? null,
        notes: ing.notes ?? null,
      },
    });
  }
}

// GET /api/recipes?search=&favorite=true&sort=lastMadeAsc
recipesRouter.get("/", async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const favoriteOnly = req.query.favorite === "true";

  const recipes = await prisma.recipe.findMany({
    where: {
      ...scopeWhere(req),
      ...(favoriteOnly ? { isFavorite: true } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { tags: { contains: search } },
            ],
          }
        : {}),
    },
    include: { ingredients: { include: { ingredient: true } } },
    orderBy: { name: "asc" },
  });

  const lastMadeByRecipe = await getLastMadeForRecipes(scopeWhere(req), recipes.map((r) => r.id));

  let result = recipes.map((r) => ({ ...r, ...lastMadeByRecipe[r.id] }));

  if (req.query.sort === "lastMadeAsc") {
    result = result.sort((a, b) => {
      if (a.daysSinceLastMade == null && b.daysSinceLastMade == null) return 0;
      if (a.daysSinceLastMade == null) return -1;
      if (b.daysSinceLastMade == null) return 1;
      return b.daysSinceLastMade - a.daysSinceLastMade;
    });
  }

  res.json(result);
});

// GET /api/recipes/shared?sort=popular|name — recipes other users/families have marked
// shareable, excluding ones already in the caller's own scope. Registered before GET /:id
// so "shared" isn't swallowed as an :id param.
recipesRouter.get("/shared", async (req, res) => {
  const orderBy = req.query.sort === "popular" ? [{ saveCount: "desc" as const }, { name: "asc" as const }] : [{ name: "asc" as const }];

  const recipes = await prisma.recipe.findMany({
    where: { isShared: true, ...excludeOwnScope(req) },
    include: {
      ingredients: { include: { ingredient: true } },
      user: { select: { name: true, email: true } },
      family: { select: { name: true } },
    },
    orderBy,
  });
  res.json(recipes);
});

// GET /api/recipes/shared/:id — view a single shared recipe regardless of scope.
recipesRouter.get("/shared/:id", async (req, res) => {
  const recipe = await prisma.recipe.findFirst({
    where: { id: req.params.id, isShared: true },
    include: {
      ingredients: { include: { ingredient: true } },
      user: { select: { name: true, email: true } },
      family: { select: { name: true } },
    },
  });
  if (!recipe) return res.status(404).json({ error: "Recipe not found" });
  res.json(recipe);
});

recipesRouter.get("/:id", async (req, res) => {
  const recipe = await prisma.recipe.findFirst({
    where: { id: req.params.id, ...scopeWhere(req) },
    include: { ingredients: { include: { ingredient: true } } },
  });
  if (!recipe) return res.status(404).json({ error: "Recipe not found" });
  const lastMade = await getLastMadeForRecipe(scopeWhere(req), recipe.id);
  res.json({ ...recipe, ...lastMade });
});

recipesRouter.post("/", async (req, res) => {
  const { name, description, instructions, prepTimeMinutes, cookTimeMinutes, servings, sourceUrl, tags, ingredients } =
    req.body as {
      name: string;
      description?: string;
      instructions?: string;
      prepTimeMinutes?: number;
      cookTimeMinutes?: number;
      servings?: number;
      sourceUrl?: string;
      tags?: string;
      ingredients?: IngredientInput[];
    };

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Recipe name is required" });
  }

  const recipe = await prisma.recipe.create({
    data: {
      userId: req.userId,
      familyId: req.familyId,
      name: name.trim(),
      description: description ?? null,
      instructions: instructions ?? null,
      prepTimeMinutes: prepTimeMinutes ?? null,
      cookTimeMinutes: cookTimeMinutes ?? null,
      servings: servings ?? null,
      sourceUrl: sourceUrl ?? null,
      tags: tags ?? null,
    },
  });

  if (ingredients?.length) {
    await upsertIngredientsForRecipe(recipe.id, ingredients);
  }

  const full = await prisma.recipe.findUnique({
    where: { id: recipe.id },
    include: { ingredients: { include: { ingredient: true } } },
  });
  res.status(201).json(full);
});

recipesRouter.put("/:id", async (req, res) => {
  const existing = await prisma.recipe.findFirst({ where: { id: req.params.id, ...scopeWhere(req) } });
  if (!existing) return res.status(404).json({ error: "Recipe not found" });

  const { name, description, instructions, prepTimeMinutes, cookTimeMinutes, servings, sourceUrl, tags, ingredients } =
    req.body as {
      name?: string;
      description?: string;
      instructions?: string;
      prepTimeMinutes?: number;
      cookTimeMinutes?: number;
      servings?: number;
      sourceUrl?: string;
      tags?: string;
      ingredients?: IngredientInput[];
    };

  await prisma.recipe.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(instructions !== undefined ? { instructions } : {}),
      ...(prepTimeMinutes !== undefined ? { prepTimeMinutes } : {}),
      ...(cookTimeMinutes !== undefined ? { cookTimeMinutes } : {}),
      ...(servings !== undefined ? { servings } : {}),
      ...(sourceUrl !== undefined ? { sourceUrl } : {}),
      ...(tags !== undefined ? { tags } : {}),
    },
  });

  if (ingredients) {
    await upsertIngredientsForRecipe(req.params.id, ingredients);
  }

  const full = await prisma.recipe.findUnique({
    where: { id: req.params.id },
    include: { ingredients: { include: { ingredient: true } } },
  });
  res.json(full);
});

recipesRouter.delete("/:id", async (req, res) => {
  await prisma.recipe.deleteMany({ where: { id: req.params.id, ...scopeWhere(req) } });
  res.status(204).end();
});

recipesRouter.post("/:id/favorite", async (req, res) => {
  const recipe = await prisma.recipe.findFirst({ where: { id: req.params.id, ...scopeWhere(req) } });
  if (!recipe) return res.status(404).json({ error: "Recipe not found" });
  const updated = await prisma.recipe.update({
    where: { id: req.params.id },
    data: { isFavorite: !recipe.isFavorite },
  });
  res.json(updated);
});

// POST /api/recipes/:id/share — toggles whether a recipe you own is shareable.
recipesRouter.post("/:id/share", async (req, res) => {
  const recipe = await prisma.recipe.findFirst({ where: { id: req.params.id, ...scopeWhere(req) } });
  if (!recipe) return res.status(404).json({ error: "Recipe not found" });
  const updated = await prisma.recipe.update({
    where: { id: req.params.id },
    data: { isShared: !recipe.isShared },
  });
  res.json(updated);
});

// POST /api/recipes/:id/copy — duplicates a shared recipe (from any user/family) into
// the caller's own scope, so they can edit it, favorite it, and plan with it freely.
recipesRouter.post("/:id/copy", async (req, res) => {
  const source = await prisma.recipe.findFirst({
    where: { id: req.params.id, isShared: true },
    include: { ingredients: true },
  });
  if (!source) return res.status(404).json({ error: "Recipe not found" });

  const copy = await prisma.recipe.create({
    data: {
      userId: req.userId,
      familyId: req.familyId,
      name: source.name,
      description: source.description,
      instructions: source.instructions,
      prepTimeMinutes: source.prepTimeMinutes,
      cookTimeMinutes: source.cookTimeMinutes,
      servings: source.servings,
      sourceUrl: source.sourceUrl,
      tags: source.tags,
    },
  });

  if (source.ingredients.length) {
    await prisma.recipeIngredient.createMany({
      data: source.ingredients.map((ri) => ({
        recipeId: copy.id,
        ingredientId: ri.ingredientId,
        quantity: ri.quantity,
        unit: ri.unit,
        notes: ri.notes,
      })),
    });
  }

  await prisma.recipe.update({ where: { id: source.id }, data: { saveCount: { increment: 1 } } });

  const full = await prisma.recipe.findUnique({
    where: { id: copy.id },
    include: { ingredients: { include: { ingredient: true } } },
  });
  res.status(201).json(full);
});
