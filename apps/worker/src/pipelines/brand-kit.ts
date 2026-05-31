import type { Database } from "@quicklogo/db";

import {
  buildBrandKitIdentityRequest,
  buildBrandPresentationTextRequest,
} from "@quicklogo/ai-providers/prompt";
import type { StorageProvider } from "@quicklogo/storage";
import type {
  GenerateBrandKitMessage,
  RefineBrandKitMessage,
} from "@quicklogo/shared";
import { brandKitColorPaletteResponseSchema } from "@quicklogo/shared";
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
  generateBrandedBackdrops,
} from "../services/brand-kit/asset-generator";
import { generateBrandPresentationImage } from "../services/brand-kit/brand-presentation-generator";
import { BrandKitRepository } from "../services/brand-kit/brand-kit-repository";
import { FAVICON_SIZES } from "@quicklogo/shared";

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

    await this.repository.updateStatus(brandKitId, "processing");

    try {
      const requestConfig = buildBrandKitIdentityRequest({
        brandName,
        description: prompt,
        extractedColors,
        industry: message.industry,
        targetAudience: message.targetAudience,
        selectedVibes: message.selectedVibes,
        brandPersonality: message.brandPersonality,
      });

      let actualLogoUrl = message.customLogoUrl;

      if (!actualLogoUrl && message.sourceImageId) {
        const sourceImageUrl = await this.repository.getSourceImageUrl(
          message.sourceImageId,
        );
        if (sourceImageUrl) {
          actualLogoUrl = sourceImageUrl;
        }
      }

      const { key: resolvedStyle, hint: styleHint } =
        resolveTypographyStyle(typographyStyle);

      const [colorResponse, typographyResponse] = await Promise.all([
        this.ai.run("@cf/meta/llama-3.1-8b-instruct-fp8", requestConfig),
        actualLogoUrl
          ? runVisionTypographyRequest({
              ai: this.ai,
              brandName,
              description: prompt,
              typographyStyleHint: styleHint,
              typographyStyleKey: resolvedStyle,
              logoUrl: actualLogoUrl,
            })
          : Promise.resolve(null),
      ]);

      const colorText = extractWorkersAiResponseText(colorResponse);

      let colorOutput: { colorPalette: any[] } = { colorPalette: [] };
      try {
        const parsedJson = JSON.parse(colorText);
        const validated =
          brandKitColorPaletteResponseSchema.safeParse(parsedJson);
        if (validated.success) {
          colorOutput = validated.data;
        } else {
          this.logger.warn(
            "[brand-kit-pipeline] Color palette schema validation failed",
            { brandKitId, error: validated.error },
          );
        }
      } catch (e) {
        this.logger.error("[brand-kit-pipeline] Failed to parse JSON", e, {
          brandKitId,
          colorText,
        });
        throw new Error("AI returned invalid JSON");
      }

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

        const presentationImageUrl = actualLogoUrl
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
          : "https://placehold.co/1376x768/000/FFF?text=Brand+Presentation";

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

        finalResultsJSON.socialMedia = [
          {
            platform: "Instagram",
            type: "Profile",
            dimensions: "1080x1080",
            url:
              socialMediaUrls?.socialProfileUrl ??
              "https://placehold.co/1080x1080/000/FFF?text=IG",
          },
          {
            platform: "Twitter",
            type: "Header",
            dimensions: "1500x500",
            url:
              socialMediaUrls?.masterBannerUrl ??
              "https://placehold.co/1500x500/000/FFF?text=TW",
          },
          {
            platform: "LinkedIn",
            type: "Header",
            dimensions: "1584x396",
            url:
              socialMediaUrls?.masterBannerUrl ??
              "https://placehold.co/1584x396/000/FFF?text=LI",
          },
          {
            platform: "Facebook",
            type: "Header",
            dimensions: "820x360",
            url:
              socialMediaUrls?.facebookBannerUrl ??
              "https://placehold.co/820x360/000/FFF?text=FB",
          },
          {
            platform: "YouTube",
            type: "Channel Art",
            dimensions: "2560x1440",
            url:
              socialMediaUrls?.masterBannerUrl ??
              "https://placehold.co/2560x1440/000/FFF?text=YT",
          },
        ];
      }
      if (deliverables?.brandedBackdrops) {
        const backdropUrls = actualLogoUrl
          ? await generateBrandedBackdrops({
              ai: this.ai,
              env: this.env,
              storage: this.storage,
              brandKitId,
              brandName,
              sourceLogoUrl: actualLogoUrl,
              context: brandAssetContext,
            })
          : null;

        finalResultsJSON.brandedBackdrops = {
          feedUrl:
            backdropUrls?.feedUrl ??
            "https://placehold.co/1080x1080/000/FFF?text=Feed",
          storyUrl:
            backdropUrls?.storyUrl ??
            "https://placehold.co/1080x1920/000/FFF?text=Story",
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

        finalResultsJSON.businessCard = {
          frontUrl:
            businessCardUrls?.frontUrl ??
            "https://placehold.co/1376x768/000/FFF?text=Front",
          backUrl:
            businessCardUrls?.backUrl ??
            "https://placehold.co/1376x768/FFF/000?text=Back",
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

      await this.repository.saveInitialGeneration(brandKitId, finalResultsJSON);

      this.logger.info(`Completed brandKitId=${brandKitId}`);
    } catch (error) {
      this.logger.error("Brand kit generation failed completely", error, {
        brandKitId,
      });

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await this.repository.updateStatus(brandKitId, "failed", errorMessage);
    }
  }

  async processRefinement(message: RefineBrandKitMessage) {
    const { brandKitId, sectionId, refinementPrompt } = message;

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
    }
  }
}
