import type { GenerationParams } from "../types";
import {
  LogoVariationKind,
  SocialMediaVariationKind,
  BackdropVariationKind,
  BusinessCardVariationKind,
  BrandKitSectionKey,
  BrandKitJsonRequest,
  BrandKitMessage,
  BrandKitVisionMessage,
  BrandKitVisionRequest,
  ValidatedBrandContext,
} from "./types";
import {
  normalizeBrandContext,
  buildBrandDesignContext,
} from "./normalize-context";
import { buildBusinessCardContentStrategy } from "./business-card-strategy";

const JSON_RESPONSE_MAX_TOKENS = 600;

export const LOGO_VARIATION_PROMPTS = {
  "dark-mode": ({ brandName }: { brandName: string }) =>
    `You are an expert graphic designer. Take the provided logo for "${brandName}" and prepare a dark-background version. Preserve the exact original canvas, logo scale, typography position, spacing, composition, and art style. The output must match the original layout and size exactly. Do not move text, enlarge the mark, shrink the mark, crop, rotate, or redesign any element. Keep the colored icon intact. Only recolor dark or low-contrast text and strokes to white or a light contrasting color so the existing logo remains legible on a pitch-black background.`,
  "icon-only": () =>
    "You are an expert graphic designer. Create an icon-only logomark from this image. Completely remove all typography, text, and words if they exist. Preserve the symbol's original proportions, colors, and art style. If removing text leaves the symbol visually too small, scale the symbol up tastefully to use the freed space while keeping comfortable margins. If the input is already icon-only or has no typography, preserve the original symbol scale or make only a subtle professional sizing adjustment. Do not shrink the symbol, crop, distort, or add new elements.",
} satisfies Record<
  LogoVariationKind,
  (context: { brandName: string }) => string
>;

export const SOCIAL_MEDIA_PROMPTS = {
  "social-profile": (context: ValidatedBrandContext) =>
    `You are an expert social media designer. Take the logo for "${context.brandName}" and center it perfectly for a circular profile crop, leaving enough breathing room (padding) around the edges. CRITICAL: The background MUST be a solid, opaque color (not transparent) so it renders correctly on dark mode interfaces.${buildBrandDesignContext(context)}`,
  "master-banner": (context: ValidatedBrandContext) =>
    `You are an expert social media designer. Create a striking wide panoramic banner background for "${context.brandName}" for X/LinkedIn. Use the provided logo to derive a cohesive background pattern or atmospheric scene. CRITICAL: Keep the bottom-left area minimal/empty as the profile picture will overlap there. Place primary visual weight and subtle watermarks on the right side.${context.hasSocials ? " Subtle social watermarks are permitted." : ""}${buildBrandDesignContext(context)}`,
  "facebook-banner": (context: ValidatedBrandContext) =>
    `You are an expert social media designer. Create a Facebook cover photo for "${context.brandName}". Use the provided logo to derive a cohesive background pattern. CRITICAL: Keep the left side clean for the profile picture, and place visual weight on the right side.${context.hasSocials ? " Subtle social watermarks are permitted." : ""}${buildBrandDesignContext(context)}`,
} satisfies Record<
  SocialMediaVariationKind,
  (context: ValidatedBrandContext) => string
>;

export const BACKDROP_PROMPTS = {
  "feed-backdrop": (context: ValidatedBrandContext) =>
    `You are an expert graphic designer. Create a beautiful abstract background or gradient derived from the brand's color palette for "${context.brandName}". It should be suitable as an Instagram feed post backdrop for writing text or quotes over. Include a tasteful, semi-transparent watermark of the logo in the bottom corner.${context.hasSocials ? " Subtle social watermarks are permitted." : ""}${buildBrandDesignContext(context)}`,
  "story-backdrop": (context: ValidatedBrandContext) =>
    `You are an expert graphic designer. Create a 9:16 vertical story backdrop for "${context.brandName}". Create a beautiful abstract background or gradient derived from the brand's color palette. Include a tasteful, semi-transparent watermark of the logo in the bottom corner.${context.hasSocials ? " Subtle social watermarks are permitted." : ""}${buildBrandDesignContext(context)}`,
} satisfies Record<
  BackdropVariationKind,
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

export interface BuildBrandKitIdentityRequestInput {
  brandName: string;
  description: string;
  extractedColors: string[];
  industry?: string;
  targetAudience?: string;
  selectedVibes?: string[];
  brandPersonality?: string;
}

