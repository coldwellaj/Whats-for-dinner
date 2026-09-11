import { Link } from "react-router-dom";
import type { Recipe } from "../types.js";
import { useToggleFavorite } from "../api/recipes.js";

function lastMadeLabel(recipe: Recipe): string {
  if (recipe.daysSinceLastMade == null) return "Never made";
  if (recipe.daysSinceLastMade === 0) return "Made today";
  if (recipe.daysSinceLastMade === 1) return "Made yesterday";
  return `Made ${recipe.daysSinceLastMade} days ago`;
}

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const toggleFavorite = useToggleFavorite();

  return (
    <div className="border rounded-lg p-4 bg-white flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/recipes/${recipe.id}`} className="font-semibold text-lg text-emerald-800 hover:underline">
          {recipe.name}
        </Link>
        <button
          aria-label={recipe.isFavorite ? "Unfavorite" : "Favorite"}
          onClick={() => toggleFavorite.mutate(recipe.id)}
          className="text-xl leading-none"
        >
          {recipe.isFavorite ? "❤️" : "🤍"}
        </button>
      </div>
      {recipe.description && <p className="text-sm text-gray-600 line-clamp-2">{recipe.description}</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
        {recipe.prepTimeMinutes != null && <span>Prep {recipe.prepTimeMinutes}m</span>}
        {recipe.cookTimeMinutes != null && <span>Cook {recipe.cookTimeMinutes}m</span>}
        {recipe.servings != null && <span>Serves {recipe.servings}</span>}
      </div>
      <span className="text-xs font-medium text-emerald-700">{lastMadeLabel(recipe)}</span>
      {recipe.tags && (
        <div className="flex flex-wrap gap-1 mt-1">
          {recipe.tags.split(",").map((t) => (
            <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {t.trim()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
