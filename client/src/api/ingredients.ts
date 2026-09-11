import { useQuery } from "@tanstack/react-query";
import { api } from "./client.js";
import type { Ingredient } from "../types.js";

export function useIngredientSearch(search: string) {
  return useQuery({
    queryKey: ["ingredients", search],
    queryFn: () => api.get<Ingredient[]>(`/ingredients?search=${encodeURIComponent(search)}`),
    enabled: search.length > 0,
  });
}
