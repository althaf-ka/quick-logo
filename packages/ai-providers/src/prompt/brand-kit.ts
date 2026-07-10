import type { GenerationParams } from "../types";
import {
  LogoVariationKind,
  SocialMediaVariationKind,
  BrandGraphicVariationKind,
  BusinessCardVariationKind,
  BrandKitSectionKey,
  BrandKitJsonRequest,
  BrandKitVisionRequest,
  ValidatedBrandContext,
} from "./types";
import {
  normalizeBrandContext,
  buildBrandDesignContext,
} from "./normalize-context";
import { buildBusinessCardContentStrategy } from "./business-card-strategy";

const JSON_RESPONSE_MAX_TOKENS = 600;
const SOCIAL_PROMPT_MAX_CHARS = 3800;
const SOCIAL_REFINEMENT_MAX_CHARS = 800;
const SOCIAL_PROMPT_TAIL_CHARS = 1200;

function truncatePromptPreservingRules(prompt: string, maxChars: number) {
  if (prompt.length <= maxChars) return prompt;
  const tailChars = Math.min(
    SOCIAL_PROMPT_TAIL_CHARS,
    Math.floor(maxChars / 3),
  );
  const separator = "\n[Design context abbreviated]\n";
  const headChars = maxChars - tailChars - separator.length;
  return `${prompt.slice(0, headChars)}${separator}${prompt.slice(-tailChars)}`;
}

// Orientation presets. gpt-image-2 (the default brand-kit model) only supports
// 1:1, 3:2, 2:3, so assets are generated at the nearest supported orientation
// rather than exact platform pixels. See getAspectRatio clamping in replicate.ts.
const SQUARE_DIMENSIONS = { width: 1024, height: 1024 }; // 1024x1024
const LANDSCAPE_DIMENSIONS = { width: 1536, height: 1024 }; // 1536x1024
const STORY_DIMENSIONS = { width: 1152, height: 2048 }; // 1152x2048

export const LOGO_VARIATION_PROMPTS = {
  "dark-mode": ({ brandName }: { brandName: string }) =>
    `You are an expert graphic designer. Take the provided logo for "${brandName}" and prepare a dark-background version. Preserve the exact original canvas, logo scale, typography position, spacing, composition, and art style. The output must match the original layout and size exactly. Do not move text, enlarge the mark, shrink the mark, crop, rotate, or redesign any element. Keep the colored icon intact. Only recolor dark or low-contrast text and strokes to white or a light contrasting color so the existing logo remains legible on a pitch-black background.`,
  "icon-only": () =>
    "You are an expert graphic designer. Create an icon-only logomark from this image. Completely remove all typography, text, and words if they exist. Preserve the symbol's original proportions, colors, and art style. If removing text leaves the symbol visually too small, scale the symbol up tastefully to use the freed space while keeping comfortable margins. If the input is already icon-only or has no typography, preserve the original symbol scale or make only a subtle professional sizing adjustment. Do not shrink the symbol, crop, distort, or add new elements.",
} satisfies Record<
  LogoVariationKind,
  (context: { brandName: string }) => string
>;

function buildBannerProductionRules(context: ValidatedBrandContext): string {
  return `${buildBrandDesignContext(context)}
FINAL PRODUCTION RULES:
- Deliver a finished, edge-to-edge cover image ready for direct upload, not a presentation mockup or design-board preview.
- Commit to one strong visual concept with a clear focal hierarchy, intentional negative space, clean edges, and two to four controlled palette colors.
- Create original campaign artwork from the approved palette and brand mood; do not build the scene out of the logo's symbol, mascot, letterforms, or silhouette.
- If a reference banner is supplied, treat it as the approved master artwork: preserve its signature motif, palette, lighting, material language, and overall composition. Adapt only what the requested crop or refinement requires.
- Keep the banner logo-free and text-free unless the platform brief or the user's refinement explicitly requests a small brand signature.
- Never generate social handles, slogans, fake UI, mockups, repeated emblems, watermarks, or decorative typography automatically.
- Avoid generic AI-design shortcuts: random 3D blobs, meaningless circuitry, stock skylines, excessive neon, particle fields, lens flares, and pseudo-text.
- Before finalizing, verify that the banner remains clear at small display sizes, survives the stated crop, contains no malformed text, and has no important detail touching an edge.
- The platform-specific direction and crop safety rules override any conflicting logo or icon suggestions in the design context.`;
}

