import { AUTH_KEYS } from "@/hooks/use-auth";
import logo from "@quicklogo/assets/brand/logo-transparent.png";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ context, location }) => {
    console.log("[_auth.tsx] beforeLoad START", {
      pathname: location.pathname,
    });
    const session = await context.queryClient.ensureQueryData({
      queryKey: AUTH_KEYS.session,
      queryFn: async () => {
        const { authClient } = await import("@/lib/auth");
        const result = await authClient.getSession();
        return result.data;
      },
    });

    // If the user already has a valid auth session AND they are
    // trying to visit the actual login page (not just access-denied), punt them to dashboard.
    if (session && location.pathname !== "/access-denied") {
      console.log("[_auth.tsx] REDIRECTING to /");
      throw redirect({ to: "/" });
    }
  },

  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center">
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <div className="animate-in fade-in zoom-in-95 w-full max-w-100 duration-500">
          <div className="bg-background mb-8 text-center">
            <img
              src={logo}
              alt="QuickLogo"
              className="mx-auto size-52 object-contain"
            />
            <p className="text-muted-foreground mt-3 text-xs font-bold tracking-[0.2em] uppercase">
              Admin
            </p>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
