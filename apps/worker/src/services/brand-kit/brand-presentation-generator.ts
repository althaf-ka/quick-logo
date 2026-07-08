import {
  getModelMapping,
  createProvider,
} from "@quicklogo/ai-providers/providers";
import { buildBrandPresentationGenerationParams } from "@quicklogo/ai-providers/prompt";
import { DEFAULT_BRAND_KIT_MODEL_ID } from "@quicklogo/shared";
import type { StorageProvider } from "@quicklogo/storage";
import type { Env } from "../../types";
import { runAssetOrNull } from "../../core/pipeline-helpers";
import { createLogger } from "@quicklogo/server-telemetry";

const logger = createLogger("worker");

const LOGO_VARIATION_TIMEOUT_MS = 120000;

export async function generateBrandPresentationImage({
  ai,
  env,
  storage,
  brandKitId,
  brandName,
  sourceLogoUrl,
  refinementPrompt,
  headingFont,
  bodyFont,
  productImageUrl,
  brandDescription,
  industry,
  targetAudience,
  selectedVibes,
  brandPersonality,
}: {
  ai: Ai;
  env: Env;
  storage: StorageProvider;
  brandKitId: string;
  brandName: string;
  sourceLogoUrl: string;
  refinementPrompt?: string;
  headingFont?: string;
  bodyFont?: string;
  productImageUrl?: string;
  brandDescription?: string;
  industry?: string;
  targetAudience?: string;
  selectedVibes?: string[];
  brandPersonality?: string;
}): Promise<string | undefined> {
  const mapping = getModelMapping(DEFAULT_BRAND_KIT_MODEL_ID);
  const provider = createProvider(mapping, { ai, env });

  // Returns undefined on failure/timeout so the caller can fall back and record
  // the failure for partial-refund accounting.
  return runAssetOrNull(
    async (signal) => {
      const result = await provider.generate({
        ...buildBrandPresentationGenerationParams({
          brandName,
          backendModel: mapping.backendModel,
          defaultParams: mapping.defaultParams,
          refinementPrompt,
          headingFont,
          bodyFont,
          productImageUrl,
          industry,
          targetAudience,
          selectedVibes,
          brandPersonality,
          fallbackPrompt: brandDescription,
        }),
        signal,
      });
      if (!result.success || !result.imageData) {
        throw new Error(
          result.error ??
            `Variation generation failed for brand-presentation-image`,
        );
      }
      const uploaded = await storage.upload(
        `quick-logo/brand-kits/${brandKitId}/brand-presentation.${result.format ?? "png"}`,
        result.imageData,
        { overwrite: true },
      );
      return uploaded.url;
    },
    LOGO_VARIATION_TIMEOUT_MS,
    "asset-generator",
  );
}
