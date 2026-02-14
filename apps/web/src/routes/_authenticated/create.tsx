import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/create")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <div className="bg-yellow-400">
        <h1>THIS IS CREATE ROUTE</h1>
      </div>
    </div>
  );
}
