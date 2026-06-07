import type { CanvasDimensions } from "../types/canvas";

export const CANVAS_PRESETS: CanvasDimensions[] = [
  { width: 512, height: 512, label: "512 × 512" },
  { width: 768, height: 768, label: "768 × 768" },
  { width: 1024, height: 1024, label: "1024 × 1024" },
  { width: 512, height: 1024, label: "512 × 1024" },
  { width: 1024, height: 512, label: "1024 × 512" },
  { width: 768, height: 1024, label: "768 × 1024" },
  { width: 1024, height: 768, label: "1024 × 768" },
];

export const DEFAULT_CANVAS_SIZE = { width: 1024, height: 1024 };

export const DEFAULT_BRUSH_SETTINGS = {
  color: "#000000",
  width: 4,
  opacity: 1,
};
