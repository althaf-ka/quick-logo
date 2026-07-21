import { strToU8, zip } from "fflate";
import type { BrandKitResultsData } from "../../components/brand-kit/results/brand-kit-results";
import { createIcoFromPng } from "../../utils/image-utils";
import { createMonochromeLogoPng } from "../../lib/brand-kit/create-monochrome-logo";
import { renderSquarePng } from "../../lib/image-processing";

interface FetchedAsset {
  bytes: Uint8Array;
  extension: string;
}

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

function isExportableAssetUrl(url: string | undefined): url is string {
  return Boolean(url && !url.includes("placehold.co"));
}

function inferAssetExtension(contentType: string | null, url: string): string {
  const mime = contentType?.split(";", 1)[0]?.trim().toLowerCase();
  if (mime && EXTENSION_BY_CONTENT_TYPE[mime]) {
    return EXTENSION_BY_CONTENT_TYPE[mime];
  }

  try {
    const match = new URL(url).pathname.match(/\.([a-z0-9]+)$/i);
    if (match?.[1]) return match[1].toLowerCase();
  } catch {
    // Use the safe default below for malformed or object URLs.
  }

  return "png";
}

async function fetchAsset(url: string): Promise<FetchedAsset | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      extension: inferAssetExtension(response.headers.get("content-type"), url),
    };
  } catch (error) {
    console.error("Error fetching asset for ZIP:", error);
    return null;
  }
}

async function addRemoteAsset(
  zipData: Record<string, Uint8Array>,
  pathWithoutExtension: string,
  url: string,
): Promise<void> {
  const asset = await fetchAsset(url);
  if (asset) {
    zipData[`${pathWithoutExtension}.${asset.extension}`] = asset.bytes;
  }
}

/**
 * Generate a simple SVG block for a color
 */
function generateColorSwatchSvg(hex: string): string {
  return `<svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${hex}" />
</svg>`;
}

function createZipArchive(
  files: Record<string, Uint8Array>,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    zip(files, (error, archive) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(archive);
    });
  });
}

/**
 * Main export function
 */
