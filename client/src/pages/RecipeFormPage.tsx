import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCreateRecipe, useRecipe, useUpdateRecipe } from "../api/recipes.js";
import { IngredientListEditor } from "../components/IngredientListEditor.js";
import type { RecipeIngredientInput, RecipeInput } from "../types.js";

const emptyForm: RecipeInput = {
  name: "",
  description: "",
  instructions: "",
  prepTimeMinutes: null,
  cookTimeMinutes: null,
  servings: null,
  sourceUrl: "",
  tags: "",
  ingredients: [],
};

export function RecipeFormPage() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { data: existing } = useRecipe(id);
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe(id ?? "");

  const [form, setForm] = useState<RecipeInput>(emptyForm);

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        description: existing.description ?? "",
        instructions: existing.instructions ?? "",
        prepTimeMinutes: existing.prepTimeMinutes,
        cookTimeMinutes: existing.cookTimeMinutes,
        servings: existing.servings,
        sourceUrl: existing.sourceUrl ?? "",
        tags: existing.tags ?? "",
        ingredients: existing.ingredients.map((ri) => ({
          name: ri.ingredient.name,
          quantity: ri.quantity,
          unit: ri.unit,
          notes: ri.notes,
        })),
      });
    }
  }, [existing]);

  function handleIngredientsChange(ingredients: RecipeIngredientInput[]) {
    setForm((f) => ({ ...f, ingredients }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const cleanedIngredients = form.ingredients.filter((i) => i.name.trim());
    const payload = { ...form, ingredients: cleanedIngredients };

    const result = isEditing
      ? await updateRecipe.mutateAsync(payload)
      : await createRecipe.mutateAsync(payload);
    navigate(`/recipes/${result.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">{isEditing ? "Edit Recipe" : "New Recipe"}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-base sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-base sm:text-sm"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prep (min)</label>
            <input
              type="number"
              value={form.prepTimeMinutes ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, prepTimeMinutes: e.target.value === "" ? null : Number(e.target.value) }))
              }
              className="w-full border rounded px-3 py-2 text-base sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cook (min)</label>
            <input
              type="number"
              value={form.cookTimeMinutes ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, cookTimeMinutes: e.target.value === "" ? null : Number(e.target.value) }))
              }
              className="w-full border rounded px-3 py-2 text-base sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Servings</label>
            <input
              type="number"
              value={form.servings ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, servings: e.target.value === "" ? null : Number(e.target.value) }))
              }
              className="w-full border rounded px-3 py-2 text-base sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ingredients</label>
          <IngredientListEditor ingredients={form.ingredients} onChange={handleIngredientsChange} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
          <textarea
            value={form.instructions ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-base sm:text-sm"
            rows={6}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source URL</label>
            <input
              value={form.sourceUrl ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-base sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <input
              value={form.tags ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-base sm:text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium">
            {isEditing ? "Save Changes" : "Create Recipe"}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded-md text-sm text-gray-600">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
