import type { ValidatedBrandContext } from "@quicklogo/ai-providers/prompt";
import type { BusinessCardBrief } from "@quicklogo/shared";
import type { StorageProvider } from "@quicklogo/storage";
import QRCode from "qrcode";
import {
  bytesToBase64,
  fetchImageAsDataUrl,
} from "../../core/bounded-image-fetch";

const ASSET_ROOT = "quick-logo/brand-kits";

function vCardEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function buildBusinessCardQrValue(
  brief: BusinessCardBrief,
  context: ValidatedBrandContext,
): string | undefined {
  if (!brief.includeQr) return undefined;
  if (brief.qrTarget === "custom") return brief.customQrValue?.trim();
  if (brief.qrTarget === "website") {
    const website = context.contact.website?.trim();
    if (!website) return undefined;
    return /^https?:\/\//i.test(website) ? website : `https://${website}`;
  }

  const included = new Set(brief.includedContactFields);
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    included.has("name") && context.contact.name
      ? `FN:${vCardEscape(context.contact.name)}`
      : `FN:${vCardEscape(context.brandName)}`,
    `ORG:${vCardEscape(context.brandName)}`,
    included.has("title") && context.contact.title
      ? `TITLE:${vCardEscape(context.contact.title)}`
      : undefined,
    included.has("phone") && context.contact.phone
      ? `TEL;TYPE=WORK:${vCardEscape(context.contact.phone)}`
      : undefined,
    included.has("email") && context.contact.email
      ? `EMAIL;TYPE=WORK:${vCardEscape(context.contact.email)}`
      : undefined,
    included.has("website") && context.contact.website
      ? `URL:${vCardEscape(
          /^https?:\/\//i.test(context.contact.website)
            ? context.contact.website
            : `https://${context.contact.website}`,
        )}`
      : undefined,
    included.has("address") && context.contact.address
      ? `ADR;TYPE=WORK:;;${vCardEscape(context.contact.address)}`
      : undefined,
    "END:VCARD",
  ].filter((line): line is string => Boolean(line));
  return lines.join("\r\n");
}

function outputDimensions(brief: BusinessCardBrief): {
  width: number;
  height: number;
} {
  const landscape =
    brief.format === "us"
      ? { width: 1050, height: 600 }
      : { width: 1004, height: 650 };
  return brief.orientation === "landscape"
    ? landscape
    : { width: landscape.height, height: landscape.width };
}

export async function finalizeBusinessCardAsset({
  storage,
  brandKitId,
  sourceUrl,
  brief,
  context,
  side,
}: {
  storage: StorageProvider;
  brandKitId: string;
  sourceUrl: string;
  brief: BusinessCardBrief;
  context: ValidatedBrandContext;
  side: "front" | "back";
}): Promise<string> {
  const shouldAddQr = side === "back" && brief.includeQr;
  const qrValue = shouldAddQr
    ? buildBusinessCardQrValue(brief, context)
    : undefined;
  if (shouldAddQr && !qrValue) {
    throw new Error("The selected QR destination is unavailable");
  }

  const [backgroundDataUrl, qrSvg] = await Promise.all([
    fetchImageAsDataUrl(sourceUrl),
    qrValue
      ? QRCode.toString(qrValue, {
          type: "svg",
          errorCorrectionLevel: "H",
          margin: 2,
          color: { dark: "#111111", light: "#ffffff" },
        })
      : undefined,
  ]);
  const { width, height } = outputDimensions(brief);
  let qrLayer = "";
  if (qrSvg) {
    const qrDataUrl = `data:image/svg+xml;base64,${bytesToBase64(
      new TextEncoder().encode(qrSvg),
    )}`;
    const qrSize = Math.round(Math.min(width, height) * 0.28);
    const padding = Math.round(qrSize * 0.08);
    const edge = Math.round(Math.min(width, height) * 0.055);
    const panelSize = qrSize + padding * 2;
    const x = width - panelSize - edge;
    const y = height - panelSize - edge;
    const radius = Math.max(8, Math.round(panelSize * 0.06));
    qrLayer = `
  <rect x="${x}" y="${y}" width="${panelSize}" height="${panelSize}" rx="${radius}" fill="#ffffff"/>
  <image href="${qrDataUrl}" x="${x + padding}" y="${y + padding}" width="${qrSize}" height="${qrSize}"/>`;
  }
  const composite = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image href="${backgroundDataUrl}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>${qrLayer}
</svg>`;
  const uploaded = await storage.upload(
    `${ASSET_ROOT}/${brandKitId}/business-card-${side}-print.svg`,
    new TextEncoder().encode(composite),
    { contentType: "image/svg+xml", overwrite: true },
  );
  return uploaded.url;
}
