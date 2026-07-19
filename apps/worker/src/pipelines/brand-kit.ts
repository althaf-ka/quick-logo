import type { Database } from "@quicklogo/db";

import { derivePalette } from "@quicklogo/ai-providers/prompt";
import type { StorageProvider } from "@quicklogo/storage";
import type {
  GenerateBrandKitMessage,
  RefineBrandKitMessage,
} from "@quicklogo/shared";
import type { Env } from "../types";
import { normalizeBrandContext } from "@quicklogo/ai-providers/prompt";
import {
  describeWorkersAiResponseShape,
  extractWorkersAiResponseJson,
  extractWorkersAiResponseText,
} from "../core/ai-response-parser";
import { withRetry } from "../core/pipeline-helpers";
import { createLogger } from "@quicklogo/server-telemetry";
import { resolveTypographyStyle } from "../services/brand-kit/typography-resolver";
import {
  tryNormalizeTypographyOutput,
  getFallbackTypography,
} from "../services/brand-kit/typography-normalizer";
import {
  runTypographySelectionRequest,
  TYPOGRAPHY_MODEL,
} from "../services/brand-kit/typography-selection";
import { mergeRevisionResults } from "../services/brand-kit/revision-merger";
import {
  generateLogoVariations,
  generateSocialMediaAssets,
  generateBusinessCardAssets,
  generateBrandGraphics,
  buildSocialMediaAssetList,
  SOCIAL_MEDIA_ASSET_COUNT,
  SOCIAL_MEDIA_PIPELINE_VERSION,
  BUSINESS_CARD_PIPELINE_VERSION,
} from "../services/brand-kit/asset-generator";
import { generateBrandPresentationImage } from "../services/brand-kit/brand-presentation-generator";
import {
  BRAND_PRESENTATION_COPY_MODEL,
  generateBrandPresentationDescription,
} from "../services/brand-kit/brand-presentation-copy";
import { BrandKitRepository } from "../services/brand-kit/brand-kit-repository";
import {
  FAVICON_SIZES,
  BRAND_KIT_SECTION_COSTS,
  DEFAULT_BUSINESS_CARD_BRIEF,
  computeSectionRefund,
} from "@quicklogo/shared";
import { refundCreditsOnce } from "../services/image/image-repository";
import { PipelineError } from "../core/errors";

export class BrandKitPipeline {
  private repository: BrandKitRepository;
  private logger: ReturnType<typeof createLogger>;

  constructor(
    private ai: Ai,
    private db: Database,
    private storage: StorageProvider,
    private env: Env,
  ) {
    this.repository = new BrandKitRepository(this.db);
    this.logger = createLogger("worker", { db: this.db });
  }

