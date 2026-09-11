import { Link, useNavigate, useParams } from "react-router-dom";
import { useDeleteRecipe, useRecipe, useToggleFavorite } from "../api/recipes.js";

export function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: recipe, isLoading, error } = useRecipe(id);
  const toggleFavorite = useToggleFavorite();
  const deleteRecipe = useDeleteRecipe();

  if (isLoading) return <p className="max-w-2xl mx-auto px-4 py-6 text-gray-500">Loading...</p>;
  if (error || !recipe) return <p className="max-w-2xl mx-auto px-4 py-6 text-red-600">Recipe not found.</p>;

  async function handleDelete() {
    if (!confirm(`Delete "${recipe!.name}"? This cannot be undone.`)) return;
    await deleteRecipe.mutateAsync(recipe!.id);
    navigate("/");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-800">{recipe.name}</h1>
        <button
          aria-label={recipe.isFavorite ? "Unfavorite" : "Favorite"}
          onClick={() => toggleFavorite.mutate(recipe.id)}
          className="text-2xl leading-none"
        >
          {recipe.isFavorite ? "❤️" : "🤍"}
        </button>
      </div>

      {recipe.description && <p className="text-gray-600">{recipe.description}</p>}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
        {recipe.prepTimeMinutes != null && <span>Prep {recipe.prepTimeMinutes}m</span>}
        {recipe.cookTimeMinutes != null && <span>Cook {recipe.cookTimeMinutes}m</span>}
        {recipe.servings != null && <span>Serves {recipe.servings}</span>}
        <span className="font-medium text-emerald-700">
          {recipe.daysSinceLastMade == null ? "Never made" : `Last made ${recipe.daysSinceLastMade}d ago`}
        </span>
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
        <h2 className="font-semibold text-gray-800 mb-1">Ingredients</h2>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
          {recipe.ingredients.map((ri) => (
            <li key={ri.id}>
              {[ri.quantity, ri.unit, ri.ingredient.name].filter(Boolean).join(" ")}
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
        <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="text-sm text-emerald-700 underline">
          Source
        </a>
      )}

      <div className="flex gap-2 mt-2">
        <Link to={`/recipes/${recipe.id}/edit`} className="px-4 py-2 rounded-md text-sm bg-gray-100 text-gray-800">
          Edit
        </Link>
        <button onClick={handleDelete} className="px-4 py-2 rounded-md text-sm bg-red-50 text-red-600">
          Delete
        </button>
      </div>
    </div>
  );
}
