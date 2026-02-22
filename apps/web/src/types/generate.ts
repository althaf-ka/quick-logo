// ── Core Types ──────────────────────────────────────────────────────────

export type ImageCount = 1 | 2 | 4;
export type BackgroundType = "transparent" | "white" | "custom";
export type GenerationStatus = "idle" | "generating" | "done" | "error";

export interface GenerateConfig {
  model: string;
  style: string;
  imageCount: ImageCount;
  colorPalette: string; // "auto" | preset id | "custom"
  customColors: string[];
  negativePrompt: string;
  background: BackgroundType;
  customBgColor: string;
  referenceImage: File | null;
  referenceImagePreview: string | null; // data URL for preview
  referenceStrength: number;
  seed: number | null;
  magicPrompt: boolean;
}

export interface GeneratedLogo {
  id: string;
  url: string;
  prompt: string;
  config: GenerateConfig;
  createdAt: Date;
}

// ── Models ──────────────────────────────────────────────────────────────

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  credits: number;
  icon: "lightning" | "brain" | "crown";
  features: string[];
}

export const MODELS: ModelOption[] = [
  {
    id: "quick-v1",
    name: "Quick v1",
    description: "Fast generation, good for drafts",
    credits: 2,
    icon: "lightning",
    features: ["Fast", "Simple logos"],
  },
  {
    id: "quick-hd",
    name: "Quick HD",
    description: "Higher resolution, detailed output",
    credits: 5,
    icon: "brain",
    features: ["HD output", "Better details"],
  },
  {
    id: "quick-pro",
    name: "Quick Pro",
    description: "Best quality, production-ready",
    credits: 8,
    icon: "crown",
    features: ["Best quality", "Complex designs", "Production-ready"],
  },
];

// ── Styles ──────────────────────────────────────────────────────────────

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

// ── Color Palettes ──────────────────────────────────────────────────────

export interface ColorPaletteOption {
  id: string;
  name: string;
  colors: string[];
}

export const COLOR_PALETTES: ColorPaletteOption[] = [
  { id: "auto", name: "Auto", colors: [] },
  { id: "corporate", name: "Corporate", colors: ["#1a365d", "#2b6cb0", "#63b3ed", "#e2e8f0"] },
  { id: "warm", name: "Warm", colors: ["#c53030", "#ed8936", "#ecc94b", "#f7fafc"] },
  { id: "nature", name: "Nature", colors: ["#276749", "#48bb78", "#9ae6b4", "#f0fff4"] },
  { id: "neon", name: "Neon", colors: ["#6b21a8", "#d946ef", "#06b6d4", "#0f172a"] },
  { id: "mono", name: "Monochrome", colors: ["#000000", "#374151", "#9ca3af", "#ffffff"] },
  { id: "custom", name: "Custom", colors: [] },
];

// ── Defaults ────────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: GenerateConfig = {
  model: "quick-v1",
  style: "minimal",
  imageCount: 4,
  colorPalette: "auto",
  customColors: [],
  negativePrompt: "",
  background: "transparent",
  customBgColor: "#ffffff",
  referenceImage: null,
  referenceImagePreview: null,
  referenceStrength: 50,
  seed: null,
  magicPrompt: true,
};

export const MAX_COLORS = 5;