const SOCIAL_PLATFORM_NAMES = [
  ["instagram", "Instagram"],
  ["twitter", "X/Twitter"],
  ["linkedin", "LinkedIn"],
  ["facebook", "Facebook"],
  ["youtube", "YouTube"],
  ["tiktok", "TikTok"],
] as const;

function usernameOnly(value: string): string {
  const withoutProtocol = value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[?#]/, 1)[0];
  const segments = withoutProtocol?.split("/").filter(Boolean) ?? [];
  return (segments.at(-1) || withoutProtocol || "").replace(/^@+/, "");
}

function buildRequestedSocialAccountData(
  context: ValidatedBrandContext,
  refinementPrompt?: string,
): string {
  if (!refinementPrompt || !context.hasSocials) return "";

  const rejectsAccounts =
    /\b(?:do not|don't|without|no)\b[\s\S]{0,40}\b(?:social|handle|username|instagram|twitter|linkedin|facebook|youtube|tiktok)\b/i.test(
      refinementPrompt,
    );
  if (rejectsAccounts) return "";

  const explicitlyRequestsAccounts =
    /\b(?:add|include|show|display|place|render|use)\b[\s\S]{0,100}\b(?:social|handle|username|instagram|twitter|linkedin|facebook|youtube|tiktok)\b/i.test(
      refinementPrompt,
    ) ||
    /\b(?:social|handle|username|instagram|twitter|linkedin|facebook|youtube|tiktok)\b[\s\S]{0,100}\b(?:add|include|show|display|place|render|use)\b/i.test(
      refinementPrompt,
    );
  if (!explicitlyRequestsAccounts) return "";

  const specificallyNamedPlatforms = SOCIAL_PLATFORM_NAMES.filter(
    ([key, label]) =>
      new RegExp(`\\b(?:${key}|${label.replace("/", "|")})\\b`, "i").test(
        refinementPrompt,
      ),
  );
  const candidates =
    specificallyNamedPlatforms.length > 0
      ? specificallyNamedPlatforms
      : SOCIAL_PLATFORM_NAMES;
  const accounts = candidates
    .flatMap(([key, label]) => {
      const value = context.socials[key];
      const username = value ? usernameOnly(value) : "";
      return username ? [`${label} username "${username}"`] : [];
    })
    .slice(0, specificallyNamedPlatforms.length > 0 ? undefined : 2);

  if (accounts.length === 0) return "";
  return `\nREQUESTED SOCIAL ACCOUNT CONTENT: ${accounts.join("; ")}. Since the user explicitly requested social account content, render each approved platform's familiar icon followed only by its username. Do not render the @ symbol, a full URL, a platform-name label, a colon, or any account not listed here.`;
}

export const SOCIAL_MEDIA_PROMPTS = {
  "social-profile": (context: ValidatedBrandContext) =>
    `You are a senior brand identity designer creating a production-ready social profile image for "${context.brandName}". Preserve the supplied logo exactly: use it once, centered, upright, and undistorted. Scale it to remain fully legible inside the central 70% of the square so a circular crop cannot clip any part of the mark. Use a simple opaque background derived from the brand palette with strong contrast; a restrained gradient or very subtle texture is acceptable, but the logo must remain the sole focal point. Do not redraw the mark, retype the wordmark, add a slogan, social handle, mockup, border, extra icon, glow, shadow clutter, or transparent background.${buildBrandDesignContext(context)}\nFINAL: The profile image is the only social asset that must display the supplied logo.`,
  "master-banner": (context: ValidatedBrandContext) =>
    `You are a senior brand designer creating the single canonical social-media campaign artwork for "${context.brandName}". Translate the brand's industry, audience, personality, and selected vibes into one ownable visual metaphor rather than a generic decorative background. Establish one memorable signature motif, one consistent material and lighting language, and a disciplined palette that can become a repeatable brand device.

MASTER CANVAS SYSTEM:
- Compose edge-to-edge on a 16:9 master canvas so it can supply YouTube art and panoramic platform headers.
- Design the centered middle 48% of the width and 23.5% of the height as the universal safe zone. Keep the complete signature motif and every essential detail inside it.
- Treat the remaining canvas as seamless crop-extension: continue color, atmosphere, texture, and low-importance supporting forms naturally to every edge.
- Make the center-right the visual anchor and keep the lower-left quiet for platform avatar overlays.
- The composition must remain intentional when center-cropped to 4:1, 3:1, and 2.63:1. Do not place a second focal point in the crop-extension area.

Avoid defaulting to waves, floating rectangles, modular UI grids, diagonal stripes, or abstract blobs unless the supplied brand context specifically makes that device meaningful. The result should feel art-directed and particular to this brand, not like a reusable technology-company wallpaper.${buildBannerProductionRules(context)}`,
  "twitter-banner": (context: ValidatedBrandContext) =>
    `Adapt the supplied approved master artwork into a polished 21:9 X/Twitter header for "${context.brandName}". Preserve the master's exact signature motif, palette, material, lighting, and visual identity; do not invent a new concept. Recompose only as needed for a 3:1 center crop, keeping the lower-left quarter quiet for the profile avatar and all essential detail in the center-right safe area.${buildBannerProductionRules(context)}`,
  "linkedin-banner": (context: ValidatedBrandContext) =>
    `Adapt the supplied approved master artwork into premium LinkedIn channel art for "${context.brandName}". Preserve the master's exact signature motif, palette, material, lighting, and visual identity; do not invent a new concept. Recompose only as needed for the centered 4:1 crop, keeping the lower-left quarter quiet for the profile avatar and the focal detail inside the center-right safe area.${buildBannerProductionRules(context)}`,
  "facebook-banner": (context: ValidatedBrandContext) =>
    `Adapt the supplied approved master artwork into a professional Facebook cover for "${context.brandName}". Preserve the master's exact signature motif, palette, material, lighting, and visual identity; do not invent a new concept. Recompose only as needed for the approximately 2.63:1 crop and narrower mobile views, keeping the outer 15% nonessential and the lower-left quarter quiet for interface overlays.${buildBannerProductionRules(context)}`,
  "youtube-banner": (context: ValidatedBrandContext) =>
    `Adapt the supplied approved master artwork into finished, professional YouTube channel art for "${context.brandName}". Preserve the master's exact signature motif, palette, material, lighting, and visual identity; do not invent a new concept. This must look like a deliberately art-directed channel header, not a movie poster, generic neon cityscape, AI collage, or repeated-logo wallpaper.

CANVAS AND CROP RULES:
- Compose on a 2560 x 1440 px, 16:9 canvas.
- The universal safe area is the centered 1235 x 338 px rectangle (approximately x=663-1898 and y=551-889, or the middle 48% of the width and 23.5% of the height).
- ALL essential content must fit comfortably inside that safe area: the logo, brand name if it is already part of the supplied logo, any requested social handle, and the primary focal detail. Leave internal padding so nothing touches the safe-area boundary.
- The surrounding canvas is decorative crop-extension only. Continue background color, gradients, texture, and low-importance abstract shapes naturally to every edge so the design still looks intentional in the centered 2560 x 423 desktop strip and 1856 x 423 tablet strip.

ART DIRECTION:
- Keep the master's existing focal grouping inside the safe area with strong hierarchy and generous negative space.
- Extend or recompose the approved artwork only where required by the 16:9 canvas and universal safe area.
- Default to logo-free artwork. Include the supplied logo only when the user's refinement explicitly requests it; then use it exactly once, small, and fully inside the safe area.
- Avoid excessive glow, random particles, light trails, clutter, and stock-looking scenery.
- Do not draw safe-area guides, crop marks, frames, device mockups, or dimension labels in the final image.${buildBannerProductionRules(context)}`,
} satisfies Record<
  SocialMediaVariationKind,
  (context: ValidatedBrandContext) => string
>;

export const BRAND_GRAPHIC_PROMPTS = {
  "graphic-backdrop-post": (context: ValidatedBrandContext) =>
    `You are an expert graphic designer specializing in social media content design. Create a clean, minimal 1:1 square background graphic for "${context.brandName}". Use the brand's color palette with subtle gradients, soft tones, and generous negative space. The design should feel refined and understated — think premium editorial layouts. Keep the center open and clean for text overlay. Use minimal geometric accents or soft textures at the edges only. The overall feel should be calm, sophisticated, and professional. CRITICAL: Do NOT include any logo, watermark, text, or typography — this is a pure background graphic. Create an elegant, minimalist composition.${buildBrandDesignContext(context)}`,
  "graphic-backdrop-story": (context: ValidatedBrandContext) =>
    `You are an expert graphic designer specializing in social media content design. Create a clean, minimal 9:16 vertical story background graphic for "${context.brandName}". Use the brand's color palette with subtle gradients, soft tones, and generous negative space. Design for mobile — keep the middle third clean for text or sticker overlays. Use soft geometric accents or subtle textures at the very top and bottom edges for framing. The overall feel should be calm, sophisticated, and professional. CRITICAL: Do NOT include any logo, watermark, text, or typography — this is a pure background graphic. Create an elegant, minimalist composition.${buildBrandDesignContext(context)}`,
} satisfies Record<
  BrandGraphicVariationKind,
  (context: ValidatedBrandContext) => string
>;

const RELIABILITY_WARNING =
  "\nRender any included text carefully and legibly. Do not invent, alter, or add extra contact details.";

export const BUSINESS_CARD_PROMPTS = {
  front: (context: ValidatedBrandContext) => {
    const strategy = buildBusinessCardContentStrategy(context);
    let hierarchy = "Center the provided logo beautifully.\n";
    if (strategy.tagline)
      hierarchy += `Include tagline: "${strategy.tagline}" below the logo.\n`;
    if (strategy.frontDetail) {
      hierarchy += `Feature one primary detail only: ${strategy.frontDetail.label}: ${strategy.frontDetail.value}\n`;
      hierarchy +=
        "Do not include any other contact or social details on the front.";
    } else {
      hierarchy +=
        "Keep the front minimalist — no contact or social text elements. Clean brand-colored background. Print-ready.";
    }

    return `You are an expert graphic designer. Create a premium standalone business card front for "${context.brandName}". CRITICAL: This is a direct print file. The entire image IS the card surface. Full-bleed, edge-to-edge design. DO NOT draw a card mockup on a background. Clean typographic hierarchy. Generous spacing. High readability.\n\nFront content hierarchy:\n${hierarchy}${RELIABILITY_WARNING}`;
  },
  back: (context: ValidatedBrandContext) => {
    const strategy = buildBusinessCardContentStrategy(context);
    let hierarchy = "";
    if (strategy.backDetails.length === 0) {
      hierarchy =
        "Elegant abstract pattern or gradient from brand palette. No text elements. Matching minimalist back design.";
    } else {
      const detailsList = strategy.backDetails
        .map((d) => `${d.label}: ${d.value}`)
        .join("\n  ");
      hierarchy = `Create a matching minimalist back design.\nInclude these exact contact details in a clean grid or stacked layout:\n  ${detailsList}\nKeep generous spacing and strong readability.`;
    }

    return `You are an expert graphic designer. Create a premium standalone business card back for "${context.brandName}". CRITICAL: This is a direct print file. The entire image IS the card surface. Full-bleed, edge-to-edge design. DO NOT draw a card mockup on a background. Clean typographic hierarchy. Generous spacing. High readability.\n\nBack content hierarchy:\n${hierarchy}${RELIABILITY_WARNING}`;
  },
} satisfies Record<
  BusinessCardVariationKind,
  (context: ValidatedBrandContext) => string
>;

const BRAND_KIT_SECTION_SCHEMAS: Record<BrandKitSectionKey, string> = {
  colorPalette:
    '{ "colorPalette": [{ "hex": "#000000", "role": "Primary", "rgb": "0,0,0" }] }',
  brandPresentation:
    '{ "tagline": "A tagline matching the brand vibe", "description": "A short, professional brand story or description showing the brand values" }',
};

const REFINEMENT_SECTION_KEYS: Partial<Record<string, BrandKitSectionKey>> = {
  "color-palette": "colorPalette",
  "brand-presentation": "brandPresentation",
};

export function buildJsonBrandKitRequest(
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
export const FALLBACK_PALETTE = ["#3b82f6", "#1d4ed8", "#1e3a8a", "#eff6ff"];

export interface PaletteColor {
  hex: string;
  role: string;
  rgb: string;
}

export function derivePalette(hexes: string[]): PaletteColor[] {
  if (!hexes || hexes.length === 0) {
    hexes = FALLBACK_PALETTE;
  }

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 0, g: 0, b: 0, str: "0,0,0" };
    const r = parseInt(result[1] as string, 16);
    const g = parseInt(result[2] as string, 16);
    const b = parseInt(result[3] as string, 16);
    return { r, g, b, str: `${r},${g},${b}` };
  };

  const calculateLuminance = (r: number, g: number, b: number) => {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };

  const sortedHexes = [...new Set(hexes)]
    .map((hex) => {
      const rgb = hexToRgb(hex);
      return {
        hex,
        rgb: rgb.str,
        luminance: calculateLuminance(rgb.r, rgb.g, rgb.b),
      };
    })
    .sort((a, b) => a.luminance - b.luminance)
    .slice(0, 5);

  const assignRole = (index: number, total: number) => {
    if (index === 0) return "Primary";
    if (index === total - 1) return "Background";
    if (total === 3) return "Accent";
    if (total === 4) return index === 1 ? "Secondary" : "Accent";
    return (
      ["Primary", "Secondary", "Accent", "Neutral", "Background"][index] ||
      "Support"
    );
  };

  return sortedHexes.map((item, index) => ({
    hex: item.hex,
    rgb: item.rgb,
    role: assignRole(index, sortedHexes.length),
  }));
}

