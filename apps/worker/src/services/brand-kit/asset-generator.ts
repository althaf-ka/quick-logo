import {
  getModelMapping,
  createProvider,
} from "@quicklogo/ai-providers/providers";
import {
  buildLogoVariationGenerationParams,
  buildSocialMediaGenerationParams,
  buildBusinessCardGenerationParams,
  buildBackdropGenerationParams,
} from "@quicklogo/ai-providers/prompt";
import type { StorageProvider } from "@quicklogo/storage";
import type { Env } from "../../types";
import { generateWithFallback } from "../../core/pipeline-helpers";
import { findReusableLogoVariationUrls } from "./reusable-url-finder";
import type { Database } from "@quicklogo/db";
import type { ValidatedBrandContext } from "@quicklogo/ai-providers/prompt";

import { createLogger } from "@quicklogo/server-telemetry";

const logger = createLogger("worker");

const LOGO_VARIATION_TIMEOUT_MS = 120000;

export async function generateLogoVariations({
  ai,
  db,
  env,
  storage,
  brandKitId,
  brandName,
  sourceLogoUrl,
  types,
}: {
  ai: Ai;
  db: Database;
  env: Env;
  storage: StorageProvider;
  brandKitId: string;
  brandName: string;
  sourceLogoUrl: string;
  types?: ("dark-mode" | "icon-only")[];
}): Promise<{ darkModeUrl?: string; iconOnlyUrl?: string }> {
  const reusableUrls = await findReusableLogoVariationUrls({
    db,
    brandKitId,
    sourceLogoUrl,
  });
  if (reusableUrls) {
    logger.info(`Reused logo variations`, { brandKitId });
    return reusableUrls;
  }

  const mapping = getModelMapping("quick-nano-banana");
  const provider = createProvider(mapping, { ai, env });

  const typesToGenerate = types || ["dark-mode", "icon-only"];

  const results = await Promise.all(
    typesToGenerate.map(async (type) => {
      const url = await generateWithFallback(
        async () => {
          const result = await provider.generate(
            buildLogoVariationGenerationParams({
              variation: type,
              brandName,
              sourceLogoUrl,
              backendModel: mapping.backendModel,
              defaultParams: mapping.defaultParams,
            }),
          );
          if (!result.success || !result.imageData) {
            throw new Error(
              result.error ??
                `Variation generation failed for logo-${type === "dark-mode" ? "dark" : "icon"}`,
            );
          }
          const uploaded = await storage.upload(
            `quick-logo/brand-kits/${brandKitId}/logo-${type === "dark-mode" ? "dark" : "icon"}.${result.format ?? "png"}`,
            result.imageData,
          );
          return uploaded.url;
        },
        sourceLogoUrl,
        LOGO_VARIATION_TIMEOUT_MS,
        "asset-generator",
      );
      return { type, url };
    }),
  );

  return {
    darkModeUrl: results.find((r) => r.type === "dark-mode")?.url,
    iconOnlyUrl: results.find((r) => r.type === "icon-only")?.url,
  };
}

