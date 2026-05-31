import { normalizeBrandContext } from "@quicklogo/ai-providers/prompt";
import { buildBrandKitRefinementRequest } from "@quicklogo/ai-providers/prompt";
import { resolveTypographyStyle } from "./typography-resolver";
import { normalizeTypographyOutput } from "./typography-normalizer";
import { runVisionTypographyRequest } from "./vision-analysis";
import { extractWorkersAiResponseText } from "../../core/ai-response-parser";
import { brandKitColorPaletteResponseSchema } from "@quicklogo/shared";
import {
  generateSocialMediaAssets,
  generateBrandedBackdrops,
  generateBusinessCardAssets,
} from "./asset-generator";
import { generateBrandPresentationImage } from "./brand-presentation-generator";
import type { StorageProvider } from "@quicklogo/storage";
import type { Env } from "../../types";
import { createLogger } from "@quicklogo/server-telemetry";

const logger = createLogger("worker");

export async function mergeRevisionResults({
  ai,
  env,
  storage,
  brandKitId,
  sectionId,
  refinementPrompt,
  currentBrandKit,
  activeRevisionResults,
}: {
  ai: Ai;
  env: Env;
  storage: StorageProvider;
  brandKitId: string;
  sectionId: string;
  refinementPrompt: string;
  currentBrandKit: any;
  activeRevisionResults: any;
}) {
  let newMergedJSON = { ...activeRevisionResults };

  const brandAssetContext = normalizeBrandContext(
    currentBrandKit?.brandName || newMergedJSON.brandName || "Brand",
    {
      industry: currentBrandKit?.industry,
      tagline: currentBrandKit?.tagline || newMergedJSON.brandPresentation?.tagline,
      targetAudience: currentBrandKit?.targetAudience,
      brandPersonality: currentBrandKit?.brandPersonality,
      selectedVibes: currentBrandKit?.selectedVibes,
      additionalContext: currentBrandKit?.additionalContext,
      socials: currentBrandKit?.socials,
      contact: currentBrandKit?.contact,
    }
  );


  if (sectionId === "social-media") {
    const actualLogoUrl =
      currentBrandKit?.customLogoUrl || newMergedJSON.logoVariations?.[0]?.url;
    if (actualLogoUrl) {
      const socialMediaUrls = await generateSocialMediaAssets({
        ai,
        env,
        storage,
        brandKitId,
        brandName:
          currentBrandKit?.brandName || newMergedJSON.brandName || "Brand",
        sourceLogoUrl: actualLogoUrl,
        refinementPrompt,
        context: brandAssetContext,
      });
      newMergedJSON.socialMedia = [
        {
          platform: "Instagram",
          type: "Profile",
          dimensions: "1080x1080",
          url: socialMediaUrls.socialProfileUrl,
        },
        {
          platform: "Twitter",
          type: "Header",
          dimensions: "1500x500",
          url: socialMediaUrls.masterBannerUrl,
        },
        {
          platform: "LinkedIn",
          type: "Header",
          dimensions: "1584x396",
          url: socialMediaUrls.masterBannerUrl,
        },
        {
          platform: "Facebook",
          type: "Header",
          dimensions: "820x360",
          url: socialMediaUrls.facebookBannerUrl,
        },
        {
          platform: "YouTube",
          type: "Channel Art",
          dimensions: "2560x1440",
          url: socialMediaUrls.masterBannerUrl,
        },
      ];
    }
  } else if (sectionId === "branded-backdrops") {
    const actualLogoUrl =
      currentBrandKit?.customLogoUrl || newMergedJSON.logoVariations?.[0]?.url;
    if (actualLogoUrl) {
      const backdropUrls = await generateBrandedBackdrops({
        ai,
        env,
        storage,
        brandKitId,
        brandName:
          currentBrandKit?.brandName || newMergedJSON.brandName || "Brand",
        sourceLogoUrl: actualLogoUrl,
        refinementPrompt,
        context: brandAssetContext,
      });
      newMergedJSON.brandedBackdrops = {
        feedUrl: backdropUrls.feedUrl,
        storyUrl: backdropUrls.storyUrl,
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
      });
      newMergedJSON.businessCard = {
        frontUrl: businessCardUrls.frontUrl,
        backUrl: businessCardUrls.backUrl,
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

            const newPresentationUrl = actualLogoUrl
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
              : newMergedJSON.brandPresentation?.presentationUrl;

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
