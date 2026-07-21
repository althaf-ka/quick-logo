import { useEffect, useMemo, useState } from "react";
import type { BrandKitResultsData } from "@/components/brand-kit/results/brand-kit-results";
import { createMonochromeLogoPng } from "@/lib/brand-kit/create-monochrome-logo";

interface GeneratedMonochromeLogo {
  sourceUrl: string;
  objectUrl: string;
}

export function useClientLogoVariations(
  results: BrandKitResultsData | null,
): BrandKitResultsData | null {
  const primaryUrl = results?.logoVariations?.find(
    (variation) => variation.id === "primary",
  )?.url;
  const shouldGenerate = Boolean(results?.logoVariations?.length && primaryUrl);
  const [generatedLogo, setGeneratedLogo] =
    useState<GeneratedMonochromeLogo | null>(null);

  useEffect(() => {
    if (!shouldGenerate || !primaryUrl) return;

    let cancelled = false;
    let objectUrl: string | undefined;

    void createMonochromeLogoPng(primaryUrl)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setGeneratedLogo({ sourceUrl: primaryUrl, objectUrl });
      })
      .catch((error: unknown) => {
        console.error("Failed to generate monochrome logo:", error);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [primaryUrl, shouldGenerate]);

  return useMemo(() => {
    if (!results?.logoVariations) return results;

    const variations = results.logoVariations.filter(
      (variation) => variation.id !== "mono",
    );
    if (!primaryUrl || generatedLogo?.sourceUrl !== primaryUrl) {
      return { ...results, logoVariations: variations };
    }

    const iconIndex = variations.findIndex(
      (variation) => variation.id === "icon",
    );
    const insertionIndex = iconIndex === -1 ? variations.length : iconIndex;
    variations.splice(insertionIndex, 0, {
      id: "mono",
      label: "Monochrome",
      background: "light",
      url: generatedLogo.objectUrl,
    });

    return { ...results, logoVariations: variations };
  }, [generatedLogo, primaryUrl, results]);
}
