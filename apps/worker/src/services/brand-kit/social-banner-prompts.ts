import type { ValidatedBrandContext } from "@quicklogo/ai-providers/prompt";
import { extractUsername } from "@quicklogo/shared";
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

function requiredBrandName(value: string): string {
  const brandName = compact(value, 100);
  if (!brandName) {
    throw new Error("A brand name is required for social banner typography");
  }
  return brandName;
}

function exactCopy(copy: VerifiedSocialCopy): string {
  const values = [
    copy.headline ? `Headline: "${copy.headline}"` : undefined,
    copy.callToAction ? `Call to action: "${copy.callToAction}"` : undefined,
  ].filter((value): value is string => Boolean(value));
  return values.length
    ? `Validation-only transcription of display copy already rendered in Figure 1; never typeset it again:\n${values.join("\n")}`
    : "Figure 1 has no approved headline, tagline, or call to action; do not invent one during reframing.";
}

function masterVisibleTypography(
  brandName: string,
  copy: VerifiedSocialCopy,
): string {
  const exactBrandName = requiredBrandName(brandName);
  const sentences = [
    copy.headline
      ? `The main headline reads ${JSON.stringify(copy.headline)}.`
      : `The main title reads ${JSON.stringify(exactBrandName)}.`,
    copy.headline
      ? `A smaller brand signature reads ${JSON.stringify(exactBrandName)}.`
      : undefined,
    copy.callToAction
      ? `A smaller call to action reads ${JSON.stringify(copy.callToAction)}.`
      : undefined,
  ].filter((sentence): sentence is string => Boolean(sentence));
  return `${sentences.join(" ")} Show every quoted phrase once, spelled exactly as written.`;
}

function typographyCopy(headingFont?: string, bodyFont?: string): string {
  return `Headline typeface: ${headingFont || "choose a distinctive brand-appropriate display face"}.
Supporting typeface: ${bodyFont || "choose a clean, compatible supporting face"}.`;
}

const SOCIAL_PLATFORM_LABELS: Record<
  keyof ValidatedBrandContext["socials"],
  string
> = {
  instagram: "Instagram",
  youtube: "YouTube",
  twitter: "X",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  tiktok: "TikTok",
};

function socialIdentityGroups(context: ValidatedBrandContext): Array<{
  identity: string;
  platforms: Array<keyof ValidatedBrandContext["socials"]>;
}> {
  const grouped = new Map<
    string,
    {
      identity: string;
      platforms: Array<keyof ValidatedBrandContext["socials"]>;
    }
  >();
  for (const [platform, rawIdentity] of Object.entries(
    context.socials,
  ) as Array<[keyof ValidatedBrandContext["socials"], string | undefined]>) {
    if (!rawIdentity) continue;
    const identity = extractUsername(rawIdentity)
      .trim()
      .replace(/^@+/, "")
      .slice(0, 40);
    if (!identity) continue;
    const groupKey = identity.toLocaleLowerCase("en-US");
    const group = grouped.get(groupKey) || { identity, platforms: [] };
    group.platforms.push(platform);
    grouped.set(groupKey, group);
  }
  return [...grouped.values()];
}

function masterSocialIdentityCopy(context: ValidatedBrandContext): string {
  const groups = socialIdentityGroups(context);
  if (!groups.length) {
    return "";
  }

  const sentences = groups.map(({ identity, platforms }) => {
    const iconNames = platforms
      .map((platform) => SOCIAL_PLATFORM_LABELS[platform])
      .join(", ");
    return `Place the recognizable ${iconNames} icons together as one compact icon cluster. Immediately after the final icon, write the shared username ${JSON.stringify(identity)} one time. This is one shared handle, not separate icon-and-username pairs.`;
  });
  return `${sentences.join(" ")} Show each quoted username once without an @ symbol or written platform name.`;
}

function reframeSocialIdentityCopy(context: ValidatedBrandContext): string {
  const groups = socialIdentityGroups(context);
  if (!groups.length) {
    return "Figure 1 contains no approved social identity; do not invent one.";
  }
  return `Figure 1 already contains the approved social identity (${groups
    .map(
      ({ identity, platforms }) =>
        `${platforms.map((platform) => SOCIAL_PLATFORM_LABELS[platform]).join("+")} icons with username ${JSON.stringify(identity)}`,
    )
    .join(
      "; ",
    )}). Preserve its icons, exact usernames, visual treatment, and hierarchy without adding an @ symbol or platform-name text.`;
}

