import { Fragment, useState } from "react";
import { useParams } from "react-router-dom";
import { useFriendMealPlan, useFriendProfile, useFriendRecentlyMade, useFriendRecipes } from "../api/friends.js";
import { addDays, currentWeekStart, formatDayLabel, formatWeekRangeLabel } from "../lib/dates.js";
import type { MealPlanStatus, MealType } from "../types.js";

const MEAL_TYPES: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];
const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};
const STATUS_STYLES: Record<MealPlanStatus, string> = {
  PLANNED: "bg-blue-50 text-blue-700",
  MADE: "bg-olive-50 text-olive-700",
  SKIPPED: "bg-gray-100 text-gray-400 line-through",
};

function PrivateNotice({ message }: { message: string }) {
  return <p className="text-sm text-gray-400">🔒 {message}</p>;
}

function MealPlanSection({ userId }: { userId: string }) {
  const [weekStart, setWeekStart] = useState(currentWeekStart());
  const weekEnd = addDays(weekStart, 7);
  const { data: entries, error } = useFriendMealPlan(userId, weekStart, weekEnd);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function entriesFor(date: string, mealType: MealType) {
    return entries?.filter((e) => e.date.slice(0, 10) === date && e.mealType === mealType) ?? [];
  }

  if (error) return <PrivateNotice message={error.message} />;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="px-3 py-1.5 border rounded text-sm">
          ← Prev
        </button>
        <span className="text-sm font-medium text-gray-700">{formatWeekRangeLabel(weekStart)}</span>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="px-3 py-1.5 border rounded text-sm">
          Next →
        </button>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <div className="grid grid-cols-[5rem_repeat(7,minmax(7rem,1fr))] gap-1 min-w-[50rem]">
          <div />
          {days.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-700 pb-1">
              {formatDayLabel(day)}
            </div>
          ))}
          {MEAL_TYPES.map((mealType) => (
            <Fragment key={mealType}>
              <div className="text-xs font-medium text-gray-500 flex items-center">{MEAL_LABELS[mealType]}</div>
              {days.map((day) => (
                <div key={`${mealType}-${day}`} className="border rounded-md p-1.5 bg-white min-h-[3rem] flex flex-col gap-1">
                  {entriesFor(day, mealType).map((entry) => (
                    <div key={entry.id} className={`rounded px-2 py-1 text-xs truncate ${STATUS_STYLES[entry.status]}`}>
                      {entry.recipe.name}
                    </div>
                  ))}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function RecentlyMadeSection({ userId }: { userId: string }) {
  const { data: entries, error } = useFriendRecentlyMade(userId);
  if (error) return <PrivateNotice message={error.message} />;
  if (entries?.length === 0) return <p className="text-sm text-gray-500">Nothing marked made yet.</p>;

  return (
    <ul className="flex flex-col gap-1">
      {entries?.map((entry) => (
        <li key={entry.id} className="flex items-center gap-2 bg-white border rounded px-3 py-2 text-sm">
          <span className="flex-1">{entry.recipe.name}</span>
          <span className="text-xs text-gray-400">{new Date(entry.date).toLocaleDateString()}</span>
        </li>
      ))}
    </ul>
  );
}

function RecipeListSection({ userId }: { userId: string }) {
  const { data: recipes, error } = useFriendRecipes(userId);
  if (error) return <PrivateNotice message={error.message} />;
  if (recipes?.length === 0) return <p className="text-sm text-gray-500">No recipes yet.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {recipes?.map((r) => (
        <div key={r.id} className="border rounded-lg p-3 bg-white flex flex-col gap-1">
          <span className="font-medium text-gray-800">{r.name}</span>
          {r.description && <p className="text-sm text-gray-600 line-clamp-2">{r.description}</p>}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
            {r.prepTimeMinutes != null && <span>Prep {r.prepTimeMinutes}m</span>}
            {r.cookTimeMinutes != null && <span>Cook {r.cookTimeMinutes}m</span>}
            {r.servings != null && <span>Serves {r.servings}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FriendActivityPage() {
  const { id } = useParams();
  const { data: profile, isLoading, error } = useFriendProfile(id);

  if (isLoading) return <p className="max-w-2xl mx-auto px-4 py-6 text-gray-500">Loading...</p>;
  if (error || !profile) return <p className="max-w-2xl mx-auto px-4 py-6 text-red-600">User not found.</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-800">{profile.name ?? profile.email}</h1>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-gray-800">Meal plan</h2>
        <MealPlanSection userId={profile.id} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-gray-800">Recently made</h2>
        <RecentlyMadeSection userId={profile.id} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-gray-800">Recipes</h2>
        <RecipeListSection userId={profile.id} />
      </section>
    </div>
  );
}
