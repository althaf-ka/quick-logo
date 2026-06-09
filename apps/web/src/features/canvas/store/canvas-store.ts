import { create } from "zustand";
import type {
  CanvasTool,
  CanvasObjectInfo,
  BrushSettings,
  SelectedObjectProps,
  CanvasMode,
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

  // Layers (derived from Fabric.js objects)
  layers: CanvasObjectInfo[];
  setLayers: (layers: CanvasObjectInfo[]) => void;

  // Selected object properties (from Fabric.js selection events)
  selectedObject: SelectedObjectProps | null;
  setSelectedObject: (obj: SelectedObjectProps | null) => void;

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
  regionBounds: { left: number; top: number; width: number; height: number } | null;
  setRegionBounds: (bounds: CanvasState['regionBounds']) => void;
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

  layers: [],
  setLayers: (layers) => set({ layers }),

  selectedObject: null,
  setSelectedObject: (obj) => set({ selectedObject: obj }),

  canUndo: false,
  canRedo: false,
  setHistoryState: (canUndo, canRedo) => set({ canUndo, canRedo }),

  isSaving: false,
  setIsSaving: (saving) => set({ isSaving: saving }),

  canvasMode: 'edit',
  setCanvasMode: (mode) => {
    set((state) => {
      const updates: Partial<CanvasState> = { canvasMode: mode };
      if (state.canvasMode === 'inpaint' && mode !== 'inpaint') {
        updates.maskData = null;
      }
      if ((state.canvasMode === 'text2img' || state.canvasMode === 'img2img') && 
          (mode !== 'text2img' && mode !== 'img2img')) {
        updates.regionBounds = null;
      }
      return updates;
    });
  },
  aiPrompt: '',
  setAiPrompt: (prompt) => set({ aiPrompt: prompt }),
  aiModel: 'quick-seedream',
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
