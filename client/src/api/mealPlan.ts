import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client.js";
import type { MealPlanEntry, MealPlanEntryDetail, MealPlanStatus, MealType, RecipeIngredientInput } from "../types.js";

export function useMealPlan(start: string, end: string) {
  return useQuery({
    queryKey: ["meal-plan", start, end],
    queryFn: () => api.get<MealPlanEntry[]>(`/meal-plan?start=${start}&end=${end}`),
  });
}

// Deliberately its own ["meal-plan", "entry", id] key rather than reusing the week-range list
// key above — see useRecipe's analogous comment in api/recipes.ts for why: invalidating
// ["meal-plan"] on every mutation shouldn't force this detail view to refetch mid-edit.
export function useMealPlanEntryDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["meal-plan", "entry", id],
    queryFn: () => api.get<MealPlanEntryDetail>(`/meal-plan/${id}`),
    enabled: !!id,
  });
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["meal-plan"] });
  queryClient.invalidateQueries({ queryKey: ["shopping-list"] });
  queryClient.invalidateQueries({ queryKey: ["recipes"] });
}

/** Per-occurrence overrides shared by create and update: see MealPlanEntry's schema comment. */
interface MealPlanCustomization {
  /** Overrides the recipe's own servings for just this occurrence; null clears the override. */
  servings?: number | null;
  /** Replaces this entry's own ingredient list; null resets it to follow the recipe's ingredients. */
  ingredients?: RecipeIngredientInput[] | null;
}

export function useCreateMealPlanEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; mealType: MealType; recipeId: string } & MealPlanCustomization) =>
      api.post<MealPlanEntry>("/meal-plan", data),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useUpdateMealPlanEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      date?: string;
      mealType?: MealType;
      recipeId?: string;
      status?: MealPlanStatus;
    } & MealPlanCustomization) => api.put<MealPlanEntry>(`/meal-plan/${id}`, data),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useDeleteMealPlanEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/meal-plan/${id}`),
    onSuccess: () => invalidateAll(queryClient),
  });
}