export interface BuildBrandPresentationTextRequestInput {
  brandName: string;
  description: string;
  industry?: string;
  targetAudience?: string;
  selectedVibes?: string[];
  brandPersonality?: string;
}

export function buildBrandPresentationTextRequest({
  brandName,
  description,
  industry,
  targetAudience,
  selectedVibes,
  brandPersonality,
}: BuildBrandPresentationTextRequestInput): BrandKitJsonRequest {
  const systemPrompt = `You are an expert brand identity designer and copywriter.
Output ONLY valid JSON matching the schema below. Do not include any extra text.
Schema:
{
  "tagline": "A catchy, short, professional brand tagline (under 6 words)",
  "description": "A professional, compelling brand story or mission statement (1-2 sentences, max 30 words)"
}`;

  let context = `Brand Name: ${brandName}\n`;
  if (industry) context += `Industry: ${industry}\n`;
  if (targetAudience) context += `Target Audience: ${targetAudience}\n`;
  if (selectedVibes?.length) context += `Vibe: ${selectedVibes.join(", ")}\n`;
  if (brandPersonality) context += `Personality: ${brandPersonality}\n`;
  if (
    !industry &&
    !targetAudience &&
    !selectedVibes?.length &&
    !brandPersonality
  ) {
    context += `Description: ${description}\n`;
  } else {
    context += `Additional Context: ${description}\n`;
  }

  return buildJsonBrandKitRequest(systemPrompt, context);
}

