import type { SocialMediaBrief } from "@quicklogo/shared";
import type { ValidatedBrandContext } from "@quicklogo/ai-providers/prompt";
import type { VerifiedSocialCopy } from "./social-banner-copy";

export interface SocialBannerPromptSpec {
  platform: "twitter" | "linkedin" | "facebook" | "youtube";
  dimensions: string;
  aspectRatio: string;
  renderWidth: number;
  renderHeight: number;
  safeArea: string;
}

const compact = (value: string | undefined, maxLength: number) =>
  value?.trim().slice(0, maxLength) || undefined;

function describeColor(value: string): string {
  const match = value.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!match?.[1]) return compact(value, 40) || "brand color";

  const hex =
    match[1].length === 3
      ? [...match[1]].map((character) => character.repeat(2)).join("")
      : match[1];
  const [red, green, blue] = [0, 2, 4].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16),
  ) as [number, number, number];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 510;
  if (max - min < 18) {
    if (lightness < 0.2) return "near-black charcoal";
    if (lightness < 0.45) return "dark gray";
    if (lightness < 0.75) return "soft gray";
    return "near-white gray";
  }

  const delta = max - min;
  let hue =
    max === red
      ? ((green - blue) / delta) % 6
      : max === green
        ? (blue - red) / delta + 2
        : (red - green) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  const hueName =
    hue < 15 || hue >= 345
      ? "red"
      : hue < 40
        ? "orange"
        : hue < 65
          ? "gold"
          : hue < 90
            ? "yellow"
            : hue < 150
              ? "green"
              : hue < 190
                ? "teal"
                : hue < 225
                  ? "blue"
                  : hue < 265
                    ? "indigo"
                    : hue < 305
                      ? "violet"
                      : "magenta";
  const tone = lightness < 0.32 ? "deep" : lightness > 0.72 ? "pale" : "vivid";
  return `${tone} ${hueName}`;
}

function brandBrief(
  brandName: string,
  context: ValidatedBrandContext,
  brief: SocialMediaBrief,
): string {
  const identity = compact(brandName, 100) || "the brand";
  const industry = compact(context.industry, 120);
  const audience = compact(context.targetAudience, 180);
  const personality = compact(context.brandPersonality, 220);
  const vibes = context.selectedVibes?.slice(0, 8).join(", ");
  const palette = context.colors?.slice(0, 6).map(describeColor).join(", ");
  const promise = compact(context.tagline, 160);
  const visualPreference =
    brief.visualDirection === "auto" ? undefined : brief.visualDirection;

  return [
    `${identity}${industry ? ` operates in ${industry}` : ""}${audience ? ` for ${audience}` : ""}.`,
    promise ? `Its established brand promise is ${promise}.` : undefined,
    personality ? `The personality should feel ${personality}.` : undefined,
    vibes ? `Relevant emotional cues are ${vibes}.` : undefined,
    palette ? `Use a visual palette characterized by ${palette}.` : undefined,
    `The campaign purpose is ${brief.purpose}.`,
    visualPreference
      ? `The user prefers a ${visualPreference} visual direction.`
      : undefined,
  ]
    .filter((line): line is string => Boolean(line))
    .join(" ");
}

function exactCopy(copy: VerifiedSocialCopy): string {
  const values = [
    copy.headline ? `Headline: "${copy.headline}"` : undefined,
    copy.callToAction ? `Call to action: "${copy.callToAction}"` : undefined,
  ].filter((value): value is string => Boolean(value));
  return values.length
    ? `Render only this approved display copy, with every character exactly as written:\n${values.join("\n")}`
    : "Do not render a headline, tagline, call to action, or other display copy.";
}

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  twitter: "X",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
};

function socialIdentityCopy(context: ValidatedBrandContext): string {
  const identities = Object.entries(context.socials)
    .filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()))
    .slice(0, 6)
    .map(
      ([platform, identity]) =>
        `${SOCIAL_LABELS[platform] || platform}: "${identity.trim().slice(0, 120)}"`,
    );
  return identities.length
    ? `Render one compact social identity row containing every entry below exactly once. Use a restrained platform label or recognizable icon followed by its exact identity:\n${identities.join("\n")}`
    : "Do not render a social identity row because the user supplied no social profiles.";
}

function typographyCopy(headingFont?: string, bodyFont?: string): string {
  return `Headline typeface: ${headingFont || "choose a distinctive brand-appropriate display face"}.
Supporting and social-row typeface: ${bodyFont || "choose a clean, compatible supporting face"}.`;
}

