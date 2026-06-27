import { useMemo } from "react";
import { useCanvasStore } from "../store/canvas-store";
import { useShallow } from "zustand/react/shallow";
import { useSelectedModel } from "./use-selected-model";

export type WorkflowState = "Ready" | "Needs Input" | "Coming Soon";

export interface WorkflowDefinition {
  id: string;
  name: string;
  internalId: "img2img" | "inpaint" | null;
  description: string;
  state: WorkflowState;
  statusMessage: string;
  quickAction?: {
    label: string;
    action: () => void;
  };
  progressSequence: string[];
  currentStepIndex: number;
}

export function useWorkflowReadiness() {
  const {
    selectionType,
    selectedObject,
    maskData,
    setCanvasMode,
    setActiveTool,
    activeTool,
  } = useCanvasStore(
    useShallow((s) => ({
      selectionType: s.selectionType,
      selectedObject: s.selectedObject,
      maskData: s.maskData,
      setCanvasMode: s.setCanvasMode,
      setActiveTool: s.setActiveTool,
      activeTool: s.activeTool,
    })),
  );

  const isImageSelected =
    selectionType === "single" &&
    selectedObject &&
    (selectedObject.type === "image" || selectedObject.type === "FabricImage");

  const hasMask = !!maskData;

  const { editingStrategy } = useSelectedModel();
  const isMaskOptional = editingStrategy === "inpaint-with-prompt";

  const workflows = useMemo<WorkflowDefinition[]>(() => {
    return [
      {
        id: "improve-image",
        name: "Improve Existing Image",
        internalId: "img2img",
        description:
          "Enhance quality, style, lighting, colors, details, or overall appearance of an existing image.",
        state: isImageSelected ? "Ready" : "Needs Input",
        statusMessage: isImageSelected
          ? "✓ Image selected"
          : "⚠ Select an image to continue",
        quickAction: undefined, // Cannot automate selection
        progressSequence: ["Select Image", "Describe Changes", "Generate"],
        currentStepIndex: isImageSelected ? 1 : 0,
      },
      {
        id: "replace-part",
        name: "Modify Area",
        internalId: "inpaint",
        description: isMaskOptional
          ? "Add a brush mask to specify an area, or describe the changes using a text prompt."
          : "Add, remove, or change a specific area of the logo using a brush mask.",
        state: hasMask || isMaskOptional ? "Ready" : "Needs Input",
        statusMessage: hasMask
          ? "✓ Mask detected"
          : isMaskOptional
            ? "✓ Ready to edit (mask optional)"
            : "⚠ Paint a mask to continue",
        quickAction:
          hasMask || isMaskOptional
            ? undefined
            : {
                label: "Start Masking",
                action: () => {
                  setCanvasMode("inpaint");
                  setActiveTool("brush");
                },
              },
        progressSequence:
          isMaskOptional && !hasMask
            ? ["Describe Changes", "Generate"]
            : ["Paint Mask", "Describe Changes", "Generate"],
        currentStepIndex: isMaskOptional && !hasMask ? 0 : hasMask ? 1 : 0,
      },
    ];
  }, [isImageSelected, hasMask, setCanvasMode, setActiveTool, isMaskOptional]);

  // Context-Aware Recommendations
  let recommendedWorkflowId: string | null = null;
  const readyWorkflows = workflows.filter((w) => w.state === "Ready");

  // Determine Recommendation Priority
  if (isImageSelected && !hasMask && !isMaskOptional) {
    recommendedWorkflowId = "improve-image";
  } else if (activeTool === "brush" || hasMask || isMaskOptional) {
    // If they have a mask or are currently brushing or mask is optional
    if (readyWorkflows.filter((w) => w.id !== "replace-part").length === 0) {
      recommendedWorkflowId = "replace-part";
    }
  }

  // If we have multiple ready workflows that conflict, we don't recommend a single one.
  if (readyWorkflows.length > 1 && !recommendedWorkflowId) {
    recommendedWorkflowId = null; // Ambiguous, show Available Actions
  }

  const isEmptyState =
    !isImageSelected && !hasMask && readyWorkflows.length === 0;

  return {
    workflows,
    recommendedWorkflowId,
    isEmptyState,
  };
}
