import { Link, useMatchRoute } from "@tanstack/react-router";
import { FolderIcon, MagicWandIcon } from "@phosphor-icons/react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@quicklogo/ui/components/sidebar";

export function NavMain() {
  const matchRoute = useMatchRoute();

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-muted-foreground/60 px-3 text-[10px] font-semibold tracking-[0.2em] uppercase">
        Menu
      </SidebarGroupLabel>
      <SidebarMenu className="gap-0.5">
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Generate Logo"
            isActive={!!matchRoute({ to: "/generate" })}
            className="text-muted-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground hover:bg-sidebar-accent group/generate h-9 rounded-none transition-all duration-150 active:scale-[0.98]"
            render={<Link to="/generate" />}
          >
            <MagicWandIcon
              weight="bold"
              className="size-4 transition-transform duration-300 group-hover/generate:-rotate-12"
            />
            <span className="text-[13px] tracking-tight">Generate Logo</span>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="My Projects"
            isActive={!!matchRoute({ to: "/projects" })}
            className="text-muted-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground hover:bg-sidebar-accent group/projects h-9 rounded-none transition-all duration-150 active:scale-[0.98]"
            render={<Link to="/projects" />}
          >
            <FolderIcon
              weight="bold"
              className="size-4 transition-transform duration-300 group-hover/projects:scale-110"
            />
            <span className="text-[13px] tracking-tight">My Projects</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
