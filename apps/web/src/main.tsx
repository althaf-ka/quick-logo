import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import "@quicklogo/ui/globals.css";
import { routeTree } from "./routeTree.gen";
import { queryClient } from "./lib/query-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@quicklogo/ui/components/sonner";
import { initGlobalMonitoring } from "@quicklogo/ui/lib/telemetry";

initGlobalMonitoring("web");

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: "intent",
  scrollRestoration: true,
});

// Register things for typesafety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors toastOptions={{ style: { borderRadius: 0 } }} />
    </QueryClientProvider>
  </StrictMode>,
);
