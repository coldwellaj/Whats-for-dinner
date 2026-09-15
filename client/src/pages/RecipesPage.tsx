import { useState } from "react";
import { Link } from "react-router-dom";
import { useRecipes } from "../api/recipes.js";
import { RecipeCard, RecipeListRow } from "../components/RecipeCard.js";
import { useViewMode, ViewModeToggle } from "../components/ViewModeToggle.js";

export function RecipesPage() {
  const [search, setSearch] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [sortLastMadeAsc, setSortLastMadeAsc] = useState(false);
  const [viewMode, setViewMode] = useViewMode("recipes-view-mode");

  const { data: recipes, isLoading, error } = useRecipes({ search, favorite: favoriteOnly, sortLastMadeAsc });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800">Recipes</h1>
        <Link to="/recipes/new" className="bg-terracotta-600 text-white px-4 py-2 rounded-md text-sm font-medium">
          + New Recipe
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          placeholder="Search recipes or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2 text-base sm:text-sm flex-1 min-w-[12rem]"
        />
        <label className="flex items-center gap-1.5 text-sm text-gray-700">
          <input type="checkbox" checked={favoriteOnly} onChange={(e) => setFavoriteOnly(e.target.checked)} />
          Favorites only
        </label>
        <label className="flex items-center gap-1.5 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={sortLastMadeAsc}
            onChange={(e) => setSortLastMadeAsc(e.target.checked)}
          />
          Least recently made first
        </label>
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </div>

      {isLoading && <p className="text-gray-500">Loading recipes...</p>}
      {error && <p className="text-red-600">Failed to load recipes.</p>}
      {recipes?.length === 0 && (
        <p className="text-gray-500">No recipes yet. Create your first one to get started.</p>
      )}

      {viewMode === "tile" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {recipes?.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {recipes?.map((r) => (
            <RecipeListRow key={r.id} recipe={r} />
          ))}
        </ul>
      )}
    </div>
  );
}
