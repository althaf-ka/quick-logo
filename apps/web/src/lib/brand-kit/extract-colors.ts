/**
 * Client-side dominant-color extraction powered by ColorThief v3.
 * Extracts brand colors from logo images and returns hex strings
 * for the AI color-palette pipeline.
 */

import { getPalette } from "colorthief";

const DEFAULT_COLOR_COUNT = 5;
const QUALITY = 5;
const MAX_LIGHTNESS = 0.92;
const DARK_LIGHTNESS_CUTOFF = 0.3;
const MIN_SATURATION = 0.05;
const DEDUP_DISTANCE = 30;

/** Extract dominant colors from a remote image URL. */
export async function extractColorsFromUrl(
  imageUrl: string,
  colorCount = DEFAULT_COLOR_COUNT,
): Promise<string[]> {
  try {
    const image = await loadImage(imageUrl, true);
    return await extract(image, colorCount);
  } catch (error) {
    console.warn(
      "Color extraction failed (likely CORS or tainted canvas):",
      error,
    );
    return [];
  }
}

/** Extract dominant colors from a local File (e.g. file input). */
export async function extractColorsFromFile(
  file: File,
  colorCount = DEFAULT_COLOR_COUNT,
): Promise<string[]> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl, false);
    return await extract(image, colorCount);
  } catch {
    return [];
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(
  src: string,
  isAnonymous: boolean,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (isAnonymous) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("Failed to load image for color extraction"));
    img.src = src;
  });
}

/**
 * Request extra colors for headroom, filter background noise,
 * then deduplicate perceptually similar results.
 */
async function extract(
  image: HTMLImageElement,
  count: number,
): Promise<string[]> {
  const rawPalette = await getPalette(image, {
    colorCount: count + 4,
    quality: QUALITY,
    ignoreWhite: true,
  });

  if (!rawPalette || rawPalette.length === 0) return [];

  const filtered = rawPalette.filter((color) => {
    const { s, l } = color.hsl();
    const sNorm = s / 100;
    const lNorm = l / 100;

    if (lNorm > MAX_LIGHTNESS) return false;

    // Only apply saturation filter to lighter colors — dark unsaturated
    // colors (black, charcoal) are valid brand colors.
    if (lNorm > DARK_LIGHTNESS_CUTOFF && sNorm < MIN_SATURATION) return false;

    return true;
  });

  const source = filtered.length > 0 ? filtered : rawPalette;
  return deduplicateColors(
    source.map((c) => c.hex()),
    count,
  );
}

function deduplicateColors(hexColors: string[], maxCount: number): string[] {
  const result: string[] = [];

  for (const hex of hexColors) {
    if (result.length >= maxCount) break;

    const isTooClose = result.some(
      (existing) => colorDistance(existing, hex) < DEDUP_DISTANCE,
    );

    if (!isTooClose) {
      result.push(hex);
    }
  }

  return result;
}

function colorDistance(hexA: string, hexB: string): number {
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);

  const dr = ((a >> 16) & 0xff) - ((b >> 16) & 0xff);
  const dg = ((a >> 8) & 0xff) - ((b >> 8) & 0xff);
  const db = (a & 0xff) - (b & 0xff);

  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}
