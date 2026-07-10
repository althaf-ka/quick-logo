import type { SocialMediaBrief } from "@quicklogo/shared";
import type { StorageProvider } from "@quicklogo/storage";
import { fetchImageAsDataUrl } from "../../core/bounded-image-fetch";

const MAX_REMOTE_ASSET_BYTES = 12 * 1024 * 1024;

interface BannerCompositionSpec {
  key:
    | "twitterBannerUrl"
    | "linkedinBannerUrl"
    | "facebookBannerUrl"
    | "youtubeBannerUrl";
  path: string;
  width: number;
  height: number;
  contentX: number;
  contentWidth: number;
}

const BANNER_SPECS: readonly BannerCompositionSpec[] = [
  {
    key: "twitterBannerUrl",
    path: "twitter-banner",
    width: 1500,
    height: 500,
    contentX: 720,
    contentWidth: 650,
  },
  {
    key: "linkedinBannerUrl",
    path: "linkedin-banner",
    width: 1584,
    height: 396,
    contentX: 790,
    contentWidth: 680,
  },
  {
    key: "facebookBannerUrl",
    path: "facebook-banner",
    width: 820,
    height: 312,
    contentX: 370,
    contentWidth: 390,
  },
  {
    key: "youtubeBannerUrl",
    path: "youtube-banner",
    width: 2560,
    height: 1440,
    contentX: 1050,
    contentWidth: 700,
  },
] as const;

const xmlEscape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

function imageKitPngUrl(sourceUrl: string): string {
  const url = new URL(sourceUrl);
  const existing = url.searchParams.get("tr");
  url.searchParams.set(
    "tr",
    existing ? `${existing},f-png,q-95` : "f-png,q-95",
  );
  return url.toString();
}

