import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client.js";

export interface FamilyMember {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export interface Family {
  id: string;
  name: string | null;
  ownerId: string;
  members: FamilyMember[];
}

export function useFamily() {
  return useQuery({
    queryKey: ["family"],
    queryFn: () => api.get<{ family: Family | null }>("/family").then((r) => r.family),
  });
}

export function useCreateFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name?: string) => api.post<{ family: Family }>("/family", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

export function useInviteToFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => api.post<{ status: "added" | "invited" }>("/family/invite", { email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family"] });
    },
  });
}

export function useRemoveFamilyMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete<void>(`/family/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family"] });
    },
  });
}
