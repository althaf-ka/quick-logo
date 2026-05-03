import { createFileRoute } from "@tanstack/react-router";
import { BrandKitWorkspace } from "@/components/brand-kit/brand-kit-workspace";

export const Route = createFileRoute("/_authenticated/brand-kit/$id")({
  component: BrandKitViewRoute,
  head: () => ({
    meta: [
      { title: "Brand Kit | QuickLogo" },
      {
        name: "description",
        content: "View and refine your generated brand kit.",
      },
    ],
  }),
});

function BrandKitViewRoute() {
  const { id } = Route.useParams();
  return <BrandKitWorkspace brandKitId={id} />;
}
