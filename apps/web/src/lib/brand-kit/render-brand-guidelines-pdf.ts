import { createElement } from "react";
import type { BrandKitResultsData } from "@/components/brand-kit/results/brand-kit-results";

interface GoogleFontFamily {
  family: string;
  files?: Record<string, string>;
}

interface EmbeddedPdfFonts {
  heading: boolean;
  body: boolean;
}

function normalizeFontWeight(weight: string): number {
  const numericWeight = Number.parseInt(weight, 10);
  if (Number.isFinite(numericWeight)) return numericWeight;
  if (weight.toLowerCase() === "bold") return 700;
  return 400;
}

function selectFontFile(
  files: Record<string, string>,
  requestedWeight: number,
): string | undefined {
  const requestedVariant =
    requestedWeight === 400 ? "regular" : `${requestedWeight}`;
  if (files[requestedVariant]) return files[requestedVariant];

  const candidates = Object.entries(files)
    .filter(([variant]) => variant === "regular" || /^\d+$/.test(variant))
    .map(([variant, url]) => ({
      weight: variant === "regular" ? 400 : Number.parseInt(variant, 10),
      url,
    }))
    .sort(
      (first, second) =>
        Math.abs(first.weight - requestedWeight) -
        Math.abs(second.weight - requestedWeight),
    );

  return candidates[0]?.url;
}

async function loadGoogleFontFamily(
  family: string,
  apiKey: string,
): Promise<GoogleFontFamily | null> {
  const url = new URL("https://www.googleapis.com/webfonts/v1/webfonts");
  url.searchParams.set("family", family);
  url.searchParams.set("key", apiKey);
  const response = await fetch(url);
  if (!response.ok) return null;
  const payload = (await response.json()) as { items?: GoogleFontFamily[] };
  return payload.items?.find((item) => item.family === family) || null;
}

async function registerBrandFonts(
  data: BrandKitResultsData,
  Font: (typeof import("@react-pdf/renderer"))["Font"],
): Promise<EmbeddedPdfFonts> {
  const apiKey = import.meta.env.VITE_GOOGLE_FONTS_API_KEY?.trim();
  if (!apiKey) return { heading: false, body: false };

  const requests = [
    { role: "heading" as const, font: data.typography.heading },
    { role: "body" as const, font: data.typography.body },
  ];
  const registrations = await Promise.all(
    requests.map(async ({ role, font }) => {
      try {
        const metadata = await loadGoogleFontFamily(font.family, apiKey);
        if (!metadata?.files) return { role, registered: false };
        const weight = normalizeFontWeight(font.weight);
        const source = selectFontFile(metadata.files, weight);
        if (!source) return { role, registered: false };
        Font.register({
          family: font.family,
          src: source.replace(/^http:/, "https:"),
          fontWeight: weight,
        });
        return { role, registered: true };
      } catch {
        return { role, registered: false };
      }
    }),
  );

  return {
    heading: registrations.some(
      ({ role, registered }) => role === "heading" && registered,
    ),
    body: registrations.some(
      ({ role, registered }) => role === "body" && registered,
    ),
  };
}

export async function renderBrandGuidelinesPdf(
  data: BrandKitResultsData,
): Promise<Blob> {
  const [{ pdf, Font }, { BrandGuidelinesPDF }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/brand-kit/export/brand-guidelines-pdf"),
  ]);
  const embeddedFonts = await registerBrandFonts(data, Font);

  const render = (fonts: EmbeddedPdfFonts) => {
    const renderer = pdf();
    renderer.updateContainer(
      createElement(BrandGuidelinesPDF, { data, embeddedFonts: fonts }),
    );
    return renderer.toBlob();
  };

  try {
    return await render(embeddedFonts);
  } catch (error) {
    if (!embeddedFonts.heading && !embeddedFonts.body) throw error;
    return render({ heading: false, body: false });
  }
}
