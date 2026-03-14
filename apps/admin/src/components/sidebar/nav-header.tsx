import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@quicklogo/ui/components/sidebar";
import { Separator } from "@quicklogo/ui/components/separator";
import { Link } from "@tanstack/react-router";

export function NavHeader() {
  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="cursor-pointer rounded-none transition-none hover:bg-transparent active:bg-transparent"
            render={<Link to="/" />}
          >
            <div className="bg-primary text-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-none">
              <span className="text-lg leading-none font-bold">Q</span>
            </div>
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="text-base font-bold tracking-tight">
                QuickLogo
              </span>
              <span className="text-muted-foreground text-[10px] tracking-widest uppercase">
                Admin
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <Separator className="mt-2" />
    </>
  );
}
