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

// The web client reaches the API through a same-origin Vercel rewrite and sends no Origin
// header worth checking. The native (Capacitor) app bundle calls the API directly from its
// own origin, so it needs to be explicitly allowlisted here (and to receive the session
// cookie, credentials: true) — see CORS_ORIGINS in .env.example.
const defaultAllowedOrigins = [
  "capacitor://localhost", // iOS
  "https://localhost", // Android (Capacitor's default androidScheme)
];
const configuredAllowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [...defaultAllowedOrigins, ...configuredAllowedOrigins];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
// Default 100kb is too small for a picture/photo data URL. The largest payload is a recipe
// photo (recipes.ts caps the decoded image at 1.5MB); this gives the base64 + JSON overhead
// room to arrive with headroom to spare.
app.use(express.json({ limit: "3mb" }));
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
