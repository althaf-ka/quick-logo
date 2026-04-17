import * as React from "react";
import {
  Outlet,
  HeadContent,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { LogoLoader } from "@quicklogo/ui/custom";
import { Devtools } from "@/components/devtools";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "QuickLogo Admin" },
    ],
  }),
  pendingComponent: () => <LogoLoader />,
  component: RootComponent,
});

function RootComponent() {
  return (
    <React.Fragment>
      <HeadContent />
      <Outlet />
      <Devtools />
    </React.Fragment>
  );
}
