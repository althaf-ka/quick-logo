import { Link, useLocation } from "@tanstack/react-router";
import { FolderIcon, MagicWandIcon, SwatchesIcon } from "@phosphor-icons/react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@quicklogo/ui/components/sidebar";

export function NavMain() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const isGenerateActive = pathname === "/generate";
  const isProjectsActive =
    pathname === "/projects" ||
    pathname.startsWith("/projects/") ||
    pathname.startsWith("/edit/") ||
    pathname.startsWith("/canvas/");
  const isBrandKitActive =
    pathname === "/brand-kit" || pathname.startsWith("/brand-kit/");

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-muted-foreground/60 px-3 text-[10px] font-semibold tracking-[0.2em] uppercase">
        Menu
      </SidebarGroupLabel>
      <SidebarMenu className="gap-0.5">
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Generate Logo"
            isActive={isGenerateActive}
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
            isActive={isProjectsActive}
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
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Brand Kit"
            isActive={isBrandKitActive}
            className="text-muted-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground hover:bg-sidebar-accent group/brandkit h-9 rounded-none transition-all duration-150 active:scale-[0.98]"
            render={<Link to="/brand-kit" />}
          >
            <SwatchesIcon
              weight="bold"
              className="size-4 transition-transform duration-300 group-hover/brandkit:scale-110"
            />
            <span className="text-[13px] tracking-tight">Brand Kit</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
