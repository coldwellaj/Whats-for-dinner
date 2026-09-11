import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client.js";
import type { MealPlanEntry, MealPlanStatus, MealType } from "../types.js";

export function useMealPlan(start: string, end: string) {
  return useQuery({
    queryKey: ["meal-plan", start, end],
    queryFn: () => api.get<MealPlanEntry[]>(`/meal-plan?start=${start}&end=${end}`),
  });
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["meal-plan"] });
  queryClient.invalidateQueries({ queryKey: ["shopping-list"] });
  queryClient.invalidateQueries({ queryKey: ["recipes"] });
}

export function useCreateMealPlanEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; mealType: MealType; recipeId: string }) =>
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
    }) => api.put<MealPlanEntry>(`/meal-plan/${id}`, data),
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
