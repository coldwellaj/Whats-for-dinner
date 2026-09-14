import { useState } from "react";
import {
  useAddManualItem,
  useDeleteShoppingListItem,
  useShoppingList,
  useUpdateShoppingListItem,
} from "../api/shoppingList.js";
import { addDays, currentWeekStart, formatWeekRangeLabel } from "../lib/dates.js";
import { formatQuantity } from "../lib/units.js";

export function ShoppingListPage() {
  const [weekStart, setWeekStart] = useState(currentWeekStart());
  const { data: items, isLoading } = useShoppingList(weekStart);
  const updateItem = useUpdateShoppingListItem(weekStart);
  const deleteItem = useDeleteShoppingListItem(weekStart);
  const addManualItem = useAddManualItem(weekStart);

  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");

  async function handleAddManual(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemName.trim()) return;
    await addManualItem.mutateAsync({
      customName: newItemName.trim(),
      quantity: newItemQty === "" ? null : Number(newItemQty),
      unit: newItemUnit || null,
    });
    setNewItemName("");
    setNewItemQty("");
    setNewItemUnit("");
  }

  const uncheckedItems = items?.filter((i) => !i.isChecked) ?? [];
  const checkedItems = items?.filter((i) => i.isChecked) ?? [];

  function itemLabel(item: NonNullable<typeof items>[number]) {
    const name = item.ingredient?.name ?? item.customName ?? "";
    const quantity = item.quantity != null ? formatQuantity(item.quantity) : null;
    return [quantity, item.unit, name].filter((v) => v !== null && v !== "" && v !== undefined).join(" ");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800">Shopping List</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="px-3 py-2 border rounded text-sm">
            ← Prev
          </button>
          <span className="text-sm font-medium text-gray-700">{formatWeekRangeLabel(weekStart)}</span>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="px-3 py-2 border rounded text-sm">
            Next →
          </button>
        </div>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {items?.length === 0 && (
        <p className="text-gray-500 text-sm">
          No items yet. Add recipes to this week's meal plan and they'll show up here.
        </p>
      )}

      <ul className="flex flex-col gap-1">
        {uncheckedItems.map((item) => (
          <li key={item.id} className="flex items-center gap-2 bg-white border rounded">
            <label className="flex-1 flex items-center gap-2 px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={item.isChecked}
                onChange={(e) => updateItem.mutate({ id: item.id, isChecked: e.target.checked })}
                className="w-4 h-4 shrink-0"
              />
              <span className="flex-1 text-sm">{itemLabel(item)}</span>
            </label>
            {item.isManual && (
              <button
                onClick={() => deleteItem.mutate(item.id)}
                className="text-gray-400 hover:text-red-500 text-sm px-3 py-2.5"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>

      {checkedItems.length > 0 && (
        <div>
          <p className="text-xs uppercase text-gray-400 font-medium mt-2 mb-1">Checked off</p>
          <ul className="flex flex-col gap-1">
            {checkedItems.map((item) => (
              <li key={item.id} className="flex items-center gap-2 bg-gray-50 border rounded">
                <label className="flex-1 flex items-center gap-2 px-3 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.isChecked}
                    onChange={(e) => updateItem.mutate({ id: item.id, isChecked: e.target.checked })}
                    className="w-4 h-4 shrink-0"
                  />
                  <span className="flex-1 text-sm text-gray-400 line-through">{itemLabel(item)}</span>
                </label>
                {item.isManual && (
                  <button
                    onClick={() => deleteItem.mutate(item.id)}
                    className="text-gray-400 hover:text-red-500 text-sm px-3 py-2.5"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleAddManual} className="flex gap-2 items-center mt-2 flex-wrap">
        <input
          placeholder="Add item..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          className="flex-1 min-w-[8rem] border rounded px-3 py-2 text-base sm:text-sm"
        />
        <input
          type="number"
          placeholder="Qty"
          value={newItemQty}
          onChange={(e) => setNewItemQty(e.target.value)}
          className="w-20 border rounded px-3 py-2 text-base sm:text-sm"
        />
        <input
          placeholder="Unit"
          value={newItemUnit}
          onChange={(e) => setNewItemUnit(e.target.value)}
          className="w-24 border rounded px-3 py-2 text-base sm:text-sm"
        />
        <button type="submit" className="bg-olive-600 text-white px-4 py-2 rounded-md text-sm font-medium">
          Add
        </button>
      </form>
    </div>
  );
}
