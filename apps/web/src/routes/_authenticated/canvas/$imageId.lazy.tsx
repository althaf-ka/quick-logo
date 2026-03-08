import {
  createLazyFileRoute,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { Suspense, lazy } from "react";
import { EditorLoadingState } from "@/features/image-editor/components/editor-loading-state";

const QuickLogoEditor = lazy(() =>
  import("@/features/image-editor/components/quick-logo-editor").then(
    (mod) => ({ default: mod.QuickLogoEditor }),
  ),
);

export const Route = createLazyFileRoute("/_authenticated/canvas/$imageId")({
  component: CanvasRoute,
});

function CanvasRoute() {
  const { imageId } = Route.useParams();
  const location = useLocation();
  const state = location.state as
    | { imageUrl?: string; prompt?: string }
    | undefined;
  const navigate = useNavigate();

  // If no state imageUrl is passed directly from navigation,
  // we would ideally fetch the image via API again.
  // For simplicity, we assume the user arrives here via clicking 'Canvas' on the edit page.
  const imageUrl = state?.imageUrl;

  const handleClose = () => {
    // Navigate back to the edit page
    navigate({
      to: "/edit/$imageId",
      params: { imageId },
      state: { imageUrl, prompt: state?.prompt },
    });
  };

  const handleSaveComplete = (newImageId: string) => {
    // Navigate to the newly saved image
    navigate({
      to: "/edit/$imageId",
      params: { imageId: newImageId },
    });
  };

  if (!imageUrl) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground text-sm font-medium">
            Image data missing. Please access the canvas from a generated logo.
          </p>
          <button
            type="button"
            onClick={() =>
              navigate({ to: "/edit/$imageId", params: { imageId } })
            }
            className="text-primary mt-4 inline-block cursor-pointer hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh w-dvw overflow-hidden">
      <Suspense fallback={<EditorLoadingState />}>
        <QuickLogoEditor
          imageId={imageId}
          initialImageUrl={imageUrl}
          onClose={handleClose}
          onSaveComplete={handleSaveComplete}
        />
      </Suspense>
    </div>
  );
}
