import { extractUsername } from "../validators/brand-profile";

export const SOCIAL_PLATFORM_LABELS = {
  instagram: "Instagram",
  twitter: "X",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
} as const;

export type SocialIdentityPlatform = keyof typeof SOCIAL_PLATFORM_LABELS;

export interface SocialIdentityGroup {
  identity: string;
  platforms: SocialIdentityPlatform[];
}

export function groupSocialIdentities(
  socials: Partial<Record<SocialIdentityPlatform, string | undefined>>,
  includedPlatforms?: readonly SocialIdentityPlatform[],
): SocialIdentityGroup[] {
  const included = includedPlatforms ? new Set(includedPlatforms) : undefined;
  const grouped = new Map<string, SocialIdentityGroup>();

  for (const [platform, rawIdentity] of Object.entries(socials) as Array<
    [SocialIdentityPlatform, string | undefined]
  >) {
    if (!rawIdentity || (included && !included.has(platform))) continue;
    const identity = extractUsername(rawIdentity)
      .trim()
      .replace(/^@+/, "")
      .slice(0, 40);
    if (!identity) continue;

    const key = identity.toLocaleLowerCase("en-US");
    const group = grouped.get(key) || { identity, platforms: [] };
    group.platforms.push(platform);
    grouped.set(key, group);
  }

  return [...grouped.values()];
}
