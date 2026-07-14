import {
  normalizeBrandContext,
  buildBrandKitGlobalRefinementRequest,
} from "@quicklogo/ai-providers/prompt";
import { buildBrandKitRefinementRequest } from "@quicklogo/ai-providers/prompt";
import { resolveTypographyStyle } from "./typography-resolver";
import { normalizeTypographyOutput } from "./typography-normalizer";
import { runVisionTypographyRequest } from "./vision-analysis";
import { extractWorkersAiResponseText } from "../../core/ai-response-parser";
import {
  brandKitColorPaletteResponseSchema,
  brandKitGlobalRefinementResponseSchema,
} from "@quicklogo/shared";
import {
  generateSocialMediaAssets,
  generateBrandGraphics,
  generateBusinessCardAssets,
  buildSocialMediaAssetList,
  SOCIAL_MEDIA_PIPELINE_VERSION,
} from "./asset-generator";
import { generateBrandPresentationImage } from "./brand-presentation-generator";
import type { StorageProvider } from "@quicklogo/storage";
import type { Env } from "../../types";
import { createLogger } from "@quicklogo/server-telemetry";
import { PipelineError } from "../../core/errors";

const logger = createLogger("worker");

export async function mergeRevisionResults({
  ai,
  env,
  storage,
  brandKitId,
  sectionId,
  refinementPrompt,
  targetItemId,
  currentBrandKit,
  activeRevisionResults,
}: {
  ai: Ai;
  env: Env;
  storage: StorageProvider;
  brandKitId: string;
  sectionId: string;
  refinementPrompt: string;
  targetItemId?: string;
  currentBrandKit: any;
  activeRevisionResults: any;
}) {
  let newMergedJSON = { ...activeRevisionResults };

  const brandAssetContext = normalizeBrandContext(
    currentBrandKit?.brandName || newMergedJSON.brandName || "Brand",
    {
      colors: currentBrandKit?.extractedColors,
      industry: currentBrandKit?.industry,
      tagline:
        currentBrandKit?.tagline || newMergedJSON.brandPresentation?.tagline,
      targetAudience: currentBrandKit?.targetAudience,
      brandPersonality: currentBrandKit?.brandPersonality,
      selectedVibes: currentBrandKit?.selectedVibes,
      additionalContext: currentBrandKit?.additionalContext,
      socials: currentBrandKit?.socials,
      contact: currentBrandKit?.contact,
    },
  );

  if (sectionId === "social-media") {
    const actualLogoUrl =
      currentBrandKit?.customLogoUrl || newMergedJSON.logoVariations?.[0]?.url;
    if (!actualLogoUrl) {
      throw new PipelineError(
        "Cannot refine social media assets without a source logo",
        false,
      );
    }

    const { getSocialAssetTargetId } = await import("@quicklogo/shared");
    let existingTargetAssetUrl: string | undefined;

    if (Array.isArray(newMergedJSON.socialMedia)) {
      if (targetItemId) {
        const targetAsset = newMergedJSON.socialMedia.find(
          (asset: any) => getSocialAssetTargetId(asset) === targetItemId,
        );
        existingTargetAssetUrl = targetAsset?.url;
      }
    }

    const socialMediaUrls = await generateSocialMediaAssets({
      ai,
      env,
      storage,
      brandKitId,
      brandName:
        currentBrandKit?.brandName || newMergedJSON.brandName || "Brand",
      sourceLogoUrl: actualLogoUrl,
      iconOnlyLogoUrl:
        newMergedJSON.logoVariations?.find(
          (variation: any) => variation.id === "icon",
        )?.url ?? actualLogoUrl,
      headingFont: newMergedJSON.typography?.heading?.family,
      bodyFont: newMergedJSON.typography?.body?.family,
      refinementPrompt,
      context: brandAssetContext,
      socialMediaBrief: currentBrandKit?.socialMediaBrief,
      targetItemId,
      existingTargetAssetUrl,
      existingMasterBannerUrl:
        newMergedJSON.socialMediaKit?.masterBackgroundUrl,
      existingApprovedCopy: newMergedJSON.socialMediaKit?.approvedCopy,
      productImageUrls: currentBrandKit?.productImageUrls,
    });

    // Refinement is atomic from the user's perspective. Never charge for and
    // save a no-op revision when one of the requested assets failed.
    if (socialMediaUrls.failed > 0) {
      throw new PipelineError(
        `Failed to refine ${socialMediaUrls.failed} of ${socialMediaUrls.total} social media assets`,
        true,
      );
    }

    if (targetItemId && Array.isArray(newMergedJSON.socialMedia)) {
      newMergedJSON.socialMedia = newMergedJSON.socialMedia.map(
        (asset: any) => {
          if (getSocialAssetTargetId(asset) === targetItemId) {
            let newUrl = asset.url;
            if (
              targetItemId.endsWith("-profile") &&
              socialMediaUrls.socialProfileUrl
            )
              newUrl = socialMediaUrls.socialProfileUrl;
            else if (
              targetItemId === "twitter-header" &&
              socialMediaUrls.twitterBannerUrl
            )
              newUrl = socialMediaUrls.twitterBannerUrl;
            else if (
              targetItemId === "linkedin-header" &&
              socialMediaUrls.linkedinBannerUrl
            )
              newUrl = socialMediaUrls.linkedinBannerUrl;
            else if (
              targetItemId === "facebook-header" &&
              socialMediaUrls.facebookBannerUrl
            )
              newUrl = socialMediaUrls.facebookBannerUrl;
            else if (
              targetItemId === "youtube-channel-art" &&
              socialMediaUrls.youtubeBannerUrl
            )
              newUrl = socialMediaUrls.youtubeBannerUrl;
            return { ...asset, url: newUrl };
          }
          return asset;
        },
      );
      if (socialMediaUrls.approvedCopy) {
        newMergedJSON.socialMediaKit = {
          ...newMergedJSON.socialMediaKit,
          version: SOCIAL_MEDIA_PIPELINE_VERSION,
          masterBackgroundUrl:
            socialMediaUrls.masterBannerUrl ??
            newMergedJSON.socialMediaKit?.masterBackgroundUrl,
          approvedCopy: socialMediaUrls.approvedCopy,
        };
      }
    } else {
      newMergedJSON.socialMedia = buildSocialMediaAssetList(socialMediaUrls);
      newMergedJSON.socialMediaKit = {
        version: SOCIAL_MEDIA_PIPELINE_VERSION,
        brief: currentBrandKit?.socialMediaBrief,
        masterBackgroundUrl: socialMediaUrls.masterBannerUrl,
        approvedCopy: socialMediaUrls.approvedCopy,
      };
    }
  } else if (sectionId === "brand-graphics") {
    const actualLogoUrl =
      currentBrandKit?.customLogoUrl || newMergedJSON.logoVariations?.[0]?.url;
    if (actualLogoUrl) {
      const graphicUrls = await generateBrandGraphics({
        ai,
        env,
        storage,
        brandKitId,
        brandName:
          currentBrandKit?.brandName || newMergedJSON.brandName || "Brand",
        sourceLogoUrl: actualLogoUrl,
        refinementPrompt,
        context: brandAssetContext,
        targetItemId,
      });
      const existing =
        newMergedJSON.brandGraphics ?? newMergedJSON.brandedBackdrops;
      newMergedJSON.brandGraphics = {
        backdropPostUrl:
          graphicUrls.backdropPostUrl ??
          existing?.backdropPostUrl ??
          existing?.feedUrl,
        backdropStoryUrl:
          graphicUrls.backdropStoryUrl ??
          existing?.backdropStoryUrl ??
          existing?.storyUrl,
      };
    }
  } else if (sectionId === "business-card") {
    const actualLogoUrl =
      currentBrandKit?.customLogoUrl || newMergedJSON.logoVariations?.[0]?.url;
    if (actualLogoUrl) {
      const businessCardUrls = await generateBusinessCardAssets({
        ai,
        env,
        storage,
        brandKitId,
        brandName:
          currentBrandKit?.brandName || newMergedJSON.brandName || "Brand",
        sourceLogoUrl: actualLogoUrl,
        refinementPrompt,
        context: brandAssetContext,
        targetItemId,
      });
      newMergedJSON.businessCard = {
        frontUrl:
          businessCardUrls.frontUrl ?? newMergedJSON.businessCard?.frontUrl,
        backUrl:
          businessCardUrls.backUrl ?? newMergedJSON.businessCard?.backUrl,
      };
    }
  } else if (
    sectionId === "typography" &&
    refinementPrompt.startsWith("__FONT_OVERRIDE__")
  ) {
    const [, role, family] = refinementPrompt.split(":");

    if ((role === "heading" || role === "body") && family) {
      newMergedJSON.typography = {
        ...newMergedJSON.typography,
        [role]: {
          ...newMergedJSON.typography?.[role],
          family,
          name: family,
        },
      };
    }
  } else if (
    sectionId === "typography" &&
    refinementPrompt === "__AI_SUGGEST_TYPOGRAPHY__"
  ) {
    const logoUrl =
      newMergedJSON.logoVariations?.[0]?.url || currentBrandKit?.customLogoUrl;

    if (logoUrl) {
      const typographyStyle = currentBrandKit?.typographyStyle ?? "";
      const { key: resolvedStyle, hint: styleHint } =
        resolveTypographyStyle(typographyStyle);

      const visionResponse = await runVisionTypographyRequest({
        ai,
        brandName:
          currentBrandKit?.brandName || newMergedJSON.brandName || "Brand",
        description:
          currentBrandKit?.prompt ||
          newMergedJSON.brandName ||
          "Brand identity",
        typographyStyleHint: styleHint,
        typographyStyleKey: resolvedStyle,
        logoUrl,
      });

      if (visionResponse) {
        const typographyText = extractWorkersAiResponseText(visionResponse);
        try {
          const newTypography = normalizeTypographyOutput(
            JSON.parse(typographyText),
          );
          newMergedJSON.typography = newTypography;
        } catch {
          logger.warn(
            "[revision-merger] AI suggest typography parse failed; keeping current",
          );
        }
      }
    }
  } else if (sectionId === "global") {
    const globalRequest = buildBrandKitGlobalRefinementRequest({
      brandName: newMergedJSON.brandName || "Unknown",
      refinementPrompt,
      currentResults: newMergedJSON,
      industry: currentBrandKit?.industry,
      targetAudience: currentBrandKit?.targetAudience,
      selectedVibes: currentBrandKit?.selectedVibes,
      brandPersonality: currentBrandKit?.brandPersonality,
      hasBrandGuidelines: !!(
        currentBrandKit?.guidelines || newMergedJSON.brandGuidelines
      ),
    });

    const response = await ai.run(
      "@cf/meta/llama-3.1-8b-instruct-fp8",
      globalRequest,
    );

    const responseText = extractWorkersAiResponseText(response);

    try {
      const parsedJson = JSON.parse(responseText);
      if (!parsedJson || typeof parsedJson !== "object") {
        throw new Error("AI response is not a valid JSON object");
      }

      const schema = brandKitGlobalRefinementResponseSchema.shape;
      let appliedGlobalPatch = false;

      if (parsedJson.colorPalette) {
        const validated = schema.colorPalette.safeParse(
          parsedJson.colorPalette,
        );
        if (validated.success && validated.data) {
          newMergedJSON.colorPalette = validated.data;
          appliedGlobalPatch = true;
        } else {
          logger.warn(
            "[revision-merger] Global refine: colorPalette invalid, keeping current",
            { error: !validated.success ? validated.error : null },
          );
        }
      }

      if (parsedJson.brandPresentation) {
        const validated = schema.brandPresentation.safeParse(
          parsedJson.brandPresentation,
        );
        if (validated.success && validated.data) {
          const brandPresentation = validated.data;
          const hasPresentationPatch =
            typeof brandPresentation.tagline === "string" ||
            typeof brandPresentation.description === "string";

          if (hasPresentationPatch) {
            const actualLogoUrl =
              newMergedJSON.logoVariations?.[0]?.url ||
              currentBrandKit?.customLogoUrl;

            const currentTagline = newMergedJSON.brandPresentation?.tagline;
            const currentDescription =
              newMergedJSON.brandPresentation?.description;
            const copyChanged =
              (brandPresentation.tagline &&
                brandPresentation.tagline !== currentTagline) ||
              (brandPresentation.description &&
                brandPresentation.description !== currentDescription);

            let newPresentationUrl =
              newMergedJSON.brandPresentation?.presentationUrl;

            if (copyChanged && actualLogoUrl) {
              try {
                newPresentationUrl =
                  (await generateBrandPresentationImage({
                    ai,
                    env,
                    storage,
                    brandKitId,
                    brandName:
                      currentBrandKit?.brandName ||
                      newMergedJSON.brandName ||
                      "Brand",
                    sourceLogoUrl: actualLogoUrl,
                    refinementPrompt,
                    headingFont: newMergedJSON.typography?.heading?.family,
                    bodyFont: newMergedJSON.typography?.body?.family,
                    productImageUrl:
                      currentBrandKit?.productImageUrls &&
                      currentBrandKit.productImageUrls.length > 0
                        ? currentBrandKit.productImageUrls[0]
                        : undefined,
                    brandDescription:
                      currentBrandKit?.prompt || "Professional brand kit",
                    industry: currentBrandKit?.industry,
                    targetAudience: currentBrandKit?.targetAudience,
                    selectedVibes: currentBrandKit?.selectedVibes,
                    brandPersonality: currentBrandKit?.brandPersonality,
                  })) ?? newPresentationUrl;
              } catch (err) {
                logger.error(
                  "[revision-merger] Global refine: presentation image generation failed",
                  err,
                );
              }
            }

            newMergedJSON.brandPresentation = {
              ...newMergedJSON.brandPresentation,
              ...(brandPresentation.tagline
                ? { tagline: brandPresentation.tagline }
                : {}),
              ...(brandPresentation.description
                ? { description: brandPresentation.description }
                : {}),
              presentationUrl: newPresentationUrl,
            };
            appliedGlobalPatch = true;
          }
        } else {
          logger.warn(
            "[revision-merger] Global refine: brandPresentation invalid, keeping current",
          );
        }
      }

      if (parsedJson.typography) {
        const validated = schema.typography.safeParse(parsedJson.typography);
        if (validated.success && validated.data) {
          newMergedJSON.typography = normalizeTypographyOutput(validated.data);
          appliedGlobalPatch = true;
        } else {
          logger.warn(
            "[revision-merger] Global refine: typography invalid, keeping current",
          );
        }
      }

      if (parsedJson.brandGuidelines) {
        const validated = schema.brandGuidelines.safeParse(
          parsedJson.brandGuidelines,
        );
        if (validated.success && validated.data) {
          const hasGuidelinesPatch = Object.keys(validated.data).length > 0;
          if (hasGuidelinesPatch) {
            newMergedJSON.brandGuidelines = {
              ...newMergedJSON.brandGuidelines,
              ...validated.data,
            };
            appliedGlobalPatch = true;
          }
        } else {
          logger.warn(
            "[revision-merger] Global refine: brandGuidelines invalid, keeping current",
          );
        }
      }

      if (!appliedGlobalPatch) {
        throw new Error("AI returned no valid global refinement fields");
      }
    } catch (e) {
      logger.error(
        "[revision-merger] Failed to process Global Refinement JSON:",
        e,
        { responseText },
      );
      throw new Error(
        e instanceof Error
          ? e.message
          : "AI returned invalid JSON on global refinement",
      );
    }
  } else {
    const refinementRequest = buildBrandKitRefinementRequest({
      brandName: newMergedJSON.brandName || "Unknown",
      sectionId,
      refinementPrompt,
      currentResults: newMergedJSON,
      industry: currentBrandKit?.industry,
      targetAudience: currentBrandKit?.targetAudience,
      selectedVibes: currentBrandKit?.selectedVibes,
      brandPersonality: currentBrandKit?.brandPersonality,
    });

    if (!refinementRequest) {
      logger.info(
        `[revision-merger] Refinement for ${sectionId} is not text-LLM driven yet.`,
      );
      throw new Error(
        `Refinement for section '${sectionId}' is not currently supported`,
      );
    } else {
      const response = await ai.run(
        "@cf/meta/llama-3.1-8b-instruct-fp8",
        refinementRequest.request,
      );

      const responseText = extractWorkersAiResponseText(response);

      try {
        const parsedJson = JSON.parse(responseText);
        if (refinementRequest.sectionKey === "colorPalette") {
          const validated =
            brandKitColorPaletteResponseSchema.safeParse(parsedJson);
          if (validated.success) {
            newMergedJSON.colorPalette = validated.data.colorPalette;
          } else {
            logger.warn(
              "[revision-merger] Color palette refinement validation failed",
              { error: validated.error },
            );
            throw new Error("AI returned invalid color palette schema");
          }
        } else if (refinementRequest.sectionKey === "brandPresentation") {
          if (parsedJson.tagline && parsedJson.description) {
            const actualLogoUrl =
              newMergedJSON.logoVariations?.[0]?.url ||
              currentBrandKit?.customLogoUrl;

            const newPresentationUrl =
              (actualLogoUrl
                ? await generateBrandPresentationImage({
                    ai,
                    env,
                    storage,
                    brandKitId,
                    brandName:
                      currentBrandKit?.brandName ||
                      newMergedJSON.brandName ||
                      "Brand",
                    sourceLogoUrl: actualLogoUrl,
                    refinementPrompt,
                    headingFont: newMergedJSON.typography?.heading?.family,
                    bodyFont: newMergedJSON.typography?.body?.family,
                    productImageUrl:
                      currentBrandKit?.productImageUrls &&
                      currentBrandKit.productImageUrls.length > 0
                        ? currentBrandKit.productImageUrls[0]
                        : undefined,
                    brandDescription:
                      currentBrandKit?.prompt || "Professional brand kit",
                    industry: currentBrandKit?.industry,
                    targetAudience: currentBrandKit?.targetAudience,
                    selectedVibes: currentBrandKit?.selectedVibes,
                    brandPersonality: currentBrandKit?.brandPersonality,
                  })
                : undefined) ??
              newMergedJSON.brandPresentation?.presentationUrl;

            newMergedJSON.brandPresentation = {
              tagline: parsedJson.tagline,
              description: parsedJson.description,
              presentationUrl: newPresentationUrl,
            };
          } else {
            logger.warn(
              "[revision-merger] Brand presentation refinement validation failed: missing tagline or description",
            );
            throw new Error("AI returned invalid brand presentation schema");
          }
        }
      } catch (e) {
        logger.error(
          "[revision-merger] Failed to parse/validate Refinement JSON:",
          e,
          { responseText },
        );
        throw new Error("AI returned invalid JSON on refinement");
      }
    }
  }

  return newMergedJSON;
}
