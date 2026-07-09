import type { Database } from "@quicklogo/db";

import {
  buildBrandPresentationTextRequest,
  derivePalette,
} from "@quicklogo/ai-providers/prompt";
import type { StorageProvider } from "@quicklogo/storage";
import type {
  GenerateBrandKitMessage,
  RefineBrandKitMessage,
} from "@quicklogo/shared";
import type { Env } from "../types";
import { normalizeBrandContext } from "@quicklogo/ai-providers/prompt";
import { extractWorkersAiResponseText } from "../core/ai-response-parser";
import { createLogger } from "@quicklogo/server-telemetry";
import { resolveTypographyStyle } from "../services/brand-kit/typography-resolver";
import {
  normalizeTypographyOutput,
  FALLBACK_TYPOGRAPHY,
} from "../services/brand-kit/typography-normalizer";
import { runVisionTypographyRequest } from "../services/brand-kit/vision-analysis";
import { mergeRevisionResults } from "../services/brand-kit/revision-merger";
import {
  generateLogoVariations,
  generateSocialMediaAssets,
  generateBusinessCardAssets,
  generateBrandGraphics,
  buildSocialMediaAssetList,
  SOCIAL_MEDIA_ASSET_COUNT,
} from "../services/brand-kit/asset-generator";
import { generateBrandPresentationImage } from "../services/brand-kit/brand-presentation-generator";
import { BrandKitRepository } from "../services/brand-kit/brand-kit-repository";
import {
  FAVICON_SIZES,
  BRAND_KIT_SECTION_COSTS,
  computeSectionRefund,
} from "@quicklogo/shared";
import { refundCreditsOnce } from "../services/image/image-repository";

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
    } = message;

    const brandAssetContext = normalizeBrandContext(brandName || "", {
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

      const colorOutput = {
        colorPalette: derivePalette(extractedColors || []),
      };

      // Step 3: Typography via hybrid vision request
      const { key: resolvedStyle, hint: styleHint } =
        resolveTypographyStyle(typographyStyle);

      const typographyResponse = actualLogoUrl
        ? await runVisionTypographyRequest({
            ai: this.ai,
            brandName,
            description: prompt,
            typographyStyleHint: styleHint,
            typographyStyleKey: resolvedStyle,
            logoUrl: actualLogoUrl,
          })
        : Promise.resolve(null);

      let typographyOutput = FALLBACK_TYPOGRAPHY;
      if (typographyResponse) {
        const typographyText = extractWorkersAiResponseText(typographyResponse);

        try {
          typographyOutput = normalizeTypographyOutput(
            JSON.parse(typographyText),
          );
        } catch {
          this.logger.warn(
            "[brand-kit-pipeline] Vision typography parse failed; using fallback",
            { brandKitId },
          );
        }
      }

      const fallbackLogoUrl =
        actualLogoUrl || "https://placehold.co/400x400/000/FFF?text=Logo";

      let brandPresentationOutput = null;
      if (deliverables?.brandPresentation) {
        const presentationRequest = buildBrandPresentationTextRequest({
          brandName,
          description: prompt,
          industry: message.industry,
          targetAudience: message.targetAudience,
          selectedVibes: message.selectedVibes,
          brandPersonality: message.brandPersonality,
        });
        const presentationResponse = await this.ai.run(
          "@cf/meta/llama-3.1-8b-instruct-fp8",
          presentationRequest,
        );
        const presentationText =
          extractWorkersAiResponseText(presentationResponse);
        let tagline = `${brandName}: Redefining Quality`;
        let description = `Discover the unique design philosophy behind ${brandName}.`;
        try {
          const parsed = JSON.parse(presentationText);
          tagline = parsed.tagline || tagline;
          description = parsed.description || description;
        } catch {
          this.logger.warn(
            "[brand-kit-pipeline] Brand presentation copy generation failed; using fallback",
            { brandKitId },
          );
        }

        const presentationUrl = actualLogoUrl
          ? await generateBrandPresentationImage({
              ai: this.ai,
              env: this.env,
              storage: this.storage,
              brandKitId,
              brandName,
              sourceLogoUrl: actualLogoUrl,
              headingFont: typographyOutput.heading.family,
              bodyFont: typographyOutput.body.family,
              productImageUrl:
                productImageUrls && productImageUrls.length > 0
                  ? productImageUrls[0]
                  : undefined,
              brandDescription: prompt,
              industry: message.industry,
              targetAudience: message.targetAudience,
              selectedVibes: message.selectedVibes,
              brandPersonality: message.brandPersonality,
            })
          : undefined;

        accountFailure("brandPresentation", presentationUrl ? 0 : 1, 1);

        const presentationImageUrl =
          presentationUrl ??
          "https://placehold.co/1536x1024/000/FFF?text=Brand+Presentation";

        brandPresentationOutput = {
          tagline,
          description,
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
        const socialMediaUrls = actualLogoUrl
          ? await generateSocialMediaAssets({
              ai: this.ai,
              env: this.env,
              storage: this.storage,
              brandKitId,
              brandName,
              sourceLogoUrl: actualLogoUrl,
              context: brandAssetContext,
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
      }
      if (deliverables?.brandGraphics) {
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
        const businessCardUrls = actualLogoUrl
          ? await generateBusinessCardAssets({
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
          "businessCard",
          businessCardUrls ? businessCardUrls.failed : 2,
          businessCardUrls ? businessCardUrls.total : 2,
        );

        finalResultsJSON.businessCard = {
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
    const { brandKitId, sectionId, refinementPrompt, targetItemId } = message;

    try {
      const activeRevision =
        await this.repository.getActiveRevision(brandKitId);

      if (!activeRevision) throw new Error("No active revision found");

      const currentBrandKit = await this.repository.getBrandKit(brandKitId);

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
