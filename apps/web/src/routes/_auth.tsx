import { AUTH_KEYS } from "@/hooks/use-auth";
import { XLogoIcon } from "@phosphor-icons/react";
import { InstagramLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData({
      queryKey: AUTH_KEYS.session,
      queryFn: async () => {
        const { authClient } = await import("@/lib/auth");
        const result = await authClient.getSession();
        return result.data;
      },
    });

    if (session) {
      throw redirect({ to: "/generate" });
    }
  },

  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-between">
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <div className="animate-in fade-in zoom-in-95 w-full max-w-[400px] duration-500">
          <div className="mb-8 text-center">
            <h1 className="text-foreground text-2xl font-bold tracking-tight">
              QuickLogo
            </h1>
          </div>

          <Outlet />
        </div>
      </div>

      <footer className="py-8">
        <div className="text-muted-foreground flex items-center gap-6 opacity-50 transition-opacity hover:opacity-100">
          <a href="#" target="_blank" className="hover:text-foreground">
            <XLogoIcon className="h-4 w-4" />
          </a>
          <a href="#" target="_blank" className="hover:text-foreground">
            <InstagramLogoIcon className="h-4 w-4" />
          </a>
        </div>
      </footer>
    </div>
  );
}
