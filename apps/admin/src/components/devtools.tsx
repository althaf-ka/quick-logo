import React from "react";

const RouterDevtools = import.meta.env.PROD
  ? () => null
  : React.lazy(() =>
      import("@tanstack/react-router-devtools").then((res) => ({
        default: res.TanStackRouterDevtools,
      })),
    );

const QueryDevtools = import.meta.env.PROD
  ? () => null
  : React.lazy(() =>
      import("@tanstack/react-query-devtools").then((res) => ({
        default: res.ReactQueryDevtools,
      })),
    );

export function Devtools() {
  return (
    <React.Suspense fallback={null}>
      <RouterDevtools position="bottom-right" initialIsOpen={false} />
      <QueryDevtools initialIsOpen={false} />
    </React.Suspense>
  );
}
