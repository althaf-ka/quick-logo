import { useMemo } from "react";
import { useCanvasStore } from "../store/canvas-store";
import { useShallow } from "zustand/react/shallow";
import { getModelsForCanvasMode } from "@quicklogo/ai-providers/models";
import type { ModelOption } from "@quicklogo/ai-providers/models";

/**
 * Single source of truth for the currently selected AI model and its capabilities.
 * Eliminates the duplicated `models.find(m => m.id === aiModel)` pattern
 * across canvas components.
 */
export function useSelectedModel() {
  const { canvasMode, aiModel } = useCanvasStore(
    useShallow((s) => ({
      canvasMode: s.canvasMode,
      aiModel: s.aiModel,
    })),
  );

  const models = useMemo(
    () => getModelsForCanvasMode(canvasMode),
    [canvasMode],
  );

  const selectedModel = useMemo<ModelOption | null>(
    () => models.find((m) => m.id === aiModel) ?? null,
    [models, aiModel],
  );

  return {
    /** All models available for the current canvas mode */
    models,
    /** The currently selected model, or null if the selection is invalid */
    selectedModel,
    /** Shorthand: the editing strategy of the selected model */
    editingStrategy: selectedModel?.editingStrategy ?? null,
    /** Shorthand: credit cost */
    credits: selectedModel?.credits ?? 10,
  };
}
