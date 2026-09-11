import { useIngredientSearch } from "../api/ingredients.js";
import type { RecipeIngredientInput } from "../types.js";

interface Props {
  ingredients: RecipeIngredientInput[];
  onChange: (ingredients: RecipeIngredientInput[]) => void;
}

function IngredientRow({
  ingredient,
  index,
  onChangeRow,
  onRemove,
}: {
  ingredient: RecipeIngredientInput;
  index: number;
  onChangeRow: (index: number, patch: Partial<RecipeIngredientInput>) => void;
  onRemove: (index: number) => void;
}) {
  const { data: suggestions } = useIngredientSearch(ingredient.name);
  const listId = `ingredient-suggestions-${index}`;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <input
        list={listId}
        placeholder="Ingredient name"
        value={ingredient.name}
        onChange={(e) => onChangeRow(index, { name: e.target.value })}
        className="flex-1 min-w-[10rem] border rounded px-2 py-1 text-sm"
      />
      <datalist id={listId}>
        {suggestions?.map((s) => (
          <option key={s.id} value={s.name} />
        ))}
      </datalist>
      <input
        type="number"
        placeholder="Qty"
        value={ingredient.quantity ?? ""}
        onChange={(e) => onChangeRow(index, { quantity: e.target.value === "" ? null : Number(e.target.value) })}
        className="w-20 border rounded px-2 py-1 text-sm"
      />
      <input
        placeholder="Unit"
        value={ingredient.unit ?? ""}
        onChange={(e) => onChangeRow(index, { unit: e.target.value })}
        className="w-24 border rounded px-2 py-1 text-sm"
      />
      <input
        placeholder="Notes"
        value={ingredient.notes ?? ""}
        onChange={(e) => onChangeRow(index, { notes: e.target.value })}
        className="flex-1 min-w-[8rem] border rounded px-2 py-1 text-sm"
      />
      <button type="button" onClick={() => onRemove(index)} className="text-red-500 text-sm px-2">
        Remove
      </button>
    </div>
  );
}

export function IngredientListEditor({ ingredients, onChange }: Props) {
  function handleRowChange(index: number, patch: Partial<RecipeIngredientInput>) {
    const next = ingredients.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function handleRemove(index: number) {
    onChange(ingredients.filter((_, i) => i !== index));
  }

  function handleAdd() {
    onChange([...ingredients, { name: "", quantity: null, unit: "", notes: "" }]);
  }

  return (
    <div className="flex flex-col gap-2">
      {ingredients.map((ing, i) => (
        <IngredientRow key={i} ingredient={ing} index={i} onChangeRow={handleRowChange} onRemove={handleRemove} />
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="self-start text-sm text-emerald-700 hover:underline mt-1"
      >
        + Add ingredient
      </button>
    </div>
  );
}
