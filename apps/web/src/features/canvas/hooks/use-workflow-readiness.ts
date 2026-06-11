import { useMemo } from "react";
import { useCanvasStore } from "../store/canvas-store";

export type WorkflowState = "Ready" | "Needs Input" | "Coming Soon";

export interface WorkflowDefinition {
  id: string;
  name: string;
  internalId: "img2img" | "inpaint" | "sketch2img" | null;
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
    regionBounds,
    layers,
    setCanvasMode,
    setActiveTool,
    activeTool,
  } = useCanvasStore();

  const isImageSelected =
    selectionType === "single" &&
    selectedObject &&
    (selectedObject.type === "image" || selectedObject.type === "FabricImage");

  const hasMask = !!maskData;
  const hasRegion = !!regionBounds;
  const hasSketch = layers.some((l) => l.type === "path" || l.name === "Drawing");

  const workflows = useMemo<WorkflowDefinition[]>(() => {
    return [
      {
        id: "improve-image",
        name: "Improve Existing Image",
        internalId: "img2img",
        description: "Enhance quality, style, lighting, colors, details, or overall appearance of an existing image.",
        state: isImageSelected ? "Ready" : "Needs Input",
        statusMessage: isImageSelected ? "✓ Image selected" : "⚠ Select an image to continue",
        quickAction: undefined, // Cannot automate selection
        progressSequence: ["Select Image", "Describe Changes", "Generate"],
        currentStepIndex: isImageSelected ? 1 : 0,
      },
      {
        id: "replace-part",
        name: "Replace Part of an Image",
        internalId: "inpaint",
        description: "Replace, remove, or edit a specific area of an image.",
        state: hasMask ? "Ready" : "Needs Input",
        statusMessage: hasMask ? "✓ Mask detected" : "⚠ Paint a mask to continue",
        quickAction: hasMask ? undefined : {
          label: "Start Masking",
          action: () => {
            setCanvasMode("inpaint");
            setActiveTool("brush");
          },
        },
        progressSequence: ["Paint Mask", "Describe Changes", "Generate"],
        currentStepIndex: hasMask ? 1 : 0,
      },
      {
        id: "create-new",
        name: "Create New Content",
        internalId: "img2img", // Generate in Selection
        description: "Create new content inside a selected area of the canvas.",
        state: hasRegion ? "Ready" : "Needs Input",
        statusMessage: hasRegion ? "✓ Selection area created" : "⚠ Create a generation area",
        quickAction: hasRegion ? undefined : {
          label: "Create Area",
          action: () => {
            setCanvasMode("img2img");
            setActiveTool("select");
          },
        },
        progressSequence: ["Create Area", "Describe What To Generate", "Generate"],
        currentStepIndex: hasRegion ? 1 : 0,
      },
      {
        id: "sketch-to-image",
        name: "Turn Sketch Into Artwork",
        internalId: "sketch2img",
        description: "Transform a rough sketch into polished artwork.",
        state: hasSketch ? "Ready" : "Needs Input",
        statusMessage: hasSketch ? "✓ Sketch detected" : "⚠ Create a sketch to continue",
        quickAction: hasSketch ? undefined : {
          label: "Start Sketching",
          action: () => {
            setCanvasMode("sketch2img");
            setActiveTool("pencil");
          },
        },
        progressSequence: ["Create Sketch", "Describe Desired Result", "Generate"],
        currentStepIndex: hasSketch ? 1 : 0,
      },
    ];
  }, [
    isImageSelected,
    hasMask,
    hasRegion,
    hasSketch,
    setCanvasMode,
    setActiveTool,
  ]);

  // Context-Aware Recommendations
  let recommendedWorkflowId: string | null = null;
  const readyWorkflows = workflows.filter((w) => w.state === "Ready");

  // Determine Recommendation Priority
  if (isImageSelected && !hasMask && !hasRegion && !hasSketch) {
    recommendedWorkflowId = "improve-image";
  } else if (activeTool === "brush" || hasMask) {
    // If they have a mask or are currently brushing
    if (readyWorkflows.filter(w => w.id !== 'replace-part').length === 0) {
      recommendedWorkflowId = "replace-part";
    }
  } else if (activeTool === "pencil" || hasSketch) {
    // If they have a sketch or are sketching
    if (readyWorkflows.filter(w => w.id !== 'sketch-to-image').length === 0) {
      recommendedWorkflowId = "sketch-to-image";
    }
  } else if (!isImageSelected && !hasMask && !hasSketch) {
    // Completely empty canvas / no selection
    recommendedWorkflowId = "create-new";
  }

  // If we have multiple ready workflows that conflict, we don't recommend a single one.
  if (readyWorkflows.length > 1 && !recommendedWorkflowId) {
    recommendedWorkflowId = null; // Ambiguous, show Available Actions
  }

  const isEmptyState =
    !isImageSelected && !hasMask && !hasRegion && !hasSketch && readyWorkflows.length === 0;

  return {
    workflows,
    recommendedWorkflowId,
    isEmptyState,
  };
}
