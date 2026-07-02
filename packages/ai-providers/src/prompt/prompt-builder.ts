import type { GenerateImageMessage } from "@quicklogo/shared";
import {
  matchIndustryProfile,
  type IndustryProfile,
} from "./industry-profiles";

// ── Style Profiles ──────────────────────────────────────────────────────────

interface StyleProfile {
  modifiers: string[];
  negatives: string[];
  /** Base negative terms to REMOVE for this style (prevents contradictions) */
  removeFromBase: string[];
}

const STYLE_PROFILES: Record<string, StyleProfile> = {
  minimal: {
    modifiers: [
      "flat vector",
      "clean geometry",
      "simple silhouette",
      "balanced spacing",
    ],
    negatives: ["ornate", "busy", "gradients", "textures", "decorative"],
    removeFromBase: [],
  },
  abstract: {
    modifiers: [
      "geometric patterns",
      "modern composition",
      "dynamic shapes",
      "asymmetric balance",
    ],
    negatives: ["literal representation", "photorealistic", "text-heavy"],
    removeFromBase: [],
  },
  mascot: {
    modifiers: [
      "character illustration",
      "friendly expression",
      "approachable pose",
      "bold outlines",
    ],
    negatives: ["scary", "aggressive", "photorealistic", "uncanny"],
    removeFromBase: ["face", "portrait"], // mascots HAVE faces
  },
  lettermark: {
    modifiers: [
      "typography-focused",
      "elegant letterforms",
      "monogram construction",
      "precise kerning",
    ],
    negatives: ["icons", "symbols", "illustrations", "images"],
    removeFromBase: [],
  },
  "3d": {
    modifiers: [
      "dimensional depth",
      "realistic lighting",
      "subtle shadows",
      "material texture",
    ],
    negatives: ["flat", "2D", "paper cutout", "silhouette"],
    removeFromBase: ["3d render", "cinematic lighting", "depth of field"], // 3D IS the goal
  },
  emblem: {
    modifiers: [
      "badge enclosure",
      "crest symmetry",
      "border framing",
      "classic layout",
    ],
    negatives: ["minimal", "sans-serif", "modern"],
    removeFromBase: [],
  },
  wordmark: {
    modifiers: [
      "full name typography",
      "custom letterforms",
      "balanced tracking",
      "font-forward",
    ],
    negatives: ["icons", "symbols", "illustrations", "mascots"],
    removeFromBase: [],
  },
  vintage: {
    modifiers: [
      "retro aesthetic",
      "hand-crafted feel",
      "distressed detail",
      "nostalgic warmth",
    ],
    negatives: ["modern", "minimal", "digital", "neon", "clean"],
    removeFromBase: ["film grain"], // grain is desired for vintage
  },
};

// ── Palette Modifiers ───────────────────────────────────────────────────────

const PALETTE_MODIFIERS: Record<string, string> = {
  vibrant: "vibrant bold colors, high saturation",
  pastel: "soft pastel color palette, muted tones",
  monochrome: "monochrome single color palette, shades of one hue",
  earth: "earthy natural tones, warm browns and greens",
  neon: "neon glowing colors, electric bright tones",
};

// ── Background Modifiers ────────────────────────────────────────────────────

const BACKGROUND_MODIFIERS: Record<string, string> = {
  black: "on a solid black background, isolated subject",
  white: "on a clean white background, isolated, no background elements",
  custom: "on a solid colored background",
};

// ── Reference Instructions ──────────────────────────────────────────────────

const REFERENCE_INSTRUCTIONS: Record<string, string> = {
  strong:
    "Closely match the exact color palette, typography style, composition, and overall visual identity from image 0.",
  moderate: "Match the color scheme, style, and visual elements from image 0.",
  subtle: "Take subtle visual inspiration from image 0.",
};

function getReferenceLevel(
  strength: number,
): keyof typeof REFERENCE_INSTRUCTIONS {
  if (strength >= 75) return "strong";
  if (strength >= 40) return "moderate";
  return "subtle";
}

// ── Quality Anchors ─────────────────────────────────────────────────────────

const QUALITY_ANCHORS =
  "vector logo, sharp edges, clean composition, " +
  "professional branding, single icon, scalable, " +
  "isolated on background";

// ── Logo-Specific Negative Prompt Base ──────────────────────────────────────