function buildBannerSvg({
  spec,
  backgroundDataUrl,
  logoDataUrl,
  brief,
  message,
  headingFont,
}: {
  spec: BannerCompositionSpec;
  backgroundDataUrl: string;
  logoDataUrl: string;
  brief: SocialMediaBrief;
  message?: string;
  headingFont: string;
}): string {
  const compact = spec.height < 400;
  const isYouTube = spec.key === "youtubeBannerUrl";
  const logoHeight = isYouTube
    ? spec.height * 0.11
    : compact
      ? spec.height * 0.22
      : spec.height * 0.14;
  const logoY = spec.height * (compact ? 0.27 : 0.39);
  const messageY =
    logoY + logoHeight + spec.height * (isYouTube ? 0.065 : 0.09);
  const messageSize = Math.round(
    spec.height * (compact ? 0.075 : isYouTube ? 0.032 : 0.042),
  );
  const ctaSize = Math.round(messageSize * 0.55);
  const gradientStart = Math.round(spec.width * 0.34);
  const maxCharsPerLine = Math.max(
    16,
    Math.floor(spec.contentWidth / (messageSize * 0.55)),
  );
  const messageLines = message ? wrapText(message, maxCharsPerLine, 2) : [];
  const messageMarkup = messageLines
    .map(
      (line, index) =>
        `<tspan x="${spec.contentX + spec.contentWidth}" dy="${index === 0 ? 0 : messageSize * 1.15}">${xmlEscape(line)}</tspan>`,
    )
    .join("");
  const ctaY = messageY + Math.max(1, messageLines.length) * messageSize * 1.45;
  const safeFont = xmlEscape(headingFont);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${spec.height}" viewBox="0 0 ${spec.width} ${spec.height}">
  <defs>
    <linearGradient id="scrim" x1="0" x2="1">
      <stop offset="0" stop-color="#05070b" stop-opacity="0"/>
      <stop offset="0.55" stop-color="#05070b" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#05070b" stop-opacity="0.78"/>
    </linearGradient>
  </defs>
  <image href="${backgroundDataUrl}" width="${spec.width}" height="${spec.height}" preserveAspectRatio="xMidYMid slice"/>
  <rect x="${gradientStart}" width="${spec.width - gradientStart}" height="${spec.height}" fill="url(#scrim)"/>
  ${brief.includeLogo ? `<image href="${logoDataUrl}" x="${spec.contentX}" y="${logoY}" width="${spec.contentWidth}" height="${logoHeight}" preserveAspectRatio="xMaxYMid meet"/>` : ""}
  ${brief.includeTagline && messageMarkup ? `<text x="${spec.contentX + spec.contentWidth}" y="${messageY}" text-anchor="end" fill="#fff" font-family="${safeFont},Inter,Arial,sans-serif" font-size="${messageSize}" font-weight="600" letter-spacing="${Math.max(0.2, messageSize * -0.012)}">${messageMarkup}</text>` : ""}
  ${brief.callToAction ? `<text x="${spec.contentX + spec.contentWidth}" y="${ctaY}" text-anchor="end" fill="#fff" fill-opacity="0.72" font-family="${safeFont},Inter,Arial,sans-serif" font-size="${ctaSize}" font-weight="600" letter-spacing="${ctaSize * 0.08}">${xmlEscape(brief.callToAction.toUpperCase())}</text>` : ""}
</svg>`;
}

function wrapText(
  value: string,
  maxCharsPerLine: number,
  maxLines: number,
): string[] {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  for (const word of words) {
    const current = lines.at(-1);
    if (!current) {
      lines.push(word);
    } else if (`${current} ${word}`.length <= maxCharsPerLine) {
      lines[lines.length - 1] = `${current} ${word}`;
    } else if (lines.length < maxLines) {
      lines.push(word);
    } else {
      const available = Math.max(1, maxCharsPerLine - current.length - 2);
      lines[lines.length - 1] = `${current} ${word.slice(0, available)}…`;
      break;
    }
  }
  return lines.slice(0, maxLines);
}

function buildProfileSvg({
  logoDataUrl,
  backgroundColor,
}: {
  logoDataUrl: string;
  backgroundColor: string;
}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <image href="${logoDataUrl}" x="174" y="174" width="676" height="676" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
}

export interface ComposedSocialAssets {
  socialProfileUrl: string;
  twitterBannerUrl: string;
  linkedinBannerUrl: string;
  facebookBannerUrl: string;
  youtubeBannerUrl: string;
}

export async function composeSocialMediaAssets({
  storage,
  brandKitId,
  backgroundUrl,
  logoUrl,
  backgroundColor,
  message,
  brief,
  headingFont = "Inter",
}: {
  storage: StorageProvider;
  brandKitId: string;
  backgroundUrl: string;
  logoUrl: string;
  backgroundColor: string;
  message?: string;
  brief: SocialMediaBrief;
  headingFont?: string;
}): Promise<ComposedSocialAssets> {
  const [backgroundDataUrl, logoDataUrl] = await Promise.all([
    fetchImageAsDataUrl(backgroundUrl, MAX_REMOTE_ASSET_BYTES),
    fetchImageAsDataUrl(logoUrl, MAX_REMOTE_ASSET_BYTES),
  ]);
  const encoder = new TextEncoder();

  const bannerEntries: Array<readonly [BannerCompositionSpec["key"], string]> =
    [];
  // Compose sequentially so only one large encoded SVG exists at a time. The
  // embedded 2K background is reused, and parallel encoding can exceed a
  // Worker's memory ceiling even though the uploads are individually small.
  for (const spec of BANNER_SPECS) {
    const svg = buildBannerSvg({
      spec,
      backgroundDataUrl,
      logoDataUrl,
      brief,
      message,
      headingFont,
    });
    const uploaded = await storage.upload(
      `quick-logo/brand-kits/${brandKitId}/social-${spec.path}.svg`,
      encoder.encode(svg),
      { overwrite: true },
    );
    bannerEntries.push([spec.key, imageKitPngUrl(uploaded.url)] as const);
  }

  const profileSvg = buildProfileSvg({ logoDataUrl, backgroundColor });
  const profile = await storage.upload(
    `quick-logo/brand-kits/${brandKitId}/social-profile.svg`,
    encoder.encode(profileSvg),
    { overwrite: true },
  );

  return {
    socialProfileUrl: imageKitPngUrl(profile.url),
    ...(Object.fromEntries(bannerEntries) as Omit<
      ComposedSocialAssets,
      "socialProfileUrl"
    >),
  };
}
