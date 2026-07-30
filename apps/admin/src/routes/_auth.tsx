import { AUTH_KEYS, fetchSession } from "@/hooks/use-auth";
import logo from "@quicklogo/assets/brand/logo-transparent.png";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData({
      queryKey: AUTH_KEYS.session,
      queryFn: fetchSession,
    });

    // If the user already has a valid auth session AND they are
    // trying to visit the actual login page (not just access-denied), punt them to dashboard.
    if (session && location.pathname !== "/access-denied") {
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
