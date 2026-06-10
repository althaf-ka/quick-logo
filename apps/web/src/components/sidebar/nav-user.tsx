import { useCallback, useState } from "react";
import {
  SidebarMenu,
  SidebarMenuItem,
} from "@quicklogo/ui/components/sidebar";
import { useAuth } from "@/hooks/use-auth";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@quicklogo/ui/components/avatar";

export function NavUser() {
  const { user } = useAuth();

  const name = user?.name || "User";
  const email = user?.email || "";
  const imageUrl = user?.image ?? undefined;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initials = name.slice(0, 2).toUpperCase();

  const displayImageUrl =
    imageUrl && imageUrl !== failedUrl ? imageUrl : undefined;

  const handleImageError = useCallback(() => {
    if (imageUrl) setFailedUrl(imageUrl);
  }, [imageUrl]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div
          className="group/nav-user hover:border-border/60 hover:bg-muted/40 relative flex items-center gap-3 overflow-hidden rounded-none border border-transparent px-2.5 py-2 transition-all duration-200 ease-linear group-data-[collapsible=icon]:!px-1.5"
        >
          <span className="bg-primary/60 pointer-events-none absolute top-1/2 left-0 h-6 w-0.5 -translate-y-1/2 opacity-0 transition-opacity group-hover/nav-user:opacity-100" />

          <Avatar className="border-border/60 bg-muted/20 size-9 shrink-0 rounded-none border shadow-sm after:rounded-none">
            <AvatarImage
              key={displayImageUrl ?? "no-avatar"}
              src={displayImageUrl ?? ""}
              alt={name}
              className="rounded-none"
              referrerPolicy="no-referrer"
              onError={handleImageError}
            />
            <AvatarFallback className="bg-primary/10 text-primary rounded-none text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="grid min-w-0 flex-1 text-left leading-tight">
            <span className="truncate text-[13px] font-semibold tracking-tight">
              {name}
            </span>

            {email ? (
              <span className="text-muted-foreground mt-0.5 truncate text-[11px]">
                {email}
              </span>
            ) : null}
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
