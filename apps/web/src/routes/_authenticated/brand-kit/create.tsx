import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BrandKitWorkspace } from "@/components/brand-kit/workspace/brand-kit-workspace";

const searchSchema = z.object({
  imageId: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/brand-kit/create")({
  validateSearch: searchSchema,
  component: BrandKitCreateRoute,
  head: () => ({
    meta: [
      { title: "Create Brand Kit | QuickLogo" },
      {
        name: "description",
        content: "Generate a full brand identity from your logo.",
      },
    ],
  }),
});

function BrandKitCreateRoute() {
  const { imageId } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <BrandKitWorkspace
      key={imageId ? `img-${imageId}` : "create-new"}
      imageId={imageId}
      onBrandKitCreated={(brandKitId) => {
        void navigate({
          to: "/brand-kit/$id",
          params: { id: brandKitId },
          replace: true,
        });
      }}
    />
  );
}
