import * as React from "react";
import {
  Outlet,
  HeadContent,
  Scripts,
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
      { title: "QuickLogo | Create Professional Logos Instantly" },
      {
        name: "description",
        content:
          "QuickLogo helps you create stunning, professional logos in seconds using AI.",
      },
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
      <Scripts />
    </React.Fragment>
  );
}
