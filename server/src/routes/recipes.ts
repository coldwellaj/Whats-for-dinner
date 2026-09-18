import { Router, type Request } from "express";
import { prisma, Prisma } from "../db.js";
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

// Every recipe query that gets sent to the client (list, detail, or a mutation's response)
// must select fields explicitly rather than `include` (which pulls in every scalar column,
// including the photo bytes — see the schema comment on Recipe.photo). This project pins
// Prisma 5.x, whose generated client predates the (later-GA) Omit API, so explicit `select`
// is the safe way to exclude a column on this version rather than `include` + `omit`.
const RECIPE_SELECT_BASE = {
  id: true,
  userId: true,
  familyId: true,
  name: true,
  description: true,
  instructions: true,
  prepTimeMinutes: true,
  cookTimeMinutes: true,
  servings: true,
  sourceUrl: true,
  isFavorite: true,
  isShared: true,
  saveCount: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
  hasPhoto: true,
} satisfies Prisma.RecipeSelect;

const MAX_PHOTO_BYTES = 1_500_000;
const PHOTO_DATA_URL_RE = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/]+=*)$/;

type PhotoParseResult = { ok: true; buffer: Buffer; mimeType: string } | { ok: false; error: string };

function parsePhoto(dataUrl: string): PhotoParseResult {
  const match = PHOTO_DATA_URL_RE.exec(dataUrl);
  if (!match) return { ok: false, error: "Photo must be a PNG, JPEG, or WEBP image" };
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > MAX_PHOTO_BYTES) return { ok: false, error: "Photo is too large (max 1.5MB)" };
  const format = match[1] === "jpg" ? "jpeg" : match[1];
  return { ok: true, buffer, mimeType: `image/${format}` };
}

type PhotoUpdateResult =
  | { kind: "unchanged" }
  | { kind: "set"; data: { photo: Buffer | null; photoType: string | null; hasPhoto: boolean } }
  | { kind: "error"; error: string };

// Resolves an optional `photo` field (a data URL, or null to remove it, or undefined to leave
// it unchanged) from a request body into the Prisma data fragment to apply.
function resolvePhotoUpdate(photo: string | null | undefined): PhotoUpdateResult {
  if (photo === undefined) return { kind: "unchanged" };
  if (photo === null) return { kind: "set", data: { photo: null, photoType: null, hasPhoto: false } };
  const parsed = parsePhoto(photo);
  if (!parsed.ok) return { kind: "error", error: parsed.error };
  return { kind: "set", data: { photo: parsed.buffer, photoType: parsed.mimeType, hasPhoto: true } };
}

