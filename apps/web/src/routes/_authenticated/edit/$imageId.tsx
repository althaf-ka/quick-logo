import { createFileRoute, useLocation } from "@tanstack/react-router";
import { EditPage } from "@/components/edit/edit-page";

// Define the state type explicitly for type safety when navigating
export interface EditRouteState {
  imageUrl?: string;
  prompt?: string;
}

export const Route = createFileRoute("/_authenticated/edit/$imageId")({
  component: EditRoute,
  head: () => ({
    meta: [
      { title: "Edit Logo | QuickLogo" },
      { name: "description", content: "Edit your generated logo." },
    ],
  }),
});

function EditRoute() {
  const { imageId } = Route.useParams();
  const location = useLocation();
  const state = location.state as EditRouteState | undefined;

  // Render the EditPage, passing the ID and optional state values.
  // The EditPage will handle fetching from backend if state values are missing.
  return (
    <EditPage
      imageId={imageId}
      imageUrl={state?.imageUrl}
      prompt={state?.prompt}
    />
  );
}
