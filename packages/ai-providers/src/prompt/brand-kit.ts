import type { GenerationParams } from "../types";

type LogoVariationKind = "dark-mode" | "icon-only";
type BrandKitSectionKey = "colorPalette";

interface BrandKitMessage {
  role: "system" | "user";
  content: string;
}

interface BrandKitJsonRequest {
  messages: BrandKitMessage[];
  response_format: { type: "json_object" };
  max_tokens?: number;
}

interface BrandKitVisionMessage {
  role: "system" | "user";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
}

interface BrandKitVisionRequest {
  messages: BrandKitVisionMessage[];
  max_tokens?: number;
  response_format?: { type: "json_object" };
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

interface BuildTypographyRequestInput {
  brandName: string;
  description: string;
  typographyStyleHint: string;
  visualAnalysis?: string;
  typographyStyleKey?: string;
}

interface BuildLogoStyleAnalysisInput {
  brandName: string;
  description: string;
  logoUrl: string;
}

interface BuildBrandKitRefinementRequestInput {
  brandName: string;
  sectionId: string;
  refinementPrompt: string;
  currentResults: Record<string, unknown>;
}

const BRAND_KIT_SECTION_SCHEMAS: Record<BrandKitSectionKey, string> = {
  colorPalette:
    '{ "colorPalette": [{ "hex": "#000000", "role": "Primary", "rgb": "0,0,0" }] }',
};

const REFINEMENT_SECTION_KEYS: Partial<Record<string, BrandKitSectionKey>> = {
  "color-palette": "colorPalette",
};

const JSON_RESPONSE_MAX_TOKENS = 600;

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
    max_tokens: JSON_RESPONSE_MAX_TOKENS,
  };
}

export function buildBrandKitIdentityRequest({
  brandName,
  description,
  extractedColors,
}: BuildBrandKitIdentityRequestInput): BrandKitJsonRequest {
  const systemPrompt = `You are an expert brand identity designer.
Output ONLY valid JSON matching the schema below.
CRITICAL: Respond with ONLY the "colorPalette" key. Never add brandName, typography, logos, or any other fields.
{
  "colorPalette": [{ "hex": "#000000", "role": "Primary", "rgb": "0,0,0" }]
}`;

  return buildJsonBrandKitRequest(
    systemPrompt,
    `Brand Name: ${brandName}\nDescription: ${description}\nBase Colors: ${extractedColors.join(", ")}`,
  );
}

export function buildLogoStyleAnalysisRequest({
  brandName,
  description,
  logoUrl,
}: BuildLogoStyleAnalysisInput): BrandKitVisionRequest {
  return {
    messages: [
      {
        role: "system",
        content: `You are an expert brand identity analyst specializing in typography and visual design.
Analyze the provided logo image and describe its visual style characteristics.
Output a concise, single-paragraph analysis covering:
- The overall design style (e.g., modern, traditional, playful, elegant, minimal, tech, luxury)
- Key visual characteristics (e.g., geometric shapes, hand-drawn feel, thick lines, negative space, curves)
- Recommended font categories or moods that would complement this logo
Do NOT suggest specific font names. Only describe the visual style.
Keep your response under 4 sentences.`,
      },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: logoUrl } },
          {
            type: "text",
            text: `Brand Name: "${brandName}"\nBrand Description: "${description}"\n\nAnalyze this logo's visual style for font selection.`,
          },
        ],
      },
    ],
    max_tokens: 512,
  };
}

const STYLE_FONT_GUIDANCE: Record<string, string> = {
  "modern-sans": "Select clean, geometric SANS-SERIF fonts. Examples: Inter, Montserrat, DM Sans, Outfit.",
  "classic-serif": "Select elegant SERIF fonts. Examples: Merriweather, Playfair Display, Lora, PT Serif.",
  "playful-display": "Select rounded, decorative DISPLAY fonts. Examples: Fredoka, Baloo 2, Bangers, Bubblegum Sans.",
  "elegant-script": "Select flowing SCRIPT or handwriting fonts. Examples: Pacifico, Dancing Script, Alex Brush, Great Vibes.",
  "tech-mono": "Select MONOSPACE or techy sans-serif fonts. Examples: JetBrains Mono, Fira Code, Space Mono, IBM Plex Mono.",
  "bold-impact": "Select bold, high-weight SANS-SERIF or display fonts. Examples: Bebas Neue, Oswald, Anton, Rubik Dirt.",
  "friendly-round": "Select warm, ROUNDED sans-serif fonts. Examples: Nunito, Quicksand, Varela Round, M PLUS Rounded 1c.",
  "luxury-minimal": "Select refined, light-weight SERIF or SANS-SERIF fonts. Examples: Cormorant Garamond, Cinzel, Prata.",
};

export function buildBrandKitTypographyRequest({
  brandName,
  description,
  typographyStyleHint,
  visualAnalysis,
  typographyStyleKey,
}: BuildTypographyRequestInput): BrandKitJsonRequest {
  const visualContext = visualAnalysis
    ? `\nLogo Visual Analysis: "${visualAnalysis}"`
    : "";

  const styleGuidance =
    typographyStyleKey && STYLE_FONT_GUIDANCE[typographyStyleKey]
      ? `\n\nStyle-specific guidance: ${STYLE_FONT_GUIDANCE[typographyStyleKey]}`
      : "";

  const systemPrompt = `You are an expert brand identity typographer selecting Google Fonts.
The client has requested a "${typographyStyleHint}" typography style.
You MUST prioritize fonts matching this preference above all else.${visualContext}${styleGuidance}
Only use fonts from fonts.google.com.
Output ONLY valid JSON. No markdown, no explanation.
Schema:
{
  "heading": { "family": "ExactGoogleFontName", "weight": "700", "name": "ExactGoogleFontName" },
  "body": { "family": "ExactGoogleFontName", "weight": "400", "name": "ExactGoogleFontName" }
}`;
  return {
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Brand Name: "${brandName}"\nBrand Description: "${description}"\n\nReturn the JSON font selection now.`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 512,
  };
}

export function buildBrandKitRefinementRequest({
  brandName,
  sectionId,
  refinementPrompt,
  currentResults,
}: BuildBrandKitRefinementRequestInput): {
  sectionKey: BrandKitSectionKey;
  request: BrandKitJsonRequest;
} | null {
  const sectionKey = REFINEMENT_SECTION_KEYS[sectionId];
  if (!sectionKey) return null;

  const sectionSchema = BRAND_KIT_SECTION_SCHEMAS[sectionKey];
  const sectionInstruction =
    "You are refining the color palette of a brand. Keep it cohesive and professional.";

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
