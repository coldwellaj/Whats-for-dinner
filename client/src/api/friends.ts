import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client.js";
import type {
  Friend,
  FriendProfile,
  FriendRequestIncoming,
  FriendRequestOutgoing,
  MealPlanEntry,
  PrivacySettings,
  Recipe,
} from "../types.js";

export function usePrivacySettings() {
  return useQuery({
    queryKey: ["friends", "privacy"],
    queryFn: () => api.get<PrivacySettings>("/friends/privacy"),
  });
}

export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PrivacySettings>) => api.put<PrivacySettings>("/friends/privacy", data),
    onSuccess: (data) => queryClient.setQueryData(["friends", "privacy"], data),
  });
}

export function useFriends() {
  return useQuery({
    queryKey: ["friends"],
    queryFn: () => api.get<Friend[]>("/friends"),
  });
}

export function useFriendRequests() {
  return useQuery({
    queryKey: ["friends", "requests"],
    queryFn: () => api.get<{ incoming: FriendRequestIncoming[]; outgoing: FriendRequestOutgoing[] }>("/friends/requests"),
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => api.post<{ status: "requested" | "accepted" }>("/friends/requests", { email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/friends/requests/${id}/accept`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }),
  });
}

/** Cancels a pending request, declines one, or removes an existing friendship — same endpoint. */
export function useRemoveFriendship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/friends/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }),
  });
}

export function useFriendProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["friends", userId, "profile"],
    queryFn: () => api.get<FriendProfile>(`/friends/${userId}/profile`),
    enabled: !!userId,
  });
}

export function useFriendMealPlan(userId: string | undefined, start: string, end: string) {
  return useQuery({
    queryKey: ["friends", userId, "meal-plan", start, end],
    queryFn: () => api.get<MealPlanEntry[]>(`/friends/${userId}/meal-plan?start=${start}&end=${end}`),
    enabled: !!userId,
    retry: false,
  });
}

export function useFriendRecentlyMade(userId: string | undefined) {
  return useQuery({
    queryKey: ["friends", userId, "recently-made"],
    queryFn: () => api.get<MealPlanEntry[]>(`/friends/${userId}/recently-made`),
    enabled: !!userId,
    retry: false,
  });
}

export function useFriendRecipes(userId: string | undefined) {
  return useQuery({
    queryKey: ["friends", userId, "recipes"],
    queryFn: () => api.get<Recipe[]>(`/friends/${userId}/recipes`),
    enabled: !!userId,
    retry: false,
  });
}
