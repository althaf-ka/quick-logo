import { extractUsername, buildBrandContextSummary } from "@quicklogo/shared";
import {
  ValidatedBrandContext,
  NormalizedSocials,
  NormalizedContact,
} from "./types";

export function formatHandleSocial(value: string): string | undefined {
  const cleaned = extractUsername(value);
  if (!cleaned) return undefined;
  return `@${cleaned}`;
}

export function formatLinkedIn(value: string): string | undefined {
  const cleaned = value.trim();
  if (!cleaned) return undefined;
  try {
    const url = new URL(
      cleaned.startsWith("http") ? cleaned : `https://${cleaned}`,
    );
    const host = url.hostname.replace(/^www\./i, "");
    let path = url.pathname;
    if (path === "/") path = "";
    return `${host}${path}`;
  } catch {
    return cleaned.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  }
}

export function formatYouTube(value: string): string | undefined {
  const cleaned = value.trim();
  if (!cleaned) return undefined;
  if (cleaned.includes("youtube.com/")) {
    try {
      const url = new URL(
        cleaned.startsWith("http") ? cleaned : `https://${cleaned}`,
      );
      const host = url.hostname.replace(/^www\./i, "");
      let path = url.pathname;
      if (path === "/") path = "";
      return `${host}${path}`;
    } catch {
      return cleaned.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    }
  }
  const username = extractUsername(value);
  return username ? `@${username}` : undefined;
}

export function formatSocialValue(
  platform: keyof NormalizedSocials,
  value: string,
): string | undefined {
  if (platform === "linkedin") return formatLinkedIn(value);
  if (platform === "youtube") return formatYouTube(value);
  return formatHandleSocial(value);
}

export function formatSocialLabel(platform: keyof NormalizedSocials): string {
  const map: Record<keyof NormalizedSocials, string> = {
    instagram: "Instagram",
    twitter: "X/Twitter",
    linkedin: "LinkedIn",
    youtube: "YouTube",
    tiktok: "TikTok",
  };
  return map[platform] || platform;
}

export function cleanOptionalText(value?: string): string | undefined {
  if (!value) return undefined;
  const cleaned = value.trim();
  return cleaned === "" ? undefined : cleaned;
}

const SOCIAL_KEY_ALIASES: Record<string, keyof NormalizedSocials> = {
  x: "twitter",
  yt: "youtube",
  tiktok: "tiktok",
  ig: "instagram",
};

export function normalizeBrandContext(
  brandName: string,
  rawContext: {
    tagline?: string;
    industry?: string;
    targetAudience?: string;
    brandPersonality?: string;
    selectedVibes?: string[];
    additionalContext?: string;
    socials?: Record<string, string>;
    contact?: Record<string, string>;
  },
): ValidatedBrandContext {
  const socials: NormalizedSocials = {};
  if (rawContext.socials) {
    for (const [key, value] of Object.entries(rawContext.socials)) {
      const lowerKey = key.toLowerCase();
      const mappedKey = SOCIAL_KEY_ALIASES[lowerKey] || lowerKey;
      if (
        mappedKey === "instagram" ||
        mappedKey === "twitter" ||
        mappedKey === "linkedin" ||
        mappedKey === "youtube" ||
        mappedKey === "tiktok"
      ) {
        const formatted = formatSocialValue(mappedKey, value);
        if (formatted) socials[mappedKey] = formatted;
      }
    }
  }

  const contact: NormalizedContact = {};
  if (rawContext.contact) {
    const email = cleanOptionalText(rawContext.contact.email);
    if (email) contact.email = email;

    const phone = cleanOptionalText(rawContext.contact.phone);
    if (phone) contact.phone = phone;

    const websiteRaw = cleanOptionalText(rawContext.contact.website);
    if (websiteRaw) {
      try {
        const url = new URL(
          websiteRaw.startsWith("http") ? websiteRaw : `https://${websiteRaw}`,
        );
        contact.website = url.hostname.replace(/^www\./i, "");
      } catch {
        contact.website = websiteRaw
          .replace(/^https?:\/\//i, "")
          .replace(/^www\./i, "");
      }
    }

    const name = cleanOptionalText(rawContext.contact.name);
    if (name) contact.name = name;

    const title = cleanOptionalText(rawContext.contact.title);
    if (title) contact.title = title;

    const address = cleanOptionalText(
      rawContext.contact.address || rawContext.contact.location,
    );
    if (address) contact.address = address;
  }

  const hasSocials = Object.keys(socials).length > 0;
  const hasContact = Object.keys(contact).length > 0;
  const hasAnyDetails = hasSocials || hasContact || !!rawContext.tagline;

  return {
    brandName,
    tagline: rawContext.tagline,
    industry: rawContext.industry,
    targetAudience: rawContext.targetAudience,
    brandPersonality: rawContext.brandPersonality,
    selectedVibes: rawContext.selectedVibes,
    additionalContext: rawContext.additionalContext,
    socials,
    contact,
    hasSocials,
    hasContact,
    hasAnyDetails,
  };
}

export function buildBrandDesignContext(
  context: ValidatedBrandContext,
): string {
  const summary = buildBrandContextSummary({
    industry: context.industry,
    tagline: context.tagline,
    targetAudience: context.targetAudience,
    brandPersonality: context.brandPersonality,
    selectedVibes: context.selectedVibes,
    additionalContext: context.additionalContext,
  });
  return summary ? `\nDesign Context: ${summary}` : "";
}
