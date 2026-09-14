import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { useCreateMealPlanEntry, useDeleteMealPlanEntry, useMealPlan, useUpdateMealPlanEntry } from "../api/mealPlan.js";
import { RecipePicker } from "../components/RecipePicker.js";
import { addDays, currentWeekStart, formatDayLabel, formatWeekRangeLabel } from "../lib/dates.js";
import type { MealPlanEntry, MealPlanStatus, MealType } from "../types.js";

const MEAL_TYPES: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];
const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};

const STATUS_STYLES: Record<MealPlanStatus, string> = {
  PLANNED: "bg-blue-50 text-blue-700",
  MADE: "bg-emerald-50 text-emerald-700",
  SKIPPED: "bg-gray-100 text-gray-400 line-through",
};

function MealEntryPill({ entry }: { entry: MealPlanEntry }) {
  const updateEntry = useUpdateMealPlanEntry();
  const deleteEntry = useDeleteMealPlanEntry();

  function cycleStatus() {
    const next: Record<MealPlanStatus, MealPlanStatus> = {
      PLANNED: "MADE",
      MADE: "SKIPPED",
      SKIPPED: "PLANNED",
    };
    updateEntry.mutate({ id: entry.id, status: next[entry.status] });
  }

  return (
    <div className={`rounded px-2 py-1 text-xs flex items-center justify-between gap-1 ${STATUS_STYLES[entry.status]}`}>
      <button onClick={cycleStatus} className="text-left flex-1 truncate" title="Click to cycle: planned → made → skipped">
        <Link to={`/recipes/${entry.recipe.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
          {entry.recipe.isFavorite ? "❤️ " : ""}
          {entry.recipe.name}
        </Link>
      </button>
      <button onClick={() => deleteEntry.mutate(entry.id)} className="text-gray-400 hover:text-red-500 px-1 -my-1 py-1">
        ×
      </button>
    </div>
  );
}

export function MealPlanPage() {
  const [weekStart, setWeekStart] = useState(currentWeekStart());
  const [pickerTarget, setPickerTarget] = useState<{ date: string; mealType: MealType } | null>(null);

  const weekEnd = addDays(weekStart, 7);
  const { data: entries, isLoading } = useMealPlan(weekStart, weekEnd);
  const createEntry = useCreateMealPlanEntry();

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function entriesFor(date: string, mealType: MealType) {
    return entries?.filter((e) => e.date.slice(0, 10) === date && e.mealType === mealType) ?? [];
  }

  async function handleSelectRecipe(recipeId: string) {
    if (!pickerTarget) return;
    await createEntry.mutateAsync({ date: pickerTarget.date, mealType: pickerTarget.mealType, recipeId });
    setPickerTarget(null);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800">Meal Plan</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="px-3 py-2 border rounded text-sm">
            ← Prev
          </button>
          <span className="text-sm font-medium text-gray-700">{formatWeekRangeLabel(weekStart)}</span>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="px-3 py-2 border rounded text-sm">
            Next →
          </button>
          <button onClick={() => setWeekStart(currentWeekStart())} className="px-3 py-2 text-sm text-emerald-700">
            Today
          </button>
        </div>
      </div>

      {isLoading && <p className="text-gray-500">Loading meal plan...</p>}

      <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="grid grid-cols-[6rem_repeat(7,minmax(9rem,1fr))] gap-1 min-w-[60rem]">
          <div />
          {days.map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-gray-700 pb-1">
              {formatDayLabel(day)}
            </div>
          ))}

          {MEAL_TYPES.map((mealType) => (
            <Fragment key={mealType}>
              <div className="text-sm font-medium text-gray-500 flex items-center">{MEAL_LABELS[mealType]}</div>
              {days.map((day) => (
                <div key={`${mealType}-${day}`} className="border rounded-md p-1.5 bg-white min-h-[4rem] flex flex-col gap-1">
                  {entriesFor(day, mealType).map((entry) => (
                    <MealEntryPill key={entry.id} entry={entry} />
                  ))}
                  <button
                    onClick={() => setPickerTarget({ date: day, mealType })}
                    className="text-xs text-gray-400 hover:text-emerald-600 text-left"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      {pickerTarget && <RecipePicker onSelect={handleSelectRecipe} onClose={() => setPickerTarget(null)} />}
    </div>
  );
}
