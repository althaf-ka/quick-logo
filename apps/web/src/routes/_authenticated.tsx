import { AUTH_KEYS } from "@/hooks/use-auth";
import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { TooltipProvider } from "@quicklogo/ui/components/tooltip";
import { cn } from "@quicklogo/ui/lib/utils";
import { AppSidebar } from "../components/sidebar/app-sidebar";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@quicklogo/ui/components/sidebar";
import { Separator } from "@quicklogo/ui/components/separator";

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

const PAGE_TITLES: Record<string, string> = {
  "/generate": "Generate Logo",
  "/edit": "Edit with AI",
  "/canvas": "Canvas Editor",
  "/projects": "My Projects",
  "/credits": "Billing & Credits",
  "/settings": "Settings",
};

function AuthenticatedLayout() {
  const { pathname } = useLocation();
  const title =
    Object.entries(PAGE_TITLES).find(([path]) =>
      pathname.startsWith(path),
    )?.[1] ?? "Dashboard";
  const isFullBleed =
    pathname.startsWith("/generate") ||
    pathname.startsWith("/edit") ||
    pathname.startsWith("/canvas");

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="h-dvh overflow-hidden">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1 size-8 cursor-pointer" />
            <Separator orientation="vertical" className="h-4" />
            <h1 className="text-sm font-semibold tracking-tight">{title}</h1>
          </header>

          <div
            className={cn(
              "flex-1",
              isFullBleed
                ? "flex flex-col overflow-hidden"
                : "scrollbar-subtle overflow-y-auto p-6",
            )}
          >
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
