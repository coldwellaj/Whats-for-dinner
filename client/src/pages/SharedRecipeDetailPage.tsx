import { useState } from "react";
import { useParams } from "react-router-dom";
import { useCopyRecipe, useSharedRecipe } from "../api/recipes.js";
import { formatQuantity } from "../lib/units.js";
import type { SharedRecipe } from "../types.js";

const SCALE_OPTIONS = [
  { label: "½×", value: 0.5 },
  { label: "1×", value: 1 },
  { label: "2×", value: 2 },
];

function scaledQuantityLabel(quantity: number | null, scale: number): string | null {
  if (quantity == null) return null;
  return formatQuantity(quantity * scale);
}

function attributionLabel(recipe: SharedRecipe): string {
  if (recipe.family?.name) return `Shared by ${recipe.family.name}`;
  return `Shared by ${recipe.user.name ?? recipe.user.email}`;
}

export function SharedRecipeDetailPage() {
  const { id } = useParams();
  const { data: recipe, isLoading, error } = useSharedRecipe(id);
  const copyRecipe = useCopyRecipe();
  const [scale, setScale] = useState(1);

  if (isLoading) return <p className="max-w-2xl mx-auto px-4 py-6 text-gray-500">Loading...</p>;
  if (error || !recipe) return <p className="max-w-2xl mx-auto px-4 py-6 text-red-600">Recipe not found.</p>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-gray-800">{recipe.name}</h1>
      <span className="self-start text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
        {attributionLabel(recipe)}
      </span>

      {recipe.description && <p className="text-gray-600">{recipe.description}</p>}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
        {recipe.prepTimeMinutes != null && <span>Prep {recipe.prepTimeMinutes}m</span>}
        {recipe.cookTimeMinutes != null && <span>Cook {recipe.cookTimeMinutes}m</span>}
        {recipe.servings != null && <span>Serves {formatQuantity(recipe.servings * scale)}</span>}
      </div>

      {recipe.tags && (
        <div className="flex flex-wrap gap-1">
          {recipe.tags.split(",").map((t) => (
            <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {t.trim()}
            </span>
          ))}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <h2 className="font-semibold text-gray-800">Ingredients</h2>
          <div className="flex gap-1">
            {SCALE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setScale(opt.value)}
                className={`px-2.5 py-1 rounded text-xs font-medium ${
                  scale === opt.value ? "bg-terracotta-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
          {recipe.ingredients.map((ri) => (
            <li key={ri.id}>
              {[scaledQuantityLabel(ri.quantity, scale), ri.unit, ri.ingredient.name].filter(Boolean).join(" ")}
              {ri.notes ? ` (${ri.notes})` : ""}
            </li>
          ))}
        </ul>
      </div>

      {recipe.instructions && (
        <div>
          <h2 className="font-semibold text-gray-800 mb-1">Instructions</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{recipe.instructions}</p>
        </div>
      )}

      {recipe.sourceUrl && (
        <div>
          <div className="items-center justify-between gap-2 mb-1">
            <h2 className="font-semibold text-gray-800">Source</h2>
            <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="text-sm text-terracotta-700 underline">
              Recipe
            </a>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <button
          onClick={() => copyRecipe.mutate(recipe.id)}
          disabled={copyRecipe.isPending}
          className="px-4 py-2 rounded-md text-sm bg-terracotta-600 text-white font-medium disabled:opacity-50"
        >
          {copyRecipe.isSuccess ? "Saved to your recipes ✓" : "+ Save a copy"}
        </button>
      </div>
    </div>
  );
}
