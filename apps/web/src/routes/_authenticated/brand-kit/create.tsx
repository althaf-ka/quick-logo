import { createFileRoute } from "@tanstack/react-router";
import { BrandKitWorkspace } from "@/components/brand-kit/workspace/brand-kit-workspace";
import { readSearchString } from "@/lib/search-params";

export const Route = createFileRoute("/_authenticated/brand-kit/create")({
  validateSearch: (search): { imageId?: string } => ({
    imageId: readSearchString(search.imageId),
  }),
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