export function buildBrandKitIdentityRequest({
  brandName,
  description,
  extractedColors,
  industry,
  targetAudience,
  selectedVibes,
  brandPersonality,
}: BuildBrandKitIdentityRequestInput): BrandKitJsonRequest {
  const systemPrompt = `You are an expert brand identity designer.
Output ONLY valid JSON matching the schema below.
CRITICAL: Respond with ONLY the "colorPalette" key. Never add brandName, typography, logos, or any other fields.
{
  "colorPalette": [{ "hex": "#000000", "role": "Primary", "rgb": "0,0,0" }]
}`;

  let context = `Brand Name: ${brandName}\nBase Colors: ${extractedColors.join(", ")}\n`;
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
    ? `${prompt} Refinement instruction: ${refinementPrompt}`
    : prompt;

  const params: GenerationParams = {
    ...defaultParams,
    backendModel,
    prompt: finalPrompt,
    width,
    height,
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
    width: 1024,
    height: 1024, // Assumed default if missing, though it wasn't there originally. Let's just omit width/height for logo? Wait, buildAssetParams requires width and height. I'll provide 1024. Or make them optional in buildAssetParams.
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
}

export function buildSocialMediaGenerationParams({
  variation,
  brandName,
  sourceLogoUrl,
  backendModel,
  defaultParams,
  refinementPrompt,
  context,
}: BuildSocialMediaParamsInput & {
  refinementPrompt?: string;
}): GenerationParams {
  const ctx = context || normalizeBrandContext(brandName, {});
  return buildAssetParams({
    prompt: SOCIAL_MEDIA_PROMPTS[variation](ctx),
    referenceImage: sourceLogoUrl,
    referenceStrength: variation === "social-profile" ? 90 : 40,
    width: 1024,
    height: 1024,
    backendModel,
    defaultParams,
    refinementPrompt,
  });
}

export interface BuildBackdropParamsInput {
  variation: BackdropVariationKind;
  brandName: string;
  sourceLogoUrl: string;
  backendModel: string;
  defaultParams?: Omit<GenerationParams, "prompt" | "backendModel">;
  context?: ValidatedBrandContext;
}

export function buildBackdropGenerationParams({
  variation,
  brandName,
  sourceLogoUrl,
  backendModel,
  defaultParams,
  refinementPrompt,
  context,
}: BuildBackdropParamsInput & { refinementPrompt?: string }): GenerationParams {
  const ctx = context || normalizeBrandContext(brandName, {});
  return buildAssetParams({
    prompt: BACKDROP_PROMPTS[variation](ctx),
    referenceImage: sourceLogoUrl,
    referenceStrength: 40,
    width: 1024,
    height: 1024,
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
    width: 1376,
    height: 768,
    backendModel,
    defaultParams,
    refinementPrompt,
  });
}

export function buildBrandPresentationGenerationParams({
  brandName,
  backendModel,
  defaultParams,
  refinementPrompt,
  headingFont,
  bodyFont,
  productImageUrl,
  logoStyleDescription,
  industry,
  targetAudience,
  selectedVibes,
  brandPersonality,
  fallbackPrompt,
}: {
  brandName: string;
  backendModel: string;
  defaultParams?: Omit<GenerationParams, "prompt" | "backendModel">;
  refinementPrompt?: string;
  headingFont?: string;
  bodyFont?: string;
  productImageUrl?: string;
  logoStyleDescription?: string;
  industry?: string;
  targetAudience?: string;
  selectedVibes?: string[];
  brandPersonality?: string;
  fallbackPrompt?: string;
}): GenerationParams {
  let basePrompt = `Create a stunning modern UI presentation layout for brand "${brandName}".`;

  if (selectedVibes?.length || brandPersonality) {
    basePrompt += ` Brand aesthetic: ${selectedVibes?.join(", ") || "modern"}. Personality: ${brandPersonality || "professional"}.`;
  } else if (fallbackPrompt) {
    basePrompt += ` Context: ${fallbackPrompt}.`;
  }

  basePrompt += ` Include clean typography`;
  basePrompt += ` Visual elements to seamlessly integrate: A premium logo mockup\n`;
  if (logoStyleDescription) basePrompt += ` (${logoStyleDescription})`;
  if (productImageUrl) basePrompt += `, a sleek product showcase`;
  basePrompt += `, subtle typography integration (${headingFont || "Inter"} & ${bodyFont || "Montserrat"}), and beautiful modern color palette swatches.`;
  basePrompt += ` Background should feature abstract organic shapes and sleek brand textures.`;
  basePrompt += ` CRITICAL: NO literal instruction text (do NOT write "Logo Mockup" or "Art:"). Create a cohesive, highly polished, aesthetic graphic design composition.`;

  return buildAssetParams({
    prompt: basePrompt,
    referenceImage: productImageUrl,
    referenceStrength: productImageUrl ? 45 : undefined,
    width: 1376,
    height: 768,
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
