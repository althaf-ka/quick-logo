import * as fabric from "fabric";
import { useCanvasLayers } from "./use-canvas-layers";
import { useCanvasSelection } from "./use-canvas-selection";
import { useCanvasClipboard } from "./use-canvas-clipboard";
import { useCanvasModeSync } from "./use-canvas-mode-sync";
import { useCanvasKeyboardShortcuts } from "./use-canvas-keyboard-shortcuts";
import { useCanvasExternalEvents } from "./use-canvas-external-events";
import { useCanvasStateSync } from "./use-canvas-state-sync";
import { useCanvasPointerEvents } from "./use-canvas-pointer-events";

export function useCanvasTools(canvas: fabric.Canvas | null) {
  useCanvasLayers(canvas);
  useCanvasSelection(canvas);
  useCanvasClipboard(canvas);
  useCanvasModeSync(canvas);
  useCanvasKeyboardShortcuts(canvas);
  useCanvasExternalEvents(canvas);
  useCanvasStateSync(canvas);
  useCanvasPointerEvents(canvas);
}
