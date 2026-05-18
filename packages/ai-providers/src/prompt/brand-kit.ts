import type { GenerationParams } from "../types";

type LogoVariationKind = "dark-mode" | "icon-only";
type SocialMediaVariationKind =
  | "social-profile"
  | "master-banner"
  | "facebook-banner";
type BusinessCardVariationKind = "front" | "back";
type BackdropVariationKind = "feed-backdrop" | "story-backdrop";
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

interface BuildSocialMediaParamsInput {
  variation: SocialMediaVariationKind;
  brandName: string;
  sourceLogoUrl: string;
  backendModel: string;
  defaultParams?: Omit<GenerationParams, "prompt" | "backendModel">;
}

interface BuildBusinessCardParamsInput {
  variation: BusinessCardVariationKind;
  brandName: string;
  sourceLogoUrl: string;
  backendModel: string;
  defaultParams?: Omit<GenerationParams, "prompt" | "backendModel">;
}

interface BuildBackdropParamsInput {
  variation: BackdropVariationKind;
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

const SOCIAL_MEDIA_PROMPTS = {
  "social-profile": ({ brandName }: LogoVariationPromptContext) =>
    `You are an expert social media designer. Take the logo for "${brandName}" and center it perfectly for a circular profile crop, leaving enough breathing room (padding) around the edges. CRITICAL: The background MUST be a solid, opaque color (not transparent) so it renders correctly on dark mode interfaces.`,
  "master-banner": ({ brandName }: LogoVariationPromptContext) =>
    `You are an expert social media designer. Create a striking wide panoramic banner background for "${brandName}" for X/LinkedIn. Use the provided logo to derive a cohesive background pattern or atmospheric scene. CRITICAL: Keep the bottom-left area minimal/empty as the profile picture will overlap there. Place primary visual weight and subtle watermarks on the right side.`,
  "facebook-banner": ({ brandName }: LogoVariationPromptContext) =>
    `You are an expert social media designer. Create a Facebook cover photo for "${brandName}". Use the provided logo to derive a cohesive background pattern. CRITICAL: Keep the left side clean for the profile picture, and place visual weight on the right side.`,
} satisfies Record<
  SocialMediaVariationKind,
  (context: LogoVariationPromptContext) => string
>;

const BACKDROP_PROMPTS = {
  "feed-backdrop": ({ brandName }: LogoVariationPromptContext) =>
    `You are an expert graphic designer. Create a beautiful abstract background or gradient derived from the brand's color palette for "${brandName}". It should be suitable as an Instagram feed post backdrop for writing text or quotes over. Include a tasteful, semi-transparent watermark of the logo in the bottom corner.`,
  "story-backdrop": ({ brandName }: LogoVariationPromptContext) =>
    `You are an expert graphic designer. Create a 9:16 vertical story backdrop for "${brandName}". Create a beautiful abstract background or gradient derived from the brand's color palette. Include a tasteful, semi-transparent watermark of the logo in the bottom corner.`,
} satisfies Record<
  BackdropVariationKind,
  (context: LogoVariationPromptContext) => string
>;

const BUSINESS_CARD_PROMPTS = {
  front: ({ brandName }: LogoVariationPromptContext) =>
    `You are an expert graphic designer. Create a premium standalone business card front for "${brandName}". Center the provided logo beautifully. CRITICAL: This is a direct print file. The entire image IS the card surface. Full-bleed, edge-to-edge design. DO NOT draw a card on a background. Clean brand-colored background. Print-ready quality.`,
  back: ({ brandName }: LogoVariationPromptContext) =>
    `You are an expert graphic designer. Create a premium standalone business card back for "${brandName}". Matching minimalist back, abstract pattern/gradient from brand palette. CRITICAL: This is a direct print file. The entire image IS the card surface. Full-bleed, edge-to-edge design. DO NOT draw a card on a background. Clean center space. Print-ready quality.`,
} satisfies Record<
  BusinessCardVariationKind,
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
  "modern-sans":
    "Select clean, geometric SANS-SERIF fonts. Examples: Inter, Montserrat, DM Sans, Outfit.",
  "classic-serif":
    "Select elegant SERIF fonts. Examples: Merriweather, Playfair Display, Lora, PT Serif.",
  "playful-display":
    "Select rounded, decorative DISPLAY fonts. Examples: Fredoka, Baloo 2, Bangers, Bubblegum Sans.",
  "elegant-script":
    "Select flowing SCRIPT or handwriting fonts. Examples: Pacifico, Dancing Script, Alex Brush, Great Vibes.",
  "tech-mono":
    "Select MONOSPACE or techy sans-serif fonts. Examples: JetBrains Mono, Fira Code, Space Mono, IBM Plex Mono.",
  "bold-impact":
    "Select bold, high-weight SANS-SERIF or display fonts. Examples: Bebas Neue, Oswald, Anton, Rubik Dirt.",
  "friendly-round":
    "Select warm, ROUNDED sans-serif fonts. Examples: Nunito, Quicksand, Varela Round, M PLUS Rounded 1c.",
  "luxury-minimal":
    "Select refined, light-weight SERIF or SANS-SERIF fonts. Examples: Cormorant Garamond, Cinzel, Prata.",
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

export function buildSocialMediaGenerationParams({
  variation,
  brandName,
  sourceLogoUrl,
  backendModel,
  defaultParams,
  refinementPrompt,
}: BuildSocialMediaParamsInput & {
  refinementPrompt?: string;
}): GenerationParams {
  const basePrompt = SOCIAL_MEDIA_PROMPTS[variation]({ brandName });
  const finalPrompt = refinementPrompt
    ? `${basePrompt} Refinement instruction: ${refinementPrompt}`
    : basePrompt;

  const width = 1024;
  const height = 1024;

  return {
    ...defaultParams,
    backendModel,
    prompt: finalPrompt,
    referenceImage: sourceLogoUrl,
    referenceStrength: variation === "social-profile" ? 90 : 40,
    width,
    height,
  };
}

export function buildBackdropGenerationParams({
  variation,
  brandName,
  sourceLogoUrl,
  backendModel,
  defaultParams,
  refinementPrompt,
}: BuildBackdropParamsInput & { refinementPrompt?: string }): GenerationParams {
  const basePrompt = BACKDROP_PROMPTS[variation]({ brandName });
  const finalPrompt = refinementPrompt
    ? `${basePrompt} Refinement instruction: ${refinementPrompt}`
    : basePrompt;

  return {
    ...defaultParams,
    backendModel,
    prompt: finalPrompt,
    referenceImage: sourceLogoUrl,
    referenceStrength: 40,
    width: 1024,
    height: 1024,
  };
}

export function buildBusinessCardGenerationParams({
  variation,
  brandName,
  sourceLogoUrl,
  backendModel,
  defaultParams,
  refinementPrompt,
}: BuildBusinessCardParamsInput & {
  refinementPrompt?: string;
}): GenerationParams {
  const basePrompt = BUSINESS_CARD_PROMPTS[variation]({ brandName });
  const finalPrompt = refinementPrompt
    ? `${basePrompt} Refinement instruction: ${refinementPrompt}`
    : basePrompt;

  return {
    ...defaultParams,
    backendModel,
    prompt: finalPrompt,
    referenceImage: sourceLogoUrl,
    referenceStrength: variation === "front" ? 90 : 40,
    width: 1376,
    height: 768,
  };
}
