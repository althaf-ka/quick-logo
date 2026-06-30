import { zipSync, strToU8 } from "fflate";
import type { BrandKitResultsData } from "../../components/brand-kit/results/brand-kit-results";
import { createIcoFromPng } from "../../utils/image-utils";

/**
 * Helper to fetch an image and return its Uint8Array buffer
 */
async function fetchImageBuffer(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error("Error fetching image for zip:", error);
    return null;
  }
}

/**
 * Helper to fetch and resize an image
 */
async function fetchAndResizeImage(
  url: string,
  size: number,
): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => {
        if (blob) {
          blob.arrayBuffer().then((ab) => resolve(new Uint8Array(ab)));
        } else {
          resolve(null);
        }
      }, "image/png");
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Generate a simple SVG block for a color
 */
function generateColorSwatchSvg(hex: string): string {
  return `<svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${hex}" />
</svg>`;
}

/**
 * Main export function
 */
export async function exportBrandKitToZip(data: BrandKitResultsData) {
  const zipData: Record<string, Uint8Array> = {};

  // 1. Fetch Logos
  if (data.logoVariations && data.logoVariations.length > 0) {
    for (const [index, variation] of data.logoVariations.entries()) {
      if (variation.url) {
        const buffer = await fetchImageBuffer(variation.url);
        if (buffer) {
          let ext = "png";
          try {
            const parts = new URL(variation.url).pathname.split(".");
            if (parts.length > 1) ext = parts.pop() || "png";
          } catch {
            // fallback for invalid URL strings
            const fallbackParts = variation.url.split("?")[0].split(".");
            if (fallbackParts.length > 1) ext = fallbackParts.pop() || "png";
          }
          const filename = `logos/${variation.label.toLowerCase().replace(/\s+/g, "-")}-${index + 1}.${ext}`;
          zipData[filename] = buffer;
        }
      }
    }
  } else if (data.logoUrl) {
    const buffer = await fetchImageBuffer(data.logoUrl);
    if (buffer) {
      zipData["logos/primary-logo.png"] = buffer;
    }
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

  // 5. Fetch other assets (social media, print, favicons, backdrops)
  if (data.socialMedia) {
    for (const asset of data.socialMedia) {
      if (asset.url && !asset.url.includes("placehold.co")) {
        const buffer = await fetchImageBuffer(asset.url);
        if (buffer) {
          const typeName = asset.type
            ? asset.type.toLowerCase().replace(/\s+/g, "-")
            : "header";
          zipData[
            `social-media/${asset.platform.toLowerCase()}-${typeName}.png`
          ] = buffer;
        }
      }
    }
  }

  if (data.favicons) {
    for (const icon of data.favicons) {
      if (icon.url && !icon.url.includes("placehold.co")) {
        const buffer = await fetchAndResizeImage(icon.url, icon.size);
        if (buffer) {
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
        }
      }
    }
  }

  if (data.brandedBackdrops) {
    if (
      data.brandedBackdrops.feedUrl &&
      !data.brandedBackdrops.feedUrl.includes("placehold.co")
    ) {
      const buffer = await fetchImageBuffer(data.brandedBackdrops.feedUrl);
      if (buffer) zipData["backdrops/instagram-feed.png"] = buffer;
    }
    if (
      data.brandedBackdrops.storyUrl &&
      !data.brandedBackdrops.storyUrl.includes("placehold.co")
    ) {
      const buffer = await fetchImageBuffer(data.brandedBackdrops.storyUrl);
      if (buffer) zipData["backdrops/instagram-story.png"] = buffer;
    }
  }

  if (data.businessCard?.frontUrl) {
    const buffer = await fetchImageBuffer(data.businessCard.frontUrl);
    if (buffer) zipData["print/business-card-front.png"] = buffer;
  }
  if (data.businessCard?.backUrl) {
    const buffer = await fetchImageBuffer(data.businessCard.backUrl);
    if (buffer) zipData["print/business-card-back.png"] = buffer;
  }

  // Bundle Zip synchronously (fast enough for small assets)
  const zipped = zipSync(zipData);

  // Trigger download
  const blob = new Blob([zipped], { type: "application/zip" });
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
