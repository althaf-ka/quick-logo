import type {
  NormalizedBrandKit,
  DeliverablesConfig,
  TypographyPreference,
} from "../../../types/brand-kit";
import { mapDeliverables } from "./map-deliverables";

export function normalizeBrandKit(rawResponse: {
  brandKit: any;
  revisions: any[];
}): NormalizedBrandKit {
  const { brandKit, revisions } = rawResponse;

  // Find active revision or use fallback
  const activeRevision =
    revisions.find((r) => r.isActive) || revisions[revisions.length - 1];

  const results = activeRevision?.results || {};

  // Extract typography preferences
  const typographyPreference: TypographyPreference = {
    mood: brandKit.typographyStyle || "modern-sans",
    locked: brandKit.typographyLocked || false,
    fontPairing: results.typography
      ? {
          heading: results.typography.heading?.family || "",
          body: results.typography.body?.family || "",
        }
      : undefined,
  };

  // Build deliverables settings
  const deliverables: DeliverablesConfig = mapDeliverables(results);

  return {
    id: brandKit.id,
    brandName: brandKit.brandName || "",
    logoUrl: brandKit.customLogoUrl || results.logoUrl || undefined,
    extractedColors:
      brandKit.extractedColors ||
      results.colorPalette?.map((c: any) => c.hex) ||
      [],
    typographyPreference,
    deliverables,
    status: brandKit.status || "pending",
    revisions: revisions.map((r) => ({
      id: r.id,
      isActive: r.isActive,
      results: r.results as Record<string, unknown>,
      triggerType: r.triggerType,
      createdAt: r.createdAt,
    })),
  };
}
