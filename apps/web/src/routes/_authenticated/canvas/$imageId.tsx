import { createFileRoute } from "@tanstack/react-router";

export interface CanvasRouteState {
  imageUrl?: string;
  prompt?: string;
}

export const Route = createFileRoute("/_authenticated/canvas/$imageId")();
