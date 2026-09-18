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
  isShared: boolean;
  saveCount: number;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredient[];
  lastMadeAt: string | null;
  daysSinceLastMade: number | null;
  // The photo itself is served separately (GET /api/recipes/:id/photo), never inlined in this
  // JSON — hasPhoto is just enough for the client to know whether to render that <img src>.
  hasPhoto: boolean;
}

/** A recipe as seen on the Discover page: someone else's shared recipe, with attribution. */
export interface SharedRecipe extends Omit<Recipe, "lastMadeAt" | "daysSinceLastMade"> {
  user: { name: string | null; email: string };
  family: { name: string | null } | null;
  /** Whether the caller already has a copy of this recipe in their own scope. */
  alreadySaved: boolean;
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
  /** Data URL to set/replace the photo, null to remove it, or omitted to leave it unchanged. */
  photo?: string | null;
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

export type Visibility = "ALL" | "FRIENDS" | "PRIVATE";

export interface PrivacySettings {
  mealPlanVisibility: Visibility;
  recentlyMadeVisibility: Visibility;
  recipeListVisibility: Visibility;
}

export interface FriendProfile {
  id: string;
  name: string | null;
  email: string;
  picture: string | null;
}

export interface Friend extends FriendProfile {
  friendshipId: string;
}

export interface FriendRequestIncoming {
  id: string;
  from: FriendProfile;
}

export interface FriendRequestOutgoing {
  id: string;
  to: FriendProfile;
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
