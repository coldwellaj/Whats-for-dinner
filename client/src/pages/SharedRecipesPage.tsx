import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCopyRecipe, useSharedRecipes } from "../api/recipes.js";
import type { SharedRecipe } from "../types.js";

type SortMode = "popular" | "name";

function attributionLabel(recipe: SharedRecipe): string {
  if (recipe.family?.name) return `Shared by ${recipe.family.name}`;
  return `Shared by ${recipe.user.name ?? recipe.user.email}`;
}

function recipeTags(recipe: SharedRecipe): string[] {
  return recipe.tags ? recipe.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
}

function SharedRecipeCard({ recipe }: { recipe: SharedRecipe }) {
  const copyRecipe = useCopyRecipe();

  return (
    <div className="border rounded-lg p-4 bg-white flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
      <Link to={`/shared/${recipe.id}`} className="font-semibold text-lg text-olive-800 hover:underline">
        {recipe.name}
      </Link>
      {recipe.description && <p className="text-sm text-gray-600 line-clamp-2">{recipe.description}</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
        {recipe.prepTimeMinutes != null && <span>Prep {recipe.prepTimeMinutes}m</span>}
        {recipe.cookTimeMinutes != null && <span>Cook {recipe.cookTimeMinutes}m</span>}
        {recipe.servings != null && <span>Serves {recipe.servings}</span>}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-400">{attributionLabel(recipe)}</span>
        {recipe.saveCount > 0 && (
          <span className="text-xs font-medium text-olive-700 shrink-0">
            🔁 Saved {recipe.saveCount}×
          </span>
        )}
      </div>
      {recipe.tags && (
        <div className="flex flex-wrap gap-1 mt-1">
          {recipeTags(recipe).map((t) => (
            <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {t}
            </span>
          ))}
        </div>
      )}
      <button
        onClick={() => copyRecipe.mutate(recipe.id)}
        disabled={copyRecipe.isPending}
        className="self-start mt-1 text-sm text-olive-700 hover:underline disabled:opacity-50"
      >
        {copyRecipe.isSuccess ? "Saved to your recipes ✓" : "+ Save a copy"}
      </button>
    </div>
  );
}

export function SharedRecipesPage() {
  const [sort, setSort] = useState<SortMode>("popular");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const { data: recipes, isLoading, error } = useSharedRecipes({ sort });

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    recipes?.forEach((r) => recipeTags(r).forEach((t) => tags.add(t)));
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [recipes]);

  const visibleRecipes = useMemo(() => {
    if (!selectedTag) return recipes;
    return recipes?.filter((r) => recipeTags(r).includes(selectedTag));
  }, [recipes, selectedTag]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Discover</h1>
        <p className="text-sm text-gray-500">Recipes other people have marked shareable.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setSort("popular")}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              sort === "popular" ? "bg-olive-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Most popular
          </button>
          <button
            type="button"
            onClick={() => setSort("name")}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              sort === "name" ? "bg-olive-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Name (A–Z)
          </button>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-gray-400 mr-1">Tag:</span>
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                selectedTag === null ? "bg-olive-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  selectedTag === tag ? "bg-olive-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading && <p className="text-gray-500">Loading shared recipes...</p>}
      {error && <p className="text-red-600">Failed to load shared recipes.</p>}
      {recipes?.length === 0 && (
        <p className="text-gray-500">
          No shared recipes yet. Mark one of your own recipes as shareable to be the first!
        </p>
      )}
      {recipes && recipes.length > 0 && visibleRecipes?.length === 0 && (
        <p className="text-gray-500">No shared recipes tagged "{selectedTag}".</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {visibleRecipes?.map((r) => (
          <SharedRecipeCard key={r.id} recipe={r} />
        ))}
      </div>
    </div>
  );
}
