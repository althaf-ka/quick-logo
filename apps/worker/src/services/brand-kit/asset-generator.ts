import {
  getModelMapping,
  createProvider,
} from "@quicklogo/ai-providers/providers";
import {
  buildLogoVariationGenerationParams,
  buildSocialMediaGenerationParams,
  buildBusinessCardGenerationParams,
} from "@quicklogo/ai-providers/prompt";
import type { StorageProvider } from "@quicklogo/storage";
import type { Env } from "../../types";
import { generateWithFallback } from "../../core/pipeline-helpers";
import { findReusableLogoVariationUrls } from "./reusable-url-finder";
import type { Database } from "@quicklogo/db";

const LOGO_VARIATION_TIMEOUT_MS = 120000;

export async function generateLogoVariations({
  ai,
  db,
  env,
  storage,
  brandKitId,
  brandName,
  sourceLogoUrl,
}: {
  ai: Ai;
  db: Database;
  env: Env;
  storage: StorageProvider;
  brandKitId: string;
  brandName: string;
  sourceLogoUrl: string;
}): Promise<{ darkModeUrl: string; iconOnlyUrl: string }> {
  const reusableUrls = await findReusableLogoVariationUrls({
    db,
    brandKitId,
    sourceLogoUrl,
  });
  if (reusableUrls) {
    console.log(
      `[asset-generator] Reused logo variations for brandKitId=${brandKitId}`,
    );
    return reusableUrls;
  }

  const mapping = getModelMapping("quick-nano-banana");
  const provider = createProvider(mapping, { ai, env });

  const [darkModeUrl, iconOnlyUrl] = await Promise.all([
    generateWithFallback(
      async () => {
        const result = await provider.generate(
          buildLogoVariationGenerationParams({
            variation: "dark-mode",
            brandName,
            sourceLogoUrl,
            backendModel: mapping.backendModel,
            defaultParams: mapping.defaultParams,
          }),
        );
        if (!result.success || !result.imageData) {
          throw new Error(
            result.error ?? `Variation generation failed for logo-dark`,
          );
        }
        const uploaded = await storage.upload(
          `quick-logo/brand-kits/${brandKitId}/logo-dark.${result.format ?? "png"}`,
          result.imageData,
        );
        return uploaded.url;
      },
      sourceLogoUrl,
      LOGO_VARIATION_TIMEOUT_MS,
      "asset-generator",
    ),
    generateWithFallback(
      async () => {
        const result = await provider.generate(
          buildLogoVariationGenerationParams({
            variation: "icon-only",
            brandName,
            sourceLogoUrl,
            backendModel: mapping.backendModel,
            defaultParams: mapping.defaultParams,
          }),
        );
        if (!result.success || !result.imageData) {
          throw new Error(
            result.error ?? `Variation generation failed for logo-icon`,
          );
        }
        const uploaded = await storage.upload(
          `quick-logo/brand-kits/${brandKitId}/logo-icon.${result.format ?? "png"}`,
          result.imageData,
        );
        return uploaded.url;
      },
      sourceLogoUrl,
      LOGO_VARIATION_TIMEOUT_MS,
      "asset-generator",
    ),
  ]);

  return { darkModeUrl, iconOnlyUrl };
}

export async function generateSocialMediaAssets({
  ai,
  env,
  storage,
  brandKitId,
  brandName,
  sourceLogoUrl,
}: {
  ai: Ai;
  env: Env;
  storage: StorageProvider;
  brandKitId: string;
  brandName: string;
  sourceLogoUrl: string;
}): Promise<{ instagramUrl: string; twitterUrl: string }> {
  const mapping = getModelMapping("quick-nano-banana");
  const provider = createProvider(mapping, { ai, env });

  const [instagramUrl, twitterUrl] = await Promise.all([
    generateWithFallback(
      async () => {
        const result = await provider.generate(
          buildSocialMediaGenerationParams({
            variation: "instagram-profile",
            brandName,
            sourceLogoUrl,
            backendModel: mapping.backendModel,
            defaultParams: mapping.defaultParams,
          }),
        );
        if (!result.success || !result.imageData) {
          throw new Error(
            result.error ?? `Variation generation failed for social-instagram`,
          );
        }
        const uploaded = await storage.upload(
          `quick-logo/brand-kits/${brandKitId}/social-instagram.${result.format ?? "png"}`,
          result.imageData,
        );
        return uploaded.url;
      },
      sourceLogoUrl,
      LOGO_VARIATION_TIMEOUT_MS,
      "asset-generator",
    ),
    generateWithFallback(
      async () => {
        const result = await provider.generate(
          buildSocialMediaGenerationParams({
            variation: "twitter-header",
            brandName,
            sourceLogoUrl,
            backendModel: mapping.backendModel,
            defaultParams: mapping.defaultParams,
          }),
        );
        if (!result.success || !result.imageData) {
          throw new Error(
            result.error ?? `Variation generation failed for social-twitter`,
          );
        }
        const uploaded = await storage.upload(
          `quick-logo/brand-kits/${brandKitId}/social-twitter.${result.format ?? "png"}`,
          result.imageData,
        );
        return uploaded.url;
      },
      sourceLogoUrl,
      LOGO_VARIATION_TIMEOUT_MS,
      "asset-generator",
    ),
  ]);

  return { instagramUrl, twitterUrl };
}

export async function generateBusinessCardAssets({
  ai,
  env,
  storage,
  brandKitId,
  brandName,
  sourceLogoUrl,
}: {
  ai: Ai;
  env: Env;
  storage: StorageProvider;
  brandKitId: string;
  brandName: string;
  sourceLogoUrl: string;
}): Promise<{ frontUrl: string; backUrl: string }> {
  const mapping = getModelMapping("quick-nano-banana");
  const provider = createProvider(mapping, { ai, env });

  const [frontUrl, backUrl] = await Promise.all([
    generateWithFallback(
      async () => {
        const result = await provider.generate(
          buildBusinessCardGenerationParams({
            variation: "front",
            brandName,
            sourceLogoUrl,
            backendModel: mapping.backendModel,
            defaultParams: mapping.defaultParams,
          }),
        );
        if (!result.success || !result.imageData) {
          throw new Error(
            result.error ??
              `Variation generation failed for business-card-front`,
          );
        }
        const uploaded = await storage.upload(
          `quick-logo/brand-kits/${brandKitId}/business-card-front.${result.format ?? "png"}`,
          result.imageData,
        );
        return uploaded.url;
      },
      sourceLogoUrl,
      LOGO_VARIATION_TIMEOUT_MS,
      "asset-generator",
    ),
    generateWithFallback(
      async () => {
        const result = await provider.generate(
          buildBusinessCardGenerationParams({
            variation: "back",
            brandName,
            sourceLogoUrl,
            backendModel: mapping.backendModel,
            defaultParams: mapping.defaultParams,
          }),
        );
        if (!result.success || !result.imageData) {
          throw new Error(
            result.error ??
              `Variation generation failed for business-card-back`,
          );
        }
        const uploaded = await storage.upload(
          `quick-logo/brand-kits/${brandKitId}/business-card-back.${result.format ?? "png"}`,
          result.imageData,
        );
        return uploaded.url;
      },
      sourceLogoUrl,
      LOGO_VARIATION_TIMEOUT_MS,
      "asset-generator",
    ),
  ]);

  return { frontUrl, backUrl };
}
