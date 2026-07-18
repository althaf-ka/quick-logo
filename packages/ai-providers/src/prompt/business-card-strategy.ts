import {
  ValidatedBrandContext,
  ContactDetail,
  BusinessCardContentStrategy,
} from "./types";
import { cleanOptionalText } from "./normalize-context";
import {
  BUSINESS_CARD_CONTACT_FIELDS,
  BUSINESS_CARD_SOCIAL_PLATFORMS,
  groupSocialIdentities,
  SOCIAL_PLATFORM_LABELS,
  type BusinessCardBrief,
} from "@quicklogo/shared";

export function buildBusinessCardContentStrategy(
  context: ValidatedBrandContext,
  brief?: BusinessCardBrief,
): BusinessCardContentStrategy {
  const includedContactFields = new Set(
    brief?.includedContactFields || BUSINESS_CARD_CONTACT_FIELDS,
  );
  const includedSocialPlatforms =
    brief?.includedSocialPlatforms || BUSINESS_CARD_SOCIAL_PLATFORMS;
  const frontDetails: ContactDetail[] = [];
  const backDetails: ContactDetail[] = [];

  for (const [k, v] of Object.entries(context.contact)) {
    if (v && includedContactFields.has(k as keyof typeof context.contact)) {
      const detail = {
        type: k as ContactDetail["type"],
        label: k.charAt(0).toUpperCase() + k.slice(1),
        value: v as string,
      };
      if (k === "name" || k === "title") frontDetails.push(detail);
      else backDetails.push(detail);
    }
  }

  const socialIdentityGroups = groupSocialIdentities(
    context.socials,
    includedSocialPlatforms,
  ).map((group) => ({
    identity: group.identity,
    platformLabels: group.platforms.map(
      (platform) => SOCIAL_PLATFORM_LABELS[platform],
    ),
  }));

  return {
    tagline: cleanOptionalText(context.tagline),
    frontDetails,
    backDetails,
    socialIdentityGroups,
  };
}
