import { Router } from "express";
import { prisma } from "../db.js";
import { reconcileAutoShoppingListItems } from "../lib/shoppingList.js";
import { scopeWhere } from "../middleware/requireAuth.js";

export const shoppingListRouter = Router();

// GET /api/shopping-list?weekStart=YYYY-MM-DD
shoppingListRouter.get("/", async (req, res) => {
  const weekStart = req.query.weekStart as string | undefined;
  if (!weekStart) return res.status(400).json({ error: "weekStart query param is required" });

  await reconcileAutoShoppingListItems({ userId: req.userId, familyId: req.familyId }, weekStart);

  const items = await prisma.shoppingListItem.findMany({
    where: { ...scopeWhere(req), weekStartDate: weekStart },
    include: { ingredient: true },
    orderBy: [{ isManual: "asc" }, { id: "asc" }],
  });
  res.json(items);
});

// POST /api/shopping-list/:weekStart/items  (manual item)
shoppingListRouter.post("/:weekStart/items", async (req, res) => {
  const { customName, quantity, unit } = req.body as {
    customName: string;
    quantity?: number;
    unit?: string;
  };
  if (!customName || !customName.trim()) {
    return res.status(400).json({ error: "customName is required" });
  }
  const item = await prisma.shoppingListItem.create({
    data: {
      userId: req.userId,
      familyId: req.familyId,
      weekStartDate: req.params.weekStart,
      customName: customName.trim(),
      quantity: quantity ?? null,
      unit: unit ?? null,
      isManual: true,
    },
  });
  res.status(201).json(item);
});

// PUT /api/shopping-list/items/:id  (toggle checked, edit manual item)
shoppingListRouter.put("/items/:id", async (req, res) => {
  const existing = await prisma.shoppingListItem.findFirst({
    where: { id: req.params.id, ...scopeWhere(req) },
  });
  if (!existing) return res.status(404).json({ error: "Item not found" });

  const { isChecked, customName, quantity, unit } = req.body as {
    isChecked?: boolean;
    customName?: string;
    quantity?: number | null;
    unit?: string | null;
  };

  const updated = await prisma.shoppingListItem.update({
    where: { id: req.params.id },
    data: {
      ...(isChecked !== undefined ? { isChecked } : {}),
      ...(existing.isManual && customName !== undefined ? { customName } : {}),
      ...(existing.isManual && quantity !== undefined ? { quantity } : {}),
      ...(existing.isManual && unit !== undefined ? { unit } : {}),
    },
  });
  res.json(updated);
});

// DELETE /api/shopping-list/items/:id
shoppingListRouter.delete("/items/:id", async (req, res) => {
  await prisma.shoppingListItem.deleteMany({ where: { id: req.params.id, ...scopeWhere(req) } });
  res.status(204).end();
});
