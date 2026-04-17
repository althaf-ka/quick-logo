import { Link, useMatchRoute } from "@tanstack/react-router";
import {
  ChartLineUpIcon,
  UsersIcon,
  CreditCardIcon,
  PulseIcon,
} from "@phosphor-icons/react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@quicklogo/ui/components/sidebar";

const NAV_ITEMS = [
  {
    title: "Dashboard",
    to: "/",
    icon: ChartLineUpIcon,
    tooltip: "Dashboard",
  },
  {
    title: "Users",
    to: "/users",
    icon: UsersIcon,
    tooltip: "User Management",
  },
  {
    title: "Transactions",
    to: "/transactions",
    icon: CreditCardIcon,
    tooltip: "Revenue & Payments",
  },
  {
    title: "System Health",
    to: "/logs",
    icon: PulseIcon,
    tooltip: "Error Detection & Logs",
  },
] as const;

export function NavMain() {
  const matchRoute = useMatchRoute();

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-muted-foreground/60 px-3 text-[10px] font-semibold tracking-[0.2em] uppercase">
        Management
      </SidebarGroupLabel>
      <SidebarMenu className="gap-0.5">
        {NAV_ITEMS.map((item) => (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton
              tooltip={item.tooltip}
              isActive={!!matchRoute({ to: item.to })}
              className="text-muted-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground hover:bg-sidebar-accent group/nav h-9 rounded-none transition-all duration-150 active:scale-[0.98]"
              render={<Link to={item.to} />}
            >
              <item.icon
                weight="bold"
                className="size-4 transition-transform duration-300 group-hover/nav:scale-110"
              />
              <span className="text-[13px] tracking-tight">{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
