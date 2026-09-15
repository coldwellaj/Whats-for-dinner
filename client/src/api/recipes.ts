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

// Merges a mutation's response onto the cached recipe detail instead of replacing it outright:
// /favorite and /share respond with the bare updated row (no `ingredients`, no computed
// `daysSinceLastMade`), so overwriting the cache with that directly would null out fields the
// detail page renders unconditionally. Skips entirely if nothing's cached yet — the detail page
// will fetch the full shape itself once actually visited.
function patchCachedRecipe(queryClient: ReturnType<typeof useQueryClient>, id: string, patch: Partial<Recipe>) {
  queryClient.setQueryData<Recipe>(["recipe", id], (old) => (old ? { ...old, ...patch } : old));
}

export function useUpdateRecipe(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RecipeInput) => api.put<Recipe>(`/recipes/${id}`, data),
    // The detail query lives under its own "recipe" key (see useRecipe above) so it isn't
    // swept up by the ["recipes"] list invalidation below — update it directly from the
    // response instead, or an edit made from the detail page wouldn't show up there.
    onSuccess: (updated) => {
      patchCachedRecipe(queryClient, id, updated);
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/recipes/${id}`),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ["recipe", id] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Recipe>(`/recipes/${id}/favorite`),
    onSuccess: (updated) => {
      patchCachedRecipe(queryClient, updated.id, updated);
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}

export function useToggleShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Recipe>(`/recipes/${id}/share`),
    onSuccess: (updated) => {
      patchCachedRecipe(queryClient, updated.id, updated);
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
