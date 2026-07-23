import { AUTH_KEYS } from "@/hooks/use-auth";
import logo from "@quicklogo/assets/brand/logo-transparent.png";
import { XLogoIcon } from "@phosphor-icons/react";
import { InstagramLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData({
      queryKey: AUTH_KEYS.session,
      queryFn: async () => {
        const { authClient } = await import("@/lib/auth-client");
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
    <div className="bg-background text-foreground relative min-h-screen">
      <main className="flex min-h-screen w-full items-center justify-center px-4 py-28 sm:py-32">
        <div className="animate-in fade-in zoom-in-95 relative w-full max-w-[400px] translate-y-6 duration-500 sm:translate-y-8">
          <img
            src={logo}
            alt="QuickLogo"
            className="absolute bottom-full left-1/2 -mb-2 size-28 -translate-x-1/2 object-contain sm:size-32"
          />

          <Outlet />
        </div>
      </main>

      <footer className="absolute bottom-0 left-1/2 -translate-x-1/2 py-4 sm:py-8">
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
