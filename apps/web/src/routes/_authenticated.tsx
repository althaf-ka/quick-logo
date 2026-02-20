import { AUTH_KEYS } from "@/hooks/use-auth";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData({
      queryKey: AUTH_KEYS.session,
      queryFn: async () => {
        const { authClient } = await import("@/lib/auth");
        const result = await authClient.getSession();
        return result.data;
      },
    });

    if (!session) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },

  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return <Outlet />;
}
