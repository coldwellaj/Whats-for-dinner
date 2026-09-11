import { Router } from "express";
import { prisma } from "../db.js";

export const ingredientsRouter = Router();

// GET /api/ingredients?search=
ingredientsRouter.get("/", async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const ingredients = await prisma.ingredient.findMany({
    where: search ? { name: { contains: search } } : undefined,
    orderBy: { name: "asc" },
    take: 20,
  });
  res.json(ingredients);
});
