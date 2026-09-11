import { Router } from "express";
import { prisma } from "../db.js";
import { reconcileAutoShoppingListItems } from "../lib/shoppingList.js";
import { weekStartKeyFor } from "../lib/week.js";
import { isMealPlanStatus, isMealType } from "../lib/types.js";

export const mealPlanRouter = Router();

// GET /api/meal-plan?start=YYYY-MM-DD&end=YYYY-MM-DD
mealPlanRouter.get("/", async (req, res) => {
  const { start, end } = req.query as { start?: string; end?: string };
  if (!start || !end) {
    return res.status(400).json({ error: "start and end query params are required" });
  }
  const entries = await prisma.mealPlanEntry.findMany({
    where: {
      date: {
        gte: new Date(`${start}T00:00:00.000Z`),
        lt: new Date(`${end}T00:00:00.000Z`),
      },
    },
    include: { recipe: true },
    orderBy: [{ date: "asc" }, { mealType: "asc" }],
  });
  res.json(entries);
});

mealPlanRouter.post("/", async (req, res) => {
  const { date, mealType, recipeId } = req.body as {
    date: string;
    mealType: string;
    recipeId: string;
  };
  if (!date || !mealType || !recipeId) {
    return res.status(400).json({ error: "date, mealType and recipeId are required" });
  }
  if (!isMealType(mealType)) {
    return res.status(400).json({ error: "Invalid mealType" });
  }
  const entryDate = new Date(`${date}T00:00:00.000Z`);
  const entry = await prisma.mealPlanEntry.create({
    data: { date: entryDate, mealType, recipeId },
    include: { recipe: true },
  });
  await reconcileAutoShoppingListItems(weekStartKeyFor(entryDate));
  res.status(201).json(entry);
});

mealPlanRouter.put("/:id", async (req, res) => {
  const existing = await prisma.mealPlanEntry.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Meal plan entry not found" });

  const { date, mealType, recipeId, status } = req.body as {
    date?: string;
    mealType?: string;
    recipeId?: string;
    status?: string;
  };
  if (mealType !== undefined && !isMealType(mealType)) {
    return res.status(400).json({ error: "Invalid mealType" });
  }
  if (status !== undefined && !isMealPlanStatus(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const updated = await prisma.mealPlanEntry.update({
    where: { id: req.params.id },
    data: {
      ...(date !== undefined ? { date: new Date(`${date}T00:00:00.000Z`) } : {}),
      ...(mealType !== undefined ? { mealType } : {}),
      ...(recipeId !== undefined ? { recipeId } : {}),
      ...(status !== undefined ? { status } : {}),
    },
    include: { recipe: true },
  });

  await reconcileAutoShoppingListItems(weekStartKeyFor(existing.date));
  if (date !== undefined) {
    await reconcileAutoShoppingListItems(weekStartKeyFor(updated.date));
  }
  res.json(updated);
});

mealPlanRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.mealPlanEntry.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(204).end();
  await prisma.mealPlanEntry.delete({ where: { id: req.params.id } });
  await reconcileAutoShoppingListItems(weekStartKeyFor(existing.date));
  res.status(204).end();
});