const LOGO_NEGATIVE_BASE = [
  // Anti-photorealism
  "photograph",
  "photorealistic",
  "3d render",
  "cinematic lighting",
  "depth of field",
  "bokeh",
  "film grain",
  // Anti-human
  "human",
  "face",
  "hands",
  "fingers",
  "portrait",
  // Anti-text hallucination
  "misspelled text",
  "garbled text",
  "random letters",
  "extra text",
  "watermark",
  "signature",
  // Anti-complexity
  "complex scene",
  "multiple objects",
  "busy background",
  "detailed background",
  "multiple logos",
  "collage",
  // Anti-quality
  "blurry",
  "low quality",
  "pixelated",
  "distorted",
  "artifacts",
  "amateur",
  "clip art",
  "generic",
  // Anti-framing
  "cropped",
  "cut off",
  "partial",
  "off-center",
];

/**
 * Builds a deduplicated negative prompt with conflict resolution.
 * - Removes base terms that conflict with the selected style
 * - Adds style-specific negatives
 * - Merges user custom negatives
 * - Deduplicates with Set
 */
function buildNegativePrompt(
  styleProfile: StyleProfile | undefined,
  industryProfile: IndustryProfile | null,
  userNegativePrompt?: string,
): string {
  // Start with base, remove style conflicts
  let baseTerms = [...LOGO_NEGATIVE_BASE];
  if (styleProfile?.removeFromBase.length) {
    const removals = new Set(styleProfile.removeFromBase);
    baseTerms = baseTerms.filter((term) => !removals.has(term));
  }

  // Collect all terms
  const allTerms = [
    ...baseTerms,
    ...(styleProfile?.negatives ?? []),
    // Industry-specific avoid terms (e.g. coffee → "cold", "clinical", "neon")
    ...(industryProfile?.avoid ?? []),
    ...(userNegativePrompt
      ? userNegativePrompt.split(",").map((s) => s.trim())
      : []),
  ];

  // Deduplicate with Set
  return [...new Set(allTerms)].join(", ");
}

// ── Main Prompt Builder ─────────────────────────────────────────────────────

export function buildBasePrompt(
  message: GenerateImageMessage,
  basePrompt: string,
  hasReference = false,
): { prompt: string; negativePrompt: string } {
  const parts: string[] = [];

  // For canvas edits (img2img/inpaint), the user's instruction is the primary
  // directive. Skip automatic style/palette/background modifiers that can
  // contradict the edit intent (e.g. "add green background" + "transparent bg").
  if (message.isEdit) {
    parts.push(basePrompt);
    // Canvas-mode-specific quality suffix
    const canvasMode = message.config.canvasMode;
    if (canvasMode === "inpaint") {
      parts.push("high quality, seamless blend, consistent lighting");
    } else if (canvasMode === "img2img") {
      parts.push("high quality, professional result, enhanced details");
    } else {
      parts.push("professional logo, clean design, high quality");
    }
    const negativePrompt = message.config.negativePrompt
      ? `${message.config.negativePrompt}, blurry, low quality, watermark, text artifacts, cropped, reframed`
      : "blurry, low quality, watermark, text artifacts, amateur, distorted, noisy, cropped, reframed, different aspect ratio";

    return { prompt: parts.join(", "), negativePrompt };
  }

  if (hasReference) {
    const level = getReferenceLevel(message.config.referenceStrength ?? 50);
    const instruction = REFERENCE_INSTRUCTIONS[level];
    if (instruction) parts.push(instruction);
  }

  parts.push(`professional logo design: ${basePrompt}`);

  // Style profile modifiers
  const style = message.config.style;
  const styleProfile = style ? STYLE_PROFILES[style] : undefined;
  if (styleProfile) {
    parts.push(styleProfile.modifiers.join(", "));
  }

  // Industry context — injected here so ALL models benefit (including those
  // with native prompt enhancement that skip the LLM rewrite path)
  const industry = matchIndustryProfile(message.prompt);
  if (industry && !hasReference) {
    parts.push(`style cues: ${industry.visualCues.slice(0, 3).join(", ")}`);
  }

  if (message.config.brandName && message.config.brandName.trim().length > 0) {
    parts.push(`incorporating the text "${message.config.brandName.trim()}"`);
  }

  const palette = message.config.colorPalette;
  const paletteVal = palette ? PALETTE_MODIFIERS[palette] : undefined;
  if (paletteVal) parts.push(paletteVal);

  if (message.config.customColors && message.config.customColors.length > 0) {
    parts.push(`using colors: ${message.config.customColors.join(", ")}`);
  }

  const bg = message.config.background;
  if (bg === "custom" && message.config.customBgColor) {
    parts.push(`on a solid ${message.config.customBgColor} colored background`);
  } else if (bg && BACKGROUND_MODIFIERS[bg]) {
    parts.push(BACKGROUND_MODIFIERS[bg]);
  }

  parts.push(QUALITY_ANCHORS);

  const negativePrompt = buildNegativePrompt(
    styleProfile,
    industry,
    message.config.negativePrompt,
  );

  return { prompt: parts.join(", "), negativePrompt };
}
