import "express-async-errors";
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { recipesRouter } from "./routes/recipes.js";
import { ingredientsRouter } from "./routes/ingredients.js";
import { mealPlanRouter } from "./routes/mealPlan.js";
import { shoppingListRouter } from "./routes/shoppingList.js";
import { authRouter } from "./routes/auth.js";
import { familyRouter } from "./routes/family.js";
import { friendsRouter } from "./routes/friends.js";
import { requireAuth } from "./middleware/requireAuth.js";

export const app = express();

app.use(cors());
// Default 100kb is too small for a profile-picture data URL; auth.ts's PUT /me caps the
// actual decoded image at 500KB, this just gives the base64 + JSON overhead room to arrive.
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);

app.use(requireAuth);

app.use("/api/family", familyRouter);
app.use("/api/friends", friendsRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/ingredients", ingredientsRouter);
app.use("/api/meal-plan", mealPlanRouter);
app.use("/api/shopping-list", shoppingListRouter);

// Catches errors from every route above (express-async-errors forwards async rejections
// here too) so a single bad request returns a 500 instead of crashing the whole process.
const handleError: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
app.use(handleError);
