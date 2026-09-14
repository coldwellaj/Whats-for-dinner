import { useIngredientSearch } from "../api/ingredients.js";
import { QUANTITY_OPTIONS, UNIT_OPTIONS } from "../lib/units.js";
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
    <div className="flex flex-wrap gap-2 items-center border rounded-md p-2 sm:border-0 sm:p-0">
      <input
        list={listId}
        placeholder="Ingredient name"
        value={ingredient.name}
        onChange={(e) => onChangeRow(index, { name: e.target.value })}
        className="w-full sm:w-auto sm:flex-1 sm:min-w-[10rem] border rounded px-2 py-1.5 sm:py-1 text-base sm:text-sm"
      />
      <datalist id={listId}>
        {suggestions?.map((s) => (
          <option key={s.id} value={s.name} />
        ))}
      </datalist>
      <select
        value={ingredient.quantity ?? ""}
        onChange={(e) => onChangeRow(index, { quantity: e.target.value === "" ? null : Number(e.target.value) })}
        className="w-24 border rounded px-2 py-1.5 sm:py-1 text-base sm:text-sm"
      >
        <option value="">Qty</option>
        {ingredient.quantity != null && !QUANTITY_OPTIONS.some((o) => Math.abs(o.value - ingredient.quantity!) < 0.001) && (
          <option value={ingredient.quantity}>{ingredient.quantity}</option>
        )}
        {QUANTITY_OPTIONS.map((o) => (
          <option key={o.label} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={ingredient.unit ?? ""}
        onChange={(e) => onChangeRow(index, { unit: e.target.value })}
        className="w-28 border rounded px-2 py-1.5 sm:py-1 text-base sm:text-sm"
      >
        <option value="">Unit</option>
        {ingredient.unit && !UNIT_OPTIONS.includes(ingredient.unit as (typeof UNIT_OPTIONS)[number]) && (
          <option value={ingredient.unit}>{ingredient.unit}</option>
        )}
        {UNIT_OPTIONS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
      <input
        placeholder="Notes"
        value={ingredient.notes ?? ""}
        onChange={(e) => onChangeRow(index, { notes: e.target.value })}
        className="flex-1 min-w-[8rem] border rounded px-2 py-1.5 sm:py-1 text-base sm:text-sm"
      />
      <button type="button" onClick={() => onRemove(index)} className="text-red-500 text-sm px-2 py-1.5 sm:py-1 shrink-0">
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
        className="self-start text-sm text-olive-700 hover:underline mt-1"
      >
        + Add ingredient
      </button>
    </div>
  );
}
