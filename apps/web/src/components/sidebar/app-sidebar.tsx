import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
} from "@quicklogo/ui/components/sidebar";
import { NavHeader } from "./nav-header";
import { NavMain } from "./nav-main";
import { NavSystem } from "./nav-system";
import { NavUser } from "./nav-user";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props} className="border-r">
      <SidebarHeader className="pb-0">
        <NavHeader />
      </SidebarHeader>

      <SidebarSeparator className="mx-0" />

      <SidebarContent>
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
