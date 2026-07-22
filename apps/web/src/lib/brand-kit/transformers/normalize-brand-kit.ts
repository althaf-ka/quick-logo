import type {
  NormalizedBrandKit,
  DeliverablesConfig,
  TypographyPreference,
} from "../../../types/brand-kit";
import { mapDeliverables } from "./map-deliverables";

import type { InferResponseType } from "@quicklogo/api-client";
import { api } from "@/lib/api";
import {
  brandKitDeliverablesSchema,
  isBrandKitRefinementSection,
  type BusinessCardBrief,
  type SocialMediaBrief,
} from "@quicklogo/shared";

type BrandKitApiResponse = InferResponseType<
  (typeof api.brandKits)[":id"]["$get"]
>;

export function normalizeBrandKit(
  rawResponse: BrandKitApiResponse,
): NormalizedBrandKit {
  const { activeRefinement, brandKit, revisions } = rawResponse;

  // Find active revision or use fallback
  const activeRevision =
    revisions.find((r) => r.isActive) || revisions[revisions.length - 1];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = (activeRevision?.results || {}) as Record<string, any>;

  // Extract typography preferences
  const typographyPreference: TypographyPreference = {
    mood: brandKit.typographyStyle || "modern-sans",
    locked: false,
    fontPairing: results.typography
      ? {
          heading: results.typography.heading?.family || "",
          body: results.typography.body?.family || "",
        }
      : undefined,
  };

  const requestedDeliverables = brandKitDeliverablesSchema.safeParse(
    brandKit.requestedDeliverables,
  );
  const deliverables: DeliverablesConfig = mapDeliverables(
    results,
    requestedDeliverables.success ? requestedDeliverables.data : undefined,
  );

  return {
    id: brandKit.id,
    brandName: brandKit.brandName || "",
    logoUrl: brandKit.customLogoUrl || results.logoUrl || undefined,
    extractedColors: results.colorPalette
      ? (results.colorPalette as Record<string, string>[]).map((color) =>
          color.hex.toUpperCase(),
        )
      : ((brandKit.extractedColors as string[]) ?? []),
    typographyPreference,
    deliverables,
    status: brandKit.status || "pending",
    errorMessage: brandKit.errorMessage || undefined,
    creditsUsed: brandKit.creditsUsed || 0,
    generationProgress: brandKit.generationProgress || 0,
    generationStage: brandKit.generationStage || "Queued",
    refundedAt: brandKit.refundedAt || undefined,
    activeRefinement:
      activeRefinement &&
      isBrandKitRefinementSection(activeRefinement.sectionId) &&
      (activeRefinement.status === "queued" ||
        activeRefinement.status === "processing")
        ? {
            id: activeRefinement.id,
            sectionId: activeRefinement.sectionId,
            targetItemId: activeRefinement.targetItemId || undefined,
            status: activeRefinement.status,
            creditsUsed: activeRefinement.creditsUsed,
          }
        : undefined,
    industry: brandKit.industry || undefined,
    tagline: brandKit.tagline || undefined,
    targetAudience: brandKit.targetAudience || undefined,
    selectedVibes: (brandKit.selectedVibes as string[]) || undefined,
    brandPersonality: brandKit.brandPersonality || undefined,
    additionalContext: brandKit.additionalContext || undefined,
    socials: (brandKit.socials as Record<string, string>) || undefined,
    contact: (brandKit.contact as Record<string, string>) || undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    guidelines: (brandKit.guidelines as Record<string, any>) || undefined,
    socialMediaBrief:
      (brandKit.socialMediaBrief as SocialMediaBrief | null) || undefined,
    businessCardBrief:
      (brandKit.businessCardBrief as BusinessCardBrief | null) || undefined,
    revisions: revisions.map((r) => ({
      id: r.id,
      isActive: r.isActive,
      revisionNumber: r.revisionNumber,
      label: r.label || `Brand kit version ${r.revisionNumber}`,
      revisionType: r.revisionType,
      sectionId: r.sectionId || undefined,
      targetItemId: r.targetItemId || undefined,
      sourceRevisionId: r.sourceRevisionId || undefined,
      refinementPrompt: r.refinementPrompt || undefined,
      results: r.results as Record<string, unknown>,
      createdAt: r.createdAt
        ? new Date(r.createdAt).toISOString()
        : new Date().toISOString(),
    })),
  };
}
