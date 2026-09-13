import express from "express";
import cors from "cors";
import { recipesRouter } from "./routes/recipes.js";
import { ingredientsRouter } from "./routes/ingredients.js";
import { mealPlanRouter } from "./routes/mealPlan.js";
import { shoppingListRouter } from "./routes/shoppingList.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/recipes", recipesRouter);
app.use("/api/ingredients", ingredientsRouter);
app.use("/api/meal-plan", mealPlanRouter);
app.use("/api/shopping-list", shoppingListRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));
