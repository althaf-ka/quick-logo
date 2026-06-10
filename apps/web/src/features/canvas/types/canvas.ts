export type CanvasTool =
  | "select"
  | "text"
  | "pencil"
  | "shapes"
  | "image"
  | "eraser"
  | "brush"
  | "hand";

export type ShapeType = "rectangle" | "circle" | "line" | "arrow" | "triangle";

export type ExportFormat = "png" | "jpeg" | "svg" | "webp";

export interface CanvasDimensions {
  width: number;
  height: number;
  label: string; // e.g., "1024×1024"
}

export interface CanvasObjectInfo {
  id: string;
  type: string; // 'rect', 'circle', 'textbox', 'image', 'path', etc.
  name: string; // Human-readable name for layers panel
  visible: boolean;
  locked: boolean;
  zIndex: number;
}

export interface BrushSettings {
  color: string;
  width: number;
  opacity: number;
}

export interface TextSettings {
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  fill: string;
  textAlign: "left" | "center" | "right";
  lineHeight: number;
}

export interface SelectedObjectProps {
  id: string;
  type: string;
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  opacity: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  // Text-specific
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  text?: string;
}

export type CanvasMode =
  | "edit"
  | "img2img"
  | "inpaint"
  | "sketch2img";

export type SelectionType = "none" | "single" | "multi";

export type AISessionState =
  | "idle"
  | "selecting-region"
  | "masking"
  | "prompting"
  | "generating";

export interface CanvasAIState {
  mode: CanvasMode;
  prompt: string;
  isGenerating: boolean;
  model: string;
  strength: number;        // 0-100, reference/input strength for img2img
  maskData: string | null;  // Data URL of the mask PNG
  regionBounds: { left: number; top: number; width: number; height: number } | null;
  generatedResultUrl: string | null;
}
