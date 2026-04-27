// ── Core Types ──────────────────────────────────────────────────────────

export type ImageCount = 1 | 2 | 4;
export type BackgroundType = "transparent" | "white" | "custom";
export type GenerationStatus =
  | "idle"
  | "generating"
  | "polling"
  | "done"
  | "error";

export interface GenerateConfig {
  model: string;
  style: string;
  brandName: string;
  imageCount: ImageCount;
  colorPalette: string;
  customColors: string[];
  negativePrompt: string;
  background: BackgroundType;
  customBgColor: string;
  referenceImage: File | null;
  referenceImagePreview: string | null;
  referenceStrength: number;
  magicPrompt: boolean;
}

// ── DB-aligned types ────────────────────────────────────────────────────

export interface GeneratedImage {
  id: string;
  projectId: string;
  parentId: string | null;
  prompt: string;
  enhancedPrompt: string | null;
  model: string;
  imageUrl: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  errorMessage: string | null;
  creditsUsed: number;
  createdAt: Date;
}

export interface GenerationProject {
  id: string;
  name: string;
  latestThumbnail: string | null;
  createdAt: Date;
  expiresAt: Date;
  images: GeneratedImage[];
}

export interface GeneratedLogo {
  id: string;
  url: string;
  prompt: string;
  config: GenerateConfig;
  createdAt: Date;
}

// ── Styles (UI-only, not stored in DB) ──────────────────────────────────

export interface StyleOption {
  id: string;
  name: string;
  description: string;
}

export const STYLES: StyleOption[] = [
  { id: "minimal", name: "Minimal", description: "Clean, simple shapes" },
  { id: "abstract", name: "Abstract", description: "Artistic, geometric" },
  { id: "mascot", name: "Mascot", description: "Character-based logos" },
  { id: "lettermark", name: "Lettermark", description: "Typography-focused" },
  { id: "3d", name: "3D", description: "Dimensional, depth" },
  { id: "emblem", name: "Emblem", description: "Badge-style, classic" },
  { id: "wordmark", name: "Wordmark", description: "Full name as logo" },
  { id: "vintage", name: "Vintage", description: "Retro, hand-crafted" },
];

// ── Color Palettes (UI-only) ────────────────────────────────────────────

export interface ColorPaletteOption {
  id: string;
  name: string;
  colors: string[];
}

export const COLOR_PALETTES: ColorPaletteOption[] = [
  { id: "auto", name: "Auto", colors: [] },
  {
    id: "corporate",
    name: "Corporate",
    colors: ["#1a365d", "#2b6cb0", "#63b3ed", "#e2e8f0"],
  },
  {
    id: "warm",
    name: "Warm",
    colors: ["#c53030", "#ed8936", "#ecc94b", "#f7fafc"],
  },
  {
    id: "nature",
    name: "Nature",
    colors: ["#276749", "#48bb78", "#9ae6b4", "#f0fff4"],
  },
  {
    id: "neon",
    name: "Neon",
    colors: ["#6b21a8", "#d946ef", "#06b6d4", "#0f172a"],
  },
  {
    id: "mono",
    name: "Monochrome",
    colors: ["#000000", "#374151", "#9ca3af", "#ffffff"],
  },
  { id: "custom", name: "Custom", colors: [] },
];

export const MAX_COLORS = 5;
