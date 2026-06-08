import { Link, useMatchRoute } from "@tanstack/react-router";
import {
  GearIcon,
  SignOutIcon,
  LightningIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@quicklogo/ui/components/sidebar";
import { useLogout, useAuth } from "@/hooks/use-auth";

export function NavSystem() {
  const matchRoute = useMatchRoute();
  const { mutate: logout, isPending } = useLogout();
  const { user } = useAuth();
  const credits = user?.credits ?? 0;

  return (
    <>
      <SidebarGroup className="mt-auto pb-2">
        <SidebarMenu className="mb-1 gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={`${credits} credits remaining`}
              className="text-muted-foreground h-9 cursor-default rounded-none"
            >
              <LightningIcon weight="fill" className="text-primary size-4" />
              <span className="flex-1 text-[13px] tracking-tight">Credits</span>
              <span className="bg-primary/10 text-primary px-1.5 py-0.5 text-[11px] leading-none font-bold tabular-nums">
                {credits}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Buy More Credits"
              isActive={!!matchRoute({ to: "/credits" })}
              className="text-primary hover:bg-primary/10 group/upgrade data-[active=true]:bg-primary/10 h-9 cursor-pointer rounded-none transition-all duration-150 active:scale-[0.98]"
              render={<Link to={"/credits"} />}
            >
              <PlusIcon
                weight="bold"
                className="size-4 transition-transform duration-300 group-hover/upgrade:rotate-90"
              />
              <span className="text-[13px] font-medium tracking-tight">
                Buy More Credits
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarSeparator className="mx-0 group-data-[collapsible=icon]:hidden" />

      <SidebarGroup className="pt-0 pb-2">
        <SidebarGroupLabel className="text-muted-foreground/60 px-3 text-[10px] font-semibold tracking-[0.2em] uppercase">
          System
        </SidebarGroupLabel>
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Settings"
              isActive={!!matchRoute({ to: "/settings" })}
              className="text-muted-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground hover:bg-sidebar-accent group/settings h-9 cursor-pointer rounded-none transition-all duration-150 active:scale-[0.98]"
              render={<Link to={"/settings"} />}
            >
              <GearIcon
                weight="bold"
                className="size-4 transition-transform duration-500 group-hover/settings:rotate-90"
              />
              <span className="text-[13px] tracking-tight">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Log Out"
              onClick={() => logout()}
              disabled={isPending}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive group/logout h-9 cursor-pointer rounded-none transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
            >
              <SignOutIcon
                weight="bold"
                className="size-4 transition-transform group-hover/logout:translate-x-0.5"
              />
              <span className="text-[13px] tracking-tight">Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
