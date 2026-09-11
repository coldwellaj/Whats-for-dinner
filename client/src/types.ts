export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
export type MealPlanStatus = "PLANNED" | "MADE" | "SKIPPED";

export interface Ingredient {
  id: string;
  name: string;
  defaultUnit: string | null;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientId: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  ingredient: Ingredient;
}

export interface Recipe {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  sourceUrl: string | null;
  isFavorite: boolean;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredient[];
  lastMadeAt: string | null;
  daysSinceLastMade: number | null;
}

export interface RecipeIngredientInput {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
}

export interface RecipeInput {
  name: string;
  description?: string | null;
  instructions?: string | null;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  servings?: number | null;
  sourceUrl?: string | null;
  tags?: string | null;
  ingredients: RecipeIngredientInput[];
}

export interface MealPlanEntry {
  id: string;
  date: string;
  mealType: MealType;
  recipeId: string;
  status: MealPlanStatus;
  recipe: RecipeSummary;
}

export interface RecipeSummary {
  id: string;
  name: string;
  isFavorite: boolean;
}

export interface ShoppingListItem {
  id: string;
  weekStartDate: string;
  ingredientId: string | null;
  customName: string | null;
  quantity: number | null;
  unit: string | null;
  isChecked: boolean;
  isManual: boolean;
  ingredient: Ingredient | null;
}
