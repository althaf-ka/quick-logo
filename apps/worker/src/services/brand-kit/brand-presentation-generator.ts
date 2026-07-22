import {
  getModelMapping,
  createProvider,
} from "@quicklogo/ai-providers/providers";
import { buildBrandPresentationGenerationParams } from "@quicklogo/ai-providers/prompt";
import { DEFAULT_BRAND_KIT_MODEL_ID } from "@quicklogo/shared";
import type { StorageProvider } from "@quicklogo/storage";
import type { Env } from "../../types";
import { runAssetOrNull } from "../../core/pipeline-helpers";
import { PipelineError } from "../../core/errors";
import { generateAndUpload, generateAssetWithTimeout } from "./asset-generator";

const BRAND_PRESENTATION_TIMEOUT_MS = 120000;

export async function generateBrandPresentationImage({
  ai,
  env,
  storage,
  brandKitId,
  brandName,
  sourceLogoUrl,
  currentPresentationUrl,
  assetVersionId,
  refinementPrompt,
  headingFont,
  headingWeight,
  bodyFont,
  bodyWeight,
  productImageUrls,
  colors,
  tagline,
  brandDescription,
  industry,
  targetAudience,
  selectedVibes,
  brandPersonality,
  additionalContext,
}: {
  ai: Ai;
  env: Env;
  storage: StorageProvider;
  brandKitId: string;
  brandName: string;
  sourceLogoUrl: string;
  currentPresentationUrl?: string;
  assetVersionId?: string;
  refinementPrompt?: string;
  headingFont?: string;
  headingWeight?: string;
  bodyFont?: string;
  bodyWeight?: string;
  productImageUrls?: string[];
  colors?: string[];
  tagline?: string;
  brandDescription?: string;
  industry?: string;
  targetAudience?: string;
  selectedVibes?: string[];
  brandPersonality?: string;
  additionalContext?: string;
}): Promise<string | undefined> {
  const mapping = getModelMapping(DEFAULT_BRAND_KIT_MODEL_ID);
  const provider = createProvider(mapping, { ai, env });
  const params = buildBrandPresentationGenerationParams({
    brandName,
    sourceLogoUrl,
    currentPresentationUrl,
    backendModel: mapping.backendModel,
    defaultParams: mapping.defaultParams,
    refinementPrompt,
    headingFont,
    headingWeight,
    bodyFont,
    bodyWeight,
    productImageUrls,
    colors,
    tagline,
    industry,
    targetAudience,
    selectedVibes,
    brandPersonality,
    additionalContext,
    fallbackPrompt: brandDescription,
  });
  const uploadPath = assetVersionId
    ? `quick-logo/brand-kits/${brandKitId}/refinements/${assetVersionId}/brand-presentation`
    : `quick-logo/brand-kits/${brandKitId}/brand-presentation`;

  if (assetVersionId) {
    const refinedUrl = await generateAssetWithTimeout({
      provider,
      params,
      storage,
      uploadPath,
      timeoutMs: BRAND_PRESENTATION_TIMEOUT_MS,
      label: "brand-presentation-refinement",
      failFastOnNonRetryable: true,
    });
    if (!refinedUrl) {
      throw new PipelineError(
        "Brand Presentation refinement could not be generated.",
        true,
      );
    }
    return refinedUrl;
  }

  // Returns undefined on failure/timeout so the caller can fall back and record
  // the failure for partial-refund accounting.
  return runAssetOrNull(
    async (signal) => {
      return generateAndUpload(provider, params, storage, uploadPath, signal);
    },
    BRAND_PRESENTATION_TIMEOUT_MS,
    "asset-generator",
  );
}