export async function generateSocialMediaAssets({
  ai,
  env,
  storage,
  brandKitId,
  brandName,
  sourceLogoUrl,
  refinementPrompt,
  context,
  targetItemId,
}: {
  ai: Ai;
  env: Env;
  storage: StorageProvider;
  brandKitId: string;
  brandName: string;
  sourceLogoUrl: string;
  refinementPrompt?: string;
  context?: ValidatedBrandContext;
  targetItemId?: string;
}): Promise<{
  socialProfileUrl?: string;
  masterBannerUrl?: string;
  facebookBannerUrl?: string;
}> {
  const mapping = getModelMapping("quick-nano-banana");
  const provider = createProvider(mapping, { ai, env });

  let socialProfileUrl: string | undefined;
  let masterBannerUrl: string | undefined;
  let facebookBannerUrl: string | undefined;

  const promises = [];

  const shouldGenerateProfile =
    !targetItemId || targetItemId.endsWith("-profile");
  const shouldGenerateFacebook =
    !targetItemId || targetItemId === "facebook-header";
  const shouldGenerateMaster =
    !targetItemId ||
    ["twitter-header", "linkedin-header", "youtube-channel-art"].includes(
      targetItemId,
    );

  if (shouldGenerateProfile) {
    promises.push(
      generateWithFallback(
        async () => {
          const result = await provider.generate(
            buildSocialMediaGenerationParams({
              variation: "social-profile",
              brandName,
              sourceLogoUrl,
              backendModel: mapping.backendModel,
              defaultParams: mapping.defaultParams,
              refinementPrompt,
              context,
            }),
          );
          if (!result.success || !result.imageData) {
            throw new Error(
              result.error ?? `Variation generation failed for social-profile`,
            );
          }
          const uploaded = await storage.upload(
            `quick-logo/brand-kits/${brandKitId}/social-profile-${Date.now()}.${result.format ?? "png"}`,
            result.imageData,
          );
          return uploaded.url;
        },
        sourceLogoUrl,
        LOGO_VARIATION_TIMEOUT_MS,
        "asset-generator",
      ).then((url) => {
        socialProfileUrl = url;
      }),
    );
  }

  if (shouldGenerateMaster) {
    promises.push(
      generateWithFallback(
        async () => {
          const result = await provider.generate(
            buildSocialMediaGenerationParams({
              variation: "master-banner",
              brandName,
              sourceLogoUrl,
              backendModel: mapping.backendModel,
              defaultParams: mapping.defaultParams,
              refinementPrompt,
              context,
            }),
          );
          if (!result.success || !result.imageData) {
            throw new Error(
              result.error ?? `Variation generation failed for master-banner`,
            );
          }
          const uploaded = await storage.upload(
            `quick-logo/brand-kits/${brandKitId}/social-master-banner-${Date.now()}.${result.format ?? "png"}`,
            result.imageData,
          );
          return uploaded.url;
        },
        sourceLogoUrl,
        LOGO_VARIATION_TIMEOUT_MS,
        "asset-generator",
      ).then((url) => {
        masterBannerUrl = url;
      }),
    );
  }

  if (shouldGenerateFacebook) {
    promises.push(
      generateWithFallback(
        async () => {
          const result = await provider.generate(
            buildSocialMediaGenerationParams({
              variation: "facebook-banner",
              brandName,
              sourceLogoUrl,
              backendModel: mapping.backendModel,
              defaultParams: mapping.defaultParams,
              refinementPrompt,
              context,
            }),
          );
          if (!result.success || !result.imageData) {
            throw new Error(
              result.error ?? `Variation generation failed for facebook-banner`,
            );
          }
          const uploaded = await storage.upload(
            `quick-logo/brand-kits/${brandKitId}/social-facebook-banner-${Date.now()}.${result.format ?? "png"}`,
            result.imageData,
          );
          return uploaded.url;
        },
        sourceLogoUrl,
        LOGO_VARIATION_TIMEOUT_MS,
        "asset-generator",
      ).then((url) => {
        facebookBannerUrl = url;
      }),
    );
  }

  await Promise.all(promises);
  return { socialProfileUrl, masterBannerUrl, facebookBannerUrl };
}