  async processGeneration(message: GenerateBrandKitMessage) {
    const {
      brandKitId,
      prompt,
      brandName,
      extractedColors,
      typographyStyle,
      deliverables,
      productImageUrls,
      industry,
      tagline,
      targetAudience,
      selectedVibes,
      brandPersonality,
      additionalContext,
      socials,
      contact,
      socialMediaBrief,
      businessCardBrief,
    } = message;

    const brandAssetContext = normalizeBrandContext(brandName || "", {
      colors: extractedColors,
      industry,
      tagline,
      targetAudience,
      selectedVibes,
      brandPersonality,
      additionalContext,
      socials,
      contact,
    });

    this.logger.info(`Starting brand kit pipeline`, { brandKitId });

    // Idempotency guard: a redelivered queue message must not regenerate a kit
    // that already finished (which would duplicate revisions and re-refund).
    const existingKit = await this.repository.getBrandKit(brandKitId);
    if (existingKit?.status === "completed") {
      this.logger.info("Brand kit already completed; skipping regeneration", {
        brandKitId,
      });
      return;
    }
    const socialMasterCheckpoint = deliverables?.socialMedia
      ? await this.repository.getSocialMasterCheckpoint(brandKitId)
      : undefined;

    // Accumulates per-section refunds for assets that fell back (issue #3).
    let refundCredits = 0;
    const failedSections: string[] = [];
    const accountFailure = (
      section: keyof typeof BRAND_KIT_SECTION_COSTS,
      failed: number,
      total: number,
    ) => {
      const refund = computeSectionRefund(
        BRAND_KIT_SECTION_COSTS[section],
        failed,
        total,
      );
      if (refund > 0) {
        refundCredits += refund;
        failedSections.push(section);
      }
    };

    await this.repository.updateStatus(brandKitId, "processing");
    await this.repository.updateProgress(
      brandKitId,
      5,
      "Preparing brand assets",
    );

    try {
      let actualLogoUrl = message.customLogoUrl;

      if (!actualLogoUrl && message.sourceImageId) {
        const sourceImageUrl = await this.repository.getSourceImageUrl(
          message.sourceImageId,
        );
        if (sourceImageUrl) {
          actualLogoUrl = sourceImageUrl;
        }
      }

      if (!actualLogoUrl) {
        throw new PipelineError(
          "The source logo is missing or no longer accessible",
          false,
        );
      }

      const colorOutput = {
        colorPalette: derivePalette(extractedColors || []),
      };

      await this.repository.updateProgress(
        brandKitId,
        15,
        "Selecting brand typography",
      );

      // Typography is a core brand-kit decision. Run it independently of the
      // optional social-media deliverable so every kit gets a font pairing.
      const { key: resolvedStyle, hint: styleHint } =
        resolveTypographyStyle(typographyStyle);

      const typographyResponse = await runTypographySelectionRequest({
        ai: this.ai,
        brandName,
        description: prompt,
        typographyStyleHint: styleHint,
        typographyStyleKey: resolvedStyle,
        industry,
        tagline,
        targetAudience,
        selectedVibes,
        brandPersonality,
      });

      let typographyOutput = getFallbackTypography(resolvedStyle);
      if (typographyResponse) {
        const typographyText = extractWorkersAiResponseText(typographyResponse);
        const typographyJson = extractWorkersAiResponseJson(typographyResponse);
        const normalizedTypography =
          tryNormalizeTypographyOutput(typographyJson);

        if (normalizedTypography) {
          typographyOutput = normalizedTypography;
          this.logger.info("Created brand typography selection", {
            brandKitId,
            model: TYPOGRAPHY_MODEL,
            headingFont: normalizedTypography.heading.family,
            bodyFont: normalizedTypography.body.family,
          });
        } else {
          this.logger.warn(
            "[brand-kit-pipeline] Typography response was unusable; using fallback",
            {
              brandKitId,
              reason:
                typographyJson === null ? "missing-json" : "invalid-schema",
              responseShape: describeWorkersAiResponseShape(typographyResponse),
              responseTextLength: typographyText.length,
            },
          );
        }
      }

      const fallbackLogoUrl = actualLogoUrl;

      let brandPresentationOutput = null;
      await this.repository.updateProgress(
        brandKitId,
        25,
        "Building the brand system",
      );
      if (deliverables?.brandPresentation) {
        const generatedDescription = await generateBrandPresentationDescription(
          {
            ai: this.ai,
            brandName,
            description: prompt,
            industry: message.industry,
            targetAudience: message.targetAudience,
            selectedVibes: message.selectedVibes,
            brandPersonality: message.brandPersonality,
          },
        );
        const presentationTagline = tagline?.trim() || "";
        const presentationDescription =
          generatedDescription || additionalContext?.trim() || prompt;

        this.logger.info("Created brand presentation copy", {
          brandKitId,
          model: BRAND_PRESENTATION_COPY_MODEL,
          hasUserTagline: Boolean(presentationTagline),
          usedGeneratedDescription: Boolean(generatedDescription),
        });

        const presentationUrl = actualLogoUrl
          ? await generateBrandPresentationImage({
              ai: this.ai,
              env: this.env,
              storage: this.storage,
              brandKitId,
              brandName,
              sourceLogoUrl: actualLogoUrl,
              headingFont: typographyOutput.heading.family,
              headingWeight: typographyOutput.heading.weight,
              bodyFont: typographyOutput.body.family,
              bodyWeight: typographyOutput.body.weight,
              productImageUrls,
              colors: extractedColors,
              tagline: presentationTagline,
              brandDescription: prompt,
              industry: message.industry,
              targetAudience: message.targetAudience,
              selectedVibes: message.selectedVibes,
              brandPersonality: message.brandPersonality,
              additionalContext,
            })
          : undefined;

        accountFailure("brandPresentation", presentationUrl ? 0 : 1, 1);

        const presentationImageUrl =
          presentationUrl ??
          "https://placehold.co/1536x1024/000/FFF?text=Brand+Presentation";

        brandPresentationOutput = {
          tagline: presentationTagline,
          description: presentationDescription,
          presentationUrl: presentationImageUrl,
        };
      }

      const finalResultsJSON: Record<string, any> = {
        brandName,
        colorPalette: colorOutput.colorPalette || [],
        typography: typographyOutput,
        deliverables: deliverables,
        ...(brandPresentationOutput && {
          brandPresentation: brandPresentationOutput,
        }),
      };

      if (deliverables?.brandGuidelines) {
        finalResultsJSON.brandGuidelines = {
          brandName,
          missionStatement: brandPresentationOutput?.description || prompt,
          tagline: brandPresentationOutput?.tagline || message.tagline || "",
          personality: message.brandPersonality || "",
          targetAudience: message.targetAudience || "",
          selectedVibes: message.selectedVibes || [],
          industry: message.industry || "",
          colors:
            colorOutput.colorPalette?.map((c) => ({
              role: c.role,
              hex: c.hex,
            })) || [],
          typography: {
            heading: typographyOutput.heading.family,
            body: typographyOutput.body.family,
          },
          additionalContext: message.additionalContext || "",
          socials: message.socials || {},
          contact: message.contact || {},
          rules: message.guidelines || {},
        };
      }

      let darkAndIconUrls: {
        darkModeUrl?: string;
        iconOnlyUrl?: string;
      } | null = null;
      if (deliverables?.logoVariations || deliverables?.favicon) {
        await this.repository.updateProgress(
          brandKitId,
          38,
          "Generating logo variations",
        );
        darkAndIconUrls = actualLogoUrl
          ? await generateLogoVariations({
              ai: this.ai,
              db: this.db,
              env: this.env,
              storage: this.storage,
              brandKitId,
              brandName,
              sourceLogoUrl: actualLogoUrl,
              types: deliverables?.logoVariations
                ? ["dark-mode", "icon-only"]
                : ["icon-only"],
            })
          : null;
      }

      // Refund accounting for logo/favicon (both derive from darkAndIconUrls).
      if (deliverables?.logoVariations) {
        const failed = actualLogoUrl
          ? (darkAndIconUrls?.darkModeUrl ? 0 : 1) +
            (darkAndIconUrls?.iconOnlyUrl ? 0 : 1)
          : 2;
        accountFailure("logoVariations", failed, 2);
      }
      if (deliverables?.favicon) {
        const failed = actualLogoUrl && darkAndIconUrls?.iconOnlyUrl ? 0 : 1;
        accountFailure("favicon", failed, 1);
      }

      if (deliverables?.logoVariations) {
        finalResultsJSON.logoVariations = [
          {
            id: "primary",
            label: "Primary",
            background: "light",
            url: fallbackLogoUrl,
          },
          {
            id: "dark",
            label: "On Dark",
            background: "dark",
            url: darkAndIconUrls?.darkModeUrl ?? fallbackLogoUrl,
          },
          {
            id: "mono",
            label: "Monochrome",
            background: "light",
            url: fallbackLogoUrl,
          },
          {
            id: "icon",
            label: "Icon Only",
            background: "transparent",
            url: darkAndIconUrls?.iconOnlyUrl ?? fallbackLogoUrl,
          },
        ];
      }

      if (deliverables?.socialMedia) {
        await this.repository.updateProgress(
          brandKitId,
          52,
          "Generating social profile assets",
        );
        const socialMediaUrls = actualLogoUrl
          ? await generateSocialMediaAssets({
              ai: this.ai,
              env: this.env,
              storage: this.storage,
              brandKitId,
              brandName,
              sourceLogoUrl: actualLogoUrl,
              iconOnlyLogoUrl: darkAndIconUrls?.iconOnlyUrl ?? actualLogoUrl,
              headingFont: typographyOutput.heading.family,
              bodyFont: typographyOutput.body.family,
              context: brandAssetContext,
              socialMediaBrief,
              productImageUrls,
              existingMasterBannerUrl: socialMasterCheckpoint?.url,
              existingApprovedCopy: socialMasterCheckpoint?.approvedCopy,
              onMasterGenerated: async (url, approvedCopy) => {
                try {
                  await withRetry(() =>
                    this.repository.saveSocialMasterCheckpoint(brandKitId, {
                      url,
                      approvedCopy,
                      pipelineVersion: SOCIAL_MEDIA_PIPELINE_VERSION,
                    }),
                  );
                } catch (error) {
                  this.logger.error(
                    "Failed to save social master checkpoint",
                    error,
                    { brandKitId },
                  );
                  throw new PipelineError(
                    "The social master was generated but could not be saved safely",
                    false,
                  );
                }
                this.logger.info("Saved social master checkpoint", {
                  brandKitId,
                  pipelineVersion: SOCIAL_MEDIA_PIPELINE_VERSION,
                });
              },
            })
          : null;

        // No logo → whole section couldn't run: all assets count as failed.
        accountFailure(
          "socialMedia",
          socialMediaUrls ? socialMediaUrls.failed : SOCIAL_MEDIA_ASSET_COUNT,
          socialMediaUrls ? socialMediaUrls.total : SOCIAL_MEDIA_ASSET_COUNT,
        );

        finalResultsJSON.socialMedia =
          buildSocialMediaAssetList(socialMediaUrls);
        if (socialMediaUrls) {
          finalResultsJSON.socialMediaKit = {
            version: SOCIAL_MEDIA_PIPELINE_VERSION,
            brief: socialMediaBrief,
            masterBackgroundUrl: socialMediaUrls.masterBannerUrl,
            approvedCopy: socialMediaUrls.approvedCopy,
          };
        }
      }
      if (deliverables?.brandGraphics) {
        await this.repository.updateProgress(
          brandKitId,
          74,
          "Generating brand graphics",
        );
        const graphicUrls = actualLogoUrl
          ? await generateBrandGraphics({
              ai: this.ai,
              env: this.env,
              storage: this.storage,
              brandKitId,
              brandName,
              sourceLogoUrl: actualLogoUrl,
              context: brandAssetContext,
            })
          : null;

        accountFailure(
          "brandGraphics",
          graphicUrls ? graphicUrls.failed : 2,
          graphicUrls ? graphicUrls.total : 2,
        );

        finalResultsJSON.brandGraphics = {
          backdropPostUrl:
            graphicUrls?.backdropPostUrl ??
            "https://placehold.co/1024x1024/000/FFF?text=Backdrop+Post",
          backdropStoryUrl:
            graphicUrls?.backdropStoryUrl ??
            "https://placehold.co/1152x2048/000/FFF?text=Backdrop+Story",
        };
      }
      if (deliverables?.businessCard) {
        await this.repository.updateProgress(
          brandKitId,
          86,
          "Generating business cards",
        );
        const businessCardUrls = actualLogoUrl
          ? await generateBusinessCardAssets({
              ai: this.ai,
              env: this.env,
              storage: this.storage,
              brandKitId,
              brandName,
              sourceLogoUrl: actualLogoUrl,
              context: brandAssetContext,
              businessCardBrief,
              headingFont: typographyOutput.heading.family,
              bodyFont: typographyOutput.body.family,
            })
          : null;

        accountFailure(
          "businessCard",
          businessCardUrls ? businessCardUrls.failed : 2,
          businessCardUrls ? businessCardUrls.total : 2,
        );

        finalResultsJSON.businessCard = {
          version: BUSINESS_CARD_PIPELINE_VERSION,
          brief: businessCardBrief || DEFAULT_BUSINESS_CARD_BRIEF,
          frontUrl:
            businessCardUrls?.frontUrl ??
            "https://placehold.co/1536x1024/000/FFF?text=Front",
          backUrl:
            businessCardUrls?.backUrl ??
            "https://placehold.co/1536x1024/FFF/000?text=Back",
        };
      }
      if (deliverables?.favicon) {
        const iconUrl = darkAndIconUrls?.iconOnlyUrl ?? fallbackLogoUrl;
        finalResultsJSON.favicons = FAVICON_SIZES.map((f) => ({
          size: f.size,
          label: f.label,
          type: f.type,
          url: iconUrl,
        }));
      }

      // Partial-failure refund (issue #3). Idempotent via a per-kit refundId so
      // a queue retry can never double-refund. Status stays "completed"; the
      // reason is surfaced via errorMessage (no schema/migration needed).
      let refundedAt: Date | undefined;
      let errorMessage: string | null = null;
      await this.repository.updateProgress(
        brandKitId,
        96,
        "Finalizing your brand kit",
      );
      if (refundCredits > 0) {
        const didRefund = await refundCreditsOnce(this.db, {
          refundId: `brand-kit-partial:${brandKitId}`,
          userId: message.userId,
          credits: refundCredits,
          reason: "brand_kit_partial_failure",
        });
        if (didRefund) refundedAt = new Date();
        errorMessage = `Some assets failed to generate (${failedSections.join(
          ", ",
        )}); ${refundCredits} credit${refundCredits === 1 ? "" : "s"} refunded.`;
        this.logger.warn("Brand kit completed with failed assets", {
          brandKitId,
          refundCredits,
          failedSections,
          didRefund,
        });
      }

      await this.repository.saveInitialGeneration(
        brandKitId,
        finalResultsJSON,
        {
          errorMessage,
          refundedAt,
        },
      );

      this.logger.info(`Completed brandKitId=${brandKitId}`);
    } catch (error) {
      this.logger.error("Brand kit generation failed completely", error, {
        brandKitId,
      });
      throw error;
    }
  }