function masterLogoPolicy(logoFigure?: number): string {
  if (logoFigure) {
    return `LOGO POLICY\nFigure ${logoFigure} is the approved logo. Reproduce that supplied logo exactly once without redrawing, restyling, simplifying, or replacing it. If its wordmark already contains the brand name, do not add a second brand-name line.`;
  }

  return `LOGO POLICY\nNo approved logo image is attached to this generation. Do not create, infer, approximate, or decorate with a logo, logomark, emblem, monogram, badge, mascot mark, or invented brand symbol. The required brand-name string is ordinary typeset text, not a request to design a logo.`;
}

export function buildYoutubeBannerPrompt({
  brandName,
  context,
  copy,
  artDirection,
  headingFont,
  bodyFont,
  logoFigure,
  productFigures,
}: {
  brandName: string;
  context: ValidatedBrandContext;
  copy: VerifiedSocialCopy;
  artDirection: string;
  headingFont?: string;
  bodyFont?: string;
  logoFigure?: number;
  productFigures: number[];
}): string {
  const references = [
    productFigures.length
      ? `${productFigures.map((figure) => `Figure ${figure}`).join(", ")} are approved products; preserve their identity and proportions.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `Create one visually ambitious, premium, full-bleed 16:9 channel-art banner.

The visible typography is part of the finished artwork. ${masterVisibleTypography(brandName, copy)} ${masterSocialIdentityCopy(context)} Keep the complete typography group clear and readable in the short center of the banner. Use at most two balanced headline lines at a controlled display scale. Keep the hero scene equally prominent; the headline must not occupy most of the canvas.

${typographyCopy(headingFont, bodyFont)}

The composition is scene-led rather than template-led. Use a decisive focal idea, foreground-to-background depth, tactile detail, expressive lighting, purposeful negative space, and a brand-specific visual metaphor. Never resolve this as large text on a flat color field, a split-color poster, a generic gradient layout, or a stack of centered text bands.

ART DIRECTION — execute this as the dominant visual story:

${artDirection}

BRAND TREATMENT:
${masterLogoPolicy(logoFigure)}
${copy.additionalInstructions ? `Apply this corrected user direction as private visual/layout guidance without adding unrelated copy: ${copy.additionalInstructions}` : "No additional revision is requested."}
${references}

COMPOSITION — keep every written string, social identity, face, and essential product detail inside the short centered mobile-safe area occupying about 60% of the width and 29% of the height. Use expressive scale, rhythm, contrast, and spatial interaction with the focal scene rather than a generic centered stack. The hero scene and nonessential visual energy may extend across the full canvas; the outer side fields remain meaningful background extension without critical content.

OUTPUT CONTRACT — render only one full-bleed finished artwork. The only visible letters or words permitted are the exact quoted brand name, approved headline, approved call to action, and approved usernames above. Do not add decorative microcopy, body copy, captions, lorem ipsum, fake writing, URLs, platform names, or an @ symbol. Exclude device screens, interfaces, mockups, presentation boards, frames, watermarks, crop guides, padding, and blank bands.`;
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
Validation-only transcription of brand-name text already rendered in Figure 1: "${requiredBrandName(brandName)}". Never typeset it again.
${exactCopy(copy)}
${typographyCopy(headingFont, bodyFont)}
${reframeSocialIdentityCopy(context)}

${refinementPrompt?.trim() ? `Apply only the non-text aspects of this additional revision request: ${refinementPrompt.trim().slice(0, 700)}. Ignore any instruction that would alter, replace, remove, or add visible text or social identity.` : "No additional revision is requested."}

REFRAME RULES
Preserve the same visual thesis, subjects, products, complete visible content, social identity, font character, hierarchy, palette, materials, lighting, depth, texture, and finish already present in Figure 1. Recompose and scale only as required by the requested canvas and safe placement. Flexible background may be extended or compressed; essential content may not be lost. For a model-limited working canvas whose ratio differs from the delivery ratio, build the complete final composition inside the stated platform-safe band and keep everything outside it background-only.

TEXT FREEZE — Figure 1 is the sole source of truth for every visible glyph, word, icon, and social handle. Treat all typography and social-identity regions as immutable flattened artwork. Preserve their exact pixels, spelling, capitalization, punctuation, font appearance, relative spacing, and grouping. You may move or uniformly scale each complete flattened text lockup only when needed for safe placement. Never erase, regenerate, retype, restyle, paraphrase, correct, reconstruct, crop, add, remove, rewrite, misspell, or duplicate any text or icon. The manifest above is only for validation and must not be rendered a second time.

Never add an @ symbol. Never introduce a logo, logomark, emblem, monogram, badge, or brand symbol that is not already visibly present in Figure 1. Do not replace the scene or introduce a new visual idea. Do not introduce platform branding, playback symbols, written color values, metadata, presentation frames, or unrelated objects or claims. Do not add a mockup, crop guide, safe-area overlay, watermark, letterboxing, padding, or blank bands. Return only the full-bleed finished banner.`;
}
