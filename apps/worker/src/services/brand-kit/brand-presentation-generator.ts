import {
  getModelMapping,
  createProvider,
} from "@quicklogo/ai-providers/providers";
import { buildBrandPresentationGenerationParams } from "@quicklogo/ai-providers/prompt";
import type { StorageProvider } from "@quicklogo/storage";
import type { Env } from "../../types";
import { generateWithFallback } from "../../core/pipeline-helpers";
import { analyzeLogoStyle } from "./vision-analysis";
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
}): Promise<string> {
  const mapping = getModelMapping("quick-nano-banana");
  const provider = createProvider(mapping, { ai, env });

  // Get visual description of the logo to feed into the image generator's text prompt
  let logoStyleDescription: string | undefined = undefined;
  if (sourceLogoUrl && brandDescription) {
    try {
      const analysis = await analyzeLogoStyle({
        ai,
        brandName,
        description: brandDescription,
        logoUrl: sourceLogoUrl,
      });
      if (analysis) {
        logoStyleDescription = analysis;
      }
    } catch (err) {
      logger.warn("Failed to analyze logo style, proceeding without it", {
        error: err,
        prefix: "brand-presentation-generator",
      });
    }
  }

  const url = await generateWithFallback(
    async () => {
      const result = await provider.generate(
        buildBrandPresentationGenerationParams({
          brandName,
          backendModel: mapping.backendModel,
          defaultParams: mapping.defaultParams,
          refinementPrompt,
          headingFont,
          bodyFont,
          productImageUrl,
          logoStyleDescription,
          industry,
          targetAudience,
          selectedVibes,
          brandPersonality,
          fallbackPrompt: brandDescription,
        }),
      );
      if (!result.success || !result.imageData) {
        throw new Error(
          result.error ??
            `Variation generation failed for brand-presentation-image`,
        );
      }
      const uploaded = await storage.upload(
        `quick-logo/brand-kits/${brandKitId}/brand-presentation.${result.format ?? "png"}`,
        result.imageData,
      );
      return uploaded.url;
    },
    sourceLogoUrl,
    LOGO_VARIATION_TIMEOUT_MS,
    "asset-generator",
  );

  return url;
}
