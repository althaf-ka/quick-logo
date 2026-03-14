import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@quicklogo/ui/components/sidebar";
import { useAuth, useLogout } from "@/hooks/use-auth";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@quicklogo/ui/components/avatar";
import { SignOut } from "@phosphor-icons/react";

export function NavUser() {
  const { state } = useSidebar();
  const { user } = useAuth();
  const logout = useLogout();

  const name = user?.name || "Admin User";
  const email = user?.email || "";
  // @ts-expect-error - image property might exist on user object
  const imageUrl: string | undefined = user?.image || user?.picture;
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div
          className={`hover:bg-sidebar-accent flex items-center p-2.5 transition-colors ${
            state === "collapsed" ? "justify-center" : "gap-2.5"
          }`}
        >
          <Avatar className="border-border size-9 shrink-0 rounded-none border after:rounded-none">
            {imageUrl && (
              <AvatarImage src={imageUrl} alt={name} className="rounded-none" />
            )}
            <AvatarFallback className="bg-primary/10 text-primary rounded-none text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {state === "expanded" && (
            <>
              <div className="grid flex-1 overflow-hidden text-left leading-tight">
                <span className="truncate text-[13px] font-semibold">
                  {name}
                </span>
                {email && (
                  <span className="text-muted-foreground mt-0.5 truncate text-[11px]">
                    {email}
                  </span>
                )}
              </div>
              <button
                onClick={() => logout.mutate()}
                className="text-muted-foreground hover:text-foreground transition-colors outline-none"
                title="Sign out"
              >
                <SignOut size={16} />
              </button>
            </>
          )}
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
