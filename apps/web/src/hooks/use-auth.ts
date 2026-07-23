import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { toast } from "@quicklogo/ui/components/sonner";
import { useRouter } from "@tanstack/react-router";
import { api } from "@/lib/api-client";
import type { InferResponseType } from "@quicklogo/api-client";

export const AUTH_KEYS = {
  session: ["auth", "session"] as const,
  user: ["auth", "user"] as const,
};

export type CurrentUser = InferResponseType<typeof api.user.profile.$get, 200>;

function isCurrentUser(value: unknown): value is CurrentUser {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.credits === "number"
  );
}

export function useSession() {
  return useQuery({
    queryKey: AUTH_KEYS.session,
    queryFn: async () => {
      const result = await authClient.getSession();
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useUser() {
  const { data: session } = useSession();

  return useQuery({
    queryKey: AUTH_KEYS.user,
    queryFn: async () => {
      const res = await api.user.profile.$get();
      if (!res.ok) throw new Error("Failed to fetch user");
      const data = await res.json();
      if (!isCurrentUser(data)) {
        throw new Error("Invalid user payload");
      }
      return data;
    },
    enabled: !!session?.session,
    staleTime: 30 * 1000,
  });
}

export function useGoogleLogin() {
  return useMutation({
    mutationFn: async ({ redirect }: { redirect?: string } = {}) => {
      let callbackURL = redirect || `${window.location.origin}/generate`;
      if (callbackURL.startsWith("/")) {
        callbackURL = `${window.location.origin}${callbackURL}`;
      }

      await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });
    },
    onError: (error) => {
      toast.error("Failed to sign in. Please try again.", {
        id: "google-signin",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      await authClient.signOut();
    },
    onSuccess: () => {
      queryClient.clear();

      toast.success("Signed out successfully", {
        id: "signout",
      });

      router.invalidate().finally(() => {
        router.navigate({ to: "/login" });
      });
    },
    onError: (error) => {
      toast.error("Failed to sign out", {
        id: "signout",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}

export function useAuth() {
  const { data: sessionData, isLoading: sessionLoading } = useSession();
  const { data: userData, isLoading: userLoading } = useUser();

  return {
    session: sessionData?.session,
    user: userData,
    isLoading: sessionLoading || (!!sessionData?.session && userLoading),
    isAuthenticated: !!sessionData?.session,
  };
}
