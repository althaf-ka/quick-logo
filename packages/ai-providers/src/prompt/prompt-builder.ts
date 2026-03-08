import type { GenerateImageMessage } from "@quicklogo/shared";

const STYLE_MODIFIERS: Record<string, string> = {
  minimal: "minimal clean design, simple geometric shapes, flat design",
  abstract: "abstract artistic style, geometric patterns, modern design",
  mascot: "character mascot design, friendly, illustration style",
  lettermark: "typography-focused lettermark, elegant font design",
  "3d": "3D rendered, dimensional depth, realistic lighting and shadows",
  emblem: "badge-style emblem, classic crest design, shield shape",
  wordmark: "wordmark typography, full name as logo text, clean font",
  vintage: "vintage retro style, hand-crafted feel, distressed texture",
};

const PALETTE_MODIFIERS: Record<string, string> = {
  vibrant: "vibrant bold colors, high saturation",
  pastel: "soft pastel color palette, muted tones",
  monochrome: "monochrome single color palette, shades of one hue",
  earth: "earthy natural tones, warm browns and greens",
  neon: "neon glowing colors, electric bright tones",
};

const BACKGROUND_MODIFIERS: Record<string, string> = {
  transparent: "on a transparent background, isolated subject, no background",
  white: "on a clean white background, isolated, no background elements",
  custom: "on a solid colored background",
};

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

export function buildBasePrompt(
  message: GenerateImageMessage,
  basePrompt: string,
  hasReference = false,
): { prompt: string; negativePrompt: string } {
  const parts: string[] = [];

  if (hasReference && !message.isEdit) {
    const level = getReferenceLevel(message.config.referenceStrength ?? 50);
    const instruction = REFERENCE_INSTRUCTIONS[level];
    if (instruction) parts.push(instruction);
  }

  parts.push(`professional logo design: ${basePrompt}`);

  const style = message.config.style;
  const styleVal = style ? STYLE_MODIFIERS[style] : undefined;
  if (styleVal) parts.push(styleVal);

  const palette = message.config.colorPalette;
  const paletteVal = palette ? PALETTE_MODIFIERS[palette] : undefined;
  if (paletteVal) parts.push(paletteVal);

  if (message.config.customColors && message.config.customColors.length > 0) {
    parts.push(`using colors: ${message.config.customColors.join(", ")}`);
  }

  const bg = message.config.background;
  const bgVal = bg ? BACKGROUND_MODIFIERS[bg] : undefined;
  if (bgVal) parts.push(bgVal);

  parts.push(
    "professional logo, vector-style, sharp edges, clean design, high quality",
  );

  const negativePrompt = message.config.negativePrompt
    ? `${message.config.negativePrompt}, blurry, low quality, watermark, text artifacts`
    : "blurry, low quality, watermark, text artifacts, amateur, distorted, noisy";

  return { prompt: parts.join(", "), negativePrompt };
}
