import { createFileRoute } from "@tanstack/react-router";

export interface CanvasRouteState {
  imageUrl?: string;
  prompt?: string;
}

export const Route = createFileRoute("/_authenticated/canvas/$imageId")({
  head: () => ({
    meta: [
      { title: "Canvas | QuickLogo" },
      { name: "description", content: "Advanced logo editor." },
    ],
  }),
});
