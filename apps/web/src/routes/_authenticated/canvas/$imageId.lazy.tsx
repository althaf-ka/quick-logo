import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, lazy } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { parseApiError } from "@/lib/api-error";
import { EditorLoadingState } from "@/features/canvas/components/editor-loading-state";

const CanvasEditor = lazy(() =>
  import("@/features/canvas/components/canvas-editor").then((mod) => ({
    default: mod.CanvasEditor,
  })),
);

export const Route = createLazyFileRoute("/_authenticated/canvas/$imageId")({
  component: CanvasRoute,
});

function CanvasRoute() {
  const { imageId } = Route.useParams();
  const navigate = useNavigate();
  const { data, isPending } = useQuery({
    queryKey: ["image-history", imageId],
    queryFn: async () => {
      const res = await api.images[":id"].$get({ param: { id: imageId } });
      if (!res.ok) {
        throw await parseApiError(res);
      }
      return res.json();
    },
  });

  const imageUrl = data?.image?.imageUrl;

  const handleClose = () => {
    navigate({
      to: "/edit/$imageId",
      params: { imageId },
    });
  };

  const handleSaveComplete = (newImageId: string) => {
    navigate({
      to: "/edit/$imageId",
      params: { imageId: newImageId },
    });
  };

  if (isPending) {
    return <EditorLoadingState />;
  }

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
    <div className="h-full min-h-0 w-full overflow-hidden bg-zinc-950">
      <Suspense fallback={<EditorLoadingState />}>
        <CanvasEditor
          imageId={imageId}
          initialImageUrl={imageUrl}
          onClose={handleClose}
          onSaveComplete={handleSaveComplete}
        />
      </Suspense>
    </div>
  );
}