  async processRefinement(message: RefineBrandKitMessage) {
    const {
      refinementId,
      brandKitId,
      sectionId,
      refinementPrompt,
      targetItemId,
    } = message;

    try {
      const triggerType = `refine_${sectionId}:${refinementId}`;
      if (await this.repository.hasRevisionTrigger(brandKitId, triggerType)) {
        this.logger.info("Refinement already completed; skipping replay", {
          brandKitId,
          refinementId,
        });
        return;
      }

      const currentBrandKit = await this.repository.getBrandKit(brandKitId);
      if (!currentBrandKit) {
        throw new PipelineError("Brand kit no longer exists", false);
      }

      const activeRevision =
        await this.repository.getActiveRevision(brandKitId);

      if (!activeRevision) {
        throw new PipelineError("No active revision found", false);
      }

      const newMergedJSON = await mergeRevisionResults({
        ai: this.ai,
        env: this.env,
        storage: this.storage,
        brandKitId,
        sectionId,
        refinementPrompt,
        targetItemId,
        currentBrandKit,
        activeRevisionResults: activeRevision.results,
      });

      await this.repository.saveRefinement(
        brandKitId,
        sectionId,
        refinementId,
        newMergedJSON,
      );
      this.logger.info(`Completed refinement for brandKitId=${brandKitId}`, {
        brandKitId,
        sectionId,
      });
    } catch (error) {
      this.logger.error(`Refinement failed (${sectionId})`, error, {
        brandKitId,
        sectionId,
      });
      throw error;
    }
  }
}