// Finds or creates the shared Ingredient row for a name. `upsert` alone isn't safe here:
// two requests creating a recipe with the same brand-new ingredient name can both miss the
// SELECT and then race on the INSERT, so the loser's upsert throws a P2002 unique-constraint
// error instead of falling back to the row the winner just created. Catch that one case and
// re-fetch instead of letting it propagate.
async function findOrCreateIngredient(name: string, defaultUnit: string | null) {
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

async function upsertIngredientsForRecipe(recipeId: string, ingredients: IngredientInput[]) {
  await prisma.recipeIngredient.deleteMany({ where: { recipeId } });
  for (const ing of ingredients) {
    const name = ing.name.trim();
    if (!name) continue;
    const ingredient = await findOrCreateIngredient(name, ing.unit ?? null);
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
    select: { ...RECIPE_SELECT_BASE, ingredients: { include: { ingredient: true } } },
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

// Finds the ids of shared recipes (from `sharedIds`) the caller already has a copy of in
// their own scope, so Discover can show "already saved" instead of letting them copy twice.
async function findAlreadySavedIds(req: Request, sharedIds: string[]): Promise<Set<string>> {
  if (!sharedIds.length) return new Set();
  const copies = await prisma.recipe.findMany({
    where: { copiedFromId: { in: sharedIds }, ...scopeWhere(req) },
    select: { copiedFromId: true },
  });
  return new Set(copies.map((c) => c.copiedFromId!));
}

// GET /api/recipes/shared?sort=popular|name — recipes other users/families have marked
// shareable, excluding ones already in the caller's own scope. Registered before GET /:id
// so "shared" isn't swallowed as an :id param.
recipesRouter.get("/shared", async (req, res) => {
  const orderBy = req.query.sort === "popular" ? [{ saveCount: "desc" as const }, { name: "asc" as const }] : [{ name: "asc" as const }];

  const recipes = await prisma.recipe.findMany({
    where: { isShared: true, ...excludeOwnScope(req) },
    select: {
      ...RECIPE_SELECT_BASE,
      ingredients: { include: { ingredient: true } },
      user: { select: { name: true, email: true } },
      family: { select: { name: true } },
    },
    orderBy,
  });
  const alreadySavedIds = await findAlreadySavedIds(req, recipes.map((r) => r.id));
  res.json(recipes.map((r) => ({ ...r, alreadySaved: alreadySavedIds.has(r.id) })));
});

// GET /api/recipes/shared/:id — view a single shared recipe regardless of scope.
recipesRouter.get("/shared/:id", async (req, res) => {
  const recipe = await prisma.recipe.findFirst({
    where: { id: req.params.id, isShared: true },
    select: {
      ...RECIPE_SELECT_BASE,
      ingredients: { include: { ingredient: true } },
      user: { select: { name: true, email: true } },
      family: { select: { name: true } },
    },
  });
  if (!recipe) return res.status(404).json({ error: "Recipe not found" });
  const alreadySavedIds = await findAlreadySavedIds(req, [recipe.id]);
  res.json({ ...recipe, alreadySaved: alreadySavedIds.has(recipe.id) });
});

// GET /api/recipes/:id/photo — serves the recipe's photo as a real image response, not
// embedded in any JSON payload, so tiles can use a normal, browser-cacheable <img src>.
// Viewable by anyone who could view the recipe itself: own scope, or shared to everyone.
recipesRouter.get("/:id/photo", async (req, res) => {
  const recipe = await prisma.recipe.findFirst({
    where: { id: req.params.id, OR: [scopeWhere(req), { isShared: true }] },
    select: { photo: true, photoType: true },
  });
  if (!recipe?.photo) return res.status(404).end();
  res.set("Content-Type", recipe.photoType ?? "image/jpeg");
  res.set("Cache-Control", "private, max-age=31536000, immutable");
  res.send(recipe.photo);
});

recipesRouter.get("/:id", async (req, res) => {
  const recipe = await prisma.recipe.findFirst({
    where: { id: req.params.id, ...scopeWhere(req) },
    select: { ...RECIPE_SELECT_BASE, ingredients: { include: { ingredient: true } } },
  });
  if (!recipe) return res.status(404).json({ error: "Recipe not found" });
  const lastMade = await getLastMadeForRecipe(scopeWhere(req), recipe.id);
  res.json({ ...recipe, ...lastMade });
});

recipesRouter.post("/", async (req, res) => {
  const { name, description, instructions, prepTimeMinutes, cookTimeMinutes, servings, sourceUrl, tags, ingredients, photo } =
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
      photo?: string | null;
    };

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Recipe name is required" });
  }

  const photoUpdate = resolvePhotoUpdate(photo);
  if (photoUpdate.kind === "error") {
    return res.status(400).json({ error: photoUpdate.error });
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
      ...(photoUpdate.kind === "set" ? photoUpdate.data : {}),
    },
  });

  if (ingredients?.length) {
    await upsertIngredientsForRecipe(recipe.id, ingredients);
  }

  const full = await prisma.recipe.findUnique({
    where: { id: recipe.id },
    select: { ...RECIPE_SELECT_BASE, ingredients: { include: { ingredient: true } } },
  });
  res.status(201).json(full);
});

recipesRouter.put("/:id", async (req, res) => {
  const existing = await prisma.recipe.findFirst({ where: { id: req.params.id, ...scopeWhere(req) } });
  if (!existing) return res.status(404).json({ error: "Recipe not found" });

  const { name, description, instructions, prepTimeMinutes, cookTimeMinutes, servings, sourceUrl, tags, ingredients, photo } =
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
      photo?: string | null;
    };

  const photoUpdate = resolvePhotoUpdate(photo);
  if (photoUpdate.kind === "error") {
    return res.status(400).json({ error: photoUpdate.error });
  }

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
      ...(photoUpdate.kind === "set" ? photoUpdate.data : {}),
    },
  });

  if (ingredients) {
    await upsertIngredientsForRecipe(req.params.id, ingredients);
  }

  const full = await prisma.recipe.findUnique({
    where: { id: req.params.id },
    select: { ...RECIPE_SELECT_BASE, ingredients: { include: { ingredient: true } } },
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
    select: RECIPE_SELECT_BASE,
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
    select: RECIPE_SELECT_BASE,
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

  const existingCopy = await prisma.recipe.findFirst({
    where: { copiedFromId: source.id, ...scopeWhere(req) },
  });
  if (existingCopy) return res.status(409).json({ error: "You already saved a copy of this recipe" });

  const copy = await prisma.recipe.create({
    data: {
      userId: req.userId,
      familyId: req.familyId,
      copiedFromId: source.id,
      name: source.name,
      description: source.description,
      instructions: source.instructions,
      prepTimeMinutes: source.prepTimeMinutes,
      cookTimeMinutes: source.cookTimeMinutes,
      servings: source.servings,
      sourceUrl: source.sourceUrl,
      tags: source.tags,
      photo: source.photo,
      photoType: source.photoType,
      hasPhoto: source.hasPhoto,
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
    select: { ...RECIPE_SELECT_BASE, ingredients: { include: { ingredient: true } } },
  });
  res.status(201).json(full);
});
