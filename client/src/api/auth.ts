import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client.js";

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  familyId: string | null;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.get<{ user: CurrentUser }>("/auth/me").then((r) => r.user),
    retry: false,
  });
}

export function useGoogleLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credential: string) => api.post<{ user: CurrentUser }>("/auth/google", { credential }),
    onSuccess: ({ user }) => {
      queryClient.setQueryData(["auth", "me"], user);
    },
  });
}

export interface EmailCredentials {
  email: string;
  password: string;
  name?: string;
}

export function useEmailSignup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EmailCredentials) => api.post<{ user: CurrentUser }>("/auth/signup", data),
    onSuccess: ({ user }) => {
      queryClient.setQueryData(["auth", "me"], user);
    },
  });
}

export function useEmailLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Pick<EmailCredentials, "email" | "password">) =>
      api.post<{ user: CurrentUser }>("/auth/login", data),
    onSuccess: ({ user }) => {
      queryClient.setQueryData(["auth", "me"], user);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; picture?: string | null }) =>
      api.put<{ user: CurrentUser }>("/auth/me", data),
    onSuccess: ({ user }) => {
      queryClient.setQueryData(["auth", "me"], user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>("/auth/logout"),
    onSuccess: () => {
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.clear();
    },
  });
}
