import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client.js";
import type { ShoppingListItem } from "../types.js";

export function useShoppingList(weekStart: string) {
  return useQuery({
    queryKey: ["shopping-list", weekStart],
    queryFn: () => api.get<ShoppingListItem[]>(`/shopping-list?weekStart=${weekStart}`),
  });
}

export function useAddManualItem(weekStart: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { customName: string; quantity?: number | null; unit?: string | null }) =>
      api.post<ShoppingListItem>(`/shopping-list/${weekStart}/items`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopping-list", weekStart] }),
  });
}

export function useUpdateShoppingListItem(weekStart: string) {
  const queryClient = useQueryClient();
  const queryKey = ["shopping-list", weekStart];
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      isChecked?: boolean;
      customName?: string;
      quantity?: number | null;
      unit?: string | null;
    }) => api.put<ShoppingListItem>(`/shopping-list/items/${id}`, data),
    // Applies the edit to the cached list immediately (e.g. so a checkbox toggles instantly
    // instead of waiting on the PUT round-trip), rolling back if the request fails.
    onMutate: async ({ id, ...data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ShoppingListItem[]>(queryKey);
      queryClient.setQueryData<ShoppingListItem[]>(queryKey, (old) =>
        old?.map((item) => (item.id === id ? { ...item, ...data } : item))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useDeleteShoppingListItem(weekStart: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/shopping-list/items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopping-list", weekStart] }),
  });
}
