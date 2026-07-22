import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@quicklogo/ui/components/sidebar";
import { Link } from "@tanstack/react-router";

export function NavHeader() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="cursor-pointer rounded-none hover:bg-transparent active:bg-transparent"
          render={<Link to="/generate" />}
        >
          <div className="bg-primary text-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-none">
            <span className="text-lg leading-none font-bold">Q</span>
          </div>
          <span className="text-base font-bold tracking-tight group-data-[collapsible=icon]:hidden">
            QuickLogo
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
