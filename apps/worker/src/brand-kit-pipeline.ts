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
  buildBrandKitTypographyRequest,
  buildLogoVariationGenerationParams,
} from "@quicklogo/ai-providers/prompt";
import type { GenerationParams } from "@quicklogo/ai-providers/types";
import type { StorageProvider } from "@quicklogo/storage";
import type {
  GenerateBrandKitMessage,
  RefineBrandKitMessage,
} from "@quicklogo/shared";
import { TYPOGRAPHY_REGISTRY } from "@quicklogo/shared";
import type { Env } from "./types";

const LOGO_VARIATION_TIMEOUT_MS = 120000;
const FALLBACK_TYPOGRAPHY = {
  heading: { name: "Inter", family: "Inter", weight: "700" },
  body: { name: "Roboto", family: "Roboto", weight: "400" },
};

/**
 * Cloudflare Workers AI requires accepting the Meta Community License
 * for Llama 3.2 Vision before the model can be used.
 * This flag ensures the agreement is sent only once per worker lifecycle.
 */
let visionModelLicenseAccepted = false;

interface LogoVariationResult {
  id: string;
  url: string;
}

function extractWorkersAiResponseText(response: unknown): string {
  if (typeof response === "string") {
    return response.trim();
  }

  if (
    typeof response === "object" &&
    response !== null &&
    "response" in response
  ) {
    return String((response as { response: string }).response).trim();
  }

  return "{}";
}

function normalizeTypographyOutput(response: unknown) {
  const parsed = response as {
    heading?: { family?: unknown; weight?: unknown; name?: unknown };
    body?: { family?: unknown; weight?: unknown; name?: unknown };
  };

  if (
    typeof parsed.heading?.family !== "string" ||
    typeof parsed.body?.family !== "string"
  ) {
    return FALLBACK_TYPOGRAPHY;
  }

  const headingFamily = parsed.heading.family.trim();
  const bodyFamily = parsed.body.family.trim();

  if (!headingFamily || !bodyFamily) {
    return FALLBACK_TYPOGRAPHY;
  }

  return {
    heading: {
      name:
        typeof parsed.heading.name === "string"
          ? parsed.heading.name
          : headingFamily,
      family: headingFamily,
      weight:
        typeof parsed.heading.weight === "string"
          ? parsed.heading.weight
          : "700",
    },
    body: {
      name:
        typeof parsed.body.name === "string" ? parsed.body.name : bodyFamily,
      family: bodyFamily,
      weight:
        typeof parsed.body.weight === "string" ? parsed.body.weight : "400",
    },
  };
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
      });

      let actualLogoUrl = message.customLogoUrl;

      if (!actualLogoUrl && message.sourceImageId) {
        const sourceImage = await this.db.query.images.findFirst({
          where: eq(images.id, message.sourceImageId),
        });
        if (sourceImage?.imageUrl) {
          actualLogoUrl = sourceImage.imageUrl;
        }
      }

      const styleHint =
        TYPOGRAPHY_REGISTRY[typographyStyle]?.description ??
        "Clean, minimal, and highly legible";

      const [colorResponse, typographyResponse] = await Promise.all([
        this.ai.run("@cf/meta/llama-3.1-8b-instruct-fp8", requestConfig),
        actualLogoUrl
          ? this.runVisionTypographyRequest({
              brandName,
              description: prompt,
              typographyStyleHint: styleHint,
              logoUrl: actualLogoUrl,
            })
          : Promise.resolve(null),
      ]);

      const colorText = extractWorkersAiResponseText(colorResponse);

      let colorOutput;
      try {
        colorOutput = JSON.parse(colorText);
      } catch (e) {
        console.error("[brand-kit-pipeline] Failed to parse JSON:", colorText);
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
          console.warn(
            "[brand-kit-pipeline] Vision typography parse failed; using fallback",
          );
        }
      }

      const fallbackLogoUrl =
        actualLogoUrl || "https://placehold.co/400x400/000/FFF?text=Logo";

      const finalResultsJSON: Record<string, any> = {
        brandName,
        colorPalette: colorOutput.colorPalette || [],
        typography: typographyOutput,
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
    const { brandKitId, sectionId, refinementPrompt } = message;

    try {
      const activeRevision = await this.db.query.brandKitRevisions.findFirst({
        where: and(
          eq(brandKitRevisions.brandKitId, brandKitId),
          eq(brandKitRevisions.isActive, true),
        ),
      });

      if (!activeRevision) throw new Error("No active revision found");

      let newMergedJSON = { ...(activeRevision.results as any) };

      if (
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
        // Re-run vision model to get fresh AI font suggestions
        const brandKit = await this.db.query.brandKits.findFirst({
          where: eq(brandKits.id, brandKitId),
        });

        const logoUrl =
          newMergedJSON.logoVariations?.[0]?.url || brandKit?.customLogoUrl;

        if (logoUrl) {
          const styleHint =
            TYPOGRAPHY_REGISTRY[brandKit?.typographyStyle ?? ""]?.description ??
            "Clean, minimal, and highly legible";

          const visionResponse = await this.runVisionTypographyRequest({
            brandName: newMergedJSON.brandName || "Brand",
            description: styleHint,
            typographyStyleHint: styleHint,
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
              console.warn(
                "[brand-kit-pipeline] AI suggest typography parse failed; keeping current",
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
        });

        if (!refinementRequest) {
          console.log(
            `[brand-kit-pipeline] Refinement for ${sectionId} is not text-LLM driven yet.`,
          );
        } else {
          const response = await this.ai.run(
            "@cf/meta/llama-3.1-8b-instruct-fp8",
            refinementRequest.request,
          );

          const responseText = extractWorkersAiResponseText(response);

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
          }
        }
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

  /**
   * Runs the vision model typography request with automatic license acceptance.
   * Cloudflare Workers AI requires accepting the Meta Community License
   * by sending "agree" as the first prompt before the model can be used.
   */
  private async runVisionTypographyRequest(params: {
    brandName: string;
    description: string;
    typographyStyleHint: string;
    logoUrl: string;
  }): Promise<unknown | null> {
    try {
      if (!visionModelLicenseAccepted) {
        await this.ai.run("@cf/meta/llama-3.2-11b-vision-instruct", {
          messages: [{ role: "user", content: "agree" }],
          max_tokens: 1,
        });
        visionModelLicenseAccepted = true;
        console.log(
          "[brand-kit-pipeline] Llama 3.2 Vision license accepted",
        );
      }

      return await this.ai.run(
        "@cf/meta/llama-3.2-11b-vision-instruct",
        buildBrandKitTypographyRequest(params),
      );
    } catch (error) {
      console.warn(
        "[brand-kit-pipeline] Vision typography generation failed; using fallback",
        error,
      );
      return null;
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
