import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth";
import { toast } from "@quicklogo/ui/components/sonner";
import { useRouter } from "@tanstack/react-router";
// import { api } from "@/lib/api";

export const AUTH_KEYS = {
  session: ["auth", "session"] as const,
  user: ["auth", "user"] as const,
};

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

// export function useUser() {
//   const { data: session } = useSession();

//   return useQuery({
//     queryKey: AUTH_KEYS.user,
//     queryFn: async () => {
//       const res = await api.user.me.$get();
//       if (!res.ok) throw new Error("Failed to fetch user");
//       return res.json();
//     },
//     enabled: !!session,
//     staleTime: 10 * 60 * 1000,
//   });
// }

export function useGoogleLogin() {
  return useMutation({
    mutationFn: async ({ redirect }: { redirect?: string } = {}) => {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: redirect || `${window.location.origin}/generate`,
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
  const { data, isLoading: sessionLoading } = useSession();

  return {
    session: data?.session,
    user: data?.user,
    isLoading: sessionLoading,
    isAuthenticated: !!data?.session,
  };
}
