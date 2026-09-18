import { useEffect, useState } from "react";
import { useCreateMealPlanEntry, useMealPlanEntryDetail, useUpdateMealPlanEntry } from "../api/mealPlan.js";
import { useRecipe } from "../api/recipes.js";
import { formatDayLabel } from "../lib/dates.js";
import type { MealType, RecipeIngredientInput } from "../types.js";
import { IngredientListEditor } from "./IngredientListEditor.js";
import { RecipePhoto } from "./RecipePhoto.js";

const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};

export type MealCustomizeTarget =
  | { mode: "create"; date: string; mealType: MealType; recipeId: string }
  | { mode: "edit"; entryId: string };

interface Props {
  target: MealCustomizeTarget;
  onClose: () => void;
}

function toIngredientInputs(
  ingredients: { ingredient: { name: string }; quantity: number | null; unit: string | null; notes: string | null }[],
): RecipeIngredientInput[] {
  return ingredients.map((ri) => ({ name: ri.ingredient.name, quantity: ri.quantity, unit: ri.unit, notes: ri.notes }));
}

// Keeps scaled quantities from drifting into long float tails (e.g. 1.3333333333333335).
function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * The "customize this meal" popup: shown after picking a recipe to add to the plan, or
 * reopened from an already-planned meal to change it later. Lets the user override how many
 * servings they're making (auto-scaling ingredient amounts to match, until they hand-edit one)
 * and add/edit/remove ingredients for just this occurrence — the underlying Recipe is never
 * touched. See MealPlanEntry's schema comment for how these overrides feed the shopping list.
 */
export function MealCustomizeModal({ target, onClose }: Props) {
  const createEntry = useCreateMealPlanEntry();
  const updateEntry = useUpdateMealPlanEntry();

  const recipeQuery = useRecipe(target.mode === "create" ? target.recipeId : undefined);
  const detailQuery = useMealPlanEntryDetail(target.mode === "edit" ? target.entryId : undefined);

  const recipe = target.mode === "create" ? recipeQuery.data : detailQuery.data?.recipe;
  const isLoading = target.mode === "create" ? recipeQuery.isLoading : detailQuery.isLoading;
  const startedCustomized = target.mode === "edit" && !!detailQuery.data?.hasCustomIngredients;

  const [servingsInput, setServingsInput] = useState("");
  const [ingredients, setIngredients] = useState<RecipeIngredientInput[]>([]);
  const [rowsTouched, setRowsTouched] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed local state once the recipe (create) or entry detail (edit) has loaded. Runs once —
  // re-running on every render would stomp the user's in-progress edits.
  useEffect(() => {
    if (initialized || !recipe) return;
    const detail = target.mode === "edit" ? detailQuery.data : undefined;
    setIngredients(
      detail?.hasCustomIngredients ? toIngredientInputs(detail.customIngredients) : toIngredientInputs(recipe.ingredients),
    );
    setServingsInput(detail?.servings != null ? String(detail.servings) : "");
    setRowsTouched(false);
    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, recipe]);

  function handleServingsChange(raw: string) {
    setServingsInput(raw);
    // Once the user has hand-edited a row, further servings changes shouldn't overwrite
    // their edits — they're in control of the ingredient list at that point.
    if (rowsTouched || !recipe?.servings) return;
    const n = Number(raw);
    if (!raw.trim() || !Number.isFinite(n) || n <= 0) return;
    const ratio = n / recipe.servings;
    setIngredients(
      toIngredientInputs(recipe.ingredients).map((ing) => ({
        ...ing,
        quantity: ing.quantity != null ? roundQuantity(ing.quantity * ratio) : null,
      })),
    );
  }

  function handleIngredientsChange(next: RecipeIngredientInput[]) {
    setIngredients(next);
    setRowsTouched(true);
  }

  const saving = createEntry.isPending || updateEntry.isPending;

  async function handleSave() {
    setError(null);
    const trimmedServings = servingsInput.trim();
    const servingsValue = trimmedServings === "" ? null : Number(trimmedServings);
    if (servingsValue != null && (!Number.isInteger(servingsValue) || servingsValue <= 0)) {
      setError("Servings must be a positive whole number");
      return;
    }
    const willCustomizeIngredients = rowsTouched || startedCustomized;
    const cleanedIngredients = ingredients.filter((i) => i.name.trim());

    try {
      if (target.mode === "create") {
        await createEntry.mutateAsync({
          date: target.date,
          mealType: target.mealType,
          recipeId: target.recipeId,
          servings: servingsValue,
          ...(willCustomizeIngredients ? { ingredients: cleanedIngredients } : {}),
        });
      } else {
        await updateEntry.mutateAsync({
          id: target.entryId,
          servings: servingsValue,
          ...(willCustomizeIngredients ? { ingredients: cleanedIngredients } : {}),
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function handleReset() {
    if (target.mode !== "edit") return;
    setError(null);
    try {
      await updateEntry.mutateAsync({ id: target.entryId, servings: null, ingredients: null });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset");
    }
  }

  const ready = !isLoading && recipe && initialized;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-10 px-4 z-20 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg my-auto max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {!ready || !recipe ? (
          <p className="p-6 text-sm text-gray-500">Loading...</p>
        ) : (
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <RecipePhoto recipeId={recipe.id} hasPhoto={recipe.hasPhoto} className="w-14 h-14 rounded object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-800 truncate">{recipe.name}</h2>
                <p className="text-xs text-gray-500">
                  {target.mode === "create"
                    ? `Adding to ${MEAL_LABELS[target.mealType]} · ${formatDayLabel(target.date)}`
                    : "Customize this meal"}
                </p>
              </div>
            </div>

            <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
              <label className="flex flex-col gap-1 max-w-[12rem]">
                <span className="text-sm font-medium text-gray-700">Servings you're making</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  placeholder={recipe.servings ? String(recipe.servings) : "e.g. 4"}
                  value={servingsInput}
                  onChange={(e) => handleServingsChange(e.target.value)}
                  className="border rounded px-3 py-2 text-base sm:text-sm"
                />
                {recipe.servings != null && (
                  <span className="text-xs text-gray-400">
                    Recipe default is {recipe.servings}. Amounts below update to match until you edit one directly.
                  </span>
                )}
              </label>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Ingredients for this meal</h3>
                <IngredientListEditor ingredients={ingredients} onChange={handleIngredientsChange} />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="p-3 border-t flex items-center justify-between gap-2">
              <div>
                {target.mode === "edit" && startedCustomized && (
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={saving}
                    className="text-sm text-gray-500 hover:text-red-500 disabled:opacity-50"
                  >
                    Reset to recipe default
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="text-sm text-gray-600 px-3 py-2 hover:underline">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-terracotta-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Saving..." : target.mode === "create" ? "Add to plan" : "Save changes"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
