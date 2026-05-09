import type { Database } from "@quicklogo/db";
import {
  brandKits,
  brandKitRevisions,
  images,
  eq,
  ne,
  and,
  sql,
  desc,
} from "@quicklogo/db";
import {
  createProvider,
  getModelMapping,
} from "@quicklogo/ai-providers/providers";
import {
  buildBrandKitIdentityRequest,
  buildBrandKitRefinementRequest,
  buildLogoVariationGenerationParams,
} from "@quicklogo/ai-providers/prompt";
import type { GenerationParams } from "@quicklogo/ai-providers/types";
import type { StorageProvider } from "@quicklogo/storage";
import type {
  GenerateBrandKitMessage,
  RefineBrandKitMessage,
} from "@quicklogo/shared";
import type { Env } from "./types";

const LOGO_VARIATION_TIMEOUT_MS = 120000;

interface LogoVariationResult {
  id: string;
  url: string;
}

export class BrandKitPipeline {
  constructor(
    private ai: Ai,
    private db: Database,
    private storage: StorageProvider,
    private env: Env,
  ) {}

  async processGeneration(message: GenerateBrandKitMessage) {
    const {
      brandKitId,
      prompt,
      brandName,
      extractedColors,
      typographyStyle,
      deliverables,
    } = message;
    await this.updateStatus(brandKitId, "processing");

    try {
      const requestConfig = buildBrandKitIdentityRequest({
        brandName,
        description: prompt,
        extractedColors,
        typographyStyle,
      });

      const response = await this.ai.run(
        "@cf/meta/llama-3.1-8b-instruct-fp8",
        requestConfig,
      );

      const responseText =
        typeof response === "object" &&
        response !== null &&
        "response" in response
          ? String((response as { response: string }).response).trim()
          : "{}";

      let aiOutput;
      try {
        aiOutput = JSON.parse(responseText);
      } catch (e) {
        console.error(
          "[brand-kit-pipeline] Failed to parse JSON:",
          responseText,
        );
        throw new Error("AI returned invalid JSON");
      }

      let actualLogoUrl = message.customLogoUrl;

      if (!actualLogoUrl && message.sourceImageId) {
        const sourceImage = await this.db.query.images.findFirst({
          where: eq(images.id, message.sourceImageId),
        });
        if (sourceImage?.imageUrl) {
          actualLogoUrl = sourceImage.imageUrl;
        }
      }

      const fallbackLogoUrl =
        actualLogoUrl || "https://placehold.co/400x400/000/FFF?text=Logo";

      const finalResultsJSON: Record<string, any> = {
        brandName,
        colorPalette: aiOutput.colorPalette || [],
        typography: aiOutput.typography || {},
        deliverables: deliverables,
      };

      if (deliverables?.logoVariations) {
        const darkAndIconUrls = actualLogoUrl
          ? await this.generateLogoVariations({
              brandKitId,
              brandName,
              sourceLogoUrl: actualLogoUrl,
            })
          : null;

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
        finalResultsJSON.socialMedia = [
          {
            platform: "Instagram",
            type: "Profile",
            dimensions: "1080x1080",
            url: "https://placehold.co/1080x1080/000/FFF?text=IG",
          },
          {
            platform: "Twitter",
            type: "Header",
            dimensions: "1500x500",
            url: "https://placehold.co/1500x500/000/FFF?text=TW",
          },
        ];
      }
      if (deliverables?.businessCard) {
        finalResultsJSON.businessCard = {
          frontUrl: "https://placehold.co/1050x600/000/FFF?text=Front",
          backUrl: "https://placehold.co/1050x600/FFF/000?text=Back",
        };
      }
      if (deliverables?.favicon) {
        finalResultsJSON.favicons = [
          {
            size: 16,
            label: "Web",
            url: "https://placehold.co/16x16/000/FFF?text=16",
          },
          {
            size: 32,
            label: "Web HD",
            url: "https://placehold.co/32x32/000/FFF?text=32",
          },
          {
            size: 180,
            label: "Apple",
            url: "https://placehold.co/180x180/000/FFF?text=180",
          },
        ];
      }

      await this.db.batch([
        this.db.insert(brandKitRevisions).values({
          brandKitId,
          isActive: true,
          revisionNumber: 1,
          triggerType: "initial_generation",
          results: finalResultsJSON,
        }),
        this.db
          .update(brandKits)
          .set({ status: "completed" })
          .where(eq(brandKits.id, brandKitId)),
      ]);

      console.log(`[brand-kit-pipeline] Completed brandKitId=${brandKitId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        `[brand-kit-pipeline] Failed brandKitId=${brandKitId}:`,
        error,
      );
      await this.updateStatus(brandKitId, "failed", errorMessage);
    }
  }

  async processRefinement(message: RefineBrandKitMessage) {
    const { brandKitId, sectionId, refinementPrompt, typographyStyle } =
      message;

    try {
      const activeRevision = await this.db.query.brandKitRevisions.findFirst({
        where: and(
          eq(brandKitRevisions.brandKitId, brandKitId),
          eq(brandKitRevisions.isActive, true),
        ),
      });

      if (!activeRevision) throw new Error("No active revision found");

      let newMergedJSON = { ...(activeRevision.results as any) };
      const refinementRequest = buildBrandKitRefinementRequest({
        brandName: newMergedJSON.brandName || "Unknown",
        sectionId,
        refinementPrompt,
        currentResults: newMergedJSON,
        typographyStyle,
      });

      if (refinementRequest) {
        const response = await this.ai.run(
          "@cf/meta/llama-3.1-8b-instruct-fp8",
          refinementRequest.request,
        );

        const responseText =
          typeof response === "object" &&
          response !== null &&
          "response" in response
            ? String((response as { response: string }).response).trim()
            : "{}";

        let aiOutput;
        try {
          aiOutput = JSON.parse(responseText);
        } catch (e) {
          console.error(
            "[brand-kit-pipeline] Failed to parse Refinement JSON:",
            responseText,
          );
          throw new Error("AI returned invalid JSON on refinement");
        }

        if (
          refinementRequest.sectionKey === "colorPalette" &&
          aiOutput.colorPalette
        ) {
          newMergedJSON.colorPalette = aiOutput.colorPalette;
        } else if (
          refinementRequest.sectionKey === "typography" &&
          aiOutput.typography
        ) {
          newMergedJSON.typography = aiOutput.typography;
        }
      } else {
        console.log(
          `[brand-kit-pipeline] Refinement for ${sectionId} is not text-LLM driven yet.`,
        );
      }

      const [maxRev] = await this.db
        .select({ max: sql<number>`MAX(revision_number)` })
        .from(brandKitRevisions)
        .where(eq(brandKitRevisions.brandKitId, brandKitId));

      await this.db.batch([
        this.db
          .update(brandKitRevisions)
          .set({ isActive: false })
          .where(
            and(
              eq(brandKitRevisions.brandKitId, brandKitId),
              eq(brandKitRevisions.isActive, true),
            ),
          ),

        this.db.insert(brandKitRevisions).values({
          brandKitId,
          isActive: true,
          revisionNumber: (maxRev.max || 0) + 1,
          triggerType: `refine_${sectionId}`,
          results: newMergedJSON,
        }),
      ]);
      console.log(
        `[brand-kit-pipeline] Completed refinement for brandKitId=${brandKitId}`,
      );
    } catch (error) {
      console.error(
        `[brand-kit-pipeline] Refinement failed brandKitId=${brandKitId}:`,
        error,
      );
    }
  }

  private async updateStatus(
    id: string,
    status: "processing" | "failed",
    error?: string,
  ) {
    await this.db
      .update(brandKits)
      .set({ status, errorMessage: error || null })
      .where(eq(brandKits.id, id));
  }

  private async generateLogoVariations({
    brandKitId,
    brandName,
    sourceLogoUrl,
  }: {
    brandKitId: string;
    brandName: string;
    sourceLogoUrl: string;
  }): Promise<{ darkModeUrl: string; iconOnlyUrl: string }> {
    const reusableUrls = await this.findReusableLogoVariationUrls({
      brandKitId,
      sourceLogoUrl,
    });
    if (reusableUrls) {
      console.log(
        `[brand-kit-pipeline] Reused logo variations for brandKitId=${brandKitId}`,
      );
      return reusableUrls;
    }

    const mapping = getModelMapping("quick-nano-banana");
    const provider = createProvider(mapping, { ai: this.ai, env: this.env });

    const [darkModeUrl, iconOnlyUrl] = await Promise.all([
      this.generateVariationWithFallback({
        provider,
        params: buildLogoVariationGenerationParams({
          variation: "dark-mode",
          brandName,
          sourceLogoUrl,
          backendModel: mapping.backendModel,
          defaultParams: mapping.defaultParams,
        }),
        brandKitId,
        suffix: "logo-dark",
        fallbackUrl: sourceLogoUrl,
      }),
      this.generateVariationWithFallback({
        provider,
        params: buildLogoVariationGenerationParams({
          variation: "icon-only",
          brandName,
          sourceLogoUrl,
          backendModel: mapping.backendModel,
          defaultParams: mapping.defaultParams,
        }),
        brandKitId,
        suffix: "logo-icon",
        fallbackUrl: sourceLogoUrl,
      }),
    ]);

    return { darkModeUrl, iconOnlyUrl };
  }

  private async findReusableLogoVariationUrls({
    brandKitId,
    sourceLogoUrl,
  }: {
    brandKitId: string;
    sourceLogoUrl: string;
  }): Promise<{ darkModeUrl: string; iconOnlyUrl: string } | null> {
    const currentBrandKit = await this.db.query.brandKits.findFirst({
      where: eq(brandKits.id, brandKitId),
    });
    if (!currentBrandKit) return null;

    const candidates = await this.db
      .select({ results: brandKitRevisions.results })
      .from(brandKitRevisions)
      .innerJoin(brandKits, eq(brandKitRevisions.brandKitId, brandKits.id))
      .where(
        and(
          eq(brandKits.userId, currentBrandKit.userId),
          ne(brandKits.id, brandKitId),
          eq(brandKits.status, "completed"),
          eq(brandKitRevisions.isActive, true),
        ),
      )
      .orderBy(desc(brandKitRevisions.createdAt))
      .limit(25);

    for (const candidate of candidates) {
      const reusableUrls = this.extractReusableLogoVariationUrls(
        candidate.results,
        sourceLogoUrl,
      );
      if (reusableUrls) return reusableUrls;
    }

    return null;
  }

  private extractReusableLogoVariationUrls(
    results: unknown,
    sourceLogoUrl: string,
  ): { darkModeUrl: string; iconOnlyUrl: string } | null {
    if (typeof results !== "object" || results === null) return null;

    const logoVariations = (results as { logoVariations?: unknown })
      .logoVariations;
    if (!Array.isArray(logoVariations)) return null;

    const getUrl = (id: string) => {
      const match = logoVariations.find(
        (variation): variation is LogoVariationResult =>
          typeof variation === "object" &&
          variation !== null &&
          "id" in variation &&
          "url" in variation &&
          (variation as LogoVariationResult).id === id &&
          typeof (variation as LogoVariationResult).url === "string",
      );

      return match?.url;
    };

    const primaryUrl = getUrl("primary");
    const darkModeUrl = getUrl("dark");
    const iconOnlyUrl = getUrl("icon");

    if (primaryUrl !== sourceLogoUrl || !darkModeUrl || !iconOnlyUrl) {
      return null;
    }

    return { darkModeUrl, iconOnlyUrl };
  }

  private async generateVariationWithFallback({
    provider,
    params,
    brandKitId,
    suffix,
    fallbackUrl,
  }: {
    provider: ReturnType<typeof createProvider>;
    params: GenerationParams;
    brandKitId: string;
    suffix: string;
    fallbackUrl: string;
  }): Promise<string> {
    const generation = this.generateAndUploadVariation({
      provider,
      params,
      brandKitId,
      suffix,
    }).catch((error) => {
      console.error(
        `[brand-kit-pipeline] ${suffix} generation failed for brandKitId=${brandKitId}:`,
        error,
      );
      return fallbackUrl;
    });

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<string>((resolve) => {
      timeoutId = setTimeout(() => {
        console.warn(
          `[brand-kit-pipeline] ${suffix} generation timed out for brandKitId=${brandKitId}; using source logo fallback`,
        );
        resolve(fallbackUrl);
      }, LOGO_VARIATION_TIMEOUT_MS);
    });

    try {
      return await Promise.race([generation, timeout]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  private async generateAndUploadVariation({
    provider,
    params,
    brandKitId,
    suffix,
  }: {
    provider: ReturnType<typeof createProvider>;
    params: GenerationParams;
    brandKitId: string;
    suffix: string;
  }): Promise<string> {
    const result = await provider.generate(params);
    if (!result.success || !result.imageData) {
      throw new Error(
        result.error ?? `Variation generation failed for "${suffix}"`,
      );
    }

    const uploaded = await this.storage.upload(
      `quick-logo/brand-kits/${brandKitId}/${suffix}.${result.format ?? "png"}`,
      result.imageData,
    );

    return uploaded.url;
  }
}
