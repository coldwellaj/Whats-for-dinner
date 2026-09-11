import { Router } from "express";
import { prisma } from "../db.js";
import { getLastMadeForRecipe, getLastMadeForRecipes } from "../lib/lastMade.js";

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

  const lastMadeByRecipe = await getLastMadeForRecipes(recipes.map((r) => r.id));

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

recipesRouter.get("/:id", async (req, res) => {
  const recipe = await prisma.recipe.findUnique({
    where: { id: req.params.id },
    include: { ingredients: { include: { ingredient: true } } },
  });
  if (!recipe) return res.status(404).json({ error: "Recipe not found" });
  const lastMade = await getLastMadeForRecipe(recipe.id);
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
  const existing = await prisma.recipe.findUnique({ where: { id: req.params.id } });
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
  await prisma.recipe.delete({ where: { id: req.params.id } }).catch(() => null);
  res.status(204).end();
});

recipesRouter.post("/:id/favorite", async (req, res) => {
  const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id } });
  if (!recipe) return res.status(404).json({ error: "Recipe not found" });
  const updated = await prisma.recipe.update({
    where: { id: req.params.id },
    data: { isFavorite: !recipe.isFavorite },
  });
  res.json(updated);
});