export async function exportBrandKitToZip(data: BrandKitResultsData) {
  const zipData: Record<string, Uint8Array> = {};

  // 1. Fetch Logos
  if (data.logoVariations && data.logoVariations.length > 0) {
    const primaryUrl = data.logoVariations.find(
      (variation) => variation.id === "primary",
    )?.url;
    const exportableVariations = data.logoVariations.filter(
      (variation) =>
        variation.id !== "mono" || !primaryUrl || variation.url !== primaryUrl,
    );

    for (const [index, variation] of exportableVariations.entries()) {
      if (isExportableAssetUrl(variation.url)) {
        await addRemoteAsset(
          zipData,
          `logos/${variation.label.toLowerCase().replace(/\s+/g, "-")}-${index + 1}`,
          variation.url,
        );
      }
    }

    const hasMonochrome = exportableVariations.some(
      (variation) => variation.id === "mono",
    );
    if (!hasMonochrome && primaryUrl) {
      const monochromeBlob = await createMonochromeLogoPng(primaryUrl);
      zipData["logos/monochrome.png"] = new Uint8Array(
        await monochromeBlob.arrayBuffer(),
      );
    }
  } else if (data.logoUrl) {
    await addRemoteAsset(zipData, "logos/primary-logo", data.logoUrl);
  }

  // 2. Generate Color Swatches
  let colorsMd = "## Color Palette\n\n";
  for (const [index, color] of data.colorPalette.entries()) {
    const hex = color.hex;
    const name = color.role || `Color ${index + 1}`;
    const safeName = name.toLowerCase().replace(/\s+/g, "-");

    // Add SVG swatch
    const svgStr = generateColorSwatchSvg(hex);
    zipData[`colors/${safeName}.svg`] = strToU8(svgStr);

    colorsMd += `- **${name}**: ${hex}\n`;
  }

  // 3. Generate Typography Info
  let typographyMd = "\n## Typography\n\n";
  if (data.typography?.heading) {
    typographyMd += `- **Heading Font**: ${data.typography.heading.family}\n`;
  }
  if (data.typography?.body) {
    typographyMd += `- **Body Font**: ${data.typography.body.family}\n`;
  }

  // 4. Generate README.md
  const brandName = data.brandName || "Brand Kit";
  const readmeContent = `# ${brandName} - Brand Guidelines\n\nThis archive contains the official brand assets for ${brandName}.\n\n${colorsMd}${typographyMd}`;
  zipData["README.md"] = strToU8(readmeContent);

  if (data.brandGuidelines) {
    const { renderBrandGuidelinesPdf } = await import(
      "../../lib/brand-kit/render-brand-guidelines-pdf"
    );
    const pdfBlob = await renderBrandGuidelinesPdf(data);
    zipData[
      `guidelines/${
        brandName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "brand"
      }-brand-guidelines.pdf`
    ] = new Uint8Array(await pdfBlob.arrayBuffer());
  }

  // 5. Fetch other assets (social media, print, favicons, backdrops)
  if (data.socialMedia) {
    for (const asset of data.socialMedia) {
      if (isExportableAssetUrl(asset.url)) {
        const typeName = asset.type
          ? asset.type.toLowerCase().replace(/\s+/g, "-")
          : "header";
        await addRemoteAsset(
          zipData,
          `social-media/${asset.platform.toLowerCase()}-${typeName}`,
          asset.url,
        );
      }
    }
  }

  if (data.favicons) {
    for (const icon of data.favicons) {
      if (isExportableAssetUrl(icon.url)) {
        try {
          const blob = await renderSquarePng(icon.url, icon.size);
          const buffer = new Uint8Array(await blob.arrayBuffer());
          if (icon.size === 16) {
            zipData[`favicons/favicon-16x16.png`] = buffer;
          } else if (icon.size === 32) {
            zipData[`favicons/favicon-32x32.png`] = buffer;
            zipData[`favicons/favicon.ico`] = createIcoFromPng(buffer, 32, 32);
          } else if (icon.size === 180) {
            zipData[`favicons/apple-touch-icon.png`] = buffer;
          } else if (icon.size === 192) {
            zipData[`favicons/android-chrome-192x192.png`] = buffer;
          } else if (icon.size === 512) {
            zipData[`favicons/android-chrome-512x512.png`] = buffer;
          } else {
            zipData[`favicons/favicon-${icon.size}x${icon.size}.png`] = buffer;
          }
        } catch (error) {
          console.error(`Failed to resize favicon ${icon.size}:`, error);
        }
      }
    }
  }

  if (data.brandGraphics || data.brandedBackdrops) {
    const bg = data.brandGraphics ?? {
      backdropPostUrl: data.brandedBackdrops!.feedUrl,
      backdropStoryUrl: data.brandedBackdrops!.storyUrl,
    };

    if (isExportableAssetUrl(bg.backdropPostUrl)) {
      await addRemoteAsset(
        zipData,
        "brand-graphics/backdrop-post",
        bg.backdropPostUrl,
      );
    }
    if (isExportableAssetUrl(bg.backdropStoryUrl)) {
      await addRemoteAsset(
        zipData,
        "brand-graphics/backdrop-story",
        bg.backdropStoryUrl,
      );
    }
  }

  const presentationUrl = data.brandPresentation?.presentationUrl;
  if (isExportableAssetUrl(presentationUrl)) {
    await addRemoteAsset(
      zipData,
      "presentation/brand-presentation",
      presentationUrl,
    );
  }

  if (isExportableAssetUrl(data.businessCard?.frontUrl)) {
    await addRemoteAsset(
      zipData,
      "print/business-card-front",
      data.businessCard.frontUrl,
    );
  }
  if (isExportableAssetUrl(data.businessCard?.backUrl)) {
    await addRemoteAsset(
      zipData,
      "print/business-card-back",
      data.businessCard.backUrl,
    );
  }

  const zipped = await createZipArchive(zipData);

  // Trigger download
  const archiveBuffer = new ArrayBuffer(zipped.byteLength);
  new Uint8Array(archiveBuffer).set(zipped);
  const blob = new Blob([archiveBuffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeBrandName = brandName.toLowerCase().replace(/\s+/g, "-");
  a.download = `${safeBrandName}-brand-kit.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
