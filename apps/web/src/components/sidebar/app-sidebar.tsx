import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@quicklogo/ui/components/sidebar";
import { NavHeader } from "./nav-header";
import { NavMain } from "./nav-main";
import { NavSystem } from "./nav-system";
import { NavUser } from "./nav-user";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props} className="border-r">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-2 py-0">
        <NavHeader />
      </SidebarHeader>

      <SidebarContent className="scrollbar-subtle">
        <NavMain />
        <NavSystem />
      </SidebarContent>

      <SidebarFooter className="p-0">
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
