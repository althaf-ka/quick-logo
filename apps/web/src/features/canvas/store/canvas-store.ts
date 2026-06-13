import { create } from "zustand";
import type {
  CanvasTool,
  CanvasObjectInfo,
  BrushSettings,
  SelectedObjectProps,
  CanvasMode,
  SelectionType,
  AISessionState,
} from "../types/canvas";
import {
  DEFAULT_CANVAS_SIZE,
  DEFAULT_BRUSH_SETTINGS,
} from "../utils/canvas-presets";

export interface CanvasState {
  // Tool
  activeTool: CanvasTool;
  setActiveTool: (tool: CanvasTool) => void;

  // Active shape sub-type (when tool is 'shapes')
  activeShape: "rectangle" | "circle" | "line" | "arrow" | "triangle";
  setActiveShape: (shape: CanvasState["activeShape"]) => void;

  // Canvas dimensions
  canvasWidth: number;
  canvasHeight: number;
  setCanvasDimensions: (w: number, h: number) => void;

  // Zoom
  zoom: number;
  setZoom: (zoom: number) => void;

  // Brush settings (for pencil & eraser tools)
  brushSettings: BrushSettings;
  setBrushSettings: (settings: Partial<BrushSettings>) => void;

  shapeSettings: { fill: string; stroke: string; strokeWidth: number };
  setShapeSettings: (settings: Partial<CanvasState["shapeSettings"]>) => void;

  textSettings: {
    fontFamily: string;
    fontSize: number;
    fontWeight: "normal" | "bold";
    textAlign: "left" | "center" | "right";
    fill: string;
  };
  setTextSettings: (settings: Partial<CanvasState["textSettings"]>) => void;

  // Layers (derived from Fabric.js objects)
  layers: CanvasObjectInfo[];
  setLayers: (layers: CanvasObjectInfo[]) => void;

  // Selected object properties (from Fabric.js selection events)
  selectionType: SelectionType;
  setSelectionType: (type: SelectionType) => void;
  selectedObject: SelectedObjectProps | null;
  setSelectedObject: (obj: SelectedObjectProps | null) => void;
  selectedObjects: SelectedObjectProps[];
  setSelectedObjects: (objects: SelectedObjectProps[]) => void;

  // History state
  canUndo: boolean;
  canRedo: boolean;
  setHistoryState: (canUndo: boolean, canRedo: boolean) => void;

  // Saving state
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;

  // AI Mode state
  canvasMode: CanvasMode;
  setCanvasMode: (mode: CanvasMode) => void;
  aiSessionState: AISessionState;
  setAiSessionState: (state: AISessionState) => void;
  activeAIObjectId: string | null;
  setActiveAIObjectId: (id: string | null) => void;
  resetAIWorkflow: () => void;
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
  aiModel: string;
  setAiModel: (model: string) => void;
  aiStrength: number;
  setAiStrength: (strength: number) => void;
  isAiGenerating: boolean;
  setIsAiGenerating: (generating: boolean) => void;
  maskData: string | null;
  setMaskData: (data: string | null) => void;
  maskBrushSize: number;
  setMaskBrushSize: (size: number) => void;
  regionBounds: {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null;
  setRegionBounds: (bounds: CanvasState["regionBounds"]) => void;
  generatedResultUrl: string | null;
  setGeneratedResultUrl: (url: string | null) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  activeTool: "select",
  setActiveTool: (tool) => set({ activeTool: tool }),

  activeShape: "rectangle",
  setActiveShape: (shape) => set({ activeShape: shape }),

  canvasWidth: DEFAULT_CANVAS_SIZE.width,
  canvasHeight: DEFAULT_CANVAS_SIZE.height,
  setCanvasDimensions: (w, h) => set({ canvasWidth: w, canvasHeight: h }),

  zoom: 1,
  setZoom: (zoom) => set({ zoom }),

  brushSettings: DEFAULT_BRUSH_SETTINGS,
  setBrushSettings: (settings) =>
    set((state) => ({
      brushSettings: { ...state.brushSettings, ...settings },
    })),

  shapeSettings: { fill: "transparent", stroke: "#000000", strokeWidth: 4 },
  setShapeSettings: (settings) =>
    set((state) => ({
      shapeSettings: { ...state.shapeSettings, ...settings },
    })),

  textSettings: {
    fontFamily: "Inter",
    fontSize: 32,
    fontWeight: "normal",
    textAlign: "left",
    fill: "#000000",
  },
  setTextSettings: (settings) =>
    set((state) => ({
      textSettings: { ...state.textSettings, ...settings },
    })),

  layers: [],
  setLayers: (layers) => set({ layers }),

  selectionType: "none",
  setSelectionType: (type) => set({ selectionType: type }),
  selectedObject: null,
  setSelectedObject: (obj) => set({ selectedObject: obj }),
  selectedObjects: [],
  setSelectedObjects: (objects) => set({ selectedObjects: objects }),

  canUndo: false,
  canRedo: false,
  setHistoryState: (canUndo, canRedo) => set({ canUndo, canRedo }),

  isSaving: false,
  setIsSaving: (saving) => set({ isSaving: saving }),

  canvasMode: "edit",
  setCanvasMode: (mode) => {
    set((state) => {
      const updates: Partial<CanvasState> = { canvasMode: mode };
      if (state.canvasMode === "inpaint" && mode !== "inpaint") {
        updates.maskData = null;
      }
      if (state.canvasMode === "img2img" && mode !== "img2img") {
        updates.regionBounds = null;
      }
      return updates;
    });
  },
  aiSessionState: "idle",
  setAiSessionState: (state) => set({ aiSessionState: state }),
  activeAIObjectId: null,
  setActiveAIObjectId: (id) => set({ activeAIObjectId: id }),
  resetAIWorkflow: () =>
    set({
      canvasMode: "edit",
      aiSessionState: "idle",
      activeAIObjectId: null,
      regionBounds: null,
      maskData: null,
      aiPrompt: "",
      generatedResultUrl: null,
    }),
  aiPrompt: "",
  setAiPrompt: (prompt) => set({ aiPrompt: prompt }),
  aiModel: "quick-seedream",
  setAiModel: (model) => set({ aiModel: model }),
  aiStrength: 35,
  setAiStrength: (strength) => set({ aiStrength: strength }),
  isAiGenerating: false,
  setIsAiGenerating: (generating) => set({ isAiGenerating: generating }),
  maskData: null,
  setMaskData: (data) => set({ maskData: data }),
  maskBrushSize: 30,
  setMaskBrushSize: (size) => set({ maskBrushSize: size }),
  regionBounds: null,
  setRegionBounds: (bounds) => set({ regionBounds: bounds }),
  generatedResultUrl: null,
  setGeneratedResultUrl: (url) => set({ generatedResultUrl: url }),
}));