export async function generateBrandedBackdrops({
  ai,
  env,
  storage,
  brandKitId,
  brandName,
  sourceLogoUrl,
  refinementPrompt,
  context,
  targetItemId,
}: {
  ai: Ai;
  env: Env;
  storage: StorageProvider;
  brandKitId: string;
  brandName: string;
  sourceLogoUrl: string;
  refinementPrompt?: string;
  context?: ValidatedBrandContext;
  targetItemId?: string;
}): Promise<{ feedUrl?: string; storyUrl?: string }> {
  const mapping = getModelMapping("quick-nano-banana");
  const provider = createProvider(mapping, { ai, env });

  let feedUrl: string | undefined;
  let storyUrl: string | undefined;

  const promises = [];

  if (!targetItemId || targetItemId === "feed") {
    promises.push(
      generateWithFallback(
        async () => {
          const result = await provider.generate(
            buildBackdropGenerationParams({
              variation: "feed-backdrop",
              brandName,
              sourceLogoUrl,
              backendModel: mapping.backendModel,
              defaultParams: mapping.defaultParams,
              refinementPrompt,
              context,
            }),
          );
          if (!result.success || !result.imageData) {
            throw new Error(
              result.error ?? `Variation generation failed for feed-backdrop`,
            );
          }
          const uploaded = await storage.upload(
            `quick-logo/brand-kits/${brandKitId}/backdrop-feed.${result.format ?? "png"}`,
            result.imageData,
          );
          return uploaded.url;
        },
        sourceLogoUrl,
        LOGO_VARIATION_TIMEOUT_MS,
        "asset-generator",
      ).then((url) => {
        feedUrl = url;
      }),
    );
  }

  if (!targetItemId || targetItemId === "story") {
    promises.push(
      generateWithFallback(
        async () => {
          const result = await provider.generate(
            buildBackdropGenerationParams({
              variation: "story-backdrop",
              brandName,
              sourceLogoUrl,
              backendModel: mapping.backendModel,
              defaultParams: mapping.defaultParams,
              refinementPrompt,
              context,
            }),
          );
          if (!result.success || !result.imageData) {
            throw new Error(
              result.error ?? `Variation generation failed for story-backdrop`,
            );
          }
          const uploaded = await storage.upload(
            `quick-logo/brand-kits/${brandKitId}/backdrop-story.${result.format ?? "png"}`,
            result.imageData,
          );
          return uploaded.url;
        },
        sourceLogoUrl,
        LOGO_VARIATION_TIMEOUT_MS,
        "asset-generator",
      ).then((url) => {
        storyUrl = url;
      }),
    );
  }

  await Promise.all(promises);
  return { feedUrl, storyUrl };
}

export async function generateBusinessCardAssets({
  ai,
  env,
  storage,
  brandKitId,
  brandName,
  sourceLogoUrl,
  refinementPrompt,
  context,
  targetItemId,
}: {
  ai: Ai;
  env: Env;
  storage: StorageProvider;
  brandKitId: string;
  brandName: string;
  sourceLogoUrl: string;
  refinementPrompt?: string;
  context?: ValidatedBrandContext;
  targetItemId?: string;
}): Promise<{ frontUrl?: string; backUrl?: string }> {
  const mapping = getModelMapping("quick-nano-banana");
  const provider = createProvider(mapping, { ai, env });

  let frontUrl: string | undefined;
  let backUrl: string | undefined;

  const promises = [];

  if (!targetItemId || targetItemId === "front") {
    promises.push(
      generateWithFallback(
        async () => {
          const result = await provider.generate(
            buildBusinessCardGenerationParams({
              variation: "front",
              brandName,
              sourceLogoUrl,
              backendModel: mapping.backendModel,
              defaultParams: {
                ...mapping.defaultParams,
                providerOptions: {
                  ...mapping.defaultParams?.providerOptions,
                  styleUUID: "703d6fe5-7f1c-4a9e-8da0-5331f214d5cf",
                },
              },
              refinementPrompt,
              context,
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
      ).then((url) => {
        frontUrl = url;
      }),
    );
  }

  if (!targetItemId || targetItemId === "back") {
    promises.push(
      generateWithFallback(
        async () => {
          const result = await provider.generate(
            buildBusinessCardGenerationParams({
              variation: "back",
              brandName,
              sourceLogoUrl,
              backendModel: mapping.backendModel,
              defaultParams: {
                ...mapping.defaultParams,
                providerOptions: {
                  ...mapping.defaultParams?.providerOptions,
                  styleUUID: "703d6fe5-7f1c-4a9e-8da0-5331f214d5cf",
                },
              },
              refinementPrompt,
              context,
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
      ).then((url) => {
        backUrl = url;
      }),
    );
  }

  await Promise.all(promises);
  return { frontUrl, backUrl };
}
