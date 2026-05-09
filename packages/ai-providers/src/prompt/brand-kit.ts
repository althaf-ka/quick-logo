import type { GenerationParams } from "../types";

type LogoVariationKind = "dark-mode" | "icon-only";
type BrandKitSectionKey = "colorPalette" | "typography";

interface BrandKitMessage {
  role: "system" | "user";
  content: string;
}

interface BrandKitJsonRequest {
  messages: BrandKitMessage[];
  response_format: { type: "json_object" };
}

interface LogoVariationPromptContext {
  brandName: string;
}

interface BuildLogoVariationParamsInput {
  variation: LogoVariationKind;
  brandName: string;
  sourceLogoUrl: string;
  backendModel: string;
  defaultParams?: Omit<GenerationParams, "prompt" | "backendModel">;
}

interface BuildBrandKitIdentityRequestInput {
  brandName: string;
  description: string;
  extractedColors: string[];
}

interface BuildBrandKitRefinementRequestInput {
  brandName: string;
  sectionId: string;
  refinementPrompt: string;
  currentResults: Record<string, unknown>;
}

const TYPOGRAPHY_STYLE_LABELS: Record<string, string> = {
  "modern-sans": "Modern Sans-Serif (e.g. Inter, Roboto, Poppins, Montserrat)",
  "classic-serif": "Classic Serif (e.g. Merriweather, Playfair Display, Lora)",
  "playful-display":
    "Playful Display (e.g. Fredoka One, Righteous, Pacifico)",
  "elegant-script": "Elegant Script (e.g. Great Vibes, Dancing Script, Allura)",
  "tech-mono": "Tech Monospace (e.g. JetBrains Mono, Fira Code, Roboto Mono)",
};

const BRAND_KIT_SECTION_SCHEMAS: Record<BrandKitSectionKey, string> = {
  colorPalette:
    '{ "colorPalette": [{ "hex": "#000000", "role": "Primary", "rgb": "0,0,0" }] }',
  typography:
    '{ "typography": { "heading": { "name": "FontName", "family": "FontFamily", "weight": "700" }, "body": { "name": "FontName", "family": "FontFamily", "weight": "400" } } }',
};

const REFINEMENT_SECTION_KEYS: Partial<
  Record<string, BrandKitSectionKey>
> = {
  "color-palette": "colorPalette",
};

const LOGO_VARIATION_PROMPTS = {
  "dark-mode": ({ brandName }: LogoVariationPromptContext) =>
    `You are an expert graphic designer. Take the provided logo for "${brandName}" and prepare a dark-background version. Preserve the exact original canvas, logo scale, typography position, spacing, composition, and art style. The output must match the original layout and size exactly. Do not move text, enlarge the mark, shrink the mark, crop, rotate, or redesign any element. Keep the colored icon intact. Only recolor dark or low-contrast text and strokes to white or a light contrasting color so the existing logo remains legible on a pitch-black background.`,
  "icon-only": () =>
    "You are an expert graphic designer. Create an icon-only logomark from this image. Completely remove all typography, text, and words if they exist. Preserve the symbol's original proportions, colors, and art style. If removing text leaves the symbol visually too small, scale the symbol up tastefully to use the freed space while keeping comfortable margins. If the input is already icon-only or has no typography, preserve the original symbol scale or make only a subtle professional sizing adjustment. Do not shrink the symbol, crop, distort, or add new elements.",
} satisfies Record<
  LogoVariationKind,
  (context: LogoVariationPromptContext) => string
>;

function buildJsonBrandKitRequest(
  systemPrompt: string,
  userPrompt: string,
): BrandKitJsonRequest {
  return {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  };
}

export function buildBrandKitIdentityRequest({
  brandName,
  description,
  extractedColors,
}: BuildBrandKitIdentityRequestInput): BrandKitJsonRequest {
  const systemPrompt = `You are an expert brand identity designer.
Output ONLY valid JSON matching this schema exactly. Do not include any text outside the JSON.
{
  "colorPalette": [{ "hex": "#000000", "role": "Primary", "rgb": "0,0,0" }]
}`;

  return buildJsonBrandKitRequest(
    systemPrompt,
    `Brand Name: ${brandName}\nDescription: ${description}\nBase Colors: ${extractedColors.join(", ")}`,
  );
}

export function buildBrandKitRefinementRequest({
  brandName,
  sectionId,
  refinementPrompt,
  currentResults,
}: BuildBrandKitRefinementRequestInput):
  | { sectionKey: BrandKitSectionKey; request: BrandKitJsonRequest }
  | null {
  const sectionKey = REFINEMENT_SECTION_KEYS[sectionId];
  if (!sectionKey) return null;

  const sectionSchema = BRAND_KIT_SECTION_SCHEMAS[sectionKey];
  const sectionInstruction = "You are refining the color palette of a brand. Keep it cohesive and professional.";

  return {
    sectionKey,
    request: buildJsonBrandKitRequest(
      `You are an expert brand identity designer.\nOutput ONLY valid JSON matching this schema exactly. Do not include any text outside the JSON.\n${sectionSchema}\n${sectionInstruction}`,
      `Brand Name: ${brandName}\nRefinement Request: ${refinementPrompt}\nOriginal JSON state for context: ${JSON.stringify(currentResults[sectionKey])}`,
    ),
  };
}

export function buildLogoVariationGenerationParams({
  variation,
  brandName,
  sourceLogoUrl,
  backendModel,
  defaultParams,
}: BuildLogoVariationParamsInput): GenerationParams {
  return {
    ...defaultParams,
    backendModel,
    prompt: LOGO_VARIATION_PROMPTS[variation]({ brandName }),
    referenceImage: sourceLogoUrl,
    referenceStrength: 75,
  };
}