export interface BuildLogoStyleAnalysisInput {
  brandName: string;
  description: string;
  logoUrl: string;
}

export function buildLogoStyleAnalysisRequest({
  brandName,
  description,
  logoUrl,
}: BuildLogoStyleAnalysisInput): BrandKitVisionRequest {
  const systemPrompt = `You are an expert brand identity designer and design historian.
Analyze the provided logo image. Output ONLY valid JSON containing a short, descriptive "style" string.
Your analysis must describe the visual style, form, texture, geometry, linework, and mood. For example: "A minimalist, geometric sans-serif mark with thick, monolinear strokes and rounded corners" or "An intricate, illustrative badge with organic textures and a vintage woodcut feel." Do NOT use words like "The logo is" or "This image shows". Just the description.
Schema:
{ "style": "Your description here" }`;

  return {
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Brand: ${brandName}\nContext: ${description}`,
          },
          { type: "image_url", image_url: { url: logoUrl } },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 300,
  };
}

export interface BuildTypographyRequestInput {
  brandName: string;
  description: string;
  typographyStyleHint: string;
  visualAnalysis?: string;
  typographyStyleKey?: string;
}

const STYLE_FONT_GUIDANCE: Record<string, string> = {
  "modern-sans":
    "Select clean, geometric SANS-SERIF fonts. Examples: Inter, Roboto, Montserrat, Poppins, Outfit.",
  "classic-serif":
    "Select elegant, traditional SERIF fonts. Examples: Playfair Display, Merriweather, Lora, PT Serif.",
  "bold-display":
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
      ? `\n\nStyle-specific guidance: ${STYLE_FONT_GUIDANCE[typographyStyleKey]}\n`
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

export interface BuildBrandKitRefinementRequestInput {
  brandName: string;
  sectionId: string;
  refinementPrompt: string;
  currentResults: Record<string, unknown>;
  industry?: string;
  targetAudience?: string;
  selectedVibes?: string[];
  brandPersonality?: string;
}

export function buildBrandKitRefinementRequest({
  brandName,
  sectionId,
  refinementPrompt,
  currentResults,
  industry,
  targetAudience,
  selectedVibes,
  brandPersonality,
}: BuildBrandKitRefinementRequestInput): {
  sectionKey: BrandKitSectionKey;
  request: BrandKitJsonRequest;
} | null {
  const sectionKey = REFINEMENT_SECTION_KEYS[sectionId];
  if (!sectionKey) return null;
  const sectionSchema = BRAND_KIT_SECTION_SCHEMAS[sectionKey];
  const sectionInstruction =
    sectionId === "brand-presentation"
      ? "You are refining the brand presentation tagline and description story. Make sure it incorporates the user's instructions while remaining professional and catchy."
      : "You are refining the color palette of a brand. Keep it cohesive and professional.";

  let context = `Brand Name: ${brandName}\n`;
  if (industry) context += `Industry: ${industry}\n`;
  if (targetAudience) context += `Target Audience: ${targetAudience}\n`;
  if (selectedVibes?.length) context += `Vibe: ${selectedVibes.join(", ")}\n`;
  if (brandPersonality) context += `Personality: ${brandPersonality}\n`;

  context += `Refinement Request: ${refinementPrompt}\nOriginal JSON state for context: ${JSON.stringify(currentResults[sectionKey])}`;

  return {
    sectionKey,
    request: buildJsonBrandKitRequest(
      `You are an expert brand identity designer.\nOutput ONLY valid JSON matching this schema exactly. Do not include any text outside the JSON.\n${sectionSchema}\n${sectionInstruction}`,
      context,
    ),
  };
}

export function buildAssetParams({
  prompt,
  referenceImage,
  referenceStrength,
  width,
  height,
  backendModel,
  defaultParams,
  refinementPrompt,
}: {
  prompt: string;
  referenceImage?: string;
  referenceStrength?: number;
  width: number;
  height: number;
  backendModel: string;
  defaultParams?: Omit<GenerationParams, "prompt" | "backendModel">;
  refinementPrompt?: string;
}): GenerationParams {
  const finalPrompt = refinementPrompt
    ? `${prompt}\nUSER-REQUESTED REFINEMENT: ${refinementPrompt}\nApply this refinement while preserving every preceding platform-crop, brand-identity, legibility, and content constraint.`
    : prompt;

  const params: GenerationParams = {
    backendModel,
    prompt: finalPrompt,
    width,
    height,
    ...defaultParams,
  };

  if (referenceImage) {
    params.referenceImage = referenceImage;
  }
  if (referenceStrength !== undefined) {
    params.referenceStrength = referenceStrength;
  }

  return params;
}

export interface BuildLogoVariationParamsInput {
  variation: LogoVariationKind;
  brandName: string;
  sourceLogoUrl: string;
  backendModel: string;
  defaultParams?: Omit<GenerationParams, "prompt" | "backendModel">;
}

export function buildLogoVariationGenerationParams({
  variation,
  brandName,
  sourceLogoUrl,
  backendModel,
  defaultParams,
}: BuildLogoVariationParamsInput): GenerationParams {
  return buildAssetParams({
    prompt: LOGO_VARIATION_PROMPTS[variation]({ brandName }),
    referenceImage: sourceLogoUrl,
    referenceStrength: 75,
    ...SQUARE_DIMENSIONS,
    backendModel,
    defaultParams,
  });
}

export interface BuildSocialMediaParamsInput {
  variation: SocialMediaVariationKind;
  brandName: string;
  sourceLogoUrl: string;
  backendModel: string;
  defaultParams?: Omit<GenerationParams, "prompt" | "backendModel">;
  context?: ValidatedBrandContext;
  includeReferenceImage?: boolean;
}

export function buildSocialMediaGenerationParams({
  variation,
  brandName,
  sourceLogoUrl,
  backendModel,
  defaultParams,
  refinementPrompt,
  context,
  includeReferenceImage = true,
}: BuildSocialMediaParamsInput & {
  refinementPrompt?: string;
}): GenerationParams {
  const ctx = context || normalizeBrandContext(brandName, {});
  const safeRefinementPrompt = refinementPrompt
    ?.trim()
    .slice(0, SOCIAL_REFINEMENT_MAX_CHARS);
  const refinementOverhead = safeRefinementPrompt
    ? safeRefinementPrompt.length + 180
    : 0;
  const platformPrompt = truncatePromptPreservingRules(
    `${SOCIAL_MEDIA_PROMPTS[variation](ctx)}${buildRequestedSocialAccountData(ctx, safeRefinementPrompt)}`,
    SOCIAL_PROMPT_MAX_CHARS - refinementOverhead,
  );
  // Profile is a square avatar; banners are wide → nearest supported landscape.
  const dimensions =
    variation === "social-profile" ? SQUARE_DIMENSIONS : LANDSCAPE_DIMENSIONS;
  return buildAssetParams({
    prompt: platformPrompt,
    referenceImage: includeReferenceImage ? sourceLogoUrl : undefined,
    referenceStrength: includeReferenceImage
      ? variation === "social-profile"
        ? 90
        : 30
      : undefined,
    ...dimensions,
    backendModel,
    defaultParams,
    refinementPrompt: safeRefinementPrompt,
  });
}

export interface BuildBrandGraphicParamsInput {
  variation: BrandGraphicVariationKind;
  brandName: string;
  sourceLogoUrl: string;
  backendModel: string;
  defaultParams?: Omit<GenerationParams, "prompt" | "backendModel">;
  context?: ValidatedBrandContext;
}

export function buildBrandGraphicGenerationParams({
  variation,
  brandName,
  sourceLogoUrl,
  backendModel,
  defaultParams,
  refinementPrompt,
  context,
}: BuildBrandGraphicParamsInput & {
  refinementPrompt?: string;
}): GenerationParams {
  const ctx = context || normalizeBrandContext(brandName, {});
  // Post graphics are square (1:1); story graphics are tall (9:16).
  const isStory = variation.includes("story");
  const dimensions = isStory ? STORY_DIMENSIONS : SQUARE_DIMENSIONS;
  return buildAssetParams({
    prompt: BRAND_GRAPHIC_PROMPTS[variation](ctx),
    referenceImage: sourceLogoUrl,
    referenceStrength: 60,
    ...dimensions,
    backendModel,
    defaultParams,
    refinementPrompt,
  });
}

export interface BuildBusinessCardParamsInput {
  variation: BusinessCardVariationKind;
  brandName: string;
  sourceLogoUrl: string;
  backendModel: string;
  defaultParams?: Omit<GenerationParams, "prompt" | "backendModel">;
  context?: ValidatedBrandContext;
}

export function buildBusinessCardGenerationParams({
  variation,
  brandName,
  sourceLogoUrl,
  backendModel,
  defaultParams,
  refinementPrompt,
  context,
}: BuildBusinessCardParamsInput & {
  refinementPrompt?: string;
}): GenerationParams {
  const ctx = context || normalizeBrandContext(brandName, {});

  const LOGO_KEYWORDS = ["logo", "emblem", "symbol", "brandmark", "icon"];
  const wantsLogo = refinementPrompt
    ? LOGO_KEYWORDS.some((kw) => refinementPrompt.toLowerCase().includes(kw))
    : false;

  const useReference = variation !== "back" || wantsLogo;

  return buildAssetParams({
    prompt: BUSINESS_CARD_PROMPTS[variation](ctx),
    referenceImage: useReference ? sourceLogoUrl : undefined,
    referenceStrength:
      variation === "front" ? (ctx.hasAnyDetails ? 60 : 90) : 40,
    ...LANDSCAPE_DIMENSIONS,
    backendModel,
    defaultParams,
    refinementPrompt,
  });
}

export function buildBrandPresentationGenerationParams({
  brandName,
  sourceLogoUrl,
  backendModel,
  defaultParams,
  refinementPrompt,
  headingFont,
  bodyFont,
  productImageUrl,
  industry,
  targetAudience,
  selectedVibes,
  brandPersonality,
  fallbackPrompt,
}: {
  brandName: string;
  sourceLogoUrl: string;
  backendModel: string;
  defaultParams?: Omit<GenerationParams, "prompt" | "backendModel">;
  refinementPrompt?: string;
  headingFont?: string;
  bodyFont?: string;
  productImageUrl?: string;
  industry?: string;
  targetAudience?: string;
  selectedVibes?: string[];
  brandPersonality?: string;
  fallbackPrompt?: string;
}): GenerationParams {
  let basePrompt = `Create a stunning modern UI presentation layout for brand "${brandName}".`;

  if (industry) basePrompt += ` Industry: ${industry}.`;
  if (targetAudience) basePrompt += ` Target Audience: ${targetAudience}.`;

  if (selectedVibes?.length || brandPersonality) {
    basePrompt += ` Brand aesthetic: ${selectedVibes?.join(", ") || "modern"}. Personality: ${brandPersonality || "professional"}.`;
  } else if (fallbackPrompt) {
    basePrompt += ` Context: ${fallbackPrompt}.`;
  }

  basePrompt += ` Include clean typography`;
  basePrompt += ` Visual elements to seamlessly integrate: A premium logo mockup\n`;
  if (productImageUrl) basePrompt += `, a sleek product showcase`;
  basePrompt += `, subtle typography integration (${headingFont || "Inter"} & ${bodyFont || "Montserrat"}), and beautiful modern color palette swatches.`;
  basePrompt += ` Background should feature abstract organic shapes and sleek brand textures.`;
  basePrompt += ` CRITICAL: NO literal instruction text (do NOT write "Logo Mockup" or "Art:"). Create a cohesive, highly polished, aesthetic graphic design composition.`;

  return buildAssetParams({
    prompt: basePrompt,
    referenceImage: sourceLogoUrl || productImageUrl,
    referenceStrength: sourceLogoUrl ? 65 : productImageUrl ? 45 : undefined,
    ...LANDSCAPE_DIMENSIONS,
    backendModel,
    defaultParams,
    refinementPrompt,
  });
}

export interface BuildBrandKitGlobalRefinementRequestInput {
  brandName: string;
  refinementPrompt: string;
  currentResults: Record<string, unknown>;
  industry?: string;
  targetAudience?: string;
  selectedVibes?: string[];
  brandPersonality?: string;
  hasBrandGuidelines: boolean;
}

export function buildBrandKitGlobalRefinementRequest({
  brandName,
  refinementPrompt,
  currentResults,
  industry,
  targetAudience,
  selectedVibes,
  brandPersonality,
  hasBrandGuidelines,
}: BuildBrandKitGlobalRefinementRequestInput): BrandKitJsonRequest {
  const systemPrompt = `You are an expert brand identity designer.
You are processing a global refinement request for a brand kit.
Output ONLY valid JSON matching this schema exactly. Do not include any text outside the JSON.
The user wants to update the brand kit based on their request.
You may update any of the supported optional fields if the user's request affects them.
Do NOT include fields that are not impacted by the request.
Schema:
{
  "colorPalette": [{ "hex": "#000000", "role": "Primary", "rgb": "0,0,0" }],
  "brandPresentation": { "tagline": "...", "description": "..." },
  "typography": {
    "heading": { "family": "...", "weight": "...", "name": "..." },
    "body": { "family": "...", "weight": "...", "name": "..." }
  }${hasBrandGuidelines ? `,\n  "brandGuidelines": { "missionStatement": "...", "tagline": "...", "personality": "...", "targetAudience": "...", "industry": "...", "additionalContext": "..." }` : ""}
}`;

  let context = `Brand Name: ${brandName}\n`;
  if (industry) context += `Industry: ${industry}\n`;
  if (targetAudience) context += `Target Audience: ${targetAudience}\n`;
  if (selectedVibes?.length) context += `Vibe: ${selectedVibes.join(", ")}\n`;
  if (brandPersonality) context += `Personality: ${brandPersonality}\n`;

  context += `Refinement Request: ${refinementPrompt}\nOriginal JSON state for context: ${JSON.stringify(currentResults)}`;

  return buildJsonBrandKitRequest(systemPrompt, context);
}
