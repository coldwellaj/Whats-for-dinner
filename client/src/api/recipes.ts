import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client.js";
import type { Recipe, RecipeInput, SharedRecipe } from "../types.js";

export function useRecipes(params: { search?: string; favorite?: boolean; sortLastMadeAsc?: boolean } = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.favorite) query.set("favorite", "true");
  if (params.sortLastMadeAsc) query.set("sort", "lastMadeAsc");
  const qs = query.toString();
  return useQuery({
    queryKey: ["recipes", params],
    queryFn: () => api.get<Recipe[]>(`/recipes${qs ? `?${qs}` : ""}`),
  });
}

export function useRecipe(id: string | undefined) {
  return useQuery({
    // Deliberately "recipe" (singular), not "recipes" — every recipe-list mutation below
    // invalidates the ["recipes"] prefix, which would otherwise also match this single-recipe
    // query and force it to refetch (e.g. right after a delete, 404ing and retrying).
    queryKey: ["recipe", id],
    queryFn: () => api.get<Recipe>(`/recipes/${id}`),
    enabled: !!id,
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RecipeInput) => api.post<Recipe>("/recipes", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

export function useUpdateRecipe(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RecipeInput) => api.put<Recipe>(`/recipes/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/recipes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Recipe>(`/recipes/${id}/favorite`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

export function useToggleShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Recipe>(`/recipes/${id}/share`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["shared-recipes"] });
    },
  });
}

export function useSharedRecipes(params: { sort?: "popular" | "name" } = {}) {
  const query = new URLSearchParams();
  if (params.sort) query.set("sort", params.sort);
  const qs = query.toString();
  return useQuery({
    queryKey: ["shared-recipes", params],
    queryFn: () => api.get<SharedRecipe[]>(`/recipes/shared${qs ? `?${qs}` : ""}`),
  });
}

export function useSharedRecipe(id: string | undefined) {
  return useQuery({
    queryKey: ["shared-recipes", id],
    queryFn: () => api.get<SharedRecipe>(`/recipes/shared/${id}`),
    enabled: !!id,
  });
}

export function useCopyRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Recipe>(`/recipes/${id}/copy`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["shared-recipes"] });
    },
  });
}