export function buildYoutubeBannerPrompt({
  brandName,
  context,
  brief,
  copy,
  headingFont,
  bodyFont,
  logoFigure,
  productFigures,
}: {
  brandName: string;
  context: ValidatedBrandContext;
  brief: SocialMediaBrief;
  copy: VerifiedSocialCopy;
  headingFont?: string;
  bodyFont?: string;
  logoFigure?: number;
  productFigures: number[];
}): string {
  const references = [
    logoFigure
      ? `Figure ${logoFigure} is the approved logo. Use it exactly once, unchanged and undistorted.`
      : brief.includeLogo
        ? "The requested logo reference is unavailable; do not invent a replacement logo."
        : "Do not add a logo or invented brand mark.",
    productFigures.length
      ? `${productFigures.map((figure) => `Figure ${figure}`).join(", ")} are approved product references. Preserve their identity and proportions if you use them.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `GOAL
Create one complete, premium YouTube channel-art master designed for 3840 x 2160 pixel delivery (16:9). This first image is the canonical campaign design from which every other social banner will be reframed. The Replicate GPT Image 2 wrapper returns a 3:2 working canvas, so place the complete 16:9 master composition inside an invisible centered, full-width band occupying the middle 84.4% of canvas height. Continue only flexible background into the remaining space above and below. Render the finished artwork itself—not a preview, mockup, device, interface, template sheet, or design presentation.

BRAND BRIEF
${brandBrief(brandName, context, brief)}

APPROVED CONTENT MANIFEST — render all applicable content now
Brand name spelling: "${compact(brandName, 100) || "Brand"}". ${logoFigure ? "Use the exact supplied logo as the brand signature; if its wordmark already contains the name, do not type the name a second time." : "Render the brand name exactly once as the brand signature."}
${exactCopy(copy)}
${socialIdentityCopy(context)}
${typographyCopy(headingFont, bodyFont)}
${copy.additionalInstructions ? `Follow this corrected user direction: ${copy.additionalInstructions}` : "There are no additional user instructions."}
${references}

RESPONSIVE CROP CONSTRAINT — this is a layout rule, never a visual subject
Inside the centered 16:9 master band, keep every essential element—the complete approved text, logo, social identity row, product, face, focal subject, and any detail required to understand the design—fully inside an invisible centered mobile-safe region occupying approximately 60% of the full canvas width and 25% of the full canvas height. Treat all canvas area outside that mobile-safe region as background-only extension: continue the same environment, color, light, texture, or nonessential decoration there, with no important content. Never visualize, outline, label, or explain either region.

CREATIVE MANDATE
Act as an exceptional brand campaign art director, not a template generator. Before rendering, silently consider at least three genuinely different visual ideas derived from this brand's purpose, audience, personality, product, and message. Reject the predictable ideas and render only the single most ownable concept. Do not show alternatives or explain the reasoning.

Build the design around one clear visual thesis: a memorable metaphor, scene, material language, or art-directed focal moment that communicates this specific brand promise. Establish intentional hierarchy, confident negative space, depth, lighting, scale, and a refined relationship between typography and imagery. The headline is the primary reading level; brand signature, call to action, and social row form a disciplined secondary system. Make the result feel commissioned and culturally aware. Let the subject matter determine the medium and visual language rather than defaulting to a fashionable preset. Use the approved palette as art direction, never as a color-swatch display.

QUALITY FILTER
Avoid generic AI-banner habits: centered logo-plus-slogan layouts, decorative gradient blobs, random waves or floating shapes, stock-office scenes, feature grids, presentation slides, data boards, and mockup-style compositions. The artwork itself must occupy the complete canvas; never present it as content displayed inside another object.

NON-PRINTING RULES
The brand brief is private art direction, not visible content. Visible text is limited to the approved brand signature, headline, call to action, social identities, and anything explicitly requested in the corrected user direction. Platform identifiers are allowed only inside the approved social identity row; never create a platform interface or unrelated platform advertisement. Do not render written color values, metadata, or safe-area explanations. Do not invent claims, words, handles, URLs, contact details, logos, or products. Do not add borders, watermarks, crop marks, safe-area guides, letterboxing, padding, or blank bands. Fill the entire canvas with one polished, full-bleed final artwork.`;
}

export function buildSocialReframePrompt({
  spec,
  brandName,
  context,
  copy,
  headingFont,
  bodyFont,
  refinementPrompt,
}: {
  spec: SocialBannerPromptSpec;
  brandName: string;
  context: ValidatedBrandContext;
  copy: VerifiedSocialCopy;
  headingFont?: string;
  bodyFont?: string;
  refinementPrompt?: string;
}): string {
  return `GOAL
Figure 1 is the approved complete YouTube master. Reframe that exact finished campaign artwork for one ${spec.platform} banner. This is an image edit, not a new design.

TARGET
Platform delivery requirement: ${spec.dimensions} pixels, ${spec.aspectRatio} aspect ratio.
Replicate GPT Image 2 working canvas: ${spec.renderWidth} x ${spec.renderHeight} pixels, 3:2 aspect ratio. The complete platform composition must live inside the centered delivery band described below.
Platform-safe placement: ${spec.safeArea}

APPROVED CONTENT MANIFEST — preserve every item exactly
Brand name spelling: "${compact(brandName, 100) || "Brand"}".
${exactCopy(copy)}
${socialIdentityCopy(context)}
${typographyCopy(headingFont, bodyFont)}

${refinementPrompt?.trim() ? `Apply this additional revision request while preserving everything unrelated: ${refinementPrompt.trim().slice(0, 700)}` : "No additional revision is requested."}

REFRAME RULES
Preserve the same visual thesis, subjects, logo, products, complete approved content, font character, hierarchy, palette, materials, lighting, depth, texture, and finish from Figure 1. Recompose and scale only as required by the requested canvas and safe placement. Flexible background may be extended or compressed; essential content may not be lost. For a model-limited working canvas whose ratio differs from the delivery ratio, build the complete final composition inside the stated platform-safe band and keep everything outside it background-only.

Do not add, remove, rewrite, misspell, or duplicate display content. Do not reinterpret the logo, replace the scene, or introduce a new visual idea. Do not introduce platform branding beyond the already-approved social identity row, playback symbols, written color values, metadata, presentation frames, or unrelated objects or claims. Do not add a mockup, crop guide, safe-area overlay, watermark, letterboxing, padding, or blank bands. Return only the full-bleed finished banner.`;
}
