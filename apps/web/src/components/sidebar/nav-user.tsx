import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@quicklogo/ui/components/sidebar";
import { useAuth } from "@/hooks/use-auth";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@quicklogo/ui/components/avatar";

export function NavUser() {
  const { state } = useSidebar();
  const { user } = useAuth();

  const name = user?.name || "User";
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
            <div className="grid flex-1 overflow-hidden text-left leading-tight">
              <span className="truncate text-[13px] font-semibold">{name}</span>
              {email && (
                <span className="text-muted-foreground mt-0.5 truncate text-[11px]">
                  {email}
                </span>
              )}
            </div>
          )}
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
