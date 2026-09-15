import { useState } from "react";
import { useRecipes } from "../api/recipes.js";

interface Props {
  onSelect: (recipeId: string) => void;
  onClose: () => void;
  disabled?: boolean;
}

export function RecipePicker({ onSelect, onClose, disabled }: Props) {
  const [search, setSearch] = useState("");
  const { data: recipes, isLoading } = useRecipes({ search, sortLastMadeAsc: true });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-16 z-20" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b">
          <input
            autoFocus
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded px-3 py-2 text-base sm:text-sm"
          />
        </div>
        <div className="overflow-y-auto flex-1">
          {isLoading && <p className="p-4 text-sm text-gray-500">Loading...</p>}
          {recipes?.length === 0 && <p className="p-4 text-sm text-gray-500">No recipes found.</p>}
          {recipes?.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              disabled={disabled}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b flex items-center justify-between gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              <span className="font-medium">
                {r.isFavorite ? "❤️ " : ""}
                {r.name}
              </span>
              <span className="text-xs text-gray-500 shrink-0">
                {r.daysSinceLastMade == null ? "Never made" : `${r.daysSinceLastMade}d ago`}
              </span>
            </button>
          ))}
        </div>
        <div className="p-2 border-t text-right">
          <button onClick={onClose} className="text-sm text-gray-600 px-3 py-1 hover:underline">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
