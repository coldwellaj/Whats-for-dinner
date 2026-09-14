import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client.js";

export interface FamilyMember {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export interface SentFamilyInvite {
  id: string;
  email: string;
  createdAt: string;
}

export interface Family {
  id: string;
  name: string | null;
  ownerId: string;
  members: FamilyMember[];
  invites: SentFamilyInvite[];
}

export interface ReceivedFamilyInvite {
  id: string;
  familyName: string | null;
  createdAt: string;
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
    mutationFn: (email: string) => api.post<{ status: "invited" }>("/family/invite", { email }),
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

/** Pending family invites addressed to the current user's own email. */
export function useMyFamilyInvites() {
  return useQuery({
    queryKey: ["family", "invites"],
    queryFn: () => api.get<ReceivedFamilyInvite[]>("/family/invites"),
  });
}

export function useAcceptFamilyInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<void>(`/family/invites/${id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

/** Declines an invite addressed to you, or cancels one your family sent — same endpoint. */
export function useRemoveFamilyInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/family/invites/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family"] });
    },
  });
}
